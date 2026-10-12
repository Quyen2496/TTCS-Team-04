 'use strict';
const D=require('./domain');
function text(v,max,label){const s=String(v??'').trim();if(s.length>max)D.fail(label+' quá dài.');return s;}
function person(body,{requiredId=false}={}){
 const birthDate=text(body.birthDate,10,'Ngày sinh'),gender=text(body.gender,20,'Giới tính'),nationality=text(body.nationality,100,'Quốc tịch'),documentType=text(body.documentType||'NATIONAL_ID',20,'Loại giấy tờ'),idNumber=text(body.idNumber,30,'Số giấy tờ'),address=text(body.guestAddress,500,'Địa chỉ');
 if(birthDate&&(!D.day(birthDate)||birthDate>D.today()||birthDate<'1900-01-01'))D.fail('Ngày sinh phải hợp lệ, từ năm 1900 đến hôm nay.');
 if(!['','MALE','FEMALE','OTHER'].includes(gender))D.fail('Giới tính không hợp lệ.');
 if(!['NATIONAL_ID','PASSPORT'].includes(documentType)||requiredId&&!idNumber||idNumber&&!(documentType==='PASSPORT'?/^[a-zA-Z0-9]{5,20}$/:/^\d{9}(\d{3})?$/).test(idNumber))D.fail('CCCD/CMND cần 12 hoặc 9 số; hộ chiếu cần 5–20 chữ hoặc số.');
 return {birthDate,gender,nationality,documentType,idNumber,guestAddress:address};
}
function checkin(body,b){
 const lead=person(body,{requiredId:true}),phone=text(body.phone??b.phone,30,'Điện thoại'),email=text(body.email??b.email,254,'Email').toLowerCase();
 if(phone&&!/^0[35789]\d{8}$/.test(phone)||email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))D.fail('Điện thoại hoặc email khách chưa hợp lệ.');
 lead.guestAddress=body.guestAddress===undefined?b.guestAddress||'':lead.guestAddress;lead.nationality=body.nationality===undefined?b.nationality||'':lead.nationality;
 let details=[];if(body.companionDetails!==undefined){if(!Array.isArray(body.companionDetails)||body.companionDetails.length!==(body.companions||[]).length)D.fail('Thông tin khách đi cùng chưa đủ.');details=body.companionDetails.map((p,i)=>{if(!p||typeof p!=='object')D.fail('Thông tin khách đi cùng không hợp lệ.');return {...person(p),fullName:body.companions[i].trim()};});}
 return {...lead,phone,email,companionDetails:details};
}
module.exports={person,checkin};
