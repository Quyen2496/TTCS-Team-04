'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),jwt=require('jsonwebtoken');
const D=require('../src/domain'),A=require('../src/access'),{Store}=require('../src/store'),{createApp}=require('../server');
async function fixture(fn){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hs-public-services-')),store=new Store({mode:'file',file:path.join(dir,'state.json')});await store.init();let a,b,type;
 await store.mutate(s=>{const h=s.homestays[0];a=h._id;h.name='Mộc Miên Đà Lạt Homestay';h.experiences=['Ăn sáng ở sân chung'];s.settings.cancellationRules=[{hoursBefore:72,refundPercent:80},{hoursBefore:0,refundPercent:0}];s.settings.payment={enabled:true,provider:'manual',depositPercent:35};b=D.id();s.homestays.push({_id:b,name:'Mộc Miên Sa Pa Homestay',active:true,settings:{...s.settings,cancellationRules:[{hoursBefore:24,refundPercent:60}],payment:{enabled:false,provider:'manual'}}});type=s.roomTypes.find(t=>t.name==='Phòng đôi');type.name='Phòng đôi Mộc Miên';for(const role of Object.keys(A.defaults))s.users.push({_id:D.id(),username:'svc-'+role,role,active:true,homestayIds:[b],sessionVersion:0});});
 const secret='service-fixture-secret',users=(await store.read()).users;let modelCalls=0;
 const server=createApp(store,secret,{aiEnv:{AI_PROVIDER:'groq',GROQ_API_KEY:'fake',AI_FALLBACK_PROVIDERS:'',AI_SEMANTIC_ROUTING:'true',AI_SMART_ROUTING:'true'},aiFetch:async()=>{modelCalls++;throw Error('Provider unavailable during this test');}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=async(url,role,method='GET',body,cookie)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+url,{method,headers:{'Content-Type':'application/json',...(role?{Authorization:'Bearer '+jwt.sign({sub:users.find(u=>u.username==='svc-'+role)._id},secret)}:{Cookie:cookie||''})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,headers:r.headers,...await r.json()};};
 const chat=async(q,role='guest',thread)=>{const prefix=role?'/api/ai':'/api/public/ai';if(!thread){const init=role?{}:await call(prefix+'/status'),cookie=init.headers?.get('set-cookie')?.split(';')[0];thread={id:(await call(prefix+'/sessions',role,'POST',{},cookie)).data._id,cookie};}const r=await call(prefix+'/chat',role,'POST',{question:q,sessionId:thread.id,requestKey:crypto.randomUUID().replaceAll('-','')},thread.cookie);return {...r,thread};};
 try{await fn({chat,call,store,a,b,type,modelCalls:()=>modelCalls});}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await store.close();assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(dir,{recursive:true,force:true});}
}
for(const role of [...Object.keys(A.defaults),null])test('Cancellation is public, property-specific and deterministic for '+(role||'anonymous'),()=>fixture(async({chat,modelCalls})=>{
 const r=await chat('cho toi chinh sach huy va hoan tien coc tai moc mien homestay da lat nhu the nao',role);assert.equal(r.status,200);assert.deepEqual(r.data.result.rows,[['Mộc Miên Đà Lạt Homestay',72,80],['Mộc Miên Đà Lạt Homestay',0,0]]);assert(r.data.result.columns.includes('Tỷ lệ hoàn (%)'));assert(!r.data.result.columns.includes('Tỷ lệ cọc trên tổng giá booking'));assert.match(r.data.result.answer,/chính sách đã chốt|chính sách.*chốt/);assert.equal(modelCalls(),0);
}));
test('Missing and ambiguous property identities ask a focused question instead of expanding to all',()=>fixture(async({chat})=>{
 for(const q of ['chính sách hoàn tiền','Chính sách hoàn cọc Mộc Miên homestay?']){const r=await chat(q);assert.equal(r.status,200);assert.deepEqual(r.data.result.rows,[]);assert.match(r.data.result.answer,/cơ sở nào|homestay nào/);assert(!r.data.result.answer.includes('tra số liệu'));}
 const all=await chat('cho tôi xem chính sách hoàn tiền của tất cả các homestay');assert.equal(all.data.result.rows.length,3);assert(all.data.result.rows.some(r=>r[0]==='Mộc Miên Sa Pa Homestay'&&r[2]===60));
}));
test('Incident support does not infer liability, claim a ticket, or ask guests to repair equipment',()=>fixture(async({chat,modelCalls})=>{
 const r=await chat('Xin chào, tôi lỡ làm hỏng điều hoà ở phòng của mình, giờ tôi phải làm sao?',null);assert.equal(r.status,200);assert.match(r.data.result.answer,/lễ tân hoặc chủ homestay/);assert.match(r.data.result.answer,/không tự.*sửa/);assert.match(r.data.result.answer,/chưa.*bồi thường/);assert.match(r.data.result.answer,/chưa tạo phiếu/);assert.equal(modelCalls(),0);
}));
test('Breakfast evidence is separate from inclusion and price; missing evidence is not a negative assertion',()=>fixture(async({chat})=>{
 const a=await chat('Mộc Miên Đà Lạt homestay có phục vụ bữa sáng không?');assert.match(a.data.result.answer,/Có thông tin công khai/);assert.match(a.data.result.answer,/Chưa có thông tin.*gồm trong giá/);assert.match(a.data.result.answer,/phụ phí chưa/);
 const b=await chat('Mộc Miên Sa Pa Homestay có bữa sáng không?');assert.match(b.data.result.answer,/chưa cập nhật.*có phục vụ/);assert(!b.data.result.answer.includes('không phục vụ bữa sáng'));
 const missing=await chat('Homestay có phục vụ bữa sáng không?');assert.match(missing.data.result.answer,/homestay nào/);
}));
test('Smart TV and QR do not imply paid accounts or Apple/Google Pay support',()=>fixture(async({chat})=>{
 const tv=await chat('Mộc Miên Đà Lạt Homestay có Netflix, YouTube Premium trên Smart TV không?');assert.match(tv.data.result.answer,/Netflix: chưa.*xác nhận/);assert.match(tv.data.result.answer,/YouTube Premium: chưa.*xác nhận/);
 const pay=await chat('Tại Mộc Miên Đà Lạt Homestay có Apple Pay, Google Pay hoặc chuyển khoản QR code không?');assert.match(pay.data.result.answer,/Apple Pay và Google Pay chưa/);assert.match(pay.data.result.answer,/Có chuyển khoản QR/);assert.match(pay.data.result.answer,/chưa nhận tiền/);
}));
test('Named amenities and complete availability questions override unrelated room-search context',()=>fixture(async({chat,store,modelCalls})=>{
 const from=D.add(D.today(),2),to=D.add(from,2),first=await chat('Mộc Miên Đà Lạt homestay có bữa sáng không?');
 const detail=await chat('Loại phòng đôi Mộc Miên tại Mộc Miên Đà Lạt Homestay có những tiện nghi gì?','guest',first.thread);assert.equal(detail.data.result.intent,'room_detail');assert.match(detail.data.result.answer,/^Tiện nghi của/);assert(!detail.data.result.answer.includes('ngày nào'));
 const r=await chat('Ngày '+from+' đến '+to+', Mộc Miên Đà Lạt Homestay còn phòng cho 2 người không?','guest',first.thread);assert.equal(r.data.result.intent,'availability');assert(r.data.result.rows.length>0);assert(r.data.result.rows.every(row=>row[0]==='Mộc Miên Đà Lạt Homestay'&&row[4]===2));assert.equal(modelCalls(),0);
}));
