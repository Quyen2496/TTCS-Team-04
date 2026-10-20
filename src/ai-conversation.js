'use strict';
const D=require('./domain'),A=require('./access'),Data=require('./ai-data'),P=require('./ai-provider'),Policy=require('./ai-policy'),Prefs=require('./ai-preferences');
const roomIntents=new Set(['recommendation','availability','quote','room_detail']);
const date=d=>String(d||'').split('-').reverse().join('/');
const money=n=>Number(n||0).toLocaleString('vi-VN')+' ₫';
const id=v=>typeof v==='string'&&/^[a-f0-9]{24}$/.test(v);
const unsafe=q=>/\b(jwt(?:[_-]secret)?|smtp[_-]pass|api[_ ]key|secret|mongodb|bo qua quy tac|system prompt)\b|\b(drop\s+table|delete\s+from|truncate\s+table|update\s+\w+\s+set)\b/i.test(P.normalize(q));
function localPlan(q,previous={},action,user,source){
 if(source)q=require('./ai-query-scope').routingQuestion(source,q);
 const n=P.normalize(q);
 if(!action){
  const publicRequest=require('./ai-public-request').resolve(q);if(publicRequest)return publicRequest;
  const serviceInfo=require('./ai-service-info').plan(q);if(serviceInfo)return serviceInfo;
  const Capability=require('./ai-capability'),Dialogue=require('./ai-dialogue');
  if(Capability.generalInquiry(q)||/kha nang cua ai trong chat/.test(n))return {intent:'policy',capability:{mode:'general'}};
  const guiding=/huong dan|can kiem tra|kiem tra.*(?:man hinh|o dau)|mo (?:muc|o)|thao tac o dau|truoc khi|xu ly nhu the nao/.test(n);
  if(guiding&&user?.role!=='guest'){
   const resolved=Dialogue.resolve(q,previous,user);
   if(resolved?.dialogue)return {...resolved,explicitLookup:true};
   const operation=Object.keys(Dialogue.operations).find(k=>Dialogue.operations[k].pattern.test(n));
   const subject=operation?Dialogue.operations[operation].subject:/email/.test(n)?'email':Object.keys(Dialogue.modules).find(k=>Dialogue.modules[k].aliases.test(n));
   if(subject&&!(subject==='accounts'&&!operation&&!/huong dan|o dau|man hinh/.test(n)))return {intent:'policy',explicitLookup:true,dialogue:{task:'workflow',subject,...(operation?{operation}:{})}};
  }
  if(user?.role==='guest'&&/huy.*booking/.test(n)&&/can kiem tra|truoc|huong dan/.test(n))return {intent:'policy',capability:{mode:'guide',operation:'own_cancel'}};
  if(/\b(?:chon|xem|gioi thieu)\b.*(?:phuong an|phong|loai).*\b(?:so|thu)\s*(?:\d+|mot|hai|ba|bon|nam|sau)\b/.test(n))return {intent:'room_detail',explicitLookup:true};
  if(/\bbooking\s+(?=[a-z0-9]{0,7}\d)[a-z0-9]{8}\b/.test(n)&&!/huong dan|can kiem tra|muon huy|ghi.*coc|xac nhan|xoa|sua|doi ngay|lap hoa don|gui.*email/.test(n))return {intent:'booking',explicitLookup:true};
  if(/^(?:xuat|tai)\b/.test(n)&&previous.exportSourceId)return {intent:'export',explicitLookup:true};
  if(/trinh bay lai|tom tat.*(?:ket qua|bao cao)|ngan gon.*giu nguyen so lieu/.test(n)&&previous.intent==='report')return {intent:'report',metric:previous.metric,reportPeriod:{from:previous.from,to:previous.to},explicitLookup:true};
  if(/cong suat|doanh thu|doanh so|thuc thu|thu nhap|bao cao booking/.test(n)){
   const positive=n.replace(/(?:chu )?khong phai (?:doanh thu|cong suat)/g,'').split(/[,;.!?]/).filter(c=>!/^\s*(?:khong phai|khong can)/.test(c)).join(' ');
   const metric=/cong suat/.test(positive)?'occupancy':/doanh thu|doanh so|thuc thu|thu nhap/.test(positive)?'revenue':'booking_value';
   if(!/huong dan|khac.*(?:coc|booking)|vi sao|chua chac|co the.*bao cao|bao cao nao|quyen/.test(n))return {intent:'report',metric,reportPeriod:Data.period(q,previous),explicitLookup:true};
  }
  if(['report','arrivals','departures'].includes(previous.intent)&&/^(?:con |va |the )?(?:thang|nam|hom nay|ngay mai|hom qua|tu ngay|tu \d)/.test(n))return {intent:previous.intent,metric:previous.metric,...(previous.intent==='report'?{reportPeriod:Data.period(q,previous)}:{}),explicitLookup:true};
  if(/(?:nhan|tra) phong/.test(n)&&/hom nay|ngay mai|du kien/.test(n)&&!/huong dan|quy trinh/.test(n)){const positive=n.replace(/(?:chu )?khong phai (?:doanh thu|cong suat)/g,'').split(/[,;.!?]/).filter(c=>!/^\s*khong phai/.test(c)).join(' ');return {intent:/tra phong/.test(positive)?'departures':'arrivals',explicitLookup:true};}
  if(/can don|don phong|buong phong|sach trong|ban trong/.test(n)&&!/huong dan|quy trinh|quyen|danh dau|cap nhat|hoan tat|truoc khi/.test(n))return {intent:'housekeeping',explicitLookup:true};
  if(/tien nghi|gia tham khao/.test(n)&&/phong/.test(n))return {intent:'room_detail',explicitLookup:true,...(/tien nghi/.test(n)&&!/gia|bao nhieu tien/.test(n)?{amenitiesOnly:true}:{})};
  if(/chua (?:co tai khoan|dang nhap).*(?:xem phong|dat phong)|huong dan khach dat phong/.test(n))return {intent:'policy',topic:'booking',explicitLookup:true};
  if(/(?:tai khoan|toi).*(?:vai tro (?:gi|nao)|theo vai tro nao)|toi dang duoc ho tro theo vai tro/.test(n))return {intent:'policy',explicitLookup:true,dialogue:{task:'self_permissions',targetRole:user?.role||'guest'}};
  if(/chuyen khoan.*(?:coc|booking).*(?:vao dau|the nao)|coc.*booking.*vao dau/.test(n))return {intent:'policy',topic:'deposit',explicitLookup:true};
  if(/^(?:xuat|tai) (?:luon|ngay)(?: di)?[.!?\s]*$/.test(n))return {intent:'export',explicitLookup:true};
 }
 const publicInfo=require('./ai-public-info').resolve(q);if(publicInfo&&!action)return publicInfo;
 const catalogFollowup=require('./ai-guest-catalog').followup(q,previous,user);if(catalogFollowup&&!action)return catalogFollowup;
 const explanation=require('./ai-explanation').resolve(q);if(explanation&&!action)return explanation;
 const capability=require('./ai-capability').resolve(q,previous,user);if(capability&&!action)return capability;
 const inventory=require('./ai-inventory').resolve(q,previous);if(inventory&&!action)return inventory;
 const dialogue=require('./ai-dialogue').resolve(q,previous,user);if(dialogue&&!action)return dialogue;
 const knowledge=require('./ai-knowledge').plan(q,previous,user);if(knowledge&&!action)return knowledge;
 if(unsafe(q))return {intent:'unsupported'};
 const servicePlan=require('./ai-service-voice').plan(q,previous);if(servicePlan&&!action)return servicePlan;
 if(action)return {intent:action.type==='select_room'?'room_detail':'export'};
 if(require('./ai-search-profile').isRefinement(q))return {intent:'recommendation',searchRefinement:true};
 if(/^(co|co nhe|dong y|duoc|ok|oke|yes|khong|khong can|de sau)[.!?\s]*$/.test(n)&&previous.exportState==='offer')return {intent:'export'};
 if(/\b(xuat|tai|luu|in)\b.*\b(file|excel|execl|xlsx|pdf|bao cao|du lieu)\b|^(excel|execl|pdf|xlsx)( nhe)?[.!?\s]*$/.test(n)&&!/(bao cao|thong ke|doanh thu|cong suat|tim phong|bao gia|phong trong)/.test(n))return {intent:'export'};
 // Explicit topic changes take precedence over remembered room dates.
 if(/bao cao|doanh thu|doanh so|thuc thu|thu nhap|cong suat|ty le lap day/.test(n))return Data.localPlan(q,previous);
 if(/booking|ma dat phong/.test(n)&&!/chinh sach|huong dan|quy trinh/.test(n))return /\b(xoa|huy|doi|sua|xac nhan|tao)\s+(booking|dat phong)/.test(n)?Data.localPlan(q,previous):{intent:'booking'};
 if(/khach (?:den|di|nhan|tra)|phong ban|don phong|phong sach|buong phong|chinh sach|gio nhan|gio tra|huong dan|quy trinh|hoan coc|tien coc|dat coc|quen mat khau|doi mat khau/.test(n))return Data.localPlan(q,previous);
 if((roomIntents.has(previous.intent)||previous.roomSearch)&&Prefs.hasRoomFollowup(q)&&!/bao cao|doanh thu|cong suat|booking|chinh sach|gio nhan|gio tra/.test(n))return {intent:/ngan sach|toi da|tien nghi|wifi|ban cong|ho boi/.test(n)?'recommendation':(previous.selectedTypeId||previous.roomSearch?.selectedTypeId)?'room_detail':'recommendation'};
 if(/(?:tim phong|phong trong|bao gia)/.test(n)&&/ngan sach|tre em|nguoi lon|wifi|ban cong|bep|ho boi/.test(n))return {intent:'recommendation'};
 if(/phong.*(?:co khach|da co khach|da duoc thue|dang duoc thue|da cho thue)|(?:so luong|bao nhieu).*phong.*thue/.test(n))return {intent:'occupied'};
 if(/\b(gioi thieu|goi y|de xuat|tu van)\b.*phong|phong.*(?:phu hop|nen chon)|\b(?:\d+|hai|ba|bon|nam|sau|muoi)\s+(?:nguoi|khach).*o.*phong/.test(n))return {intent:'recommendation'};
 if(/tien nghi|tien ich|dien tich|phong do|loai do|phong nay|loai nay|xem chi tiet.*phong|(?:toi|minh|em) chon.*phong|phong (?:thu|so)\s*(?:\d+|mot|hai|ba|bon|nam|sau)/.test(n))return {intent:'room_detail'};
 if(previous.choices?.length&&(/^(?:toi |minh |em )?chon\b/.test(n)||/^phong (?!trong|co khach|can don|ban|sach)/.test(n)))return {intent:'room_detail'};
 if(roomIntents.has(previous.intent)&&(/^(con |va |the )?(?:\d+|mot|hai|ba|bon|nam|sau|bay|tam|chin|muoi)\s+(?:nguoi|khach)/.test(n)||/^(tu |ngay |nhan |tra |o \d|luu tru )/.test(n)||/\b(?:ngay mai|hom nay|\d+\s*dem)\b/.test(n)||Data.extractDates(q).length))return {intent:previous.selectedTypeId?'room_detail':'recommendation'};
 if(/chinh sach|hoan coc|huy booking.*ap dung/.test(n))return Data.localPlan(q,previous);
 if(/(?:khach hang|khach).*da dat phong/.test(n))return {intent:'booking'};
 if(/booking|ma dat phong/.test(n)&&!/\b(xoa|huy|doi|sua|xac nhan|tao)\s+(booking|dat phong)/.test(n)&&!/chinh sach|huong dan|quy trinh/.test(n))return {intent:'booking'};
 if(/ban.*(?:ho tro|lam duoc|co the)|toi co the hoi|minh co the hoi/.test(n))return {intent:'help'};
 return Data.localPlan(q,previous);
}
function validateAction(action){
 if(action===undefined)return null;
 if(!action||typeof action!=='object'||Array.isArray(action)||!['select_room','export_request','export_decline'].includes(action.type)||!id(action.messageId)||Object.keys(action).some(k=>!['type','messageId','roomTypeId'].includes(k))||action.type==='select_room'&&!id(action.roomTypeId)||action.type!=='select_room'&&action.roomTypeId!==undefined)D.fail('Lựa chọn chưa hợp lệ. Bạn mở lại kết quả rồi chọn nhé.');
 return {type:action.type,messageId:action.messageId,...(action.type==='select_room'?{roomTypeId:action.roomTypeId}:{})};
}
function permitted(u,p){if(p&&!A.can(u,p))D.fail('Phần dữ liệu này chưa được cấp cho tài khoản của bạn. Bạn có thể hỏi nội dung khác trong phạm vi của mình nhé.','FORBIDDEN',403);}
function exportable(r,u){return !!(r.columns?.length&&r.rows?.length&&!r.restricted&&!r.suppressExport&&Policy.canExport(u,r));}
function visibleResult(s,u,r){return Policy.canView(s,u,r);}
function criteria(q,previous,slots={}){
 const old=roomIntents.has(previous.intent)?previous:(previous.roomSearch||{}),preferences=Prefs.parse(q,old,slots),c={...preferences,...Data.dateCriteria(q,preferences)},dates=Data.extractDates(q),explicitGuests=Data.extractGuests(q);
 if(explicitGuests!==undefined&&!/nguoi lon|tre em|\btre\b|\bbe\b/.test(P.normalize(q))){c.guestCount=explicitGuests;delete c.adults;delete c.children;delete c.childAges;}else c.guestCount=preferences.adults!==undefined&&preferences.children!==undefined?preferences.adults+preferences.children:explicitGuests??slots.guestCount??preferences.guestCount;
 if(!dates.length&&!/ngay mai|hom nay/.test(P.normalize(q))&&slots.checkIn)c.checkIn=slots.checkIn;if(dates.length<2&&slots.checkOut)c.checkOut=slots.checkOut;
 const nights=P.normalize(q).match(/(\d+)\s*dem/);c.nights=nights?Number(nights[1]):slots.nights??old.nights;
 if(c.checkIn&&c.nights&&(nights||slots.nights||dates.length===1&&!/ngay tra|tra phong|den ngay/.test(P.normalize(q))))c.checkOut=D.add(c.checkIn,c.nights);
 if(c.checkIn&&c.checkOut)c.nights=(Date.parse(c.checkOut)-Date.parse(c.checkIn))/86400000;
 if(dates.length===1&&/\b(?:tra phong|ngay tra|den ngay|tra ngay)\b/.test(P.normalize(q))&&old.checkIn){c.checkIn=old.checkIn;c.checkOut=dates[0];}
 for(const d of Data.extractDates(q))if(!D.day(d))D.fail('Ngày này chưa hợp lệ. Bạn nhập ngày theo dd/MM/yyyy hoặc YYYY-MM-DD nhé.');
 if(c.checkIn&&!c.checkOut&&old.checkOut&&c.checkIn>=old.checkOut)c.checkOut=undefined;
 if(c.checkIn&&c.checkIn<D.today())D.fail('Ngày nhận đã qua rồi. Bạn chọn hôm nay hoặc một ngày sắp tới nhé.');
 if(c.checkIn&&c.checkOut&&c.guestCount)D.criteria(c);
 return c;
}
function distribution(total,max){const count=Math.ceil(total/max),base=Math.floor(total/count),extra=total%count;return Array.from({length:count},(_,i)=>base+(i<extra?1:0));}
function describe(s,t,c){
 const h=s.homestays.find(h=>h._id===t.homestayId),st=s._aiPolicies?.[h?._id]||s.settings,guests=c.guestCount||t.standardCapacity,parts=distribution(guests,t.maxCapacity),dated=!!(c.checkIn&&c.checkOut),physical=s.rooms.filter(r=>r.roomTypeId===t._id);
 const available=dated?D.freeRooms(s,{...c,roomTypeId:t._id}).length:null;
 const quoteState={...s,settings:st,pricingCalendar:s._aiCalendars?.[t.homestayId]||{}};
 const roomPrices=parts.map(guestCount=>dated?D.quote(quoteState,{...c,guestCount,roomTypeId:t._id}).totalAmount:(t.weekdayPrice||0)+Math.max(0,guestCount-t.standardCapacity)*(st.extraGuestPerNight||0)),price=roomPrices.reduce((sum,value)=>sum+value,0);
 return {roomTypeId:t._id,name:t.name,homestayId:t.homestayId,homestayName:h?.name||'',destination:h?.destination||'',locationEvidence:h?.style||'',roomKind:require('./ai-search-profile').kind(t),photo:t.photo||'',area:t.area||null,standardCapacity:t.standardCapacity,maxCapacity:t.maxCapacity,description:String(t.description||'').slice(0,1200),amenities:s.amenities.filter(a=>a.active&&(t.amenityIds||[]).includes(a._id)).map(a=>a.name),roomCount:parts.length,distribution:parts,guestCount:guests,price,roomPrices,priceLabel:dated?'Tổng giá cả nhóm / '+((Date.parse(c.checkOut)-Date.parse(c.checkIn))/86400000)+' đêm':'Giá ngày thường tham khảo / đêm cho cả nhóm',availableCount:available,inventoryCount:physical.length,checkIn:c.checkIn||null,checkOut:c.checkOut||null,checkInTime:st.checkInTime,checkOutTime:st.checkOutTime};
}
const base=(s,u,intent)=>({intent,propertyIds:s.homestays.map(h=>h._id),permission:null,publicCatalog:true});
function recommendation(s,u,q,previous,slots={}){
 const b=base(s,u,'recommendation');permitted(u,b.permission);const c=criteria(q,previous,slots),context={intent:'recommendation',...c};
 if(c.children>0&&(c.childAges||[]).length<c.children)return {...b,answer:'Mình ghi nhận '+(c.adults??'chưa rõ số')+' người lớn và '+c.children+' trẻ em'+(c.guestCount?' ('+c.guestCount+' người)':'')+'.'+Prefs.note(c)+' Bạn cho mình tuổi của từng bé để tư vấn sức chứa và làm rõ phụ thu nhé. Chính sách miễn giảm theo tuổi cần được cơ sở xác nhận.',columns:[],rows:[],sources:['Nhu cầu khách cung cấp'],context,needsChildAges:true};
 if(!c.guestCount)return {...b,answer:'Mình sẽ giúp bạn chọn loại phòng phù hợp.'+Prefs.note(c)+' Nhóm mình có bao nhiêu người vậy?',columns:[],rows:[],sources:['Danh mục loại phòng'],context};
 if(c.budget&&c.budgetPeriod==='stay'&&(!c.checkIn||!c.checkOut))return {...b,answer:'Mình đã ghi nhận tổng ngân sách '+money(c.budget)+' cho cả kỳ.'+Prefs.note(c)+' Bạn cho mình ngày nhận và ngày trả hoặc số đêm để kiểm tra tổng giá đúng nhé.',columns:[],rows:[],sources:['Nhu cầu khách cung cấp'],context};
 const namedProperties=s.homestays.filter(h=>[h.name,h.destination].some(value=>value&&P.normalize(value).length>=3&&P.normalize(q).includes(P.normalize(value))));
 if(namedProperties.length){c.preferredPropertyIds=namedProperties.map(h=>h._id);const property=namedProperties[0];c.destinationQuery=P.normalize(q).includes(P.normalize(property.name))?property.name:property.destination;context.destinationQuery=c.destinationQuery;}
 if(c.preferredPropertyIds?.length)context.preferredPropertyIds=c.preferredPropertyIds;
 const named=s.roomTypes.filter(t=>P.normalize(q).includes(P.normalize(t.name)));
 const all=s.roomTypes.filter(t=>t.active&&s.homestays.some(h=>h.active&&h._id===t.homestayId)&&(!named.length||named.some(x=>x._id===t._id))&&(!c.preferredPropertyIds?.length||c.preferredPropertyIds.includes(t.homestayId))&&require('./ai-search-profile').matches(s.homestays.find(h=>h._id===t.homestayId),t,c)).map(t=>describe(s,t,c)).filter(t=>t.inventoryCount>=t.roomCount&&(t.availableCount===null||t.availableCount>=t.roomCount)&&Prefs.matches(t,c));
 all.sort((a,b)=>a.roomCount-b.roomCount||a.price-b.price||a.maxCapacity-b.maxCapacity||a.name.localeCompare(b.name));
 const cards=all.slice(0,6),dated=!!(c.checkIn&&c.checkOut),single=cards.some(t=>t.roomCount===1);
 let answer=cards.length?'Với '+c.guestCount+' người'+(dated?', từ '+date(c.checkIn)+' đến '+date(c.checkOut):'')+', mình gợi ý các phương án dưới đây. '+(!single?'Nhóm mình cần chia thành nhiều phòng vì chưa có một phòng đủ sức chứa. ':'')+'Bạn bấm vào loại phòng muốn xem để mình giới thiệu tiện nghi và thông tin cụ thể nhé.':'Mình chưa tìm được phương án cùng loại đủ chỗ cho '+c.guestCount+' người'+(dated?' trong những ngày này':' trong danh mục hiện có')+'. Bạn có thể đổi ngày hoặc trao đổi lễ tân để chia nhóm sang nhiều loại phòng.';
 if(!cards.length&&(c.budget||c.amenities?.length||c.landscapes?.length||c.roomKinds?.length||c.destinationQuery))answer='Mình chưa tìm được phương án đáp ứng đủ các điều kiện bạn yêu cầu trong danh mục công khai. Bạn muốn đổi khu vực, loại phòng hay điều chỉnh ngân sách?';
 answer+=Prefs.note(c);
 if(c.children>0)answer+=' Giá tạm tính mỗi trẻ là một khách trong sức chứa; chưa áp dụng miễn giảm theo tuổi. Lễ tân cần xác nhận chính sách trẻ em.';
 if(cards.length)answer+=dated?' Giá đã tính theo từng đêm và phụ thu; mình chưa giữ phòng.':' Mình chưa xác nhận phòng trống theo ngày lưu trú. Bạn dự định nhận và trả phòng ngày nào?';
 return {...b,answer,presentation:'rooms',cards,columns:['Homestay','Loại phòng','Số phòng cần','Chia số khách','Tối đa mỗi phòng',dated?'Tổng giá cả nhóm (VND)':'Giá ngày thường tham khảo cả nhóm/đêm (VND)'],rows:cards.map(t=>[t.homestayName,t.name,t.roomCount,t.distribution.join(' + '),t.maxCapacity,t.price]),totalRows:cards.length,sources:dated?['Danh mục và tiện nghi loại phòng','Lịch giữ phòng','Bảng giá từng đêm và phụ thu']:['Danh mục và tiện nghi loại phòng','Sức chứa','Giá ngày thường và phụ thu tham khảo'],context:{...context,choices:cards.map(t=>t.roomTypeId)},followUps:dated?[]:['Nhóm mình ở 2 đêm từ ngày mai']};
}
function roomDetail(s,u,q,previous,chosenId,slots={},options={}){
 const b=base(s,u,'room_detail');permitted(u,b.permission);const n=P.normalize(q),c=criteria(q,previous,slots),choices=(previous.choices||[]).map(x=>s.roomTypes.find(t=>t._id===x)).filter(Boolean);
 const words={mot:1,hai:2,ba:3,bon:4,nam:5,sau:6},ordinal=n.match(/(?:thu|so)\s*(\d+|mot|hai|ba|bon|nam|sau)\b/);let matches=[];
 if(chosenId)matches=s.roomTypes.filter(t=>t._id===chosenId);
 else if(ordinal){const index=(words[ordinal[1]]||Number(ordinal[1]))-1;if(choices[index])matches=[choices[index]];}
 else{matches=s.roomTypes.filter(t=>n.includes(P.normalize(t.name)));if(matches.length>1&&previous.choices?.length)matches=matches.filter(t=>previous.choices.includes(t._id));if(!matches.length&&previous.selectedTypeId&&/phong do|phong nay|loai do|loai nay|tien nghi|tien ich|dien tich|bao gia|gia|ngay|dem|nguoi|khach/.test(n))matches=s.roomTypes.filter(t=>t._id===previous.selectedTypeId);}
 matches=matches.filter(t=>t.active&&s.homestays.some(h=>h.active&&h._id===t.homestayId));
 if(matches.length!==1)return {...b,answer:matches.length>1?'Tên loại phòng này có ở nhiều cơ sở. Bạn chọn đúng loại và homestay trong danh sách gợi ý giúp mình nhé.':'Bạn muốn xem loại phòng nào? Bạn có thể bấm một phương án vừa được gợi ý hoặc nhắn tên loại phòng nhé.',columns:[],rows:[],sources:['Danh mục loại phòng'],context:{...previous,intent:'room_detail'}};
 const t=matches[0],detail=describe(s,t,options.amenitiesOnly?{...c,checkIn:undefined,checkOut:undefined}:c),dated=!options.amenitiesOnly&&!!(c.checkIn&&c.checkOut),enough=detail.availableCount===null||detail.availableCount>=detail.roomCount;
 if(c.children>0&&(c.childAges||[]).length<c.children)return recommendation(s,u,q,previous,slots);
 const answer='Đây là '+t.name+' tại '+detail.homestayName+'. '+(detail.description||'Cơ sở chưa cập nhật mô tả phòng.')+'\nPhòng dành cho '+t.standardCapacity+' người tiêu chuẩn, tối đa '+t.maxCapacity+' người'+(t.area?', diện tích '+t.area+' m²':'')+'. '+(detail.roomCount>1?'Với nhóm '+detail.guestCount+' người, mình đề xuất '+detail.roomCount+' phòng, chia '+detail.distribution.join(' + ')+' người. ':'')+(dated?(enough?'Hiện còn đủ phòng cho phương án này. Tổng giá cả nhóm là '+money(detail.price)+', đã gồm phụ thu.':'Hiện không còn đủ phòng cho phương án này. Mình có thể gợi ý lại loại khác hoặc bạn đổi ngày nhé.'):'Giá dưới đây là tham khảo ngày thường. Mình cần ngày lưu trú để xác nhận giá và phòng trống.')+Prefs.note(c)+(!Prefs.matches(detail,c)?' Phương án đang chọn chưa đáp ứng bộ lọc hiện tại; bạn có thể nhờ mình gợi ý lại.':'')+(c.children>0?' Giá tạm tính mỗi trẻ là một khách; cơ sở cần xác nhận miễn giảm theo tuổi.':'')+'\nBạn muốn xem báo giá theo ngày hay mở trang phòng để xem ảnh?';
 const qs=new URLSearchParams({roomTypeId:t._id,homestayId:t.homestayId,guestCount:String(detail.distribution[0])});if(dated){qs.set('checkIn',c.checkIn);qs.set('checkOut',c.checkOut);}
 return {...b,answer,presentation:'room_detail',detail,columns:['Thông tin','Chi tiết'],rows:[['Homestay',detail.homestayName],['Loại phòng',t.name],['Diện tích (m²)',t.area||'Chưa cập nhật'],['Khách tiêu chuẩn',t.standardCapacity],['Khách tối đa mỗi phòng',t.maxCapacity],['Số phòng cần cho nhóm',detail.roomCount],['Chia số khách',detail.distribution.join(' + ')],['Tiện nghi',detail.amenities.join(', ')||'Cơ sở chưa cập nhật'],[detail.priceLabel,detail.price],['Nhận / trả phòng',detail.checkInTime+' / '+detail.checkOutTime]],sources:['Danh mục, mô tả và tiện nghi loại phòng',dated?'Bảng giá từng đêm và lịch giữ phòng':'Giá tham khảo ngày thường','Chính sách cơ sở'],context:{intent:'room_detail',...c,selectedTypeId:t._id,choices:previous.choices||[t._id]},links:[{label:'Xem phòng và ảnh',url:'/room-detail.html?id='+t._id+'&'+qs},{label:dated&&enough?'Mở đặt phòng'+(detail.roomCount>1?' cho từng phòng':''):'Chọn ngày và xem giá',url:'/modules/bookings/index.html?'+qs}]};
}
function occupied(s,u,q,previous){
 permitted(u,'reports.view');const n=P.normalize(q),explicit=Data.extractDates(q),historical=explicit.length>0||/da co khach|da duoc thue|da cho thue|tu ngay|tu \d|thang|nam/.test(n);let rows,answer,context={intent:'occupied'};
 if(!historical){rows=s.homestays.map(h=>[h.name,s.rooms.filter(r=>r.homestayId===h._id&&r.status==='OCCUPIED').length]);answer='Hiện có '+rows.reduce((sum,r)=>sum+r[1],0)+' phòng đang có khách trong các cơ sở bạn được xem. Mình đếm theo trạng thái phòng đang có khách tại thời điểm tra cứu.';}
 else{let text=q;if(explicit.length===1&&/den (hien tai|bay gio|hom nay)/.test(n))text+=' '+D.today();const p=Data.period(text,previous);context={...context,...p};rows=s.homestays.map(h=>{const ids=new Set();for(const b of s.bookings.filter(b=>b.homestayId===h._id&&['CHECKED_IN','COMPLETED','CLOSED'].includes(b.status)))for(const seg of D.segments(b))if(seg.checkIn<=p.to&&seg.checkOut>p.from&&s.rooms.some(r=>r._id===seg.roomId&&r.homestayId===h._id))ids.add(seg.roomId);return [h.name,ids.size];});answer='Từ '+date(p.from)+' đến '+date(p.to)+', có '+rows.reduce((sum,r)=>sum+r[1],0)+' phòng khác nhau gắn với booking đã nhận hoặc đã trả, theo lịch lưu trú trong dữ liệu. Mỗi phòng chỉ đếm một lần; đây không phải số phòng đang có khách ngay lúc này.';}
 return {intent:'occupied',answer,columns:['Homestay',historical?'Phòng có booking đã nhận/đã trả trong kỳ':'Phòng đang có khách'],rows,totalRows:rows.length,sources:historical?['Booking CHECKED_IN/COMPLETED/CLOSED','Lịch lưu trú của phòng']:['Trạng thái phòng hiện tại'],permission:'reports.view',propertyIds:s.homestays.map(h=>h._id),context};
}
function natural(r,u,plan){
 if(plan.intent==='help'){
  const abilities=u.role==='housekeeping'?['xem phòng cần dọn và phòng sạch trong cơ sở được cấp','hướng dẫn nghiệp vụ buồng phòng']:['gợi ý phòng theo số người, ngân sách và tiện nghi','xem tiện nghi và báo giá','hướng dẫn đặt phòng và chính sách'];if(A.can(u,'reports.revenue')&&!A.can(u,'reports.view'))abilities.push('xem doanh thu hôm nay trong cơ sở được cấp');if(A.can(u,'reports.view'))abilities.push('xem báo cáo và tình hình lưu trú');if(A.can(u,'bookings.view'))abilities.push('tra booking, lịch khách đến/đi và việc cần xử lý');if(A.can(u,'housekeeping.view'))abilities.push('xem phòng cần dọn');if(u.role==='guest'&&A.can(u,'own-bookings.view'))abilities.push('xem booking của chính bạn');
  r.answer='Chào bạn! Mình có thể giúp bạn '+abilities.join(', ')+'.\n'+(u.role==='housekeeping'?'Bạn muốn kiểm tra phòng cần dọn hay phòng sạch trước?':u.role==='reception'?'Bạn muốn xem khách đến, khách trả hay kiểm tra một booking trước?':u.role==='owner'?'Bạn muốn xem tình hình cơ sở hay các việc cần xử lý hôm nay?':u.role==='report'?'Bạn muốn xem doanh thu hay công suất, trong khoảng thời gian nào?':u.role==='admin'?'Bạn muốn kiểm tra vận hành, booking hay báo cáo trước?':'Bạn đang tìm phòng cho bao nhiêu người, hay muốn kiểm tra thông tin nào trước?');
 }else if(plan.intent==='report'&&r.metric==='revenue')r.answer='Doanh thu từ '+date(r.context.from)+' đến '+date(r.context.to)+' là '+r.metrics.find(m=>m[0]==='Doanh thu')[1]+'. Số liệu lấy từ booking đã đóng có quyết toán, theo ngày trả thực tế; tiền cọc không được cộng thêm lần nữa.';
 else if(plan.intent==='report'&&r.metric==='occupancy')r.answer='Đây là công suất từ '+date(r.context.from)+' đến '+date(r.context.to)+', tính theo đêm phòng được đặt trên đêm khả dụng và loại các đêm bảo trì.';
 else if(plan.intent==='report')r.answer='Mình đã tổng hợp báo cáo từ '+date(r.context.from)+' đến '+date(r.context.to)+'. Bạn xem các chỉ số và bảng bên dưới nhé.\nGiá trị booking chưa phải doanh thu thực thu. Tỷ lệ đêm phòng được đặt loại các đêm bảo trì và giữ chỗ đang chờ.';
 else if(plan.intent==='booking')r.answer=r.rows.length?'Mình tìm thấy '+r.rows.length+' booking trong phạm vi tài khoản của bạn. Thông tin hiện tại ở bảng bên dưới nhé.':r.answer.startsWith('Nhập mã')?'Bạn gửi mình mã booking đủ 8 ký tự nhé, mình sẽ kiểm tra ngày lưu trú, trạng thái và số tiền đã ghi.':'Mình chưa tìm thấy booking này trong phạm vi tài khoản. Bạn kiểm tra lại mã nhé; booking cũ chưa gắn tài khoản có thể tra bằng mã và email ở trang Tra cứu.';
 else if(['arrivals','departures','housekeeping','alerts'].includes(plan.intent))r.answer=r.rows.length?'Mình tìm thấy '+r.totalRows+' mục phù hợp. Bạn xem danh sách bên dưới nhé. '+(plan.intent==='alerts'?'Đây là các việc cần kiểm tra, mình chưa tự xử lý booking hoặc tiền.':''):plan.intent==='housekeeping'?'Hiện chưa có phòng thuộc trạng thái bạn hỏi trong cơ sở được chọn.':'Mình chưa thấy dữ liệu phù hợp với yêu cầu này trong cơ sở và kỳ đang xem.';
 else if(plan.intent==='overview')r.answer='Đây là tình hình hiện tại của các cơ sở bạn được xem. Bạn muốn mình xem kỹ báo cáo hay phòng đang có khách?';
 else if(plan.intent==='unsupported')r.answer='Mình chưa hỗ trợ yêu cầu này. Mình có thể giúp bạn chọn phòng, xem booking được phép, hỏi chính sách hoặc tra dữ liệu homestay. Mình không thực thi lệnh SQL hay cung cấp mật khẩu và khoá hệ thống.';
 else if(plan.intent==='policy'&&plan.topic==='deposit'){
  if(u.role==='guest'||plan.publicCatalog)r.answer=!r.depositProvider?'Bạn mở Booking của tôi sau khi đăng nhập, hoặc Tra cứu booking bằng mã và email đã đặt; chọn booking rồi xem mục Đặt cọc / Chuyển khoản QR. Kênh thanh toán phụ thuộc cấu hình của cơ sở trên booking; nếu chưa có kênh phù hợp, bạn liên hệ lễ tân để được hướng dẫn. Mình chưa ghi nhận tiền hay xác nhận booking.':!r.paymentEnabled?'Cơ sở chưa bật chuyển khoản trên hệ thống. Bạn liên hệ lễ tân để được hướng dẫn đặt cọc nhé.':r.depositProvider==='payos'?'Bạn mở Booking của tôi hoặc Tra cứu booking, chọn Đặt cọc / Chuyển khoản QR rồi tạo QR payOS. Đối chiếu người nhận và số tiền trước khi chuyển; quay lại theo dõi tiền cọc sau khi payOS xác thực giao dịch. Đặt cọc không tự xác nhận booking.':'Bạn mở Booking của tôi hoặc Tra cứu booking, chọn Đặt cọc / Chuyển khoản QR nhé. Kiểm tra người nhận trước khi chuyển, rồi báo mã giao dịch để nhân viên đối soát. Thông báo đã chuyển chưa phải xác nhận đã nhận tiền.';
  else if(u.role==='housekeeping')r.answer='Ghi cọc thuộc nghiệp vụ lễ tân và cần quyền xử lý booking. Bạn có thể hỏi mình về phòng cần dọn hoặc phòng sạch trong cơ sở được cấp nhé.';
  else r.answer='Bạn ghi tiền cọc ở mục Booking & khách nhé: chọn booking, nhập số tiền, hình thức nhận, ngày nhận và tham chiếu nếu chuyển khoản. Nếu cần điều chỉnh, thêm một dòng mới trong sổ cọc để giữ lịch sử. Mình chỉ hướng dẫn ở đây, chưa ghi tiền hay xác nhận booking.';
 }
 return r;
}
function run(s,u,q,plan,previous={},options={}){
 Policy.check(u,plan.intent);
 const clarification=require('./ai-understanding').result(u,plan);if(clarification)return clarification;
 const serviceInfo=require('./ai-service-info').result(s,u,plan);if(serviceInfo)return serviceInfo;
 const publicInfo=require('./ai-public-info').result(s,u,q,plan,previous);if(publicInfo)return publicInfo;
 const explanation=require('./ai-explanation').result(s,u,q,plan);if(explanation)return explanation;
 const capability=require('./ai-capability').result(s,u,q,plan);if(capability)return capability;
 const inventory=require('./ai-inventory').result(s,u,q,plan,previous);if(inventory)return inventory;
 const dialogue=require('./ai-dialogue').result(s,u,q,plan);if(dialogue)return dialogue;
 const knowledge=require('./ai-knowledge').answer(s,u,q,plan,previous,options);if(knowledge)return knowledge;
 if(plan.intent==='recommendation')return recommendation(s,u,q,previous,plan.slots);
 if(plan.intent==='room_detail'){const r=roomDetail(s,u,q,previous,options.roomTypeId,plan.slots,plan);if(plan.amenitiesOnly&&r.detail)r.answer='Tiện nghi của '+r.detail.name+' tại '+r.detail.homestayName+': '+(r.detail.amenities.join(', ')||'cơ sở chưa cập nhật danh sách tiện nghi')+'.';return r;}
 if(plan.intent==='occupied')return occupied(s,u,q,previous);
 if(['availability','quote'].includes(plan.intent)&&!plan.explicitLookup&&previous.selectedTypeId&&roomIntents.has(previous.intent))return roomDetail(s,u,q,previous,previous.selectedTypeId,plan.slots);
 return require('./ai-service-voice').apply(s,u,q,plan,natural(Data.run(s,u,q,plan,previous),u,plan),previous);
}
function finish(r,u,q,messageId){
 r.exportable=exportable(r,u);r.exportsReady=r.exportable&&/\b(xuat|tai|luu|in)\b.*\b(file|excel|execl|xlsx|pdf|bao cao|du lieu)\b/.test(P.normalize(q));
 if(r.exportable){r.exportPrompt=r.exportsReady?null:'Bạn có muốn xuất kết quả này thành file Excel hoặc PDF không?';r.context={...r.context,exportSourceId:messageId,exportState:r.exportsReady?'ready':'offer'};if(r.exportsReady)r.exportTargetId=messageId;}
 return r;
}
module.exports={localPlan,validateAction,unsafe,visibleResult,exportable,run,finish,roomDetail};
