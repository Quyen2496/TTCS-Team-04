'use strict';
// Capture a user-entered login. Never read request bodies, response bodies,
// passwords, cookies or Authorization headers into the collector.
const fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require(path.join(process.env.TEMP,'homestay-browser-tools/node_modules/playwright-core'));
(async()=>{const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');try{
 const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('http://localhost:3001/'));if(!page)throw Error('No localhost tab');
 const repeat=process.argv.includes('--repeat'),records=[],out=path.join(__dirname,'../docs/performance/live-20261020/'+(repeat?'login-after.json':'login.json'));await fs.mkdir(path.dirname(out),{recursive:true});
 page.on('response',r=>{if(new URL(r.url()).pathname!=='/api/auth/login')return;const req=r.request(),row={at:new Date().toISOString(),endpoint:'/api/auth/login',method:req.method(),status:r.status(),headersMs:req.timing().responseStart,serverTiming:r.headers()['server-timing']||null,build:r.headers()['x-homestay-build']||null};records.push(row);void fs.writeFile(out,JSON.stringify({realBrowser:true,samples:records},null,2));console.log(JSON.stringify(row));});
 const success=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/login'&&r.status()===200,{timeout:180000});
 if(repeat){
  await page.goto('http://localhost:3001/login.html');
  // Replay only the user-entered successful POST, inside browser memory. The
  // collector never receives credentials. Two extra samples delay navigation;
  // only per-request login latency is reported, not this artificial UI wait.
  await page.evaluate(()=>{const original=window.fetch.bind(window);let replayed=false;window.fetch=async(...args)=>{const r=await original(...args);if(!replayed&&new URL(String(args[0]),location.href).pathname==='/api/auth/login'&&r.ok){replayed=true;await original(...args);await original(...args);}return r;};});
  await success;
 }else await Promise.all([success,page.goto('http://localhost:3001/login.html')]);
 await page.waitForFunction(()=>location.pathname==='/admin.html'&&document.querySelector('#page-error')?.hidden&&!document.querySelector('#admin-content')?.textContent.includes('Đang tải dữ liệu'),{},{timeout:180000});
 console.log(JSON.stringify({loginComplete:true,role:await page.evaluate(()=>JSON.parse(sessionStorage.getItem('hs_user')).role)}));
 await fs.writeFile(out,JSON.stringify({realBrowser:true,additionalApiSamples:repeat?2:0,uiWaitIncludesBenchmarkReplays:repeat,samples:records},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e.name,e.message);process.exitCode=1;});
