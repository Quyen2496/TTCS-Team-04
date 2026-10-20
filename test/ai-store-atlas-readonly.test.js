'use strict';
// Opt-in: executes Store pipelines on the configured Atlas, without init(),
// migrations, seeding or writes. Synthetic edge cases use $replaceWith, not insert.
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {Store}=require('../src/store');
test('Atlas: real-server projection regression (READ ONLY)',{skip:process.env.HOMESTAY_ATLAS_READONLY_QA!=='1'},async t=>{
 require('dotenv').config({path:path.join(__dirname,'../.env')});
 const m=require('mongoose'),connection=await m.createConnection(process.env.MONGODB_URI,{serverSelectionTimeoutMS:6000}).asPromise();
 const collection=connection.collection('homestay_state'),store=new Store({mode:'mongo'});store.collection=collection;store.mongoose={connection};
 try{
  await t.test('Original nested $elemMatch projection fails with MongoDB code 31275',async()=>{
   await assert.rejects(collection.findOne({_id:'state'},{projection:{'data.users':{$elemMatch:{_id:'missing'}}}}),e=>e.code===31275);
  });
  await t.test('Existing account and owned histories are filtered by the real Store pipeline',async()=>{
   const meta=await collection.aggregate([{$match:{_id:'state'}},{$project:{'data.users._id':1,'data.users.role':1,'data.aiConversations._id':1,'data.aiConversations.userId':1}}]).next();assert(meta);
   const user=meta.data.users.find(u=>u.role==='admin')||meta.data.users[0];assert(user);
   const auth=await store.readAuth(user._id);assert.equal(auth.users.length,1);assert.equal(auth.aiConversations.length,0);assert.equal(auth.bookings.length,0);
   const identifier=auth.users[0].username||auth.users[0].email;
   if(identifier)assert.equal((await store.readLogin(identifier.toUpperCase())).users[0]._id,user._id);
   const screen=await store.readOperational({screen:'owner'});assert.equal(screen.users.length,0);assert.equal(screen.bookings.length,0);assert.equal(screen.aiConversations.length,0);assert(Array.isArray(screen.roomTypes));
   const accounts=await store.readOperational({screen:'users',users:true});assert(accounts.users.every(u=>!('password'in u)&&!('sessionVersion'in u)));
   const state=await store.readIdentity(user._id);assert.equal(state.users.length,1);assert(state.users[0]._id===user._id);assert.equal(typeof state.users[0].active,'boolean');
   assert(state.aiConversations.every(c=>c.userId===user._id&&!('messages'in c)));
   assert.equal(state.aiConversations.length,(meta.data.aiConversations||[]).filter(c=>c.userId===user._id).length);
   const foreign=meta.data.aiConversations?.find(c=>c.userId!==user._id);
   if(foreign)assert.equal((await store.readIdentity(user._id,foreign._id)).aiConversations.length,0);
   const own=state.aiConversations[0];if(own)assert(Array.isArray((await store.readIdentity(user._id,own._id)).aiConversations[0].messages));
   const missing=await store.readIdentity('__nonexistent_projection_qa__','__missing_thread__');assert.equal(missing.users.length,0);assert.equal(missing.aiConversations.length,0);
   await store.mutateConversation(s=>{assert.equal(s.users.length,1);assert(s.aiConversations.every(c=>c.userId===user._id));},{userId:user._id,sessionId:own?._id}); // unchanged -> abort
  });
  await t.test('Real view pipelines preserve report, inventory and detail semantics without business writes',async()=>{
   const R=require('../src/read-model'),Reports=require('../src/business-reports'),Ops=require('../src/operations'),D=require('../src/domain'),same=require('node:util').isDeepStrictEqual;
   const projection=Object.fromEntries([...R.base,'rooms','roomTypes','bookings','amenities','pricingCalendar','invoices','emailJobs','schedulerRuns','mailWorkerRuns'].map(k=>['data.'+k,1]));
   const snapshot=R.defaults((await collection.findOne({_id:'state'},{projection})).data);
   for(const screen of ['overview','owner','reception','rooms','reports','invoices','emails'])assert(same(await store.readOperational({screen}),R.fromFile(snapshot,{screen})),'Native view differs: '+screen);
   for(const options of [{profile:'revenue'},{profile:'inventory'},{profile:'metadata',extra:['invoices']},{profile:'metadata',extra:['emailJobs','schedulerRuns','mailWorkerRuns']}])assert(same(await store.readOperational(options),R.fromFile(snapshot,options)),'Native profile differs: '+options.profile);
   const revenue=await store.readOperational({profile:'revenue'}),inventory=await store.readOperational({profile:'inventory'}),period={from:D.today().slice(0,7)+'-01',to:D.today()};
   assert(same(Reports.revenue(snapshot,period),Reports.revenue(revenue,period)),'Revenue must match complete state');
   assert(same(Reports.occupancy(snapshot,period),Reports.occupancy(inventory,period)),'Occupancy must match complete state');
   const dates={from:D.today(),to:D.add(D.today(),13)};
   assert(same(Ops.alerts(structuredClone(snapshot),dates),Ops.alerts(structuredClone(inventory),dates)),'Shortage alerts must match complete state');
   assert(same(Ops.board(structuredClone(snapshot),dates,true),Ops.board(structuredClone(inventory),dates,true)),'Room board must match complete state');
  });
  await t.test('AI tools and lazy detail use real Mongo expressions and preserve complete-state results',async()=>{
   const R=require('../src/read-model'),Data=require('../src/ai-data'),same=require('node:util').isDeepStrictEqual;
   const snapshot=R.defaults((await collection.findOne({_id:'state'},{projection:Object.fromEntries([...R.base,'rooms','roomTypes','bookings','amenities','pricingCalendar'].map(k=>['data.'+k,1]))})).data);
   const meta=await collection.aggregate([{$match:{_id:'state'}},{$project:{'data.users._id':1,'data.users.role':1,'data.users.active':1}}]).next(),userMeta=meta.data.users.find(u=>u.role==='admin'&&u.active);assert(userMeta);
   const user=(await store.readAuth(userMeta._id)).users[0],context=await store.readAiContext(user._id);assert.equal(context.users.length,1);assert(context.aiConversations.every(c=>c.userId===user._id&&!('messages'in c)));
   for(const [intent,profile,question]of [['overview','ai_overview','Tổng quan homestay'],['arrivals','ai_schedule','Khách đến hôm nay'],['alerts','ai_alerts','Gợi ý việc cần xử lý']]){
    await store.mutateConversation(state=>{const plan={intent},expected=Data.run(Data.scope(structuredClone({...snapshot,users:[user]}),user),user,question,plan),actual=Data.run(Data.scope(structuredClone(state),user),user,question,plan);assert(same(expected,actual),'AI tool differs: '+intent);},{userId:user._id,profile});
   }
   for(const profile of ['reception_list','rooms_list','ai_business'])assert(same(await store.readOperational({profile}),R.fromFile(snapshot,{profile})),'Native columns differ: '+profile);
   const ids=snapshot.homestays.map(h=>h._id),booking=snapshot.bookings[0],room=snapshot.rooms[0];
   if(booking){const detail=await store.readDetail('bookings',booking.bookingCode,ids);assert.equal(detail.bookings.length,1);assert(same(detail.bookings[0].nightlyPrices,booking.nightlyPrices));assert(same(detail.bookings[0].depositLedger,booking.depositLedger));assert(!('operationRequests'in detail.bookings[0]));assert.equal((await store.readDetail('bookings',booking.bookingCode,[])).bookings.length,0);}
   if(room){const detail=await store.readDetail('rooms',room._id,ids);assert(same(detail.rooms[0],room));assert.equal((await store.readDetail('rooms',room._id,[])).rooms.length,0);}
  });
  for(const scenario of ['missing','empty','owned','foreign','duplicates','literal'])await t.test('Real Mongo expressions: '+scenario,async()=>{
   const userId=scenario==='literal'?'$user':'u',sessionId=scenario==='literal'?'$thread':'mine';
   const user={_id:userId,active:true,sessionVersion:3,role:'guest'},thread={_id:sessionId,userId,messages:[],title:'Mine',updatedAt:'2026-10-19T00:00:00Z'};
   const data=scenario==='missing'?{}:{users:scenario==='empty'?[]:[user,{_id:'v'}],aiConversations:scenario==='empty'?[]:scenario==='foreign'?[{...thread,userId:'v'}]:[thread,{_id:'foreign',userId:'v',messages:[{content:'PRIVATE'}]},...(scenario==='duplicates'?[thread]:[])]};
   let writes=0;store.collection={aggregate:(pipeline,options)=>collection.aggregate([pipeline[0],{$replaceWith:{$literal:{_id:'state',revision:1,data}}},...pipeline.slice(1)],options),updateOne:async()=>{writes++;throw Error('READ_ONLY_QA_WRITE_BLOCKED');}};
   const state=await store.readIdentity(userId,sessionId),expected=['missing','empty','foreign'].includes(scenario)?0:1;
   assert(Array.isArray(state.users));assert(Array.isArray(state.aiConversations));assert.equal(state.users.length,['missing','empty'].includes(scenario)?0:1);assert.equal(state.aiConversations.length,expected);
   const list=await store.readIdentity(userId);assert(list.aiConversations.every(c=>c.userId===userId&&!('messages'in c)));
   await store.mutateConversation(s=>{assert.equal(s.aiConversations.length,expected);},{userId,sessionId});assert.equal(writes,0);
  });
 }finally{await connection.close();}
});
