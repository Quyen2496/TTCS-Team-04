'use strict';
const path=require('node:path'),net=require('node:net'),crypto=require('node:crypto');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const {Store}=require('../src/store'),C=require('../src/collection'),B=require('../src/backup');
const digest=s=>crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex');
const listening=port=>new Promise(resolve=>{const socket=net.connect({host:'127.0.0.1',port});socket.setTimeout(1500);socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(false);});});
async function main(){
 if(await listening(Number(process.env.PORT||3001)))throw Error('Hãy dừng HOMESTAY bằng Ctrl+C trước khi cập nhật danh mục.');
 const store=new Store({mode:process.env.DATA_MODE||'mongo',uri:process.env.MONGODB_URI,file:process.env.HOMESTAY_DATA_FILE||path.join(__dirname,'../data/homestay.json')});
 try{
  await store.init();const before=await store.read(),candidate=structuredClone(before),result=C.applyCollection(candidate);
  if(!result.changed){console.log('Đã có danh mục '+C.VERSION+'. Không ghi đè các chỉnh sửa sau cập nhật.');console.table(result.properties);return;}
  console.table(result.properties);
  if(result.splits?.length){console.log('Các loại bổ sung: chỉ chuyển phòng sạch trống chưa từng gắn booking; giữ mã phòng.');console.table(result.splits.map(({name,movedRooms,totalRooms})=>({name,movedRooms,totalRooms})));}
  if(process.argv.includes('--preview')){console.log('Đây là bản xem trước; chưa áp dụng danh mục.');return;}
  const directory=path.join(__dirname,'../backups/catalog-1-9-0',new Date().toISOString().replace(/[:.]/g,'-'));
  const backup=await B.backup(store,{directory});
  const fingerprint=digest(before);
  await store.mutate(s=>{if(digest(s)!==fingerprint)throw Error('Dữ liệu vừa thay đổi trong lúc sao lưu. Giữ server dừng và chạy lại.');return C.applyCollection(s);});
  C.validateCollection(await store.read());
  console.log('Đã cập nhật danh mục '+C.VERSION+'. Booking, hoá đơn, tài khoản và cấu hình thanh toán được giữ lại.');
  console.log('Bản sao dữ liệu mã hoá: '+path.join(directory,backup.name));
  console.log('Tài khoản nhân viên giữ nguyên phạm vi cơ sở; admin có thể phân công thêm trong Quản lý tài khoản.');
 }finally{await store.close();}
}
if(require.main===module)main().catch(err=>{console.error('Chưa cập nhật danh mục:',String(err.message).replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi,'[URI đã ẩn]'));process.exitCode=1;});
module.exports={main};
