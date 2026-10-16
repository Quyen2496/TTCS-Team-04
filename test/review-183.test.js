'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const jwt=require('jsonwebtoken');
const D=require('../src/domain'),A=require('../src/access'),S=require('../src/settlement');
const Deposit=require('../src/deposit'),Mail=require('../src/booking-mail');
const {Store}=require('../src/store'),{createApp}=require('../server');
const secret='review-183-isolated-test-secret';
const requestKey=()=>D.id()+D.id().slice(0,8);
async function fixture(fn){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'hs-review183-'));
 const store=new Store({mode:'file',file:path.join(directory,'state.json')});await store.init();
 await store.mutate(s=>{
  for(const role of ['admin','owner','reception','report','housekeeping','guest','other'])s.users.push({_id:D.id(),username:'review-'+role,role:role==='other'?'guest':role,email:role+'@example.test',active:true,sessionVersion:0,homestayIds:role==='guest'||role==='other'?[]:[s.homestays[0]._id]});
 });
 const state=await store.read(),user=role=>state.users.find(u=>u.username==='review-'+role);
 const app=createApp(store,secret,{aiEnv:{AI_PROVIDER:'disabled'},mailEnv:{}}),server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const call=async(url,method='GET',body,role='guest')=>{
  const response=await fetch('http://127.0.0.1:'+server.address().port+url,{method,headers:{'Content-Type':'application/json',...(role?{Authorization:'Bearer '+jwt.sign({sub:user(role)._id,version:0},secret)}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const text=await response.text();return {status:response.status,headers:response.headers,data:text?JSON.parse(text).data:undefined};
 };
 try{await fn({store,call,user,app});}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await store.close();await fs.rm(directory,{recursive:true,force:true});}
}
function booking(s,user,{code='REVIEW183',status='CONFIRMED',deposit=100000,future=5}={}){
 const checkIn=D.add(D.today(),future),checkOut=D.add(checkIn,1),q=D.quote(s,{roomTypeId:s.roomTypes[0]._id,checkIn,checkOut,guestCount:1});
 const b={...q,_id:D.id(),bookingCode:code,roomId:s.rooms[0]._id,status,guestUserId:user._id,email:user.email,guestName:'Khách kiểm thử',phone:'0912345678',depositAmount:deposit,createdAt:new Date().toISOString(),version:0};s.bookings.push(b);return b;
}
test('1.8.3 guest cannot list accounts or create admin through case/slash variants',()=>fixture(async({store,call})=>{
 const before=(await store.read()).users.length;
 for(const url of ['/api/admin/users','/API/ADMIN/users','/aPi/AdMiN/UsErS/']){
  assert.equal((await call(url)).status,403,url);
  assert.equal((await call(url,'POST',{username:'forgedadmin',email:'forged@example.test',role:'admin',password:'AuditOnly123',homestayIds:[]})).status,403,url);
 }
 assert.equal((await store.read()).users.length,before);
}));
test('1.8.3 staff grants apply to mixed case, trailing slashes and HEAD',()=>fixture(async({store,call,user})=>{
 await store.mutate(s=>{s.users.find(u=>u._id===user('admin')._id).permissions=['accounts.view'];});
 assert.equal((await call('/API/ADMIN/USERS/','GET',undefined,'admin')).status,200);
 assert.equal((await call('/API/ADMIN/USERS/','HEAD',undefined,'admin')).status,200);
 assert.equal((await call('/API/ADMIN/USERS/','POST',{username:'forged'},'admin')).status,403);
 assert.equal((await call('/api/admin/email-logs/','GET',undefined,'reception')).status,403);
 assert.equal((await call('/API/REPORTS/REVENUE/','GET',undefined,'housekeeping')).status,403);
 const csv=await call('/API/REPORTS/EXPORT.CSV/','GET',undefined,'reception');assert.equal(csv.status,403);
}));
test('1.8.3 authorized mixed-case administrative responses still mask identity and disable caching',()=>fixture(async({store,call,user})=>{
 await store.mutate(s=>{booking(s,user('guest')).idNumber='012345678901';});
 const response=await call('/API/ADMIN/STATE/','GET',undefined,'reception');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.ok(!JSON.stringify(response.data).includes('012345678901'));
 const identity=await call('/API/ADMIN/BOOKINGS/REVIEW183/IDENTITY/','GET',undefined,'admin');assert.equal(identity.status,403);
}));
test('1.8.3 every registered protected namespace has a policy; unknown authenticated paths fail closed',()=>fixture(async({app})=>{
 for(const layer of app._router.stack){if(!layer.route)continue;const route=layer.route;
  if(!/^\/api\/(admin|guest|reports|ai)(?:\/|$)/.test(route.path))continue;
  for(const method of Object.keys(route.methods))assert.notEqual(A.routePermission({path:route.path,method:method.toUpperCase()}),undefined,method+' '+route.path);
 }
 assert.equal(A.routePermission({path:'/api/unclassified',method:'GET'}),undefined);
 assert.equal(A.routePermission({path:'/api/admin/unclassified',method:'POST'}),undefined);
 assert.equal(A.routePermission({path:'/api/auth/me',method:'GET'}),null);
}));
test('1.8.3 revoke guest profile read and write independently on the current session',()=>fixture(async({store,call,user})=>{
 await store.mutate(s=>{s.users.find(u=>u._id===user('guest')._id).permissions=['profile.view'];});
 assert.equal((await call('/API/GUEST/PROFILE/')).status,200);
 assert.equal((await call('/api/guest/profile','PATCH',{fullName:'Must not save'})).status,403);
 assert.equal((await store.read()).users.find(u=>u._id===user('guest')._id).fullName,undefined);
 await store.mutate(s=>{s.users.find(u=>u._id===user('guest')._id).permissions=['profile.update'];});
 assert.equal((await call('/api/guest/profile')).status,403);
 assert.equal((await call('/API/GUEST/PROFILE/','PATCH',{fullName:'Allowed update',phone:'0912345678'})).status,200);
}));
test('1.8.3 revoke guest booking view, payment and cancellation without ending the session',()=>fixture(async({store,call,user})=>{
 await store.mutate(s=>{booking(s,user('guest'));s.users.find(u=>u._id===user('guest')._id).permissions=[];});
 for(const url of ['/api/guest/bookings','/API/GUEST/BOOKINGS/REVIEW183/PAYMENT/'])assert.equal((await call(url)).status,403);
 assert.equal((await call('/API/GUEST/BOOKINGS/REVIEW183/CANCEL/','POST',{})).status,403);
 assert.equal((await call('/api/guest/bookings/REVIEW183/guest-info','PATCH',{expectedVersion:0})).status,403);
 assert.equal((await store.read()).bookings[0].status,'CONFIRMED');
 assert.equal((await call('/api/auth/me')).status,200);
}));
test('1.8.3 guest cancellation keeps booking ownership checks and requires its own grant',()=>fixture(async({store,call,user})=>{
 await store.mutate(s=>{booking(s,user('guest'));s.users.find(u=>u._id===user('guest')._id).permissions=['own-bookings.view'];});
 assert.equal((await call('/api/guest/bookings')).status,200);
 assert.equal((await call('/api/guest/bookings/REVIEW183/cancel','POST',{})).status,403);
 assert.equal((await call('/api/guest/bookings/REVIEW183/cancel','POST',{},'other')).status,404);
}));
test('1.8.3 actual checkout is reflected in public lookup, guest bookings and payment summary',()=>fixture(async({store,call,user})=>{
 await store.mutate(s=>{const b=booking(s,user('guest'),{future:0,status:'CHECKED_IN',deposit:105000});b.actualCheckIn=new Date(Date.now()-60000).toISOString();s.rooms[0].status='OCCUPIED';});
 const actualCheckOut=new Date().toISOString(),preview=await call('/api/admin/bookings/REVIEW183/checkout-preview','POST',{actualCheckOut,earlyReason:'Khách về sớm'},'reception');assert.equal(preview.status,200);
 const p=preview.data,body={actualCheckOut,earlyReason:'Khách về sớm',receivedAmount:p.balance,method:'CASH',expectedVersion:p.version,requestKey:requestKey(),previewToken:p.previewToken};
 assert.equal((await call('/api/admin/bookings/REVIEW183/checkout','POST',body,'reception')).status,200);
 const look=(await call('/api/lookup','POST',{bookingCode:'REVIEW183',email:user('guest').email},null)).data;
 const guest=(await call('/api/guest/bookings')).data[0],pay=(await call('/api/payments/lookup','POST',{bookingCode:'REVIEW183',email:user('guest').email},null)).data;
 for(const result of [look,guest,pay]){assert.equal(result.status,'CLOSED');assert.equal(result.balanceDue,0);assert.equal(result.amountDue,0);assert.equal(result.totalPaid,p.total);assert.equal(result.finalPaymentAmount,p.balance);assert.equal(result.settlementTotal,p.total);assert.ok(!JSON.stringify(result).includes('closedBy'));}
 assert.equal((await store.read()).bookings[0].paymentLedger.length,1);
}));
test('1.8.3 settlement uses final total with extras and never counts the checkout receipt twice',()=>{
 const base={status:'CLOSED',totalAmount:700000,depositAmount:210000,settlement:{total:900000,paid:{_id:'receipt',amount:690000}},paymentLedger:[{_id:'receipt',amount:690000}]};
 assert.equal(Deposit.amounts(base).balanceDue,0);assert.equal(Deposit.amounts(base).totalPaid,900000);
 assert.equal(Deposit.amounts({...base,paymentLedger:[]}).finalPaymentAmount,690000);
 assert.equal(Deposit.amounts({...base,paymentLedger:[...base.paymentLedger,...base.paymentLedger]}).totalPaid,900000);
 assert.equal(Deposit.amounts({...base,settlement:{total:1000000}}).balanceDue,100000);
 assert.equal(Deposit.amounts({...base,depositAmount:1000000,paymentLedger:[],settlement:{total:900000}}).balanceDue,0);
});
test('1.8.3 original deposit calculations stay intact; completed legacy bookings do not invent payments',()=>{
 const base={status:'CONFIRMED',totalAmount:700000,depositAmount:100000,settingsSnapshot:{payment:{depositPercent:50}}};
 const value=Deposit.amounts(base);assert.equal(value.requiredDeposit,350000);assert.equal(value.amountDue,250000);assert.equal(value.balanceDue,600000);assert.equal(value.settlementTotal,null);
 assert.equal(Deposit.amounts({...base,status:'COMPLETED'}).balanceDue,600000);
 for(const status of ['CANCELLED','EXPIRED']){assert.equal(Deposit.amounts({...base,status}).balanceDue,0);assert.equal(Deposit.amounts({...base,status}).amountDue,0);}
});
test('1.8.3 guest cancel records refund policy and reason before queuing email; repeat does not duplicate',()=>fixture(async({store,call,user})=>{
 await store.mutate(s=>{booking(s,user('guest'));});
 assert.equal((await call('/api/guest/bookings/REVIEW183/cancel','POST',{reason:'Khách thay đổi kế hoạch'})).status,200);
 assert.equal((await call('/api/guest/bookings/REVIEW183/cancel','POST',{})).status,200);
 const s=await store.read(),b=s.bookings[0],jobs=s.emailJobs.filter(j=>j.type==='CANCELLED');assert.equal(b.refundPercent,100);assert.equal(b.refundAmount,100000);assert.equal(b.cancelReason,'Khách thay đổi kế hoạch');assert.equal(b.cancelledBy,user('guest').username);assert.ok(b.cancelledAt);assert.equal(b.events.filter(e=>e.type==='BookingCancelled').length,1);assert.equal(jobs.length,1);
 const mail=Mail.message(jobs[0],{APP_URL:'https://example.test'});assert.match(mail.text,/Tỷ lệ hoàn cọc: 100%/);assert.match(mail.text,/100\.000 VND/);assert.match(mail.text,/Khách thay đổi kế hoạch/);assert.ok(!mail.text.includes('undefined'));
}));
test('1.8.3 cancellation uses snapshotted 50% and 0% policies, including zero deposit',()=>fixture(async({store,call,user})=>{
 for(const [index,percent,deposit] of [[0,50,100000],[1,0,100000],[2,100,0]]){
  const code='REFUND18'+index;await store.mutate(s=>{const b=booking({...s,bookings:s.bookings},user('guest'),{code,deposit,future:5+index});b.roomId=s.rooms[index]._id;b.settingsSnapshot.cancellationRules=[{hoursBefore:0,refundPercent:percent}];s.settings.cancellationRules=[{hoursBefore:0,refundPercent:100-percent}];});
  assert.equal((await call('/api/guest/bookings/'+code+'/cancel','POST',{})).status,200);
  const s=await store.read(),b=s.bookings.find(b=>b.bookingCode===code),job=s.emailJobs.find(j=>j.bookingCode===code&&j.type==='CANCELLED');assert.equal(b.refundPercent,percent);assert.equal(b.refundAmount,deposit*percent/100);assert.match(Mail.message(job).text,new RegExp('Tỷ lệ hoàn cọc: '+percent+'%'));
 }
}));
test('1.8.3 legacy queued cancellation emails preserve money without undefined reason or contradictory 0%',()=>{
 const message=Mail.message({_id:'legacy',type:'CANCELLED',to:'audit@example.test',snapshot:{bookingCode:'LEGACY18',refundPercent:0,refundAmount:100000}},{APP_URL:'https://example.test'});
 assert.match(message.text,/100\.000 VND/);assert.ok(!message.text.includes('Lý do huỷ: undefined'));assert.ok(!message.text.includes('Tỷ lệ hoàn cọc: 0%'));assert.match(message.text,/theo chính sách đã chốt/);
});
