'use strict';
// Read-only checks on real account data; only pass/fail and counts are saved.
const fs=require('node:fs/promises'),path=require('node:path');const{chromium}=require(path.join(process.env.TEMP,'homestay-browser-tools/node_modules/playwright-core'));
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9223');try{const page=b.contexts()[0].pages().find(p=>p.url().startsWith('http://localhost:3001/'));const result=await page.evaluate(async()=>{
 const headers={Authorization:'Bearer '+sessionStorage.getItem('hs_token')},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),checks=[];
 const check=(name,ok)=>{checks.push({name,ok:!!ok});if(!ok)throw Error(name);};
 async function call(url){const r=await fetch(url,{headers});check('HTTP '+url.replace(/\/bookings\/[^/?]+/,'/bookings/:code').replace(/\/rooms\/[^/?]+/,'/rooms/:id').split('&search=')[0],r.status===200);return(await r.json()).data;}
 const legacy=await call('/api/admin/state?screen=reception'),rows=[],first=await call('/api/admin/state?screen=reception&view=list&pageSize=50');rows.push(...first.bookings);
 for(let i=2;i<=first.listPagination.pages;i++)rows.push(...(await call('/api/admin/state?screen=reception&view=list&pageSize=50&page='+i)).bookings);
 const keys=['bookingCode','guestName','email','phone','status','checkIn','checkOut','guestCount','totalAmount','depositAmount','version'],pick=r=>Object.fromEntries(keys.map(k=>[k,r[k]]));
 check('Booking order, all visible list values and complete pagination',same(rows.map(pick),legacy.bookings.slice().reverse().map(pick)));
 check('Booking total count',first.listPagination.total===legacy.bookings.length);
 check('Initial list omits nightly prices, ledgers and policy snapshots',rows.every(r=>!('nightlyPrices'in r)&&!('depositLedger'in r)&&!('settingsSnapshot'in r)&&!('changeHistory'in r)));
 const sample=legacy.bookings.find(b=>b.guestName)||legacy.bookings[0];
 if(sample){const term=(sample.guestName||sample.bookingCode).toUpperCase(),filtered=await call('/api/admin/state?screen=reception&view=list&pageSize=50&search='+encodeURIComponent(term)),expected=legacy.bookings.filter(b=>[b.bookingCode,b.guestName,b.email,b.status].join(' ').toLowerCase().includes(term.toLowerCase()));check('Unicode search count',filtered.listPagination.total===expected.length);
  const detail=await call('/api/admin/bookings/'+encodeURIComponent(sample.bookingCode));for(const key of ['nightlyPrices','depositLedger','settingsSnapshot','settlement','changeHistory','totalAmount','depositAmount','version'])check('Booking detail preserves '+key,same(detail[key],sample[key]));}
 const roomsLegacy=await call('/api/admin/state?screen=rooms'),rooms=[],roomPage=await call('/api/admin/state?screen=rooms&view=list&pageSize=50');rooms.push(...roomPage.rooms);
 for(let i=2;i<=roomPage.listPagination.pages;i++)rooms.push(...(await call('/api/admin/state?screen=rooms&view=list&pageSize=50&page='+i)).rooms);
 const roomKeys=['_id','roomNumber','homestayId','roomTypeId','floor','status','photo'],roomPick=r=>Object.fromEntries(roomKeys.map(k=>[k,r[k]]));check('Room order, values and total count',same(rooms.map(roomPick),roomsLegacy.rooms.map(roomPick))&&roomPage.listPagination.total===roomsLegacy.rooms.length);
 check('Initial room list omits galleries and notes',rooms.every(r=>!('images'in r)&&!('notes'in r)));
 if(roomsLegacy.rooms[0]){const room=roomsLegacy.rooms[0],detail=await call('/api/admin/rooms/'+room._id);check('Room detail preserves gallery',same(detail.room.images,room.images));check('Room detail preserves notes',same(detail.room.notes,room.notes));}
 return{checks,bookingCount:legacy.bookings.length,roomCount:roomsLegacy.rooms.length};
 });const out={at:new Date().toISOString(),readOnly:true,realBrowser:true,database:'live Atlas via localhost',...result};await fs.writeFile(path.join(__dirname,'../docs/performance/live-20261020-next/integrity-real-admin.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out));}finally{await b.close();}})().catch(e=>{console.error(e.name,e.message);process.exitCode=1;});
