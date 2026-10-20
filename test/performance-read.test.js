'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),jwt=require('jsonwebtoken');
const {Store}=require('../src/store'),{createApp}=require('../server'),{fixture}=require('./helpers/performance-fixture.cjs');
const secret='isolated-performance-fixture-only';
async function http(fn){const f=fixture(Store),server=createApp(f.store,secret).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=async(path,{role='admin',version=0,property,method='GET',body}={})=>{const r=await fetch('http://127.0.0.1:'+server.address().port+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({sub:role,version},secret),...(property?{'X-Homestay-Id':property}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,headers:r.headers,body:await r.json()};};
 try{await fn({...f,call});assert.equal(f.writes,0);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}}
test('Login reads only the exact account, handles case/email and never returns history/business data',async()=>{
 const f=fixture(Store);
 for(const key of [' ADMIN ','ADMIN@EXAMPLE.TEST']){const s=await f.store.readLogin(key);assert.deepEqual(s.users.map(u=>u._id),['admin']);assert.equal(s.bookings.length,0);assert.equal(s.aiConversations.length,0);assert(!JSON.stringify(s).includes('PRIVATE_HISTORY'));}
 const count=f.reads.length;assert.equal((await f.store.readLogin('')).users.length,0);assert.equal(f.reads.length,count);
 assert.equal((await f.store.readLogin('$admin')).users.length,0);assert(f.reads.every(r=>r.kind!=='full'));assert(f.reads.every(r=>!r.projection['data.aiConversations']));
});
test('Authentication is small and separate from conversation reads',async()=>{const f=fixture(Store),s=await f.store.readAuth('owner');assert.equal(s.users.length,1);assert.equal(s.users[0].role,'owner');assert.equal(s.aiConversations.length,0);assert.equal(s.bookings.length,0);assert(!f.reads[0].projection['data.aiConversations']);assert.equal((await f.store.readAuth('missing')).users.length,0);});

test('View projections preserve visible values and booking details without downloading retry snapshots',async()=>{
 const f=fixture(Store),b=f.doc.data.bookings[0];b.operationRequests=[{result:{private:'HUGE_RETRY_SNAPSHOT'}}];b.changeRequests=[{private:'INTERNAL'}];b.nightlyPrices=[{date:b.checkIn,lineTotal:123}];b.depositLedger=[{amount:42}];
 const overview=await f.store.readOperational({screen:'overview'});assert.equal(overview.rooms.length,f.doc.data.rooms.length);assert.equal(overview.bookings.length,f.doc.data.bookings.length);assert(!overview.roomTypes.some(t=>'description'in t));assert(!JSON.stringify(overview).includes('HUGE_RETRY_SNAPSHOT'));
 const reception=await f.store.readOperational({screen:'reception'});assert.deepEqual(reception.bookings[0].nightlyPrices,b.nightlyPrices);assert.deepEqual(reception.bookings[0].depositLedger,b.depositLedger);assert(!('operationRequests'in reception.bookings[0]));assert(!('changeRequests'in reception.bookings[0]));assert(!('description'in reception.roomTypes[0]));
 assert.equal(b.operationRequests.length,1);assert.equal(b.changeRequests.length,1); // source is never changed
 const revenue=await f.store.readOperational({profile:'revenue'});assert.equal(revenue.rooms.length,0);assert.equal(revenue.amenities.length,0);assert(!revenue.roomTypes.some(t=>'images'in t));assert(!revenue.bookings.some(b=>'nightlyPrices'in b));
 const invoice=await f.store.readOperational({profile:'metadata',extra:['invoices']});assert.equal(invoice.rooms.length,0);assert.equal(invoice.bookings.length,0);
});
test('Bootstrap preserves all arrays, filters property scope, omits unrelated account/audit/chat records',()=>http(async f=>{
 const r=await f.call('/api/admin/state?screen=overview',{role:'owner'});assert.equal(r.status,200);assert(r.body.data.rooms.length>0);assert(r.body.data.roomTypes.length>0);assert.equal(r.body.data._bootstrap.user.role,'owner');assert.equal(r.body.data._bootstrap.homestays.length,1);
 const text=JSON.stringify(r.body);for(const privateValue of ['PRIVATE_HISTORY','PRIVATE_RESET_HASH','PRIVATE_AUDIT','FOREIGN_CUSTOMER','password'])assert(!text.includes(privateValue));
 assert.equal(f.reads.length,2);assert(f.reads.every(r=>r.kind!=='full'));assert.match(r.headers.get('server-timing'),/atlas_auth/);assert.match(r.headers.get('server-timing'),/atlas_operational/);assert(r.headers.get('x-homestay-build'));
}));
test('Report bootstrap reads types, not bookings, accounts, histories or audit; users screen returns safe accounts',()=>http(async f=>{
 let r=await f.call('/api/admin/state?screen=owner');assert.equal(r.status,200);assert(r.body.data.roomTypes.length>0);assert.equal(r.body.data.bookings.length,0);assert(!f.reads.at(-1).projection['data.users']);assert(!f.reads.at(-1).projection['data.audit']);assert(!f.reads.at(-1).projection['data.bookings']);
 r=await f.call('/api/admin/state?screen=users');assert.equal(r.body.data.users.length,6);assert(r.body.data._bootstrap.permissions.admin.length>0);assert(!JSON.stringify(r.body).includes('password'));assert(!JSON.stringify(r.body).includes('sessionVersion'));
}));
test('Denied guests, stale sessions and foreign scope stop before business reads; revocations take effect next request',()=>http(async f=>{
 for(const args of [{role:'guest'},{role:'owner',property:'other-property'}]){const count=f.reads.length;assert.equal((await f.call('/api/admin/state?screen=overview',args)).status,403);assert.equal(f.reads.length,count+1);}
 f.doc.data.users.find(u=>u._id==='owner').permissions=[];
 assert.equal((await f.call('/api/reports',{role:'owner'})).status,403);
 f.doc.data.users.find(u=>u._id==='owner').sessionVersion++;
 assert.equal((await f.call('/api/auth/me',{role:'owner'})).status,401);
 f.doc.data.users.find(u=>u._id==='admin').active=false;
 assert.equal((await f.call('/api/auth/me')).status,401);
}));
test('Invoice and email requests each reuse one business read and retain 403 permissions',()=>http(async f=>{
 for(const path of ['/api/admin/invoices','/api/admin/email-logs']){const start=f.reads.length;assert.equal((await f.call(path)).status,200);assert.equal(f.reads.length-start,2);}
 assert.equal((await f.call('/api/admin/users',{role:'owner'})).status,403);
 assert.equal((await f.call('/api/admin/state?screen=unknown')).status,400);
}));
test('Actual login endpoint returns a usable token, no full-state read and a general error for invalid credentials',()=>http(async f=>{
 const r=await f.call('/api/auth/login',{method:'POST',body:{username:'ADMIN@EXAMPLE.TEST',password:'PerfQA12345'}});assert.equal(r.status,200);assert.equal(jwt.verify(r.body.data.token,secret).sub,'admin');assert.equal(f.reads.length,1);assert.equal((await f.call('/api/auth/login',{method:'POST',body:{username:'admin',password:'wrong'}})).status,401);
 assert.equal((await f.call('/api/auth/login',{method:'POST',body:{username:'',password:'PerfQA12345'}})).status,401);
 assert(f.reads.every(r=>r.kind!=='full'));
}));

test('Actual admin load function uses one bootstrap and honors current permissions and property selection',async()=>{
 const vm=require('node:vm'),fs=require('node:fs');const text=fs.readFileSync(require('node:path').join(__dirname,'../public/js/admin.js'),'utf8');
 const source=text.slice(text.indexOf(' async function load(){'),text.indexOf(' async function render(){'));
 const nodes=new Map(),storage=new Map();let calls=0,renders=0;
 const context={HS:{api:async()=>{calls++;return {_bootstrap:{user:{role:'owner',permissions:['reports.view']},homestays:[{_id:'h'}],permissions:{},selectedHomestayId:'h'},roomTypes:[],bookings:[]};},can:(u,p)=>u.permissions.includes(p),updateStaffNavigation(){}},document:{getElementById:id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,hidden:true,textContent:'',innerHTML:''});return nodes.get(id);}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},location:{href:''},page:'owner',pagePermissions:{owner:'reports.view'},names:{owner:'Owner'},content:{innerHTML:''},render:async()=>{renders++;}};
 vm.createContext(context);await vm.runInContext('let me,state,allProperties,allPermissions;'+source+';load()',context);
 assert.equal(calls,1);assert.equal(renders,1);assert.equal(storage.get('hs_homestay'),'h');assert.equal(nodes.get('refresh').disabled,false);
 context.HS.api=async()=>{calls++;return {_bootstrap:{user:{role:'owner',permissions:[]},homestays:[],permissions:{},selectedHomestayId:null}};};
 await vm.runInContext('load()',context);assert.equal(renders,1);assert.equal(nodes.get('page-error').hidden,false);
});

