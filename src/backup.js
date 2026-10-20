'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const D=require('./domain'),S=require('./settlement');
function key(env){const value=env.BACKUP_KEY||env.JWT_SECRET;if(!value||value.length<32)throw Error('Sao lưu cần BACKUP_KEY hoặc JWT_SECRET tối thiểu 32 ký tự.');return crypto.createHash('sha256').update(value).digest();}
function validate(state){
 if(!state||!['bookings','rooms','roomTypes','homestays','users'].every(k=>Array.isArray(state[k])))throw Error('Cấu trúc dữ liệu sao lưu không hợp lệ.');
 require('./store').roomNights(structuredClone(state));const invoices=state.invoices||[],numbers=new Set(),bookings=new Set();
 for(const i of invoices){if(numbers.has(i.number)||bookings.has(i.bookingId)||!state.bookings.some(b=>b._id===i.bookingId&&S.closed(b)))throw Error('Hoá đơn trong sao lưu không nhất quán.');numbers.add(i.number);bookings.add(i.bookingId);}
 return {bookings:state.bookings.length,rooms:state.rooms.length,invoices:invoices.length,deposit:state.bookings.reduce((n,b)=>n+(b.depositAmount||0),0),settled:state.bookings.reduce((n,b)=>n+(b.settlement?.total||0),0)};
}
function encode(payload,env){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(env),iv),bytes=Buffer.concat([cipher.update(zlib.gzipSync(Buffer.from(JSON.stringify(payload)))),cipher.final()]);return Buffer.concat([Buffer.from('HSBACKUP2\n'),iv,cipher.getAuthTag(),bytes]);}
function decode(bytes,env){if(bytes.subarray(0,10).toString()!=='HSBACKUP2\n')throw Error('Không đúng định dạng sao lưu HOMESTAY.');const decipher=crypto.createDecipheriv('aes-256-gcm',key(env),bytes.subarray(10,22));decipher.setAuthTag(bytes.subarray(22,38));const zipped=Buffer.concat([decipher.update(bytes.subarray(38)),decipher.final()]);const data=JSON.parse(zlib.gunzipSync(zipped,{maxOutputLength:256*1024*1024}));validate(data.state);if(data.sha256!==crypto.createHash('sha256').update(JSON.stringify(data.state)).digest('hex'))throw Error('Sao lưu không khớp checksum.');return data;}
async function writeBackup(store,{directory=path.join(__dirname,'../backups/database'),env=process.env,now=Date.now()}={}){
 const started=performance.now(),state=await store.read(),summary=validate(state),payload={format:2,createdAt:new Date(now).toISOString(),version:require('../package.json').version,summary,state,sha256:crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex')},bytes=encode(payload,env);
 await fs.mkdir(directory,{recursive:true,mode:0o700});const name='homestay-'+new Date(now).toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex')+'.hsbackup',file=path.join(directory,name),temp=file+'.tmp';
 try{await fs.writeFile(temp,bytes,{flag:'wx',mode:0o600});decode(await fs.readFile(temp),env);await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}
 const names=(await fs.readdir(directory)).filter(n=>/^homestay-.*\.hsbackup$/.test(n)).sort().reverse();for(const old of names.slice(7))await fs.unlink(path.join(directory,old));
 return {name,...summary,bytes:bytes.length,durationMs:Math.round(performance.now()-started),at:new Date(now).toISOString(),status:'SUCCESS'};
}
const activeStores=new WeakSet();
async function backup(store,options={}){
 if(activeStores.has(store))throw new D.AppError(409,'BACKUP_BUSY','Một bản sao lưu đang được tạo. Bạn chờ hoàn tất rồi thử lại nhé.');
 activeStores.add(store);const id=crypto.randomUUID(),now=options.now??Date.now();let claimed=false;
 try{
  await store.mutate(s=>{if(s.backupLease&&Date.parse(s.backupLease.until)>now)throw new D.AppError(409,'BACKUP_BUSY','Một bản sao lưu đang được tạo.');s.backupLease={id,until:new Date(now+600000).toISOString()};});claimed=true;
  return await writeBackup(store,options);
 }finally{
  try{if(claimed)await store.mutate(s=>{if(s.backupLease?.id===id)delete s.backupLease;});}finally{activeStores.delete(store);}
 }
}
async function manual(store,{requestKey,actor,env=process.env,directory}={}){
 if(!/^[a-f0-9]{32}$/.test(requestKey||''))D.fail('Yêu cầu sao lưu chưa hợp lệ.');
 const run=await store.mutate(s=>{
  s.backupRuns||=[];const previous=s.backupRuns.find(r=>r.kind==='MANUAL'&&r.requestKey===requestKey&&r.actor===actor);
  if(previous)return {previous:structuredClone(previous)};
  if(s.backupRuns.some(r=>r.status==='RUNNING'&&Date.parse(r.leaseUntil)>Date.now())||s.backupLease&&Date.parse(s.backupLease.until)>Date.now())throw new D.AppError(409,'BACKUP_BUSY','Đang sao lưu. Bạn chờ hoàn tất nhé.');
  const row={_id:D.id(),kind:'MANUAL',actor,requestKey,status:'RUNNING',at:new Date().toISOString(),leaseUntil:new Date(Date.now()+600000).toISOString()};s.backupRuns.push(row);s.backupRuns=s.backupRuns.slice(-50);return {row:structuredClone(row)};
 });
 if(run.previous)return run.previous;
 try{
  const result=await backup(store,{env,directory:directory||env.BACKUP_DIR||undefined});
  return await store.mutate(s=>{const row=s.backupRuns.find(r=>r._id===run.row._id);Object.assign(row,result);delete row.leaseUntil;D.log(s,actor,'MANUAL_BACKUP',{name:result.name});return structuredClone(row);});
 }catch(error){
  await store.mutate(s=>{const row=s.backupRuns.find(r=>r._id===run.row._id);if(row){row.status='FAILED';row.error='Chưa sao lưu được. Kiểm tra thư mục, dung lượng và khoá mã hoá.';delete row.leaseUntil;}});
  if(error instanceof D.AppError)throw error;
  throw new D.AppError(503,'BACKUP_FAILED','Chưa sao lưu được. Kiểm tra thư mục, dung lượng và khoá mã hoá.');
 }
}
function createScheduler(store,{env=process.env,directory,now=()=>Date.now()}={}){let busy=false;return {async tick(){
 if(busy||env.BACKUP_ENABLED!=='true')return;const day=S.localDate(now()),clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(now()));
 if(clock<'02:00')return;const claim=await store.mutate(s=>{s.backupRuns||=[];if(s.backupRuns.some(r=>r.kind!=='MANUAL'&&r.day===day&&(r.status==='SUCCESS'||r.status==='RUNNING'&&Date.parse(r.leaseUntil)>now())))return false;s.backupRuns.push({day,kind:'AUTO',status:'RUNNING',at:new Date(now()).toISOString(),leaseUntil:new Date(now()+600000).toISOString()});s.backupRuns=s.backupRuns.slice(-30);return true;});if(!claim)return;
 busy=true;try{const result=await backup(store,{env,directory:directory||env.BACKUP_DIR||undefined,now:now()});await store.mutate(s=>{const row=s.backupRuns.findLast(r=>r.kind!=='MANUAL'&&r.day===day&&r.status==='RUNNING');Object.assign(row,result);delete row.leaseUntil;});}
 catch{await store.mutate(s=>{const row=s.backupRuns.findLast(r=>r.kind!=='MANUAL'&&r.day===day&&r.status==='RUNNING');Object.assign(row,{status:'FAILED',error:'Sao lưu thất bại; kiểm tra thư mục, dung lượng và khoá mã hoá.'});delete row.leaseUntil;});throw Error('Sao lưu thất bại.');}finally{busy=false;}
 }};}
