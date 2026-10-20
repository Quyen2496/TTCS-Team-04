'use strict';
// READ ONLY. No Store.init(), indexes, migration, seeding, writes or full bodies
// in artifacts. Compare old/new projections; probe compression separately.
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
require('dotenv').config({path:path.join(__dirname,'../.env')});
const {MongoClient}=require('mongodb'),R=require('../src/read-model');
const legacyProjection=Object.fromEntries([...R.base,'rooms','roomTypes','bookings','amenities'].map(k=>['data.'+k,1]));
function sockets(client){const rows=[];for(const server of client.topology.s.servers.values()){const pool=server.pool,key=Object.getOwnPropertySymbols(pool).find(k=>k.description==='connections');for(const c of pool[key]||[])rows.push(c);}return rows;}
const received=client=>sockets(client).reduce((n,c)=>n+c.socket.bytesRead,0);
(async()=>{const report={at:new Date().toISOString(),database:'actual configured Atlas',readOnly:true,n:3,samples:[]};
 for(const compressed of [false,true]){
  const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:6000,maxPoolSize:1,compressors:compressed?['zlib']:[],...(compressed?{zlibCompressionLevel:6}:{})});
  try{const connected=performance.now();await client.connect();const connectMs=performance.now()-connected,c=client.db().collection('homestay_state');await client.db().command({ping:1});
   const compressor=sockets(client).map(c=>c.description.compressor||'none');if(compressed&&!compressor.includes('zlib')){report.compressionProbe={requested:['zlib'],negotiated:compressor,available:false};continue;}
   for(let sample=1;sample<=3;sample++)for(const query of ['ping','minimal','baselineOperational','optimizedOperational']){
    const before=received(client),start=performance.now(),doc=query==='ping'?await client.db().command({ping:1}):query==='minimal'?await c.findOne({_id:'state'},{projection:{_id:1}}):await c.aggregate([{$match:{_id:'state'}},{$project:query==='baselineOperational'?legacyProjection:R.operationalProjection({screen:'overview'})}]).next();
    const ms=performance.now()-start,text=JSON.stringify(doc?.data||doc),row={compressed,compressor,sample,query,ms:Math.round(ms*100)/100,jsonBytes:Buffer.byteLength(text),socketBytesReceived:received(client)-before,connectMs:Math.round(connectMs)};
    if(doc?.data){const s=doc.data;require('../src/domain').expire(s);row.visibleMetrics={rooms:s.rooms.length,clean:s.rooms.filter(r=>r.status==='CLEAN_VACANT').length,occupied:s.rooms.filter(r=>r.status==='OCCUPIED').length,pending:s.bookings.filter(b=>b.status==='PENDING').length};}report.samples.push(row);console.log(JSON.stringify(row));
   }
   const plan=await c.aggregate([{$match:{_id:'state'}},{$project:R.operationalProjection({screen:'overview'})}]).explain('executionStats');
   const stats=plan.executionStats||plan.stages?.find(s=>s.$cursor)?.$cursor.executionStats;report.samples.push({compressed,query:'explain',serverExecutionMs:stats?.executionTimeMillis,documentsExamined:stats?.totalDocsExamined});
  }finally{await client.close();}
 }
 const payloads=new Set(report.samples.filter(s=>s.visibleMetrics).map(s=>JSON.stringify(s.visibleMetrics)));report.sameVisibleMetrics=payloads.size===1;
 const out=path.join(__dirname,'../docs/performance/live-20261020/atlas-projection-ab.json');await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2));assert(report.sameVisibleMetrics,'State changed or view metrics differ');
})().catch(e=>{console.error(e.name);process.exitCode=1;});
