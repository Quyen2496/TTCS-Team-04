'use strict';
// Real browser + live localhost. Anonymous contexts never access private chats.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..'),arg=n=>process.argv.find(a=>a.startsWith('--'+n+'='))?.split('=').slice(1).join('='),label=arg('label')||'browser-live',base=arg('base')||'http://127.0.0.1:3001';
let questions=[
 ['A1','chính sách hoàn tiền'],
 ['A2','cho tôi chính sách hoàn tiền của mộc miên đà lạt homestay'],
 ['A3','chính sách huỷ và hoàn tiền cọc tại mộc miên homestay đà lạt như thế nào'],
 ['A4','cho tôi xem chính sách hoàn tiền của tất cả các homestay'],
 ['B','Xin chào, tôi lỡ làm hỏng điều hoà ở phòng của mình, giờ tôi phải làm sao?'],
 ['C','Homestay có phục vụ bữa sáng không?'],
 ['D','Loại phòng đôi Mộc Miên tại Mộc Miên Đà Lạt Homestay có những tiện nghi gì?'],
 ['E','Ngày 20/10/2026 đến 22/10/2026, Mộc Miên Đà Lạt Homestay còn phòng cho 2 người không?'],
 ['F','Smart TV trong phòng có kết nối sẵn Netflix, YouTube Premium không?'],
 ['G','Tôi có thể thanh toán bằng Apple Pay, Google Pay hoặc chuyển khoản QR code không?']
];
if(arg('suite')==='variants')questions=[
 ['V1','moc mien homestay da lat huy phong thi duoc hoan coc the nao'],
 ['V2','Ở Mộc Miên Đà Lạt Homestay, bữa sáng đã gồm trong giá hay phải trả thêm?'],
 ['V3','Netflix và YouTube Premium ở Mộc Miên Đà Lạt Homestay có được dùng miễn phí không?'],
 ['V4','Cho biết điều kiện huỷ hoàn tiền và có bữa sáng ở Mộc Miên Đà Lạt Homestay không?'],
 ['V5','Mộc Miên Đà Lạt Homestay nhận Apple Pay, Google Pay và QR ngân hàng chứ?'],
 ['V6','Còn bữa sáng?', ['Chính sách hoàn tiền tại Mộc Miên Đà Lạt Homestay là gì?']],
 ['V7','Loại phòng đôi Mộc Miên tại Mộc Miên Đà Lạt Homestay có tiện nghi gì?', ['Xin chào, điều hoà phòng tôi bị hỏng thì phải làm sao?']],
 ['V8','Gợi ý nơi nghỉ yên tĩnh cho hai người, muốn ở trên núi']
];
async function main(){
 const links=path.join(process.env.LOCALAPPDATA,'ms-playwright','.links');let playwright;
 for(const name of await fs.readdir(links)){try{playwright=require((await fs.readFile(path.join(links,name),'utf8')).trim());if(playwright.chromium)break;}catch{}}
 if(!playwright?.chromium)try{playwright=require(path.join(os.tmpdir(),'homestay-browser-tools/node_modules/playwright-core'));}catch{}
 if(!playwright?.chromium)throw Error('No installed browser driver');
 const browser=await playwright.chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),folder=path.join(root,'docs/ai-qa',label);await fs.mkdir(folder,{recursive:true});const results=[];
 try{
  for(const [id,question,preparation]of questions){
   const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),requests=[];
   page.on('request',req=>{if(req.url().includes('/api/')&&req.resourceType()==='fetch')requests.push({url:new URL(req.url()).pathname,start:Date.now(),request:req});});
   page.on('response',async res=>{const entry=requests.find(r=>r.request===res.request());if(entry){entry.http=res.status();entry.serverTiming=res.headers()['server-timing']||null;entry.trace=res.headers()['x-request-id']||null;try{await res.finished();entry.finished=Date.now();}catch{}}});
   await page.goto(base+'/assistant.html');await page.locator('#chat-question').waitFor();await page.waitForFunction(()=>!document.getElementById('chat-question').disabled);
   await page.locator('#new-chat').click();await page.waitForFunction(()=>!document.getElementById('chat-question').disabled);
   for(const q of preparation||[]){await page.locator('#chat-question').fill(q);await page.locator('#chat-send').click();await page.waitForFunction(()=>!document.getElementById('chat-question').disabled);await new Promise(r=>setTimeout(r,1200));}
   await page.locator('#chat-question').fill(question);const start=Date.now(),responsePromise=page.waitForResponse(res=>new URL(res.url()).pathname==='/api/public/ai/chat',{timeout:90000});
   await page.locator('#chat-send').click();const response=await responsePromise,json=await response.json();const received=Date.now();
   await page.locator('.ai-message.assistant').last().waitFor({timeout:90000});await page.waitForFunction(()=>!document.getElementById('chat-question').disabled);await page.evaluate(()=>new Promise(requestAnimationFrame));const rendered=Date.now();
   const result=json.data?.result||{},posted=response.request().postDataJSON(),renderedText=await page.locator('.ai-message.assistant').last().innerText();
   await page.screenshot({path:path.join(folder,id+'.png'),fullPage:true});
   const entry={id,question,http:response.status(),build:response.headers()['x-ai-build']||null,requestKey:posted.requestKey,requestId:response.headers()['x-request-id']||null,serverTiming:response.headers()['server-timing']||null,networkMs:received-start,usefulContentMs:rendered-start,completeMs:rendered-start,renderAfterResponseMs:rendered-received,result,renderedText,requests:requests.filter(r=>r.start>=start).map(({request,...r})=>({...r,durationMs:r.finished?r.finished-r.start:null}))};results.push(entry);
   await fs.writeFile(path.join(folder,'results.json'),JSON.stringify({base,label,mode:'Real Chromium, real application and configured providers; anonymous public data only',startedAt:new Date().toISOString(),results},null,2));
   console.log(JSON.stringify({id,http:entry.http,completeMs:entry.completeMs,intent:result.intent,answer:result.answer?.slice(0,160)}));await context.close();await new Promise(r=>setTimeout(r,1200));
  }
 }finally{await browser.close();}
 const sorted=results.map(r=>r.completeMs).sort((a,b)=>a-b);console.log(JSON.stringify({count:results.length,medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.ceil(sorted.length*.95)-1]}));
}
main().catch(e=>{console.error(e.name+': '+e.message);process.exitCode=1;});
