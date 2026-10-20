'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Store}=require('../src/store'),{project}=require('./helpers/projection-fixture.cjs');
const data={
 homestays:[{_id:'h1',name:'Một',active:true,images:['HUGE_IMAGE'],settings:{private:'HUGE_SETTINGS'}},{_id:'h2',name:'Hai',active:false,description:'PRIVATE_DESCRIPTION'}],
 settings:{private:'GLOBAL_SETTINGS'},platformVersion:1,receptionInvoiceAccessVersion:1,
 users:[{_id:'u1',username:'Admin',email:'admin@example.test',password:'HASH',sessionVersion:2,role:'admin',active:true},{_id:'u2',username:'Other',email:'other@example.test',password:'OTHER_HASH',role:'owner',active:true}],
 bookings:[{bookingCode:'PRIVATE_BOOKING'}],aiConversations:[{userId:'u1',messages:[{content:'PRIVATE_HISTORY'}]}]
};
function mongoStore(){
 const store=new Store({mode:'mongo'}),doc={_id:'state',data},reads=[];
 store.collection={aggregate:pipeline=>({next:async()=>{const projection=pipeline.at(-1).$project;reads.push(projection);return project(doc,projection);}})};
 return {store,reads};
}
test('authentication projection keeps only property identity and the exact account',async()=>{
 const {store,reads}=mongoStore(),s=await store.readAuth('u1');
 assert.deepEqual(s.homestays,[{_id:'h1',name:'Một',active:true},{_id:'h2',name:'Hai',active:false}]);
 assert.equal(s.users.length,1);assert.equal(s.users[0]._id,'u1');assert.equal(s.users[0].password,'HASH');assert.equal(s.users[0].sessionVersion,2);
 assert.equal(s.bookings.length,0);assert.equal(s.aiConversations.length,0);assert.deepEqual(s.settings,{});
 const text=JSON.stringify(s);for(const privateValue of ['HUGE_IMAGE','HUGE_SETTINGS','GLOBAL_SETTINGS','PRIVATE_DESCRIPTION','PRIVATE_BOOKING','PRIVATE_HISTORY','OTHER_HASH'])assert(!text.includes(privateValue));
 const projection=reads[0];assert(projection['data.homestays']?.$map);assert(!projection['data.settings']);assert(!projection['data.bookings']);assert(!projection['data.aiConversations']);
});
test('login projection remains case-insensitive while using the same minimal property shape',async()=>{
 const {store}=mongoStore(),s=await store.readLogin(' ADMIN@EXAMPLE.TEST ');assert.deepEqual(s.users.map(u=>u._id),['u1']);assert.deepEqual(s.homestays.map(h=>Object.keys(h).sort()),[['_id','active','name'],['_id','active','name']]);
});
test('file authentication mirrors the minimal Mongo account shape',async()=>{
 const store=new Store({mode:'file'});store.state=structuredClone(data);const s=await store.readAuth('u1');assert.deepEqual(s.homestays,[{_id:'h1',name:'Một',active:true},{_id:'h2',name:'Hai',active:false}]);assert.equal(s.users[0]._id,'u1');assert(!JSON.stringify(s).includes('HUGE_IMAGE'));
});
