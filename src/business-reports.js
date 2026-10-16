'use strict';
const D=require('./domain'),S=require('./settlement');
function period(query={}){
 const from=query.from||D.today(),to=query.to||from,days=(Date.parse(to)-Date.parse(from))/86400000+1;
 if(!D.day(from)||!D.day(to)||!Number.isInteger(days)||days<1||days>366)D.fail('Chọn khoảng ngày hợp lệ, tối đa 366 ngày.');
 return {from,to,days,dates:Array.from({length:days},(_,i)=>D.add(from,i))};
}
function types(s,id){const result=s.roomTypes.filter(t=>!id||t._id===id);if(id&&!result.length)D.fail('Không tìm thấy loại phòng.','NOT_FOUND',404);return result;}
const percent=(sold,available)=>available?sold/available*100:null;
function maintenanceAt(r,date){
 // A current status cannot retroactively remove all historical room nights.
 if(r.incidents?.length)return r.incidents.some(x=>x.startDate<=date&&(x.resolvedDate||x.endDate)>date);
 return r.status==='MAINTENANCE'&&date>=D.today();
}
function occupancy(s,query={}){
 const p=period(query),chosen=types(s,query.roomTypeId);
 const rows=p.dates.flatMap(date=>chosen.map(t=>{
  const rooms=s.rooms.filter(r=>r.roomTypeId===t._id),available=rooms.filter(r=>!maintenanceAt(r,date)).length;
  const sold=s.bookings.filter(b=>b.roomTypeId===t._id&&['CONFIRMED','CHECKED_IN','CLOSED','COMPLETED'].includes(b.status)).reduce((n,b)=>n+Number(D.segments(b).some(seg=>seg.checkIn<=date&&seg.checkOut>date)&&(!b.settlement?.early||date<S.localDate(b.actualCheckOut))),0);
  return {date,roomTypeId:t._id,name:t.name,sold,available,percent:percent(sold,available),shortage:sold>available};
 }));
 const sum=list=>{const sold=list.reduce((n,x)=>n+x.sold,0),available=list.reduce((n,x)=>n+x.available,0);return {sold,available,percent:percent(sold,available)};};
 return {...p,...sum(rows),empty:rows.every(r=>r.sold===0),rows,byDay:p.dates.map(date=>({date,...sum(rows.filter(x=>x.date===date))})),byType:chosen.map(t=>({roomTypeId:t._id,name:t.name,...sum(rows.filter(x=>x.roomTypeId===t._id))})),warnings:rows.filter(x=>x.shortage).length};
}
function revenue(s,query={}){
 const p=period(query),chosen=types(s,query.roomTypeId),ids=new Set(chosen.map(t=>t._id));
 function build(from,to){
  const bookings=s.bookings.filter(b=>S.closed(b)&&b.settlement&&ids.has(b.roomTypeId)&&S.localDate(b.actualCheckOut)>=from&&S.localDate(b.actualCheckOut)<=to);
  const aggregate=list=>{const roomAmount=list.reduce((n,b)=>n+b.settlement.roomAmount,0),surchargeAmount=list.reduce((n,b)=>n+b.settlement.surchargeAmount,0),nights=list.reduce((n,b)=>n+b.settlement.numberOfNights,0);return {roomAmount,surchargeAmount,total:roomAmount+surchargeAmount,bookingCount:list.length,nights,adr:nights?roomAmount/nights:null};};
  return {...aggregate(bookings),byDay:p.dates.map(date=>({date,...aggregate(bookings.filter(b=>S.localDate(b.actualCheckOut)===date))})),byType:chosen.map(t=>({roomTypeId:t._id,name:t.name,...aggregate(bookings.filter(b=>b.roomTypeId===t._id))}))};
 }
 const current=build(p.from,p.to),previousPeriod={from:D.add(p.from,-p.days),to:D.add(p.from,-1)},previous=build(previousPeriod.from,previousPeriod.to);
 return {...p,...current,previous:{...previousPeriod,total:previous.total,bookingCount:previous.bookingCount},difference:current.total-previous.total,changePercent:previous.total?(current.total-previous.total)/previous.total*100:null,empty:current.bookingCount===0,legacyWithoutSettlement:s.bookings.filter(b=>S.closed(b)&&!b.settlement&&ids.has(b.roomTypeId)).length};
}
const cell=v=>'"'+String(v??'').replace(/^(\s*[=+@-])/,"'$1").replaceAll('"','""')+'"';
const csv=rows=>'\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
module.exports={period,occupancy,revenue,csv};
