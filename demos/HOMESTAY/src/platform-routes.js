const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),bcrypt=require('bcryptjs'),express=require('express');
const D=require('./domain'),A=require('./access');
function register(app,{store,route,ok,auth,options={}}){
 const uploadDir=options.uploadDir||path.join(__dirname,'../public/assets/uploads');
 const publicProperty=h=>{const {_id,name,address,description,phone,email,photo,images,active}=h;return {_id,name,address,description,phone,email,photo,images,active};};
 app.get('/api/public/homestays',route(async(req,res)=>{const s=await store.read();A.upgrade(s);ok(res,s.homestays.filter(h=>h.active).map(publicProperty));}));
 app.get('/api/admin/homestays',auth(),route(async(req,res)=>ok(res,A.allowedProperties(await store.read(),req.user).map(publicProperty))));
 app.get('/api/admin/customers',auth(),route(async(req,res)=>{
  const s=await store.read(),v=A.view(s,req.user,req.get('X-Homestay-Id')).result,rows=new Map();
  for(const b of v.bookings.slice().sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||'')))){
   const key=b.guestUserId?'user:'+b.guestUserId:b.email?'email:'+b.email.toLowerCase():b.phone?'phone:'+b.phone+':'+b.guestName:'booking:'+b.bookingCode;
   const previous=rows.get(key)||{bookings:[],bookingCount:0,totalAmount:0,depositAmount:0};
   for(const k of ['guestName','email','phone','guestAddress','nationality','birthDate','gender','documentType','idNumber'])if(b[k])previous[k]=b[k];
   previous.bookingCount++;previous.totalAmount+=b.totalAmount||0;previous.depositAmount+=b.depositAmount||0;
   previous.bookings.unshift({bookingCode:b.bookingCode,homestayName:s.homestays.find(h=>h._id===b.homestayId)?.name||'',roomTypeName:b.roomTypeName,roomNumber:s.rooms.find(r=>r._id===b.roomId)?.roomNumber||'',checkIn:b.checkIn,checkOut:b.checkOut,guestCount:b.guestCount,status:b.status,totalAmount:b.totalAmount,depositAmount:b.depositAmount,actualCheckIn:b.actualCheckIn,actualCheckOut:b.actualCheckOut,companions:b.companions||[],companionDetails:b.companionDetails||[]});rows.set(key,previous);
  }
  ok(res,[...rows.values()].reverse());
 }));
 app.get('/api/admin/permissions',auth(),(req,res)=>ok(res,A.defaults));
 app.post('/api/admin/homestays',auth(),route(async(req,res)=>ok(res,await store.mutate(s=>{const name=String(req.body.name||'').trim();if(!name||name.length>120)D.fail('Nhập tên homestay tối đa 120 ký tự.');const h={_id:D.id(),name,address:String(req.body.address||'').slice(0,500),description:String(req.body.description||'').slice(0,3000),phone:String(req.body.phone||'').slice(0,30),email:String(req.body.email||'').slice(0,254),active:true,photo:'',images:[],settings:structuredClone(s.settings),pricingCalendar:{}};s.homestays.push(h);D.log(s,req.user.username,'CREATE_HOMESTAY',h.name);return h;}),201)));
 app.put('/api/admin/homestays/:id',auth(),route(async(req,res)=>ok(res,await store.mutate(s=>{const h=A.allowedProperties(s,req.user).find(h=>h._id===req.params.id);if(!h)D.fail('Không tìm thấy homestay.','NOT_FOUND',404);const name=String(req.body.name||'').trim();if(!name||name.length>120)D.fail('Nhập tên homestay tối đa 120 ký tự.');if(req.body.active===false&&s.bookings.some(b=>b.homestayId===h._id&&['PENDING','CONFIRMED','CHECKED_IN'].includes(b.status)))D.fail('Cơ sở còn booking đang xử lý.');const media=A.validateMedia(s,req.body.photo??h.photo,req.body.images??h.images,h._id);Object.assign(h,{name,address:String(req.body.address||'').slice(0,500),description:String(req.body.description||'').slice(0,3000),phone:String(req.body.phone||'').slice(0,30),email:String(req.body.email||'').slice(0,254),active:req.body.active!==false,...media});D.log(s,req.user.username,'UPDATE_HOMESTAY',h.name);return publicProperty(h);}))));
 app.delete('/api/admin/homestays/:id',auth(),route(async(req,res)=>{await store.mutate(s=>{const h=s.homestays.find(x=>x._id===req.params.id);if(!h)D.fail('Không tìm thấy cơ sở.','NOT_FOUND',404);if(s.homestays.length===1||s.rooms.some(r=>r.homestayId===h._id)||s.roomTypes.some(r=>r.homestayId===h._id)||s.bookings.some(b=>b.homestayId===h._id))D.fail('Cơ sở đã có dữ liệu; hãy ngừng hoạt động.');s.homestays=s.homestays.filter(x=>x!==h);for(const u of s.users)u.homestayIds=(u.homestayIds||[]).filter(id=>id!==h._id);D.log(s,req.user.username,'DELETE_HOMESTAY',h.name);});ok(res,{});}));
 app.post('/api/admin/photos',auth(),express.raw({type:['image/png','image/jpeg','image/webp'],limit:'5mb'}),route(async(req,res)=>{
  const bytes=req.body,type=req.get('Content-Type')?.split(';')[0];if(!Buffer.isBuffer(bytes)||bytes.length<24)D.fail('Chọn ảnh PNG, JPG hoặc WebP hợp lệ, tối đa 5 MB.');
  const ext=type==='image/png'&&bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))?'png':type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':type==='image/webp'&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'webp':null;
  if(!ext)D.fail('Nội dung tệp không khớp định dạng ảnh.');
  const s=await store.read(),h=A.allowedProperties(s,req.user).find(h=>h._id===req.query.homestayId);if(!h)D.fail('Chọn homestay bạn được cấp quyền.','FORBIDDEN',403);
  const file=crypto.randomBytes(24).toString('hex')+'.'+ext,mediaPath='/assets/uploads/'+file;await fs.mkdir(uploadDir,{recursive:true});await fs.writeFile(path.join(uploadDir,file),bytes,{flag:'wx'});
  try{await store.mutate(s=>{s.uploads.push({path:mediaPath,homestayId:h._id,createdAt:new Date().toISOString(),by:req.user._id});D.log(s,req.user.username,'UPLOAD_PHOTO',h.name);});}catch(e){await fs.unlink(path.join(uploadDir,file));throw e;}
  ok(res,{path:mediaPath},201);
 }));
 app.use('/assets/uploads',express.static(uploadDir,{dotfiles:'deny',fallthrough:false}));
 app.delete('/api/admin/users/:id',auth(),route(async(req,res)=>{await store.mutate(s=>{const u=s.users.find(u=>u._id===req.params.id);if(!u)D.fail('Không tìm thấy tài khoản.','NOT_FOUND',404);if(u._id===req.user._id||u.role==='admin'&&u.active&&s.users.filter(x=>x.role==='admin'&&x.active).length<=1)D.fail('Không thể xoá tài khoản đang dùng hoặc admin cuối cùng.');s.users=s.users.filter(x=>x!==u);s.passwordResets=s.passwordResets.filter(x=>x.userId!==u._id);D.log(s,req.user.username,'DELETE_USER',u.username);});ok(res,{});}));
 require('./password-reset').register(app,{store,route,ok,options});
}
module.exports={register};
