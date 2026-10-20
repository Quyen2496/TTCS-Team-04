'use strict';
const norm=q=>String(q||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
function plan(question,previous={}){
 const q=norm(question);
 if(/(?:chon|goi y|tu van).*(?:tot nhat|hop nhat|phu hop nhat)/.test(q)&&(previous.roomSearch||['recommendation','room_detail','availability','quote'].includes(previous.intent)))return {intent:'recommendation',searchRefinement:true};
 if(/^(?:ban tra loi sai|chua dung y|minh chua hieu|toi chua hieu|noi chuyen tu nhien hon|tra loi ngan gon(?: thoi)?|dai qua)[.!?\s]*$/.test(q))return {intent:'help',serviceAction:'repair'};
 if(/hoan (?:tien|coc)|tien hoan|hoan tra/.test(q))return {intent:'policy',topic:'cancel'};
 if(previous.intent==='policy'&&previous.topic==='cancel'&&/^(?:vay |the |con )?(?:ai|bao lau|khi nao|lien he|nhan o dau|gui cho ai|lam sao)/.test(q))return {intent:'policy',topic:'cancel'};
 if(/^(?:cam on|cam on ban|thank you|thanks|ok cam on|minh cam on)[.!\s]*$/.test(q)||/^(?:chao|hello|hi|alo|ban oi|minh can giup|toi can giup)[.!\s]*$/.test(q))return {intent:'help'};
 if(/^(?:minh|toi|em)\s+(?:can|muon)\s+(?:tu van|dat phong|tim cho o)/.test(q))return {intent:'recommendation'};
 return null;
}
function apply(s,u,question,plan,result,previous={}){
 const q=norm(question);
 if(plan.intent==='help'&&/^(?:xin chao|chao(?: ban)?|hello|hi|alo|ban oi)[.!?\s]*$/.test(q)){
  const prompt=u.role==='admin'?'Bạn muốn trao đổi về hệ thống hay kiểm tra nghiệp vụ nào?':u.role==='reception'?'Bạn cần kiểm tra khách đến, khách trả hay một booking cụ thể?':u.role==='housekeeping'?'Bạn cần xem phòng cần dọn hay phòng sạch trong cơ sở?':u.role==='owner'?'Bạn muốn xem tình hình cơ sở hay một việc cần xử lý?':u.role==='report'?'Bạn muốn xem doanh thu hay công suất, trong khoảng thời gian nào?':'Bạn đang tìm phòng cho kỳ nghỉ hay muốn hỏi về chính sách lưu trú?';
  result.answer='Chào bạn, mình sẵn sàng hỗ trợ. '+prompt;
  result.narrationFacts={OPENING:{label:'Lời chào ngắn, thân thiện; không tự giới thiệu dài',value:'Chào bạn'},QUESTION:{label:'Một câu hỏi đúng vai trò để tiếp tục; dùng nguyên câu',value:prompt}};
 }
 if(plan.intent==='help'&&plan.serviceAction==='repair'){
  if(previous.capability)result.context={...result.context,capability:previous.capability};
  result.answer='Mình hiểu rồi. Mình sẽ trả lời thẳng vào câu hỏi và nói ngắn gọn hơn. Bạn muốn mình làm rõ ý nào trong câu vừa rồi?';
  result.narrationFacts={ACK:{label:'Lời tiếp nhận phản hồi của người hỏi',value:'Mình hiểu rồi'},STYLE:{label:'Cách tiếp tục trao đổi',value:'trả lời thẳng câu hỏi, ngắn gọn và hỏi lại khi chưa rõ'},QUESTION:{label:'Hỏi lại để sửa đúng ý',value:'Bạn muốn mình làm rõ ý nào trong câu vừa rồi?'}};
 }
 if((u.role==='guest'||plan.publicCatalog)&&plan.intent==='policy'&&plan.topic==='booking')result.answer='Bạn xem phòng và báo giá, rồi chọn tiếp tục đặt phòng nhé. Nếu chưa có phiên đăng nhập, hệ thống sẽ mời bạn đăng nhập hoặc đăng ký và quay lại đúng phòng, ngày ở và số khách đã chọn. Sau khi kiểm tra thông tin và đồng ý chính sách, bạn gửi yêu cầu để nhận mã booking; giá và phòng trống được kiểm tra lại trước khi lưu.';
 if(plan.intent==='help'&&/cam on|thank/.test(q))result.answer='Rất vui được hỗ trợ bạn! Khi cần thêm thông tin về kỳ nghỉ hoặc công việc ở homestay, bạn cứ nhắn mình nhé.';
 if(plan.intent!=='policy'||plan.topic!=='cancel')return result;
 const who=/\bai\b|ben nao|nguoi nao|bo phan nao|lien he|gui cho ai/.test(q);
 const when=/bao lau|khi nao|may ngay|thoi gian|chua nhan|chua thay|cham hoan/.test(q);
 if(who){
  result.answer=u.role==='guest'?'Bạn liên hệ lễ tân hoặc chủ homestay nơi mình đã đặt phòng nhé. Cơ sở sẽ kiểm tra booking, khoản cọc đã nhận và số tiền được hoàn, rồi hướng dẫn việc hoàn tiền. Hệ thống hiện ghi nhận số tiền phải hoàn khi huỷ, chưa tự chuyển tiền hoàn về tài khoản của bạn.':u.role==='housekeeping'?'Việc hoàn cọc do lễ tân hoặc chủ homestay phụ trách. Bạn chuyển yêu cầu của khách cho bộ phận này để họ kiểm tra booking và khoản tiền đã nhận nhé.':'Lễ tân tiếp nhận yêu cầu và kiểm tra booking, tiền cọc đã nhận cùng chính sách lúc đặt. Bạn phối hợp chủ homestay hoặc người phụ trách thu chi để thực hiện hoàn và đối chiếu giao dịch ngân hàng. Số tiền phải hoàn trong hệ thống chưa phải xác nhận đã chuyển hoàn cho khách.';
  result.rows=[];result.columns=[];result.totalRows=0;
 }else if(when){
  result.answer='Mình hiểu bạn muốn biết khi nào nhận lại tiền. Hệ thống hiện chưa có thời hạn chuyển hoàn cố định hoặc xác nhận ngân hàng đã hoàn tiền; bạn cần liên hệ lễ tân/chủ homestay để kiểm tra giao dịch thực tế. Số tiền được hoàn còn phụ thuộc chính sách lưu trên booking và thời điểm huỷ. Bạn đang hỏi homestay nào để mình hướng dẫn đúng nơi liên hệ?';
  result.rows=[];result.columns=[];result.totalRows=0;
 }else if(u.role==='guest'||plan.publicCatalog)result.answer='Mình hướng dẫn bạn nhé: số tiền được hoàn phụ thuộc chính sách đã chốt trên booking và thời điểm bạn huỷ. Các mức đang cấu hình được hiển thị bên dưới; với booking đã đặt, cơ sở cần kiểm tra chính sách lưu trên booking để tính đúng. Bạn liên hệ lễ tân hoặc chủ homestay trước khi xác nhận huỷ; số tiền phải hoàn hiển thị chưa đồng nghĩa tiền đã được chuyển lại.';
 result.context={...result.context,intent:'policy',topic:'cancel'};
 return result;
}
function history(s,u,messages,canView,redact){
 const out=[];
 for(let i=0;i<messages.length-1;i++){
  const input=messages[i],output=messages[i+1];
  if(input.role!=='user'||output.role!=='assistant'||output.result?.denied||!canView(s,u,output.result))continue;
  out.push({role:'user',content:redact(input.content).slice(0,500)});
  const dialogue=require('./ai-dialogue').context(output.result.context||{}),knowledge=output.result.context?.knowledgeTopic;
  const summaries={accounting:'Chưa có phân hệ kế toán riêng; có cọc, quyết toán, hoá đơn và doanh thu.',roles:'Đã trao đổi quyền và vai trò; cần hiểu ý hỏi cụ thể tiếp theo.',ai:'Đã giải thích khả năng và giới hạn của trợ lý.',backup:'Đã giải thích sao lưu.',accounts:'Đã tổng hợp tài khoản theo quyền.',invoices:'Đã giải thích hoá đơn.',email:'Đã giải thích lịch sử email.',audit:'Đã giải thích nhật ký.',database:'Đã giải thích chế độ lưu dữ liệu.',unknown:'Chưa xác định rõ chức năng; đang cần người hỏi nói rõ tên nghiệp vụ.'};
  const question=typeof output.result.narrationFacts?.QUESTION?.value==='string'?redact(output.result.narrationFacts.QUESTION.value).slice(0,300):null;
  out.push({role:'assistant',content:JSON.stringify({intent:output.result.intent,topic:output.result.context?.topic||'general',...(require('./ai-knowledge').topics.includes(knowledge)?{knowledgeTopic:knowledge,summary:summaries[knowledge]||'Đã trao đổi chức năng được hỗ trợ.'}:{}),...(dialogue?{dialogue}:{}),...(output.result.context?.understanding?{understanding:output.result.context.understanding}:{}),...(require('./ai-inventory').context(output.result.context||{})?{inventory:require('./ai-inventory').context(output.result.context||{})}:{}),...(require('./ai-capability').context(output.result.context||{})?{capability:require('./ai-capability').context(output.result.context||{})}:{}),...(question?{question}:{})})});
 }
 return out.slice(-12);
}
module.exports={plan,apply,history};
