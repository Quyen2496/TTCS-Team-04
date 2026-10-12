const D=require('./domain');
const defaults={
 admin:['homestays.view','homestays.create','homestays.update','homestays.delete','rooms.view','rooms.create','rooms.update','rooms.delete','rooms.status','housekeeping.view','housekeeping.update','types.view','types.create','types.update','types.delete','amenities.view','amenities.create','amenities.update','amenities.delete','pricing.view','pricing.update','bookings.view','bookings.update','customers.view','reports.view','reports.export','accounts.view','accounts.create','accounts.update','accounts.delete','audit.view','photos.upload'],
 owner:['homestays.view','homestays.update','rooms.view','rooms.create','rooms.update','rooms.delete','rooms.status','housekeeping.view','housekeeping.update','types.view','types.create','types.update','types.delete','amenities.view','pricing.view','pricing.update','bookings.view','bookings.update','customers.view','reports.view','reports.export','photos.upload'],
 reception:['homestays.view','rooms.view','rooms.status','housekeeping.view','housekeeping.update','types.view','amenities.view','bookings.view','bookings.update','customers.view'],
 report:['homestays.view','rooms.view','types.view','amenities.view','reports.view','reports.export'],
 housekeeping:['homestays.view','rooms.view','housekeeping.view','housekeeping.update'],
 guest:['profile.view','profile.update','own-bookings.view','own-bookings.cancel']
};
function permissions(u){const allowed=defaults[u.role]||[];return Array.isArray(u.permissions)?u.permissions.filter(p=>allowed.includes(p)):allowed;}
const can=(u,p)=>permissions(u).includes(p);
const safeUser=u=>{const {password,sessionVersion,...safe}=u;return {...safe,permissions:permissions(u)};};
function upgradeBookings(s){for(const b of s.bookings||[]){b.version||=0;b.source||='ONLINE';if(b.depositAmount>0&&!b.depositLedger)b.depositLedger=[{_id:D.id(),amount:b.depositAmount,kind:'LEGACY_BALANCE',method:'CASH',receivedAt:(b.createdAt||new Date().toISOString()).slice(0,10),reference:'Số dư trước Sprint 3',actor:'Chuyển dữ liệu v5',at:new Date().toISOString()}];if(b.status==='CHECKED_IN')b.assignedAt||=b.actualCheckIn;}}
function upgrade(s){upgradeBookings(s);
 if(s.platformVersion===1){for(const u of s.users){u.sessionVersion||=0;if(u.role!=='admin'&&u.role!=='guest'&&!u.homestayIds)u.homestayIds=[s.homestays[0]._id];}return;}
 const first={_id:D.id(),name:'Homestay Việt',address:'',description:'',phone:'',email:'',active:true,photo:'',images:[]};s.homestays||=[first];const property=s.homestays[0];
 for(const key of ['rooms','roomTypes','bookings'])for(const row of s[key]||[])row.homestayId||=property._id;
 // Old bundled stock photography is never presented as an actual property.
 for(const row of [...s.rooms,...s.roomTypes]){if(row.photo?.startsWith('/assets/rooms/'))row.photo='';row.images=(row.images||[]).filter(p=>!p.startsWith('/assets/rooms/'));}
 for(const u of s.users){u.sessionVersion||=0;if(u.role!=='admin'&&!u.homestayIds)u.homestayIds=[property._id];}
 s.uploads||=[];s.passwordResets||=[];s.resetRequests||={};s.platformVersion=1;
}
function allowedProperties(s,u){return u.role==='admin'?s.homestays:s.homestays.filter(h=>(u.homestayIds||[]).includes(h._id));}
function view(s,u,selected){
 const allowed=allowedProperties(s,u);if(selected&&!allowed.some(h=>h._id===selected))D.fail('Không có quyền truy cập homestay này.','FORBIDDEN',403);
 const properties=selected?allowed.filter(h=>h._id===selected):allowed,ids=new Set(properties.map(h=>h._id));
 const h=properties.length===1?properties[0]:null,first=s.homestays[0],policyProperty=h||properties[0];
 const result={...s,homestays:properties,rooms:s.rooms.filter(r=>ids.has(r.homestayId)),roomTypes:s.roomTypes.filter(t=>ids.has(t.homestayId)),bookings:s.bookings.filter(b=>ids.has(b.homestayId)),uploads:s.uploads.filter(x=>ids.has(x.homestayId)),settings:policyProperty&&policyProperty._id!==first._id?(policyProperty.settings||structuredClone(s.settings)):s.settings,pricingCalendar:policyProperty&&policyProperty._id!==first._id?(policyProperty.pricingCalendar||{}):s.pricingCalendar};
 return {result,ids,property:h};
}
function mutate(s,u,selected,fn,body={}){
 const {result,ids,property}=view(s,u,selected);const newProperty=body.homestayId||property?._id||s.homestays[0]?._id;
 if(body.homestayId&&!ids.has(body.homestayId))D.fail('Homestay ngoài phạm vi được cấp.','FORBIDDEN',403);
 const existing=new Map(['rooms','roomTypes','bookings'].map(key=>[key,new Map(s[key].map(r=>[r._id,r.homestayId]))]));
 const output=fn(result);
 for(const key of ['rooms','roomTypes','bookings']){
  for(const row of result[key]){row.homestayId||=newProperty;if(!ids.has(row.homestayId)||existing.get(key).has(row._id)&&existing.get(key).get(row._id)!==row.homestayId)D.fail('Không thể chuyển dữ liệu sang cơ sở khác.','FORBIDDEN',403);}
  s[key]=[...s[key].filter(r=>!ids.has(r.homestayId)),...result[key]];
 }
 const policyProperty=property||result.homestays[0];
 if(policyProperty&&policyProperty._id!==s.homestays[0]._id){policyProperty.settings=result.settings;policyProperty.pricingCalendar=result.pricingCalendar;}else if(policyProperty){s.settings=result.settings;s.pricingCalendar=result.pricingCalendar;}
 s.amenities=result.amenities;s.audit=result.audit;
 return output;
}
function routePermission(req){
 const p=req.path,m=req.method,action=m==='POST'?'create':m==='DELETE'?'delete':m==='GET'?'view':'update';
 if(p==='/api/admin/state')return null;
 if(p==='/api/admin/permissions')return 'accounts.view';
 if(p.endsWith('/reset-password')&&p.startsWith('/api/admin/users'))return 'accounts.update';
 if(p.startsWith('/api/admin/users'))return 'accounts.'+action;
 if(p.startsWith('/api/admin/homestays'))return 'homestays.'+action;
 if(p.startsWith('/api/admin/photos'))return 'photos.upload';
 if(p==='/api/admin/room-board'||p==='/api/admin/shortage-alerts')return 'bookings.view';
 if(p==='/api/admin/housekeeping')return 'housekeeping.view';
 if(/^\/api\/admin\/rooms\/[^/]+\/(clean|incident)$/.test(p))return 'housekeeping.update';
 if(p.startsWith('/api/admin/walk-in-bookings'))return 'bookings.update';
 if(p.startsWith('/api/admin/bookings'))return 'bookings.update';
 if(p.startsWith('/api/admin/customers'))return 'customers.view';
 if(p.startsWith('/api/admin/rooms'))return 'rooms.'+(m==='PATCH'?'status':action);
 if(p.startsWith('/api/admin/room-types'))return p.endsWith('/prices')?'pricing.update':'types.'+action;
 if(p.startsWith('/api/admin/amenities'))return 'amenities.'+action;
 if(p.startsWith('/api/admin/settings')||p.startsWith('/api/admin/pricing'))return 'pricing.'+(m==='GET'?'view':'update');
 if(p.startsWith('/api/reports'))return p.endsWith('.csv')?'reports.export':'reports.view';
 return null;
}
function validPassword(p){return typeof p==='string'&&p.length>=8&&Buffer.byteLength(p)<=72&&/\p{L}/u.test(p)&&/\d/.test(p);}
function validateMedia(s,photo,images,propertyId){
 if(typeof photo!=='string'||!Array.isArray(images)||images.length>10)D.fail('Tối đa 10 ảnh mỗi bộ ảnh.');
 for(const p of [photo,...images].filter(Boolean))if(!s.uploads.some(x=>x.path===p&&x.homestayId===propertyId))D.fail('Hãy tải ảnh thực tế của đúng homestay.');
 return {photo,images:[photo,...images].filter((x,i,a)=>x&&a.indexOf(x)===i)};
}
module.exports={defaults,permissions,can,safeUser,upgrade,view,mutate,routePermission,validPassword,validateMedia,allowedProperties};
