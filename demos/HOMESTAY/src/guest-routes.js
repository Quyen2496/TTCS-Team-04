const bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken');
const D=require('./domain'),A=require('./access');
const emailValue=v=>String(v||'').trim().toLowerCase();
const validEmail=v=>v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const profile=b=>{
 const fullName=String(b.fullName||'').trim(),phone=String(b.phone||'').trim(),address=String(b.address||'').trim(),nationality=String(b.nationality||'').trim();
 if(!fullName||fullName.length>255||phone&&!/^0[35789]\d{8}$/.test(phone)||address.length>500||nationality.length>100)D.fail('Kiểm tra họ tên, số điện thoại và địa chỉ.');
 return {fullName,phone,address,nationality};
};
const publicBooking=b=>Object.fromEntries(['bookingCode','homestayId','roomTypeName','checkIn','checkOut','numberOfNights','guestCount','totalAmount','depositAmount','status','holdExpiresAt','createdAt','refundAmount'].map(k=>[k,b[k]]));
function register(app,{store,route,ok,auth,secret}){
 const attempts=new Map();
 app.post('/api/auth/register',route(async(req,res)=>{
  const now=Date.now(),times=(attempts.get(req.ip)||[]).filter(t=>t>now-3600000);
  if(times.length>=10)throw new D.AppError(429,'RATE_LIMITED','Vui lòng thử đăng ký lại sau một giờ.',3600);attempts.set(req.ip,[...times,now]);
  const username=String(req.body.username||'').trim(),email=emailValue(req.body.email),fields=profile(req.body);
  if(!/^[a-zA-Z0-9_]{3,30}$/.test(username)||!validEmail(email)||!A.validPassword(req.body.password))D.fail('Tên tài khoản 3–30 ký tự; email hợp lệ; mật khẩu 8–72 ký tự gồm chữ và số.');
  const password=await bcrypt.hash(req.body.password,10);
  const user=await store.mutate(s=>{A.upgrade(s);if(s.users.some(u=>u.username.toLowerCase()===username.toLowerCase()||u.email?.toLowerCase()===email))D.fail('Tên tài khoản hoặc email đã được sử dụng.','DUPLICATE',409);
   const u={_id:D.id(),username,email,...fields,password,role:'guest',active:true,homestayIds:[],sessionVersion:0};s.users.push(u);D.log(s,username,'REGISTER_GUEST','Đăng ký tài khoản khách');return A.safeUser(u);
  });ok(res,{user,token:jwt.sign({sub:user._id,version:0},secret,{expiresIn:'30m'})},201);
 }));
 const guest=(req,res,next)=>{if(req.user.role!=='guest')return next(new D.AppError(403,'FORBIDDEN','Chức năng dành cho tài khoản Khách.'));next();};
 app.get('/api/guest/profile',auth(),guest,(req,res)=>ok(res,A.safeUser(req.user)));
 app.patch('/api/guest/profile',auth(),guest,route(async(req,res)=>ok(res,await store.mutate(s=>{const u=s.users.find(u=>u._id===req.user._id);Object.assign(u,profile(req.body));return A.safeUser(u);})))) ;
 app.get('/api/guest/bookings',auth(),guest,route(async(req,res)=>{const s=await store.read();D.expire(s);ok(res,s.bookings.filter(b=>b.guestUserId===req.user._id).map(b=>({...publicBooking(b),homestayName:s.homestays.find(h=>h._id===b.homestayId)?.name})).reverse());}));
 app.post('/api/guest/bookings/:code/cancel',auth(),guest,route(async(req,res)=>ok(res,await store.mutate(s=>{const b=s.bookings.find(b=>b.bookingCode===req.params.code&&b.guestUserId===req.user._id);if(!b)D.fail('Không tìm thấy booking.','NOT_FOUND',404);return publicBooking(D.transition(s,b.bookingCode,'cancel',{},req.user.username));}))));
}
module.exports={register,validEmail};
