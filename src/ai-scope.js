'use strict';
const A=require('./access'),P=require('./ai-provider');
const names={admin:'Admin',owner:'Chủ homestay',reception:'Lễ tân',report:'Báo cáo',housekeeping:'Buồng phòng',guest:'Khách'};
const roomIntents=['recommendation','availability','quote','room_detail'];
function denial(u,reason){
 if(reason==='unrelated')return 'Mình hỗ trợ thông tin lưu trú và nghiệp vụ HOMESTAY, chưa hỗ trợ nội dung thuộc lĩnh vực này. Bạn có thể hỏi về phòng, giá hoặc chính sách lưu trú nhé.';
 if(reason==='secret')return 'Mình không cung cấp mật khẩu, khóa API, chỉ thị nội bộ hoặc thông tin xác thực. Bạn có thể dùng màn hình tài khoản và quy trình hỗ trợ được phép.';
 if(reason==='unclear')return 'Bạn muốn hỏi về phòng, booking hay báo cáo nào? Mình cần rõ đối tượng và nhu cầu để hỗ trợ đúng.';
 return 'Vai trò '+(u.anonymous?'Khách chưa đăng nhập':names[u.role]||'hiện tại')+' không được cấp phép cho yêu cầu này. Mình có thể hỗ trợ '+(u.role==='housekeeping'?'phòng cần dọn, trạng thái phòng và hướng dẫn buồng phòng trong cơ sở được cấp.':u.role==='guest'?'tìm phòng, xem giá, tiện nghi và chính sách lưu trú'+(u.anonymous?'. Bạn đăng nhập để xem booking của mình.':', hoặc booking của chính bạn.'):'nghiệp vụ homestay trong phạm vi quyền và cơ sở đã được cấp.');}