async function restoreToQA(file,target,{env=process.env}={}){
 const started=performance.now();if(!/^HOMESTAY_(QA|DEMO)(?:[_-].*)?$/i.test(path.basename(path.dirname(target)))||!target.endsWith('.json'))throw Error('Chỉ phục hồi vào thư mục HOMESTAY_QA hoặc HOMESTAY_DEMO riêng.');
 const data=decode(await fs.readFile(file),env);await fs.mkdir(path.dirname(target),{recursive:true,mode:0o700});await fs.writeFile(target,JSON.stringify(data.state,null,2),{flag:'wx',mode:0o600});
 const summary=validate(JSON.parse(await fs.readFile(target,'utf8')));return {summary,durationMs:Math.round(performance.now()-started)};
}
async function restoreMongoToQA(file,uri,{env=process.env}={}){
 const started=performance.now(),{MongoClient}=require('mongoose').mongo,client=new MongoClient(uri,{serverSelectionTimeoutMS:10000});
 const name=client.options.dbName;
 if(!/^HOMESTAY_(QA|DEMO)(?:[_-].*)?$/i.test(name||''))throw Error('Chỉ phục hồi vào database HOMESTAY_QA… hoặc HOMESTAY_DEMO… riêng.');
 const payload=decode(await fs.readFile(file),env),state=payload.state;
 try{
  await client.connect();const db=client.db(),collection=db.collection('homestay_state'),nights=db.collection('homestay_room_nights'),invoices=db.collection('homestay_invoices');
  for(const name of ['homestay_state','homestay_room_nights','homestay_invoices'])if(await db.collection(name).countDocuments())throw Error('Database QA đích đã có dữ liệu. Chọn database QA mới.');
  await nights.createIndex({roomId:1,stayDate:1},{unique:true,name:'unique_room_night'});await invoices.createIndex({year:1,sequence:1},{unique:true,name:'unique_invoice_number'});await invoices.createIndex({bookingId:1},{unique:true,name:'unique_invoice_booking'});
  const session=client.startSession();try{await session.withTransaction(async()=>{await collection.insertOne({_id:'state',revision:0,data:state},{session});const rows=require('./store').roomNights(structuredClone(state));if(rows.length)await nights.insertMany(rows,{session});if(state.invoices?.length)await invoices.insertMany(state.invoices,{session});});}finally{await session.endSession();}
  const summary=validate((await collection.findOne({_id:'state'})).data);return {summary,roomNights:await nights.countDocuments(),invoiceDocuments:await invoices.countDocuments(),durationMs:Math.round(performance.now()-started)};
 }finally{await client.close();}
}
module.exports={validate,encode,decode,backup,manual,createScheduler,restoreToQA,restoreMongoToQA};
