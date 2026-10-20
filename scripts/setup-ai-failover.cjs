'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),dotenv=require('dotenv'),P=require('../src/ai-provider');
async function configure({envPath,input=process.env,fetch:fetcher=fetch}={}){
 const original=await fs.readFile(envPath,'utf8'),old=dotenv.parse(original),primary=input.HS_DUAL_PRIMARY||'groq';
 if(!['groq','gemini'].includes(primary))throw Error('AI chính cần là Groq hoặc Gemini.');
 const groq=String(input.HS_DUAL_GROQ||old.GROQ_API_KEY||'').trim(),gemini=String(input.HS_DUAL_GEMINI||old.GEMINI_API_KEY||'').trim();
 for(const key of [groq,gemini])if(!key||key.length>400||/[\s"\x00]/.test(key))throw Error('Cần hai API key hợp lệ. Khoá được nhập kín tại máy, không gửi qua chat.');
 const groqModel=String(input.HS_DUAL_GROQ_MODEL||old.GROQ_MODEL||P.defaultGroqModel).trim();
 let geminiModel=String(input.HS_DUAL_GEMINI_MODEL||old.GEMINI_MODEL||'').trim();
 if(!geminiModel){
  const response=await fetcher('https://generativelanguage.googleapis.com/v1beta/models',{headers:{'x-goog-api-key':gemini},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Không đọc được danh sách model Gemini (HTTP '+response.status+'). Kiểm tra key hoặc nhập tên model bạn được dùng.');
  const body=await response.json(),names=(body.models||[]).filter(m=>m.supportedGenerationMethods?.includes('generateContent')).map(m=>m.name.replace(/^models\//,''));
  geminiModel=[P.defaultGeminiModel,'gemini-3.8-flash','gemini-3.1-flash-lite','gemini-2.5-flash-lite','gemini-2.5-flash'].find(m=>names.includes(m));
  if(!geminiModel)throw Error('Chưa chọn được model văn bản. Chạy lại và nhập model Gemini có trong tài khoản.');
 }
 if(!/^[a-zA-Z0-9_.:/-]{1,120}$/.test(groqModel)||!/^[a-zA-Z0-9_.-]{1,120}$/.test(geminiModel))throw Error('Tên model không hợp lệ.');
 const values={AI_PROVIDER:primary,AI_FALLBACK_PROVIDERS:primary==='groq'?'gemini':'groq',GROQ_API_KEY:groq,GROQ_MODEL:groqModel,GEMINI_API_KEY:gemini,GEMINI_MODEL:geminiModel,AI_NATURAL_RESPONSE:'true',AI_SMART_ROUTING:'true'};
 for(const provider of ['groq','gemini']){
  console.log('Kiểm tra '+provider+' / '+(provider==='groq'?groqModel:geminiModel));
  const result=await P.classify('Xin chào, bạn giúp mình đặt phòng nhé.',{}, {env:{...old,...values,AI_PROVIDER:provider,AI_FALLBACK_PROVIDERS:''},fetch:fetcher,timeout:15000,onDiagnostic:info=>console.log('Chẩn đoán an toàn: '+JSON.stringify(info))});
  if(result.fallback&&result.reason!=='rate_limit')throw Error(provider+' chưa sẵn sàng ('+result.reason+(result.status?', HTTP '+result.status:'')+'). Chưa lưu cấu hình.');
  console.log(provider+': '+(result.fallback?'Đang giới hạn; tự chuyển sang nhà cung cấp còn dùng được.':'Kết nối và định tuyến JSON hợp lệ.'));
 }
 if(await fs.readFile(envPath,'utf8')!==original)throw Error('.env vừa thay đổi. Chạy lại để tránh ghi đè.');
 const stamp=Date.now()+'-'+crypto.randomUUID().slice(0,8),backup=path.join(path.dirname(envPath),'backups','ai');
 await fs.mkdir(backup,{recursive:true,mode:0o700});await fs.writeFile(path.join(backup,'.env-'+stamp),original,{flag:'wx',mode:0o600});await fs.writeFile(path.join(backup,'.gitignore'),'*\n!.gitignore\n',{mode:0o600});
 const keys=Object.keys(values),newline=original.includes('\r\n')?'\r\n':'\n';
 const kept=original.split(/\r?\n/).filter(line=>!keys.some(k=>new RegExp('^\\s*(?:export\\s+)?'+k+'\\s*=').test(line)));
 const temp=envPath+'.ai-'+stamp;
 try{await fs.writeFile(temp,kept.join(newline)+newline+'# Groq / Gemini failover'+newline+keys.map(k=>k+'='+JSON.stringify(values[k])).join(newline)+newline,{flag:'wx',mode:0o600});await fs.rename(temp,envPath);}finally{await fs.rm(temp,{force:true});}
 console.log('ĐÃ LƯU. Groq model: '+groqModel+'; Gemini model: '+geminiModel+'. Khởi động lại server để nạp cấu hình mới.');
 return {primary,groqModel,geminiModel};
}
module.exports={configure};
if(require.main===module)configure({envPath:path.join(__dirname,'../.env')}).catch(error=>{console.error(error.message);process.exitCode=1;});
