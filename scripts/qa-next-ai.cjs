'use strict';
// User-entered real Chrome session; only chat histories are created by this QA.
// No credentials, answer text, customer records or full bodies enter artifacts.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.TEMP,'homestay-browser-tools/node_modules/playwright-core'));
const label=process.argv.find(v=>v.startsWith('--label='))?.slice(8)||'baseline';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid label');
const questions=['Tổng quan homestay','Khách đến hôm nay','Gợi ý việc cần xử lý','Nhìn từ các đặt phòng đang có, bạn giúp mình đánh giá rủi ro vận hành cho ca trực sắp tới nhé.'];
const median=a=>{const s=[...a].sort((a,b)=>a-b);return s[Math.floor(s.length/2)];};
(async()=>{const b=await chromium.connectOverCDP('http://127.0.0.1:9223');let page;try{
 const context=b.contexts()[0],source=context.pages().find(p=>p.url().startsWith('http://localhost:3001/'));assert(source);
 const account=await source.evaluate(async()=>{const r=await fetch('/api/auth/me',{headers:{Authorization:'Bearer '+sessionStorage.getItem('hs_token')}});const j=await r.json();return{status:r.status,role:j.data?.role};});assert.equal(account.status,200,'Real login required');
 const health=await(await fetch('http://localhost:3001/api/health')).json();
 [page]=await Promise.all([context.waitForEvent('page'),source.evaluate(()=>window.open('about:blank','hs-next-ai-'+Date.now()))]);page.setDefaultTimeout(180000);
 const report={at:new Date().toISOString(),label,realBrowser:true,database:'actual Atlas via localhost',role:account.role,runtime:health.data.runtime,questions,samples:[],summary:[],qaThreadsCleaned:0},output=path.join(__dirname,'../docs/performance/live-20261020-next/ai-'+label+'.json');await fs.mkdir(path.dirname(output),{recursive:true});
 let capture=[],pending=[],measuring=false;
 page.on('response',r=>{if(!measuring||!new URL(r.url()).pathname.startsWith('/api/'))return;const entry={endpoint:new URL(r.url()).pathname.replace(/(\/sessions\/)[^/]+/,'$1:id'),method:r.request().method(),status:r.status(),build:r.headers()['x-homestay-build'],requestId:r.headers()['x-request-id'],serverTiming:r.headers()['server-timing']||null};capture.push(entry);pending.push((async()=>{await r.finished();entry.ms=r.request().timing().responseEnd;const j=await r.json().catch(()=>null);entry.success=j?.success;if(entry.endpoint==='/api/ai/chat'){const result=j?.data?.result;entry.result=result?{intent:result.intent,engine:result.engine,provider:result.provider,model:result.model,narrated:!!result.narrated,narrationProvider:result.narrationProvider,fallbackReason:result.fallbackReason,narrationReason:result.narrationReason,answerPresent:!!result.answer}:null;}if(r.request().method()==='GET'&&entry.endpoint==='/api/ai/sessions/:id')entry.messages=j?.data?.messages?.length;})());});
 const save=()=>fs.writeFile(output,JSON.stringify(report,null,2));
 async function measure(kind,sample,fn){capture=[];pending=[];measuring=true;const start=performance.now();let error;try{await fn();}catch(e){error=e.name;}await Promise.allSettled(pending);measuring=false;const row={kind,sample,uiMs:Math.round(performance.now()-start),requests:capture,...(error?{error}:{})};row.uiError=await page.locator('#ai-error').textContent().catch(()=>null);report.samples.push(row);await save();console.log(JSON.stringify({kind,sample,uiMs:row.uiMs,error:row.error,uiError:row.uiError,statuses:capture.map(r=>r.status),results:capture.filter(r=>r.result).map(r=>r.result)}));if(error||row.uiError||capture.some(r=>r.status>=400))throw Error('Measurement failed');}
 const ready=()=>page.waitForFunction(()=>!!document.querySelector('#chat-send')&&!document.querySelector('#chat-send').disabled);
 for(let i=1;i<=5;i++)await measure('open-page',i,async()=>{await page.goto('http://localhost:3001/assistant.html',{waitUntil:'load'});await ready();});
 const buttons=page.locator('[data-session]');assert(await buttons.count()>0,'Existing conversation required');
 // Prefer an existing history with messages; metadata alone is not a history test.
 const ownId=await page.evaluate(async()=>{const headers={Authorization:'Bearer '+sessionStorage.getItem('hs_token')};for(const button of document.querySelectorAll('[data-session]')){const id=button.dataset.session;const r=await fetch('/api/ai/sessions/'+id,{headers}),j=await r.json();if(j.data?.messages?.length)return id;}return null;});assert(ownId,'Nonempty existing history required');
 for(let i=1;i<=5;i++)await measure('open-old',i,async()=>{await page.locator('[data-session="'+ownId+'"]').click();await ready();assert(await page.locator('.ai-message').count()>0);});
 for(let i=1;i<=5;i++){
  await measure('create-thread',i,async()=>{await page.locator('#new-chat').click();await ready();});
  for(let q=0;q<questions.length;q++)await measure('question-'+(q+1),i,async()=>{await page.locator('#chat-question').fill(questions[q]);await page.locator('#chat-send').click();await ready();});
  // Reload verifies the just-written history through the UI and persisted API.
  await measure('reload-history',i,async()=>{await page.reload({waitUntil:'load'});await ready();assert(await page.locator('.ai-message').count()>=8);});
  // Remove only this round's newly created QA history after verifying reload.
  // Existing user histories are never renamed/deleted or used for new questions.
  await page.evaluate(async()=>{const id=new URL(location.href).searchParams.get('session');const r=await fetch('/api/ai/sessions/'+encodeURIComponent(id),{method:'DELETE',headers:{Authorization:'Bearer '+sessionStorage.getItem('hs_token')}});if(!r.ok)throw Error('QA cleanup failed');});report.qaThreadsCleaned++;await save();
 }
 for(const kind of [...new Set(report.samples.map(s=>s.kind))]){const s=report.samples.filter(s=>s.kind===kind);report.summary.push({kind,n:s.length,medianMs:median(s.map(s=>s.uiMs)),maxMs:Math.max(...s.map(s=>s.uiMs)),providerObserved:s.some(s=>s.requests.some(r=>/provider_/.test(r.serverTiming||''))),errors:s.filter(s=>s.error||s.uiError).length});}
 await save();console.log(JSON.stringify(report.summary));if(report.summary.some(s=>s.medianMs>10000||s.errors))process.exitCode=2;
}finally{if(page)await page.close();await b.close();}})().catch(e=>{console.error(e.name,e.message);process.exitCode=1;});
