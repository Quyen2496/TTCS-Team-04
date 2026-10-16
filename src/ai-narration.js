'use strict';
function facts(result){
 if(['unsupported','export'].includes(result.intent))return null;
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
 return {RESULT:{label:'Kết quả đầy đủ đã kiểm chứng, bao gồm điều kiện và lưu ý; giữ nguyên toàn bộ nội dung này',value:result.answer}};
}
module.exports={facts};
