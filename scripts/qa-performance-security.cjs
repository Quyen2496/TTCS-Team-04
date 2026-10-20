'use strict';
// Only reads existing sessions/history. Does not alter users, grants or data.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const {MongoClient}=require('mongodb'),{chromium}=require(path.join(process.env.TEMP,'homestay-browser-tools/node_modules/playwright-core'));
(async()=>{const browser=await chromium.connectOverCDP('http://127.0.0.1:9223'),client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:6000});try{
 const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('http://localhost:3001/'));assert(page);
 const userId=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('hs_user'))._id);await client.connect();
 const foreign=await client.db().collection('homestay_state').aggregate([{$match:{_id:'state'}},{$project:{id:{$arrayElemAt:[{$map:{input:{$filter:{input:{$ifNull:['$data.aiConversations',[]]},as:'c',cond:{$ne:['$$c.userId',{$literal:userId}]}}},as:'c',in:'$$c._id'}},0]}}}]).next();
 const own=await client.db().collection('homestay_state').aggregate([{$match:{_id:'state'}},{$project:{id:{$arrayElemAt:[{$map:{input:{$filter:{input:{$ifNull:['$data.aiConversations',[]]},as:'c',cond:{$and:[{$eq:['$$c.userId',{$literal:userId}]},{$gt:[{$size:{$ifNull:['$$c.messages',[]]}},0]}]}}},as:'c',in:'$$c._id'}},0]}}}]).next();
 const results=await page.evaluate(async ({foreignId,ownId})=>{
  const rows=[];async function call(endpoint,authenticated=true,extra={}){const start=performance.now(),r=await fetch(endpoint,{headers:{...(authenticated?{Authorization:'Bearer '+sessionStorage.getItem('hs_token')}:{ }),...extra}}),j=await r.json();rows.push({endpoint:endpoint.replace(/(\/sessions\/)[^/]+/,'$1:id'),status:r.status,success:j.success,code:j.code,hasData:!!j.data,ms:Math.round(performance.now()-start),build:r.headers.get('x-homestay-build'),serverTiming:r.headers.get('server-timing'),requestId:r.headers.get('x-request-id')});return j;}
  const me=await call('/api/auth/me');if(!me.success)throw Error('No valid real session');const list=await call('/api/ai/sessions');let ownHistory=null;
  if(ownId||list.data?.length){const j=await call('/api/ai/sessions/'+encodeURIComponent(ownId||list.data[0]._id));ownHistory={success:j.success,messages:Array.isArray(j.data?.messages)?j.data.messages.length:null};}
  if(foreignId)await call('/api/ai/sessions/'+encodeURIComponent(foreignId));
  await call('/api/admin/state?screen=overview',false);await call('/api/ai/sessions',false);
  await call('/api/admin/state?screen=overview',true,{'X-Homestay-Id':'__qa_nonexistent_property__'});
  return {role:me.data.role,rows,ownHistory,foreignHistoryTested:!!foreignId};
 },{foreignId:foreign?.id||null,ownId:own?.id||null});
 assert.equal(results.rows[0].status,200);assert(results.rows.filter(r=>r.status>=400).every(r=>!r.hasData));assert.equal(results.rows.at(-1).status,403);assert.equal(results.rows.at(-2).status,401);assert.equal(results.rows.at(-3).status,401);if(foreign?.id)assert(results.rows.some(r=>r.endpoint.includes('/sessions/:id')&&r.status===404));
 const output=path.join(__dirname,'../docs/performance/live-20261020/security-real-admin.json');await fs.writeFile(output,JSON.stringify({at:new Date().toISOString(),realBrowser:true,database:'live Atlas',accountMutations:0,fixtureOnly:['disabled account','revoked permissions','stale sessionVersion','owner foreign property','guest admin/foreign history'],...results},null,2));console.log(JSON.stringify(results,null,2));
}finally{await client.close();await browser.close();}})().catch(e=>{console.error(e.name);process.exitCode=1;});
