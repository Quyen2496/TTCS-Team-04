'use strict';
// Diagnostic reproduction of the OLD query against real Atlas. Isolated HTTP
// listener + synthetic JWT secret/subject: this is NOT a real-account login test.
Error.stackTraceLimit=50;
const fs=require('node:fs/promises'),path=require('node:path'),m=require('mongoose'),jwt=require('jsonwebtoken');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const {Store}=require('../src/store'),{createApp}=require('../server');
class LegacyProjectionStore extends Store{
 async readIdentity(userId){return await this.collection.findOne({_id:'state'},{projection:{'data.users':{$elemMatch:{_id:userId}},'data.homestays':1,'data.settings':1}});}
}
(async()=>{
 const connection=await m.createConnection(process.env.MONGODB_URI,{serverSelectionTimeoutMS:6000}).asPromise(),logs=[],requests=[];let server;const error=console.error;
 try{
  const store=new LegacyProjectionStore({mode:'mongo'});store.collection=connection.collection('homestay_state');
  console.error=line=>{try{logs.push(JSON.parse(line));}catch{logs.push({message:'unstructured log omitted'});}};
  server=createApp(store,'isolated-diagnostic-secret-not-production').listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const token=jwt.sign({sub:'__nonexistent_projection_diagnostic__'},'isolated-diagnostic-secret-not-production');
  for(const [method,endpoint]of [['GET','/api/auth/me'],['GET','/api/admin/state'],['GET','/api/ai/sessions'],['POST','/api/ai/chat']]){
   const start=performance.now(),r=await fetch('http://127.0.0.1:'+server.address().port+endpoint,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})});requests.push({method,endpoint,status:r.status,ms:Math.round((performance.now()-start)*100)/100,requestId:r.headers.get('x-request-id'),response:await r.json()});
  }
  try{await store.collection.findOne({_id:'state'},{projection:{'data.aiConversations':{$elemMatch:{_id:'__missing__',userId:'__missing__'}}}});}catch(e){logs.push({operation:'Original nested conversation projection',name:e.name,code:e.code,message:e.message});}
  const report={at:new Date().toISOString(),database:'real configured Atlas, read only',http:'isolated listener, synthetic JWT secret/subject (not a real login)',requests,logs};
  await fs.mkdir(path.join(__dirname,'../docs/ai-qa/backend-projection-fix'),{recursive:true});await fs.writeFile(path.join(__dirname,'../docs/ai-qa/backend-projection-fix/request-stack-before.json'),JSON.stringify(report,null,2));
  console.error=error;console.log(JSON.stringify({requests,stackFrames:logs[0]?.stack?.filter(s=>/LegacyProjectionStore|server.js/.test(s)),conversationProjection:logs.at(-1)},null,2));
 }finally{console.error=error;if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await connection.close();}
})().catch(e=>{console.error(e.name);process.exitCode=1;});
