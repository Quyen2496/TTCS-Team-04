'use strict';
const D=require('./domain');
function transport(env=process.env){
 if(!env.SMTP_HOST||!(env.MAIL_FROM||env.SMTP_USER))throw new D.AppError(503,'MAIL_UNAVAILABLE','Chưa cấu hình email gửi mã. Quản trị viên cần thiết lập SMTP_HOST, SMTP_USER, SMTP_PASS và MAIL_FROM trong .env.');
 const secure=env.SMTP_SECURE==='true',port=Number(env.SMTP_PORT||(secure?465:587));
 if(!Number.isInteger(port)||port<1||port>65535)throw new D.AppError(503,'MAIL_UNAVAILABLE','Cổng SMTP chưa hợp lệ. Kiểm tra SMTP_PORT trong .env.');
 return require('nodemailer').createTransport({host:env.SMTP_HOST,port,secure,auth:env.SMTP_USER?{user:env.SMTP_USER,pass:env.SMTP_PASS}:undefined,requireTLS:!secure,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:10000});
}
function failure(e){return new D.AppError(503,'MAIL_UNAVAILABLE',e.code==='EAUTH'?'Máy chủ email từ chối đăng nhập. Quản trị viên cần kiểm tra SMTP_USER và SMTP_PASS (mật khẩu ứng dụng nếu dùng Gmail).':'Chưa gửi được mã qua email. Quản trị viên cần kiểm tra máy chủ, cổng SMTP và kết nối mạng; sau đó gửi lại mã.');}
module.exports={transport,failure};
