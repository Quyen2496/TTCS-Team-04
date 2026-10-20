'use strict';
const crypto = require('node:crypto');
const D = require('./domain');
const DEFAULT_POLICY = {lateHourly:50000, extraBedPerNight:100000};
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const localDate = value => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const closed = b => ['CLOSED','COMPLETED'].includes(b.status);
function settings(s,b){const h=s.homestays.find(h=>h._id===b.homestayId);return h?._id===s.homestays[0]?._id?s.settings:(h?.settings||s.settings);}
function upgrade(s){
 s.invoices||=[];s.invoiceCounters||={};
 s.settings.checkoutPolicy||={...DEFAULT_POLICY};
 for(const h of s.homestays||[])if(h.settings)h.settings.checkoutPolicy||={...DEFAULT_POLICY};
 for(const b of s.bookings){
  b.checkoutPolicySnapshot||=structuredClone(b.settingsSnapshot?.checkoutPolicy||settings(s,b).checkoutPolicy||DEFAULT_POLICY);
  b.capacitySnapshot??=s.roomTypes.find(t=>t._id===b.roomTypeId)?.maxCapacity||b.guestCount;
 }
}
function booking(s,code){const b=s.bookings.find(b=>b.bookingCode===code);if(!b)D.fail('Không tìm thấy booking.','NOT_FOUND',404);return b;}
function checkedIn(s,code){const b=booking(s,code);if(b.status!=='CHECKED_IN')D.fail('Chỉ quyết toán booking đang ở.','STATE_CONFLICT',409);return b;}
function request(b,body,action){
 if(!/^[a-f0-9]{32}$/i.test(body.requestKey||''))D.fail('Mã yêu cầu không hợp lệ.');
 const inputHash=hash({...body,action});const old=(b.financialRequests||[]).find(x=>x.key===body.requestKey);
 if(old&&old.hash!==inputHash)D.fail('Mã yêu cầu đã được dùng với nội dung khác.','REQUEST_CONFLICT',409);
 return {old,inputHash};
}
function version(b,body){if(!Number.isInteger(body.expectedVersion)||body.expectedVersion!==(b.version||0))D.fail('Booking vừa thay đổi. Tải lại trước khi lưu.','STATE_CONFLICT',409);}
function surcharge(s,code,body,actor){
 upgrade(s);const b=booking(s,code),r=request(b,body,'surcharge');if(r.old)return r.old.result;version(b,body);checkedIn(s,code);
 if(!['EXTRA_PERSON','EXTRA_BED'].includes(body.type))D.fail('Chọn thêm người hoặc thêm giường.');
 const quantity=Number(body.quantity),from=body.from,to=body.to,unitPrice=Number(body.unitPrice);
 if(!D.day(from)||!D.day(to)||from<b.checkIn||to>b.checkOut||to<=from||!Number.isInteger(quantity)||quantity<1||quantity>100||!D.money(unitPrice)||unitPrice>100000000)D.fail('Kiểm tra số lượng, đơn giá và khoảng đêm trong kỳ lưu trú.');
 const nights=(Date.parse(to)-Date.parse(from))/86400000,defaultPrice=body.type==='EXTRA_PERSON'?b.settingsSnapshot.extraGuestPerNight:b.checkoutPolicySnapshot.extraBedPerNight;
 const reason=String(body.reason||'').trim(),note=String(body.note||'').trim();
 if(reason.length>1000||note.length>1000||unitPrice!==defaultPrice&&!reason)D.fail('Đổi đơn giá mặc định cần nhập lý do.');
 if(body.type==='EXTRA_PERSON')for(let date=from;date<to;date=D.add(date,1)){
  const existing=(b.surcharges||[]).filter(x=>!x.voidedAt&&x.type==='EXTRA_PERSON'&&x.from<=date&&x.to>date).reduce((n,x)=>n+x.quantity,0);
  if(b.guestCount+existing+quantity>b.capacitySnapshot)D.fail('Vượt sức chứa '+b.capacitySnapshot+' khách vào đêm '+date+'.');
 }
 const amount=quantity*unitPrice*nights;if(!D.money(amount)||amount>1000000000)D.fail('Tổng phụ thu vượt giới hạn.');
 const item={_id:D.id(),type:body.type,label:body.type==='EXTRA_PERSON'?'Thêm người':'Thêm giường',quantity,unitPrice,defaultPrice,from,to,nights,amount,reason,note,actor,at:new Date().toISOString()};
 (b.surcharges||=[]).push(item);b.version=(b.version||0)+1;
 const result={item,version:b.version};(b.financialRequests||=[]).push({key:body.requestKey,hash:r.inputHash,result});
 D.log(s,actor,'ADD_SURCHARGE',{bookingCode:code,amount,type:item.type,reason});return result;
}
function voidSurcharge(s,code,body,actor){
 const b=booking(s,code),r=request(b,body,'void-surcharge');if(r.old)return r.old.result;version(b,body);checkedIn(s,code);
 const item=b.surcharges?.find(x=>x._id===body.surchargeId&&!x.voidedAt),reason=String(body.reason||'').trim();
 if(!item||!reason||reason.length>1000)D.fail('Chọn phụ thu còn hiệu lực và nhập lý do huỷ.');
 Object.assign(item,{voidedAt:new Date().toISOString(),voidedBy:actor,voidReason:reason});b.version++;
 const result={version:b.version};(b.financialRequests||=[]).push({key:body.requestKey,hash:r.inputHash,result});D.log(s,actor,'VOID_SURCHARGE',{bookingCode:code,surchargeId:item._id,reason});return result;
}
function preview(s,code,body={}){
 upgrade(s);const b=checkedIn(s,code);
 const stamp=body.actualCheckOut||new Date().toISOString();
 if(typeof stamp!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(stamp)||!Number.isFinite(Date.parse(stamp)))D.fail('Thời điểm trả phòng cần kèm múi giờ hợp lệ.');
 const time=Date.parse(stamp),actualCheckOut=new Date(time).toISOString();
 if(b.actualCheckIn&&time<Date.parse(b.actualCheckIn))D.fail('Giờ trả không được trước giờ nhận thực tế.');
 const early=localDate(time)<b.checkOut;
 const due=Date.parse(b.checkOut+'T'+(b.settingsSnapshot?.checkOutTime||'12:00')+':00+07:00');
 const lateMinutes=Math.max(0,(time-due)/60000),policy=b.checkoutPolicySnapshot;
 const roomRate=b.nightlyPrices?.at(-1)?.basePrice||Math.round((b.roomTotal||b.totalAmount)/Math.max(1,b.numberOfNights));
 let lateAmount=0,lateHours=0,lateNights=0;
 // Exactly 18:00 is hourly. After 18:00 replace the hourly charge with a night.
 const cutoff=Date.parse(b.checkOut+'T18:00:00+07:00');
 if(time>due){if(time<=cutoff){lateHours=Math.ceil(lateMinutes/60);lateAmount=lateHours*policy.lateHourly;}else{lateNights=Math.max(1,Math.ceil((time-cutoff)/86400000));lateAmount=lateNights*roomRate;}}
 const lines=(b.nightlyPrices||[]).flatMap(n=>[
  {type:'ROOM',label:'Tiền phòng · '+(n.night||n.date),quantity:1,nights:1,unitPrice:n.basePrice,amount:n.basePrice},
  ...(n.surchargeAmount?[{type:'BOOKED_GUEST',label:'Phụ thu khách đã đặt · '+(n.night||n.date),quantity:n.extraGuestCount||1,nights:1,unitPrice:n.surchargeAmount/(n.extraGuestCount||1),amount:n.surchargeAmount}]:[])
 ]);
 if(!lines.length)lines.push({type:'ROOM',label:'Tiền phòng theo booking cũ',quantity:b.numberOfNights,nights:1,unitPrice:b.totalAmount/b.numberOfNights,amount:b.totalAmount});
 for(const x of b.surcharges||[])if(!x.voidedAt)lines.push({...structuredClone(x),label:x.label+' · '+x.from+' → '+x.to});
 if(lateMinutes)lines.push({type:'LATE_CHECKOUT',label:lateNights?'Trả sau 18:00 · '+lateNights+' đêm':'Trả muộn · '+lateHours+' giờ (làm tròn lên)',quantity:lateNights||lateHours,nights:1,unitPrice:lateNights?roomRate:policy.lateHourly,amount:lateAmount});
 const total=lines.reduce((n,x)=>n+x.amount,0),roomAmount=lines.filter(x=>x.type==='ROOM').reduce((n,x)=>n+x.amount,0),deposit=b.depositAmount||0;
 if(!D.money(total)||total>10000000000)D.fail('Tổng quyết toán vượt giới hạn.');
 return {bookingCode:code,version:b.version||0,actualCheckOut,early,earlyReason:String(body.earlyReason||'').trim().slice(0,1000),lines,total,roomAmount,surchargeAmount:total-roomAmount,deposit,balance:Math.max(0,total-deposit),refundDue:Math.max(0,deposit-total),lateHours,lateNights,lateAmount,latePolicy:{...policy,nightRate:roomRate,cutoff:'18:00'},numberOfNights:b.numberOfNights};
}
function checkout(s,code,body,approved,actor){
 upgrade(s);const b=booking(s,code),r=request(b,body,'checkout');if(r.old)return r.old.result;version(b,body);
 if(!approved||approved.purpose!=='checkout'||approved.bookingCode!==code)D.fail('Hãy xem bảng quyết toán trước khi thu tiền.','PREVIEW_EXPIRED',409);
 const p=preview(s,code,body);
 if(hash(p)!==approved.digest)D.fail('Bảng tiền vừa thay đổi. Xem lại trước khi đóng booking.','PREVIEW_CHANGED',409);
 if(Date.parse(p.actualCheckOut)>Date.now()+60000)D.fail('Không thể ghi nhận trả phòng trong tương lai.');
 if(p.early&&!p.earlyReason)D.fail('Trả trước ngày dự kiến cần nhập lý do.');
 if(!['CASH','TRANSFER'].includes(body.method)||body.method==='TRANSFER'&&!String(body.reference||'').trim()||String(body.reference||'').length>200)D.fail('Chọn hình thức quyết toán và mã tham chiếu khi chuyển khoản.');
 if(Number(body.receivedAmount)!==p.balance)D.fail('Số tiền thực thu phải khớp số còn phải thu trên bảng quyết toán.');
 if(p.refundDue&&body.refundAcknowledged!==true)D.fail('Cần xác nhận nghĩa vụ hoàn phần cọc dư.');
 const room=s.rooms.find(r=>r._id===b.roomId);if(!room||room.status!=='OCCUPIED')D.fail('Trạng thái phòng không khớp booking đang ở.','STATE_CONFLICT',409);
 const paid={_id:D.id(),amount:p.balance,method:body.method,reference:String(body.reference||'').trim(),actor,at:new Date().toISOString()};
 Object.assign(b,{settlement:{...p,paid,closedBy:actor,closedAt:new Date().toISOString()},status:'CLOSED',actualCheckOut:p.actualCheckOut,earlyCheckoutReason:p.earlyReason,refundDue:p.refundDue,version:(b.version||0)+1});
 (b.paymentLedger||=[]).push(paid);room.status='DIRTY_VACANT';
 const result={bookingCode:code,status:b.status,version:b.version,settlement:b.settlement};
 (b.financialRequests||=[]).push({key:body.requestKey,hash:r.inputHash,result});D.log(s,actor,'CHECKOUT_SETTLED',{bookingCode:code,total:p.total,received:p.balance,method:paid.method});return result;
}
function issueInvoice(s,code,actor){
 upgrade(s);const b=booking(s,code);if(!closed(b)||!b.settlement)D.fail('Chỉ cấp hoá đơn sau khi booking đã đóng và có quyết toán.','STATE_CONFLICT',409);
 const existing=s.invoices.find(i=>i.bookingId===b._id);if(existing)return existing;
 const year=Number(localDate(b.settlement.closedAt).slice(0,4)),sequence=(s.invoiceCounters[year]||0)+1;
 if(sequence>999999)D.fail('Đã hết dải số hoá đơn năm.','STATE_CONFLICT',409);
 const h=s.homestays.find(h=>h._id===b.homestayId),room=s.rooms.find(r=>r._id===b.roomId);
 const invoice={_id:D.id(),year,sequence,number:year+'/'+String(sequence).padStart(6,'0'),bookingId:b._id,bookingCode:code,homestayId:b.homestayId,homestay:{name:h?.name||b.homestayName,address:h?.address||'',phone:h?.phone||'',email:h?.email||''},guestName:b.guestName,roomNumber:room?.roomNumber||'',roomTypeName:b.roomTypeName,checkIn:b.checkIn,checkOut:b.checkOut,actualCheckOut:b.actualCheckOut,issuedAt:new Date().toISOString(),issuedBy:actor,settlement:structuredClone(b.settlement)};
 s.invoiceCounters[year]=sequence;s.invoices.push(invoice);D.log(s,actor,'ISSUE_INVOICE',{bookingCode:code,number:invoice.number});return invoice;
}
module.exports={DEFAULT_POLICY,hash,localDate,closed,upgrade,booking,surcharge,voidSurcharge,preview,checkout,issueInvoice};
