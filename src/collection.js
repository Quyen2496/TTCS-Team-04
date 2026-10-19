'use strict';
const crypto=require('node:crypto');
const definitions=require('./catalog-collection.json');
const media=require('./catalog-media.json');
const D=require('./domain');
const VERSION='1.9.0';
const stable=(kind,key)=>crypto.createHash('sha256').update('homestay-collection:'+kind+':'+key).digest('hex').slice(0,24);
const mediaPaths=new Set(media.photos.map(p=>p.path));
const isBundledPhoto=value=>mediaPaths.has(value);
const summary=s=>({homestays:s.homestays.length,roomTypes:s.roomTypes.length,rooms:s.rooms.length,properties:s.homestays.map(h=>({id:h._id,name:h.name,roomTypes:s.roomTypes.filter(t=>t.homestayId===h._id).length,rooms:s.rooms.filter(r=>r.homestayId===h._id).length}))});
function splitSurplus(s,t,{code,floor=1,key},splits){
 const rooms=s.rooms.filter(r=>r.roomTypeId===t._id);
 if(rooms.length<=5)return rooms;
 // Never reclassify any room referenced by a booking, including past room segments.
 const referenced=new Set();
 for(const b of s.bookings){if(b.roomId)referenced.add(b.roomId);for(const seg of D.segments(b))if(seg.roomId)referenced.add(seg.roomId);}
 const protectedRooms=rooms.filter(r=>referenced.has(r._id)||r.status!=='CLEAN_VACANT');
 if(protectedRooms.length>5)throw Error('Loại phòng '+t.name+' có '+rooms.length+' phòng, trong đó '+protectedRooms.length+' phòng gắn booking hoặc chưa ở trạng thái sạch trống. Chưa thể tự chia an toàn; dữ liệu chưa được đổi.');
 const keep=[...protectedRooms,...rooms.filter(r=>!protectedRooms.includes(r))].slice(0,5),surplus=rooms.filter(r=>!keep.includes(r));
 for(let start=0,part=1;start<surplus.length;start+=5,part++){
  const extraId=stable('overflow-type',t._id+':'+part);
  if(s.roomTypes.some(row=>row._id===extraId))throw Error('Mã loại phòng bổ sung đã được sử dụng.');
  const extra={...structuredClone(t),_id:extraId,name:t.name.slice(0,83)+' · Khu bổ sung '+part,catalogKey:key+'-extra-'+part,overflowOf:t._id};
  s.roomTypes.push(extra);
  const batch=surplus.slice(start,start+5);
  for(let j=batch.length;j<3;j++){
   const r={_id:stable('overflow-room',extraId+':'+j),homestayId:t.homestayId,roomTypeId:extraId,status:'CLEAN_VACANT',floor,photo:t.photo||'',images:t.images||[]};
   batch.push(r);s.rooms.push(r);
  }
  for(const [j,r] of batch.entries())Object.assign(r,{roomTypeId:extraId,homestayId:t.homestayId,roomNumber:code+'-B'+String(part).padStart(2,'0')+String(j+1),floor:r.floor||floor,photo:t.photo||'',images:t.images||[]});
  const calendar=t.homestayId===s.homestays[0]._id?s.pricingCalendar:s.homestays.find(h=>h._id===t.homestayId)?.pricingCalendar;
  for(const rule of Object.values(calendar||{}))if(Object.hasOwn(rule.prices||{},t._id))rule.prices[extraId]=rule.prices[t._id];
  splits.push({homestayId:t.homestayId,fromTypeId:t._id,toTypeId:extraId,name:extra.name,movedRooms:surplus.slice(start,start+5).length,totalRooms:batch.length});
 }
 return keep;
}
function applyCollection(state){
 if(state.collectionVersion===VERSION)return {changed:false,...summary(state)};
 // Work on a copy: invalid legacy inventory must never produce a partial migration.
 const s=structuredClone(state);if(s.platformVersion!==1)throw Error('Cần cập nhật hệ thống lên 1.8.2 trở lên trước khi áp dụng danh mục.');
 const originals=s.homestays.slice(0,2),splits=[];
 const amenities=require('./catalog').amenityCatalog.map(([name,icon])=>{
  let a=s.amenities.find(a=>a.name.toLocaleLowerCase('vi')===name.toLocaleLowerCase('vi'));
  if(!a){a={_id:stable('amenity',name),name,icon,active:true};s.amenities.push(a);}
  return a._id;
 });
 for(const [index,p] of definitions.entries()){
  let h=s.homestays.find(h=>h.catalogKey===p.key)||(index<2?originals[index]:null);
  if(!h){h={_id:stable('homestay',p.key),phone:'',email:'',pricingCalendar:{}};s.homestays.push(h);}
  const pictures=media.properties[p.key];
  Object.assign(h,{catalogKey:p.key,name:p.name,address:p.address,destination:p.destination,tagline:p.tagline,style:p.style,description:p.intro,highlights:p.highlights,experiences:p.experiences,houseRules:p.houseRules,photo:pictures[0],images:pictures,active:true,demoListing:true});
  // Keep the original payment channel, origin, cancellation and checkout settings.
  if(h._id!==s.homestays[0]._id&&!h.settings)h.settings={...structuredClone(s.settings),extraGuestPerNight:p.extraGuestPerNight,payment:{enabled:false,depositPercent:30,provider:'manual'}};
  h.pricingCalendar||={};
  const old=s.roomTypes.filter(t=>t.homestayId===h._id),unassigned=old.filter(t=>!t.catalogKey);
  for(const [i,spec] of p.roomTypes.entries()){
   let t=old.find(t=>t.catalogKey===spec.key)||unassigned[i];
   if(!t){t={_id:stable('type',spec.key),homestayId:h._id};s.roomTypes.push(t);}
   const photos=media.types[spec.key];
   const {amenityIndexes,photoCategory,roomCount,groundFloor,key,...fields}=spec;
   Object.assign(t,fields,{catalogKey:key,homestayId:h._id,weekendPrice:spec.saturdayPrice,active:true,amenityIds:amenityIndexes.map(n=>amenities[n]),photo:photos[0],images:photos});
   let rooms=splitSurplus(s,t,{code:p.code+'-'+String(i+1).padStart(2,'0'),floor:groundFloor?1:Math.floor(i/4)+1,key:spec.key},splits);
   const target=Math.max(rooms.length,roomCount);
   for(let j=rooms.length;j<target;j++){
    const r={_id:stable('room',spec.key+':'+j),homestayId:h._id,roomTypeId:t._id,status:'CLEAN_VACANT'};
    s.rooms.push(r);rooms.push(r);
   }
   for(const [j,r] of rooms.entries())Object.assign(r,{homestayId:h._id,roomNumber:p.code+'-'+String(i+1).padStart(2,'0')+String(j+1),floor:groundFloor?1:Math.floor(i/4)+1,photo:photos[0],images:photos});
   const policy=h._id===s.homestays[0]._id?s:h;
   // Respect existing explicit calendar rates. A conflicting future rate needs review.
   require('./pricing').assertCalendarPrices({pricingCalendar:policy.pricingCalendar||{}},t._id,t.weekdayPrice);
  }
  // Custom types are preserved too; complete their inventory without replacing their content.
  for(const t of s.roomTypes.filter(t=>t.homestayId===h._id&&!t.catalogKey)){
   const rooms=splitSurplus(s,t,{code:p.code+'-X'+t._id.slice(-6),key:'legacy-'+t._id},splits);
   for(let j=rooms.length;j<3;j++)s.rooms.push({_id:stable('extra-room',t._id+':'+j),homestayId:h._id,roomTypeId:t._id,roomNumber:p.code+'-X'+t._id.slice(-6)+String(j+1),floor:1,status:'CLEAN_VACANT',photo:t.photo||'',images:t.images||[]});
  }
  if(h._id===s.homestays[0]._id)s.settings.version++;
  else h.settings.version=(h.settings.version||0)+1;
 }
 s.collectionVersion=VERSION;
 s.collectionRevision=2;
 s.collectionUpdatedAt=new Date().toISOString();
 D.log(s,'Cập nhật danh mục '+VERSION,'UPGRADE_COLLECTION','10 cơ sở mẫu, giữ mã phòng và hồ sơ giao dịch.');
 validateCollection(s);
 Object.assign(state,s);
 return {changed:true,splits,...summary(state)};
}
function validateCollection(s){
 for(const key of ['homestays','roomTypes','rooms'])if(new Set(s[key].map(x=>x._id)).size!==s[key].length)throw Error('Trùng mã '+key+'.');
 for(const p of definitions){
  const h=s.homestays.find(h=>h.catalogKey===p.key);if(!h)throw Error('Thiếu cơ sở '+p.name);
  const types=s.roomTypes.filter(t=>t.homestayId===h._id);
  if(types.length<10)throw Error('Cơ sở chưa đủ 10 loại phòng.');
  const numbers=new Set();
  for(const t of types){
   const rooms=s.rooms.filter(r=>r.homestayId===h._id&&r.roomTypeId===t._id);
   if(rooms.length<3||rooms.length>5)throw Error('Loại phòng phải có từ 3 đến 5 phòng: '+t.name);
   for(const r of rooms){if(numbers.has(r.roomNumber))throw Error('Số phòng bị trùng trong cơ sở.');numbers.add(r.roomNumber);}
  }
 }
 for(const r of s.rooms)if(!s.roomTypes.some(t=>t._id===r.roomTypeId&&t.homestayId===r.homestayId))throw Error('Phòng liên kết sai loại hoặc cơ sở.');
 require('./store').roomNights(structuredClone(s));
 return summary(s);
}
module.exports={VERSION,definitions,isBundledPhoto,applyCollection,validateCollection,summary};
