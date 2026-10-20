'use strict';
const A=require('./access'),D=require('./domain');
const norm=q=>String(q||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
// The registry describes the application's real operations. None of the write
// operations is exposed as an executable chat tool. The model only names an
// operation; it cannot provide grants, tools, payloads or a success receipt.
const operations={
 booking_email_send:{name:'gửi thông tin booking qua email',subject:'consumer',public:true,unsupportedAction:true,match:q=>/gui(?:\s+\S+){0,14}\s+(?:booking|ma dat phong)|gui.*(?:email|mail).*(?:booking|dat phong)/.test(q)},
 account_permissions:{name:'thay đổi quyền tài khoản',subject:'accounts',view:'accounts.view',grant:'accounts.update',screen:'Tài khoản & quyền',match:q=>/(?:sua|doi|cap|gan|cap nhat|dieu chinh|thay doi|mo|bo sung|phan)(?:\s+\S+){0,5}\s+quyen|phan quyen|doi vai tro/.test(q),steps:'Mở Tài khoản & quyền, chọn đúng tài khoản, kiểm tra vai trò, các quyền và homestay được giao rồi lưu.',limit:'Quyền có thể cấp vẫn bị giới hạn bởi vai trò. Muốn giao cơ sở khác cần chọn đúng homestay; không thể biến Lễ tân thành Admin bằng cách bật mọi quyền.'},
 account_create:{name:'tạo tài khoản',subject:'accounts',view:'accounts.view',grant:'accounts.create',screen:'Tài khoản & quyền',match:q=>/(?:tao|them|lap|dang ky|mo)(?:\s+\S+){0,10}\s+(?:tai khoan|user|nhan vien)/.test(q)&&!/dang ky.*(?:tai khoan )?(?:khach|ca nhan)/.test(q),steps:'Mở Tài khoản & quyền, chọn tạo tài khoản, nhập thông tin bắt buộc, chọn vai trò và homestay phù hợp rồi kiểm tra trước khi lưu.'},
 account_delete:{name:'xoá tài khoản',subject:'accounts',view:'accounts.view',grant:'accounts.delete',screen:'Tài khoản & quyền',match:q=>/xoa(?:\s+\S+){0,7}\s+(?:tai khoan|user|nhan vien)/.test(q),steps:'Mở Tài khoản & quyền, chọn đúng tài khoản và kiểm tra điều kiện xoá trước khi xác nhận.'},
 account_update:{name:'cập nhật tài khoản',subject:'accounts',view:'accounts.view',grant:'accounts.update',screen:'Tài khoản & quyền',match:q=>/(?:sua|cap nhat|khoa|mo khoa)(?:\s+\S+){0,7}\s+(?:tai khoan|user|nhan vien)/.test(q),steps:'Mở Tài khoản & quyền và chọn đúng tài khoản cần cập nhật; kiểm tra thay đổi trước khi lưu.'},
 booking_create:{name:'đặt phòng',subject:'consumer',public:true,screen:'Đặt phòng',match:q=>/(?:tao|them|lap)(?:\s+\S+){0,7}\s+(?:booking|don dat phong)|dat (?:giup|ho|cho).*phong/.test(q),steps:'Chọn phòng, ngày ở và số khách, xem báo giá, đăng nhập nếu cần rồi kiểm tra thông tin trước khi gửi yêu cầu.'},
 booking_update:{name:'thay đổi booking',subject:'booking',view:'bookings.view',grant:'bookings.update',screen:'Booking & khách',match:q=>/(?:sua|doi|cap nhat|thay doi)(?:\s+\S+){0,6}\s+(?:booking|don dat phong)/.test(q),steps:'Mở Booking & khách, chọn booking và dùng thao tác phù hợp với trạng thái hiện tại sau khi kiểm tra thông tin.'},
 booking_cancel:{name:'huỷ booking',subject:'booking',view:'bookings.view',grant:'bookings.update',screen:'Booking & khách',match:q=>/huy(?:\s+\S+){0,6}\s+(?:booking|don dat phong|dat phong)/.test(q),steps:'Mở đúng booking, xem chính sách đã chốt, số tiền phải hoàn và điều kiện huỷ trước khi xác nhận.'},
 deposit:{name:'ghi nhận tiền cọc',subject:'booking',view:'bookings.view',grant:'bookings.update',screen:'Booking & khách',match:q=>/ghi(?:\s+\S+){0,6}\s+coc/.test(q),steps:'Mở đúng booking, đối chiếu tiền thực nhận, nhập số tiền, phương thức, thời điểm và tham chiếu rồi kiểm tra trước khi ghi cọc.'},
 assign:{name:'gán phòng',subject:'booking',view:'bookings.view',grant:'bookings.update',screen:'Booking & khách',match:q=>/gan(?:\s+\S+){0,4}\s+phong/.test(q),steps:'Chọn đúng booking, đối chiếu ngày ở và loại phòng rồi gán phòng hợp lệ trong cùng cơ sở.'},
 confirm:{name:'xác nhận booking',subject:'booking',view:'bookings.view',grant:'bookings.update',screen:'Booking & khách',match:q=>/(?:xac nhan|duyet)(?:\s+\S+){0,5}\s+booking/.test(q),steps:'Mở đúng booking, đối chiếu trạng thái, cọc, hạn giữ chỗ và điều kiện phòng trước khi xác nhận.'},
 checkin:{name:'nhận phòng',subject:'booking',view:'bookings.view',grant:'bookings.update',screen:'Booking & khách',match:q=>/nhan phong|check.?in/.test(q),steps:'Mở đúng booking, kiểm tra thông tin khách, ngày ở, cọc và phòng được gán trước khi nhận phòng.'},
 checkout:{name:'trả phòng và quyết toán',subject:'booking',view:'bookings.view',grant:'bookings.update',screen:'Booking & khách',match:q=>/tra phong|quyet toan|check.?out/.test(q),steps:'Mở booking đang lưu trú, đối chiếu tiền phòng, dịch vụ, cọc và khoản còn thu hoặc hoàn trước khi xác nhận trả phòng.'},
 invoice_create:{name:'lập hoá đơn',subject:'invoices',view:'invoices.view',grant:'invoices.create',screen:'Hoá đơn',match:q=>/(?:tao|lap|xuat)(?:\s+\S+){0,5}\s+hoa don/.test(q),steps:'Mở đúng booking hoặc Hoá đơn, kiểm tra quyết toán và thông tin chứng từ rồi thực hiện khi hệ thống cho phép.'},
 room_create:{name:'tạo phòng',subject:'rooms',view:'rooms.view',grant:'rooms.create',screen:'Phòng & loại phòng',match:q=>/(?:tao|them)(?:\s+\S+){0,5}\s+phong/.test(q),steps:'Chọn homestay, mở Phòng & loại phòng và kiểm tra thông tin, loại phòng, số phòng trước khi lưu.'},
 room_delete:{name:'xoá phòng',subject:'rooms',view:'rooms.view',grant:'rooms.delete',screen:'Phòng & loại phòng',match:q=>/xoa(?:\s+\S+){0,5}\s+phong/.test(q),steps:'Chọn đúng homestay và phòng; kiểm tra điều kiện xoá ở màn hình Phòng & loại phòng trước khi xác nhận.'},
 clean:{name:'cập nhật dọn phòng',subject:'housekeeping',view:'housekeeping.view',grant:'housekeeping.update',screen:'Buồng phòng',match:q=>/danh dau.*(?:sach|don)|cap nhat.*(?:don phong|phong sach)|hoan tat don/.test(q),steps:'Mở Buồng phòng, kiểm tra phòng thực tế trong cơ sở được giao rồi đánh dấu hoàn tất khi đúng trạng thái.'},
 price_edit:{name:'cập nhật giá và chính sách',subject:'pricing',view:'pricing.view',grant:'pricing.update',screen:'Giá & chính sách',match:q=>/(?:sua|doi|cap nhat|thay doi)(?:\s+\S+){0,4}\s+gia/.test(q),steps:'Chọn đúng một homestay, mở Giá & chính sách, kiểm tra giá và điều kiện trước khi lưu.'},
 backup_create:{name:'tạo bản sao lưu',subject:'backup',view:'system.view',grant:'system.view',screen:'Vận hành & sao lưu',match:q=>/sao luu|backup/.test(q),steps:'Mở Vận hành & sao lưu, kiểm tra trạng thái, bấm Sao lưu ngay và xem kết quả thực tế.'},
 export:{name:'xuất kết quả thành file',subject:'reports',view:'reports.view',grant:'reports.export',inChat:true,screen:'Trợ lý AI',match:q=>/(?:xuat|tao|tai)(?:\s+\S+){0,6}\s+(?:file|excel|pdf|bao cao)/.test(q),steps:'Tra cứu kết quả được phép xem trong cuộc chat, chọn đồng ý xuất rồi chọn định dạng có sẵn.'},
 own_cancel:{name:'huỷ booking của chính bạn',subject:'consumer',public:true,view:'own-bookings.view',grant:'own-bookings.cancel',screen:'Booking của tôi',match:()=>false,steps:'Đăng nhập, mở Booking của tôi, chọn booking của chính mình và kiểm tra chính sách, khoản hoàn và điều kiện huỷ trước khi xác nhận.'}
};
const modes=['request','ability','guide','status','authority','general','clarify'];
function valid(c){
 if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['mode','operation','targetRole'].includes(k))||!modes.includes(c.mode))throw Error('INVALID_AI_OUTPUT');
 if(c.targetRole!==undefined&&!Object.hasOwn(A.defaults,c.targetRole))throw Error('INVALID_AI_OUTPUT');
 if(c.operation!==undefined&&!Object.hasOwn(operations,c.operation)||!c.operation&&!['general','clarify'].includes(c.mode))throw Error('INVALID_AI_OUTPUT');return {...c};
}
function generalInquiry(question){
 if(!/\b(?:ban|ai|tro ly|chatbot)\b/.test(norm(question)))return false;
 if(/kha nang cua (?:ai|tro ly) trong chat/.test(norm(question)))return true;
 const clauses=norm(question).split(/[,;.!?]|\b(?:toi|minh|em) (?:chi )?muon (?:biet|hoi)\b/);
 return clauses.some(q=>{
  q=q.trim();if(/^(?:(?:toi|minh|em) )?(?:khong (?:can|muon|yeu cau|hoi)|dung hoi)/.test(q))return false;
  return /(?:ban|ai|tro ly|chatbot).*(?:lam (?:duoc )?(?:(?:nhung|cac|cac viec|nhung viec) )?gi|ho tro (?:(?:toi|minh) )?(?:(?:nhung|cac) )?gi|giup (?:toi|minh) nhung bao cao nao|co the lam (?:nhung )?gi|chuc nang.*(?:la gi|nhung gi)|kha nang.*(?:la gi|nhung gi))/.test(q)||/(?:nhung|cac) (?:viec|chuc nang|noi dung|nghiep vu).*(?:ban|ai|tro ly|chatbot).*(?:ho tro|lam duoc|giup)/.test(q)||/pham vi ho tro (?:cua )?(?:ban|ai|tro ly|chatbot)/.test(q);
 });
}
function resolve(question,previous={},u={role:'guest'}){
 const q=norm(question);if(/^(?:ban tra loi sai|chua dung y|minh chua hieu|toi chua hieu|noi chuyen tu nhien hon|tra loi ngan gon(?: thoi)?|dai qua)[.!?\s]*$/.test(q))return null;
 const old=previous.capability||{},assistant=/(?:\bban\b|\bai\b|tro ly|chatbot|giup|ho toi|ho minh|cho toi|cho minh)/.test(q),ability=/(?:co the|co tu|co .*duoc|lam duoc|duoc khong|duoc.*khong|co.*khong|co kha nang)/.test(q),guide=/huong dan|chi (?:toi|minh)|cach |lam sao|mo o dau|vao dau|lam o dau|bam o dau|cac buoc/.test(q),status=/da .*chua|xong chua|xong roi|tao chua|sua chua|cap nhat chua|da lam|ket qua (?:dau|the nao)/.test(q);
 if(generalInquiry(q))return {intent:'policy',topic:'general',capability:{mode:'general'}};
 const explicit=Object.keys(operations).filter(k=>operations[k].match(q));let operation=explicit[0],mode;
 if(u.role==='guest'&&operation==='booking_cancel')operation='own_cancel';
 const reference=/^(?:(?:vay|the|roi|the thi|vay thi)\s+)?(?:ban|minh|toi|em|ai|co the|lam|thuc hien|duoc|dong y|ok|xong|da |huong dan|chi |vao dau|mo o dau|bam o dau|buoc |tai sao|vi sao|khong|van|y toi)/.test(q)&&q.length<=250;
 const readQuestion=/bao nhieu|co may|so luong|thong ke|doanh thu|cong suat|phong trong|goi y|bao gia|danh sach|liet ke|vai tro|chinh sach|bao cao|so tai khoan/.test(q);
 if(!operation&&old.operation&&reference&&!readQuestion)operation=old.operation;
 if(operation){
  if(explicit.length&&old.mode&&/^(?:khong|y toi|toi hoi|minh hoi)/.test(q))mode=old.mode==='guide'?'guide':'ability';
  else if(old.mode==='clarify'&&explicit.length)mode='ability';
  else if(/(?:toi|minh|em) co (?:duoc |nhung )?quyen/.test(q)&&old.operation)mode='authority';
  else if(status&&(assistant||old.operation))mode='status';
  else if(guide&&(old.operation||operations[operation].subject==='accounts'||/lam o dau/.test(q)))mode='guide';
  else if(ability&&assistant&&!/^(?:toi|minh|em) co (?:quyen|the)/.test(q))mode='ability';
  else if(!guide&&!/vai tro nao|ai (?:co|duoc)|(?:toi|minh|em) co quyen|le tan co quyen|chu homestay co quyen|admin co quyen/.test(q)&&(assistant||/^(?:hay |vui long |lam on )?(?:tao|them|sua|doi|cap|ghi|gan|huy|xac nhan|xoa|nhan phong|tra phong|sao luu|backup|danh dau|lap)\b/.test(q)||old.operation&&/lam (?:di|luon)|thuc hien|dong y|^ok/.test(q)))mode='request';
  if(operations[operation].inChat&&mode!=='ability')return null;
 }else if(assistant&&ability&&/tao|sua|doi|ghi|gan|xoa|cap nhat|lam|thuc hien|thao tac|tu dong/.test(q))mode='clarify';
 else if(assistant&&/sua duoc quyen|doi duoc quyen|cap duoc quyen/.test(q)){operation='account_permissions';mode='ability';}
 else if(assistant&&/thuc hien|lam (?:giup|ho)|da lam.*chua/.test(q)&&!readQuestion)mode='clarify';
 else if(old.mode&&reference&&/lam (?:di|luon)|thuc hien|sua|tao|ghi|gan|xoa|duoc khong/.test(q))mode='clarify';
 if(!mode&&/^(?:(?:vay|the|roi) )?(?:lam di|lam luon|thuc hien di|thuc hien luon)[.!?\s]*$/.test(q))mode='clarify';
 if(!mode)return null;
 const rolePatterns={admin:/admin|quan tri vien/,owner:/chu homestay|chu nha/,reception:/le tan/,report:/(?:vai tro|tai khoan|nhan vien) bao cao/,housekeeping:/buong phong/,guest:/(?:vai tro|tai khoan|nguoi dung) khach/};
 const targetRole=operation?.startsWith('account_')?(Object.keys(rolePatterns).find(role=>rolePatterns[role].test(q))||(operation===old.operation?old.targetRole:null)):null;
 return {intent:'policy',topic:'general',capability:{mode,...(operation?{operation}:{}),...(targetRole?{targetRole}:{})}};
}
function reason(u,c){
 c=valid(c);if(!c.operation)return null;const op=operations[c.operation];
 if(u.role==='guest')return op.public?null:'internal_operation';
 if(op.public)return null;
 return A.can(u,op.view)||A.can(u,op.grant)?null:'operation_scope';
}
function assert(u,c){if(reason(u,c))D.fail('Vai trò hiện tại chưa được cấp quyền trao đổi về thao tác nội bộ này.','FORBIDDEN',403);}
function result(s,u,q,plan){
 if(!plan.capability)return null;const c=valid(plan.capability);assert(u,c);const op=operations[c.operation],names=require('./ai-dialogue').names;
 let answer,allowed=false;
 if(!op)answer=c.mode==='clarify'?'Bạn muốn mình thực hiện thao tác nào? Mình cần biết rõ việc bạn muốn làm; hiện chat hỗ trợ tra cứu và hướng dẫn, chưa trực tiếp thay đổi dữ liệu.':'Mình có thể tra cứu, giải thích nghiệp vụ, tư vấn phòng và hỗ trợ xuất kết quả được phép xem. Hiện mình chưa trực tiếp tạo tài khoản, đổi quyền, ghi cọc hay thay đổi booking. Quyền của bạn trong hệ thống được kiểm tra riêng theo tài khoản đang đăng nhập.';
 else{
  allowed=op.public&&!op.grant?!u.anonymous:A.can(u,op.grant);
  if(op.unsupportedAction)answer='Mình hiểu bạn muốn gửi mã và thông tin booking qua email. Hiện chat chưa hỗ trợ gửi lại booking tới một email tuỳ chọn; mình chưa gửi thư nào. Hệ thống gửi email nghiệp vụ theo các sự kiện booking khi cấu hình email sẵn sàng. '+(A.can(u,'email.view')?'Bạn kiểm tra đúng booking và mục Lịch sử email để xem thư đã gửi hay gặp lỗi.':'Bạn kiểm tra email đã lưu trên booking, thư rác hoặc nhờ cơ sở kiểm tra trạng thái gửi.');
  else if(op.inChat)answer='Có, mình có thể hỗ trợ '+op.name+' khi có kết quả phù hợp trong cuộc chat và tài khoản được cấp quyền xuất kết quả đó. '+op.steps;
  else{
   const identity=u.anonymous?'Bạn chưa đăng nhập':('Tài khoản '+names[u.role]+' hiện tại của bạn'),right=u.anonymous&&op.public?'Bạn cần đăng nhập để thực hiện trên booking của chính mình.':allowed?identity+' có quyền '+op.name+(u.role==='admin'?'.':' trong homestay được giao.') :identity+' chưa được cấp quyền '+op.name+'.';
   const target=c.targetRole&&c.operation==='account_permissions'?('điều chỉnh quyền cho '+names[c.targetRole]):op.name;
   const namedProperty=(s.homestays||[]).find(h=>norm(h.name).length>=4&&norm(q).includes(norm(h.name))),place=namedProperty?' tại '+namedProperty.name:'';
   const limit=c.mode==='guide'?'Mình hướng dẫn theo quyền hiện tại của bạn nhé.':c.mode==='authority'?'Mình đối chiếu theo quyền hiện tại của bạn nhé.':c.mode==='status'?'Mình chưa thực hiện '+op.name+' và chưa thay đổi dữ liệu.':c.mode==='request'?'Mình hiểu bạn muốn '+target+place+'. Hiện mình chưa thể thực hiện trực tiếp thao tác này trong chat.':'Hiện mình chưa thể trực tiếp '+op.name+' trong chat.';
   answer=limit+' '+right+' '+(allowed||op.public?(c.mode==='request'||c.mode==='guide'?op.steps:'Bạn thực hiện tại '+op.screen+'.'):'Bạn cần nhờ người có quyền phù hợp xử lý hoặc cấp đúng quyền trước.');
   if(op.limit&&allowed&&(c.mode==='guide'||/moi quyen|tat ca quyen|toan quyen/.test(norm(q))))answer+=' '+op.limit;
   if(/bo qua.*(?:rang buoc|quy tac|gioi han)/.test(norm(q)))answer+=' Mình vẫn phải giữ các kiểm tra quyền và điều kiện của hệ thống.';
  }
 }
 const context={intent:'policy',topic:'general',capability:{...c,summary:op?(op.name+': '+(op.inChat?'có thể xuất kết quả phù hợp trong chat':'chat chưa thực hiện; chưa thay đổi dữ liệu')+'; '+(allowed?'người hỏi có quyền thao tác theo điều kiện':'người hỏi cần đúng quyền hoặc đăng nhập')):'Đã giải thích giới hạn thao tác của trợ lý; không tự thay đổi dữ liệu.'}};
 return {intent:'policy',answer,columns:[],rows:[],totalRows:0,sources:['Chức năng thực tế của trợ lý và quyền tài khoản hiện tại'],propertyIds:[],permission:null,audienceRole:u.role,audiencePermissions:A.permissions(u).slice().sort(),suppressExport:true,context,narrationFacts:{RESULT:{label:'Câu trả lời xác thực về quyền người dùng và khả năng thực hiện của chat',value:answer}}};
}
function context(p={}){const c=p.capability;if(!c)return null;return {mode:modes.includes(c.mode)?c.mode:null,targetRole:Object.hasOwn(A.defaults,c.targetRole)?c.targetRole:null,operation:Object.hasOwn(operations,c.operation)?c.operation:null,summary:typeof c.summary==='string'?c.summary.slice(0,500):''};}
function pending(previous,u){try{const old=previous.capability;if(!old)return null;const c=valid({mode:old.mode,...(old.operation?{operation:old.operation}:{}),...(old.targetRole?{targetRole:old.targetRole}:{})});return reason(u,c)?null:c;}catch{return null;}}
module.exports={generalInquiry,operations,modes,valid,resolve,reason,assert,result,context,pending};
