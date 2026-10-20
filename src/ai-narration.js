'use strict';
function facts(result){
 if(['unsupported','export'].includes(result.intent))return null;
 if(result.narrationFacts)return result.narrationFacts;
 if(result.intent==='recommendation'&&result.cards?.length&&result.context?.guestCount){
  const c=result.context,dated=!!(c.checkIn&&c.checkOut),date=v=>v.split('-').reverse().join('/');
  const out={SEARCH:{label:'Cụm nhu cầu nhóm và khoảng ngày đã xác nhận',value:'nhóm '+c.guestCount+' người'+(dated?', từ '+date(c.checkIn)+' đến '+date(c.checkOut):'')},FOUND:{label:'Kết quả gợi ý thực tế; các lựa chọn được hiển thị bên dưới',value:result.cards.length+' phương án phù hợp'+(result.cards.every(t=>t.roomCount>1)?', cần chia thành nhiều phòng':'')},PRICE:{label:'Điều kiện giá và phòng trống bắt buộc phải nói rõ',value:dated?'Giá đã tính theo từng đêm và phụ thu; mình chưa giữ phòng':'Giá đang là tham khảo ngày thường, chưa xác nhận phòng trống theo ngày lưu trú'},QUESTION:{label:'Một câu hỏi tiếp theo; dùng nguyên câu, không hỏi thêm',value:dated?'Bạn muốn xem kỹ phương án nào?':'Bạn dự định nhận và trả phòng ngày nào?'}};
  const note=require('./ai-preferences').note(c).trim();if(note)out.FILTERS={label:'Các điều kiện ngân sách và tiện nghi đã lọc',value:note};
  if(c.children>0)out.CHILDREN={label:'Điều kiện tính giá trẻ em chưa được miễn giảm',value:'Giá tạm tính mỗi trẻ là một khách trong sức chứa; chưa áp dụng miễn giảm theo tuổi, cần cơ sở xác nhận'};
  return out;
 }
 if(result.intent==='report'&&result.metric==='revenue'){
  const metric=label=>result.metrics.find(row=>row[0]===label)?.[1];
  if(metric('Doanh thu')===undefined||!result.context?.from)return null;
  return {
   PERIOD:{label:'Khoảng ngày báo cáo',value:result.context.from.split('-').reverse().join('/')+' đến '+result.context.to.split('-').reverse().join('/')},
   TOTAL:{label:'Doanh thu từ quyết toán đã đóng, dạng tiền VND',value:String(metric('Doanh thu'))},
   COUNT:{label:'Số booking đã đóng có quyết toán',value:String(metric('Booking đóng'))},
   NOTE:{label:'Giải thích bắt buộc về ngày ghi nhận và tiền cọc',value:'Số liệu lấy theo ngày trả thực tế của booking đã đóng có quyết toán; tiền cọc không được cộng thêm lần nữa.'}
  };
 }
 // Even the provider never receives the actual answer, guest records,
 // property descriptions or financial values. It writes around placeholders.
 return {RESULT:{label:'Nội dung trả lời trực tiếp câu hỏi hiện tại; chèn nguyên văn, không thêm lời dẫn hay đọc lại nhãn này',value:result.answer}};
}
module.exports={facts};