function reason(u,question,{previous={},action,plan,catalog=[]}={}){
 const q=P.normalize(question);
 const adminDatabaseHelp=u.role==='admin'&&/co so du lieu|mongodb|data_mode/.test(q)&&!/mat khau|api[_ ]key|secret|uri|connection string|chuoi ket noi|system prompt|bo qua|drop\s+table|delete\s+from|truncate\s+table|update\s+\w+\s+set/.test(q);
 if(!adminDatabaseHelp&&/\b(jwt(?:[_-]secret)?|smtp[_-]pass|api[_ ]key|secret|mongodb|system prompt|bo qua quy tac|bo qua.*(?:quyen|chi thi)|dong vai.*(?:admin|quan tri))\b|drop\s+table|delete\s+from|truncate\s+table|update\s+\w+\s+set/.test(q))return 'secret';
 if(/khong lien quan|thoi tiet|bong da|doi bong|bong ro|chinh tri|chien tranh|chung khoan|co phieu|xo so|tien ao|bitcoin|crypto|lap trinh|viet code|giai (?:toan|bai tap)|tich phan|hinh hoc|cong thuc nau|lam banh|tu vi|xem boi|chan doan|ke (?:don )?.*thuoc/.test(q)||/\d\s*[+*=]\s*\d/.test(q))return 'unrelated';
 if(plan?.understanding?.confidence==='low')return null;
 if(u.role==='guest'&&/doanh thu|doanh so|thuc thu|cong suat|ty le lap day|phong (?:dang o|co khach)|danh sach khach|khach dang o|khach khac|booking cua (?:nguoi|khach) khac|gan phong|ghi (?:tien )?coc|doi trang thai phong|xac nhan booking|duyet booking/.test(q))return 'staff';
 if(u.role==='guest'&&plan?.catalogFollowup&&plan.intent==='recommendation')return null;
 if(plan?.publicCatalog&&!plan.inventory&&!plan.capability&&!plan.dialogue&&!plan.knowledgeTopic)return null;
 if(plan?.intent==='export')return u.anonymous?'login_required':null;
 if(plan?.explicitLookup&&['arrivals','departures','housekeeping','report','room_detail','booking'].includes(plan.intent))return null;
 const explanation=plan?.explanation?plan:require('./ai-explanation').resolve(question);if(explanation?.explanation){try{require('./ai-explanation').assert(u,explanation.explanation);return null;}catch{return 'explanation_scope';}}
 const capability=plan?.capability?plan:require('./ai-capability').resolve(question,previous,u);if(capability?.capability)return require('./ai-capability').reason(u,capability.capability);
 const inventory=plan?.inventory?plan:require('./ai-inventory').resolve(question,previous);if(inventory?.inventory){if(u.role==='guest'&&/tai khoan|phan quyen|vai tro|nhan vien|nhat ky|sao luu|cau hinh he thong/.test(q))return 'internal';try{require('./ai-inventory').assert(u,inventory.inventory,plan?.publicCatalog);return null;}catch{return 'inventory_scope';}}
 const dialogue=plan?.dialogue?plan:require('./ai-dialogue').resolve(question,previous,u);if(dialogue?.dialogue)return require('./ai-dialogue').reason(u,dialogue.dialogue);
 if(/ke toan|phan quyen|quyen han|vai tro|tai khoan nhan vien|tai khoan le tan|cau hinh he thong|nhat ky he thong|ma nguon|source code|co so du lieu|backend|frontend|framework|ngon ngu lap trinh|cau hinh.*(?:payos|ngan hang|ai)|\b(?:groq|gemini)\b/.test(q)&&u.role!=='admin')return 'internal';
 if(u.role==='guest'&&/gan phong|ghi (?:tien )?coc|ghi so coc|doi trang thai phong|xac nhan booking|duyet booking|danh sach khach|khach dang o|khach khac|booking cua (?:nguoi|khach) khac/.test(q))return 'staff';
 if(u.anonymous&&(plan?.intent==='booking'||plan?.intent==='export'||/booking cua toi|dat phong cua toi|tra (?:cuu )?booking/.test(q)))return 'login_required';
 if(/thoi tiet|bong da|bong ro|chinh tri|chien tranh|chung khoan|tien ao|bitcoin|crypto|lap trinh|viet code|giai (?:toan|bai tap)|cong thuc nau|lam banh|tu vi|xem boi|chan doan|ke don thuoc/.test(q)||/\d\s*[+*=]\s*\d/.test(q))return 'unrelated';
 if(u.role==='admin'&&(plan?.knowledgeTopic||require('./ai-knowledge').plan(question,previous,u)))return null;
 if(plan){
  if(plan.publicCatalog)return null;
  if(plan.intent==='policy'&&plan.topic==='roles'&&u.role!=='admin')return 'internal';
  if(u.role==='housekeeping'&&!['housekeeping','help','policy','unsupported','export'].includes(plan.intent))return 'role';
  if(u.role==='housekeeping'&&plan.intent==='policy'&&!/don phong|buong phong|ve sinh|phong sach|phong ban|trang thai phong|mat khau/.test(q))return 'role';
 }
 if(action)return null;
 if(/\b(xuat|tai|luu|in)\b.*\b(file|excel|execl|xlsx|pdf|bao cao|du lieu)\b|^(excel|execl|pdf|xlsx)( nhe)?[.!?\s]*$/.test(q))return null;
 if(/^(?:xin chao|chao(?: ban)?|hello|hi|alo|ban oi|cam on(?: ban)?|thank(?: you|s)|ok(?: cam on)?|oke|duoc|dong y|co(?: nhe)?|khong(?: can)?|de sau)[.!?\s]*$/.test(q)||/^(?:ban tra loi sai|chua dung y|minh chua hieu|toi chua hieu|noi chuyen tu nhien hon|tra loi ngan gon(?: thoi)?|dai qua)[.!?\s]*$/.test(q))return null;
 if(/phong|homestay|luu tru|cho o|cho nghi|ky nghi|booking|dat cho|check.?in|check.?out|tien nghi|dien tich|wifi|wi-fi|dieu hoa|may lanh|bep|ho boi|be boi|ban cong|bai xe|may giat|bua sang|bao gia|ngan sach|tien coc|dat coc|hoan (?:tien|coc)|chuyen khoan|thanh toan|quet qr|payos|huy don|chinh sach|noi quy|gio nhan|gio tra|quen mat khau|doi mat khau|bao cao|kinh doanh|doanh thu|doanh so|thuc thu|thu nhap|cong suat|thong ke|tong quan|khach (?:den|di|nhan|tra)|can xu ly|canh bao|ho tro|tro giup|ban lam duoc|ban co the|toi co the hoi/.test(q))return null;
 if(catalog.some(t=>P.normalize(t.name).length>=3&&q.includes(P.normalize(t.name))))return null;
 // A short referential follow-up can be interpreted by the model using the
 // authorized semantic context; resulting intent/grants are checked again.
 if((previous.dialogue||previous.capability)&&plan?.intent==='unsupported'&&q.length<=250&&/^(?:vay|the|con|phan nay|chuc nang nay|thao tac nay|o do|y ban|dieu nay)\b/.test(q))return null;
 if((roomIntents.includes(previous.intent)||previous.roomSearch)&&require('./ai-preferences').hasRoomFollowup(question))return null;
 if(roomIntents.includes(previous.intent)||previous.roomSearch){
  if(/^(?:(?:con|va|the|vay|minh|toi|em|nhom minh)\s+)*(?:(?:can|muon|o|tu|ngay|nhan|tra|chon|be|tre|toi da|khong qua|duoi|tam|khoang)\b|\d|mot\b|hai\b|ba\b|bon\b|nam\b|sau\b|ngay mai|hom nay)/.test(q)&&/(?:nguoi|khach|dem|tuoi|nguoi lon|tre em|trieu|nghin|ngan|dong|\bvnd\b|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}|ngay mai|hom nay|^chon\s+(?:so\s*)?\d)/.test(q))return null;
 }
 if(previous.intent==='policy'&&previous.topic==='cancel'&&/^(?:vay |the |con )?(?:ai|bao lau|khi nao|lien he|nhan o dau|gui cho ai|lam sao)[^\n]*$/.test(q))return null;
 if(['report','occupied','arrivals','departures'].includes(previous.intent)&&/^(?:con |va |the )?(?:thang|nam|hom nay|ngay mai|hom qua|tu ngay|tu \d)/.test(q))return null;
 return 'unclear';
}
function assert(u,question,options){const why=reason(u,question,options);if(why){const D=require('./domain');D.fail(denial(u),'FORBIDDEN',403);}return true;}
module.exports={reason,denial,assert};
