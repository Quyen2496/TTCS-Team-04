'use strict';
const P=require('./ai-provider'),D=require('./domain');
const numberWords={mot:1,hai:2,ba:3,bon:4,nam:5,sau:6,bay:7,tam:8,chin:9,muoi:10};
const aliases={wifi:['wifi','wi-fi'],aircon:['dieu hoa','may lanh'],kitchen:['bep','nau an'],pool:['ho boi','be boi'],balcony:['ban cong'],parking:['do xe','dau xe','bai xe'],washer:['may giat'],tv:['tivi','tv'],breakfast:['bua sang','an sang']};
const familyCount=(q,label)=>{const m=q.match(new RegExp('\\b(\\d+|mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi)\\s+(?:'+label+')\\b'));return m?(numberWords[m[1]]??Number(m[1])):undefined;};
function budgetValue(raw,unit){
 const value=unit?Number(raw.replace(',','.')):Number(raw.replace(/[.,]/g,''));
 const amount=Math.round(value*(/tr|trieu/.test(unit||'')?1000000:/k|nghin|ngan/.test(unit||'')?1000:1));
 if(!Number.isSafeInteger(amount)||amount<1||amount>10000000000)D.fail('Ngân sách cần là số tiền VND hợp lệ.');return amount;
}
function parse(question,previous={},slots={}){
 const q=P.normalize(question),out={...previous};
 for(const key of ['budget','budgetPeriod','budgetScope','adults','children','childAges','amenities'])if(slots[key]!==undefined)out[key]=slots[key];
 const adults=familyCount(q,'nguoi lon'),children=familyCount(q,'tre em|tre|be');
 if(adults!==undefined||children!==undefined){if(adults!==undefined)out.adults=adults;if(children!==undefined)out.children=children;if(children!==undefined&&children!==previous.children)out.childAges=[];}
 const ages=[...q.matchAll(/\b(\d{1,2})\s*tuoi\b/g)].map(m=>Number(m[1]));
 if(ages.length){if(ages.some(n=>n>17))D.fail('Bạn nhập tuổi của trẻ từ 0 đến 17 nhé.');out.childAges=ages;}
 if(out.adults!==undefined&&out.children!==undefined){out.guestCount=out.adults+out.children;if(!Number.isInteger(out.guestCount)||out.guestCount<1||out.guestCount>100)D.fail('Tổng số người phải từ 1 đến 100.');}
 if(/bo gioi han ngan sach|khong gioi han ngan sach/.test(q))out.budget=null;
 else{
  const m=q.match(/(?:ngan sach(?:\s+(?:khoang|tam|toi da|la))?|toi da|khong qua|duoi|khoang|tam)\s*(\d+(?:[.,]\d+)*)\s*(trieu|tr\b|nghin|ngan|k\b)?/);
  if(/(?:ngan sach|toi da|khong qua)\s*-\s*\d/.test(q))D.fail('Ngân sách phải lớn hơn 0.');
  if(m&&(m[2]||/ngan sach|toi da|khong qua|duoi/.test(m[0])||/^\s*(?:d\b|vnd|dong)/.test(q.slice(m.index+m[0].length)))){out.budget=budgetValue(m[1],m[2]);out.budgetPeriod=/ca ky|ca chuyen|tong ngan sach|toan bo.*(?:ky|dem)|cho ca/.test(q)?'stay':'night';out.budgetScope=/moi phong|\/phong/.test(q)?'room':'group';}
 }
 const removed=Object.entries(aliases).filter(([,names])=>names.some(name=>q.includes('khong can '+name)||q.includes('bo yeu cau '+name))).map(([key])=>key);
 const amenities=Object.entries(aliases).filter(([key,names])=>!removed.includes(key)&&names.some(name=>q.includes(name))).map(([key])=>key);
 if(amenities.length)out.amenities=[...new Set([...(out.amenities||[]),...amenities])];
 if(removed.length)out.amenities=(out.amenities||[]).filter(key=>!removed.includes(key));
 if(/khong can tien nghi|bo yeu cau tien nghi/.test(q))out.amenities=[];
 if(out.children!==undefined&&(out.childAges||[]).length>out.children)D.fail('Số tuổi đã nhập nhiều hơn số trẻ. Bạn kiểm tra lại số trẻ và tuổi từng bé nhé.');
 return out;
}
function hasRoomFollowup(question){return /ngan sach|toi da|khong qua|tre em|nguoi lon|\btuoi\b|ngay mai|hom nay|\d+\s*dem|\b(wifi|dieu hoa|bep|ban cong|ho boi|may giat)\b/.test(P.normalize(question));}
function matches(card,c){
 if(c.budget){const nights=c.checkIn&&c.checkOut?(Date.parse(c.checkOut)-Date.parse(c.checkIn))/86400000:1;let charge=card.price/(c.budgetPeriod==='stay'?1:nights);if(c.budgetScope==='room')charge=card.roomPrices?Math.max(...card.roomPrices)/(c.budgetPeriod==='stay'?1:nights):charge/card.roomCount;if(charge>c.budget)return false;}
 const names=card.amenities.map(P.normalize).join(' ');
 return (c.amenities||[]).every(key=>(aliases[key]||[key]).some(name=>names.includes(P.normalize(name))));
}
function note(c){
 const parts=[];
 if(c.budget)parts.push('ngân sách tối đa '+c.budget.toLocaleString('vi-VN')+' ₫ / '+(c.budgetPeriod==='stay'?'cả kỳ':'đêm')+(c.budgetScope==='room'?' / phòng':' cho cả nhóm'));
 if(c.amenities?.length)parts.push('tiện nghi: '+c.amenities.map(key=>aliases[key]?.[0]||key).join(', '));
 return parts.length?' Mình đã lọc theo '+parts.join('; ')+'.':'';
}
module.exports={parse,matches,note,hasRoomFollowup,aliases};
