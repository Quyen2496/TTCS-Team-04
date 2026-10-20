'use strict';
const D=require('../../src/domain'),A=require('../../src/access'),S=require('../../src/settlement'),bcrypt=require('bcryptjs');
const {project}=require('./projection-fixture.cjs');
function fixture(Store,{delay=0}={}){
 const data=D.seedData();A.upgrade(data);S.upgrade(data);const h=data.homestays[0]._id;
 const password=bcrypt.hashSync('PerfQA12345',4);
 data.homestays.push({_id:'other-property',name:'Other property',active:true});
 data.users=['admin','owner','reception','report','guest','housekeeping'].map(role=>({_id:role,username:role,email:role+'@example.test',password,role,active:true,sessionVersion:0,homestayIds:role==='guest'?[]:[h]}));
 data.aiConversations=Array.from({length:100},(_,i)=>({_id:'thread-'+i,userId:'someone-else',title:'PRIVATE_CHAT',messages:[{role:'assistant',content:'PRIVATE_HISTORY'.repeat(1500)}]}));
 data.passwordResets=[{hash:'PRIVATE_RESET_HASH'}];data.audit=[{action:'PRIVATE_AUDIT',at:new Date().toISOString()}];
 data.bookings.push({_id:'foreign-booking',bookingCode:'FOREIGN01',homestayId:'other-property',roomTypeId:'other-type',status:'CONFIRMED',checkIn:D.today(),checkOut:D.add(D.today(),1),guestName:'FOREIGN_CUSTOMER',totalAmount:900,depositAmount:0});
 const doc={_id:'state',revision:5,data},reads=[];let writes=0;
 const store=new Store({mode:'mongo'});
 async function finish(kind,projection){const data=projection?project(doc,projection):structuredClone(doc);reads.push({kind,projection,bytes:Buffer.byteLength(JSON.stringify(data))});if(delay)await new Promise(r=>setTimeout(r,delay));return data;}
 store.collection={findOne:async(filter,options={})=>finish(options.projection?'projection':'full',options.projection),aggregate:pipeline=>({next:()=>finish('aggregate',pipeline.at(-1).$project)}),updateOne:async()=>{writes++;throw Error('FIXTURE_WRITE_FORBIDDEN');}};
 store.mutate=async()=>{writes++;throw Error('FIXTURE_WRITE_FORBIDDEN');};
 return {store,doc,reads,get writes(){return writes;}};
}
module.exports={fixture};
