'use strict';
// Read-only server-side byte accounting; only field names/counts/sizes leave DB.
const fs=require('node:fs/promises'),path=require('node:path');require('dotenv').config({path:path.join(__dirname,'../.env')});const{MongoClient}=require('mongodb');
(async()=>{const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:6000});try{await client.connect();const c=client.db().collection('homestay_state'),report={at:new Date().toISOString(),readOnly:true,database:'actual Atlas',sections:{}};
 for(const section of ['bookings','rooms','roomTypes']){
  const rows=await c.aggregate([{$match:{_id:'state'}},{$project:{rows:{$map:{input:{$ifNull:['$data.'+section,[]]},as:'row',in:{$objectToArray:'$$row'}}}}},{$unwind:'$rows'},{$unwind:'$rows'},{$group:{_id:'$rows.k',bytes:{$sum:{$bsonSize:{v:'$rows.v'}}},records:{$sum:1}}},{$sort:{bytes:-1}}]).toArray();report.sections[section]=rows.map(({_id,...rest})=>({field:_id,...rest}));
 }
 await fs.writeFile(path.join(__dirname,'../docs/performance/live-20261020-next/field-bytes.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await client.close();}})().catch(e=>{console.error(e.name);process.exitCode=1;});
