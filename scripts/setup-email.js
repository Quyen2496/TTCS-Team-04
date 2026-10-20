'use strict';
const path=require('node:path'),Setup=require('../src/email-setup'),Mail=require('../src/mail');
async function main(){
 if(!process.argv.includes('--from-env'))throw Error('Chạy bash scripts/setup-email.sh để nhập email và mật khẩu ứng dụng kín trên máy của bạn.');
 const email=process.env.HS_SETUP_EMAIL,password=process.env.HS_SETUP_PASSWORD;delete process.env.HS_SETUP_EMAIL;delete process.env.HS_SETUP_PASSWORD;
 const result=await Setup.configure({envPath:path.join(__dirname,'../.env'),email,password});
 console.log('Đã kiểm tra kết nối, đăng nhập và máy chủ SMTP đã nhận thư thử tới '+result.email+'.');
 console.log('Đã lưu cấu hình email và sao lưu .env cũ trong backups/email.');
 console.log('Kiểm tra Inbox/Spam. Dừng server cũ bằng Ctrl+C và khởi động lại.');
 console.log('Admin → Tài khoản & quyền → Sửa: đặt email thật cho tài khoản cần khôi phục, rồi thử Quên mật khẩu.');
}
if(require.main===module)main().catch(e=>{console.error(e.code?Mail.failure(e).message:e.message);process.exitCode=1;});
module.exports={main};
