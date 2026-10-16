'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const Setup=require('../src/email-setup'),dotenv=require('dotenv');
const password='abcd efgh ijkl mnop';
async function fixture(fn){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'hs-email-setup-')),envPath=path.join(directory,'.env');const original='MONGODB_URI="mongodb://unchanged/database"\r\nJWT_SECRET=keep_this_value\r\nDATA_MODE=mongo\r\nSMTP_HOST=old.example.test\r\nexport SMTP_PASS=old-secret\r\nSMTP_HOST=duplicate.example.test\r\n# preserve comment\r\n';await fs.writeFile(envPath,original);try{await fn({directory,envPath,original});}finally{await fs.rm(directory,{recursive:true,force:true});}}
test('Thiết lập email kiểm tra đăng nhập + gửi trước khi lưu, giữ Mongo/JWT và sao lưu file cũ',()=>fixture(async({directory,envPath,original})=>{
 const calls=[],result=await Setup.configure({envPath,email:'Sender@gmail.com',password,createTransport:config=>{assert.equal(config.SMTP_PASS,'abcdefghijklmnop');assert.equal(config.SMTP_PORT,'465');return {verify:async()=>calls.push('verify'),sendMail:async mail=>{calls.push('send');assert.equal(mail.to,'sender@gmail.com');assert.ok(!mail.text.includes(config.SMTP_PASS));assert.equal(await fs.readFile(envPath,'utf8'),original);return {accepted:[mail.to]};},close:()=>calls.push('close')};}});
 assert.deepEqual(calls,['verify','send','close']);assert.equal(result.email,'sender@gmail.com');const saved=await fs.readFile(envPath,'utf8'),parsed=dotenv.parse(saved);assert.equal(parsed.MONGODB_URI,'mongodb://unchanged/database');assert.equal(parsed.JWT_SECRET,'keep_this_value');assert.equal(parsed.DATA_MODE,'mongo');assert.equal(parsed.SMTP_HOST,'smtp.gmail.com');assert.equal(parsed.SMTP_PASS,'abcdefghijklmnop');assert.equal(saved.match(/^SMTP_HOST=/gm).length,1);assert.ok(saved.includes('# preserve comment\r\n'));const backups=(await fs.readdir(path.join(directory,'backups/email'))).filter(n=>n.startsWith('.env-'));assert.equal(backups.length,1);assert.equal(await fs.readFile(path.join(directory,'backups/email',backups[0]),'utf8'),original);assert.match(await fs.readFile(path.join(directory,'backups/email/.gitignore'),'utf8'),/\.env-\*/);
}));
test('SMTP lỗi hoặc từ chối thư không ghi cấu hình hay tạo sao lưu',()=>fixture(async({directory,envPath,original})=>{
 for(const stage of ['verify','send','reject']){let closed=false,sent=false;await assert.rejects(()=>Setup.configure({envPath,email:'sender@gmail.com',password,createTransport:()=>({verify:async()=>{if(stage==='verify')throw Error('verify failed');},sendMail:async()=>{sent=true;if(stage==='send')throw Error('send failed');return {accepted:[]};},close:()=>closed=true})}));assert.equal(closed,true);if(stage==='verify')assert.equal(sent,false);assert.equal(await fs.readFile(envPath,'utf8'),original);await assert.rejects(()=>fs.access(path.join(directory,'backups/email')));}
}));
test('Không ghi đè .env được sửa trong khi đang kiểm tra SMTP',()=>fixture(async({envPath})=>{
 await assert.rejects(()=>Setup.configure({envPath,email:'sender@gmail.com',password,createTransport:()=>({verify:async()=>fs.writeFile(envPath,'NEW_SETTING=keep\n'),sendMail:async()=>({accepted:['sender@gmail.com']}),close:()=>{}})}),/vừa thay đổi/);assert.equal(await fs.readFile(envPath,'utf8'),'NEW_SETTING=keep\n');
}));
test('Không tạo .env thiếu cấu hình dự án; không nhận email/giá trị chèn dòng',()=>fixture(async({directory})=>{
 assert.throws(()=>Setup.gmailConfig('sender@gmail.com\nMAIL_FROM=attacker','abcdefgh'),/email/);assert.throws(()=>Setup.gmailConfig('sender@gmail.com',''),/mật khẩu/);await assert.rejects(()=>Setup.configure({envPath:path.join(directory,'missing.env'),email:'sender@gmail.com',password}),/Chưa có .env/);
}));
test('Nodemailer thật qua SMTP TLS: thiết lập gửi thư thử rồi API gửi mã và đặt lại',()=>fixture(async({directory,envPath})=>{
 const tls=require('node:tls'),nodemailer=require('nodemailer'),Mail=require('../src/mail'),bcrypt=require('bcryptjs'),D=require('../src/domain'),{Store}=require('../src/store'),{createApp}=require('../server');
 const keyFile=path.join(__dirname,'fixtures/smtp-test-key.pem'),certFile=path.join(__dirname,'fixtures/smtp-test-cert.pem');
 // Public fixture key, only for the local SMTP test server; never used by the app.
 const certificate=await fs.readFile(certFile),messages=[],sockets=new Set();
 const smtp=tls.createServer({key:await fs.readFile(keyFile),cert:certificate},socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});let pending='',inData=false,data=[];
  socket.write('220 localhost SMTP test\r\n');socket.on('data',bytes=>{pending+=bytes.toString();let i;while((i=pending.indexOf('\r\n'))!==-1){const line=pending.slice(0,i);pending=pending.slice(i+2);if(inData){if(line==='.'){messages.push(data.join('\r\n'));inData=false;data=[];socket.write('250 message accepted\r\n');}else data.push(line.replace(/^\.\./,'.'));continue;}
   if(/^EHLO /i.test(line))socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');else if(/^AUTH PLAIN /i.test(line))socket.write('235 authenticated\r\n');else if(/^MAIL FROM:|^RCPT TO:/i.test(line))socket.write('250 accepted\r\n');else if(line==='DATA'){inData=true;socket.write('354 send data\r\n');}else if(line==='QUIT')socket.end('221 bye\r\n');else socket.write('250 OK\r\n');
  }});
 });
 await new Promise(r=>smtp.listen(0,'127.0.0.1',r));const smtpEnv={SMTP_HOST:'127.0.0.1',SMTP_PORT:String(smtp.address().port),SMTP_SECURE:'true',SMTP_USER:'sender@gmail.com',SMTP_PASS:'abcdefghijklmnop',MAIL_FROM:'sender@gmail.com'},previous=Object.fromEntries(Object.keys(smtpEnv).map(k=>[k,process.env[k]])),create=nodemailer.createTransport;
 // Trust only this isolated fixture certificate; production keeps normal TLS verification.
 nodemailer.createTransport=options=>create({...options,tls:{ca:certificate}});const store=new Store({mode:'file',file:path.join(directory,'state.json')});let server;
 try{
  await Setup.configure({envPath,email:'sender@gmail.com',password,createTransport:()=>Mail.transport(smtpEnv)});assert.equal(messages.length,1);assert.match(messages[0],/To: sender@gmail.com/);
  Object.assign(process.env,smtpEnv);await store.init();await store.mutate(s=>s.users.push({_id:D.id(),username:'guest',email:'guest@example.test',role:'guest',active:true,password:bcrypt.hashSync('Guest12345',4)}));
  server=createApp(store,'isolated-smtp-integration-secret').listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const call=async(url,body)=>{const response=await fetch('http://127.0.0.1:'+server.address().port+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
  const issued=await call('/api/auth/forgot-password',{email:'guest@example.test'});assert.equal(issued.status,200);assert.equal(messages.length,2);assert.match(messages[1],/To: guest@example.test/);
  const raw=messages[1].split('\r\n\r\n').slice(1).join('\r\n\r\n'),text=/Content-Transfer-Encoding: base64/i.test(messages[1])?Buffer.from(raw,'base64').toString():Buffer.from(raw.replace(/=\r\n/g,'').replace(/=([A-F0-9]{2})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16))),'binary').toString();
  const code=text.match(/Mã đặt lại mật khẩu của bạn: (\d{6})/)[1];assert.equal((await call('/api/auth/reset-password',{challenge:issued.data.data.challenge,code,password:'Updated123'})).status,200);assert.equal((await call('/api/auth/login',{username:'guest',password:'Updated123'})).status,200);
 }finally{
  nodemailer.createTransport=create;for(const [key,value] of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  if(server)await new Promise(r=>server.close(r));await store.close();for(const socket of sockets)socket.destroy();await new Promise(r=>smtp.close(r));
 }
}));
