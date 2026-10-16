'use strict';
const crypto=require('node:crypto');
const D=require('./domain');
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const requestKey=value=>{if(typeof value!=='string'||!/^[a-f0-9]{32}$/i.test(value))D.fail('Mã yêu cầu không hợp lệ.');return value;};
const result=b=>({bookingCode:b.bookingCode,homestayId:b.homestayId,homestayName:b.homestayName,roomId:b.roomId,roomTypeName:b.roomTypeName,checkIn:b.checkIn,checkOut:b.checkOut,guestCount:b.guestCount,totalAmount:b.totalAmount,depositAmount:b.depositAmount,status:b.status,source:b.source,version:b.version||0});
const snapshot=b=>Object.fromEntries(['roomId','roomTypeId','roomTypeName','checkIn','checkOut','guestCount','numberOfNights','nightlyPrices','roomTotal','extraGuestTotal','totalAmount','settingsSnapshot'].map(k=>[k,structuredClone(b[k]??null)]));
function findBooking(s,code){D.expire(s);const b=s.bookings.find(b=>b.bookingCode===code);if(!b)D.fail('Không tìm thấy booking.','NOT_FOUND',404);return b;}
function changePreview(s,code,body){
 const b=findBooking(s,code);
 if(!['PENDING','CONFIRMED'].includes(b.status))D.fail('Chỉ đổi booking chưa nhận phòng và còn hiệu lực.','STATE_CONFLICT',409);
 const t=s.roomTypes.find(t=>t._id===body.roomTypeId&&t.homestayId===b.homestayId);
 if(!t)D.fail('Chọn loại phòng thuộc cùng homestay.');
 const criteria={roomTypeId:t._id,checkIn:body.checkIn,checkOut:body.checkOut,guestCount:b.guestCount};
 const q=D.quote(s,criteria),available=D.freeRooms({...s,bookings:s.bookings.filter(x=>x._id!==b._id)},criteria);
 if(!available.length)D.fail('Không còn phòng cho lịch hoặc loại phòng mới.','NO_AVAILABILITY',409);
 const preferred=available.find(r=>r._id===(body.roomId||b.roomId)),room=preferred||available[0];
 if(body.roomId&&!available.some(r=>r._id===body.roomId))D.fail('Phòng đã chọn không còn trống trong toàn kỳ.','NO_AVAILABILITY',409);
 const deposit=b.depositAmount||0;
 return {bookingCode:code,version:b.version||0,criteria,roomId:room._id,availableRooms:available.map(r=>({_id:r._id,roomNumber:r.roomNumber,status:r.status})),old:snapshot(b),quote:q,depositAmount:deposit,difference:q.totalAmount-b.totalAmount,balanceDue:Math.max(0,q.totalAmount-deposit),excessDeposit:Math.max(0,deposit-q.totalAmount)};
}
const previewDigest=p=>digest({bookingCode:p.bookingCode,version:p.version,criteria:p.criteria,roomId:p.roomId,quote:p.quote,depositAmount:p.depositAmount});
function applyChange(s,code,body,approved,actor){
 const b=findBooking(s,code),key=requestKey(body.requestKey);
 const inputHash=digest({roomTypeId:body.roomTypeId,checkIn:body.checkIn,checkOut:body.checkOut,roomId:body.roomId,previewToken:body.previewToken,expectedVersion:body.expectedVersion});
 const old=(b.changeRequests||[]).find(r=>r.key===key);
 if(old){if(old.inputHash!==inputHash)D.fail('Mã yêu cầu đã được dùng với nội dung khác.','REQUEST_CONFLICT',409);return old.result;}
 if(!approved||approved.bookingCode!==code||approved.version!==body.expectedVersion||!Number.isSafeInteger(body.expectedVersion)||body.expectedVersion!==(b.version||0))D.fail('Booking đã thay đổi. Hãy xem lại báo giá trước khi lưu.','STATE_CONFLICT',409);
 const preview=changePreview(s,code,body);
 if(previewDigest(preview)!==approved.digest)D.fail('Báo giá hoặc phòng đã thay đổi. Hãy xem lại trước khi lưu.','PREVIEW_CHANGED',409);
 const before=snapshot(b),version=(b.version||0)+1;
 Object.assign(b,preview.quote,{roomId:preview.roomId,version});delete b.assignedAt;delete b.assignedBy;delete b.roomSegments;
 const change={_id:D.id(),at:new Date().toISOString(),actor,old:before,new:snapshot(b),depositAmount:b.depositAmount||0};
 (b.changeHistory||=[]).push(change);
 const output=result(b);(b.changeRequests||=[]).push({key,inputHash,result:output});
 D.log(s,actor,'CHANGE_BOOKING',{bookingCode:code,old:before,new:change.new});return output;
}
function counterInput(body){
 const c=D.criteria({...body,checkIn:body.checkIn||D.today()});
 const guestName=typeof body.guestName==='string'?body.guestName.trim():'',phone=typeof body.phone==='string'?body.phone.trim():'',email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 if(!guestName||guestName.length>255||!/^0[35789]\d{8}$/.test(phone)||email&&(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)))D.fail('Kiểm tra tên khách, điện thoại và email (nếu có).');
 if(typeof body.roomId!=='string'||!/^[a-f0-9]{24}$/i.test(body.roomId))D.fail('Chọn một phòng cụ thể.');
 return {roomTypeId:c.roomTypeId,roomId:body.roomId,checkIn:c.checkIn,checkOut:c.checkOut,guestCount:c.guestCount,guestName,phone,email};
}
function createCounter(s,body,actor){
 const key=requestKey(body.requestKey),input=counterInput(body),fingerprint=digest({...input,expectedTotalAmount:body.expectedTotalAmount,expectedSettingsVersion:body.expectedSettingsVersion});
 const existing=s.bookings.find(b=>b.requestKey===key);
 if(existing){if(existing.source!=='COUNTER'||existing.fingerprint!==fingerprint)D.fail('Mã yêu cầu đã được dùng với nội dung khác.','REQUEST_CONFLICT',409);return result(existing);}
 const q=D.quote(s,input);
 if(q.totalAmount!==body.expectedTotalAmount||q.settingsSnapshot.version!==body.expectedSettingsVersion)D.fail('Giá đã thay đổi. Hãy lấy báo giá mới.','PRICE_CHANGED',409);
 const room=D.freeRooms(s,input).find(r=>r._id===input.roomId);
 if(!room)D.fail('Phòng đã chọn không còn trống trong toàn kỳ.','NO_AVAILABILITY',409);
 let bookingCode;do{bookingCode=crypto.randomBytes(4).toString('hex').toUpperCase();}while(s.bookings.some(b=>b.bookingCode===bookingCode));
 const b={...input,...q,_id:D.id(),bookingCode,roomId:room._id,assignedAt:new Date().toISOString(),assignedBy:actor,source:'COUNTER',status:'CONFIRMED',holdExpiresAt:null,depositAmount:0,version:0,createdAt:new Date().toISOString(),createdBy:actor,requestKey:key,fingerprint,notes:'',internalNotes:'',idNumber:''};
 s.bookings.push(b);D.log(s,actor,'CREATE_COUNTER_BOOKING',bookingCode);
 // Recorded for Sprint 4; no mail job is created without an email address.
 if(b.email)(b.events||=[]).push({id:D.id(),type:'BookingConfirmed',at:b.createdAt,source:'COUNTER'});
 return result(b);
}
module.exports={changePreview,previewDigest,applyChange,createCounter,result};
