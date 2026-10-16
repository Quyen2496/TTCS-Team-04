'use strict';
const D=require('./domain');
const S=require('./settlement');
const MINUTE=60000;
const TITLES={CREATED:'Đã nhận yêu cầu đặt phòng — Chờ xác nhận',CONFIRMED:'Booking đã được xác nhận',CANCELLED:'Thông báo huỷ booking',REMINDER:'Nhắc nhận phòng ngày mai'};
function snapshot(s,b){const h=s.homestays.find(h=>h._id===b.homestayId);return {bookingCode:b.bookingCode,guestName:b.guestName,roomTypeName:b.roomTypeName,homestayName:h?.name||b.homestayName,checkIn:b.checkIn,checkOut:b.checkOut,numberOfNights:b.numberOfNights,totalAmount:b.totalAmount,checkInTime:b.settingsSnapshot?.checkInTime||'14:00',checkOutTime:b.settingsSnapshot?.checkOutTime||'12:00',cancelReason:b.cancelReason,refundPercent:b.refundPercent||0,refundAmount:b.refundAmount||0,contactPhone:h?.phone||''};}
function enqueue(s,b,type,now=Date.now()){
 s.emailJobs||=[];const key=b._id+':'+type,existing=s.emailJobs.find(j=>j.key===key);if(existing){if(type==='REMINDER'&&existing.status==='SKIPPED'&&!existing.attempts.length&&existing.snapshot.checkIn!==b.checkIn){Object.assign(existing,{snapshot:snapshot(s,b),to:b.email||'',status:b.email?'PENDING':'SKIPPED',nextAttemptAt:new Date(now).toISOString()});return true;}return false;}
 s.emailJobs.push({_id:D.id(),key,bookingId:b._id,bookingCode:b.bookingCode,homestayId:b.homestayId,type,to:b.email||'',snapshot:snapshot(s,b),status:b.email?'PENDING':'SKIPPED',attempts:[],createdAt:new Date(now).toISOString(),nextAttemptAt:new Date(now).toISOString()});return true;
}
function changes(s,before){
 const old=new Map(before.bookings.map(b=>[b._id,b]));
 for(const b of s.bookings){const prev=old.get(b._id);
  if(!prev)enqueue(s,b,b.status==='CONFIRMED'?'CONFIRMED':'CREATED');
  else if(prev.status!==b.status){if(b.status==='CONFIRMED')enqueue(s,b,'CONFIRMED');if(b.status==='CANCELLED')enqueue(s,b,'CANCELLED');}
 }
}
function schedule(s,now=Date.now()){
 s.emailJobs||=[];s.schedulerRuns||=[];const day=S.localDate(now),clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(now));
 if(clock<'09:00'||s.schedulerRuns.some(r=>r.key==='reminder:'+day))return;
 let queued=0;for(const b of s.bookings)if(b.status==='CONFIRMED'&&b.checkIn===D.add(day,1))queued+=Number(enqueue(s,b,'REMINDER',now));
 s.schedulerRuns.push({key:'reminder:'+day,kind:'REMINDER',day,queued,at:new Date(now).toISOString()});s.schedulerRuns=s.schedulerRuns.slice(-60);
}
function message(job,env=process.env){
 let base;try{base=new URL(env.APP_URL||env.PUBLIC_BASE_URL||'http://localhost:3001');if(!['http:','https:'].includes(base.protocol)||base.username||base.password)throw Error();}catch{throw new D.AppError(503,'MAIL_UNAVAILABLE','Cấu hình URL website chưa hợp lệ.');}
 const b=job.snapshot,url=new URL('/modules/lookup/index.html',base);url.searchParams.set('code',b.bookingCode);
 const lines=[TITLES[job.type],'Xin chào '+b.guestName+',','Homestay: '+b.homestayName,'Mã booking: '+b.bookingCode,'Loại phòng: '+b.roomTypeName,'Ngày nhận: '+b.checkIn+' lúc '+b.checkInTime,'Ngày trả: '+b.checkOut+' lúc '+b.checkOutTime,'Số đêm: '+b.numberOfNights,'Tổng tiền: '+new Intl.NumberFormat('vi-VN').format(b.totalAmount)+' VND','Tra cứu booking: '+url.href];
 if(job.type==='CREATED')lines.push('Yêu cầu đang chờ homestay xác nhận. Email này chưa phải xác nhận booking.');
 if(job.type==='CANCELLED'){
  // Legacy queued emails may have lost the percentage/reason. Keep their
  // recorded refund amount; do not invent a percentage or change the money.
  const knownPercent=Number.isFinite(b.refundPercent)&&b.refundPercent>=0&&b.refundPercent<=100&&!(b.refundAmount>0&&b.refundPercent===0);
  lines.push('Lý do huỷ: '+(b.cancelReason||'Khách yêu cầu huỷ booking'),knownPercent?'Tỷ lệ hoàn cọc: '+b.refundPercent+'%':'Hoàn cọc theo chính sách đã chốt; xem số tiền hoàn bên dưới.','Số tiền phải hoàn: '+new Intl.NumberFormat('vi-VN').format(b.refundAmount||0)+' VND','Homestay sẽ xử lý hoàn tiền riêng; email này không xác nhận đã chuyển tiền hoàn.');
 }
 if(b.contactPhone)lines.push('Liên hệ: '+b.contactPhone);
 return {from:env.MAIL_FROM||env.SMTP_USER,to:job.to,subject:TITLES[job.type]+' · '+b.bookingCode,text:lines.join('\n'),messageId:'<hs-'+job._id+'@homestay.local>',disableFileAccess:true,disableUrlAccess:true};
}
function stillValid(job,s){const b=s.bookings.find(b=>b._id===job.bookingId);return job.type==='REMINDER'?b?.status==='CONFIRMED'&&b.checkIn===job.snapshot.checkIn:job.type==='CREATED'?['PENDING','CONFIRMED','CHECKED_IN','CLOSED'].includes(b?.status):job.type==='CONFIRMED'?['CONFIRMED','CHECKED_IN','CLOSED'].includes(b?.status):b?.status==='CANCELLED';}
function createWorker(store,{env=process.env,send,now=()=>Date.now()}={}){
 let busy=false;
 async function tick(){if(busy)return;busy=true;const counts={SENT:0,RETRY:0,FAILED:0,UNCERTAIN:0,SKIPPED:0};try{
  await store.mutate(s=>schedule(s,now()));
  if(!send&&!env.SMTP_HOST)return;
  for(let i=0;i<10;i++){
   const claim=await store.mutate(s=>{
    s.emailJobs||=[];
    for(const j of s.emailJobs)if(j.status==='SENDING'&&Date.parse(j.leaseUntil)<=now()){j.status='UNCERTAIN';j.lastError='Tiến trình dừng khi đang gửi; cần kiểm tra trước khi gửi lại.';j.attempts.at(-1).result='UNCERTAIN';}
    const j=s.emailJobs.find(j=>['PENDING','RETRY'].includes(j.status)&&Date.parse(j.nextAttemptAt)<=now());if(!j)return;
    if(!stillValid(j,s)){j.status='SKIPPED';j.lastError='Booking đã đổi trạng thái hoặc ngày nhận.';return {skipped:true};}
    j.status='SENDING';j.leaseToken=D.id();j.leaseUntil=new Date(now()+120000).toISOString();j.attempts.push({at:new Date(now()).toISOString(),result:'SENDING'});return structuredClone(j);
   });
   if(!claim)break;if(claim.skipped){counts.SKIPPED++;continue;}
   let error,accepted=false;
   try{const result=await (send||((m)=>require('./mail').transport(env).sendMail(m)))(message(claim,env));accepted=!!result&&(!Array.isArray(result.accepted)||result.accepted.length>0);if(!accepted){error=Object.assign(new Error('Email bị từ chối.'),{code:'EENVELOPE'});}}catch(e){error=e;}
   const outcome=await store.mutate(s=>{const j=s.emailJobs.find(j=>j._id===claim._id);if(!j||j.leaseToken!==claim.leaseToken||j.status!=='SENDING')return;
    const attempt=j.attempts.at(-1);attempt.finishedAt=new Date(now()).toISOString();
    if(!error){j.status='SENT';j.sentAt=attempt.finishedAt;attempt.result='SENT';delete j.lastError;}
    else{
     const uncertain=['ETIMEDOUT','ESOCKET','ECONNECTION','ECONNRESET','EPIPE'].includes(error.code)&&!['CONN','AUTH','EHLO','STARTTLS'].includes(error.command)&&!['CONNECT_TIMEOUT','GREETING_TIMEOUT','UPGRADE_TIMEOUT'].includes(error.timeoutType);
     j.status=uncertain?'UNCERTAIN':j.attempts.length>=4?'FAILED':'RETRY';attempt.result=j.status;
     j.lastError=uncertain?'Chưa xác định SMTP đã nhận thư hay chưa; cần kiểm tra trước khi gửi lại.':error.code==='EAUTH'?'SMTP từ chối xác thực.':'Gửi email thất bại; kiểm tra cấu hình SMTP và kết nối.';
     if(j.status==='RETRY')j.nextAttemptAt=new Date(now()+5*MINUTE).toISOString();
    }
    delete j.leaseToken;delete j.leaseUntil;return j.status;
   });if(outcome)counts[outcome]++;
  }
  if(Object.values(counts).some(Boolean))await store.mutate(s=>{s.mailWorkerRuns||=[];s.mailWorkerRuns.push({kind:'MAIL_SEND',at:new Date(now()).toISOString(),sent:counts.SENT,retry:counts.RETRY,failed:counts.FAILED,uncertain:counts.UNCERTAIN,skipped:counts.SKIPPED});s.mailWorkerRuns=s.mailWorkerRuns.slice(-60);});
 }finally{busy=false;}}
 return {tick};
}
module.exports={TITLES,enqueue,changes,schedule,message,createWorker};
