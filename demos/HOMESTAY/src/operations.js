'use strict';
const D=require('./domain'),GuestInfo=require('./guest-info');
const active=b=>['PENDING','CONFIRMED','CHECKED_IN'].includes(b.status);
const fingerprint=body=>require('node:crypto').createHash('sha256').update(JSON.stringify(body)).digest('hex');
const version=(b,body)=>{if(body.expectedVersion!==undefined&&body.expectedVersion!==(b.version||0))D.fail('Hồ sơ vừa được người khác cập nhật. Hãy tải lại.','STATE_CONFLICT',409);};
function find(s,code){D.expire(s);const b=s.bookings.find(b=>b.bookingCode===code);if(!b)D.fail('Không tìm thấy booking.','NOT_FOUND',404);return b;}
function retry(b,key,body){if(typeof key!=='string'||!/^[a-f0-9]{32}$/i.test(key))D.fail('Mã yêu cầu không hợp lệ.');const old=(b.operationRequests||[]).find(r=>r.key===key);if(old&&old.hash!==fingerprint(body))D.fail('Mã yêu cầu đã được dùng với nội dung khác.','REQUEST_CONFLICT',409);return old;}
function record(s,b,action,body,actor,detail){b.version=(b.version||0)+1;D.log(s,actor,action,{bookingCode:b.bookingCode,...detail});const output=structuredClone(b);delete output.operationRequests;delete output.changeRequests;delete output.fingerprint;delete output.requestKey;delete output.ip;(b.operationRequests||=[]).push({key:body.requestKey,hash:fingerprint(body),result:output});return output;}
function ledger(s,code,body,actor,adjust=false){
 const b=find(s,code),old=retry(b,body.requestKey,{...body,action:adjust?'adjust':'deposit'});if(old)return old.result;version(b,body);
 const amount=Number(body.amount),total=b.depositAmount||0;
 if(!Number.isSafeInteger(amount)||amount===0||(!adjust&&amount<0)||!['PENDING','CONFIRMED','CHECKED_IN'].includes(b.status)||total+amount<0||total+amount>b.totalAmount)D.fail('Cọc phải hợp lệ, không âm và không vượt tổng booking.');
 if(!['CASH','TRANSFER'].includes(body.method)||!D.day(body.receivedAt)||body.receivedAt>D.today()||typeof body.reference!=='string'||body.reference.length>200||body.method==='TRANSFER'&&!body.reference.trim())D.fail('Chọn hình thức, ngày nhận hợp lệ và tham chiếu chuyển khoản.');
 if(adjust&&(!String(body.reason||'').trim()||!b.depositLedger?.some(x=>x._id===body.originalEntryId)))D.fail('Điều chỉnh cần bút toán gốc và lý do.');
 (b.depositLedger||=[]).push({_id:D.id(),amount,method:body.method,receivedAt:body.receivedAt,reference:body.reference.trim(),actor,at:new Date().toISOString(),kind:adjust?'ADJUSTMENT':'DEPOSIT',originalEntryId:adjust?body.originalEntryId:null,reason:adjust?String(body.reason).slice(0,1000):''});b.depositAmount=total+amount;
 return record(s,b,adjust?'ADJUST_DEPOSIT':'DEPOSIT',{...body,action:adjust?'adjust':'deposit'},actor,{amount});
}
function cancellation(s,code){const b=find(s,code);if(!['PENDING','CONFIRMED'].includes(b.status))D.fail('Chỉ huỷ booking chưa nhận phòng.','STATE_CONFLICT',409);const hours=(Date.parse(`${b.checkIn}T${b.settingsSnapshot.checkInTime}:00+07:00`)-Date.now())/3600000;const rule=b.settingsSnapshot.cancellationRules.find(r=>hours>=r.hoursBefore),refundPercent=rule?.refundPercent||0;return {bookingCode:code,version:b.version||0,depositAmount:b.depositAmount||0,refundPercent,refundAmount:Math.floor((b.depositAmount||0)*refundPercent/100)};}
function transition(s,code,action,body,actor){
 const b=find(s,code),signed={...body,action},old=retry(b,body.requestKey,signed);if(old)return old.result;version(b,body);
 const r=s.rooms.find(r=>r._id===b.roomId);
 if(action==='confirm'){if(b.status!=='PENDING')D.fail('Chỉ xác nhận booking đang giữ chỗ và còn hạn.','STATE_CONFLICT',409);b.status='CONFIRMED';b.holdExpiresAt=null;(b.events||=[]).push({id:D.id(),type:'BookingConfirmed',at:new Date().toISOString()});}
 else if(action==='cancel'){
  const preview=cancellation(s,code);if(!String(body.reason||'').trim())D.fail('Chọn hoặc nhập lý do huỷ.');if(body.expectedRefundAmount!==preview.refundAmount)D.fail('Mức hoàn vừa thay đổi. Hãy xem lại.','PREVIEW_CHANGED',409);
  Object.assign(b,{status:'CANCELLED',refundAmount:preview.refundAmount,refundPercent:preview.refundPercent,cancelReason:String(body.reason).slice(0,1000),cancelledBy:actor,cancelledAt:new Date().toISOString()});(b.events||=[]).push({id:D.id(),type:'BookingCancelled',at:b.cancelledAt});
 }
 else if(action==='checkin'){
  if(b.status!=='CONFIRMED'||b.checkIn>D.today()||b.checkOut<=D.today()||!b.assignedAt||r?.status!=='CLEAN_VACANT')D.fail('Cần booking xác nhận, đã gán phòng sạch và đúng kỳ lưu trú.','STATE_CONFLICT',409);
  const name=String(body.guestName||'').trim(),companions=body.companions||[];
  if(!name||name.length>255||!Array.isArray(companions)||companions.length+1!==b.guestCount||companions.some(n=>typeof n!=='string'||!n.trim()||n.length>255))D.fail('Nhập tên, giấy tờ khách đứng tên và tên đủ khách đi cùng.');
  const info=GuestInfo.checkin(body,b);
  const local=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
  if(local<'14:00'&&body.earlyAccepted!==true)D.fail('Nhận trước 14:00. Cần xác nhận tiếp tục nhận sớm.','EARLY_CHECKIN',409);
  Object.assign(b,{...info,guestName:name,idNumber:info.idNumber,companions:companions.map(n=>n.trim()),internalNotes:String(body.internalNotes||'').slice(0,2000),status:'CHECKED_IN',actualCheckIn:new Date().toISOString(),earlyAccepted:local<'14:00',checkedInBy:actor});r.status='OCCUPIED';
 }
 else if(action==='checkout'){if(b.status!=='CHECKED_IN')D.fail('Chỉ trả phòng cho booking đang ở.','STATE_CONFLICT',409);b.status='COMPLETED';b.actualCheckOut=new Date().toISOString();r.status='DIRTY_VACANT';}
 else D.fail('Thao tác không hợp lệ.');
 return record(s,b,action.toUpperCase(),signed,actor,{});
}
function roomOptions(s,code){const b=find(s,code);if(!['CONFIRMED','CHECKED_IN'].includes(b.status))D.fail('Booking cần được xác nhận.','STATE_CONFLICT',409);const start=b.status==='CHECKED_IN'?D.today():b.checkIn;return D.freeRooms({...s,bookings:s.bookings.filter(x=>x._id!==b._id)},{roomTypeId:b.roomTypeId,checkIn:start,checkOut:b.checkOut}).filter(r=>b.status!=='CHECKED_IN'||r.status==='CLEAN_VACANT'||r._id===b.roomId).map(r=>({_id:r._id,roomNumber:r.roomNumber,floor:r.floor,status:r.status}));}
function assign(s,code,body,actor,canSeeGuests=true){
 const b=find(s,code),old=retry(b,body.requestKey,{...body,action:'assign'});if(old)return old.result;version(b,body);
 if(!['CONFIRMED','CHECKED_IN'].includes(b.status))D.fail('Chỉ gán/đổi phòng cho booking đã xác nhận.','STATE_CONFLICT',409);
 const target=s.rooms.find(r=>r._id===body.roomId&&r.roomTypeId===b.roomTypeId);if(!target)D.fail('Phòng đích phải thuộc đúng loại.');
 const start=b.status==='CHECKED_IN'?D.today():b.checkIn;
 const conflict=s.bookings.find(x=>x._id!==b._id&&active(x)&&D.segments(x).some(seg=>seg.roomId===target._id&&seg.checkIn<b.checkOut&&seg.checkOut>start));
 if(conflict)D.fail('Phòng bị chiếm bởi booking '+conflict.bookingCode+(canSeeGuests&&conflict.guestName?' · '+conflict.guestName:''),'NO_AVAILABILITY',409);
 if(!roomOptions(s,code).some(r=>r._id===target._id))D.fail('Phòng đích cần sạch trống, không bảo trì.','STATE_CONFLICT',409);
 const previous=b.roomId,moving=previous!==target._id;
 if(moving&&!String(body.reason||'').trim())D.fail('Đổi phòng cần lý do.');
 if(b.status==='CHECKED_IN'&&moving){
  const segments=D.segments(b).filter(x=>x.checkIn<start).map(x=>({...x,checkOut:x.checkOut>start?start:x.checkOut}));b.roomSegments=[...segments,{roomId:target._id,checkIn:start,checkOut:b.checkOut}];
  s.rooms.find(r=>r._id===previous).status='DIRTY_VACANT';target.status='OCCUPIED';
 }
 b.roomId=target._id;b.assignedAt=new Date().toISOString();b.assignedBy=actor;
 (b.roomHistory||=[]).push({oldRoomId:previous,newRoomId:target._id,reason:String(body.reason||'Gán phòng').slice(0,1000),actor,at:b.assignedAt});return record(s,b,'ASSIGN_ROOM',{...body,action:'assign'},actor,{oldRoomId:previous,newRoomId:target._id});
}
function dirtyRooms(s){D.expire(s);return s.rooms.filter(r=>r.status==='DIRTY_VACANT').map(r=>({...r,arrivalToday:s.bookings.some(b=>b.roomId===r._id&&b.checkIn===D.today()&&['PENDING','CONFIRMED'].includes(b.status))})).sort((a,b)=>Number(b.arrivalToday)-Number(a.arrivalToday)||a.roomNumber.localeCompare(b.roomNumber,'vi',{numeric:true}));}
function clean(s,id,actor){const r=s.rooms.find(r=>r._id===id);if(!r)D.fail('Không tìm thấy phòng.','NOT_FOUND',404);if(r.status==='CLEAN_VACANT')return r;if(r.status!=='DIRTY_VACANT')D.fail('Chỉ báo sạch cho phòng trống bẩn.','STATE_CONFLICT',409);Object.assign(r,{status:'CLEAN_VACANT',cleanedBy:actor,cleanedAt:new Date().toISOString()});D.log(s,actor,'ROOM_CLEAN',{roomNumber:r.roomNumber,at:r.cleanedAt});return r;}
function incident(s,id,body,actor){const r=s.rooms.find(r=>r._id===id);if(!r)D.fail('Không tìm thấy phòng.','NOT_FOUND',404);if(r.status==='OCCUPIED')D.fail('Chuyển khách sang phòng khác trước khi báo bảo trì.','STATE_CONFLICT',409);const note=String(body.note||'').trim();if(!note||note.length>2000||!D.day(body.startDate)||body.startDate<D.today()||!D.day(body.endDate)||body.endDate<=body.startDate)D.fail('Nhập ghi chú và khoảng bảo trì hợp lệ.');const key=body.requestKey;if(typeof key!=='string'||!/^[a-f0-9]{32}$/i.test(key))D.fail('Mã yêu cầu không hợp lệ.');const old=(r.incidents||[]).find(x=>x.requestKey===key);if(old){if(old.note!==note||old.startDate!==body.startDate||old.endDate!==body.endDate)D.fail('Mã yêu cầu đã sử dụng.','REQUEST_CONFLICT',409);return r;}const item={_id:D.id(),note,startDate:body.startDate,endDate:body.endDate,actor,at:new Date().toISOString(),requestKey:key};(r.incidents||=[]).push(item);r.status='MAINTENANCE';D.log(s,actor,'ROOM_INCIDENT',{roomNumber:r.roomNumber,...item});return r;}
function period(body){const from=body.from||D.today(),days=Number(body.days||14);if(!D.day(from)||!Number.isInteger(days)||days<1||days>14)D.fail('Chọn ngày hợp lệ và khoảng 1–14 ngày.');return {from,days,dates:Array.from({length:days},(_,i)=>D.add(from,i))};}
function alerts(s,body){D.expire(s);const {dates}=period(body);return dates.flatMap(date=>s.roomTypes.flatMap(t=>{const rooms=s.rooms.filter(r=>r.roomTypeId===t._id),available=rooms.filter(r=>!D.maintenance(r,date,D.add(date,1))).length,bookings=s.bookings.filter(b=>b.roomTypeId===t._id&&active(b)&&b.checkIn<=date&&b.checkOut>date);return bookings.length>available?[{date,roomTypeId:t._id,roomTypeName:t.name,homestayId:t.homestayId,bookingCount:bookings.length,availableCount:available,bookings:bookings.map(b=>({bookingCode:b.bookingCode,guestName:b.guestName,status:b.status}))}]:[];}));}
function board(s,body,canSeeGuests){D.expire(s);const {dates}=period(body);return {dates,rooms:s.rooms.map(r=>({_id:r._id,roomNumber:r.roomNumber,floor:r.floor,roomTypeName:s.roomTypes.find(t=>t._id===r.roomTypeId)?.name,cells:dates.map(date=>{const b=s.bookings.find(b=>active(b)&&D.segments(b).some(seg=>seg.roomId===r._id&&seg.checkIn<=date&&seg.checkOut>date));return {date,status:b?.status||(D.maintenance(r,date,D.add(date,1))?'MAINTENANCE':'AVAILABLE'),...(b?{bookingCode:b.bookingCode,guestName:canSeeGuests?b.guestName:undefined}:{}),maintenance:D.maintenance(r,date,D.add(date,1))};})}))};}
module.exports={ledger,transition,cancellation,assign,roomOptions,dirtyRooms,clean,incident,alerts,board};
