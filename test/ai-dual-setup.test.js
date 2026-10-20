'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),{configure}=require('../scripts/setup-ai-failover.cjs');
const reply=(gemini)=>new Response(JSON.stringify(gemini?{candidates:[{content:{parts:[{text:'{"intent":"help"}'}]},finishReason:'STOP'}]}:{choices:[{message:{content:'{"intent":"help"}'}}]}));
test('Dual setup preserves SMTP/Mongo/payOS/JWT and validates both providers before saving',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hs-dual-setup-')),envPath=path.join(dir,'.env'),original='SMTP_PASS=keep-mail\r\nMONGODB_URI=keep-db\r\nPAYOS_API_KEY=keep-payos\r\nJWT_SECRET=keep-jwt\r\nGROQ_API_KEY=keep-groq\r\n';await fs.writeFile(envPath,original);
 try{
  const input={HS_DUAL_GEMINI:'gemini-test-secret',HS_DUAL_GEMINI_MODEL:'gemini-test'};
  await assert.rejects(configure({envPath,input,fetch:async()=>new Response('{}',{status:401})}));assert.equal(await fs.readFile(envPath,'utf8'),original);
  await configure({envPath,input,fetch:async url=>reply(url.includes('googleapis'))});
  const saved=await fs.readFile(envPath,'utf8');for(const text of ['SMTP_PASS=keep-mail','MONGODB_URI=keep-db','PAYOS_API_KEY=keep-payos','JWT_SECRET=keep-jwt'])assert(saved.includes(text));
  assert(saved.includes('AI_SMART_ROUTING="true"'));assert(saved.includes('AI_FALLBACK_PROVIDERS="gemini"'));assert.equal((await fs.readdir(path.join(dir,'backups/ai'))).filter(x=>x.startsWith('.env-')).length,1);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
