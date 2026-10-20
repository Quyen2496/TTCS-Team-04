'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),jwt=require('jsonwebtoken');
const {createApp}=require('../server');
test('API error correlates a stack with its request without exposing credentials or stack in the response',async()=>{
 const logs=[],previous=console.error,secret='isolated-logging-test';
 const store={readIdentity:async()=>{const e=Error('mongodb://user:SECRET_PASSWORD@private-host/db');e.name='MongoServerError';e.code=31275;throw e;}};
 const server=createApp(store,secret).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));console.error=line=>logs.push(JSON.parse(line));
 try{
  const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/auth/me?password=SECRET_QUERY',{headers:{Authorization:'Bearer '+jwt.sign({sub:'synthetic'},secret)}}),j=await r.json();
  assert.equal(r.status,500);assert.equal(j.success,false);assert.equal(logs.length,1);assert.equal(logs[0].requestId,r.headers.get('x-request-id'));assert.equal(logs[0].route,'/api/auth/me');assert(logs[0].stack.some(frame=>frame.includes('server.js')));
  assert(!/SECRET_|mongodb:|Bearer|private-host/.test(JSON.stringify(logs)));assert(!/SECRET_|mongodb:|stack|server\.js/.test(JSON.stringify(j)));
 }finally{console.error=previous;server.closeAllConnections();await new Promise(r=>server.close(r));}
});
