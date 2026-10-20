'use strict';
const A=require('./access'),D=require('./domain');
function metric(question,plan={}){
 const q=require('./ai-provider').normalize(question).replace(/(?:chu )?khong phai (?:doanh thu|cong suat)/g,'').split(/[,;.!?]/).filter(c=>!/^\s*(?:khong phai|khong can)/.test(c)).join(' ');
 if(/doanh thu|doanh so|thuc thu|thu nhap/.test(q))return 'revenue';
 if(/cong suat|ty le lap day/.test(q))return 'occupancy';
 if(/gia tri.*booking|gia tri.*dat phong/.test(q))return 'booking_value';
 return plan.metric||'booking_value';
}
function requirements(r){
 const grants=new Set([...(r.requiredPermissions||[]),...(r.permission?[r.permission]:[])]);
 // Results saved before 1.8.4 did not record the revenue grant. Recognize
 // those snapshots as well, so revocation also protects history and exports.
 if(r.metric==='revenue'||r.context?.metric==='revenue'||r.columns?.some(c=>/^Doanh thu/.test(c)))grants.add('reports.revenue');
 return [...grants];
}
function canView(s,u,r){
 if(!r||requirements(r).some(p=>!A.can(u,p)))return false;
 if(r.audiencePermissions&&JSON.stringify(r.audiencePermissions)!==JSON.stringify(A.permissions(u).slice().sort()))return false;
 if(r.audienceRole&&r.audienceRole!==u.role||r.audienceAdmin&&u.role!=='admin')return false;
 const publicView=r.publicCatalog===true&&!r.permission&&!r.requiredPermissions?.length;
 const ids=new Set(publicView||u.role==='guest'?s.homestays.filter(h=>h.active).map(h=>h._id):A.allowedProperties(s,u).map(h=>h._id));
 if((r.propertyIds||[]).some(id=>!ids.has(id)))return false;
 if(u.role==='housekeeping'&&!publicView&&!['housekeeping','help','policy','unsupported','export'].includes(r.intent))return false;
 if(u.role==='reception'&&requirements(r).includes('reports.revenue')){
  if(r.context?.from!==D.today()||r.context?.to!==D.today())return false;
 }
 if(u.role==='guest'&&(requirements(r).includes('own-bookings.view'))){
  const codes=r.bookingCodes||r.rows?.map(row=>row[0])||[];
  if(codes.some(code=>!s.bookings.some(b=>b.bookingCode===code&&b.guestUserId===u._id)))return false;
 }
 return true;
}
function isReport(r){return !!r.context?.inventory||r.intent==='report'||r.intent==='occupied'||r.intent==='overview'||requirements(r).some(p=>p.startsWith('reports.'));}
function canExport(u,r){return requirements(r).every(p=>A.can(u,p))&&(!isReport(r)||A.can(u,'reports.export'));}
function check(u,intent){
 if(u.role==='housekeeping'&&!require('./ai-visibility').roomIntents.has(intent)&&!['housekeeping','help','policy','unsupported','export'].includes(intent))D.fail('Tài khoản Buồng phòng chỉ tra cứu công việc, trạng thái phòng và hướng dẫn trong phạm vi được cấp.','FORBIDDEN',403);
}
function requireGrant(u,p){if(!A.can(u,p))D.fail('Tài khoản chưa được cấp quyền xem phần dữ liệu này.','FORBIDDEN',403);}
function preflight(u,plan,question){
 check(u,plan.intent);
 if(plan.dialogue)require('./ai-dialogue').assert(u,plan.dialogue);
 if(plan.capability)require('./ai-capability').assert(u,plan.capability);
 if(plan.inventory)require('./ai-inventory').assert(u,plan.inventory,plan.publicCatalog);
 if(plan.explanation)require('./ai-explanation').assert(u,plan.explanation);
 const grants={report:metric(question,plan)==='revenue'?'reports.revenue':'reports.view',overview:'reports.view',occupied:'reports.view',booking:u.role==='guest'?'own-bookings.view':'bookings.view',arrivals:'bookings.view',departures:'bookings.view',alerts:'bookings.view',housekeeping:'housekeeping.view'};
 if(grants[plan.intent])requireGrant(u,grants[plan.intent]);
 // Public room descriptions, rates and date-based availability are available
 // to every role. Staff workflows/reports above still require actual grants.
}
module.exports={metric,requirements,canView,canExport,isReport,check,preflight,requireGrant};
