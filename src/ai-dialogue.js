'use strict';
const A=require('./access'),D=require('./domain');
const names={admin:'Admin',owner:'Chủ homestay',reception:'Lễ tân',report:'Báo cáo',housekeeping:'Buồng phòng',guest:'Khách'};
const tasks=['role_count','role_list','module_access','self_permissions','role_permissions','module_help','workflow','action_permission','clarify_module'];
const modules={
 booking:{name:'Booking & khách',aliases:/booking\s*(?:&|va)\s*khach|nghiep vu booking|quan ly booking|quan ly khach|ghi (?:tien )?coc|gan phong|xac nhan booking|nhan phong|tra phong|dat phong|\bbooking\b/,view:'bookings.view',edit:'bookings.update',description:'tra booking, kiểm tra cọc, xác nhận, gán phòng và xử lý nhận/trả phòng',steps:['Mở Booking & khách và chọn đúng booking trong cơ sở được cấp.','Kiểm tra ngày lưu trú, trạng thái và tiền cọc.','Nếu đủ quyền xử lý, thực hiện nghiệp vụ phù hợp với trạng thái booking; kiểm tra lại thông tin trước khi xác nhận.']},
 invoices:{name:'Hoá đơn',aliases:/hoa don|chung tu/,view:'invoices.view',edit:'invoices.create',description:'xem hoặc lập hoá đơn theo booking và quyết toán',steps:['Mở Hoá đơn và tìm đúng booking.','Đối chiếu quyết toán, khoản đã thu và thông tin chứng từ.','Nếu được cấp quyền tạo, lập hoá đơn ở màn hình nghiệp vụ sau khi kiểm tra điều kiện.']},
 reports:{name:'Báo cáo',aliases:/bao cao|doanh thu|cong suat|thong ke/,view:'reports.view',extra:'reports.revenue',edit:'reports.export',description:'tra số liệu theo kỳ và cơ sở, phân biệt báo cáo tổng hợp với doanh thu',steps:['Chọn cơ sở và khoảng ngày cần xem.','Chọn đúng loại số liệu: doanh thu lấy từ quyết toán đã đóng; báo cáo tổng hợp có quy tắc riêng.','Chỉ xuất dữ liệu khi tài khoản có quyền xuất báo cáo.']},
 housekeeping:{name:'Buồng phòng',aliases:/buong phong|don phong|phong can don|phong sach|ve sinh phong/,view:'housekeeping.view',edit:'housekeeping.update',description:'xem phòng cần dọn, phòng sạch và ghi nhận dọn phòng trong cơ sở được cấp',steps:['Mở Buồng phòng và lọc phòng thuộc cơ sở được cấp.','Kiểm tra phòng cần dọn hoặc trạng thái phòng sạch.','Sau khi kiểm tra thực tế, đánh dấu hoàn tất khi tài khoản có quyền cập nhật.']},
 rooms:{name:'Phòng & loại phòng',aliases:/quan ly phong|loai phong|danh muc phong|tien nghi/,view:'rooms.view',edit:'rooms.create',description:'xem danh mục phòng; tạo, sửa loại phòng hoặc tiện nghi theo các quyền riêng',steps:['Chọn đúng homestay rồi mở Phòng & loại phòng.','Kiểm tra loại phòng, sức chứa và tiện nghi hiện có.','Tạo/sửa phòng hoặc loại phòng chỉ khi có đúng quyền của thao tác đó.']},
 pricing:{name:'Giá & chính sách',aliases:/gia\s*(?:&|va)\s*chinh sach|cau hinh gia|bang gia|thiet lap chinh sach/,view:'pricing.view',edit:'pricing.update',description:'xem hoặc cấu hình giá và chính sách của từng homestay',steps:['Chọn đúng một homestay trước khi cấu hình.','Mở Giá & chính sách và kiểm tra giá, phụ thu, giờ nhận/trả và chính sách.','Lưu khi được cấp quyền cập nhật; booking cũ tiếp tục dùng thông tin đã chốt.']},
 accounts:{name:'Tài khoản & quyền',aliases:/tai khoan\s*(?:&|va)\s*quyen|tai khoan nhan vien|quan ly tai khoan|phan quyen/,view:'accounts.view',edit:'accounts.update',description:'quản lý tài khoản, vai trò, quyền thao tác và cơ sở được giao',steps:['Mở Tài khoản & quyền.','Chọn tài khoản, vai trò, các quyền và đúng homestay cần giao.','Kiểm tra lại trước khi lưu; quyền có hiệu lực theo cấu hình hiện tại.']},
 backup:{name:'Vận hành & sao lưu',aliases:/sao luu|backup|van hanh/,view:'system.view',description:'xem vận hành và tạo bản sao lưu bằng chức năng quản trị',steps:['Mở Vận hành & sao lưu.','Kiểm tra lịch sử và trạng thái hiện tại.','Bấm Sao lưu ngay khi cần, rồi kiểm tra kết quả.']},
 email:{name:'Lịch sử email',aliases:/lich su email|email nghiep vu|gui email/,view:'email.view',description:'kiểm tra trạng thái gửi email nghiệp vụ',steps:['Mở Lịch sử email.','Tìm đúng booking hoặc thời điểm gửi.','Đối chiếu trạng thái ghi nhận và thông báo lỗi nếu có.']},
 audit:{name:'Nhật ký',aliases:/nhat ky|audit/,view:'audit.view',description:'đối chiếu thao tác đã ghi nhận, thời điểm và người thực hiện',steps:['Mở Nhật ký.','Lọc theo nghiệp vụ hoặc thời điểm cần kiểm tra.','Đối chiếu người thực hiện và thao tác được hệ thống ghi nhận.']},
 consumer:{name:'Chức năng dành cho khách',aliases:/booking cua toi|tai khoan cua toi|chuc nang (?:danh )?cho khach/,description:'tìm phòng, xem giá, chính sách và booking của chính tài khoản'}
};
const operations={
 deposit:{subject:'booking',grant:'bookings.update',name:'ghi nhận tiền cọc',pattern:/ghi (?:nhan )?(?:tien )?coc|ghi so coc/,steps:['Mở Booking & khách và chọn booking trong homestay được giao.','Đối chiếu số tiền, phương thức, thời điểm và chứng từ chuyển khoản thực tế.','Dùng chức năng ghi cọc ở booking; chỉ xác nhận khi đã kiểm tra tiền nhận.']},
 assign:{subject:'booking',grant:'bookings.update',name:'gán phòng',pattern:/gan phong/,steps:['Mở đúng booking và kiểm tra ngày lưu trú, loại phòng.','Chọn phòng hợp lệ trong cùng cơ sở; kiểm tra lịch và tình trạng phòng.','Xác nhận gán ở màn hình nghiệp vụ sau khi kiểm tra.']},
 confirm:{subject:'booking',grant:'bookings.update',name:'xác nhận booking',pattern:/xac nhan booking|duyet booking/,steps:['Mở booking và kiểm tra trạng thái hiện tại.','Đối chiếu điều kiện tiền cọc, hạn giữ chỗ và tình trạng phòng.','Dùng thao tác xác nhận của booking khi hệ thống cho phép.']},
 checkin:{subject:'booking',grant:'bookings.update',name:'nhận phòng',pattern:/nhan phong|check.?in/,steps:['Mở đúng booking và kiểm tra điều kiện nhận phòng.','Đối chiếu thông tin khách, ngày ở, cọc và phòng được gán.','Thực hiện nhận phòng ở màn hình nghiệp vụ khi đủ điều kiện.']},
 checkout:{subject:'booking',grant:'bookings.update',name:'trả phòng và quyết toán',pattern:/tra phong|quyet toan|check.?out/,steps:['Mở booking đang lưu trú.','Kiểm tra quyết toán, tiền phòng, dịch vụ, cọc và các khoản còn thu hoặc hoàn.','Xác nhận trả phòng khi đã đối chiếu; khoản phải hoàn chưa có nghĩa đã chuyển tiền hoàn.']},
 invoice_create:{subject:'invoices',grant:'invoices.create',name:'lập hoá đơn',pattern:/(?:lap|tao|xuat) hoa don/},
 report_export:{subject:'reports',grant:'reports.export',name:'xuất báo cáo',pattern:/xuat (?:file )?bao cao/},
 clean:{subject:'housekeeping',grant:'housekeeping.update',name:'cập nhật dọn phòng',pattern:/danh dau.*(?:sach|don)|hoan tat don|cap nhat.*don phong/},
 room_delete:{subject:'rooms',grant:'rooms.delete',name:'xoá phòng',pattern:/xoa phong/},
 room_create:{subject:'rooms',grant:'rooms.create',name:'tạo phòng',pattern:/(?:tao|them) phong/},
 room_edit:{subject:'rooms',grant:'rooms.update',name:'sửa thông tin phòng',pattern:/sua (?:thong tin )?phong/},
 price_edit:{subject:'pricing',grant:'pricing.update',name:'cập nhật giá và chính sách',pattern:/doi gia|sua gia|cap nhat gia/},
 account_edit:{subject:'accounts',grant:'accounts.update',name:'phân quyền tài khoản',pattern:/phan quyen|doi vai tro/}
};
const subjects=Object.keys(modules);
const norm=q=>String(q||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
function subject(q){return subjects.find(key=>modules[key].aliases.test(q));}
function roleIn(q){
 for(const [role,pattern]of [['admin',/admin|quan tri vien/],['owner',/chu homestay|chu nha/],['reception',/le tan/],['housekeeping',/(?:vai tro|tai khoan|nhan vien|bo phan) buong phong|^buong phong.*(?:quyen|duoc|thi sao)/],['report',/(?:vai tro|tai khoan|nhan vien) bao cao/],['guest',/(?:vai tro|tai khoan|nguoi dung) khach/]])if(pattern.test(q))return role;
 return null;
}
function valid(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['task','subject','targetRole','includeRoleCount','operation'].includes(k))||!tasks.includes(value.task))throw Error('INVALID_AI_OUTPUT');
 if(value.subject!==undefined&&!subjects.includes(value.subject)||value.targetRole!==undefined&&!Object.hasOwn(names,value.targetRole)||value.includeRoleCount!==undefined&&typeof value.includeRoleCount!=='boolean')throw Error('INVALID_AI_OUTPUT');
 if(value.task==='action_permission'&&!value.operation)throw Error('INVALID_AI_OUTPUT');
 if(value.operation!==undefined&&(!Object.hasOwn(operations,value.operation)||value.subject!==operations[value.operation].subject))throw Error('INVALID_AI_OUTPUT');
 if(['module_access','module_help','workflow','action_permission'].includes(value.task)&&!value.subject)throw Error('INVALID_AI_OUTPUT');
 return {...value};
}
function resolve(question,previous={},user={role:'guest'}){
 const q=norm(question),old=previous.dialogue||{},operation=Object.keys(operations).find(key=>operations[key].pattern.test(q)),explicit=operation?operations[operation].subject:subject(q),count=/bao nhieu.*(?:vai tro|role)|(?:vai tro|role).*bao nhieu|may (?:vai tro|role)|tong so.*(?:vai tro|role)/.test(q),list=/liet ke.*(?:vai tro|role)|cac (?:vai tro|role)|nhung (?:vai tro|role)|(?:vai tro|role).*(?:gom|nao trong he thong)/.test(q),which=/(?:vai tro|role) nao|(?:cac|nhung) (?:vai tro|role)|nhung ai|ai (?:co|duoc)|bo phan nao/.test(q),access=/duoc phep|co quyen|quyen (?:xem|dung|truy cap)|su dung|truy cap|dung chuc nang|\bdung\b|phu trach|quan ly|lam duoc|thao tac/.test(q);
 let task,focus=explicit,target=roleIn(q),includeRoleCount=false;
 if(/quen mat khau|doi mat khau/.test(q))return null;
 if(which&&access){if(!focus&&!old.subject&&previous.knowledgeTopic)return null;task='module_access';focus||=old.subject;includeRoleCount=count;}
 else if(count)task='role_count';
 else if(list)task='role_list';
 else if(operation&&/co (?:duoc|quyen|the)|duoc phep|duoc .*khong|quyen/.test(q))task='action_permission';
 else if(target&&target!==user.role&&!/^(?:toi|minh|em) la /.test(q)&&/quyen|duoc (?:lam|xem|dung)|co the lam gi|lam duoc gi/.test(q))task='role_permissions';
 else if(/(?:toi|minh|em) (?:la ai|dang (?:o|dung|la) vai tro|co (?:nhung )?quyen|duoc (?:lam|xem|hoi)|co the (?:lam|hoi) gi)|vai tro cua (?:toi|minh)|ban biet (?:toi|minh) la ai|^(?:toi|minh) la admin|admin.*(?:quyen|lam duoc|hoi duoc)|(?:quyen|lam duoc|hoi duoc).*admin/.test(q)){task='self_permissions';target=user.role;}
 else if(target&&/quyen|duoc (?:lam|xem|dung)|co the lam gi|lam duoc gi/.test(q))task='role_permissions';
 else if(explicit&&/cach |lam sao|huong dan|quy trinh|cac buoc|buoc nao|can lam gi|lam gi truoc|lam gi tiep/.test(q))task='workflow';
 else if(explicit&&/chuc nang.*(?:la gi|de lam gi)|(?:la gi|de lam gi|xem o dau|mo o dau|vao dau)$/.test(q))task='module_help';
 else if(old.task){
  if(old.task==='clarify_module'&&explicit)task='module_access';
  else if(old.subject&&/(?:co (?:duoc|the)|duoc khong|co quyen|quyen cua (?:toi|minh))/.test(q)&&/xem|sua|cap nhat|thao tac|xoa|tao|xu ly/.test(q)){task='self_permissions';focus=old.subject;target=user.role;}
  else if(old.subject&&/quy trinh|cac buoc|huong dan tiep|chi (?:toi|minh).*cach/.test(q)){task='workflow';focus=old.subject;}
  else
  if(explicit&&/^(?:con |vay |the )/.test(q)){task=old.task==='module_access'?'module_access':old.task==='workflow'?'workflow':'module_help';}
  else if(/^(?:con |vay |the )?(?:ai co quyen|vai tro nao|nhung ai)/.test(q)){task='module_access';focus=old.subject;}
  else if(target&&/thi sao|cu the|con |the nao/.test(q)){task='role_permissions';focus=old.subject;}
  else if(/^(?:vay |the |con )?(?:cu the hon|noi ro hon|giai thich them|y la sao|chi tiet hon|xem o dau|vao dau|lam the nao|lam sao|buoc tiep theo)[.!?\s]*$/.test(q)){task=old.subject?'workflow':old.task;focus=old.subject;target||=old.targetRole;}
 }
 if(!task)return null;
 if(task==='clarify_module'&&explicit)task='module_access';
 if(task==='module_access'&&!focus)task='clarify_module';
 if(user.role==='guest'&&task==='workflow'&&focus==='booking'&&/cach dat phong|huong dan dat phong|lam sao.*dat phong/.test(q)&&!/ghi coc|ghi tien|gan phong|xac nhan|nhan phong|tra phong/.test(q))focus='consumer';
 if(task==='self_permissions'){target=user.role;if(!focus&&old.subject&&/xem|sua|cap nhat|thao tac|xu ly|phan nay|chuc nang nay/.test(q))focus=old.subject;}
 const selectedOperation=operation||(!explicit&&focus===old.subject?old.operation:null);
 const dialogue={task,...(focus?{subject:focus}:{}),...(selectedOperation&&['workflow','action_permission'].includes(task)?{operation:selectedOperation}:{}),...(target?{targetRole:target}:{}),...(includeRoleCount?{includeRoleCount:true}:{})};
 return {intent:'policy',topic:'roles',dialogue};
}
function reason(u,dialogue){
 const d=valid(dialogue);
 if(['role_count','role_list','module_access','clarify_module'].includes(d.task))return u.role==='admin'&&A.can(u,'accounts.view')?null:'global_roles';
 if(d.targetRole&&d.targetRole!==u.role&&(u.role!=='admin'||!A.can(u,'accounts.view')))return 'other_role';
 if(['self_permissions','role_permissions'].includes(d.task))return u.role==='guest'&&d.subject&&d.subject!=='consumer'?'guest_workflow':null;
 const m=modules[d.subject];if(!m)return 'missing_subject';
 if(u.role==='guest')return d.subject==='consumer'?null:'guest_workflow';
 return A.can(u,m.view)||m.extra&&A.can(u,m.extra)?null:'module_permission';
}
function assert(u,d){if(reason(u,d))D.fail('Vai trò '+(u.anonymous?'Khách chưa đăng nhập':names[u.role])+' không được cấp phép hỏi nghiệp vụ hoặc phạm vi này.','FORBIDDEN',403);}
const item=(label,value)=>({label,value});
function available(u,key){if(key==='consumer')return u.role==='guest';const m=modules[key];return !!(m.view&&A.can(u,m.view)||m.extra&&A.can(u,m.extra));}
function result(s,u,question,plan){
 if(!plan.dialogue)return null;const d=valid(plan.dialogue);assert(u,d);
 const roles=Object.keys(A.defaults),roleNames=roles.map(r=>names[r]),internal=roles.filter(r=>r!=='guest'),roleDescription='Hệ thống có '+internal.length+' vai trò nội bộ: '+internal.map(r=>names[r]).join(', ')+'. Ngoài ra có vai trò Khách dành cho người đặt phòng; tính cả Khách thì cấu hình đăng nhập có '+roles.length+' vai trò. Khách chưa đăng nhập là trạng thái truy cập, không phải vai trò bổ sung.',m=modules[d.subject];let answer,facts,rows=[],columns=[],permission=null,summary;
 if(['role_count','role_list'].includes(d.task)){
  answer=roleDescription;
  facts={INTERNAL_COUNT:item('Số vai trò nội bộ, không bao gồm Khách',internal.length+' vai trò nội bộ'),INTERNAL_ROLES:item('Danh sách vai trò nội bộ',internal.map(r=>names[r]).join(', ')),GUEST:item('Vai trò người đặt phòng và trạng thái truy cập','Ngoài các vai trò nội bộ có vai trò Khách; khách chưa đăng nhập là trạng thái truy cập, không phải vai trò bổ sung'),TOTAL:item('Tổng số vai trò trong cấu hình đăng nhập khi tính cả Khách',roles.length+' vai trò khi tính cả Khách')};permission='accounts.view';summary=roleDescription;
 }else if(d.task==='module_access'){
  const allowed=roles.filter(role=>available({role},d.subject));const detail=allowed.map(role=>names[role]+(d.subject==='reports'&&role==='reception'?' (doanh thu hôm nay khi được cấp quyền)':''));
  answer='Theo phân quyền mặc định, '+m.name+' dành cho '+detail.join(', ')+'. Quyền sử dụng thực tế còn phụ thuộc các quyền đã cấp cho từng tài khoản và homestay được giao.';
  if(d.subject==='booking')answer+=' Khách sử dụng Booking của tôi hoặc Tra cứu booking cho thông tin của mình, không được vào nghiệp vụ Booking & khách.';
  if(d.includeRoleCount)answer=roleDescription+' '+answer;
  facts={MODULE:item('Tên chức năng đang được hỏi',m.name),ROLES:item('Các vai trò có quyền theo cấu hình mặc định',detail.join(', ')),CONDITION:item('Điều kiện phải giữ nguyên','quyền cấp cho từng tài khoản và homestay được giao')};
  if(d.subject==='booking')facts.GUEST=item('Ranh giới của khách','Khách chỉ dùng Booking của tôi hoặc Tra cứu booking của mình; không được vào nghiệp vụ Booking & khách');
  if(d.includeRoleCount){facts.INTERNAL_COUNT=item('Số vai trò nội bộ',String(internal.length));facts.INTERNAL_ROLES=item('Vai trò nội bộ',internal.map(r=>names[r]).join(', '));facts.COUNT=item('Tổng số vai trò trong cấu hình đăng nhập khi tính cả Khách',roles.length+' vai trò khi tính cả Khách');facts.ALL_ROLES=item('Tên tất cả vai trò bao gồm Khách',roleNames.join(', '));}
  permission='accounts.view';summary=m.name+' dành cho '+detail.join(', ')+' theo mặc định; quyền thực phụ thuộc từng tài khoản và cơ sở.';
 }else if(['self_permissions','role_permissions'].includes(d.task)){
  const role=d.task==='self_permissions'?u.role:d.targetRole||u.role,target=role===u.role?u:{role},self=role===u.role;
  if(role==='guest'){
   const visitor=self&&u.anonymous;answer=(self?(visitor?'Bạn đang là khách chưa đăng nhập. ':'Bạn đang hỏi với vai trò Khách. '):'Vai trò Khách dành cho người đặt phòng. ')+(self?'Bạn có thể ':'Người dùng vai trò này có thể ')+'tìm phòng, xem giá, tiện nghi và chính sách lưu trú.'+(visitor?' Đăng nhập để xem booking của chính mình.':A.can(target,'own-bookings.view')?' Có thể xem booking của chính tài khoản.':' Tài khoản hiện chưa được cấp quyền xem booking cá nhân.')+' Các nghiệp vụ nội bộ như quản lý khách, ghi cọc, nhận/trả phòng và báo cáo không thuộc phạm vi Khách.';
   facts={ACCOUNT:item('Phạm vi booking cá nhân',visitor?'cần đăng nhập để xem booking của chính mình':A.can(target,'own-bookings.view')?'được xem booking của chính tài khoản':'chưa được cấp quyền xem booking cá nhân'),ROLE:item('Vai trò đã được máy chủ xác thực hoặc admin đang tra cứu',self&&u.anonymous?'Khách chưa đăng nhập':'Khách'),ABILITIES:item('Những việc khách được hỗ trợ','tìm phòng, xem giá, tiện nghi và chính sách lưu trú'),LIMIT:item('Giới hạn nội bộ phải nói rõ','không truy cập nghiệp vụ quản lý khách, ghi cọc, nhận/trả phòng hoặc báo cáo')};
  }else{
   const keys=subjects.filter(key=>available(target,key));const labels=keys.map(key=>modules[key].name+(key==='reports'&&!A.can(target,'reports.view')?' (doanh thu hôm nay)':'')+(modules[key].edit&&A.can(target,modules[key].edit)?' (có quyền xử lý tương ứng)':' (xem theo quyền)'));
   if(d.subject){const can=available(target,d.subject);answer=(self?'Bạn đang hỏi với vai trò ': 'Vai trò ')+names[role]+'. '+(can?'Hiện được xem '+m.name+(m.edit&&A.can(target,m.edit)?' và thực hiện các thao tác đã được cấp.':'; các thao tác cập nhật cần quyền riêng.'):'Hiện chưa được cấp quyền xem '+m.name+'.');}
   else answer=(self?'Bạn đang hỏi với vai trò ': 'Vai trò ')+names[role]+'. '+(role==='admin'?'Đây là vai trò quản trị cao nhất. ':'')+'Phạm vi '+(self?'tài khoản hiện tại':'mặc định của vai trò')+' gồm: '+(labels.join(', ')||'chưa có nghiệp vụ được cấp')+'. Các thao tác và dữ liệu vẫn giới hạn theo quyền cụ thể'+(role==='admin'?'.':' và homestay được giao.');
   facts={ROLE:item('Vai trò đang được máy chủ xác thực hoặc admin đang tra cứu',names[role]),SCOPE:item('Thông tin quyền đã tính từ cấu hình thực',d.subject?answer.split('. ').slice(1).join('. '):labels.join(', ')||'chưa có nghiệp vụ được cấp'),CONDITION:item('Giới hạn quyền được áp dụng',role==='admin'?'quyền cụ thể đã cấp cho tài khoản hiện tại':'quyền cụ thể và homestay được giao')};
  }
  summary='Đã giải thích '+(self?'quyền thực của người hỏi':'quyền mặc định của '+names[role]);
 }else if(d.task==='action_permission'){
  const role=d.targetRole||u.role,target=role===u.role?u:{role},op=operations[d.operation];
  if(!op)D.fail('Cần nói rõ thao tác muốn kiểm tra quyền.','INVALID_AI_OUTPUT',400);
  const allowed=A.can(target,op.grant),who=role===u.role?'Tài khoản hiện tại của bạn':('Vai trò '+names[role]+' theo quyền mặc định');
  answer=who+(allowed?' có quyền ':' chưa được cấp quyền ')+op.name+'. '+(allowed?'Việc thực hiện vẫn phải đáp ứng điều kiện của nghiệp vụ và đúng homestay được giao.':'Quyền xem chức năng không tự bao gồm quyền thay đổi dữ liệu.');
  facts={ROLE:item('Người có quyền đang được kiểm tra',who),ACTION:item('Thao tác cụ thể',op.name),ACCESS:item('Kết quả đối chiếu quyền thực',allowed?'có quyền thực hiện nếu đủ điều kiện nghiệp vụ và đúng cơ sở':'chưa được cấp quyền thực hiện; quyền xem không đồng nghĩa quyền thay đổi')};permission=role===u.role?(A.can(u,m.view)?m.view:m.extra):'accounts.view';summary='Đã kiểm tra quyền '+op.name+' của '+names[role]+'.';
 }else if(d.task==='clarify_module'){
  answer='Bạn đang muốn kiểm tra quyền của chức năng nào? Ví dụ: Booking & khách, Hoá đơn hoặc Báo cáo.';facts={QUESTION:item('Câu hỏi làm rõ tên chức năng','Bạn muốn kiểm tra quyền của chức năng nào: Booking & khách, Hoá đơn hay Báo cáo?')};permission='accounts.view';summary='Đang chờ người hỏi chọn chức năng để kiểm tra quyền.';
 }else if(d.subject==='consumer'){
  answer='Bạn tìm phòng và xem báo giá trước nhé. Khi bấm Tiếp tục đặt phòng, hệ thống sẽ yêu cầu đăng nhập hoặc đăng ký rồi quay lại đúng phòng, ngày ở và số khách đã chọn. Kiểm tra lại giá, thông tin và chính sách trước khi gửi yêu cầu.';
  facts={PROCESS:item('Quy trình dành cho khách đã triển khai',answer)};summary='Đã hướng dẫn quy trình đặt phòng dành cho khách.';
 }else{
  const subjectUser=d.targetRole&&d.targetRole!==u.role?{role:d.targetRole}:u;
  const canEdit=m.edit&&A.can(subjectUser,m.edit),limited=d.subject==='reports'&&!A.can(subjectUser,'reports.view')&&A.can(subjectUser,'reports.revenue');
  const canRead=available(subjectUser,d.subject),op=d.operation?operations[d.operation]:null,allowedOp=op&&A.can(subjectUser,op.grant);
  const steps=d.task==='workflow'?(!canRead?['Vai trò này chưa được cấp quyền xem chức năng; không có quy trình được phép thực hiện ở vai trò này.']:op?(allowedOp?(op.steps||m.steps):['Bạn hiện chưa được cấp quyền '+op.name+'. Có thể tra cứu thông tin trong phạm vi quyền xem hiện tại.']):m.steps.slice(0,canEdit||!m.edit?3:2)):[];
  answer=(subjectUser!==u?'Với vai trò '+names[subjectUser.role]+', ':'')+m.name+' hỗ trợ '+m.description+'. '+(steps.length?steps.join(' '):'Bạn mở đúng mục này và chọn cơ sở được cấp để kiểm tra. ')+(m.edit&&!canEdit&&canRead?' Tài khoản hiện có quyền xem; thao tác cập nhật cần được cấp thêm đúng quyền.':'')+(limited?' Với quyền hiện tại của Lễ tân, doanh thu chỉ xem hôm nay trong cơ sở được giao.':'');
  facts={MODULE:item('Tên chức năng đang được trao đổi',m.name),PURPOSE:item('Chức năng đã triển khai',m.description),STEPS:item('Các bước đúng với quyền hiện tại',steps.join(' ')||'mở đúng mục và chọn cơ sở được cấp')};
  if(m.edit&&!canEdit&&canRead)facts.LIMIT=item('Quyền còn thiếu cho thao tác thay đổi','hiện có quyền xem; cập nhật cần đúng quyền riêng');if(limited)facts.REVENUE_LIMIT=item('Phạm vi doanh thu được cấp cho Lễ tân','chỉ doanh thu hôm nay trong cơ sở được giao');
  permission=subjectUser!==u?'accounts.view':A.can(u,m.view)?m.view:m.extra;summary='Đã '+(d.task==='workflow'?'hướng dẫn các bước':'giải thích chức năng')+' '+m.name+' trong quyền của người hỏi.';
 }
 const selfProperties=d.task==='self_permissions'&&u.role!=='guest'?A.allowedProperties(s,u):[];
 if(d.task==='self_permissions'&&u.role!=='guest'){
  const scope='Cơ sở trong phạm vi đang xem: '+(selfProperties.map(h=>h.name).join(', ')||'chưa được giao cơ sở nào')+'.';answer+=' '+scope;facts.PROPERTIES=item('Phạm vi cơ sở đã được máy chủ kiểm tra',scope);
 }
 const context={intent:'policy',topic:'roles',...(permission==='reports.revenue'&&u.role==='reception'?{from:D.today(),to:D.today()}:{}),dialogue:{...d,summary,question:facts.QUESTION?.value||null}};
 return {intent:'policy',answer,columns,rows,totalRows:rows.length,sources:['Vai trò, quyền tài khoản và chức năng HOMESTAY hiện tại'],permission,propertyIds:selfProperties.map(h=>h._id),audienceRole:u.role,audiencePermissions:A.permissions(u).slice().sort(),audienceAdmin:permission==='accounts.view',context,narrationFacts:facts,suppressExport:true};
}
function actor(u){return {role:u.role,label:u.anonymous?'Khách chưa đăng nhập':names[u.role],anonymous:!!u.anonymous,permissions:A.permissions(u)};}
function context(previous={}){const d=previous.dialogue;if(!d)return null;return {task:tasks.includes(d.task)?d.task:null,subject:subjects.includes(d.subject)?d.subject:null,targetRole:Object.hasOwn(names,d.targetRole)?d.targetRole:null,operation:Object.hasOwn(operations,d.operation)?d.operation:null,summary:typeof d.summary==='string'?d.summary.slice(0,500):'',question:typeof d.question==='string'?d.question.slice(0,300):null};}
module.exports={names,tasks,subjects,modules,operations,resolve,valid,reason,assert,result,actor,context};
