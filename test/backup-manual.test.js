'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),jwt=require('jsonwebtoken');
const D=require('../src/domain'),B=require('../src/backup'),{Store}=require('../src/store'),{createApp}=require('../server');
const secret='backup-test-secret-with-at-least-thirty-two-characters',key=()=>D.id()+D.id().slice(0,8);
async function fixture(fn){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hs-backup-manual-')),store=new Store({mode:'file',file:path.join(dir,'state.json')});await store.init();
 await store.mutate(s=>{for(const role of ['admin','owner','reception','report','housekeeping','guest'])s.users.push({_id:D.id(),username:'backup-'+role,role,active:true,homestayIds:role==='guest'?[]:[s.homestays[0]._id],sessionVersion:0});});
 const users=(await store.read()).users,directory=path.join(dir,'copies'),env={BACKUP_KEY:secret,BACKUP_ENABLED:'true'};
 const server=createApp(store,secret,{aiEnv:{AI_PROVIDER:'disabled'},mailEnv:{},backupEnv:env,backupDir:directory}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=async(url,role='admin',method='GET',body)=>{const u=users.find(u=>u.username==='backup-'+role);const r=await fetch('http://127.0.0.1:'+server.address().port+url,{method,headers:{...(role?{Authorization:'Bearer '+jwt.sign({sub:u._id},secret)}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};};
 try{await fn({store,directory,dir,env,call});}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await store.close();await fs.rm(dir,{recursive:true,force:true});}
}
test('Manual backup: only admin with system permission, no anonymous or other roles',()=>fixture(async({call,directory})=>{
 assert.equal((await call('/api/admin/backups',null,'POST',{requestKey:key()})).status,401);
 for(const role of ['owner','reception','report','housekeeping','guest'])assert.equal((await call('/api/admin/backups',role,'POST',{requestKey:key()})).status,403);
 assert.equal((await call('/api/admin/backups','admin','POST',{})).status,400);await assert.rejects(fs.readdir(directory),{code:'ENOENT'});
}));
test('Manual backup: encrypted file, shared log and retry key produces exactly one backup',()=>fixture(async({call,store,directory,env})=>{
 const requestKey=key(),before=(await store.read()).bookings;
 const first=await call('/api/admin/backups','admin','POST',{requestKey});assert.equal(first.status,200);assert.equal(first.data.status,'SUCCESS');
 const again=await call('/api/admin/backups','admin','POST',{requestKey});assert.equal(again.data.name,first.data.name);assert.equal((await fs.readdir(directory)).length,1);
 const saved=B.decode(await fs.readFile(path.join(directory,first.data.name)),env);assert.deepEqual(saved.state.bookings,before);
 const s=await store.read();assert.equal(s.backupRuns.filter(r=>r.kind==='MANUAL').length,1);assert(!s.backupLease);assert(s.audit.some(r=>JSON.stringify(r).includes('MANUAL_BACKUP')));
 const status=await call('/api/admin/operations-status');assert.equal(status.data.backupRunning,false);assert(!JSON.stringify(status).includes(secret));
}));
test('Manual backup: two concurrent clicks cannot create duplicate copies',()=>fixture(async({call,directory})=>{
 const requestKey=key(),r=await Promise.all([call('/api/admin/backups','admin','POST',{requestKey}),call('/api/admin/backups','admin','POST',{requestKey})]);assert(r.every(r=>r.status===200));assert.equal((await fs.readdir(directory)).length,1);
}));
test('Manual backup: active persistent lease blocks another process and reports BUSY',()=>fixture(async({call,store,directory})=>{
 await store.mutate(s=>s.backupLease={id:'another-process',until:new Date(Date.now()+600000).toISOString()});
 const r=await call('/api/admin/backups','admin','POST',{requestKey:key()});assert.equal(r.status,409);assert.equal(r.code,'BACKUP_BUSY');await assert.rejects(fs.readdir(directory),{code:'ENOENT'});
}));
test('Manual backup: manual success does not suppress the daily automatic run',()=>fixture(async({store,call,directory,env})=>{
 assert.equal((await call('/api/admin/backups','admin','POST',{requestKey:key()})).status,200);
 const now=Date.parse(D.today()+'T02:05:00+07:00');const task=B.createScheduler(store,{env,directory,now:()=>now});await task.tick();await task.tick();
 assert.equal((await fs.readdir(directory)).length,2);const rows=(await store.read()).backupRuns;assert.equal(rows.filter(r=>r.kind==='AUTO'&&r.status==='SUCCESS').length,1);
}));
test('Manual backup: failures preserve good copies and release lock for later work',()=>fixture(async({store,directory,env})=>{
 await B.manual(store,{requestKey:key(),actor:'admin',directory,env});await assert.rejects(B.manual(store,{requestKey:key(),actor:'admin',directory,env:{BACKUP_KEY:'bad'}}),{code:'BACKUP_FAILED'});
 assert.equal((await fs.readdir(directory)).length,1);assert.equal((await store.read()).backupRuns.at(-1).status,'FAILED');assert(!(await store.read()).backupLease);
 assert.equal((await B.manual(store,{requestKey:key(),actor:'admin',directory,env})).status,'SUCCESS');
}));
