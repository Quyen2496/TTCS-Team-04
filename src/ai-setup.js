'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),dotenv=require('dotenv'),Provider=require('./ai-provider');
function settings(provider,model,key,base){
 if(!['groq','ollama','disabled'].includes(provider))throw Error('Chọn groq, ollama hoặc disabled.');
 if(provider==='disabled')return {AI_PROVIDER:'disabled'};
 model=String(model||'').trim()||(provider==='groq'?Provider.defaultGroqModel:'qwen2.5-coder:7b');if(!/^[a-zA-Z0-9_.:/-]{1,120}$/.test(model))throw Error('Tên model không hợp lệ.');
 if(provider==='groq'){key=String(key||'').trim();if(!key||/[\s"\x00]/.test(key)||key.length>400)throw Error('Nhập Groq API key hợp lệ.');return {AI_PROVIDER:provider,GROQ_MODEL:model,GROQ_API_KEY:key};}
 base=String(base||'').trim()||'http://127.0.0.1:11434/v1';const c=Provider.config({AI_PROVIDER:'ollama',OLLAMA_MODEL:model,OLLAMA_BASE_URL:base});if(!c.ready||/[\r\n"]/.test(base))throw Error('URL Ollama không hợp lệ.');return {AI_PROVIDER:provider,OLLAMA_MODEL:model,OLLAMA_BASE_URL:base};
}
async function configure({envPath,provider,model,key,base,fetch:fetcher}){
 const config=settings(provider,model,key,base);let original;try{original=await fs.readFile(envPath,'utf8');}catch{throw Error('Chưa có .env. Thiết lập HOMESTAY trước.');}
 if(provider!=='disabled'){
  const r=await Provider.classify('Xin chào, bạn hỗ trợ những gì trong homestay?',{}, {env:{...dotenv.parse(original),...config},fetch:fetcher});
  if(r.fallback){
   const messages={authentication:'AI từ chối API key. Kiểm tra key của đúng nhà cung cấp; không gửi key qua chat.',permission:'Project/tài khoản chưa được phép dùng model. Kiểm tra Model Permissions trên Groq.',rate_limit:'Đã chạm hạn mức gọi AI. Chờ hạn mức được khôi phục rồi thử lại; key mới cùng project không tự tăng hạn mức.',model_unavailable:'Model không tồn tại, đã ngừng hoặc key chưa được truy cập. Với Groq, thử openai/gpt-oss-20b.',invalid_request:'Nhà cung cấp từ chối tham số gửi lên. Kiểm tra model có hỗ trợ JSON Object Mode.',invalid_response:'Đã kết nối nhưng AI không trả JSON định tuyến hợp lệ. Chạy lại hoặc chọn model hỗ trợ JSON Object Mode.',token_limit:'AI đã dùng hết giới hạn phản hồi trước khi trả JSON hoàn chỉnh. Kiểm tra cấu hình token/model.',timeout:'Kết nối AI quá thời gian 30 giây. Kiểm tra mạng/dịch vụ và chạy lại.',dns:'Không phân giải được tên máy chủ AI. Kiểm tra DNS và kết nối Internet.',tls:'Không xác minh được kết nối TLS tới AI. Kiểm tra ngày giờ máy, chứng chỉ và phần mềm chặn HTTPS.',network:'Không kết nối được máy chủ AI. Kiểm tra Internet; nếu dùng Ollama, kiểm tra ứng dụng đang chạy và URL.',unavailable:'Dịch vụ AI đang lỗi hoặc tạm không sẵn sàng. Thử lại sau.'};
   throw Error((provider==='groq'?'Groq':'Ollama')+(r.status?' (HTTP '+r.status+')':'')+': '+(messages[r.reason]||messages.unavailable)+' Chưa lưu thay đổi .env.');
  }
 }
 if(await fs.readFile(envPath,'utf8')!==original)throw Error('.env vừa thay đổi. Chạy lại để giữ cấu hình mới nhất.');
 const newline=original.includes('\r\n')?'\r\n':'\n',keys=Object.keys(config),kept=original.split(/\r?\n/).filter(line=>!keys.some(k=>new RegExp('^\\s*(?:export\\s+)?'+k+'\\s*=').test(line)));while(!kept.at(-1)&&kept.length)kept.pop();
 const stamp=Date.now()+'-'+crypto.randomBytes(4).toString('hex'),directory=path.dirname(envPath),backup=path.join(directory,'backups/ai');await fs.mkdir(backup,{recursive:true,mode:0o700});await fs.appendFile(path.join(backup,'.gitignore'),'\n.env-*\n',{mode:0o600});await fs.writeFile(path.join(backup,'.env-'+stamp),original,{mode:0o600,flag:'wx'});
 const temp=path.join(directory,'.env.ai-temp-'+stamp);try{await fs.writeFile(temp,kept.join(newline)+newline+newline+'# Trợ lý HOMESTAY'+newline+keys.map(k=>k+'='+JSON.stringify(config[k])).join(newline)+newline,{mode:0o600,flag:'wx'});await fs.rename(temp,envPath);}finally{await fs.rm(temp,{force:true});}
 return {provider,model:config.GROQ_MODEL||config.OLLAMA_MODEL||null};
}
module.exports={settings,configure};
