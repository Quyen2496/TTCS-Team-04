'use strict';
const crypto=require('node:crypto'),bcrypt=require('bcryptjs'),D=require('./domain'),A=require('./access'),Mail=require('./mail');
const digest=(challenge,code)=>crypto.createHash('sha256').update(challenge+':'+code).digest('hex');
const message='Nếu email thuộc tài khoản đang hoạt động, mã 6 số sẽ được gửi tới hộp thư. Kiểm tra cả thư rác. Mã có hiệu lực 10 phút.';
function register(app,{store,route,ok,options={}}){
 app.post('/api/auth/forgot-password',route(async(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase();if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))D.fail('Nhập email hợp lệ.');
  const sender=options.sendResetEmail?null:Mail.transport(),now=Date.now(),challenge=crypto.randomBytes(24).toString('hex'),code=String(crypto.randomInt(0,1000000)).padStart(6,'0');
  const result=await store.mutate(s=>{
   for(const [k,t] of Object.entries(s.resetRequests))if(!t.some(x=>x>now-3600000))delete s.resetRequests[k];
   const key=digest('email',email),times=(s.resetRequests[key]||[]).filter(t=>t>now-3600000);
   if(times.length>=3)return {limited:true};s.resetRequests[key]=[...times,now];
   s.passwordResets=s.passwordResets.filter(t=>t.expiresAt>now);const u=s.users.find(u=>u.active&&u.email?.toLowerCase()===email);if(!u)return {};
   s.passwordResets=s.passwordResets.filter(t=>t.userId!==u._id);s.passwordResets.push({challenge,hash:digest(challenge,code),userId:u._id,expiresAt:now+600000,attempts:0,ready:false,sessionVersion:u.sessionVersion||0});return {userId:u._id};
  });
  if(result.limited)throw new D.AppError(429,'RATE_LIMITED','Tối đa 3 lần gửi mã trong một giờ cho cùng email.',3600);
  if(result.userId){try{
   const mail={to:email,subject:'Mã đặt lại mật khẩu HOMESTAY VIỆT',text:'Mã đặt lại mật khẩu của bạn: '+code+'\nMã dùng một lần, hết hạn sau 10 phút. Không chia sẻ mã này. Nếu bạn không yêu cầu, hãy bỏ qua email.'};
   if(options.sendResetEmail)await options.sendResetEmail(mail);else {const sent=await sender.sendMail({...mail,from:process.env.MAIL_FROM||process.env.SMTP_USER});if(!sent.accepted?.length)throw Error('SMTP rejected recipient');}
   await store.mutate(s=>{const t=s.passwordResets.find(t=>t.challenge===challenge);if(t)t.ready=true;});
  }catch(e){await store.mutate(s=>{s.passwordResets=s.passwordResets.filter(t=>t.challenge!==challenge);const key=digest('email',email);s.resetRequests[key]=(s.resetRequests[key]||[]).filter(t=>t!==now);});throw Mail.failure(e);}finally{sender?.close();}}
  else sender?.close();
  ok(res,{message,challenge,expiresIn:600});
 }));
 app.post('/api/auth/reset-password',route(async(req,res)=>{
  if(!A.validPassword(req.body.password))D.fail('Mật khẩu cần 8–72 ký tự, có chữ và số.');
  const challenge=String(req.body.challenge||''),code=String(req.body.code||'').trim();if(!/^[a-f0-9]{48}$/.test(challenge)||!/^\d{6}$/.test(code))D.fail('Nhập đủ mã email 6 số và gửi yêu cầu mới nếu cần.');
  const password=await bcrypt.hash(req.body.password,10),result=await store.mutate(s=>{
   const t=s.passwordResets.find(t=>t.challenge===challenge&&t.ready&&t.expiresAt>Date.now()&&t.attempts<5),u=t&&s.users.find(u=>u._id===t.userId&&u.active&&(u.sessionVersion||0)===t.sessionVersion);
   if(!u)return {invalid:true};if(!crypto.timingSafeEqual(Buffer.from(t.hash,'hex'),Buffer.from(digest(challenge,code),'hex'))){t.attempts++;return {invalid:true};}
   u.password=password;u.sessionVersion=(u.sessionVersion||0)+1;s.passwordResets=s.passwordResets.filter(t=>t.userId!==u._id);D.log(s,u.username,'RESET_PASSWORD_EMAIL','Đặt lại mật khẩu bằng mã email');return {};
  });
  if(result.invalid)D.fail('Mã không đúng, đã hết hạn, đã dùng hoặc nhập sai quá 5 lần. Hãy gửi lại mã.');ok(res,{message:'Đã đổi mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.'});
 }));
}
module.exports={register};
