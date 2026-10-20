'use strict';
// Uses only a user-entered login in the dedicated Chrome window. Tokens never
// leave browser memory; artifacts contain request metadata, not business payloads.
const path=require('node:path'),fs=require('node:fs/promises'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.TEMP,'homestay-browser-tools/node_modules/playwright-core'));
const phase=process.argv.includes('--before')?'before':'after',out=path.join(__dirname,'../docs/ai-qa/backend-projection-fix');
(async()=>{
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9223'),pending=[],network=[],checks={};let connection;
 try{
  const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('http://localhost:3001/'));assert(page,'Open the dedicated localhost login window first');
  page.setDefaultTimeout(120000);
  console.log('Waiting for a user-entered login in the dedicated Chrome window.');
  await page.waitForFunction(()=>!!sessionStorage.getItem('hs_token'),{},{timeout:180000});
  page.on('response',response=>{
   if(!new URL(response.url()).pathname.startsWith('/api/'))return;
   pending.push((async()=>{const req=response.request(),endpoint=new URL(response.url()).pathname;
    const entry={at:new Date().toISOString(),endpoint:endpoint.replace(/(\/sessions\/)[^/]+/,'$1:id'),method:req.method(),status:response.status(),ms:Math.round(req.timing().responseStart*100)/100,timing:'response headers',requestId:response.headers()['x-request-id']||null};network.push(entry);
    if(response.status()>=400){const j=await Promise.race([response.json().catch(()=>null),new Promise(resolve=>{const timer=setTimeout(()=>resolve(null),5000);timer.unref();})]);entry.response=j?{success:j.success,code:j.code,message:j.message}:'body unavailable';}
   })());
  });
  const meResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/me');
  const stateResponse=phase==='after'?page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/state',{timeout:180000}):null;
  const [me]=await Promise.all([meResponse,stateResponse,page.goto('http://localhost:3001/admin.html?page=overview')]);
  checks.authMe=me.status();
   console.log(JSON.stringify({step:'authentication',status:me.status()}));
  if(phase==='before'){
   assert.equal(me.status(),500,'Original projection failure must be captured before deployment');
   checks.additional=await page.evaluate(async()=>{const results=[];for(const endpoint of ['/api/admin/state','/api/ai/sessions']){const r=await fetch(endpoint,{headers:{Authorization:'Bearer '+sessionStorage.getItem('hs_token')}});results.push({endpoint,status:r.status});}return results;});
  }else{
   assert.equal(me.status(),200);checks.realLoginRole=(await me.json()).data.role;assert.equal(checks.realLoginRole,'admin');
   const state=await stateResponse;assert.equal(state.status(),200);const data=(await state.json()).data;assert(Array.isArray(data.rooms)&&Array.isArray(data.roomTypes)&&Array.isArray(data.bookings));
   checks.overview={status:state.status(),rooms:data.rooms.length,roomTypes:data.roomTypes.length,bookings:data.bookings.length};
   console.log(JSON.stringify({step:'overview API',status:state.status()}));
   await page.waitForFunction(()=>document.querySelector('#page-error')?.hidden&&document.querySelector('#admin-content')?.textContent.trim()&&!document.querySelector('#admin-content').textContent.includes('Đang tải dữ liệu'));checks.overviewRendered=true;
   const roomsState=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/state',{timeout:180000});await page.goto('http://localhost:3001/admin.html?page=rooms');assert.equal((await roomsState).status(),200);await page.waitForFunction(()=>document.querySelector('#page-error')?.hidden&&document.querySelector('#admin-content table'));checks.roomsScreen=true;console.log(JSON.stringify({step:'rooms screen',ok:true}));
   const status=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/ai/status',{timeout:180000});await page.goto('http://localhost:3001/assistant.html');assert.equal((await status).status(),200);
   await page.waitForFunction(()=>!document.querySelector('#new-chat').disabled&&document.querySelectorAll('#ai-property option').length>0);
   const created=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/ai/sessions'&&r.request().method()==='POST');await page.locator('#new-chat').click();assert.equal((await created).status(),201);
   const question='Cho tôi xem chính sách huỷ và hoàn tiền của tất cả các homestay';
   const chat=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/ai/chat',{timeout:60000});await page.locator('#chat-question').fill(question);await page.locator('#chat-question').press('Enter');const reply=await chat;assert.equal(reply.status(),200);const message=(await reply.json()).data;assert(message.result?.answer);checks.chat={status:200,hasAnswer:true};
   await page.waitForFunction(()=>!document.querySelector('#chat-question').disabled);
   const thread=new URL(page.url()).searchParams.get('session');assert(thread);
   const reloaded=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/ai/sessions/'+thread,{timeout:60000});await page.reload();const history=await reloaded;assert.equal(history.status(),200);const messages=(await history.json()).data.messages;assert(messages.some(m=>m.role==='user'&&m.content===question));assert(messages.some(m=>m.role==='assistant'&&m.result?.answer===message.result.answer));await page.waitForFunction(q=>document.querySelector('#chat-messages').textContent.includes(q),question);checks.historyAfterReload={status:200,messages:messages.length,matchingReply:true};
   require('dotenv').config({path:path.join(__dirname,'../.env')});const m=require('mongoose');connection=await m.createConnection(process.env.MONGODB_URI,{serverSelectionTimeoutMS:6000}).asPromise();
   const userId=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('hs_user'))._id);
   const foreign=await connection.collection('homestay_state').aggregate([{$match:{_id:'state'}},{$project:{thread:{$arrayElemAt:[{$filter:{input:{$ifNull:['$data.aiConversations',[]]},as:'c',cond:{$ne:['$$c.userId',{$literal:userId}]}}},0]}}},{$project:{'thread._id':1}}]).next();
   if(foreign?.thread?._id){const forbidden=await page.evaluate(async id=>{const r=await fetch('/api/ai/sessions/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+sessionStorage.getItem('hs_token')}});const j=await r.json();return {status:r.status,code:j.code,hasMessages:!!j.data?.messages};},foreign.thread._id);assert.equal(forbidden.status,404);assert.equal(forbidden.hasMessages,false);checks.foreignConversation=forbidden;}else checks.foreignConversation={verified:false,reason:'No existing foreign conversation; no real account or history created for this check'};
   checks.unauthenticated=await page.evaluate(async()=>{const r=await fetch('/api/admin/state');return r.status;});assert.equal(checks.unauthenticated,401);
   const restored=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/state',{timeout:180000});await page.goto('http://localhost:3001/admin.html?page=overview');assert.equal((await restored).status(),200);
  }
  await Promise.all(pending);await fs.mkdir(out,{recursive:true});const report={phase,at:new Date().toISOString(),realBrowser:true,login:'user-entered admin session',checks,network};await fs.writeFile(path.join(out,'browser-'+phase+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{if(connection)await connection.close();await browser.close();}
})().catch(e=>{console.error(e.name,e.message);process.exitCode=1;});