test('Server lists preserve search, counts, order and scope while loading full detail only on demand',()=>http(async f=>{
 const h=f.doc.data.homestays[0]._id,original=f.doc.data.bookings[0];
 f.doc.data.bookings=Array.from({length:27},(_,i)=>({...original,_id:'b'+i,bookingCode:'TEST'+String(i).padStart(4,'0'),homestayId:h,guestName:i===3?'Tên Riêng':'Guest '+i,email:'g'+i+'@example.test',status:'CONFIRMED',nightlyPrices:[{lineTotal:123}],depositLedger:[{amount:9}],settingsSnapshot:{payment:{depositPercent:40}},notes:'DETAIL_ONLY',operationRequests:[{result:'PRIVATE_RETRY'}]}));
 f.doc.data.bookings.push({...original,_id:'outside',bookingCode:'FOREIGN1',homestayId:'other-property',guestName:'FOREIGN_CUSTOMER'});
 let r=await f.call('/api/admin/state?screen=reception&view=list&page=2&pageSize=10',{role:'owner'});
 assert.equal(r.status,200);assert.equal(r.body.data.bookings.length,10);assert.equal(r.body.data.listPagination.total,27);assert.equal(r.body.data.listPagination.pages,3);assert.equal(r.body.data.bookings[0].bookingCode,'TEST0016');assert(!JSON.stringify(r.body).includes('DETAIL_ONLY'));assert(!JSON.stringify(r.body).includes('PRIVATE_RETRY'));assert(!JSON.stringify(r.body).includes('FOREIGN_CUSTOMER'));
 r=await f.call('/api/admin/state?screen=reception&view=list&search='+encodeURIComponent('tÊn rIêNg'),{role:'owner'});assert.equal(r.body.data.listPagination.total,1);assert.equal(r.body.data.bookings[0].bookingCode,'TEST0003');
 r=await f.call('/api/admin/state?screen=reception&view=list&page=99',{role:'owner'});assert.equal(r.body.data.listPagination.page,3);assert.equal(r.body.data.bookings.length,7);
 r=await f.call('/api/admin/bookings/TEST0003',{role:'owner'});assert.equal(r.status,200);assert.equal(r.body.data.notes,'DETAIL_ONLY');assert.equal(r.body.data.nightlyPrices[0].lineTotal,123);assert.equal(r.body.data.depositLedger[0].amount,9);assert.equal(r.body.data.settingsSnapshot.payment.depositPercent,40);assert(!JSON.stringify(r.body).includes('PRIVATE_RETRY'));
 assert.equal((await f.call('/api/admin/bookings/FOREIGN1',{role:'owner'})).status,404);assert.equal((await f.call('/api/admin/bookings/TEST0003',{role:'guest'})).status,403);
 f.doc.data.rooms[0].notes='ROOM_DETAIL_ONLY';f.doc.data.rooms[0].images=['/owned-image.jpg'];
 r=await f.call('/api/admin/state?screen=rooms&view=list',{role:'owner'});assert.equal(r.status,200);assert(!JSON.stringify(r.body).includes('ROOM_DETAIL_ONLY'));assert(!JSON.stringify(r.body).includes('/owned-image.jpg'));
 r=await f.call('/api/admin/rooms/'+f.doc.data.rooms[0]._id,{role:'owner'});assert.equal(r.status,200);assert.equal(r.body.data.room.notes,'ROOM_DETAIL_ONLY');assert.deepEqual(r.body.data.room.images,['/owned-image.jpg']);
 assert.equal((await f.call('/api/admin/state?screen=rooms&view=list&pageSize=100000')).status,400);
 const owner=f.doc.data.users.find(u=>u._id==='owner');owner.permissions=['bookings.view','rooms.view','types.view'];
 r=await f.call('/api/admin/state?screen=reception&view=list&search='+encodeURIComponent('Tên Riêng'),{role:'owner'});assert.equal(r.body.data.listPagination.total,0);assert(!JSON.stringify(r.body).includes('Tên Riêng'));
 f.doc.data.bookings[0].status='PENDING';f.doc.data.bookings[0].holdExpiresAt='2000-01-01T00:00:00Z';r=await f.call('/api/admin/state?screen=reception&view=list&search=EXPIRED',{role:'owner'});assert.equal(r.body.data.listPagination.total,1);assert.equal(r.body.data.bookings[0].status,'EXPIRED');assert.equal(f.doc.data.bookings[0].status,'PENDING');
}));
