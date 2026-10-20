'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const factory=require('../public/js/booking-return'),D=require('../src/domain'),A=require('../src/access');
const read=f=>fs.readFileSync(path.join(__dirname,'../public',f),'utf8');
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),clear:()=>data.clear()};};
const criteria={roomTypeId:'a'.repeat(24),homestayId:'b'.repeat(24),checkIn:D.add(D.today(),1),checkOut:D.add(D.today(),3),guestCount:'2'};
const target='/modules/bookings/index.html?'+new URLSearchParams(criteria);
function context(){const env={location:{origin:'https://homestay.example',pathname:'/login.html',search:'',href:''},sessionStorage:storage()};env.HS={bookingReturn:factory(env)};return env;}
test('Booking return only retains valid local room/date/guest criteria, drops PII and blocks open redirects',()=>{
 const e=context(),b=e.HS.bookingReturn;
 assert.match(b.save(target+'&email=private@example.test'),/resume=booking/);assert(!b.peek().includes('private'));assert(!b.peek().includes('email'));
 for(const bad of ['https://evil.example'+target,'//evil.example/x','/\\evil.example/x','/admin.html?next='+target,'/modules/bookings/index.html?roomTypeId=invalid',target.replace(criteria.checkOut,'2026-02-31'),target.replace('guestCount=2','guestCount=0')])assert.equal(b.safe(bad),null,bad);
 b.login(criteria);assert(e.location.href.startsWith('/login.html?next='));assert(b.consume());assert.equal(b.peek(),null);
 e.sessionStorage.setItem('hs_booking_return',JSON.stringify({next:target,expires:Date.now()-1}));assert.equal(b.peek(),null);
});
function node(){return {lastChild:{textContent:''},hidden:false,disabled:false,value:'',textContent:'',className:'',listeners:{},classList:{toggle(){},add(){}},addEventListener(type,fn){this.listeners[type]=fn;},before(){},setAttribute(){},removeAttribute(){},querySelectorAll(){return [];},querySelector(){return {disabled:false,hidden:false};},elements:[],reportValidity(){return true;},setCustomValidity(){},scrollIntoView(){},focus(){},closest(){return this;},after(){},remove(){},reset(){}};}
async function account(env,mode,token='test-token',failed=false){
 env.location.pathname='/'+mode;const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);};
 const links=['/login.html','/register.html','/forgot-password.html'].map(href=>({href,getAttribute(){return href;}}));
 env.document={getElementById:get,querySelectorAll:()=>links,createElement:()=>node()};
 const requested=[];Object.assign(env.HS,{formData:()=>({username:'guest',password:'Test12345',confirmPassword:'Test12345'}),api:async(url)=>{requested.push(url);if(failed)throw Error('Sai mật khẩu');return {token,user:{_id:'c'.repeat(24),role:'guest',email:'guest@example.test'}};}});
 vm.runInNewContext(read('js/account.js'),{...env,URL,URLSearchParams,console});
 await get('account-form').listeners.submit({preventDefault(){}});return {elements,links,requested};
}
test('Successful login resumes selected room and carries next through registration link; failed login retains selection',async()=>{
 const e=context();e.location.search='?next='+encodeURIComponent(target);const result=await account(e,'login.html');
 assert.match(result.links[1].href,/register.html\?next=/);assert(e.location.href.startsWith('/modules/bookings/index.html?'));assert(e.location.href.includes(criteria.roomTypeId));assert.equal(e.sessionStorage.getItem('hs_token'),'test-token');assert.equal(e.HS.bookingReturn.peek(),null);
 const failed=context();failed.location.search='?next='+encodeURIComponent(target);const retry=await account(failed,'login.html','',true);assert.equal(failed.location.href,'');assert(failed.HS.bookingReturn.peek());assert.match(retry.elements.get('account-error').textContent,/Sai mật khẩu/);
});
test('Registration completes authentication and resumes same room; invalid next cannot redirect outside site',async()=>{
 const e=context();e.HS.bookingReturn.save(target);await account(e,'register.html');assert(e.location.href.includes(criteria.roomTypeId));
 const other=context();other.location.search='?next='+encodeURIComponent('https://evil.example');await account(other,'login.html');assert.equal(other.location.href,'/account.html');
});
async function booking(env,criteria,{authenticated=false,noAvailability=false}={}){
 const data=D.seedData();A.upgrade(data);const type=data.roomTypes[0],chosen={...criteria,roomTypeId:type._id,homestayId:type.homestayId};
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,node());return elements.get(id);};get('guestCount').value='2';get('policyAccepted').checked=false;get('booking-section').hidden=true;get('quote-section').hidden=true;
 const urls=[];env.location.pathname='/modules/bookings/index.html';env.location.search='?'+new URLSearchParams(chosen);env.location.href=env.location.pathname+env.location.search;
 if(authenticated)env.sessionStorage.setItem('hs_token','logged-in');else env.sessionStorage.removeItem('hs_token');
 env.HS.api=async url=>url==='/api/auth/me'?{role:'guest',email:'guest@example.test',fullName:'Guest'}:{};env.HS.thumbnail=x=>x;env.HS.iconHTML=()=>'';
 const fetcher=async(url,options)=>{urls.push(url);let result;if(url.startsWith('/api/bookings/availability'))result=noAvailability?{roomTypes:[]}:D.availability(data,Object.fromEntries(new URL(url,env.location.origin).searchParams));else result=D.quote(data,JSON.parse(options.body));return new Response(JSON.stringify({success:true,data:result}));};
 vm.runInNewContext(read('modules/bookings/js/booking.js'),{...env,document:{getElementById:get},fetch:fetcher,AbortController,Response,URL,URLSearchParams,crypto,setTimeout,clearTimeout,console});
 for(let i=0;i<25;i++)await new Promise(r=>setImmediate(r));return {elements,chosen,urls};
}
test('Visitor can view quote; pressing continue requires login and retains exact room, property, dates, guests',async()=>{
 const e=context(),b=await booking(e,criteria);assert.equal(b.elements.get('quote-content').hidden,false);assert.equal(b.elements.get('booking-section').hidden,true);
 await b.elements.get('continue-button').listeners.click();assert(e.location.href.startsWith('/login.html?next='));const next=e.HS.bookingReturn.peek();for(const [k,v]of Object.entries(b.chosen))assert.equal(new URL(next,e.location.origin).searchParams.get(k),String(v));
});
test('After authentication resume reloads current quote and opens same room form with unchecked policy; sold-out room stops safely',async()=>{
 const e=context(),b=await booking(e,{...criteria,resume:'booking'},{authenticated:true});assert.equal(b.elements.get('booking-section').hidden,false);assert.equal(b.elements.get('policyAccepted').checked,false);assert(b.urls.some(url=>url==='/api/bookings/quote'));
 const sold=context(),r=await booking(sold,{...criteria,resume:'booking'},{authenticated:true,noAvailability:true});assert.equal(r.elements.get('booking-section').hidden,true);assert.match(r.elements.get('search-message').textContent,/Không còn phòng/);
});
