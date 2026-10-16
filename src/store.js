const fs=require('node:fs/promises'),path=require('node:path');
const D=require('./domain'),A=require('./access'),S4=require('./settlement'),Mail=require('./booking-mail');
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
 async init(){
  if(this.mode==='file'){
   await fs.mkdir(path.dirname(this.file),{recursive:true});try{this.state=JSON.parse(await fs.readFile(this.file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;this.state=D.seedData();await this.saveFile(this.state);}
  }else{
   const mongoose=require('mongoose');await mongoose.connect(this.uri,{serverSelectionTimeoutMS:6000});this.mongoose=mongoose;const db=mongoose.connection;
   this.collection=db.collection('homestay_state');this.nights=db.collection('homestay_room_nights');this.invoices=db.collection('homestay_invoices');
   await this.invoices.createIndex({year:1,sequence:1},{unique:true,name:'unique_invoice_number'});
   await this.invoices.createIndex({bookingId:1},{unique:true,name:'unique_invoice_booking'});
   await this.nights.createIndex({roomId:1,stayDate:1},{unique:true,name:'unique_room_night'});
   await this.collection.updateOne({_id:'state'},{$setOnInsert:{revision:0,data:D.seedData()}},{upsert:true});
  }
  await this.mutate(s=>{A.upgrade(s);S4.upgrade(s);s.emailJobs||=[];s.schedulerRuns||=[];});
 }
 async saveFile(data){roomNights(data);const temp=this.file+'.tmp';await fs.writeFile(temp,JSON.stringify(data,null,2));await fs.rename(temp,this.file);}
 async read(){return this.mode==='file'?structuredClone(this.state):(await this.collection.findOne({_id:'state'})).data;}
 async mutate(fn){
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
