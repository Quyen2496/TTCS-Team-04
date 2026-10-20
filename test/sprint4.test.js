'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),jwt=require('jsonwebtoken');
const D=require('../src/domain'),S=require('../src/settlement'),R=require('../src/business-reports'),M=require('../src/booking-mail'),B=require('../src/backup'),I=require('../src/invoice-pdf'),{Store}=require('../src/store'),{createApp}=require('../server');
const key=()=>D.id()+D.id().slice(0,8),secret='sprint4-qa-isolated-secret-at-least-32-chars';
function makeBooking(s,{code='S4QA0001',checkIn='2026-10-10',checkOut='2026-10-12',status='CHECKED_IN',email='qa@example.test',roomId}={}){
 const t=s.roomTypes[0],b={_id:D.id(),bookingCode:code,homestayId:s.homestays[0]._id,homestayName:s.homestays[0].name,roomTypeId:t._id,roomTypeName:t.name,roomId:roomId||s.rooms[0]._id,status,guestName:'Khách nghiệm thu',email,phone:'0912345678',idNumber:'012345678901',guestCount:1,checkIn,checkOut,numberOfNights:(Date.parse(checkOut)-Date.parse(checkIn))/86400000,roomTotal:700000,extraGuestTotal:0,totalAmount:700000,depositAmount:210000,settingsSnapshot:structuredClone(s.settings),nightlyPrices:[{night:checkIn,basePrice:350000,surchargeAmount:0},{night:D.add(checkIn,1),basePrice:350000,surchargeAmount:0}],version:0,actualCheckIn:checkIn+'T07:00:00.000Z'};s.bookings.push(b);s.rooms.find(r=>r._id===b.roomId).status='OCCUPIED';S.upgrade(s);return b;
}
function close(s,b,extra={}){const p=S.preview(s,b.bookingCode,{actualCheckOut:b.checkOut+'T05:00:00.000Z',...extra}),body={actualCheckOut:p.actualCheckOut,earlyReason:p.earlyReason,expectedVersion:p.version,requestKey:key(),method:'CASH',receivedAmount:p.balance,...extra};return S.checkout(s,b.bookingCode,body,{purpose:'checkout',bookingCode:b.bookingCode,digest:S.hash(p)},'QA');}
async function fixture(fn){if(process.env.SPRINT4_MONGODB_URI&&!/SPRINT4_QA/.test(new (require('mongoose').mongo.MongoClient)(process.env.SPRINT4_MONGODB_URI).options.dbName))throw Error('Chỉ test trên database SPRINT4_QA riêng.');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hs-s4-')),store=new Store({mode:process.env.SPRINT4_MONGODB_URI?'mongo':'file',uri:process.env.SPRINT4_MONGODB_URI,file:path.join(dir,'state.json')});await store.init();if(store.mongoose){if(!/SPRINT4_QA/.test(store.mongoose.connection.name))throw Error('Mongo test cần DB SPRINT4_QA riêng.');await store.invoices.deleteMany({});}await store.mutate(s=>{Object.assign(s,D.seedData(),{invoices:[],invoiceCounters:{},emailJobs:[],schedulerRuns:[],mailWorkerRuns:[],backupRuns:[]});for(const role of ['admin','owner','reception','housekeeping','report','guest'])s.users.push({_id:D.id(),username:role,role,active:true,sessionVersion:0,homestayIds:role==='guest'?[]:[s.homestays[0]._id]});});
 const state=await store.read(),token=role=>jwt.sign({sub:state.users.find(u=>u.role===role)._id},secret),server=createApp(store,secret).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const call=async(url,method='GET',body,role='admin',headers={})=>{const response=await fetch('http://127.0.0.1:'+server.address().port+url,{method,headers:{'Content-Type':'application/json',...(role?{Authorization:'Bearer '+token(role)}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});const type=response.headers.get('content-type')||'';return {status:response.status,data:type.includes('application/json')?await response.json():Buffer.from(await response.arrayBuffer()),headers:response.headers};};
 try{await fn({store,dir,call,token,state});}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await store.close();await fs.rm(dir,{recursive:true,force:true});}}
test('S4-01 12:00/12:01/13:00/18:00/18:01 và qua ngày: chỉ một loại phí muộn',()=>{
 const s=D.seedData(),b=makeBooking(s);const rows=[['12:00',0,0],['12:01',50000,0],['13:00',50000,0],['18:00',300000,0],['18:01',350000,1]];
 for(const [time,amount,nights] of rows){const p=S.preview(s,b.bookingCode,{actualCheckOut:b.checkOut+'T'+time+':00+07:00'});assert.equal(p.lateAmount,amount,time);assert.equal(p.lateNights,nights);assert.equal(p.total,700000+amount);assert.equal(p.balance,490000+amount);}
 assert.equal(S.preview(s,b.bookingCode,{actualCheckOut:'2026-10-13T18:01:00+07:00'}).lateAmount,700000);assert.equal(b.status,'CHECKED_IN');
});
test('S4-01 early checkout keeps booked nights; requires reason, method, exact paid amount, and version',()=>{
 const s=D.seedData(),b=makeBooking(s),input={actualCheckOut:'2026-10-11T12:00:00+07:00'};assert.throws(()=>close(s,b,input),/lý do/);assert.equal(b.status,'CHECKED_IN');
 const out=close(s,b,{...input,earlyReason:'Khách về sớm'});assert.equal(out.settlement.total,700000);assert.equal(out.settlement.numberOfNights,2);assert.equal(b.status,'CLOSED');assert.equal(s.rooms[0].status,'DIRTY_VACANT');
});
test('S4-02 extra bed and person periods, override reasons, capacity by night and void ledger',()=>{
 const s=D.seedData(),b=makeBooking(s);b.capacitySnapshot=2;const payload={requestKey:key(),expectedVersion:0,type:'EXTRA_BED',quantity:1,unitPrice:100000,from:b.checkIn,to:b.checkOut,note:'Giường phụ'};
 const first=S.surcharge(s,b.bookingCode,payload,'QA');assert.equal(first.item.amount,200000);assert.equal(S.surcharge(s,b.bookingCode,payload,'QA').item._id,first.item._id);assert.equal(b.surcharges.length,1);
 const add=(from,to,other={})=>S.surcharge(s,b.bookingCode,{...payload,type:'EXTRA_PERSON',requestKey:key(),expectedVersion:b.version,from,to,...other},'QA');
 add(b.checkIn,D.add(b.checkIn,1));add(D.add(b.checkIn,1),b.checkOut);assert.throws(()=>add(b.checkIn,b.checkOut),/Vượt sức chứa/);assert.throws(()=>add(b.checkIn,b.checkOut,{unitPrice:1}),/lý do/);
 assert.equal(S.preview(s,b.bookingCode,{actualCheckOut:b.checkOut+'T05:00:00.000Z'}).total,1100000);S.voidSurcharge(s,b.bookingCode,{requestKey:key(),expectedVersion:b.version,surchargeId:first.item._id,reason:'Không dùng giường'},'QA');assert.equal(S.preview(s,b.bookingCode,{actualCheckOut:b.checkOut+'T05:00:00.000Z'}).total,900000);assert.ok(b.surcharges[0].voidedAt);
});
test('S4-01 API preview token, tamper, repeated checkout and closed surcharge rejection',()=>fixture(async({store,call})=>{
 await store.mutate(s=>makeBooking(s));const url='/api/admin/bookings/S4QA0001',preview=(await call(url+'/checkout-preview','POST',{actualCheckOut:'2026-10-12T12:01:00+07:00'})).data.data;
 const body={requestKey:key(),expectedVersion:preview.version,actualCheckOut:preview.actualCheckOut,earlyReason:'',method:'TRANSFER',reference:'S4-BANK-01',receivedAmount:preview.balance,previewToken:preview.previewToken};
 assert.equal((await call(url+'/checkout','POST',{...body,actualCheckOut:'2026-10-12T18:01:00+07:00'})).status,409);
 assert.equal((await call(url+'/checkout','POST',{...body,receivedAmount:1})).status,400);assert.equal((await call(url+'/checkout','POST',{...body,method:''})).status,400);
 const results=await Promise.all([call(url+'/checkout','POST',body),call(url+'/checkout','POST',body)]);assert.ok(results.every(r=>r.status===200));const s=await store.read();assert.equal(s.bookings[0].paymentLedger.length,1);assert.equal(s.bookings[0].settlement.total,750000);assert.equal(s.rooms[0].status,'DIRTY_VACANT');assert.equal(require('../src/store').roomNights(s).length,0);
 assert.equal((await call(url+'/surcharges','POST',{requestKey:key(),expectedVersion:1,type:'EXTRA_BED',quantity:1,unitPrice:100000,from:'2026-10-10',to:'2026-10-12'})).status,409);
}));
test('S4-03 concurrent invoice requests stable and contiguous; PDF A4 and Vietnamese money words',()=>fixture(async({store,call,dir})=>{
 await store.mutate(s=>{for(let n=0;n<3;n++){const b=makeBooking(s,{code:'S4IN000'+n,roomId:s.rooms[n]._id});close(s,b);}});
 const calls=await Promise.all(Array.from({length:15},(_,n)=>call('/api/admin/bookings/S4IN000'+n%3+'/invoice','POST',{})));assert.ok(calls.every(r=>r.status===200));
 const s=await store.read();assert.equal(s.invoices.length,3);assert.deepEqual(s.invoices.map(i=>i.sequence).sort(),[1,2,3]);
 const invoice=s.invoices[0],result=await call('/api/admin/invoices/'+invoice._id+'/pdf');assert.equal(result.status,200);assert.equal(result.data.subarray(0,5).toString(),'%PDF-');await fs.writeFile(path.join(dir,'invoice.pdf'),result.data);
 assert.equal(I.moneyInWords(0),'Không đồng');assert.equal(I.moneyInWords(1005000),'Một triệu không trăm lẻ năm nghìn đồng');
 const original=JSON.stringify(invoice.settlement);await store.mutate(s=>s.roomTypes[0].weekdayPrice=999999);assert.equal(JSON.stringify((await store.read()).invoices[0].settlement),original);
 const repeat=await call('/api/admin/bookings/'+invoice.bookingCode+'/invoice','POST',{});assert.equal(repeat.data.data.number,invoice.number);
}));
test('S4 invoice counters rollback when mutation fails and year sequences restart',()=>fixture(async({store})=>{
 await store.mutate(s=>{const b=makeBooking(s);close(s,b);});await assert.rejects(store.mutate(s=>{S.issueInvoice(s,'S4QA0001','QA');throw Error('Giả lỗi DB');}));let s=await store.read();assert.equal(s.invoices.length,0);assert.deepEqual(s.invoiceCounters,{});
 await store.mutate(s=>{const i=S.issueInvoice(s,'S4QA0001','QA');assert.equal(i.sequence,1);const b=makeBooking(s,{code:'NEWYEAR',roomId:s.rooms[1]._id});close(s,b);b.settlement.closedAt='2027-01-01T00:00:00Z';assert.equal(S.issueInvoice(s,'NEWYEAR','QA').number,'2027/000001');});
}));
test('S4-04 outbox committed once, rollback no job, SMTP does not run inside booking mutation',()=>fixture(async({store})=>{
 let sent=0;await assert.rejects(store.mutate(s=>{makeBooking(s,{status:'PENDING'});throw Error('rollback');}));assert.equal((await store.read()).emailJobs.length,0);
 await store.mutate(s=>makeBooking(s,{status:'PENDING'}));let s=await store.read();assert.equal(s.emailJobs.length,1);await store.mutate(()=>{});assert.equal((await store.read()).emailJobs.length,1);
 const worker=M.createWorker(store,{send:async m=>{assert.match(m.text,/Chờ xác nhận|chờ homestay xác nhận/);assert.match(m.text,/Mã booking/);assert.match(m.text,/Giờ|lúc 14:00/);sent++;return {accepted:[m.to]};}});await worker.tick();assert.equal(sent,1);
 await store.mutate(s=>s.bookings[0].status='CONFIRMED');await Promise.all([M.createWorker(store,{send:async()=>{sent++;return {accepted:['qa']};}}).tick(),M.createWorker(store,{send:async()=>{sent++;return {accepted:['qa']};}}).tick()]);assert.equal(sent,2);assert.equal((await store.read()).mailWorkerRuns.reduce((n,x)=>n+x.sent,0),2);
}));
test('S4-04 retry exactly 5 minutes and 3 retries, no send before due, timeout uncertain',()=>fixture(async({store})=>{
 await store.mutate(s=>makeBooking(s,{status:'CONFIRMED'}));let now=Date.now(),count=0;const worker=M.createWorker(store,{now:()=>now,send:async()=>{count++;throw Object.assign(Error('secret must not leak'),{code:'EAUTH'});}});
 await worker.tick();for(let i=0;i<3;i++){now+=299999;await worker.tick();assert.equal(count,i+1);now++;await worker.tick();}assert.equal(count,4);assert.equal((await store.read()).emailJobs[0].status,'FAILED');assert.ok(!JSON.stringify((await store.read()).emailJobs).includes('secret must not leak'));
 await store.mutate(s=>makeBooking(s,{code:'TIMEOUT',roomId:s.rooms[1]._id,status:'CONFIRMED'}));const unknown=M.createWorker(store,{send:async()=>{throw Object.assign(Error('timeout'),{code:'ETIMEDOUT',command:'DATA'});}});await unknown.tick();const job=(await store.read()).emailJobs.find(j=>j.bookingCode==='TIMEOUT');assert.equal(job.status,'UNCERTAIN');await unknown.tick();assert.equal((await store.read()).emailJobs.find(j=>j._id===job._id).attempts.length,1);
}));
test('S4-05 08:59/09:00 VN reminder once, no cancelled mail, cancellation snapshot',()=>{
 const s=D.seedData(),b=makeBooking(s,{status:'CONFIRMED',checkIn:'2026-10-16',checkOut:'2026-10-18'});s.emailJobs=[];s.schedulerRuns=[];
 M.schedule(s,Date.parse('2026-10-15T08:59:00+07:00'));assert.equal(s.emailJobs.length,0);M.schedule(s,Date.parse('2026-10-15T09:00:00+07:00'));assert.equal(s.emailJobs.length,1);M.schedule(s,Date.parse('2026-10-15T09:01:00+07:00'));assert.equal(s.emailJobs.length,1);
 b.status='CANCELLED';b.cancelReason='Khách đổi kế hoạch';b.refundPercent=50;b.refundAmount=105000;M.enqueue(s,b,'CANCELLED');b.refundAmount=0;const job=s.emailJobs.find(j=>j.type==='CANCELLED'),mail=M.message(job);assert.match(mail.text,/105\.000 VND/);assert.match(mail.text,/50%/);assert.match(mail.text,/không xác nhận đã chuyển tiền hoàn/);
});
test('S4-06 occupancy historical maintenance, weighted totals, half-open dates, N/A and CSV formula',()=>{
 const s=D.seedData();s.rooms=s.rooms.slice(0,2);s.roomTypes=s.roomTypes.slice(0,1);makeBooking(s,{status:'CONFIRMED'});s.rooms[1].incidents=[{startDate:'2026-10-10',endDate:'2026-10-11'}];
 const r=R.occupancy(s,{from:'2026-10-10',to:'2026-10-12'});assert.equal(r.sold,2);assert.equal(r.available,5);assert.equal(r.percent,40);assert.equal(r.byDay[2].sold,0);assert.equal(r.byType[0].sold,2);assert.throws(()=>R.occupancy(s,{from:'2026-01-01',to:'2027-01-02'}));
 s.rooms.forEach(r=>r.incidents=[{startDate:'2026-10-10',endDate:'2026-10-13'}]);assert.equal(R.occupancy(s,{from:'2026-10-10'}).percent,null);assert.ok(R.csv([['=cmd','Tiếng Việt']]).startsWith('\uFEFF'));assert.match(R.csv([['=cmd']]),/'=cmd/);
});
test('S4-07 revenue settled only, no deposit double count, VN date, equal previous period',()=>{
 const s=D.seedData(),b=makeBooking(s);close(s,b);makeBooking(s,{code:'OPEN',status:'CONFIRMED',roomId:s.rooms[1]._id});b.actualCheckOut='2026-10-11T18:30:00.000Z';
 const r=R.revenue(s,{from:'2026-10-12',to:'2026-10-12'});assert.equal(r.total,700000);assert.equal(r.roomAmount,700000);assert.equal(r.bookingCount,1);assert.equal(r.adr,350000);assert.equal(r.previous.from,'2026-10-11');assert.equal(r.changePercent,null);assert.equal(r.byDay[0].bookingCount,1);
});
test('S4-08 >=20 forbidden cases on API, downloads, PII and property scope',()=>fixture(async({store,call})=>{
 await store.mutate(s=>{const b=makeBooking(s);close(s,b);S.issueInvoice(s,b.bookingCode,'QA');});const invoice=(await store.read()).invoices[0];
 let denied=0;for(const role of ['guest','housekeeping','report'])for(const [url,method] of [['/api/admin/email-logs','GET'],['/api/admin/operations-status','GET'],['/api/admin/security-matrix','GET'],['/api/admin/invoices','GET'],['/api/admin/invoices/'+invoice._id+'/pdf','GET'],['/api/admin/bookings/S4QA0001/invoice','POST'],['/api/admin/bookings/S4QA0001/checkout-preview','POST']]){const r=await call(url,method,method==='POST'?{}:undefined,role);assert.equal(r.status,403,url+' '+role);assert.equal(r.data.data,undefined);denied++;}assert.equal(denied,21);
 for(const url of ['/api/admin/email-logs','/api/admin/invoices/'+invoice._id+'/pdf','/api/reports/revenue','/api/reports/occupancy.csv'])assert.equal((await call(url,'GET',undefined,null)).status,401);
 const state=await call('/api/admin/state'),customers=await call('/api/admin/customers');assert.ok(!JSON.stringify(state.data).includes('012345678901'));assert.ok(!JSON.stringify(customers.data).includes('012345678901'));assert.equal((await call('/api/admin/bookings/S4QA0001/identity')).status,403);
 assert.equal((await call('/api/admin/bookings/S4QA0001/identity','GET',undefined,'owner')).data.data.idNumber,'012345678901');assert.ok((await store.read()).audit.some(a=>a.action==='VIEW_GUEST_IDENTITY'));
 assert.equal((await call('/api/reports/revenue?from=2026-01-01','GET',undefined,'reception')).status,403);assert.equal((await call('/api/reports/revenue','GET',undefined,'reception')).status,200);
 await store.mutate(s=>{const h={_id:D.id(),name:'Cơ sở khác',active:true};s.homestays.push(h);s.bookings[0].homestayId=h._id;s.invoices[0].homestayId=h._id;});assert.equal((await call('/api/admin/invoices/'+invoice._id+'/pdf','GET',undefined,'owner')).status,404);
}));
test('S4-09 dataset exact 4/20/30 three months and deterministic reset counts',()=>{
 const {createDemo}=require('../src/demo-data');for(let i=0;i<2;i++){const s=createDemo('2026-10-15');assert.equal(s.roomTypes.length,4);assert.equal(s.rooms.length,20);assert.equal(s.bookings.length,30);assert.equal(new Set(s.bookings.map(b=>b.checkIn.slice(0,7))).size,3);assert.equal(new Set(s.bookings.map(b=>b.bookingCode)).size,30);require('../src/store').roomNights(s);assert.ok(s.users.every(u=>u.password.startsWith('$2')));}
});
test('S4-10 backup encrypted, retains 7 good copies; restore QA counts/financial totals; corrupt fails',()=>fixture(async({store,dir})=>{
 const env={BACKUP_KEY:secret},directory=path.join(dir,'backup');await store.mutate(s=>{const b=makeBooking(s);close(s,b);S.issueInvoice(s,b.bookingCode,'QA');});
 let last;for(let n=0;n<9;n++)last=await B.backup(store,{directory,env,now:Date.parse('2026-10-15T02:00:00+07:00')+n*86400000});const names=await fs.readdir(directory);assert.equal(names.length,7);const bytes=await fs.readFile(path.join(directory,last.name));assert.ok(!bytes.includes(Buffer.from('012345678901')));assert.throws(()=>B.decode(bytes,{BACKUP_KEY:'wrong-key-at-least-thirty-two-characters'}));
 const target=path.join(dir,'HOMESTAY_QA','homestay.json'),restored=await B.restoreToQA(path.join(directory,last.name),target,{env});assert.equal(restored.summary.bookings,1);assert.equal(restored.summary.settled,700000);assert.equal(restored.summary.invoices,1);assert.ok(restored.durationMs>=0);await assert.rejects(B.restoreToQA(path.join(directory,last.name),path.join(dir,'data','homestay.json'),{env}));
 bytes[bytes.length-1]^=1;assert.throws(()=>B.decode(bytes,env));
}));
test('S4-10 scheduler 01:59/02:00 local, daily idempotency and failed backup keeps good files',()=>fixture(async({store,dir})=>{
 let now=Date.parse('2026-10-15T01:59:00+07:00');const directory=path.join(dir,'scheduled'),task=B.createScheduler(store,{env:{BACKUP_ENABLED:'true',BACKUP_KEY:secret},directory,now:()=>now});await task.tick();assert.equal((await store.read()).backupRuns?.length||0,0);now+=60000;await task.tick();await task.tick();assert.equal((await fs.readdir(directory)).length,1);assert.equal((await store.read()).backupRuns.filter(r=>r.status==='SUCCESS').length,1);
 now+=86400000;const broken=B.createScheduler(store,{env:{BACKUP_ENABLED:'true',BACKUP_KEY:'bad'},directory,now:()=>now});await assert.rejects(broken.tick());assert.equal((await fs.readdir(directory)).length,1);assert.equal((await store.read()).backupRuns.at(-1).status,'FAILED');
}));
test('S4-08 expired and invalid tokens never return report, email, invoice or guest data',()=>fixture(async({call,state})=>{
 const user=state.users.find(u=>u.role==='admin'),expired=jwt.sign({sub:user._id,exp:Math.floor(Date.now()/1000)-1},secret);
 for(const token of ['invalid',expired])for(const url of ['/api/admin/state','/api/admin/email-logs','/api/admin/invoices','/api/reports/revenue']){const r=await call(url,'GET',undefined,'admin',{Authorization:'Bearer '+token});assert.equal(r.status,401);assert.equal(r.data.data,undefined);}
}));
test('S4-03 Mongo unique invoice number and real restore to separate Mongo QA', {skip:!process.env.SPRINT4_MONGODB_URI},()=>fixture(async({store,dir})=>{
 await store.mutate(s=>{const b=makeBooking(s);close(s,b);S.issueInvoice(s,b.bookingCode,'QA');});const row=await store.invoices.findOne({});const duplicate={...row,_id:D.id(),bookingId:D.id()};await assert.rejects(store.invoices.insertOne(duplicate),e=>e.code===11000);
 const directory=path.join(dir,'restore-mongo'),env={BACKUP_KEY:secret},saved=await B.backup(store,{directory,env}),source=await store.read();
 const uri=process.env.SPRINT4_MONGODB_URI.replace(/\/HOMESTAY_SPRINT4_QA\?/, '/HOMESTAY_QA_RESTORE_'+D.id()+'?');
 const restored=await B.restoreMongoToQA(path.join(directory,saved.name),uri,{env});assert.equal(restored.invoiceDocuments,1);assert.equal(restored.summary.settled,source.bookings[0].settlement.total);assert.equal(restored.summary.deposit,210000);assert.equal(restored.roomNights,0);console.log('MongoDB QA restore actual: '+JSON.stringify(restored));
 await assert.rejects(B.restoreMongoToQA(path.join(directory,saved.name),uri,{env}),/đã có dữ liệu/);
}));
test('S4-04 booking outbox sends through real Nodemailer TLS to isolated SMTP fixture',()=>fixture(async({store})=>{
 const tls=require('node:tls'),nodemailer=require('nodemailer'),certificate=await fs.readFile(path.join(__dirname,'fixtures/smtp-test-cert.pem')),messages=[],sockets=new Set();
 const smtp=tls.createServer({key:await fs.readFile(path.join(__dirname,'fixtures/smtp-test-key.pem')),cert:certificate},socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});let pending='',inData=false,data=[];socket.write('220 localhost SMTP fixture\r\n');socket.on('data',bytes=>{pending+=bytes;let i;while((i=pending.indexOf('\r\n'))!==-1){const line=pending.slice(0,i);pending=pending.slice(i+2);if(inData){if(line==='.'){messages.push(data.join('\r\n'));inData=false;data=[];socket.write('250 accepted\r\n');}else data.push(line);continue;}if(/^EHLO /i.test(line))socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');else if(/^AUTH /i.test(line))socket.write('235 authenticated\r\n');else if(line==='DATA'){inData=true;socket.write('354 send\r\n');}else if(line==='QUIT')socket.end('221 bye\r\n');else socket.write('250 accepted\r\n');}});
 });await new Promise(r=>smtp.listen(0,'127.0.0.1',r));
 const env={SMTP_HOST:'127.0.0.1',SMTP_PORT:String(smtp.address().port),SMTP_SECURE:'true',SMTP_USER:'qa@example.test',SMTP_PASS:'fixture-only',MAIL_FROM:'qa@example.test',APP_URL:'http://localhost:3001'},original=nodemailer.createTransport;
 // Only this local fixture uses its test CA. The application keeps standard TLS verification.
 nodemailer.createTransport=options=>original({...options,tls:{ca:certificate}});
 try{await store.mutate(s=>makeBooking(s,{status:'PENDING'}));const worker=M.createWorker(store,{env});await worker.tick();await store.mutate(s=>s.bookings[0].status='CONFIRMED');await worker.tick();assert.equal(messages.length,2);assert.ok(messages.every(m=>m.includes('S4QA0001')));const statuses=(await store.read()).emailJobs.map(j=>j.status);assert.deepEqual(statuses,['SENT','SENT']);}
 finally{nodemailer.createTransport=original;for(const socket of sockets)socket.destroy();await new Promise(r=>smtp.close(r));}
}));
