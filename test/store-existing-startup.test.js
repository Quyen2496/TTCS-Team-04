'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),m=require('mongoose');
const {Store}=require('../src/store');
async function fixture(exists,fn){
 const originalConnect=m.connect,originalCollection=m.connection.collection;let options,reads=0,writes=0;
 m.connect=async(uri,input)=>{options=input;return m;};
 const forbidden=async()=>{writes++;throw Error('UNEXPECTED_STARTUP_WRITE');};
 m.connection.collection=()=>({findOne:async(filter,input)=>{reads++;assert.deepEqual(filter,{_id:'state'});assert.deepEqual(input.projection,{_id:1});return exists?{_id:'state'}:null;},createIndex:forbidden,updateOne:forbidden});
 try{await fn(new Store({mode:'mongo',uri:'mongodb://example.invalid/isolated-test'}),()=>({options,reads,writes}));}finally{m.connect=originalConnect;m.connection.collection=originalCollection;}
}
test('Existing-data startup validates existing state without indexes, upserts or migrations',()=>fixture(true,async(store,result)=>{
 store.mutate=async()=>{throw Error('MIGRATION_FORBIDDEN');};await store.init({existingOnly:true});
 const r=result();assert.equal(r.writes,0);assert.equal(r.reads,1);
}));
test('Existing-data startup refuses a missing state instead of creating production data',()=>fixture(false,async(store,result)=>{
 await assert.rejects(store.init({existingOnly:true}),/STATE_NOT_FOUND/);assert.equal(result().writes,0);
}));
