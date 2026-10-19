'use strict';
const bcrypt=require('bcryptjs');
async function accounts(state){const active=state.users.filter(u=>u.active);if(!active.some(u=>u.role==='admin'))throw Error('Production cần tài khoản admin riêng đã tạo trước khi mở website.');for(const u of active){if(!u.password||await bcrypt.compare('Quy@123456',u.password))throw Error('Production có tài khoản đang bật dùng mật khẩu demo hoặc chưa có mật khẩu. Đổi mật khẩu hoặc khoá tài khoản này trước khi triển khai.');}}
module.exports={accounts};
