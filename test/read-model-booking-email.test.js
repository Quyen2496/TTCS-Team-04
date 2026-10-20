'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/read-model'),{project}=require('./helpers/projection-fixture.cjs');

const state={
 homestays:[{_id:'h',name:'H'}],settings:{version:1},platformVersion:1,receptionInvoiceAccessVersion:1,
 bookings:[
  {_id:'b1',homestayId:'h',bookingCode:'AAA00001',guestName:'Không được tải'},
  {_id:'b2',homestayId:'h',bookingCode:'BBB00002',guestName:'Mục tiêu'}
 ],
 emailJobs:[
  {bookingCode:'AAA00001',type:'CREATED',status:'SENT',attempts:[{private:'old-1'}],sentAt:'2026-10-19'},
  {bookingCode:'BBB00002',type:'CONFIRMED',status:'SENT',attempts:[{private:'target'}],sentAt:'2026-10-20',to:'private@example.test'},
  {bookingCode:'AAA00001',type:'REMINDER',status:'PENDING',attempts:[{private:'old-2'}]}
 ]
};

test('booking email projection fetches only the requested booking and its jobs',()=>{
 const options={profile:'booking_email',bookingCode:'BBB00002'},projection=R.operationalProjection(options),out=R.defaults(project({_id:'state',data:state},projection).data);
 assert.deepEqual(out.bookings,[{_id:'b2',homestayId:'h',bookingCode:'BBB00002'}]);
 assert.equal(out.emailJobs.length,1);
 assert.deepEqual(out.emailJobs[0],{bookingCode:'BBB00002',type:'CONFIRMED',status:'SENT',attempts:[{private:'target'}],sentAt:'2026-10-20'});
 assert(!JSON.stringify(out).includes('AAA00001'));
 assert(!JSON.stringify(out).includes('private@example.test'));
 assert(!JSON.stringify(out).includes('Không được tải'));
});

test('file-mode booking email shape matches filtered Mongo shape',()=>{
 const options={profile:'booking_email',bookingCode:'BBB00002'},fromFile=R.fromFile(state,options),fromProjection=R.defaults(project({_id:'state',data:state},R.operationalProjection(options)).data);
 assert.deepEqual(fromFile,fromProjection);
});
