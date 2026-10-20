'use strict';
const {AsyncLocalStorage}=require('node:async_hooks'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const storage=new AsyncLocalStorage(),startedAt=new Date().toISOString();
const root=path.join(__dirname,'..'),files=['server.js','src/store.js','src/access.js','src/domain.js','public/js/assistant.js','public/js/admin.js','src/read-model.js',...fs.readdirSync(__dirname).filter(f=>f.startsWith('ai-')&&f.endsWith('.js')).sort().map(f=>'src/'+f)];
const revision=crypto.createHash('sha256');for(const file of files)revision.update(file).update(fs.readFileSync(path.join(root,file)));const build=revision.digest('hex').slice(0,16);
const runtime=()=>({build,startedAt});
function record(stage,ms,details={}){const t=storage.getStore();if(t)t.spans.push({stage,ms:Math.round(ms*100)/100,...details});}
async function time(stage,fn){const start=performance.now();try{return await fn();}finally{record(stage,performance.now()-start);}}
function deadline(){return storage.getStore()?.deadline;}
function readReserve(){const t=storage.getStore(),last=t?.spans.filter(s=>/^atlas_(?:public|read|identity)/.test(s.stage)).at(-1);return last?Math.min(6000,last.ms+250):250;}
function middleware(req,res,next){
 if(!req.path.startsWith('/api/'))return next();
 const chat=/^\/api\/(?:public\/)?ai\/chat$/.test(req.path);
 const requestId=crypto.randomBytes(12).toString('hex'),start=performance.now(),t={requestId,spans:[],deadline:chat?Date.now()+10000:undefined};
 storage.run(t,()=>{
  res.setHeader('X-Homestay-Build',build);if(chat){res.setHeader('X-Request-Id',requestId);res.setHeader('X-AI-Build',build);}
  const json=res.json.bind(res);res.json=value=>{record('backend_total',performance.now()-start);res.setHeader('Server-Timing',t.spans.map((s,i)=>s.stage.replace(/[^a-z0-9_]/gi,'_')+'_'+i+';dur='+s.ms).join(', '));if(chat&&process.env.AI_TIMING_LOG){const entry={at:new Date().toISOString(),requestId,requestKey:/^[a-f0-9]{32}$/.test(req.body?.requestKey||'')?req.body.requestKey:null,build,status:res.statusCode,spans:t.spans};fs.appendFile(process.env.AI_TIMING_LOG,JSON.stringify(entry)+'\n',()=>{});}return json(value);};next();
 });
}
module.exports={runtime,middleware,record,time,deadline,readReserve};
