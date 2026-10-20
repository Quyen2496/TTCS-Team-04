'use strict';
const A=require('./access'),D=require('./domain');
const topics=['pricing','backup','booking_email'];
const norm=q=>String(q||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
function valid(v){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>k!=='topic')||!topics.includes(v.topic))throw Error('INVALID_AI_OUTPUT');return {...v};}
function resolve(question){
 const q=norm(question),explain=/tai sao|vi sao|ly do|giai thich|y nghia|de lam gi|la gi|hoat dong (?:ra sao|the nao)|co tac dung/.test(q);if(!explain)return null;
 const topic=/\bgia\b|ngay le|thu (?:7|bay)|chu nhat|cuoi tuan/.test(q)&&/\bgia\b|ngay le|cuoi tuan/.test(q)?'pricing':/sao luu|backup|van hanh/.test(q)?'backup':/(?:email|mail|\bthu\b).*(?:booking|dat phong)|(?:booking|dat phong).*(?:email|mail|\bthu\b)/.test(q)?'booking_email':null;
 return topic?{intent:'policy',topic:'general',explanation:{topic}}:null;
}
function assert(u,v){valid(v);if(v.topic==='backup'&&(u.role!=='admin'||!A.can(u,'system.view')))D.fail('Tài khoản chưa được cấp quyền giải thích vận hành và sao lưu nội bộ.','FORBIDDEN',403);}
function result(s,u,q,plan){
 if(!plan.explanation)return null;const e=valid(plan.explanation);assert(u,e);let answer,permission=null;
 if(e.topic==='pricing')answer='Giá ngày lễ, thứ Bảy và Chủ nhật cao hơn vì hệ thống dùng bảng giá riêng cho từng loại ngày. Quy tắc cấu hình hiện tại yêu cầu các mức này cao hơn giá ngày thường; lịch giá có thể đặt mức riêng cho một ngày cụ thể. Khi báo giá, hệ thống tính từng đêm theo ngày lưu trú rồi cộng lại. Vì vậy, cùng một loại phòng nhưng đổi ngày ở có thể có tổng tiền khác nhau.';
 else if(e.topic==='backup'){permission='system.view';answer='Vận hành & sao lưu giúp Admin theo dõi tình trạng vận hành và tạo bản sao dữ liệu để phục hồi khi cần. Bạn có thể bấm Sao lưu ngay; hệ thống cũng có lịch tự động sau hai giờ sáng theo giờ Việt Nam khi đã bật và máy chủ đang chạy. Bản sao lưu được mã hoá và giữ các bản gần nhất. Sao lưu không có nghĩa dữ liệu đang chạy được cập nhật sang một máy chủ khác ngay lập tức.';}
 else answer='Email booking dùng để gửi mã và thông tin đặt phòng tới email đã lưu trên booking khi có sự kiện nghiệp vụ tương ứng. Thư được đưa vào hàng đợi và gửi khi cấu hình email sẵn sàng; chưa thấy thư không có nghĩa booking chưa được tạo. Bạn kiểm tra địa chỉ email, thư rác và trạng thái gửi trước khi kết luận. Chat hiện chưa hỗ trợ gửi lại booking tới một email tuỳ chọn.';
 return {intent:'policy',answer,columns:[],rows:[],totalRows:0,sources:[e.topic==='pricing'?'Quy tắc giá và cách tính từng đêm của HOMESTAY':e.topic==='backup'?'Chức năng vận hành và sao lưu đã triển khai':'Hàng đợi email nghiệp vụ đã triển khai'],permission,propertyIds:[],audienceRole:u.role,suppressExport:true,context:{intent:'policy',topic:'general',explanation:e},narrationFacts:{RESULT:{label:'Giải thích trực tiếp từ chức năng đã triển khai',value:answer}}};
}
module.exports={topics,valid,resolve,assert,result};
