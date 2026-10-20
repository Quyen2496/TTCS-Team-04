'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{Store}=require('../src/store');
const {project}=require('./helpers/projection-fixture.cjs');
function mongoFixture(){
 const doc={_id:'state',revision:4,data:{users:[{_id:'u',active:true,role:'guest',sessionVersion:0}],homestays:[],settings:{privateMarker:'UNCHANGED'},bookings:[{bookingCode:'ABC00001',totalAmount:900}],aiConversations:[{_id:'mine',userId:'u',title:'Mine',messages:[{content:'old'}]},{_id:'other',userId:'v',title:'Other',messages:[{content:'DO_NOT_TOUCH'}]}]}};
 const updates=[],projections=[],store=new Store({mode:'mongo'});
 const session={startTransaction(){this.active=true;},inTransaction(){return this.active;},async abortTransaction(){this.active=false;},async commitTransaction(){this.active=false;},async endSession(){}};
 store.mongoose={connection:{startSession:async()=>session}};
 store.collection={findOne:async(query,{projection}={})=>{if(!projection)return structuredClone(doc);projections.push(projection);return project(doc,projection);},aggregate:(pipeline,options)=>({next:async()=>{const p=pipeline.at(-1).$project;if(p.bytes)return {bytes:2000,historyBytes:500,count:doc.data.aiConversations.length};projections.push(p);assert.deepEqual(pipeline[0],{$match:{_id:'state'}});return project(doc,p);}}),updateOne:async(filter,update,options)=>{updates.push({filter,update,options});if(filter.revision!==doc.revision)return {matchedCount:0};if(update.$push)doc.data.aiConversations.push(structuredClone(update.$push['data.aiConversations']));if(update.$set){const rule=options.arrayFilters[0],i=doc.data.aiConversations.findIndex(c=>c._id===rule['thread._id']&&c.userId===rule['thread.userId']);assert(i>=0);doc.data.aiConversations[i]=structuredClone(update.$set['data.aiConversations.$[thread]']);}if(update.$pull){const id=update.$pull['data.aiConversations'];doc.data.aiConversations=doc.data.aiConversations.filter(c=>!(c._id===id._id&&c.userId===id.userId));}doc.revision++;return {matchedCount:1};}};
 return {store,doc,updates,projections};
}
test('Projected conversation writes replace only the current thread and preserve other users and business data',async()=>{
 const {store,doc,updates}=mongoFixture(),original=structuredClone(doc.data);
 await store.mutateConversation(s=>{s.aiConversations[0].messages.push({content:'new'});s.settings.privateMarker='MUST_NOT_PERSIST';return 1;},{userId:'u',sessionId:'mine'});
 assert.deepEqual(doc.data.aiConversations[1],original.aiConversations[1]);assert.deepEqual(doc.data.bookings,original.bookings);assert.deepEqual(doc.data.settings,original.settings);assert.equal(doc.data.aiConversations[0].messages.length,2);assert.deepEqual(Object.keys(updates[0].update.$set),['data.aiConversations.$[thread]']);
});

test('Identity projects one account and only owned thread metadata; history stays an array of at most one',async()=>{
 const {store,doc}=mongoFixture();doc.data.users.push({_id:'v',password:'foreign-secret'});
 const list=await store.readIdentity('u');assert.deepEqual(list.users,[doc.data.users[0]]);assert.deepEqual(list.aiConversations,[{_id:'mine',userId:'u',title:'Mine',updatedAt:undefined}]);
 const own=await store.readIdentity('u','mine');assert.deepEqual(own.aiConversations,[doc.data.aiConversations[0]]);
 assert.deepEqual((await store.readIdentity('u','other')).aiConversations,[]);
 assert.deepEqual((await store.readIdentity('unknown')).users,[]);
 doc.data.users=[];delete doc.data.aiConversations;assert.deepEqual((await store.readIdentity('u','mine')).aiConversations,[]);
});

test('Missing state fails explicitly for both identity and transactional conversation reads',async()=>{
 const {store}=mongoFixture();store.collection.aggregate=()=>({next:async()=>null});
 await assert.rejects(store.readIdentity('u'),/STATE_NOT_FOUND/);
 await assert.rejects(store.mutateConversation(()=>{}, {userId:'u'}),/STATE_NOT_FOUND/);
});

