'use strict';
// Read-only HTTP measurements. Password and token remain in memory only.
const fs=require('node:fs/promises'),path=require('node:path'),readline=require('node:readline/promises'),{Writable}=require('node:stream');
const D=require('../src/domain');
const arg=name=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
async function credentials(){
 if(!process.stdin.isTTY)throw Error('Run this script in an interactive terminal.');
 let muted=false;const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk);done();}});
 const rl=readline.createInterface({input:process.stdin,output,terminal:true});
 try{const username=await rl.question('Tai khoan/email: ');process.stdout.write('Mat khau (khong hien): ');muted=true;const password=await rl.question('');muted=false;process.stdout.write('\n');return {username,password};}finally{muted=false;rl.close();}
}
async function main(){
 const url=new URL(arg('base')||'http://127.0.0.1:3001');if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search)throw Error('Invalid base URL');
 const base=url.origin;let token;const observations=[];
 async function call(endpoint,{body,record=true}={}){
  const start=performance.now();const r=await fetch(base+endpoint,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});
  const text=await r.text();let response;try{response=JSON.parse(text);}catch{response={};}
  if(record)observations.push({endpoint,status:r.status,ms:Math.round(performance.now()-start),responseBytes:Buffer.byteLength(text),serverTiming:r.headers.get('server-timing'),build:r.headers.get('x-homestay-build')||r.headers.get('x-ai-build')});
  if(!r.ok||!response.success)throw Error('HTTP '+r.status+' '+endpoint);
  return {data:response.data,patched:!!r.headers.get('x-homestay-build')};
 }
 const health=await call('/api/health');
 for(const endpoint of ['/api/public/settings','/api/public/homestays'])await call(endpoint);
 if(!process.argv.includes('--public-only')){
  const input=await credentials();let me;
  for(let i=0;i<3;i++){const login=await call('/api/auth/login',{body:input});token=login.data.token;me=login.data.user;}
  input.password='';
  const can=p=>me.permissions?.includes(p);
  async function bootstrap(screen){
   if(health.patched)return call('/api/admin/state?screen='+screen);
   await call('/api/auth/me');await call('/api/admin/homestays');if(can('accounts.view'))await call('/api/admin/permissions');return call('/api/admin/state');
  }
  if(me.role==='guest'){await call('/api/guest/profile');await call('/api/guest/bookings');}
  else for(const [screen,permission,endpoint]of [['overview',null,null],['owner','reports.view','/api/reports/revenue?from='+D.today().slice(0,7)+'-01&to='+D.today()],['invoices','invoices.view','/api/admin/invoices'],['emails','email.view','/api/admin/email-logs']]){
   if(permission&&!can(permission))continue;
   for(let i=0;i<3;i++){const start=performance.now(),offset=observations.length;await bootstrap(screen);if(endpoint)await call(endpoint);observations.push({screen,httpRequests:observations.length-offset,totalMs:Math.round(performance.now()-start)});}
  }
 }
 const file=path.resolve(arg('output')||path.join(__dirname,'../docs/performance','http-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'));
 const result={at:new Date().toISOString(),base,patched:health.patched,runtime:health.data.runtime,observations};await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(result,null,2));
 console.table(observations.map(({endpoint,screen,status,ms,totalMs,httpRequests})=>({request:screen||endpoint,status:status||'',ms:totalMs??ms,httpRequests:httpRequests||1})));
 console.log('Report: '+file);console.log('No password, token or business response body was saved.');
}
main().catch(()=>{console.error('Measurement failed. Check the running server, account permissions and URL. No credentials were written.');process.exitCode=1;});
