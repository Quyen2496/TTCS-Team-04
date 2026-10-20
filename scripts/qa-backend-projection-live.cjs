'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.TEMP,'homestay-browser-tools/node_modules/playwright-core'));
(async()=>{
 const b=await chromium.connectOverCDP('http://127.0.0.1:9223');let context;
 try{
  context=await b.newContext();const page=await context.newPage();await page.goto('http://localhost:3001/login.html');
  const checks=await page.evaluate(async()=>{const rows=[];for(const endpoint of ['/api/health','/api/ready','/api/admin/state','/api/ai/sessions']){const start=performance.now(),r=await fetch(endpoint),j=await r.json();rows.push({endpoint,method:'GET',status:r.status,ms:Math.round((performance.now()-start)*100)/100,requestId:r.headers.get('x-request-id'),response:endpoint==='/api/health'||endpoint==='/api/ready'?j:{success:j.success,code:j.code,message:j.message}});}return rows;});
  assert.deepEqual(checks.map(c=>c.status),[200,200,401,401]);const report={at:new Date().toISOString(),realBrowser:true,login:'anonymous isolated context; not an admin test',checks};
  await fs.writeFile(path.join(__dirname,'../docs/ai-qa/backend-projection-fix/live-readiness.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{if(context)await context.close();await b.close();}
})().catch(e=>{console.error(e.name,e.message);process.exitCode=1;});