test('The fixture rejects the original invalid nested projection instead of silently accepting it',()=>{
 assert.throws(()=>project({data:{users:[]}}, {'data.users':{$elemMatch:{_id:'u'}}}),/MongoDB forbids/);
});

test('Projected HTTP authentication retains 401/403, homestay scope and full overview arrays',async()=>{
 const D=require('../src/domain'),A=require('../src/access'),jwt=require('jsonwebtoken'),{createApp}=require('../server');
 const {store,doc}=mongoFixture();doc.data=D.seedData();const h=doc.data.homestays[0]._id;
 doc.data.homestays.push({_id:'foreign-h',name:'Other',active:true});doc.data.rooms=[{_id:'r1',homestayId:h,roomTypeId:'t',roomNumber:'101'},{_id:'r2',homestayId:'foreign-h',roomTypeId:'t2',roomNumber:'201'}];doc.data.roomTypes=[{_id:'t',homestayId:h},{_id:'t2',homestayId:'foreign-h'}];
 doc.data.users=['admin','owner','guest','inactive'].map(role=>({_id:role,username:role,role:role==='inactive'?'admin':role,homestayIds:[h],active:role!=='inactive',sessionVersion:3,password:'NEVER_SEND'}));
 doc.data.aiConversations=[{_id:'foreign-thread',userId:'owner',messages:[{content:'PRIVATE'}],updatedAt:'2026-10-19'}];A.upgrade(doc.data);
 let fullReads=0;const read=store.read.bind(store);store.read=()=>{fullReads++;return read();};
 const secret='projected-http-fixture-only',server=createApp(store,secret).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=async(url,user='admin',version=3,property)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+url,{headers:{Authorization:'Bearer '+jwt.sign({sub:user,version},secret),...(property?{'X-Homestay-Id':property}:{})}});return {status:r.status,...await r.json()};};
 try{
  const me=await call('/api/auth/me');assert.equal(me.status,200);assert(!('password'in me.data));assert.equal(fullReads,0);
  const state=await call('/api/admin/state');assert.equal(state.status,200);assert.equal(state.data.rooms.length,2);assert.equal(state.data.roomTypes.length,2);assert.equal(fullReads,0);
  const scoped=await call('/api/admin/state','owner');assert.equal(scoped.status,200);assert.deepEqual(scoped.data.rooms.map(r=>r._id),['r1']);
  assert.equal((await call('/api/admin/state','owner',3,'foreign-h')).status,403);assert.equal((await call('/api/admin/state','guest')).status,403);
  for(const user of ['missing','inactive'])assert.equal((await call('/api/auth/me',user)).status,401);assert.equal((await call('/api/auth/me','admin',2)).status,401);
  const foreign=await call('/api/ai/sessions/foreign-thread');assert.equal(foreign.status,404);assert(!foreign.data?.messages);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('Filtering owned metadata preserves the global conversation creation limit',async()=>{
 const {store,doc,updates}=mongoFixture();doc.data.aiConversations=Array.from({length:3000},(_,i)=>({_id:'foreign-'+i,userId:'v',messages:[]}));
 await assert.rejects(store.mutateConversation(s=>s.aiConversations.push({_id:'new',userId:'u',messages:[]}),{userId:'u'}),{code:'AI_HISTORY_LIMIT'});assert.equal(updates.length,0);
});
test('Creating a conversation from metadata never overwrites the histories omitted by projection',async()=>{
 const {store,doc}=mongoFixture(),other=structuredClone(doc.data.aiConversations);
 await store.mutateConversation(s=>s.aiConversations.push({_id:'new',userId:'u',messages:[]}),{userId:'u'});assert.deepEqual(doc.data.aiConversations.slice(0,2),other);assert.equal(doc.data.aiConversations[2]._id,'new');
});
test('Conversation store refuses a different owner and uses minimal fields for public data',async()=>{
 const {store,updates,projections}=mongoFixture();await assert.rejects(store.mutateConversation(s=>{s.aiConversations[0].userId='v';},{userId:'u',sessionId:'mine'}),{code:'FORBIDDEN'});assert.equal(updates.length,0);
 await store.readPublic('policy');const p=projections.at(-1);assert(!p['data.users']);assert(!p['data.aiConversations']);assert(!p['data.bookings']);assert(p['data.homestays']);
});

test('AI initialization and business tools never read or rewrite full state and persist history across requests',async()=>{
 const D=require('../src/domain'),A=require('../src/access'),jwt=require('jsonwebtoken'),{createApp}=require('../server');
 const {store,doc,updates}=mongoFixture();doc.data=D.seedData();A.upgrade(doc.data);
 const h=doc.data.homestays[0]._id;doc.data.users=[{_id:'u',role:'admin',username:'admin',active:true,sessionVersion:0,homestayIds:[h]}];
 doc.data.aiConversations=[{_id:'mine',userId:'u',messages:[],title:'Cuộc trò chuyện mới',updatedAt:new Date().toISOString()},{_id:'foreign',userId:'v',messages:[{content:'FOREIGN_HISTORY'}]}];
 const bookings=structuredClone(doc.data.bookings),rooms=structuredClone(doc.data.rooms);
 store.read=async()=>{throw Error('FULL_STATE_READ_FORBIDDEN');};store.mutate=async()=>{throw Error('BUSINESS_WRITE_FORBIDDEN');};
 const secret='isolated-ai-performance-test',server=createApp(store,secret,{aiEnv:{AI_PROVIDER:'disabled',AI_CHAT_LIMIT_PER_5_MIN:'200'}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=async(url,body)=>{const r=await fetch('http://127.0.0.1:'+server.address().port+url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+jwt.sign({sub:'u'},secret),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,...await r.json()};};
 try{
  assert.equal((await call('/api/ai/status')).status,200);
  for(const question of ['Tổng quan homestay','Khách đến hôm nay','Gợi ý việc cần xử lý']){const r=await call('/api/ai/chat',{question,sessionId:'mine',requestKey:crypto.randomUUID().replaceAll('-','')});assert.equal(r.status,200);assert(r.data.result.answer);}
  const history=await call('/api/ai/sessions/mine');assert.equal(history.status,200);assert.equal(history.data.messages.length,6);
  assert.deepEqual(doc.data.bookings,bookings);assert.deepEqual(doc.data.rooms,rooms);assert.equal(doc.data.aiConversations[1].messages[0].content,'FOREIGN_HISTORY');
  assert(updates.every(u=>Object.keys(u.update.$set).every(k=>k==='data.aiConversations.$[thread]')));
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('AI context loads current account, owned history and type labels without other history or financial snapshots',async()=>{
 const {store,doc}=mongoFixture();doc.data.roomTypes=[{_id:'t',name:'Named type',homestayId:'h',active:true,description:'UNNEEDED_DESCRIPTION',images:['UNNEEDED_GALLERY']}];
 doc.data.bookings[0].operationRequests=[{result:'RETRY_SNAPSHOT'}];
 const state=await store.readAiContext('u','mine');assert.deepEqual(state.users,[doc.data.users[0]]);assert.equal(state.aiConversations.length,1);assert.equal(state.aiConversations[0]._id,'mine');
 assert.equal(state.roomTypes[0].name,'Named type');for(const value of ['DO_NOT_TOUCH','UNNEEDED_DESCRIPTION','UNNEEDED_GALLERY','RETRY_SNAPSHOT'])assert(!JSON.stringify(state).includes(value));
});

test('Projected admin knowledge counts all accounts without reading their credentials or histories',async()=>{
 const {store,doc}=mongoFixture();doc.data.users.push({_id:'v',role:'owner',active:false,password:'FOREIGN_PASSWORD'});
 await store.mutateConversation(state=>{assert.deepEqual(state.accountStats,[{role:'guest',active:true},{role:'owner',active:false}]);assert.equal(state.users.length,1);assert(!JSON.stringify(state).includes('FOREIGN_PASSWORD'));},{userId:'u',sessionId:'mine',profile:'ai_business'});
});
