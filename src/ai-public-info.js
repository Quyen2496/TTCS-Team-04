'use strict';
// Server-owned read requests, distinct from staff workflows and catalog counts.
// Only these public fields may enter a result, even when the actor is Admin.
const norm=q=>require('./ai-provider').normalize(q);
function resolve(question){
 const request=require('./ai-public-request').resolve(question);if(request)return request;
 const q=norm(question);
 // A booking's received deposit/balance is private transaction data, not a
 // request for a property's public deposit percentage.
 if(/\bbooking\s+(?=[a-z0-9]{0,7}\d)[a-z0-9]{8}\b|da coc|con (?:phai|thieu).*coc|con phai (?:thu|thanh toan)/.test(q))return null;
 if(/doanh thu|cong suat|bao cao|tai khoan|nhan vien|noi bo|chua cong khai|ngung hoat dong|ghi (?:tien )?coc|(?:doi|sua|cap nhat|cau hinh).*(?:gia|chinh sach|gio|coc)|gan phong|xac nhan booking/.test(q))return null;
 if(/so dien thoai|email khach|danh sach khach|khach dang o/.test(q))return null;
 const topics=[];
 if(/(?:nhan phong|check.?in).*(?:may gio|luc nao|thoi gian)|gio nhan(?: phong)?/.test(q))topics.push('checkin');
 if(/(?:tra phong|check.?out).*(?:may gio|luc nao|thoi gian)|gio tra(?: phong)?/.test(q))topics.push('checkout');
 if(/(?:can|phai|muc|ty le|phan tram|tien|dat) coc.*(?:bao nhieu|the nao|phan tram)|(?:coc|dat coc)\s*(?:bao nhieu|may phan tram)|(?:bao nhieu|may).*phan tram.*coc/.test(q))topics.push('deposit');
 if(topics.length)return {intent:'policy',topic:topics[0],publicInfo:{kind:'policies',topics}};
 if(/\b(?:homestay|co so)\b/.test(q)&&/(?:nhung|cac)\s+(?:homestay|co so)\s+nao|(?:homestay|co so)\s+nao.*(?:nhan khach|dang mo|hoat dong)|(?:danh sach|liet ke|gioi thieu).*\b(?:homestay|co so)\b|xem homestay dang cong khai/.test(q)&&!/bao nhieu|co may|so luong|tong so|phong trong|con phong/.test(q))return {intent:'policy',topic:'general',publicInfo:{kind:'catalog'}};
 return null;
}
function result(s,u,question,plan,previous={}){
 const service=require('./ai-public-services').result(s,u,question,plan,previous);if(service)return service;
 const request=plan.publicInfo;if(!request)return null;
 let properties=s.homestays.filter(h=>h.active),named=properties.filter(h=>norm(h.name).length>=3&&norm(question).includes(norm(h.name)));
 // A named property takes precedence within the already-public view. Never
 // silently substitute another property's policy if the name did not match.
 if(named.length)properties=named;
 const base={intent:'policy',publicCatalog:true,permission:null,suppressExport:true,propertyIds:properties.map(h=>h._id)};
 const context={intent:'policy',topic:plan.topic,publicInfo:request};
 if(request.kind==='catalog'){
  const next=require('./ai-guest-catalog').prompt(previous,!properties.length),answer=properties.length?'Hiện có '+properties.length+' homestay đang công khai trên website, mình liệt kê bên dưới. Trạng thái này chưa xác nhận còn phòng cho ngày bạn muốn ở. '+next.question:'Hiện chưa có homestay đang công khai trong phạm vi bạn chọn. Bạn có thể bỏ bộ lọc cơ sở để xem lại danh mục.';
  if(Object.keys(next.search).length)context.roomSearch=require('./ai-provider').publicContext(next.search);
  if(next.offer)context.catalogOffer=next.offer;
  return {...base,answer,columns:['Homestay','Khu vực'],rows:properties.map(h=>[h.name,h.destination||'Chưa cập nhật']),totalRows:properties.length,sources:['Danh mục homestay đang công khai; chưa kiểm tra phòng trống theo ngày'],context,narrationFacts:{RESULT:{label:'Danh mục công khai và một câu hỏi tư vấn tiếp nối',value:answer}}};
 }
 const labels={checkin:'Giờ nhận phòng',checkout:'Giờ trả phòng',deposit:'Tỷ lệ cọc trên tổng giá booking'},columns=['Homestay',...request.topics.map(t=>labels[t])];
 const rows=properties.map(h=>{const st=s._aiPolicies?.[h._id]||h.settings||s.settings||{},percent=st.payment?.depositPercent||30;return [h.name,...request.topics.map(t=>t==='checkin'?st.checkInTime||'Chưa cập nhật':t==='checkout'?st.checkOutTime||'Chưa cập nhật':Number.isFinite(percent)&&percent>0&&percent<=100?percent+'%':'Chưa cập nhật')];});
 let answer=!rows.length?'Chưa tìm thấy chính sách của homestay đang công khai trong phạm vi này. Bạn chọn lại cơ sở cần hỏi nhé.':rows.length===1?'Tại '+rows[0][0]+', '+request.topics.map((t,i)=>labels[t].toLocaleLowerCase('vi-VN')+' là '+rows[0][i+1]).join('; ')+'.':'Mình liệt kê '+request.topics.map(t=>labels[t].toLocaleLowerCase('vi-VN')).join(' và ')+' theo từng homestay bên dưới. Bạn đang quan tâm cơ sở nào?';
 if(request.topics.includes('deposit'))answer+=' Đây là chính sách hiện tại; số tiền cọc cụ thể cần tổng giá và chính sách đã chốt trên booking, không phải số tiền đã nhận.';
 return {...base,answer,columns,rows,totalRows:rows.length,sources:['Giờ nhận/trả và chính sách cọc hiện tại của từng homestay'],context,narrationFacts:{RESULT:{label:'Trả đúng các chính sách công khai được hỏi, không phải thống kê phòng hay thao tác ghi cọc',value:answer}}};
}
function selection(s,question,selected){
 const matches=s.homestays.filter(h=>h.active&&norm(h.name).length>=3&&norm(question).includes(norm(h.name)));
 return matches.length===1?matches[0]._id:/tat ca|toan bo|toan he thong/.test(norm(question))?null:selected;
}
module.exports={resolve,result,selection};
