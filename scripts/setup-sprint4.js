'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),dotenv=require('dotenv');
(async()=>{
 const file=path.join(__dirname,'../.env'),original=await fs.readFile(file,'utf8'),current=dotenv.parse(original),stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex');
 const settings={BACKUP_ENABLED:'true',BACKUP_DIR:current.BACKUP_DIR||path.join(__dirname,'../backups/database'),BACKUP_KEY:current.BACKUP_KEY||(current.JWT_SECRET?.length>=32?current.JWT_SECRET:crypto.randomBytes(32).toString('hex'))};
 if(settings.BACKUP_KEY.length<32)throw Error('BACKUP_KEY hiện có cần tối thiểu 32 ký tự; chưa thay khoá cũ.');
 const directory=path.join(__dirname,'../backups/config');await fs.mkdir(directory,{recursive:true,mode:0o700});await fs.writeFile(path.join(directory,'.env-'+stamp),original,{mode:0o600,flag:'wx'});
 const lines=original.split(/\r?\n/).filter(line=>!Object.keys(settings).some(k=>new RegExp('^\\s*(?:export\\s+)?'+k+'\\s*=').test(line))),temp=file+'.sprint4-'+stamp;
 if(await fs.readFile(file,'utf8')!==original)throw Error('.env vừa được sửa; hãy chạy lại.');
 try{await fs.writeFile(temp,lines.join('\n')+'\n# Sprint 4: sao luu du lieu ma hoa\n'+Object.entries(settings).map(([k,v])=>k+'='+JSON.stringify(v)).join('\n')+'\n',{mode:0o600,flag:'wx'});await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}
 console.log('Đã bật sao lưu dữ liệu tự động lúc 02:00 giờ Việt Nam, giữ 7 bản thành công.');console.log('Giữ cấu hình MongoDB/payOS/email/AI. Khởi động lại server; tác vụ chạy khi máy đang bật.');console.log('Giữ BACKUP_KEY ở nơi riêng an toàn để phục hồi. Đừng gửi .env hoặc khoá vào chat.');
})().catch(e=>{console.error('Chưa bật được sao lưu: '+e.message);process.exitCode=1;});
