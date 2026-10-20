'use strict';
// Real Chrome UI measurements. Reuses only a user-entered session in browser
// memory; all navigation and requests are read-only. No HAR or business bodies.
const path=require('node:path'),fs=require('node:fs/promises');
const {chromium}=require(path.join(process.env.TEMP,'homestay-browser-tools/node_modules/playwright-core'));
const label=process.argv.find(v=>v.startsWith('--label='))?.slice(8)||'baseline';
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid label');
const median=a=>{const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};
(async()=>{
 const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');let page;
 try{
  const context=browser.contexts()[0],source=context.pages().find(p=>p.url().startsWith('http://localhost:3001/'));if(!source)throw Error('No localhost tab');
  await source.waitForFunction(()=>!!sessionStorage.getItem('hs_token')&&location.pathname==='/admin.html'&&!document.querySelector('#refresh')?.disabled&&document.querySelector('#page-error')?.hidden,{},{timeout:180000});
  const identity=await source.evaluate(async()=>{const r=await fetch('/api/auth/me',{headers:{Authorization:'Bearer '+sessionStorage.getItem('hs_token')}}),j=await r.json();if(r.status!==200)throw Error('Existing login expired');return {role:j.data.role,permissions:j.data.permissions,selectedProperty:!!sessionStorage.getItem('hs_homestay')};});
  const health=await (await fetch('http://localhost:3001/api/health')).json();
  const [tab]=await Promise.all([context.waitForEvent('page'),source.evaluate(()=>window.open('about:blank','homestay-performance-measure'))]);page=tab;page.setDefaultTimeout(120000);
  const screens=[['reception','bookings.view'],['rooms','rooms.view']];
  const report={at:new Date().toISOString(),label,realBrowser:true,database:'live Atlas through localhost',role:identity.role,selectedProperty:identity.selectedProperty,runtime:health.data.runtime,samples:[],details:[],skipped:[],summary:[]};
  const output=path.join(__dirname,'../docs/performance/live-20261020-next/admin-'+label+'.json');await fs.mkdir(path.dirname(output),{recursive:true});
  const save=()=>fs.writeFile(output,JSON.stringify(report,null,2));
  for(const [screen,permission]of screens){
   if(permission&&!identity.permissions.includes(permission)){report.skipped.push({screen,reason:'permission'});continue;}
   for(let sample=1;sample<=5;sample++){
    const start=performance.now();let error;
    try{await page.goto('http://localhost:3001/admin.html?page='+screen,{waitUntil:'load'});await page.waitForFunction(()=>{const e=document.querySelector('#page-error'),c=document.querySelector('#admin-content'),r=document.querySelector('#refresh');return !!e&&!r.disabled&&(!e.hidden||!!c.textContent.trim()&&!c.textContent.includes('Đang tải dữ liệu'));});}catch(e){error=e.name;}
    const uiMs=Math.round(performance.now()-start),data=await page.evaluate(()=>({pageError:document.querySelector('#page-error')?.hidden?null:document.querySelector('#page-error')?.textContent,rendered:!!document.querySelector('#admin-content')?.textContent.trim()&&!document.querySelector('#admin-content')?.textContent.includes('Đang tải dữ liệu'),requests:performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.startsWith('/api/')).map(e=>({endpoint:new URL(e.name).pathname+new URL(e.name).search,method:'GET',status:e.responseStatus,ms:Math.round(e.duration*100)/100,startMs:e.startTime,endMs:e.responseEnd,bytes:e.encodedBodySize,serverTiming:e.serverTiming.map(s=>({name:s.name,ms:s.duration}))}))}));
    for(const r of data.requests){r.atlasMs=r.serverTiming.filter(s=>/^atlas_/.test(s.name)).reduce((n,s)=>n+s.ms,0);r.authenticationMs=r.serverTiming.find(s=>/^authentication_/.test(s.name))?.ms||0;r.backendMs=r.serverTiming.find(s=>/^backend_total_/.test(s.name))?.ms||0;r.backendOtherMs=Math.max(0,r.backendMs-r.atlasMs);r.clientAndTransferMs=Math.max(0,r.ms-r.backendMs);}
    const intervals=data.requests.map(r=>[r.startMs,r.endMs]).sort((a,b)=>a[0]-b[0]);let apiOccupiedMs=0,until=0;for(const [a,b]of intervals){apiOccupiedMs+=Math.max(0,b-Math.max(a,until));until=Math.max(until,b);}
    const row={screen,sample,uiMs,outsideApiMs:Math.max(0,Math.round(uiMs-apiOccupiedMs)),...data,...(error?{error}:{})};report.samples.push(row);await save();console.log(JSON.stringify({label,screen,sample,uiMs,api:data.requests.length,ok:!error&&!data.pageError&&data.rendered,statuses:data.requests.map(r=>r.status)}));
   }
  }
  for(const [screen,action,dialog]of [['reception','details','#editor'],['rooms','room-gallery','#photo-viewer']]){
   await page.goto('http://localhost:3001/admin.html?page='+screen);await page.waitForFunction(()=>!document.querySelector('#refresh').disabled&&document.querySelector('#page-error').hidden);
   for(let sample=1;sample<=5;sample++){
    await page.evaluate(()=>performance.clearResourceTimings());const start=performance.now();await page.locator('[data-action="'+action+'"]').first().click();await page.locator(dialog+'[open]').waitFor();
    if(screen==='rooms')await page.waitForFunction(()=>{const img=document.querySelector('#photo-viewer .gallery-main');return img?.complete&&img.naturalWidth>0;});
    const data=await page.evaluate(()=>({requests:performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.startsWith('/api/')).map(e=>({endpoint:new URL(e.name).pathname.replace(/(\/bookings\/)[^/]+/,'$1:code').replace(/(\/rooms\/)[^/]+/,'$1:id'),status:e.responseStatus,ms:e.duration,bytes:e.encodedBodySize,serverTiming:e.serverTiming.map(s=>({name:s.name,ms:s.duration}))}))}));
    const row={screen,action,sample,uiMs:Math.round(performance.now()-start),...data};report.details.push(row);await save();console.log(JSON.stringify({detail:action,sample,uiMs:row.uiMs,statuses:data.requests.map(r=>r.status)}));
    await page.locator(screen==='rooms'?'#photo-viewer [data-close]':'#editor-close').click();
   }
  }
  for(const [screen]of screens){const samples=report.samples.filter(r=>r.screen===screen);if(samples.length)report.summary.push({screen,n:samples.length,firstMs:samples[0].uiMs,medianMs:median(samples.map(r=>r.uiMs)),warmMedianMs:median(samples.slice(1).map(r=>r.uiMs)),maxMs:Math.max(...samples.map(r=>r.uiMs)),errors:samples.filter(r=>r.error||r.pageError||!r.rendered||r.requests.some(q=>q.status>=400)).length});}
  await save();console.log(JSON.stringify({summary:report.summary,output},null,2));if(report.summary.some(s=>s.medianMs>=10000||s.errors))process.exitCode=2;
 }finally{if(page)await page.close();await browser.close();}
})().catch(e=>{console.error(e.name,e.message);process.exitCode=1;});
