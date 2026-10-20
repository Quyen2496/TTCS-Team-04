'use strict';
((root,factory)=>{if(typeof module==='object'&&module.exports)module.exports=factory;else root.HS.bookingReturn=factory(root);})(globalThis,env=>{
 const key='hs_booking_return',ttl=30*60000,now=()=>Date.now(),target='/modules/bookings/index.html';
 const day=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 function safe(value){
  if(typeof value!=='string'||value.length>1500||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return null;
  let url;try{url=new URL(value,env.location.origin);}catch{return null;}
  if(url.origin!==env.location.origin||url.pathname!==target)return null;
  const q=url.searchParams,out=new URLSearchParams();
  if(!/^[a-f0-9]{24}$/i.test(q.get('roomTypeId')||''))return null;out.set('roomTypeId',q.get('roomTypeId').toLowerCase());
  if(q.has('homestayId')){if(!/^[a-f0-9]{24}$/i.test(q.get('homestayId')||''))return null;out.set('homestayId',q.get('homestayId').toLowerCase());}
  if(!day(q.get('checkIn'))||!day(q.get('checkOut')))return null;
  const nights=(Date.parse(q.get('checkOut'))-Date.parse(q.get('checkIn')))/86400000,count=Number(q.get('guestCount'));
  if(nights<1||nights>30||!Number.isInteger(count)||count<1||count>100)return null;
  for(const k of ['checkIn','checkOut','guestCount'])out.set(k,q.get(k));out.set('resume','booking');return target+'?'+out;
 }
 function save(value){const next=safe(value);if(!next)return null;try{env.sessionStorage.setItem(key,JSON.stringify({next,expires:now()+ttl}));}catch{}return next;}
 function peek(){try{const s=JSON.parse(env.sessionStorage.getItem(key)||'null');if(!s||s.expires<=now()||s.expires>now()+ttl+1000){env.sessionStorage.removeItem(key);return null;}return safe(s.next);}catch{return null;}}
 function consume(){const next=peek();env.sessionStorage.removeItem(key);return next;}
 function login(criteria){const next=save(target+'?'+new URLSearchParams(criteria));if(!next)throw Error('Chưa lưu được phòng đã chọn. Bạn chọn lại phòng nhé.');env.location.href='/login.html?next='+encodeURIComponent(next);}
 return {safe,save,peek,consume,login};
});
