'use strict';
const A=require('./access'),D=require('./domain'),norm=q=>require('./ai-provider').normalize(q);
function plan(question){
 const q=norm(question);let kind;
 if(/(?:doanh thu|gia tri booking|tien coc|ky bao cao)/.test(q)&&/khac.*(?:coc|doanh thu)|chua chac|vi sao.*(?:booking|doanh thu)|khong co (?:giao dich|du lieu)/.test(q))kind='financial_definitions';
 if(/dieu chinh.*coc.*(?:nham|sai)|coc ghi nham/.test(q))kind='deposit_adjustment';
 if(/chi (?:duoc )?xem.*khong (?:duoc )?cap nhat.*(?:nho ai|ai xu ly)/.test(q))kind='access_help';
 return kind?{intent:'policy',topic:'general',serviceInfo:kind,explicitLookup:true}:null;
}
function result(s,u,plan){
 if(!plan.serviceInfo)return null;let answer,permission;
 if(plan.serviceInfo==='financial_definitions'){
  permission=A.can(u,'reports.view')?'reports.view':'reports.revenue';
  answer='Giá trị booking là tổng giá đặt phòng, chưa chứng minh đã thu tiền. Tiền cọc là khoản đã nhận trước và được trừ khi quyết toán; doanh thu trong hệ thống lấy tiền phòng và phụ thu từ booking đã đóng có quyết toán, theo ngày trả thực tế, không cộng cọc lần nữa. Kỳ được truy vấn thành công nhưng không có giao dịch phù hợp có doanh thu bằng 0; lỗi đọc dữ liệu hoặc thiếu quyền phải được báo riêng, không coi là doanh thu bằng 0.';
 }else if(plan.serviceInfo==='deposit_adjustment'){
  permission='bookings.update';answer='Bạn mở Booking & khách, chọn đúng booking và đối chiếu khoản cọc ghi nhầm với chứng từ thực tế. Dùng chức năng điều chỉnh bằng một dòng mới trong sổ cọc để giữ lịch sử, rồi kiểm tra số đã thu và khoản còn phải thu; không xoá dấu vết giao dịch. Mình chỉ hướng dẫn, chưa điều chỉnh tiền cọc.';
 }else{permission='housekeeping.view';answer='Nếu tài khoản chỉ có quyền xem, bạn chưa thể cập nhật dọn phòng. Bạn nhờ lễ tân hoặc chủ homestay có quyền cập nhật trong cơ sở được giao xử lý; Admin có thể kiểm tra và cấp quyền phù hợp. Mình chưa thay đổi quyền hay trạng thái phòng.';}
 if(!A.can(u,permission))D.fail('Tài khoản chưa được cấp quyền xem hướng dẫn nghiệp vụ này.','FORBIDDEN',403);
 return {intent:'policy',answer,columns:[],rows:[],sources:['Quy tắc quyết toán, sổ cọc và quyền nghiệp vụ HOMESTAY'],permission,propertyIds:s.homestays.map(h=>h._id),suppressExport:true,context:{intent:'policy',topic:'general',serviceInfo:plan.serviceInfo}};
}
module.exports={plan,result};
