'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),jwt=require('jsonwebtoken');
const A=require('../src/access'),D=require('../src/domain'),S=require('../src/settlement'),{Store}=require('../src/store'),{createApp}=require('../server');
const legacy=A.defaults.reception.filter(p=>!p.startsWith('invoices.')&&p!=='reports.revenue');
test('1.8.1 legacy reception gains invoices once and later revocation survives restart',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hs-access181-')),file=path.join(dir,'state.json'),s=D.seedData();
 s.users.push({_id:D.id(),username:'legacy',role:'reception',permissions:[...legacy],homestayIds:[s.homestays[0]._id]},
  {_id:D.id(),username:'limited',role:'reception',permissions:['bookings.view','customers.view'],homestayIds:[s.homestays[0]._id]});
 delete s.receptionInvoiceAccessVersion;await fs.writeFile(file,JSON.stringify(s));let store=new Store({mode:'file',file});
 try{
  await store.init();let updated=await store.read();const u=updated.users.find(u=>u.username==='legacy');
  assert.ok(A.can(u,'invoices.create'));assert.ok(A.can(u,'invoices.view'));assert.deepEqual(u.homestayIds,[s.homestays[0]._id]);
  assert.deepEqual(updated.users.find(u=>u.username==='limited').permissions,['bookings.view','customers.view']);
  assert.ok(updated.audit.some(x=>x.action==='UPGRADE_RECEPTION_INVOICE_ACCESS'));
  await store.mutate(s=>{s.users.find(u=>u.username==='legacy').permissions=[...legacy];});await store.close();
  store=new Store({mode:'file',file});await store.init();updated=await store.read();assert.equal(A.can(updated.users.find(u=>u.username==='legacy'),'invoices.view'),false);
 }finally{await store.close();await fs.rm(dir,{recursive:true,force:true});}
});
test('1.8.1 reception invoices enforce scope, current grants and completed settlement',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hs-invoice181-')),store=new Store({mode:'file',file:path.join(dir,'s.json')});await store.init();
 let first,other,user;
 await store.mutate(s=>{
  first=s.homestays[0]._id;other=D.id();s.homestays.push({_id:other,name:'Other',active:true});
  user={_id:D.id(),username:'reception181',role:'reception',active:true,homestayIds:[first]};s.users.push(user);
  for(const [n,homestayId] of [[1,first],[2,other]])s.bookings.push({_id:D.id(),bookingCode:'FIX1810'+n,homestayId,status:'CLOSED',guestName:'Khách thử',settlement:{closedAt:new Date().toISOString(),total:500000,lines:[]}});
  s.bookings.push({_id:D.id(),bookingCode:'LEGACY18',homestayId:first,status:'COMPLETED'});
 });
 const secret='hotfix-qa-secret-181',server=createApp(store,secret,{invoicePdf:async()=>Buffer.from('%PDF-1.4\nQA')}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const token=jwt.sign({sub:user._id},secret),call=(url,method='GET',body)=>fetch('http://127.0.0.1:'+server.address().port+url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 try{
  const result=await call('/api/admin/bookings/FIX18101/invoice','POST',{});assert.equal(result.status,200);const invoice=(await result.json()).data;
  assert.equal((await call('/api/admin/invoices')).status,200);assert.equal((await call('/api/admin/invoices/'+invoice._id+'/pdf')).status,200);
  assert.equal((await call('/api/admin/bookings/FIX18102/invoice','POST',{})).status,404);
  assert.equal((await call('/api/admin/bookings/LEGACY18/invoice','POST',{})).status,409);
  await store.mutate(s=>s.users.find(u=>u._id===user._id).permissions=['homestays.view','bookings.view','customers.view']);
  assert.equal((await call('/api/admin/bookings/FIX18101/invoice','POST',{})).status,403);assert.equal((await call('/api/admin/invoices/'+invoice._id+'/pdf')).status,403);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await store.close();await fs.rm(dir,{recursive:true,force:true});}
});
