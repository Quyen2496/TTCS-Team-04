'use strict';
const A=require('./access'),D=require('./domain');
const kinds=['rooms','room_types','homestays'],breakdowns=['none','property','room_type'],scopes=['selected','all_assigned'];
const norm=q=>String(q||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
function valid(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['kind','breakdown','scope'].includes(k))||!kinds.includes(value.kind)||value.breakdown!==undefined&&!breakdowns.includes(value.breakdown)||value.scope!==undefined&&!scopes.includes(value.scope))throw Error('INVALID_AI_OUTPUT');
 return {kind:value.kind,breakdown:value.breakdown||'none',scope:value.scope||'selected'};
}
function resolve(question,previous={}){
 const q=norm(question),old=previous.inventory;
 if(/\bbooking\b|thanh toan|tien coc|tra phong|nhan phong/.test(q))return null;
 if(/tai khoan|phan quyen|vai tro|nhan vien|nhat ky|sao luu|cau hinh he thong/.test(q))return null;
 // Availability, occupancy, financial reports and group-size recommendations
 // are separate datasets. A catalog total must never substitute for them.
 if(/phong trong|con trong|con phong|con bao nhieu|co khach|dang o|da thue|cho thue|cong suat|doanh thu|gia|bao cao|bao gia|bao nhieu nguoi|bao nhieu khach/.test(q))return null;
 const count=/bao nhieu|co may|tong (?:so|cong|hop)|so luong|dem (?:het|tat ca|phong|loai)|thong ke/.test(q),noun=/phong|homestay|co so/.test(q);
 const allTypes=/^(?:vay |the |con )?(?:ca|tat ca|toan bo)\s+(?:(?:\d+|cac|nhung)\s+)?(?:loai(?: phong)?|phong|homestay)(?:\s+(?:luon|nhe|di|do|nay|hien tai|trong he thong))*[.!?\s]*$/.test(q);
 const reference=old&&/^(?:vay |the |con )?(?:tong cong|tat ca|ca he thong|gop lai|cong lai|theo tung homestay|tung homestay|theo loai phong|tung loai phong)[.!?\s]*$/.test(q);
 if(!(count&&noun||allTypes&&(old||previous.intent==='room_detail')||reference))return null;
 const positive=q.split(/[,;.!?]|\bnhung\b/).filter(c=>!/^\s*(?:khong phai|khong can|dung)\b/.test(c)).join(' ');
 let kind=/(?:bao nhieu|co may|tong(?: so)?|so luong)\s+(?:cac )?loai phong|dem.*loai phong/.test(positive)?'room_types':/(?:bao nhieu|co may|tong(?: so)?|so luong)\s+(?:homestay|co so)/.test(positive)?'homestays':count?'rooms':old?.kind||'rooms';
 const scope=/homestay dang chon|co so dang chon|homestay nay|co so nay/.test(q)?'selected':/tat ca|toan bo|toan he thong|ca he thong|tong he thong|moi homestay|ca \d+ loai/.test(q)||allTypes?'all_assigned':old?.scope||'selected';
 const breakdown=/theo (?:tung )?loai|tung loai|chia.*loai/.test(q)?'room_type':/theo (?:tung )?homestay|tung homestay|moi (?:homestay|co so)|chia.*homestay/.test(q)?'property':old?.breakdown||'none';
 return {intent:'policy',topic:'general',inventory:{kind,scope,breakdown}};
}
function assert(u,inventory,publicCatalog=u.role==='guest'){valid(inventory);if(!publicCatalog&&(u.role==='guest'||!A.can(u,'rooms.view')))D.fail('Tài khoản chưa được cấp quyền tra cứu tổng danh mục phòng nội bộ.','FORBIDDEN',403);}
function result(s,u,question,plan,previous={}){
 if(!plan.inventory)return null;const v=valid(plan.inventory),guest=plan.publicCatalog??u.role==='guest';assert(u,v,guest);
 const properties=s.homestays.filter(h=>!guest||h.active),ids=new Set(properties.map(h=>h._id)),types=[...new Map(s.roomTypes.filter(t=>ids.has(t.homestayId)&&(!guest||t.active)).map(t=>[t._id,t])).values()],publicTypes=new Map(types.map(t=>[t._id,t])),rooms=[...new Map(s.rooms.filter(r=>ids.has(r.homestayId)&&(!guest||publicTypes.get(r.roomTypeId)?.homestayId===r.homestayId)).map(r=>[r._id,r])).values()];
 const count=v.kind==='rooms'?rooms.length:v.kind==='room_types'?types.length:properties.length,unit=v.kind==='rooms'?'phòng':v.kind==='room_types'?'loại phòng':'homestay';
 const scope=guest?(properties.length===1?'homestay '+properties[0].name+' đang công khai':'các homestay đang công khai trên website'):v.scope==='all_assigned'?(u.role==='admin'?'toàn bộ homestay trong hệ thống':'toàn bộ homestay được giao cho tài khoản'):properties.length===1?'homestay '+properties[0].name:'các homestay đang được phép xem';
 let answer='Tổng số '+unit+' hiện có là '+count+' '+unit+', tính trong '+scope+'.';
 if(v.kind==='rooms')answer+=' Đã cộng toàn bộ '+types.length+' loại phòng tại '+properties.length+' homestay trong phạm vi này.';
 if(v.kind==='room_types')answer+=' Đây là số bản ghi loại phòng theo từng homestay; các loại trùng tên ở hai cơ sở được tính riêng.';
 if(guest){answer=v.kind==='homestays'?'Hiện có '+count+' homestay đang công khai trong phạm vi bạn đang xem.':v.kind==='room_types'?'Hiện có '+count+' loại phòng đang giới thiệu tại '+properties.length+' homestay trong phạm vi bạn đang xem.':'Tổng số phòng hiện có là '+count+' phòng thuộc các loại phòng đang công khai trong phạm vi bạn đang xem; đây là danh mục giới thiệu, chưa phải số phòng trống theo ngày.';if(v.breakdown==='property')answer+=' Số lượng của từng homestay ở bảng bên dưới.';}
 let columns=['Chỉ tiêu','Số lượng'],rows=[[v.kind==='rooms'?'Tổng phòng vật lý':v.kind==='room_types'?'Tổng loại phòng':'Tổng homestay',count]];
 if(v.breakdown==='property'){
  columns=['Homestay',unit==='phòng'?'Số phòng vật lý':unit==='loại phòng'?'Số loại phòng':'Số homestay'];rows=properties.map(h=>[h.name,v.kind==='rooms'?rooms.filter(r=>r.homestayId===h._id).length:v.kind==='room_types'?types.filter(t=>t.homestayId===h._id).length:1]);
 }else if(v.breakdown==='room_type'&&v.kind==='rooms'){
  columns=['Homestay','Loại phòng','Số phòng vật lý'];rows=types.map(t=>[properties.find(h=>h._id===t.homestayId)?.name||'',t.name,rooms.filter(r=>r.roomTypeId===t._id).length]);
  const known=new Set(types.map(t=>t._id));for(const h of properties){const missing=rooms.filter(r=>r.homestayId===h._id&&!known.has(r.roomTypeId)).length;if(missing)rows.push([h.name,'Chưa có loại phòng hợp lệ',missing]);}
 }
 if(rows.length>5000)D.fail('Danh mục vượt giới hạn trả lời. Bạn chọn một cơ sở hoặc hỏi tổng trước.','AI_RESULT_LIMIT',400);
 const context={intent:'policy',topic:'general',inventory:{...v,summary:'Đã đếm '+unit+' từ danh mục thật trong phạm vi quyền; phân biệt với phòng trống hoặc phòng có khách.'}};
 if(guest){
  const next=require('./ai-guest-catalog').prompt(previous,!properties.length||v.kind!=='homestays'&&!count);answer+=' '+next.question;
  if(Object.keys(next.search).length)context.roomSearch=require('./ai-provider').publicContext(next.search);
  if(next.offer)context.catalogOffer=next.offer;
  return {intent:'policy',answer,answerValue:{type:'count',value:count,unit,entity:v.kind,scope:v.scope,definition:'Danh mục đang công khai trên website'},columns,rows:rows.slice(0,200),totalRows:rows.length,metrics:[['Tổng '+unit,count]],sources:['Danh mục homestay và loại phòng đang công khai tại thời điểm trả lời'],permission:null,propertyIds:properties.map(h=>h._id),suppressExport:true,publicCatalog:true,context,narrationFacts:{RESULT:{label:'Câu trả lời từ danh mục công khai, không phải số phòng trống',value:answer.slice(0,-next.question.length).trim()},QUESTION:{label:'Một câu hỏi tư vấn tiếp nối dựa trên nhu cầu đã biết',value:next.question}}};
 }
 return {intent:'policy',answer,answerValue:{type:'count',value:count,unit,entity:v.kind,scope:v.scope,definition:v.kind==='rooms'?'tổng phòng vật lý trong danh mục':unit},columns,rows:rows.slice(0,200),...(rows.length>200?{exportRows:rows}:{}),totalRows:rows.length,metrics:[['Tổng '+unit,count],['Loại phòng',types.length],['Homestay',properties.length]],sources:['Danh mục homestay, loại phòng và phòng tại thời điểm tra cứu'],permission:'rooms.view',propertyIds:properties.map(h=>h._id),audienceRole:u.role,context,narrationFacts:{COUNT:{kind:'count',label:'Tổng số '+unit+' đã đếm từ dữ liệu thực',value:String(count)},SCOPE:{label:'Phạm vi các cơ sở được tính',value:scope},NOTE:{label:'Định nghĩa số liệu phải giữ nguyên',value:v.kind==='rooms'?'Tổng phòng vật lý trong danh mục; không phải số phòng trống theo ngày':'Bản ghi hiện có trong danh mục được cấp quyền'}}};
}
function context(p={}){const v=p.inventory;if(!v)return null;return {kind:kinds.includes(v.kind)?v.kind:null,breakdown:breakdowns.includes(v.breakdown)?v.breakdown:null,scope:scopes.includes(v.scope)?v.scope:null,summary:typeof v.summary==='string'?v.summary.slice(0,400):''};}
module.exports={kinds,breakdowns,scopes,valid,resolve,assert,result,context};
