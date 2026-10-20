'use strict';
// Synthetic model diagnostics: no database connection, raw responses, keys,
// emails, booking records or connection strings are printed or transmitted.
const path=require('node:path');require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const P=require('../src/ai-provider'),A=require('../src/access'),V=require('../src/ai-conversation'),U=require('../src/ai-understanding'),C=require('../src/ai-answer-contract');
const actor={role:'admin',permissions:A.permissions({role:'admin'})};
const cases=[
 {name:'Hỏi khả năng chung',q:'Tôi hỏi trợ lý làm được những gì, không yêu cầu sửa giá.',check:p=>p.capability?.mode==='general'},
 {name:'Tổng phòng từ mọi loại',q:'Tất cả loại phòng hiện tại tính tổng hợp thì có bao nhiêu phòng ở tất cả homestay?',check:p=>p.inventory?.kind==='rooms'&&p.inventory.scope==='all_assigned'},
 {name:'Đếm loại phòng, phân biệt với phòng vật lý',q:'Có bao nhiêu loại phòng ở tất cả homestay?',check:p=>p.inventory?.kind==='room_types'&&p.inventory.scope==='all_assigned'},
 {name:'Sửa ý và phủ định',q:'Không cần bạn đổi quyền, tôi chỉ muốn biết những việc bạn hỗ trợ.',context:{capability:{mode:'request',operation:'account_permissions'}},check:p=>p.capability?.mode==='general'},
 {name:'Tham chiếu câu trước',q:'Cả 10 loại luôn.',context:{inventory:{kind:'rooms',scope:'all_assigned',breakdown:'none',summary:'Đang hỏi tổng số phòng vật lý, tính toàn bộ loại phòng.'}},check:p=>p.inventory?.kind==='rooms'},
 {name:'Giải thích giá, không hỏi quyền sửa giá',q:'Vì sao giá thứ Bảy, Chủ nhật và ngày lễ lại cao hơn?',check:p=>p.explanation?.topic==='pricing'},
 {name:'Giải thích vận hành và sao lưu',q:'Giải thích phần Vận hành và sao lưu để làm gì?',check:p=>p.explanation?.topic==='backup'},
 {name:'Yêu cầu gửi booking qua email',q:'Tôi muốn bạn gửi mã booking mới nhất vào email giúp tôi',check:p=>p.capability?.operation==='booking_email_send'},
 {name:'Yêu cầu thiếu đối tượng',q:'Thế cái đó thì sao?',check:p=>p.understanding?.confidence==='low'}
];
function safePlan(p){if(!p)return 'không có kế hoạch hợp lệ';return JSON.stringify({intent:p.intent,topic:p.topic,understanding:p.understanding,inventory:p.inventory,explanation:p.explanation,capability:p.capability,dialogue:p.dialogue});}
(async()=>{
 const health=P.health(process.env).filter(p=>p.configured);if(!health.length)throw Error('NOT_CONFIGURED');
 const selections=process.argv.includes('--all-providers')?health.map(p=>p.provider||p.name):[null];let failures=0;
 for(const selected of selections){
  if(selected&&!['groq','gemini'].includes(selected))continue;
  const env=selected?{...process.env,AI_PROVIDER:selected,AI_FALLBACK_PROVIDERS:''}:process.env;let modelPassed=0,appPassed=0,validPlans=0,calls=0,skipped=0;const fetcher=(...args)=>{calls++;return fetch(...args);};
  console.log('\nKiểm tra: '+(selected||'nhà cung cấp đang cấu hình và dự phòng'));
  for(const c of cases){
   const previous=c.context||{},local=V.localPlan(c.q,previous,null,{role:'admin'}),requiredAnswer=C.required(local,c.q);
   const diagnostics=[],beforeCalls=calls;const r=await P.classify(c.q,previous,{env,semantic:true,actor,history:[],requiredAnswer,fetch:fetcher,onDiagnostic:d=>diagnostics.push(d)}),chosen=U.choose(local,r,{question:c.q});
   const cooling=calls===beforeCalls&&r.attempts?.some(a=>a.cooling);if(cooling)skipped++;if(!r.fallback)validPlans++;
   const modelOK=!r.fallback&&c.check(r.plan)&&C.compatible(r.plan,requiredAnswer),appOK=c.check(chosen);if(modelOK)modelPassed++;if(appOK)appPassed++;
   console.log((cooling?'CHƯA GỌI MÔ HÌNH (TẠM NGHỈ)':modelOK?'MÔ HÌNH ĐÚNG':'MÔ HÌNH CẦN KIỂM TRA')+' | '+(appOK?'ĐỊNH TUYẾN ĐÚNG':'ĐỊNH TUYẾN CHƯA ĐÚNG')+' — '+c.name);
   if(r.failoverFrom)console.log('  Đã chuyển nhà cung cấp: '+r.failoverFrom+' → '+r.provider+'.');
   if(r.schemaRepaired)console.log('  Mô hình đã sửa cấu trúc sau '+r.repairAttempts+' lần gọi bổ sung.');
   if(!modelOK)console.log('  Kế hoạch: '+safePlan(r.plan)+(r.fallback?' | dự phòng theo quy tắc: '+r.reason:''));
   if(!appOK||chosen.answerContract?.corrected)console.log('  Sau kiểm tra yêu cầu: '+safePlan(chosen));
   for(const d of diagnostics)console.log('  Chẩn đoán: '+JSON.stringify({provider:d.provider,http:d.status,stage:d.stage,finishReason:d.finishReason,missingRequired:d.missingRequired,errorCode:d.errorCode}));
  }
  console.log('Kế hoạch hợp lệ: '+validPlans+'/'+cases.length+'. '+(validPlans?'Nhận diện đúng trong các kế hoạch hợp lệ: '+modelPassed+'/'+validPlans+'.':'Chưa có kế hoạch hợp lệ để đánh giá khả năng hiểu.'));
  console.log('Định tuyến sau kiểm tra yêu cầu: '+appPassed+'/'+cases.length+'. Số lần gọi API: '+calls+'. Lượt bị tạm nghỉ: '+skipped+'.');
  if(modelPassed<cases.length||appPassed<cases.length)failures++;
 }
 console.log('Đây là kiểm tra mẫu về cách hiểu, chưa kiểm tra dữ liệu thực tế và không bảo đảm hiểu đúng mọi câu.');if(failures)process.exitCode=1;
})().catch(()=>{console.error('Chưa hoàn tất kiểm tra AI. Kiểm tra cấu hình và kết nối trên máy chủ; không gửi API key vào chat.');process.exitCode=1;});
