'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{createDemo}=require('../src/demo-data');
(async()=>{
 const target=path.resolve(process.argv[2]||path.join(__dirname,'../HOMESTAY_DEMO_SPRINT4'));
 if(!/^HOMESTAY_(DEMO|QA)(?:[_-].*)?$/i.test(path.basename(target)))throw Error('Thư mục phải có tên HOMESTAY_DEMO… hoặc HOMESTAY_QA…; không reset dữ liệu vận hành.');
 const file=path.join(target,'homestay.json');await fs.mkdir(target,{recursive:true,mode:0o700});
 let existing;try{existing=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 if(existing&&!existing.demoDataset)throw Error('Từ chối ghi đè dữ liệu không có nhãn demo.');
 const started=performance.now(),data=createDemo(),temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(data,null,2),{mode:0o600});await fs.rename(temp,file);
 console.log('Đã tạo riêng 4 loại phòng, 20 phòng, 30 booking trong 3 tháng.');console.log('Tệp demo: '+file);console.log('Thời gian: '+Math.round(performance.now()-started)+' ms. Dữ liệu đang vận hành giữ nguyên.');
 console.log('Chạy thử: HOMESTAY_DATA_FILE="'+file+'" DATA_MODE=file node server.js');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
