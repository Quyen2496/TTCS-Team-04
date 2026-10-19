'use strict';
require('dotenv').config({path:require('node:path').join(__dirname,'../.env')});
const P=require('../src/payos');
(async()=>{const key=process.argv[2]||'default',env=process.env,base=P.origin(env);if(!base.startsWith('https://'))throw Error('Webhook cần HTTPS công khai.');const c=P.channel(env,key);await P.client(c).webhooks.confirm(base+'/api/webhooks/payos/'+encodeURIComponent(key));console.log('payOS đã chấp nhận endpoint webhook của kênh '+key+'. Cần thử giao dịch nhỏ và kiểm tra sổ cọc trước vận hành.');})().catch(()=>{console.error('Chưa xác nhận được webhook. Kiểm tra HTTPS công khai, kênh payOS và cấu hình máy chủ.');process.exitCode=1;});
