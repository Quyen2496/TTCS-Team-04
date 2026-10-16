'use strict';
require('dotenv').config({path:require('node:path').join(__dirname,'../.env')});
const path=require('node:path'),{Store}=require('../src/store'),B=require('../src/backup');
(async()=>{const store=new Store({mode:process.env.DATA_MODE||'mongo',uri:process.env.MONGODB_URI,file:path.join(__dirname,'../data/homestay.json')});try{await store.init();const result=await B.backup(store,{directory:process.env.BACKUP_DIR||path.join(__dirname,'../backups/database')});console.log(JSON.stringify(result,null,2));}finally{await store.close();}})().catch(()=>{console.error('Sao lưu chưa thành công. Kiểm tra cấu hình DB, thư mục và BACKUP_KEY/JWT_SECRET.');process.exitCode=1;});
