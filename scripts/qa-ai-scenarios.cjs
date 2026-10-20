'use strict';
// Runs the Word scenarios against a disposable, authenticated HTTP application.
// Never connects to the configured database. Default mode makes NO model calls.
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),jwt=require('jsonwebtoken');
const D=require('../src/domain'),A=require('../src/access'),V=require('../src/ai-conversation'),Reports=require('../src/business-reports');
const {Store}=require('../src/store'),{createApp}=require('../server');
const scenarios=require('../docs/ai-qa/scenarios.json');
const flag=name=>process.argv.find(x=>x.startsWith('--'+name+'='))?.split('=').slice(1).join('=');
const mode=flag('mode')||'offline',label=flag('label')||mode;
if(!['offline','mock','live'].includes(mode))throw Error('Unknown QA mode');
const parents={'K-D06':'K-D05','K-D17':'K-D06','K-D18':'K-D17','K-D19':'K-D05','A-D16':'A-D05','A-D17':'A-D03','A-D18':'A-D17','A-D19':'A-D12','C-D17':'C-D02','C-D18':'C-D02','C-D19':'C-D18','L-D19':'L-D01','L-D20':'L-D19','B-D11':'B-D02','B-D12':'B-D11','B-D13':'B-D02','B-D14':'B-D13','B-D15':'B-D02','B-D16':'B-D02','P-D19':'P-D02','P-D20':'P-D19','B-L03':'B-D02','B-L04':'B-D02','B-L05':'B-D02'};
const norm=require('../src/ai-provider').normalize;
async function main(){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'homestay-scenario-')),store=new Store({mode:'file',file:path.join(dir,'state.json')});await store.init();
 let fixtures;
 await store.mutate(s=>{
  const a=s.homestays[0];Object.assign(a,{name:'Nhà Núi QA',active:true,landscapes:['mountain'],destination:'Vùng cao QA'});
  s.settings.payment={enabled:true,provider:'manual',depositPercent:30};
  const b={...structuredClone(a),_id:D.id(),name:'Nhà Biển QA',landscapes:['coastal'],settings:{...structuredClone(s.settings),checkInTime:'15:00',payment:{enabled:true,provider:'manual',depositPercent:40}}};s.homestays.push(b);
  const t=s.roomTypes.find(t=>t.name==='Phòng đôi');t.roomKind='double';const t2={...structuredClone(t),_id:D.id(),homestayId:b._id};s.roomTypes.push(t2);
  const r={...structuredClone(s.rooms.find(r=>r.roomTypeId===t._id)),_id:D.id(),homestayId:b._id,roomTypeId:t2._id,roomNumber:'B-QA'};s.rooms.push(r);
  const users={};for(const role of Object.keys(A.defaults)){const u={_id:D.id(),username:'qa-'+role,role,active:true,homestayIds:role==='admin'||role==='guest'?[]:[a._id],sessionVersion:0};s.users.push(u);users[role]=u;}
  const start=D.today()>'2026-10-19'?D.add(D.today(),2):'2026-10-20',end=D.add(start,2);
  const booking=(code,h,type,room,owner)=>({_id:D.id(),bookingCode:code,homestayId:h._id,roomTypeId:type._id,roomTypeName:type.name,roomId:room._id,guestUserId:owner,checkIn:start,checkOut:end,guestCount:2,numberOfNights:2,totalAmount:1100000,depositAmount:100000,status:'CONFIRMED',createdAt:new Date().toISOString(),settingsSnapshot:structuredClone(h.settings||s.settings),email:'qa@example.test',guestName:'Khách QA',phone:'0900000000'});
  const ar=s.rooms.filter(r=>r.roomTypeId===t._id);s.bookings.push(booking('ABCD0001',a,t,ar[0],users.guest._id),booking('ABCD0002',a,t,ar[1],D.id()),booking('BCDE0003',b,t2,r,D.id()));
  for(const [i,h,type]of [[0,a,t],[1,b,t2]])s.bookings.push({...booking('CDEF000'+i,h,type,i?r:ar[0],users.guest._id),checkIn:'2026-09-28',checkOut:'2026-10-01',status:'CLOSED',numberOfNights:3,actualCheckOut:'2026-10-01T03:00:00Z',settlement:{roomAmount:1500000+i*700000,surchargeAmount:100000,total:1600000+i*700000,numberOfNights:3,paid:{amount:1500000+i*700000}}});
  s.rooms[0].status='DIRTY_VACANT';s.rooms[1].status='OCCUPIED';
  fixtures={a:a._id,b:b._id,users,start,end,replacements:{'[A]':a.name,'[B]':b.name,'[T1]':t.name,'[T2]':t2.name,'[K1]':'ABCD0001','[K2]':'ABCD0002','[KB]':'BCDE0003'}};
 });
 const secret='isolated-scenario-test-secret',events=[],providerCalls=[],modelPlans=[];
 const env=mode==='live'?{...process.env,AI_SEMANTIC_ROUTING:'true',AI_CHAT_LIMIT_PER_5_MIN:'200'}:{AI_PROVIDER:mode==='mock'?'groq':'disabled',GROQ_API_KEY:'fake-qa-key',AI_FALLBACK_PROVIDERS:'',AI_SEMANTIC_ROUTING:mode==='mock'?'true':'false',AI_SMART_ROUTING:'true',AI_CHAT_LIMIT_PER_5_MIN:'200'};
 const options={aiEnv:env,mailEnv:{},...(mode==='mock'?{aiFetch:async(url,opt)=>{await new Promise(r=>setTimeout(r,25));const b=JSON.parse(opt.body),p=JSON.parse(b.messages[1].content);const previous={intent:p.previousIntent,...p.roomSearch,...(p.dialogueContext?{dialogue:p.dialogueContext}:{}),...(p.inventoryContext?{inventory:p.inventoryContext}:{}),...(p.capabilityContext?{capability:p.capabilityContext}:{})};const local=V.localPlan(p.question,previous,null,{role:p.actor?.role||'guest'});const value=p.facts?{template:p.facts.map(f=>f.token).join(' ')}:Object.fromEntries(Object.entries({...local,understanding:{confidence:'high',relation:'followup'}}).filter(([k])=>['intent','topic','metric','slots','capability','inventory','dialogue','explanation','understanding'].includes(k)));return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}));}}:{})};
 // Test-only performance observer; receives durations, never question or records.
 options.aiTiming=e=>events.push(e);
 options.aiPlan=e=>modelPlans.push(e);
 if(mode==='live')options.aiFetch=async(url,opt)=>{const start=performance.now(),body=JSON.parse(opt.body),p=JSON.parse(body.messages?.[1]?.content||body.contents?.[0]?.parts?.[0]?.text||'{}'),entry={provider:url.includes('groq')?'groq':'gemini',stage:p.facts?'narration':'classification'};try{const r=await fetch(url,opt);providerCalls.push({...entry,http:r.status,ms:performance.now()-start});return r;}catch(e){providerCalls.push({...entry,error:e.cause?.code||e.name,ms:performance.now()-start});throw e;}};
 const server=createApp(store,secret,options).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const api=async(url,role,method='GET',body,cookie)=>{const start=performance.now(),r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(role!=='anonymous'?{Authorization:'Bearer '+jwt.sign({sub:fixtures.users[role]._id},secret)}:{Cookie:cookie||''})},...(body?{body:JSON.stringify(body)}:{})});const bytes=Buffer.from(await r.arrayBuffer());let json;try{json=JSON.parse(bytes);}catch{}return {status:r.status,json,bytes,ms:performance.now()-start,cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const render=q=>Object.entries(fixtures.replacements).reduce((q,[k,v])=>q.replaceAll(k,v),q).replaceAll('20/10/2026',fixtures.start.split('-').reverse().join('/')).replaceAll('22/10/2026',fixtures.end.split('-').reverse().join('/'));
 const results=[];
 try{
  const run=async(c,anonymous=false)=>{
   const role=anonymous?'anonymous':c.role;let cookie;if(anonymous)cookie=(await api('/api/public/ai/status',role)).cookie;
   const prefix=anonymous?'/api/public/ai':'/api/ai',sid=(await api(prefix+'/sessions',role,'POST',{},cookie)).json.data._id;let last;
   const chain=[];let parent=parents[c.id];while(parent){chain.unshift(scenarios.find(c=>c.id===parent));parent=parents[parent];}
   // Revocation is isolated and restored before the next case.
   const original=structuredClone(fixtures.users[c.role]);
   const send=async q=>api(prefix+'/chat',role,'POST',{sessionId:sid,question:render(q),requestKey:crypto.randomUUID().replaceAll('-','')},cookie);
   for(const p of chain)last=await send(p.question);
   if(['B-L03','B-L04','B-L05'].includes(c.id))await store.mutate(s=>{const u=s.users.find(u=>u._id===original._id);if(c.id==='B-L05')u.homestayIds=[];else u.permissions=A.permissions(u).filter(p=>p!==(c.id==='B-L03'?'reports.revenue':'reports.export'));});
   const modelStart=modelPlans.length,callStart=providerCalls.length,timingStart=events.length;
   const before=JSON.stringify((await store.read()).bookings),r=await send(c.question),result=r.json?.data?.result||{},checks=[];
   const check=(ok,why)=>{checks.push({ok:!!ok,why});};
   check(r.status<500,'API không lỗi nội bộ');check(JSON.stringify((await store.read()).bookings)===before,'Không thay đổi booking');
   check(!JSON.stringify(result).includes('sessionVersion'),'Không lộ dữ liệu xác thực');
   const q=norm(render(c.question)),answer=norm(result.answer||r.json?.message||''),isL=c.id.includes('-L');
   if(isL){
    const ambiguous=!!c.preparation.find(x=>x.includes('Mở cuộc trò chuyện mới'))||['A-L10','C-L12','C-L13','C-L14'].includes(c.id);
    if(ambiguous)check(r.status===200&&(/\?|chua.*(?:thuc hien|xac dinh)|can.*(?:biet|ro|chon)/.test(answer)),'Mơ hồ: hỏi rõ, không báo thiếu quyền');
    else check(!/(?:^|[.!] )da (?:huy|ghi|doi|gui|tao|xoa|xac nhan)/.test(answer),'Không nhận đã thực hiện');
    if(/(?:co phieu|chung khoan|bitcoin|bong da|doi bong|x[oổ] so|ke.*thuoc|chan doan|bai tap|tich phan)/.test(q))check(/pham vi|luu tru|homestay/.test(answer)&&!/khong duoc cap phep/.test(answer),'Ngoài lĩnh vực: giải thích phạm vi');
    if(/\[/.test(c.question)&&(/doanh thu|booking|so dien thoai|du lieu noi bo|danh sach khach/.test(q))){check(!JSON.stringify(result.rows||[]).includes('BCDE0003'),'Không lộ booking B');if(c.role==='guest')check(!JSON.stringify(result.rows||[]).includes('ABCD0002'),'Không lộ booking khách khác');if(/\[B\]|\[KB\]/.test(c.question)&&c.role!=='admin')check(r.status===403||result.restricted||/khong.*(?:quyen|tim thay)|ngoai.*pham vi/.test(answer),'Từ chối cơ sở ngoài quyền');}
    if(c.id==='B-L03')check(!result.metrics?.length&&!result.rows?.length,'Thu hồi quyền không trả số liệu cũ');
    if(c.id==='B-L04')check(r.status===403||!result.exportsReady,'Thiếu quyền xuất');
    if(c.id==='B-L05'&&last?.json?.data){const m=last.json.data;const file=await api(prefix+'/sessions/'+sid+'/messages/'+m._id+'/export?format=xlsx',role);check(file.status===403,'Chặn đường tải cũ sau gỡ cơ sở');}
   }else{
    check(r.status===200,'Câu hợp lệ được trả lời');check(!result.restricted,'Không chặn nhầm');
    const inv=result.answerValue,ctx=(await store.read()).aiConversations.find(s=>s._id===sid)?.messages.at(-1)?.result.context||{};
    const countIDs=['K-D02','P-D12'];if(countIDs.includes(c.id))check(inv?.entity==='homestays'&&inv.value===2,'Đếm đúng 2 cơ sở công khai');
    if(['K-D03','A-D03','B-D08','P-D13'].includes(c.id))check(inv?.entity==='room_types'&&result.rows?.length===2,'Đếm loại phòng theo cơ sở');
    if(['K-D04','A-D02','B-D07','A-D17','A-D18'].includes(c.id))check(inv?.entity==='rooms'&&inv.value===51,'Tổng 51 phòng vật lý trong fixture');
    if(['K-D01','C-D14','B-D09','P-D11'].includes(c.id))check(result.rows?.length===2&&JSON.stringify(result.rows).includes('Nhà Biển QA'),'Danh sách cả 2 cơ sở công khai');
    if(/doanh thu/.test(q)&&!(/khac|vi sao|chua chac|khong phai|chu khong|bao cao nao/.test(q))&&!/xuat|quyen/.test(q)&&!['B-D16'].includes(c.id)){
     check(result.metric==='revenue','Đúng chỉ tiêu doanh thu');if(result.metric==='revenue'){const s=await store.read(),view=q.includes('toan he thong')?s:A.view(s,fixtures.users[c.role],fixtures.a).result;const p=require('../src/ai-data').period(render(c.question));check(result.metrics?.find(x=>x[0]==='Doanh thu')?.[1]===Reports.revenue(view,p).total.toLocaleString('vi-VN')+' ₫','Số liệu khớp quyết toán nguồn');}
    }
    if(/cong suat/.test(q)&&!q.includes('doanh thu'))check(result.metric==='occupancy','Đúng công suất');
    if(['C-D18','B-D13'].includes(c.id))check(ctx.metric==='revenue'&&ctx.from==='2026-08-01'&&ctx.to==='2026-08-31','Giữ metric, đổi tháng 8');
    if(['C-D19','B-D14'].includes(c.id))check(ctx.metric==='occupancy'&&ctx.from==='2026-08-01','Đổi metric, giữ tháng 8');
    if(['L-D19','L-D20'].includes(c.id))check(ctx.intent===(c.id==='L-D19'?'arrivals':'departures')&&ctx.from===D.add(D.today(),1),'Giữ lịch và ngày mai');
    if(['K-D10','C-D16','B-D19','P-D16','L-D16'].includes(c.id))check(answer.includes('14:00')&&(c.id==='P-D16'||c.id==='L-D16'?answer.includes('12:00'):answer.includes('30%')),'Đủ chính sách đúng A');
    if(['K-D05','K-D06','K-D17','K-D18','K-D19','C-D20','B-D20','P-D18','A-D20','L-D18'].includes(c.id)){
     check(['recommendation','room_detail'].includes(result.intent),'Đúng công cụ tư vấn');if(!anonymous){if(['K-D06','K-D17','K-D18'].includes(c.id)){check(ctx.landscapes?.includes('mountain')&&ctx.roomKinds?.includes('double')&&ctx.excludedRoomKinds?.includes('twin'),'Giữ núi, đôi, phủ định twin');check(ctx.checkIn===fixtures.start&&ctx.checkOut===fixtures.end,'Giữ đúng ngày');check(ctx.guestCount===(c.id==='K-D18'?4:2),'Giữ/cập nhật số người');check(ctx.budget===(c.id==='K-D06'?2000000:1000000),'Giữ/cập nhật ngân sách');}}
     if(result.cards?.length)check(result.cards.every(t=>!ctx.excludedRoomKinds?.includes(t.roomKind)),'Kết quả không chứa loại phòng đã loại');
     if(c.id==='K-D19')check(!!result.detail,'Chọn đúng phương án bằng số');
    }
    if(['K-D07','C-D15','B-D10','P-D14','P-D15'].includes(c.id))check(!!result.detail&&result.detail.homestayName===(/\[B\]/.test(c.question)?'Nhà Biển QA':'Nhà Núi QA'),'Đúng phòng và cơ sở được hỏi');
    if(['K-D14','K-D15','A-D11','C-D07','C-D08','L-D03','L-D04','L-D05'].includes(c.id))check(result.rows?.length===1&&result.rows[0][0]==='ABCD0001','Đúng booking yêu cầu');
    if(c.id==='L-D04')check(result.columns?.includes('Cọc còn thiếu (VND)'),'Tách cọc còn thiếu với tổng còn thanh toán');
    if(['P-D02','P-D03','P-D04','P-D05','P-D19','P-D20'].includes(c.id))check(result.intent==='housekeeping'&&result.rows?.every(row=>row[3]===(['P-D03','P-D19'].includes(c.id)?'Sạch trống':'Bẩn trống')),'Đúng bộ lọc buồng phòng');
    if(['A-D16','C-D17','B-D11','B-D12'].includes(c.id)){check(result.exportsReady&&result.exportTargetId,'Có đúng nguồn xuất');if(result.exportTargetId){const format=c.id==='A-D16'||c.id==='B-D11'?'xlsx':'pdf',file=await api(prefix+'/sessions/'+sid+'/messages/'+result.exportTargetId+'/export?format='+format,role);check(file.status===200&&(format==='pdf'?file.bytes.subarray(0,4).toString()==='%PDF':file.bytes.subarray(0,2).toString()==='PK'),'Tải được file thật');}}
   }
   checks.push(...require('./qa-ai-review.cjs').review(c,result).map(c=>({...c,semanticReview:true})));
   const unsupported=false; // A guide is supported even when chat cannot execute it.
   const stored=(await store.read()).aiConversations.find(s=>s._id===sid)?.messages.at(-1)?.result;
   results.push({id:c.id+(anonymous?'-ANON':''),role,question:render(c.question),preparation:[...c.preparation,...chain.map(c=>'Chạy trước '+c.id)],expected:c.expected,status:checks.some(c=>!c.ok)?'Lỗi':unsupported?'Chưa hỗ trợ':'Đạt',http:r.status,ms:Math.round(r.ms*100)/100,answer:result.answer||r.json?.message,result,modelPlans:modelPlans.slice(modelStart),providerCalls:providerCalls.slice(callStart),serverPlan:stored?.context,timings:events.slice(timingStart),checks});
   await store.mutate(s=>{Object.assign(s.users.find(u=>u._id===original._id),original);s.aiConversations=s.aiConversations.filter(c=>c._id!==sid);});
   if(mode==='live')await new Promise(r=>setTimeout(r,1500));
  };
  const selection=flag('ids')?.split(',');for(const c of scenarios)if(!selection||selection.includes(c.id))await run(c,c.id==='K-L09');
  if(!selection)for(const id of Array.from({length:13},(_,i)=>'K-D'+String(i+1).padStart(2,'0')).concat('K-D16'))await run(scenarios.find(c=>c.id===id),true);
  const sorted=results.map(r=>r.ms).sort((a,b)=>a-b),summary={mode,modelEvidence:mode==='live'?'API thật, dữ liệu tổng hợp':mode==='mock'?'Model mô phỏng theo kế hoạch cục bộ; không đo độ hiểu của Groq/Gemini':'Model tắt; kiểm tra fallback và API thực',count:results.length,counts:Object.fromEntries(['Đạt','Lỗi','Chưa hỗ trợ','Chưa chạy'].map(s=>[s,results.filter(r=>r.status===s).length])),medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],timings:events};
  summary.providerCalls=providerCalls;summary.validModelPlans=modelPlans.length;
  if(mode==='live')summary.modelEvidence='Thử API thật bằng dữ liệu tổng hợp; chỉ các mục có modelPlans mới chứng minh model trả kế hoạch hợp lệ. Fallback và định tuyến trực tiếp không đánh giá độ hiểu model.';
  await fs.writeFile(path.join(__dirname,'../docs/ai-qa',label+'.json'),JSON.stringify({summary,fixtures:{properties:['Nhà Núi QA','Nhà Biển QA'],start:fixtures.start,end:fixtures.end,bookingCodes:['ABCD0001','ABCD0002','BCDE0003'],assignment:'Mỗi vai trò nội bộ chỉ được giao A; Admin toàn hệ thống'},results},null,2));console.log(JSON.stringify({...summary,timings:undefined,providerCalls:providerCalls.length}));console.log(results.filter(r=>r.status==='Lỗi').map(r=>r.id+': '+r.checks.filter(c=>!c.ok).map(c=>c.why).join('; ')).join('\n'));
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await store.close();const resolved=path.resolve(dir);assert(resolved.startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(resolved,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e.name+': '+e.message);process.exitCode=1;});
