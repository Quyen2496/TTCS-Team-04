'use strict';
// Read-only shapes. Never pass one of these partial states to Store.mutate().
const base=['homestays','settings','platformVersion','receptionInvoiceAccessVersion'];
const business=['rooms','roomTypes','bookings','amenities','pricingCalendar'];
const screens={
 overview:['rooms','roomTypes','bookings','amenities'],
 owner:['roomTypes'],reports:['roomTypes'],'revenue-today':['roomTypes'],
 homestays:[],customers:[],users:[],audit:[],emails:[],invoices:[],system:[],
 reception:business,board:business,housekeeping:business,rooms:['rooms','roomTypes','amenities','pricingCalendar'],
 types:business,amenities:business,settings:business
};
const userFields=['_id','username','email','role','active','permissions','homestayIds','fullName','phone','address','nationality','birthDate','gender'];
const typeLabel=['_id','homestayId','name','active'];
const roomStock=['_id','homestayId','roomTypeId','roomNumber','floor','status','incidents'];
const bookingStock=['_id','homestayId','roomTypeId','roomId','bookingCode','guestName','status','checkIn','checkOut','holdExpiresAt','roomSegments','settlement','actualCheckOut'];
const profiles={
 metadata:{fields:[],columns:{}},
 revenue:{fields:['roomTypes','bookings'],columns:{roomTypes:typeLabel,bookings:['_id','homestayId','roomTypeId','status','actualCheckOut','settlement']}},
 inventory:{fields:['rooms','roomTypes','bookings'],columns:{rooms:roomStock,roomTypes:typeLabel,bookings:bookingStock}}
};
// AI tools operate on these read-only shapes inside a conversation transaction.
// No business arrays from this partial state are ever persisted.
profiles.ai_overview={fields:['rooms','roomTypes','bookings'],columns:{rooms:['_id','homestayId','roomTypeId','status'],roomTypes:typeLabel,bookings:['_id','homestayId','bookingCode','guestUserId','status','holdExpiresAt']}};
profiles.ai_schedule={fields:['rooms','roomTypes','bookings'],columns:{rooms:roomStock,roomTypes:typeLabel,bookings:[...bookingStock,'guestUserId','guestCount']}};
profiles.ai_alerts={fields:['rooms','roomTypes','bookings'],columns:{rooms:roomStock,roomTypes:typeLabel,bookings:[...bookingStock,'guestUserId','refundAmount']}};
profiles.ai_business={fields:business,columns:{rooms:roomStock,bookings:[...bookingStock,'guestUserId','guestCount','roomTypeName','numberOfNights','totalAmount','depositAmount','refundAmount','settingsSnapshot','paymentLedger']}};
profiles.reception_list={fields:['rooms','roomTypes','bookings'],columns:{rooms:roomStock,roomTypes:typeLabel,bookings:['_id','homestayId','roomTypeId','roomId','bookingCode','guestName','email','phone','guestCount','checkIn','checkOut','numberOfNights','status','holdExpiresAt','source','totalAmount','depositAmount','version']}};
profiles.booking_email={fields:['bookings','emailJobs'],columns:{bookings:['_id','homestayId','bookingCode'],emailJobs:['bookingCode','type','status','attempts','sentAt']}};
profiles.rooms_list={fields:['rooms','roomTypes'],columns:{rooms:['_id','homestayId','roomTypeId','roomNumber','floor','status','photo'],roomTypes:[...typeLabel,'photo']}};
profiles.booking_detail={fields:['bookings'],columns:{}};
profiles.room_detail={fields:['rooms','roomTypes'],columns:{roomTypes:[...typeLabel,'photo','images']}};
const screenColumns={
 overview:{rooms:['_id','homestayId','roomTypeId','status'],roomTypes:typeLabel,bookings:['_id','homestayId','status','holdExpiresAt']},
 owner:{roomTypes:typeLabel},reports:{roomTypes:typeLabel},'revenue-today':{roomTypes:typeLabel},
 rooms:{roomTypes:[...typeLabel,'photo','images']},
 reception:{rooms:roomStock,roomTypes:[...typeLabel,'standardCapacity','maxCapacity','weekdayPrice','weekendPrice','saturdayPrice','sundayPrice','eventPrice']}
};
// These fields were already removed from every bootstrap response. Keep full
// booking detail/ledgers, but do not transfer nested idempotency snapshots.
const internalBooking=['fingerprint','requestKey','ip','changeRequests','operationRequests'];
const columnsFor=options=>profiles[options.profile]?.columns||screenColumns[options.screen]||{};
const select=(row,fields)=>Object.fromEntries(fields.filter(k=>row[k]!==undefined).map(k=>[k,row[k]]));
const bookingFlags=row=>({hasPayosReview:(row.payosReceipts||[]).some(r=>r.status==='REVIEW'),hasTransferReview:(row.transferReports||[]).some(r=>r.status==='PENDING'),hasChangeHistory:!!row.changeHistory?.length,hasDepositLedger:!!row.depositLedger?.length,hasIdentity:!!row.idNumber,hasSettlement:!!row.settlement});
const filtered=(input,detail)=>({$slice:[{$filter:{input:{$ifNull:[input,[]]},as:'item',cond:{$and:[{$eq:['$$item.'+detail.key,{$literal:detail.value}]},{$in:['$$item.homestayId',{$literal:detail.ids}]}]}}},1]});
function defaults(data={}){return {users:[],homestays:[],rooms:[],roomTypes:[],bookings:[],amenities:[],uploads:[],audit:[],aiConversations:[],settings:{},pricingCalendar:{},...data};}
function fieldsFor({screen,profile,extra=[]}={}){return [...new Set([...base,...(profiles[profile]?.fields??(screen&&Object.hasOwn(screens,screen)?screens[screen]:business)),...extra])];}
function safeAccount(u){return Object.fromEntries(userFields.filter(k=>u[k]!==undefined).map(k=>[k,u[k]]));}
function operationalProjection(options={}){
 const projection=Object.fromEntries(fieldsFor(options).map(k=>['data.'+k,1]));
 for(const [key,fields]of Object.entries(columnsFor(options)))projection['data.'+key]={$map:{input:{$ifNull:['$data.'+key,[]]},as:'row',in:Object.fromEntries(fields.map(k=>[k,'$$row.'+k]))}};
 if(options.profile==='reception_list'){
  const row=projection['data.bookings'].$map.in,count=key=>({$size:{$ifNull:['$$row.'+key,[]]}}),has=(key,status)=>({$gt:[{$size:{$filter:{input:{$ifNull:['$$row.'+key,[]]},as:'entry',cond:{$eq:['$$entry.status',status]}}}},0]});
  Object.assign(row,{hasPayosReview:has('payosReceipts','REVIEW'),hasTransferReview:has('transferReports','PENDING'),hasChangeHistory:{$gt:[count('changeHistory'),0]},hasDepositLedger:{$gt:[count('depositLedger'),0]},hasIdentity:{$ne:[{$ifNull:['$$row.idNumber','']},'']},hasSettlement:{$ne:[{$ifNull:['$$row.settlement',null]},null]}});
 }
 if(options.profile==='booking_email'&&options.bookingCode){
  if(projection['data.bookings']?.$map)projection['data.bookings'].$map.input={$filter:{input:{$ifNull:['$data.bookings',[]]},as:'row',cond:{$eq:['$$row.bookingCode',{$literal:options.bookingCode}]}}};
  if(projection['data.emailJobs']?.$map)projection['data.emailJobs'].$map.input={$filter:{input:{$ifNull:['$data.emailJobs',[]]},as:'job',cond:{$eq:['$$job.bookingCode',{$literal:options.bookingCode}]}}};
 }
 if(options.detail){
  const d=options.detail;projection['data.'+d.kind]=filtered('$data.'+d.kind,d);
  if(d.kind==='rooms')projection['data.roomTypes'].$map.input={$filter:{input:{$ifNull:['$data.roomTypes',[]]},as:'type',cond:{$in:['$$type._id',{$map:{input:filtered('$data.rooms',d),as:'room',in:'$$room.roomTypeId'}}]}}};
 }
 if((options.screen||options.detail)&&projection['data.bookings']){
  if(projection['data.bookings']===1||options.detail?.kind==='bookings')projection['data.bookings']={$map:{input:options.detail?filtered('$data.bookings',options.detail):{$ifNull:['$data.bookings',[]]},as:'row',in:{$arrayToObject:{$filter:{input:{$objectToArray:'$$row'},as:'field',cond:{$not:[{$in:['$$field.k',internalBooking]}]}}}}}};
 }
 if(options.users)projection['data.users']={$map:{input:{$ifNull:['$data.users',[]]},as:'user',in:Object.fromEntries(userFields.map(k=>[k,'$$user.'+k]))}};
 if(options.audit)projection['data.audit']=1;
 return projection;
}
function fromFile(state,options={}){
 const data=Object.fromEntries(fieldsFor(options).filter(k=>state[k]!==undefined).map(k=>[k,state[k]]));
 for(const [key,fields]of Object.entries(columnsFor(options)))data[key]=(data[key]||[]).map(row=>select(row,fields));
 if(options.profile==='reception_list')data.bookings=data.bookings.map((row,i)=>({...row,...bookingFlags(state.bookings[i])}));
 if(options.profile==='booking_email'&&options.bookingCode){data.bookings=(data.bookings||[]).filter(b=>b.bookingCode===options.bookingCode);data.emailJobs=(data.emailJobs||[]).filter(j=>j.bookingCode===options.bookingCode);}
 if(options.detail){const d=options.detail;data[d.kind]=(data[d.kind]||[]).filter(row=>row[d.key]===d.value&&d.ids.includes(row.homestayId)).slice(0,1);if(d.kind==='rooms')data.roomTypes=data.roomTypes.filter(t=>data.rooms.some(r=>r.roomTypeId===t._id));}
 if((options.screen||options.detail)&&data.bookings&&!columnsFor(options).bookings)data.bookings=data.bookings.map(row=>Object.fromEntries(Object.entries(row).filter(([k])=>!internalBooking.includes(k))));
 if(options.users)data.users=(state.users||[]).map(safeAccount);
 if(options.audit)data.audit=state.audit||[];
 return defaults(structuredClone(data));
}
module.exports={base,screens,defaults,operationalProjection,fromFile};
