const fs=require('node:fs/promises');const path=require('node:path');const {seedData,AppError}=require('./domain');
class Store {
 constructor({mode='mongo',uri,file}){Object.assign(this,{mode,uri,file});this.queue=Promise.resolve();}
 async init(){if(this.mode==='file'){await fs.mkdir(path.dirname(this.file),{recursive:true});try{this.state=JSON.parse(await fs.readFile(this.file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;this.state=seedData();await this.saveFile(this.state);}}else{const mongoose=require('mongoose');await mongoose.connect(this.uri,{serverSelectionTimeoutMS:6000});this.mongoose=mongoose;this.collection=mongoose.connection.collection('homestay_state');await this.collection.updateOne({_id:'state'},{$setOnInsert:{revision:0,data:seedData()}},{upsert:true});}}
 async saveFile(data){const temp=this.file+'.tmp';await fs.writeFile(temp,JSON.stringify(data,null,2));await fs.rename(temp,this.file);}
 async read(){return this.mode==='file'?structuredClone(this.state):(await this.collection.findOne({_id:'state'})).data;}
 async mutate(fn){if(this.mode==='file'){const work=this.queue.then(async()=>{const copy=structuredClone(this.state),result=fn(copy);await this.saveFile(copy);this.state=copy;return result;});this.queue=work.catch(()=>{});return work;}
 for(let attempt=0;attempt<30;attempt++){const doc=await this.collection.findOne({_id:'state'});const result=fn(doc.data);const changed=await this.collection.updateOne({_id:'state',revision:doc.revision},{$set:{data:doc.data},$inc:{revision:1}});if(changed.modifiedCount===1)return result;}throw new AppError(409,'STATE_CONFLICT','Dữ liệu đang được cập nhật. Vui lòng thử lại.');}
 async close(){await this.queue;if(this.mongoose)await this.mongoose.disconnect();}
}
module.exports={Store};
