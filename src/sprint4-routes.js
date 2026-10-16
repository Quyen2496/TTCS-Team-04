'use strict';
const jwt=require('jsonwebtoken'),D=require('./domain'),A=require('./access'),S=require('./settlement'),R=require('./business-reports'),M=require('./booking-mail'),I=require('./invoice-pdf'),Privacy=require('./privacy');
function register(app,{store,route,ok,auth,read,mutate,secret,options={}}){
 app.post('/api/admin/bookings/:code/surcharges',auth(),route(async(req,res)=>ok(res,await mutate(req,s=>S.surcharge(s,req.params.code,req.body,req.user.username)))));
 app.post('/api/admin/bookings/:code/void-surcharge',auth(),route(async(req,res)=>ok(res,await mutate(req,s=>S.voidSurcharge(s,req.params.code,req.body,req.user.username)))));
 app.post('/api/admin/bookings/:code/checkout-preview',auth(),route(async(req,res)=>{
  const p=S.preview(await read(req),req.params.code,req.body),previewToken=jwt.sign({purpose:'checkout',bookingCode:p.bookingCode,digest:S.hash(p)},secret,{expiresIn:'10m'});ok(res,{...p,previewToken});
 }));
 app.post('/api/admin/bookings/:code/checkout',auth(),route(async(req,res)=>{
  let approved;try{approved=jwt.verify(req.body.previewToken,secret);}catch{approved=null;}
  ok(res,await mutate(req,s=>S.checkout(s,req.params.code,req.body,approved,req.user.username)));
 }));
 app.put('/api/admin/settings/checkout-policy',auth(),route(async(req,res)=>{
  const {lateHourly,extraBedPerNight}=req.body;
  if(!D.money(lateHourly)||!D.money(extraBedPerNight)||lateHourly>100000000||extraBedPerNight>100000000)D.fail('Nhập mức phí nguyên VND từ 0 đến 100 triệu.');
  if(!req.get('X-Homestay-Id')&&!req.query.homestayId&&A.allowedProperties(await store.read(),req.user).length>1)D.fail('Chọn một homestay trước khi lưu chính sách.');
  ok(res,await mutate(req,s=>{s.settings.checkoutPolicy={lateHourly,extraBedPerNight};s.settings.version++;D.log(s,req.user.username,'CHECKOUT_POLICY',s.settings.checkoutPolicy);return s.settings.checkoutPolicy;}));
 }));
 function invoiceAccess(req){if(!['admin','owner','reception'].includes(req.user.role)||!A.can(req.user,'customers.view'))D.fail('Không có quyền xem hoá đơn khách.','FORBIDDEN',403);}
 app.post('/api/admin/bookings/:code/invoice',auth(),route(async(req,res)=>{invoiceAccess(req);ok(res,await store.mutate(s=>{const view=A.view(s,req.user,req.get('X-Homestay-Id')||req.query.homestayId).result;S.booking(view,req.params.code);return S.issueInvoice(s,req.params.code,req.user.username);}));}));
 app.get('/api/admin/invoices',auth(),route(async(req,res)=>{invoiceAccess(req);const s=await store.read(),ids=new Set((await read(req)).homestays.map(h=>h._id));ok(res,(s.invoices||[]).filter(i=>ids.has(i.homestayId)).map(({_id,number,bookingCode,guestName,homestayId,issuedAt,settlement})=>({_id,number,bookingCode,guestName,homestayId,issuedAt,total:settlement.total})));}));
 app.get('/api/admin/invoices/:id/pdf',auth(),route(async(req,res)=>{
  invoiceAccess(req);const s=await store.read(),ids=new Set((await read(req)).homestays.map(h=>h._id)),invoice=s.invoices?.find(i=>i._id===req.params.id&&ids.has(i.homestayId));
  if(!invoice)D.fail('Không tìm thấy hoá đơn.','NOT_FOUND',404);const bytes=await (options.invoicePdf||I.pdf)(invoice);res.type('application/pdf').attachment('HOADON_'+invoice.number.replace('/','_')+'_'+invoice.bookingCode+'.pdf').send(bytes);
 }));
 app.get('/api/reports/occupancy',auth(),route(async(req,res)=>ok(res,R.occupancy(await read(req),req.query))));
 app.get('/api/reports/occupancy.csv',auth(),route(async(req,res)=>{const r=R.occupancy(await read(req),req.query);res.type('text/csv; charset=utf-8').attachment('CONG_SUAT_'+r.from+'_'+r.to+'.csv').send(R.csv([['Ngày','Loại phòng','Đêm bán','Đêm khả dụng','Công suất (%)'],...r.rows.map(x=>[x.date,x.name,x.sold,x.available,x.percent===null?'N/A':x.percent.toFixed(2)])]));}));
 app.get('/api/reports/revenue',auth(),route(async(req,res)=>{
  const p=R.period(req.query);if(req.user.role==='reception'&&(p.from!==D.today()||p.to!==D.today()))D.fail('Lễ tân chỉ xem doanh thu hôm nay.','FORBIDDEN',403);
  const r=R.revenue(await read(req),req.query);if(req.user.role==='reception'){delete r.previous;delete r.changePercent;delete r.difference;}ok(res,r);
 }));
 app.get('/api/admin/email-logs',auth(),route(async(req,res)=>{
  const s=await store.read(),ids=new Set((await read(req)).homestays.map(h=>h._id)),page=Math.max(1,Number(req.query.page)||1),size=20;
  const rows=(s.emailJobs||[]).filter(j=>ids.has(j.homestayId)&&(!req.query.bookingCode||j.bookingCode.includes(String(req.query.bookingCode).toUpperCase()))&&(!req.query.status||j.status===req.query.status)&&(!req.query.type||j.type===req.query.type)).reverse();
  ok(res,{total:rows.length,page,pages:Math.max(1,Math.ceil(rows.length/size)),items:rows.slice((page-1)*size,page*size).map(({_id,bookingCode,to,type,status,createdAt,sentAt,nextAttemptAt,attempts,lastError})=>({_id,bookingCode,to,type,status,createdAt,sentAt,nextAttemptAt,attempts,lastError})),runs:[...(s.schedulerRuns||[]),...(s.mailWorkerRuns||[])].sort((a,b)=>String(a.at).localeCompare(String(b.at)))});
 }));
 app.get('/api/admin/bookings/:code/email-status',auth(),route(async(req,res)=>{S.booking(await read(req),req.params.code);const s=await store.read();ok(res,(s.emailJobs||[]).filter(j=>j.bookingCode===req.params.code).map(j=>({type:j.type,status:j.status,attempts:j.attempts.length,sentAt:j.sentAt})));}));
 app.get('/api/admin/bookings/:code/identity',auth(),route(async(req,res)=>{
  if(!['owner','reception'].includes(req.user.role)||!A.can(req.user,'customers.view'))D.fail('Chỉ Chủ homestay hoặc Lễ tân được xem giấy tờ đầy đủ.','FORBIDDEN',403);
  ok(res,await mutate(req,s=>{const b=S.booking(s,req.params.code);D.log(s,req.user.username,'VIEW_GUEST_IDENTITY',{bookingCode:b.bookingCode});return {guestName:b.guestName,idNumber:b.idNumber||'',documentType:b.documentType,birthDate:b.birthDate,gender:b.gender,nationality:b.nationality,guestAddress:b.guestAddress,hometown:b.hometown,issueDate:b.issueDate,expiryDate:b.expiryDate,issuedBy:b.issuedBy,phone:b.phone,email:b.email,status:b.status,guestCount:b.guestCount,companionDetails:b.companionDetails||[]};}));
 }));
 app.get('/api/admin/operations-status',auth(),route(async(req,res)=>{
  const s=await store.read(),env=options.mailEnv||process.env;
  ok(res,{emailConfigured:!!env.SMTP_HOST,backupEnabled:env.BACKUP_ENABLED==='true',backupTime:'02:00 Asia/Ho_Chi_Minh',reminderTime:'09:00 Asia/Ho_Chi_Minh',keep:7,backups:s.backupRuns||[],emailCounts:Object.fromEntries(['PENDING','RETRY','SENT','FAILED','UNCERTAIN','SKIPPED'].map(status=>[status,(s.emailJobs||[]).filter(j=>j.status===status).length]))});
 }));
 app.get('/api/admin/security-matrix',auth(),route(async(req,res)=>{
  const routes=[];for(const layer of app._router.stack)if(layer.route)routes.push({path:layer.route.path,methods:Object.keys(layer.route.methods).map(m=>m.toUpperCase()),permission:A.routePermission({path:layer.route.path,method:Object.keys(layer.route.methods)[0].toUpperCase()})});ok(res,{roles:A.defaults,routes,publicApi:['/api/health','/api/ready','/api/public/*','/api/bookings/availability','/api/bookings/quote','/api/bookings/create','/api/bookings/lookup','/api/lookup','/api/auth/login','/api/auth/register','/api/auth/forgot-password','/api/auth/reset-password','/api/payments/* (payment token)','/api/webhooks/payos/:channel (signature)'],notes:'Giấy tờ mặc định che; endpoint identity chỉ Owner/Receptionist và có audit. Doanh thu lễ tân chỉ hôm nay.'});
 }));
}
module.exports={register};
