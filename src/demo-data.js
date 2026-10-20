'use strict';
const bcrypt=require('bcryptjs'),D=require('./domain'),Pricing=require('./pricing'),S=require('./settlement');
function createDemo(anchor=D.today()){
 if(!D.day(anchor))throw Error('Ngày seed không hợp lệ.');const s=D.seedData(),h=s.homestays[0];
 h.name='Homestay Việt · Nghiệm thu';h.address='Thái Nguyên';s.roomTypes=s.roomTypes.slice(0,4);const ids=new Set(s.roomTypes.map(t=>t._id));s.rooms=s.rooms.filter(r=>ids.has(r.roomTypeId));
 s.demoDataset={version:'sprint4-v1',anchor,warning:'Dữ liệu riêng để nghiệm thu, không dùng cho vận hành.'};
 const password=bcrypt.hashSync('Quy@123456',10);for(const [username,role] of [['admin','admin'],['chunha','owner'],['letan','reception'],['baocao','report'],['buongphong','housekeeping']])s.users.push({_id:D.id(),username,role,password,active:true,homestayIds:[h._id],sessionVersion:0});
 const month=new Date(anchor+'T00:00:00Z');
 for(let m=-2;m<=0;m++)for(let j=0;j<10;j++){
  const date=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+m,1+j*2)).toISOString().slice(0,10),t=s.roomTypes[j%4],room=s.rooms.filter(r=>r.roomTypeId===t._id)[Math.floor(j/4)],end=D.add(date,2);
  const nightlyPrices=[0,1].map(i=>({...Pricing.resolveNight(s,t,D.add(date,i)),extraGuestCount:0,extraGuestUnitPrice:s.settings.extraGuestPerNight,surchargeAmount:0}));
  const total=nightlyPrices.reduce((n,x)=>n+x.basePrice,0),status=end<anchor?(j===8?'CANCELLED':'CHECKED_IN'):'CONFIRMED';
  const b={_id:D.id(),bookingCode:'QA'+String((m+2)*10+j+1).padStart(6,'0'),homestayId:h._id,homestayName:h.name,roomId:room._id,roomTypeId:t._id,roomTypeName:t.name,guestCount:1,guestName:'Khách nghiệm thu '+(j+1),phone:'0912345678',email:'',checkIn:date,checkOut:end,numberOfNights:2,nightlyPrices,roomTotal:total,extraGuestTotal:0,totalAmount:total,depositAmount:Math.floor(total*.3),settingsSnapshot:structuredClone(s.settings),status,source:'COUNTER',createdAt:new Date(Date.parse(date)-86400000).toISOString(),version:0};
  s.bookings.push(b);S.upgrade(s);
  if(status==='CHECKED_IN'){b.actualCheckIn=date+'T07:00:00.000Z';const p=S.preview(s,b.bookingCode,{actualCheckOut:end+'T05:00:00.000Z'});b.status='CLOSED';b.actualCheckOut=p.actualCheckOut;b.settlement={...p,paid:{_id:D.id(),amount:p.balance,method:'CASH',reference:'Nghiệm thu',at:p.actualCheckOut,actor:'Seed QA'},closedAt:p.actualCheckOut,closedBy:'Seed QA'};S.issueInvoice(s,b.bookingCode,'Seed QA');}
 }
 const todayBooking=s.bookings.find(b=>b.checkIn<=anchor&&b.checkOut>anchor&&b.status==='CONFIRMED');if(todayBooking){todayBooking.status='CHECKED_IN';todayBooking.actualCheckIn=anchor+'T00:00:00.000Z';todayBooking.assignedAt=todayBooking.actualCheckIn;s.rooms.find(r=>r._id===todayBooking.roomId).status='OCCUPIED';}
 s.pricingCalendar[anchor]={kind:'EVENT',name:'Ngày nghiệm thu',prices:{}};
 s.emailJobs=[];s.schedulerRuns=[];return s;
}
module.exports={createDemo};
