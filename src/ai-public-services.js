'use strict';
const E=require('./ai-entities'),P=require('./ai-provider');
function result(s,u,question,plan,previous={}){
 const request=plan.publicInfo;if(!['services','stay_support'].includes(request?.kind))return null;
 const context={intent:'policy',topic:plan.topic,publicInfo:request};
 const finish=(answer,columns=[],rows=[],ids=[])=>({intent:'policy',publicCatalog:true,answer,columns,rows,totalRows:rows.length,permission:null,propertyIds:ids,suppressExport:true,sources:['Thông tin công khai và chính sách hiện tại của cơ sở; chưa xác nhận giao dịch'],context,narrationFacts:{RESULT:{label:'Câu trả lời đầy đủ từ dữ liệu và giới hạn đã xác minh',value:answer}}});
 if(request.kind==='stay_support')return finish('Bạn báo ngay cho lễ tân hoặc chủ homestay, mô tả thiết bị và tình trạng hỏng để cơ sở kiểm tra, hỗ trợ sử dụng phòng. Nếu an toàn, bạn ngừng sử dụng thiết bị và không tự tháo hoặc sửa. Mình chưa xác định nguyên nhân hay mức bồi thường và chưa tạo phiếu sự cố. Bạn đang ở homestay nào, phòng số mấy?');
 const identity=E.properties(s,question),active=s.homestays.filter(h=>h.active);
 if(identity.ambiguous)return finish('Có nhiều cơ sở phù hợp với tên bạn nêu: '+identity.matches.map(h=>h.name).join(', ')+'. Bạn muốn xem cơ sở nào?');
 const properties=identity.matches.length?identity.matches:identity.all?active:active.length===1?active:previous.publicPropertyId?active.filter(h=>h._id===previous.publicPropertyId):[];
 if(!properties.length){const label=request.topics.includes('cancellation')?'chính sách huỷ và hoàn tiền':request.topics.includes('breakfast')?'dịch vụ bữa sáng':request.topics.includes('payment_methods')?'các phương thức thanh toán':'dịch vụ trên Smart TV';const known=request.topics.includes('payment_methods')?'Apple Pay và Google Pay chưa được triển khai trong luồng thanh toán hiện tại của website; chuyển khoản QR phụ thuộc cấu hình của từng cơ sở. ':request.topics.includes('digital_services')?'Có Smart TV không xác nhận phòng đã có tài khoản Netflix hoặc YouTube Premium trả phí; mình cần thông tin cơ sở để kiểm tra. ':'';return finish(known+'Bạn muốn xem '+label+' của homestay nào?');}
 if(properties.length===1)context.publicPropertyId=properties[0]._id;
 const columns=['Homestay','Nội dung','Thông tin đã xác nhận'],rows=[],parts=[];
 if(request.topics.length===1&&request.topics[0]==='cancellation')columns.splice(0,columns.length,'Homestay','Trước giờ nhận ít nhất (giờ)','Tỷ lệ hoàn (%)');
 for(const h of properties){const st=s._aiPolicies?.[h._id]||h.settings||s.settings||{},texts=[];
  for(const topic of request.topics){let text;
   if(topic==='cancellation'){
    const rules=st.cancellationRules;
    text=Array.isArray(rules)&&rules.length?rules.map(r=>'Huỷ trước giờ nhận ít nhất '+r.hoursBefore+' giờ: hoàn '+r.refundPercent+'% tiền cọc').join('; ')+'.':'Cơ sở chưa cập nhật điều kiện huỷ và hoàn cọc.';
    rows.push(...(Array.isArray(rules)?rules.map(r=>request.topics.length===1?[h.name,r.hoursBefore,r.refundPercent]:[h.name,'Huỷ trước ít nhất '+r.hoursBefore+' giờ','Hoàn '+r.refundPercent+'% tiền cọc']):[[h.name,'Huỷ và hoàn cọc',text]]));
   }else if(topic==='breakfast'){
    const service=h.services?.breakfast,types=s.roomTypes.filter(t=>t.active&&t.homestayId===h._id),amenityIds=new Set(s.amenities.filter(a=>a.active&&/bua sang|an sang|breakfast/.test(P.normalize(a.name))).map(a=>a._id)),evidence=types.some(t=>(t.amenityIds||[]).some(id=>amenityIds.has(id)))||[...(h.experiences||[]),...(h.highlights||[])].some(t=>/bua sang|an sang|breakfast/.test(P.normalize(t)));
    text=service?.available===true||evidence?'Có thông tin công khai về phục vụ bữa sáng.':service?.available===false?'Cơ sở xác nhận không phục vụ bữa sáng.':'Cơ sở chưa cập nhật thông tin xác nhận có phục vụ bữa sáng hay không.';
    text+=service?.included===true?' Bữa sáng đã được xác nhận gồm trong giá.':service?.included===false?' Bữa sáng không gồm trong giá.':' Chưa có thông tin xác nhận bữa sáng gồm trong giá.';
    text+=Number.isSafeInteger(service?.price)&&service.price>=0?' Mức phí đã cập nhật: '+service.price.toLocaleString('vi-VN')+' ₫.':' Mức phụ phí chưa được cập nhật; bạn hỏi lễ tân trước khi sử dụng.';
    rows.push([h.name,'Bữa sáng',text]);
   }else if(topic==='digital_services'){
    const services=h.services?.streaming||{};text=['Netflix','YouTube Premium'].map(name=>services[name]?.provided===true?name+': cơ sở xác nhận có cung cấp.':services[name]?.provided===false?name+': cơ sở xác nhận không cung cấp tài khoản.':name+': chưa có thông tin xác nhận tài khoản trả phí được cung cấp.').join(' ');
    text+=' Có Smart TV không đồng nghĩa đã gồm tài khoản hoặc thuê bao miễn phí; bạn nhờ cơ sở kiểm tra dịch vụ của phòng.';rows.push([h.name,'Dịch vụ Smart TV',text]);
   }else if(topic==='payment_methods'){
    const payment=st.payment||{};text='Apple Pay và Google Pay chưa được triển khai trong luồng thanh toán hiện tại của website. ';
    text+=payment.enabled===true&&['manual','payos'].includes(payment.provider)?'Có chuyển khoản QR '+(payment.provider==='payos'?'qua payOS':'theo hướng dẫn của cơ sở')+' cho booking hợp lệ; mở mục thanh toán của booking để đối chiếu người nhận và số tiền.':'Chưa có kênh chuyển khoản QR được bật/xác nhận cho cơ sở; bạn liên hệ lễ tân để biết phương thức đang nhận.';
    text+=' Mình chưa nhận tiền hoặc xác nhận giao dịch.';rows.push([h.name,'Phương thức thanh toán',text]);
   }
   if(text)texts.push(text);
  }
  parts.push((properties.length===1?'Tại '+h.name+': ':'')+texts.join(' '));
 }
 let answer=properties.length===1?parts[0]:'Mình tổng hợp thông tin công khai của '+properties.length+' homestay trong bảng bên dưới.';
 if(request.topics.includes('cancellation'))answer+=' Đây là chính sách hiện tại; booking đã đặt phải xét chính sách đã chốt trên booking và thời điểm huỷ. Khoản phải hoàn chưa xác nhận tiền đã được chuyển hoàn.';
 return finish(answer,columns,rows,properties.map(h=>h._id));
}
module.exports={result};
