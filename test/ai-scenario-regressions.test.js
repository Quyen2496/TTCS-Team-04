'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),jwt=require('jsonwebtoken');
const A=require('../src/access'),D=require('../src/domain'),Q=require('../src/ai-query-scope'),V=require('../src/ai-conversation'),{Store}=require('../src/store'),{createApp}=require('../server');
async function fixture(fn){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hs-scenario-regression-')),store=new Store({mode:'file',file:path.join(dir,'state.json')});await store.init();
 let a,b;await store.mutate(s=>{a=s.homestays[0]._id;s.homestays[0].name='Nhà Núi QA';b=D.id();s.homestays.push({_id:b,name:'Nhà Biển QA',active:true});const t={...s.roomTypes[1],_id:D.id(),homestayId:b};s.roomTypes.push(t);s.rooms.push({...s.rooms[0],_id:D.id(),homestayId:b,roomTypeId:t._id});for(const role of ['admin','owner','guest'])s.users.push({_id:D.id(),username:'reg-'+role,active:true,role,homestayIds:role==='owner'?[a]:[],sessionVersion:0});s.bookings.push({_id:D.id(),bookingCode:'ABCD0001',homestayId:a,roomTypeId:s.roomTypes[1]._id,roomTypeName:s.roomTypes[1].name,roomId:s.rooms.find(r=>r.roomTypeId===s.roomTypes[1]._id)._id,guestUserId:s.users.find(u=>u.role==='guest')._id,checkIn:D.add(D.today(),2),checkOut:D.add(D.today(),4),numberOfNights:2,guestCount:2,totalAmount:1000000,depositAmount:100000,status:'CONFIRMED',settingsSnapshot:{payment:{depositPercent:30}}});});
 const secret='scenario-regression-secret',users=(await store.read()).users,calls=[];
 const server=createApp(store,secret,{aiEnv:{AI_PROVIDER:'groq',GROQ_API_KEY:'fake',AI_FALLBACK_PROVIDERS:'',AI_SEMANTIC_ROUTING:'true',AI_SMART_ROUTING:'true'},aiFetch:async(url,opt)=>{calls.push(JSON.parse(opt.body));return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({intent:'policy',understanding:{confidence:'low',relation:'new_topic',clarify:'goal'}})}}]}));}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=async(url,role='admin',method='GET',body,selected)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+url,{method,headers:{Authorization:'Bearer '+jwt.sign({sub:users.find(u=>u.username==='reg-'+role)._id},secret),'Content-Type':'application/json',...(selected?{'X-Homestay-Id':selected}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};};
 const chat=async(q,role='admin',sid,selected)=>{sid||=(await call('/api/ai/sessions',role,'POST',{})).data._id;return call('/api/ai/chat',role,'POST',{question:q,sessionId:sid,requestKey:crypto.randomUUID().replaceAll('-','')},selected);};
 try{await fn({store,a,b,call,chat,calls});}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await store.close();assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(dir,{recursive:true,force:true});}
}
test('A named private property outside membership is rejected, including mixed A+B; public B remains accessible',()=>fixture(async({chat,a,b})=>{
 const identity=await chat('Tôi đang được hỗ trợ theo vai trò nào và phạm vi nào?','owner');assert.match(identity.data.result.answer,/Nhà Núi QA/);assert(!identity.data.result.answer.includes('Nhà Biển QA'));
 for(const q of ['Doanh thu Nhà Biển QA tháng 9 năm 2026','Gộp doanh thu Nhà Núi QA và Nhà Biển QA tháng 9 năm 2026'])assert.equal((await chat(q,'owner')).status,403);
 const publicRead=await chat('Phòng đôi tại Nhà Biển QA có tiện nghi gì?','owner');assert.equal(publicRead.status,200);assert.equal(publicRead.data.result.detail.homestayId,b);
}));
test('All-system and named reports override a narrower UI filter without granting extra properties',()=>fixture(async({chat,store,a,b})=>{
 const all=await chat('Doanh thu toàn hệ thống từ 01/10/2026 đến 18/10/2026','admin',null,a);assert.equal(all.status,200);
 const named=await chat('Doanh thu Nhà Biển QA tháng 9 năm 2026','admin',null,a);assert.equal(named.status,200);
 const state=await store.read(),stored=r=>state.aiConversations.find(c=>c._id===r.data.session._id).messages.at(-1).result;
 assert.deepEqual(stored(all).propertyIds,[a,b]);assert.deepEqual(stored(named).propertyIds,[b]);
 assert.equal(all.data.result.metric,'revenue');assert.equal(named.data.result.metric,'revenue');
}));
test('Booking deposit data uses the ownership-filtered transaction tool and separates required, received, remaining',()=>fixture(async({chat})=>{
 const r=await chat('Booking ABCD0001 đã cọc bao nhiêu và còn thiếu bao nhiêu tiền cọc?','guest');assert.equal(r.status,200);const result=r.data.result;assert.equal(result.intent,'booking');assert.equal(result.rows.length,1);assert.equal(result.rows[0][7],100000);assert.equal(result.rows[0][result.columns.indexOf('Cọc yêu cầu (VND)')],300000);assert.equal(result.rows[0][result.columns.indexOf('Cọc còn thiếu (VND)')],200000);
}));
test('Metric corrections and report follow-ups retain the verified month and named property',()=>fixture(async({chat,store,a})=>{
 const first=await chat('Doanh thu Nhà Núi QA tháng 9 năm 2026');const sid=first.data.session._id;await chat('Còn tháng 8 năm 2026 thì sao?','admin',sid);const r=await chat('Tôi muốn công suất chứ không phải doanh thu trong kỳ vừa hỏi.','admin',sid);assert.equal(r.data.result.metric,'occupancy');const c=(await store.read()).aiConversations.find(c=>c._id===sid).messages.at(-1).result.context;assert.equal(c.from,'2026-08-01');assert.equal(c.to,'2026-08-31');assert.equal(c.queryPropertyId,a);
}));
test('Property names do not become scenery or inventory triggers; ordinal selection precedes stale catalog offers',()=>{
 const s=D.seedData();s.homestays[0].name='Nhà Núi QA';assert.equal(V.localPlan('Phong sach trong tai nha nui qa',{},null,{role:'housekeeping'},s).intent,'housekeeping');assert.equal(V.localPlan('Mình chọn phương án số 1, giới thiệu kỹ phòng đó', {catalogOffer:{step:'guests'}},null,{role:'guest'},s).intent,'room_detail');assert.equal(Q.selection(s,{role:'admin'},'toàn hệ thống',{intent:'report'},s.homestays[0]._id),null);
});
test('Unknown goals ask one question while unrelated topics explain scope, never report missing role permission',()=>fixture(async({chat})=>{
 const unclear=await chat('Cái đó bao nhiêu tiền?','guest');assert.equal(unclear.status,200);assert.match(unclear.data.result.answer,/\?/);assert(!unclear.data.result.answer.includes('không được cấp phép'));const unrelated=await chat('Dự đoán cổ phiếu nào tăng mạnh','guest');assert.equal(unrelated.status,403);assert.match(unrelated.message,/phạm vi|lĩnh vực/);
}));
test('Verified explicit reports do not spend model calls and still recheck revoked grants on history/export',()=>fixture(async({chat,call,store,calls})=>{
 const r=await chat('Doanh thu hôm nay','owner');assert.equal(r.status,200);assert.equal(calls.length,0);await store.mutate(s=>{s.users.find(u=>u.username==='reg-owner').permissions=['homestays.view'];});const history=await call('/api/ai/sessions/'+r.data.session._id,'owner');assert.equal(history.data.messages.at(-1).result.restricted,true);assert.equal((await call('/api/ai/sessions/'+r.data.session._id+'/messages/'+r.data._id+'/export?format=xlsx','owner')).status,403);
}));
