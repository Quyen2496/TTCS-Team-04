'use strict';
require('dotenv').config({path:require('node:path').join(__dirname,'../.env')});
const path=require('node:path'),B=require('../src/backup');
(async()=>{if(!process.argv[2]||!process.argv[3])throw Error('Dùng: node scripts/restore-qa.js FILE.hsbackup DUONG_DAN/HOMESTAY_QA/homestay.json');const result=await B.restoreToQA(path.resolve(process.argv[2]),path.resolve(process.argv[3]));console.log('Đã phục hồi dữ liệu sang QA mới; không thay dữ liệu đang chạy.');console.log(JSON.stringify(result,null,2));})().catch(e=>{console.error(e.message);process.exitCode=1;});
