'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),Mail=require('./mail');
const keys=['SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASS','MAIL_FROM'];
function gmailConfig(email,password){
 email=String(email||'').trim().toLowerCase();password=String(password||'').replace(/\s+/g,'');
 if(!/^[^\s@<>"\r\n]+@[^\s@<>"\r\n]+\.[^\s@<>"\r\n]+$/.test(email)||email.length>254)throw Error('Nhập email gửi hợp lệ.');
 if(!password||/[\r\n"\x00]/.test(password))throw Error('Nhập mật khẩu ứng dụng hợp lệ của email gửi.');
 return {SMTP_HOST:'smtp.gmail.com',SMTP_PORT:'465',SMTP_SECURE:'true',SMTP_USER:email,SMTP_PASS:password,MAIL_FROM:email};
}
function updateEnv(original,config){
 const newline=original.includes('\r\n')?'\r\n':'\n';
 const kept=original.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>!keys.some(key=>new RegExp('^\\s*(?:export\\s+)?'+key+'\\s*=').test(line)));
 while(kept.length&&!kept.at(-1))kept.pop();
 return kept.join(newline)+newline+newline+'# Email đã kiểm tra bằng thiết lập HOMESTAY'+newline+keys.map(key=>key+'='+JSON.stringify(config[key])).join(newline)+newline;
}
async function saveConfig(envPath,config,original){
 let current;try{current=await fs.readFile(envPath,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;current=null;}
 if(current!==original)throw Error('File .env vừa thay đổi. Chạy lại thiết lập để giữ đúng cấu hình mới nhất.');
 const directory=path.dirname(envPath),stamp=Date.now()+'-'+crypto.randomBytes(4).toString('hex'),temp=path.join(directory,'.env.email-temp-'+stamp);
 if(original!==null){const backup=path.join(directory,'backups/email');await fs.mkdir(backup,{recursive:true,mode:0o700});await fs.appendFile(path.join(backup,'.gitignore'),'\n.env-*\n',{mode:0o600});await fs.writeFile(path.join(backup,'.env-'+stamp),original,{mode:0o600,flag:'wx'});}
 try{await fs.writeFile(temp,updateEnv(original||'',config),{mode:0o600,flag:'wx'});await fs.rename(temp,envPath);}finally{await fs.rm(temp,{force:true});}
}
async function configure({envPath,email,password,createTransport=Mail.transport}){
 const config=gmailConfig(email,password);let original;try{original=await fs.readFile(envPath,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;throw Error('Chưa có .env. Tạo cấu hình HOMESTAY trước khi thiết lập email.');}
 const sender=createTransport(config);
 try{
  await sender.verify();
  const result=await sender.sendMail({from:config.MAIL_FROM,to:config.SMTP_USER,subject:'Kiểm tra email HOMESTAY',text:'Đây là thư kiểm tra từ bước thiết lập email HOMESTAY. Sau khi nhận thư, khởi động lại server và thử Quên mật khẩu với email thật đã lưu trên tài khoản.'});
  if(!result.accepted?.some(address=>String(address).toLowerCase()===config.SMTP_USER))throw Error('Máy chủ SMTP chưa chấp nhận thư kiểm tra.');
  await saveConfig(envPath,config,original);return {email:config.SMTP_USER};
 }finally{sender.close?.();}
}
module.exports={gmailConfig,updateEnv,saveConfig,configure};
