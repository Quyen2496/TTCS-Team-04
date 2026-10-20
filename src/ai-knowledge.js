'use strict';
const P=require('./ai-provider');
const topics=['accounting','roles','ai','backup','payments','features','accounts','invoices','email','audit','database','unknown'];
function plan(question,previous={},user){
 const q=P.normalize(question);let topic;
 if(/ke toan|so quy|cong no|thu chi|hach toan|quan ly chi phi/.test(q))topic='accounting';
 else if(/phan quyen|quyen han|vai tro|(?:admin|quan tri vien).*(?:quyen|lam duoc|hoi duoc|bi chan)|(?:quyen|lam duoc|hoi duoc).*(?:admin|quan tri vien)|toi la admin|minh la admin/.test(q))topic='roles';
 else if(/(?:tro ly|chatbot|\bai\b).*(?:lam duoc|ho tro|tu (?:sua|huy|ghi|tao)|du phong|het luot|model|mo hinh|nha cung cap)|groq|gemini/.test(q))topic='ai';
 else if(user?.role==='admin'&&/tai khoan|nhan vien/.test(q)&&!/quen mat khau|doi mat khau/.test(q))topic='accounts';
 else if(user?.role==='admin'&&/hoa don/.test(q))topic='invoices';
 else if(user?.role==='admin'&&/lich su email|gui email|cau hinh email|smtp/.test(q))topic='email';
 else if(user?.role==='admin'&&/nhat ky|audit/.test(q))topic='audit';
 else if(user?.role==='admin'&&/co so du lieu|mongodb|data_mode/.test(q))topic='database';
 else if(/sao luu|backup|khoi phuc du lieu/.test(q))topic='backup';
 else if(/(?:he thong|phan mem|du an).*(?:payos|qr|thanh toan|chuyen khoan)|(?:payos|qr).*(?:ho tro|tu dong|cau hinh)/.test(q))topic='payments';
 else if(/(?:he thong|phan mem|du an).*(?:nhung chuc nang|cac chuc nang|chuc nang gi|nhung tinh nang|tinh nang gi|co nhung gi|lam duoc gi|ho tro gi)|chuc nang.*(?:admin|quan tri)|(?:admin|quan tri).*chuc nang/.test(q))topic='features';
 else if(previous.knowledgeTopic&&topics.includes(previous.knowledgeTopic)&&/^(?:vay |the |con |a |roi )?(?:ai (?:co quyen|xem|phu trach)|xem (?:o dau|cho nao)|vao dau|mo (?:o dau|cho nao)|them (?:duoc|the nao)|co them duoc|lam sao de them|can bo sung|tai sao|vi sao|noi ro hon|giai thich them|y la sao|ban noi ro|chi tiet hon)/.test(q))topic=previous.knowledgeTopic;
 else if(/(?:he thong|phan mem|du an).*(?:co|ho tro|lam duoc).*(?:khong|chua)|(?:he thong|phan mem|du an).*(?:chuc nang|tinh nang)/.test(q))topic='unknown';
 return topic?{intent:'policy',topic:'roles',knowledgeTopic:topic,...(topic==='accounts'&&!/bao nhieu|co may|so luong|tong so|thong ke|phan bo|dem tai khoan/.test(q)?{needsUnderstanding:true}:{})}:null;
}
const fact=(label,value)=>({label,value});
function answer(s,u,question,chosen,previous={},options={}){
 if(u.role!=='admin')return null;
 const p=chosen.knowledgeTopic?chosen:plan(question,previous,u);if(!p?.knowledgeTopic)return null;
 const q=P.normalize(question),topic=p.knowledgeTopic;let answer,facts;
 if(topic==='accounting'){
  if(/xem (?:o dau|cho nao)|vao dau|mo (?:o dau|cho nao)/.test(q)){
   answer='Bạn vào Booking & khách để kiểm tra tiền cọc và quyết toán từng booking; vào Hoá đơn để xem chứng từ, và Báo cáo để xem doanh thu. Admin xem được các cơ sở trong hệ thống; nếu cần số liệu của một homestay cụ thể, bạn chọn cơ sở đó trước nhé.';
   facts={DEPOSITS:fact('Mục xem tiền cọc và quyết toán booking','Booking & khách'),INVOICES:fact('Mục xem chứng từ hoá đơn','Hoá đơn'),REPORTS:fact('Mục xem doanh thu','Báo cáo'),SCOPE:fact('Phạm vi quản trị và cách lọc số liệu','Admin xem được các cơ sở; chọn một homestay để lọc số liệu của cơ sở đó')};
  }else if(/them|bo sung|phat trien/.test(q)){
   answer='Có thể phát triển thêm nhé. Nếu muốn thành một phân hệ kế toán, cần thiết kế sổ thu chi, công nợ và chi phí, rồi liên kết với cọc, quyết toán và hoá đơn đang có. Đây là phần cần triển khai thêm, hiện mình chưa tạo hay bật chức năng đó. Bạn muốn bắt đầu từ theo dõi thu chi hay công nợ?';
   facts={STATUS:fact('Khả năng phát triển và tình trạng hiện tại','có thể phát triển thêm, hiện chưa có phân hệ kế toán riêng'),SCOPE:fact('Các phần cần thiết kế thêm','sổ thu chi, công nợ và chi phí'),EXISTING:fact('Các nghiệp vụ hiện có để liên kết','cọc, quyết toán và hoá đơn'),QUESTION:fact('Câu hỏi để xác định ưu tiên','Bạn muốn bắt đầu từ theo dõi thu chi hay công nợ?')};
  }else if(/ai.*(?:quyen|xem|phu trach)/.test(q)){
   answer='Chưa có vai trò Kế toán riêng bạn nhé. Admin quản trị toàn hệ thống; Chủ homestay và Báo cáo xem doanh thu theo quyền và cơ sở được cấp; Lễ tân xử lý cọc, quyết toán, hoá đơn và xem doanh thu hôm nay khi được cấp quyền. Việc xem số liệu vẫn được kiểm tra theo cấu hình tài khoản hiện tại.';
   facts={STATUS:fact('Cụm xác nhận chưa có vai trò Kế toán riêng','chưa có vai trò Kế toán riêng'),ADMIN:fact('Phạm vi vai trò Admin','Admin quản trị toàn hệ thống'),ROLES:fact('Phân công nghiệp vụ tài chính','Chủ homestay và Báo cáo xem doanh thu theo quyền; Lễ tân xử lý cọc, quyết toán, hoá đơn và xem doanh thu hôm nay khi được cấp quyền'),SCOPE:fact('Giới hạn phạm vi nhân viên','quyền tài khoản hiện tại và cơ sở được cấp')};
  }else{
   answer='Hiện chưa có phân hệ hoặc vai trò Kế toán riêng bạn nhé. Hệ thống đã có quản lý tiền cọc, quyết toán trả phòng, hoá đơn và báo cáo doanh thu; admin xem các phần này trong Booking & khách, Hoá đơn và Báo cáo. Nếu bạn cần sổ thu chi, công nợ hoặc quản lý chi phí riêng thì phải bổ sung thêm. Bạn muốn mình giải thích phần đang có hay phần cần bổ sung?';
   facts={STATUS:fact('Cụm xác nhận chưa có phân hệ hoặc vai trò Kế toán riêng','chưa có phân hệ hoặc vai trò Kế toán riêng'),EXISTING:fact('Những nghiệp vụ tài chính đã được triển khai','quản lý tiền cọc, quyết toán trả phòng, hoá đơn và báo cáo doanh thu'),NAVIGATION:fact('Các mục admin có thể mở','Booking & khách, Hoá đơn và Báo cáo'),MISSING:fact('Phần cần phát triển thêm nếu muốn kế toán đầy đủ','sổ thu chi, công nợ và quản lý chi phí riêng'),QUESTION:fact('Câu hỏi tiếp theo để hiểu nhu cầu','Bạn muốn mình giải thích phần đang có hay phần cần bổ sung?')};
  }
 }else if(topic==='roles'){
  answer='Bạn muốn biết hệ thống có những vai trò nào, quyền của một vai trò cụ thể, hay ai được dùng một chức năng? Bạn nêu tên vai trò hoặc chức năng để mình giải thích đúng phần bạn đang hỏi nhé.';
  facts={QUESTION:fact('Câu hỏi làm rõ ý phân quyền còn thiếu','Bạn muốn xem danh sách vai trò, quyền của một vai trò hay quyền dùng một chức năng cụ thể?')};
 }else if(topic==='accounts'){
  const A=require('./access');if(!A.can(u,'accounts.view'))require('./domain').fail('Tài khoản admin hiện đã bị giới hạn quyền xem tài khoản. Kiểm tra cấu hình quyền đã lưu.','FORBIDDEN',403);
  if(!/bao nhieu|co may|so luong|tong so|thong ke|phan bo|dem tai khoan/.test(q)){
   answer='Bạn có thể quản lý tài khoản tại mục Tài khoản & quyền theo quyền đã cấp: chọn đúng tài khoản, kiểm tra vai trò, quyền thao tác và homestay được giao. Mình có thể hướng dẫn, chưa trực tiếp tạo, sửa hoặc xoá tài khoản qua chat. Bạn muốn tạo tài khoản, đổi quyền hay kiểm tra một vấn đề đăng nhập?';
   return {intent:'policy',answer,columns:[],rows:[],totalRows:0,sources:['Chức năng Tài khoản & quyền'],permission:'accounts.view',audienceRole:u.role,propertyIds:[],suppressExport:true,context:{intent:'policy',topic:'roles',knowledgeTopic:topic},narrationFacts:{RESULT:fact('Hướng dẫn đúng phạm vi tài khoản, không phải thống kê số lượng',answer)}};
  }
  const users=s.accountStats||s.users||[],counts=['admin','owner','reception','report','housekeeping','guest'].map(role=>[({admin:'Admin',owner:'Chủ homestay',reception:'Lễ tân',report:'Báo cáo',housekeeping:'Buồng phòng',guest:'Khách'}[role]),users.filter(v=>v.role===role).length]);
  answer='Hiện có '+users.length+' tài khoản trong hệ thống, trong đó '+users.filter(v=>v.active).length+' đang hoạt động. Bạn xem phân bố theo vai trò bên dưới nhé. Để tạo tài khoản nhân viên hoặc điều chỉnh quyền, admin mở Tài khoản & quyền, chọn đúng vai trò và homestay cần giao.';
  facts={COUNT:fact('Tổng số tài khoản lấy từ dữ liệu thực',String(users.length)),ACTIVE:fact('Số tài khoản đang hoạt động',String(users.filter(v=>v.active).length)),NAVIGATION:fact('Màn hình quản lý tài khoản và cấp quyền','Tài khoản & quyền; chọn đúng vai trò và homestay cần giao')};
  return {intent:'policy',answer,columns:['Vai trò','Số tài khoản'],rows:counts,totalRows:counts.length,sources:['Tài khoản và quyền hiện tại'],permission:'accounts.view',propertyIds:[],context:{intent:'policy',topic:'roles',knowledgeTopic:topic},narrationFacts:facts};
 }else if(topic==='invoices'){
  answer='Có quản lý hoá đơn nhé. Hoá đơn gắn với booking và quyết toán, không thay thế một phân hệ kế toán đầy đủ. Admin mở mục Hoá đơn để xem chứng từ và các thông tin liên quan; khi cần tạo hoặc điều chỉnh chứng từ, bạn thực hiện trên màn hình nghiệp vụ để hệ thống kiểm tra trạng thái và quyền.';
  facts={STATUS:fact('Chức năng hoá đơn đã triển khai','có quản lý hoá đơn gắn với booking và quyết toán'),NAVIGATION:fact('Màn hình xem chứng từ','Hoá đơn'),SCOPE:fact('Giới hạn chức năng hiện tại','hoá đơn chưa thay thế một phân hệ kế toán đầy đủ; thao tác tạo hoặc điều chỉnh thực hiện ở màn hình nghiệp vụ')};
 }else if(topic==='email'){
  answer='Admin có thể xem mục Lịch sử email để kiểm tra thư đã gửi, đang chờ hoặc gặp lỗi theo dữ liệu ghi nhận. Hệ thống có các luồng email nghiệp vụ và quên mật khẩu; việc gửi thành công còn phụ thuộc cấu hình SMTP và phản hồi máy chủ email. Nếu cần kiểm tra một thư cụ thể, bạn mở lịch sử và đối chiếu đúng booking hoặc thời điểm gửi nhé.';
  facts={NAVIGATION:fact('Màn hình kiểm tra trạng thái gửi email','Lịch sử email'),FEATURES:fact('Các luồng đã có','email nghiệp vụ và quên mật khẩu'),LIMIT:fact('Điều kiện xác định gửi thành công','cần đối chiếu dữ liệu gửi, cấu hình SMTP và phản hồi máy chủ email')};
 }else if(topic==='audit'){
  answer='Admin xem được nhật ký ở mục Nhật ký để đối chiếu các thao tác đã được hệ thống ghi nhận. Bạn chọn thời điểm hoặc nghiệp vụ cần kiểm tra rồi xem người thực hiện và nội dung liên quan. Mình chưa tự thay đổi hay xoá nhật ký qua cuộc chat.';
  facts={NAVIGATION:fact('Màn hình admin xem nhật ký nghiệp vụ','Nhật ký'),USE:fact('Cách đối chiếu thao tác','thời điểm, nghiệp vụ và người thực hiện đã được ghi nhận'),LIMIT:fact('Không thực hiện thao tác thay đổi nhật ký trong chat','chưa thay đổi hay xoá nhật ký qua cuộc chat')};
 }else if(topic==='database'){
  answer='Dự án hỗ trợ chạy với MongoDB hoặc dữ liệu tệp tuỳ cấu hình. '+(options.dataMode?'Chế độ máy chủ đang dùng là '+options.dataMode+'. ':'')+'Thông tin kết nối nằm ở cấu hình máy chủ. Bạn muốn mình giải thích cách kết nối, sao lưu hay kiểm tra tình trạng dữ liệu?';
  facts={MODES:fact('Các chế độ lưu trữ đã được triển khai','MongoDB hoặc dữ liệu tệp tuỳ cấu hình'),QUESTION:fact('Câu hỏi làm rõ nhu cầu quản trị','Bạn muốn giải thích cách kết nối, sao lưu hay kiểm tra tình trạng dữ liệu?')};if(options.dataMode)facts.CURRENT= fact('Chế độ lưu trữ thực của máy chủ',options.dataMode);
 }else if(topic==='ai'){
  const chain=options.aiStatus||[],active=chain.filter(p=>p.configured).map(p=>p.provider+' / '+p.model);
  answer='Trợ lý hỗ trợ tra cứu nghiệp vụ, giải thích chức năng và tư vấn trong phạm vi vai trò của bạn. Phần kết nối mô hình hỗ trợ Groq và Gemini; khi cấu hình cả hai, hệ thống có thể dùng dự phòng nếu bên ưu tiên bị giới hạn hoặc gặp lỗi. '+(chain.length?(active.length?'Cấu hình sẵn sàng hiện tại: '+active.join('; ')+'.':'Hiện chưa có mô hình được cấu hình sẵn sàng, nên mình đang dùng dữ liệu và quy tắc có sẵn. '):'')+'Mình không tự ghi cọc, huỷ booking hoặc thay đổi dữ liệu qua cuộc chat; các thao tác đó vẫn cần thực hiện và xác nhận ở màn hình nghiệp vụ.';
  facts={ABILITIES:fact('Nội dung trợ lý hỗ trợ','tra cứu nghiệp vụ, giải thích chức năng và tư vấn theo vai trò'),PROVIDERS:fact('Cơ chế dự phòng mô hình được triển khai','hỗ trợ Groq và Gemini; dự phòng khi đã cấu hình cả hai và bên ưu tiên bị giới hạn hoặc gặp lỗi'),ACTIONS:fact('Giới hạn thao tác ghi dữ liệu của trợ lý','các thao tác ghi cọc, huỷ booking hoặc thay đổi dữ liệu phải được thực hiện và xác nhận ở màn hình nghiệp vụ')};
  if(chain.length)facts.CONFIG= fact('Tình trạng cấu hình thực tế, không phải bảo đảm quota còn lại',active.length?'Cấu hình sẵn sàng: '+active.join('; '):'Chưa có mô hình được cấu hình sẵn sàng; đang dùng dữ liệu và quy tắc có sẵn');
 }else if(topic==='backup'){
  answer='Admin có thể vào Vận hành & sao lưu và bấm Sao lưu ngay. Hệ thống cũng có lịch tự động từ sau hai giờ sáng theo giờ Việt Nam khi bật sao lưu và máy chủ đang chạy; bản sao lưu được mã hoá, giữ các bản gần nhất. Việc bấm thủ công không thay thế lịch tự động. Bạn muốn kiểm tra lịch sử sao lưu hay cách khôi phục?';
  facts={MANUAL:fact('Cách admin tạo bản sao lưu thủ công','vào Vận hành & sao lưu và bấm Sao lưu ngay'),AUTO:fact('Điều kiện và thời điểm lịch sao lưu thực tế','lịch tự động từ sau hai giờ sáng theo giờ Việt Nam khi bật sao lưu và máy chủ đang chạy'),STORAGE:fact('Đặc điểm bản sao lưu','được mã hoá và giữ các bản gần nhất'),QUESTION:fact('Câu hỏi tiếp theo','Bạn muốn kiểm tra lịch sử sao lưu hay cách khôi phục?')};
 }else if(topic==='payments'){
  answer='Có nhé, hệ thống hỗ trợ chuyển khoản thủ công và payOS theo cấu hình từng homestay. Chuyển khoản thủ công cần nhân viên đối soát; payOS chỉ cập nhật cọc từ giao dịch được xác thực. Admin có thể kiểm tra cấu hình nhận cọc của từng cơ sở; không nên coi việc khách báo đã chuyển là xác nhận tiền đã về.';
  facts={METHODS:fact('Các kênh nhận cọc đã có','chuyển khoản thủ công và payOS theo từng homestay'),MANUAL:fact('Điều kiện ghi nhận chuyển khoản thủ công','cần nhân viên đối soát'),AUTOMATIC:fact('Điều kiện tự cập nhật cọc payOS','chỉ từ giao dịch được xác thực'),CHECK:fact('Cách quản trị kiểm tra','Admin kiểm tra cấu hình nhận cọc của đúng cơ sở')};
 }else if(topic==='features'){
  answer='Hệ thống hiện hỗ trợ quản lý nhiều homestay, phòng và tiện nghi, tìm phòng và booking, nhận/trả phòng, buồng phòng, cọc và quyết toán, hoá đơn, báo cáo, email, tài khoản/phân quyền và sao lưu. Với admin, bạn có thể trao đổi với mình về các nghiệp vụ này trên toàn hệ thống. Bạn muốn mình giải thích quy trình hay tra số liệu của phần nào trước?';
  facts={FEATURES:fact('Các nhóm chức năng được triển khai','nhiều homestay; phòng và tiện nghi; tìm phòng, booking, nhận/trả; buồng phòng; cọc, quyết toán, hoá đơn; báo cáo, email, tài khoản/phân quyền và sao lưu'),ROLE:fact('Phạm vi trao đổi của admin','các nghiệp vụ trên toàn hệ thống'),QUESTION:fact('Câu hỏi để tiếp tục đúng nhu cầu','Bạn muốn giải thích quy trình hay tra số liệu của phần nào trước?')};
 }else{
  answer='Mình hiểu bạn đang hỏi về một chức năng của hệ thống. Mình chưa có thông tin xác thực để khẳng định chức năng đó đã được triển khai. Bạn nói rõ tên chức năng hoặc việc muốn làm, mình sẽ đối chiếu với phần hiện có và chỉ ra phần cần bổ sung nhé.';
  facts={STATUS:fact('Kết luận khi chưa có tài liệu chức năng phù hợp','chưa có thông tin xác thực để khẳng định chức năng đó đã được triển khai'),QUESTION:fact('Câu hỏi làm rõ đúng nội dung','Bạn nói rõ tên chức năng hoặc việc muốn làm để mình đối chiếu phần hiện có và phần cần bổ sung nhé.')};
 }
 return {intent:'policy',answer,columns:[],rows:[],totalRows:0,sources:['Chức năng và phân quyền đã triển khai trong HOMESTAY'],permission:'system.view',propertyIds:[],context:{intent:'policy',topic:'roles',knowledgeTopic:topic},narrationFacts:facts};
}
module.exports={plan,answer,topics};
