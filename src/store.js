const fs=require('node:fs/promises'),path=require('node:path');
const D=require('./domain'),A=require('./access'),S4=require('./settlement'),Mail=require('./booking-mail');
// $elemMatch projection only supports top-level arrays. These arrays live
// under data, so use aggregation expressions and filter owners on the server.
function identityProjection(userId,sessionId){
 const owned={$filter:{input:{$ifNull:['$data.aiConversations',[]]},as:'thread',cond:{$eq:['$$thread.userId',{$literal:userId}]}}};
 return {
  'data.users':{$slice:[{$filter:{input:{$ifNull:['$data.users',[]]},as:'user',cond:{$eq:['$$user._id',{$literal:userId}]}}},1]},
  'data.aiConversations':sessionId
   ?{$slice:[{$filter:{input:owned,as:'thread',cond:{$eq:['$$thread._id',{$literal:sessionId}]}}},1]}
   :{$map:{input:owned,as:'thread',in:{_id:'$$thread._id',userId:'$$thread.userId',title:'$$thread.title',updatedAt:'$$thread.updatedAt'}}}
 };
}
function roomNights(s){
 D.expire(s);const rows=[],seen=new Set();
 for(const b of s.bookings.filter(b=>['PENDING','CONFIRMED','CHECKED_IN'].includes(b.status)))for(const seg of D.segments(b)){
  if(!D.day(seg.checkIn)||!D.day(seg.checkOut)||!seg.roomId)continue;
  if((Date.parse(seg.checkOut)-Date.parse(seg.checkIn))/86400000>365)throw new D.AppError(409,'INVALID_INVENTORY','Khoảng giữ phòng trong dữ liệu không hợp lệ.');
  for(let date=seg.checkIn;date<seg.checkOut;date=D.add(date,1)){
   const key=seg.roomId+':'+date;if(seen.has(key))throw new D.AppError(409,'NO_AVAILABILITY','Dữ liệu có phòng bị giữ trùng đêm. Kiểm tra booking trước khi tiếp tục.');seen.add(key);
   rows.push({roomId:seg.roomId,stayDate:date,bookingId:b._id,bookingCode:b.bookingCode,homestayId:b.homestayId});
  }
 }return rows;
}
class Store {
 constructor({mode='mongo',uri,file}){Object.assign(this,{mode,uri,file});this.queue=Promise.resolve();}
 async init({existingOnly=false}={}){
  if(this.mode==='file'){
   await fs.mkdir(path.dirname(this.file),{recursive:true});try{this.state=JSON.parse(await fs.readFile(this.file,'utf8'));}catch(e){if(e.code!=='ENOENT'||existingOnly)throw e;this.state=D.seedData();await this.saveFile(this.state);}
  }else{
   const mongoose=require('mongoose');await mongoose.connect(this.uri,{serverSelectionTimeoutMS:6000});this.mongoose=mongoose;const db=mongoose.connection;
   this.collection=db.collection('homestay_state');this.nights=db.collection('homestay_room_nights');this.invoices=db.collection('homestay_invoices');
   if(existingOnly){if(!await this.collection.findOne({_id:'state'},{projection:{_id:1}}))throw Error('STATE_NOT_FOUND');return;}
   await this.invoices.createIndex({year:1,sequence:1},{unique:true,name:'unique_invoice_number'});
   await this.invoices.createIndex({bookingId:1},{unique:true,name:'unique_invoice_booking'});
   await this.nights.createIndex({roomId:1,stayDate:1},{unique:true,name:'unique_room_night'});
   await this.collection.updateOne({_id:'state'},{$setOnInsert:{revision:0,data:D.seedData()}},{upsert:true});
  }
  if(!existingOnly)await this.mutate(s=>{A.upgrade(s);S4.upgrade(s);s.emailJobs||=[];s.schedulerRuns||=[];});
 }
 async saveFile(data){roomNights(data);const temp=this.file+'.tmp';await fs.writeFile(temp,JSON.stringify(data,null,2));await fs.rename(temp,this.file);}
 async read(){return require('./ai-telemetry').time(this.mode==='file'?'file_read':'atlas_read',async()=>this.mode==='file'?structuredClone(this.state):(await this.collection.findOne({_id:'state'})).data);}
 // Authentication never downloads business state or conversation metadata.
 async readAccount(predicate,stage){
  const R=require('./read-model'),propertyFields=['_id','name','active'];
  if(this.mode==='file'){
   const state=R.defaults({
    homestays:(this.state.homestays||[]).map(h=>Object.fromEntries(propertyFields.filter(k=>h[k]!==undefined).map(k=>[k,structuredClone(h[k])]))),
    platformVersion:this.state.platformVersion,receptionInvoiceAccessVersion:this.state.receptionInvoiceAccessVersion
   });
   state.users=(this.state.users||[]).filter(predicate.file).slice(0,1).map(u=>structuredClone(u));return state;
  }
  const projection={
   'data.homestays':{$map:{input:{$ifNull:['$data.homestays',[]]},as:'h',in:Object.fromEntries(propertyFields.map(k=>[k,'$$h.'+k]))}},
   'data.platformVersion':1,'data.receptionInvoiceAccessVersion':1,
   'data.users':{$slice:[{$filter:{input:{$ifNull:['$data.users',[]]},as:'user',cond:predicate.mongo}},1]}
  };
  return require('./ai-telemetry').time(stage,async()=>{const doc=await this.collection.aggregate([{$match:{_id:'state'}},{$project:projection}]).next();if(!doc)throw Error('STATE_NOT_FOUND');return R.defaults(doc.data);});
 }
 async readAuth(userId){return this.readAccount({file:u=>u._id===userId,mongo:{$eq:['$$user._id',{$literal:userId}]}},'atlas_auth');}
 async readLogin(identifier){
  const name=String(identifier||'').trim().toLowerCase();
  if(!name)return require('./read-model').defaults({platformVersion:1,receptionInvoiceAccessVersion:1});
  return this.readAccount({file:u=>u.active&&(String(u.username||'').toLowerCase()===name||String(u.email||'').toLowerCase()===name),mongo:{$and:[{$eq:['$$user.active',true]},{$or:['username','email'].map(k=>({$eq:[{$toLower:{$ifNull:['$$user.'+k,'']}},{$literal:name}]}))}]}},'atlas_login');
 }
 async readOperational(options={}){
  const R=require('./read-model');if(this.mode==='file')return R.fromFile(this.state,options);
  return require('./ai-telemetry').time('atlas_operational',async()=>{const doc=await this.collection.aggregate([{$match:{_id:'state'}},{$project:R.operationalProjection(options)}]).next();if(!doc)throw Error('STATE_NOT_FOUND');return R.defaults(doc.data);});
 }
 async readPublic(profile='catalog'){
  if(this.mode==='file')return this.read();
  const fields=['homestays','settings','pricingCalendar','platformVersion','receptionInvoiceAccessVersion'];
  if(profile!=='policy')fields.push('roomTypes','amenities');
  if(profile==='catalog'||profile==='availability')fields.push('rooms');
  const projection=Object.fromEntries(fields.map(f=>['data.'+f,1]));
  if(profile==='availability')for(const f of ['status','roomId','roomTypeId','homestayId','checkIn','checkOut','holdExpiresAt','roomSegments'])projection['data.bookings.'+f]=1;
  return require('./ai-telemetry').time('atlas_public_'+profile,async()=>{const doc=await this.collection.findOne({_id:'state'},{projection});if(!doc)throw Error('STATE_NOT_FOUND');return {users:[],aiConversations:[],bookings:[],rooms:[],roomTypes:[],amenities:[],uploads:[],audit:[],lookupFailures:{},...doc.data};});
 }
 async readDetail(kind,value,ids){
  if(!['bookings','rooms'].includes(kind))throw Error('INVALID_DETAIL_KIND');
  return this.readOperational({profile:kind==='bookings'?'booking_detail':'room_detail',detail:{kind,key:kind==='bookings'?'bookingCode':'_id',value,ids}});
 }
 async readIdentity(userId,sessionId){
  if(this.mode==='file')return this.read();
  const projection={...identityProjection(userId,sessionId),'data.homestays':1,'data.settings':1,'data.platformVersion':1,'data.receptionInvoiceAccessVersion':1};
  if(sessionId){projection['data.bookings.bookingCode']=1;projection['data.bookings.guestUserId']=1;}
  return require('./ai-telemetry').time('atlas_identity',async()=>{const d=await this.collection.aggregate([{$match:{_id:'state'}},{$project:projection}]).next();if(!d)throw Error('STATE_NOT_FOUND');return {rooms:[],roomTypes:[],bookings:[],uploads:[],users:[],aiConversations:[],audit:[],...d.data};});
 }
 async readAiContext(userId,sessionId){
  const R=require('./read-model');
  if(this.mode==='file'){
   const state=R.fromFile(this.state,{profile:'metadata'});state.users=structuredClone((this.state.users||[]).filter(u=>u._id===userId).slice(0,1));
   const owned=(this.state.aiConversations||[]).filter(c=>c.userId===userId);
   state.aiConversations=structuredClone(sessionId?owned.filter(c=>c._id===sessionId).slice(0,1):owned.map(({_id,userId,title,updatedAt})=>({_id,userId,title,updatedAt})));
   state.roomTypes=(this.state.roomTypes||[]).map(({_id,homestayId,name,active})=>({_id,homestayId,name,active}));state.bookings=(this.state.bookings||[]).map(({bookingCode,guestUserId})=>({bookingCode,guestUserId}));return state;
  }
  const projection={...R.operationalProjection({profile:'metadata'}),...identityProjection(userId,sessionId),'data.roomTypes':{$map:{input:{$ifNull:['$data.roomTypes',[]]},as:'t',in:{_id:'$$t._id',homestayId:'$$t.homestayId',name:'$$t.name',active:'$$t.active'}}},'data.bookings.bookingCode':1,'data.bookings.guestUserId':1};
  return require('./ai-telemetry').time('atlas_ai_context',async()=>{const doc=await this.collection.aggregate([{$match:{_id:'state'}},{$project:projection}]).next();if(!doc)throw Error('STATE_NOT_FOUND');return R.defaults(doc.data);});
 }
 async mutateConversation(fn,{userId,sessionId,profile='policy'}={}){
  if(this.mode==='file')return this.mutate(fn);
  return require('./ai-telemetry').time('atlas_conversation_write',async()=>{
   for(let attempt=0;attempt<10;attempt++){
    const tx=await this.mongoose.connection.startSession();
    try{
     tx.startTransaction({readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:5000});
     const fields=['homestays','settings','platformVersion','receptionInvoiceAccessVersion'];if(profile!=='policy')fields.push('roomTypes','rooms','amenities','pricingCalendar');
     const R=require('./read-model'),aiProfile=profile.startsWith('ai_');
     const projection={...(aiProfile?R.operationalProjection({profile}):Object.fromEntries(fields.map(f=>['data.'+f,1]))),revision:1,...identityProjection(userId,sessionId)};
     if(profile==='ai_business')projection['data.accountStats']={$map:{input:{$ifNull:['$data.users',[]]},as:'u',in:{role:'$$u.role',active:'$$u.active'}}};
     if(sessionId&&!aiProfile){projection['data.bookings.bookingCode']=1;projection['data.bookings.guestUserId']=1;}
     if(profile==='availability')for(const field of ['status','roomId','roomTypeId','homestayId','checkIn','checkOut','holdExpiresAt','roomSegments'])projection['data.bookings.'+field]=1;
     const T=require('./ai-telemetry'),doc=await T.time('atlas_conversation_read',()=>this.collection.aggregate([{$match:{_id:'state'}},{$project:projection}],{session:tx}).next());
     if(!doc)throw Error('STATE_NOT_FOUND');
     const state={users:[],aiConversations:[],roomTypes:[],rooms:[],bookings:[],amenities:[],uploads:[],audit:[],lookupFailures:{},...doc.data};
     const before=state.aiConversations.map(c=>c._id),beforeText=JSON.stringify(state.aiConversations),output=fn(state);
     if(beforeText===JSON.stringify(state.aiConversations)){await tx.abortTransaction();return output;}
     // Only the current user's one conversation can be written. Business
     // state, mail jobs, invoices and room-night ledgers are never rewritten.
     const thread=sessionId?state.aiConversations.find(c=>c._id===sessionId):state.aiConversations.find(c=>!before.includes(c._id));
     let update,extra={session:tx};
     if(thread){if(thread.userId!==userId)D.fail('Không có quyền sửa hội thoại.','FORBIDDEN',403);if(sessionId){update={$set:{'data.aiConversations.$[thread]':thread},$inc:{revision:1}};extra.arrayFilters=[{'thread._id':sessionId,'thread.userId':userId}];}else update={$push:{'data.aiConversations':thread},$inc:{revision:1}};}
     else if(sessionId)update={$pull:{'data.aiConversations':{_id:sessionId,userId}},$inc:{revision:1}};
     else D.fail('Thay đổi hội thoại không hợp lệ.','STATE_CONFLICT',409);
     // Server-side size projection avoids downloading every user's history.
     const sizes=await T.time('atlas_conversation_size',()=>this.collection.aggregate([{$match:{_id:'state'}},{$project:{bytes:{$bsonSize:'$data'},historyBytes:{$bsonSize:{history:'$data.aiConversations'}},count:{$size:{$ifNull:['$data.aiConversations',[]]}}}}],{session:tx}).next());
     if(!sessionId&&thread&&sizes.count>=3000)D.fail('Lịch sử đã đạt giới hạn lưu.','AI_HISTORY_LIMIT',409);
     const delta=Buffer.byteLength(JSON.stringify(state.aiConversations))-Buffer.byteLength(beforeText);
     if(sizes.bytes+delta>14*1024*1024||sizes.historyBytes+delta>4*1024*1024)D.fail('Lịch sử đã đạt dung lượng lưu.','AI_HISTORY_LIMIT',409);
     const saved=await T.time('atlas_conversation_update',()=>this.collection.updateOne({_id:'state',revision:doc.revision},update,extra));if(!saved.matchedCount)D.fail('Hội thoại đã thay đổi. Vui lòng thử lại.','STATE_CONFLICT',409);
     await T.time('atlas_conversation_commit',()=>tx.commitTransaction());return output;
    }catch(e){if(tx.inTransaction())await tx.abortTransaction().catch(()=>{});if((e.hasErrorLabel?.('TransientTransactionError')||e.code===112)&&attempt<9)continue;throw e;}finally{await tx.endSession();}
   }
  });
 }
 async mutate(fn){
  return require('./ai-telemetry').time(this.mode==='file'?'file_write':'atlas_write',()=>this.mutateState(fn));
 }
 async mutateState(fn){
  if(this.mode==='file'){const work=this.queue.then(async()=>{const copy=structuredClone(this.state);D.expire(copy);const result=fn(copy);S4.upgrade(copy);Mail.changes(copy,this.state);await this.saveFile(copy);this.state=copy;return result;});this.queue=work.catch(()=>{});return work;}
  for(let attempt=0;attempt<30;attempt++){
   const session=await this.mongoose.connection.startSession();
   try{
    session.startTransaction({readConcern:{level:'snapshot'},writeConcern:{w:'majority'},maxCommitTimeMS:5000});
    const doc=await this.collection.findOne({_id:'state'},{session}),before=JSON.stringify(doc.data);D.expire(doc.data);const result=fn(doc.data);S4.upgrade(doc.data);Mail.changes(doc.data,JSON.parse(before));const rows=roomNights(doc.data);
    if(JSON.stringify(doc.data)===before){await session.abortTransaction();return result;}
    await this.collection.updateOne({_id:'state',revision:doc.revision},{$set:{data:doc.data},$inc:{revision:1}},{session});
    for(const invoice of doc.data.invoices||[])await this.invoices.updateOne({_id:invoice._id},{$setOnInsert:invoice},{upsert:true,session});
    const current=await this.nights.find({},{session}).toArray(),wanted=new Map(rows.map(r=>[r.roomId+':'+r.stayDate,r]));
    const removals=current.filter(r=>!wanted.has(r.roomId+':'+r.stayDate)||wanted.get(r.roomId+':'+r.stayDate).bookingId!==r.bookingId),removedIds=new Set(removals.map(r=>String(r._id)));
    if(removals.length)await this.nights.deleteMany({_id:{$in:removals.map(r=>r._id)}},{session});
    const kept=new Set(current.filter(r=>!removedIds.has(String(r._id))).map(r=>r.roomId+':'+r.stayDate));
    const additions=rows.filter(r=>!kept.has(r.roomId+':'+r.stayDate));if(additions.length)await this.nights.insertMany(additions,{session});
    for(let n=0;n<5;n++){try{await session.commitTransaction();return result;}catch(e){if(!e.hasErrorLabel?.('UnknownTransactionCommitResult'))throw e;if(n===4)throw new D.AppError(503,'COMMIT_UNKNOWN','Chưa xác định kết quả lưu. Gửi lại đúng mã yêu cầu để kiểm tra.');}}
   }catch(e){
    if(session.inTransaction())await session.abortTransaction().catch(()=>{});
    if(e.code===11000)throw new D.AppError(409,'NO_AVAILABILITY','Phòng đã được giữ trong khoảng ngày này.');
    if(e.hasErrorLabel?.('TransientTransactionError')||e.code===112){if(attempt<29){await new Promise(r=>setTimeout(r,Math.min(40,attempt+1)+Math.floor(Math.random()*10)));continue;}throw new D.AppError(409,'STATE_CONFLICT','Hồ sơ đang được cập nhật. Gửi lại đúng mã yêu cầu.');}
    if(e.code===20)throw new Error('Sprint 3 cần MongoDB Atlas hoặc replica set hỗ trợ transaction. MongoDB standalone không được hỗ trợ.');
    throw e;
   }finally{await session.endSession();}
  }
  throw new D.AppError(409,'STATE_CONFLICT','Dữ liệu đang được cập nhật. Vui lòng thử lại.');
 }
 async close(){await this.queue;if(this.mongoose)await this.mongoose.disconnect();}
}
module.exports={Store,roomNights};
