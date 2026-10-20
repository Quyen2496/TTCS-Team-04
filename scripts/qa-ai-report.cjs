'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'../docs/ai-qa');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name+'.json'),'utf8'));
const before=read('baseline-offline'),after=read('after-offline'),bm=read('baseline-mock'),am=read('after-mock'),live=read('live-sample');
const escape=s=>String(s??'').replaceAll('|','\\|').replaceAll('\n',' ');
let out=`# Kiểm thử trợ lý HOMESTAY — 19/10/2026

Nhánh: feature/quy-homestay-final-1-9-0. Nền ứng dụng package.json 1.9.0; không tìm thấy marker xác nhận bộ cài r12. Giữ các thay đổi chưa commit của Quý. Không push, merge, deploy, seed hoặc thay dữ liệu Atlas, email, thanh toán hay .env.

## Môi trường và phạm vi

Node 24.14.1, Windows. API Express thật trên cổng loopback ngẫu nhiên, JWT thật với secret kiểm thử, Store file trong thư mục tạm và model theo từng chế độ. Không dùng tài khoản hoặc booking thật. Hai cơ sở công khai Nhà Núi QA (A) và Nhà Biển QA (B), 51 phòng, 11 loại phòng. Owner/reception/report/housekeeping chỉ được giao A; Admin toàn hệ thống. Trong ba booking kiểm tra sở hữu, ABCD0001 thuộc khách đang test; ABCD0002 thuộc khách khác; BCDE0003 thuộc khách khác tại B. Có thêm hai booking lịch sử đã đóng của khách đang test để đối chiếu quyết toán. Loại phòng T1/T2 là Phòng đôi ở A/B. Có quyết toán A=1.600.000 và B=2.300.000 trong kỳ 01–18/10/2026, lấy từ fixture chứ không hardcode trong ứng dụng.

Tài liệu Word đã được đọc đầy đủ: 240 ca (200 chính + 40 Buồng phòng), thêm 14 ca công khai ở trạng thái chưa đăng nhập. K-L09 chạy ẩn danh. Tổng 254 lượt đánh giá chính; các câu chuẩn bị được gửi thêm trong cùng phiên theo phụ thuộc. Mỗi ca độc lập tạo phiên mới. Ngày ở được chuyển sang tương lai khi cần. Chuỗi xuất B-D12 giữ nguồn gốc B-D02 qua B-D11; tải Excel/PDF và kiểm tra chữ ký file. B-L03/04/05 thu hồi quyền/cơ sở trong fixture, khôi phục trước ca tiếp theo, kiểm tra tải lại file cũ.

Các câu trong Word là dữ liệu kiểm thử; không thực hiện yêu cầu xoá, đổi quyền, ghi tiền hoặc gửi email trong nội dung câu hỏi. Không mở rộng quyền để khớp kết quả mong đợi. Buồng phòng có trong mã nên chạy đầy đủ phụ lục. Các ca yêu cầu hướng dẫn được tính đạt nếu hướng dẫn đúng và nói rõ giới hạn; điều này không chứng minh chat đã có công cụ ghi nghiệp vụ.

## Kết quả

| Lượt | Đạt | Lỗi | Chưa hỗ trợ | Chưa chạy | Trung vị | p95 |
|---|---:|---:|---:|---:|---:|---:|
`;
for(const [name,doc]of [['Trước sửa — model tắt',before],['Sau sửa — model tắt',after],['Trước sửa — model mô phỏng',bm],['Sau sửa — model mô phỏng',am],['Mẫu cấu hình model thật — sau sửa',live]])out+=`| ${name} | ${doc.summary.counts['Đạt']} | ${doc.summary.counts['Lỗi']} | ${doc.summary.counts['Chưa hỗ trợ']} | ${doc.summary.counts['Chưa chạy']} | ${doc.summary.medianMs} ms | ${doc.summary.p95Ms} ms |\n`;
out+=`
Mức đạt ở trên là các tiêu chí tự động đã ghi trong từng ca, gồm kiểm tra nội dung bổ sung sau khi đọc lại phản hồi; cùng tiêu chí được áp lại lên phản hồi baseline đã lưu. Không đồng nghĩa toàn bộ chất lượng hội thoại đã được con người đánh giá độc lập, cũng không phải tỷ lệ hiểu đúng của Groq/Gemini. Model mô phỏng có độ trễ cố định 25 ms/lần và sinh kế hoạch từ bộ định tuyến cục bộ; dùng kiểm tra tích hợp, hợp đồng trả lời và fallback. Không lấy mô phỏng làm bằng chứng model thật hiểu câu hỏi. Điều kiện tải máy giữa các lượt chưa được chuẩn hoá, nên số đo trước/sau mô phỏng chỉ là tham khảo; không suy ra mức cải thiện tốc độ thực tế trên Atlas hoặc Internet.

Bộ hồi quy cuối: **422 bài, 420 đạt, 0 lỗi, 2 bỏ qua** do cần MongoDB QA riêng. Log: regression-final.txt. Lượt AI ban đầu: 238 bài, 237 đạt, 1 lỗi đường dẫn /tmp trên Windows. Đã sửa bài ghi Excel/PDF dùng thư mục fixture riêng. Sau thêm hồi quy có 8 bài mới về phạm vi, giao dịch cọc, sửa chỉ tiêu, ngữ cảnh, quyền và thời hạn dự phòng.

## Nguyên nhân và sửa đổi

1. Bộ đọc chính sách cọc bắt cả câu hỏi tiền đã nhận của booking. Tách chính sách công khai và giao dịch có mã booking; bảng booking bổ sung cọc yêu cầu/còn thiếu bằng deposit.forBooking, giữ lọc guestUserId.
2. Tên cơ sở có từ chỉ cảnh quan bị coi là nhu cầu tìm phòng. Chuẩn hoá và che tên cơ sở đã biết chỉ khi định tuyến; giữ nguyên câu hỏi thật khi tra dữ liệu. Giải quyết tên cơ sở từ dữ liệu máy chủ, kiểm tra membership, hỗ trợ toàn hệ thống và phạm vi nhiều cơ sở; không tin ID do model đưa ra.
3. Các bộ định tuyến tranh nhau xử lý câu sửa ý, hướng dẫn và xuất kết quả. Ưu tiên loại yêu cầu rõ; ràng buộc đúng công cụ, chỉ tiêu, kỳ báo cáo và đối tượng hướng dẫn. Giữ ngữ cảnh kỳ/cơ sở khi hỏi tiếp; chọn số thứ tự trước lời mời tư vấn cũ; sửa phủ định đếm phòng vật lý/loại phòng.
4. Câu ngoài lĩnh vực, bí mật và câu mơ hồ dùng chung lời từ chối. Phân biệt lời giải thích phạm vi, bảo vệ thông tin xác thực và câu hỏi làm rõ; giữ 403 cho phần bị giới hạn. Hỏi làm rõ không đọc bảng riêng.
5. Hỏi định nghĩa tài chính hoặc cách thao tác bị chuyển sang dữ liệu/đặt phòng. Dùng hướng dẫn gắn registry nghiệp vụ và quyền hiện tại; giải thích doanh thu, giá trị booking, cọc, kỳ rỗng và lỗi dữ liệu theo quy tắc thực tế. Không thêm công cụ ghi.
6. Ngay cả câu tra cứu đủ rõ vẫn gọi model phân loại/diễn đạt. Khi AI_SMART_ROUTING=true, các yêu cầu có công cụ/hợp đồng máy chủ rõ có thể trả trực tiếp, vẫn kiểm tra quyền trước/sau và lúc đọc lịch sử/file. Bỏ lượt diễn đạt mà hợp đồng chỉ cho phép chép nguyên [RESULT]. Không dùng cache dữ liệu riêng.
7. Timeout từng provider có thể cộng dồn. Tổng thời gian cho một lần completion giờ dùng chung cho cả chuỗi, chia phần thời gian cho fallback còn dùng được. Schema repair vẫn tối đa một lần và dùng cùng hạn; giữ cooldown/quota/safety block. Không nới schema.

## Model thật và giới hạn bằng chứng

`;
out+=`Mẫu 9 ca chính sau sửa có ${live.summary.providerCalls.length} lần gọi HTTP tới provider (kể cả câu chuẩn bị), ${live.summary.validModelPlans} kế hoạch hợp lệ theo schema trong toàn lượt. Các mục modelPlans, serverPlan, result, checks trong live-sample.json tách đầu ra model, kế hoạch máy chủ, phản hồi cuối và kiểm tra dữ liệu/quyền. HTTP 200 của provider không được coi là kế hoạch hợp lệ.\n\n`;
out+='| Ca | Thời gian | Kế hoạch model hợp lệ ở câu chính | Provider/engine cuối | Fallback |\n|---|---:|---:|---|---|\n';
for(const c of live.results)out+=`| ${c.id} | ${c.ms} ms | ${c.modelPlans.length} | ${escape(c.result.provider||'không gọi')}/${escape(c.result.engine||'từ chối')} | ${escape(c.result.fallbackReason||'—')} |\n`;
out+=`
Không đánh giá tỷ lệ hiểu model trên cả 254 ca: chỉ chạy mẫu nhỏ để tôn trọng quota. Câu xử lý trực tiếp hoặc fallback không chứng minh model hiểu đúng. Khi đọc kế hoạch cần kiểm tra cả confidence/clarify, đơn vị ngân sách và quan hệ với câu trước; JSON hợp lệ vẫn có thể sai ngữ nghĩa và được máy chủ sửa.

Ví dụ quan sát ở mẫu cuối: Groq trả 429 và luồng chuyển Gemini; Gemini trả HTTP 200 nhưng không có kế hoạch hợp lệ để sử dụng, nên fallback xử lý. Kế hoạch Groq cho K-D05 có confidence=high nhưng kèm clarify=goal và budgetScope=room, trong khi máy chủ giữ đúng ngân sách cả nhóm từ câu người dùng. Vì vậy không tính số kế hoạch hợp lệ theo schema thành số ca model hiểu đúng. Mẫu này chứng minh cơ chế bảo vệ/định tuyến và phản hồi cuối, chưa chứng minh model đạt 9/9.

Lượt live trước thay đổi giới hạn tổng timeout ghi nhận p95 11.825,33 ms; lượt sau hiển thị ở bảng. Đây là hai mẫu 9 ca, có quota và trạng thái provider khác nhau, không đủ chứng minh cải thiện p95 ổn định. Không dùng trung vị rất thấp của mẫu hỗn hợp (nhiều câu không gọi model) làm tốc độ đại diện cho model. JSON có thời gian authentication, context_preparation, classification, data_and_persistence, narration và http_total khi nhánh có chạy. Không triển khai streaming, nên không có phép đo thời gian token/nội dung hữu ích đầu tiên. Chưa đo riêng truy vấn Atlas, từng token, hoặc thời gian Cloudflare Tunnel.

Chưa xác minh trình duyệt thật/mobile, tài khoản thật, dữ liệu Atlas thật, email/payOS thật; chưa chạy toàn bộ 254 ca với model thật. Tiến trình cổng 3001 đang chạy trước đó chưa được tự dừng/khởi động lại. Các bài MongoDB bị bỏ qua không được tính đạt. Không có bằng chứng rằng package r12 đã được cài bằng bộ cài; trạng thái Git vẫn có các thay đổi trước phiên làm việc.

## Tệp thay đổi trong nhiệm vụ này

| Tệp | Mục đích |
|---|---|
| src/ai-query-scope.js (mới) | Giải quyết tên và phạm vi cơ sở bằng dữ liệu máy chủ |
| src/ai-service-info.js (mới) | Giải thích tài chính/điều chỉnh cọc/hướng dẫn thiếu quyền |
| src/ai-conversation.js | Ưu tiên ý định rõ, hướng dẫn và ngữ cảnh; trả doanh thu lên đầu |
| src/ai-data.js | Sử dụng kỳ đã xác minh, cọc thiếu, bộ lọc buồng phòng |
| src/ai-public-info.js, src/ai-inventory.js | Không lẫn giao dịch với chính sách/đếm; sửa lời phủ định |
| src/ai-answer-contract.js, src/ai-understanding.js | Ràng buộc công cụ và giữ kỳ/cơ sở; làm rõ khi thiếu căn cứ |
| src/ai-dialogue.js | Nêu cơ sở trong phạm vi hiện tại khi hỏi vai trò; bảo vệ lại lịch sử khi mất cơ sở |
| src/ai-policy.js, src/ai-scope.js | Hiểu chỉ tiêu bị phủ định, phân biệt lý do từ chối |
| src/ai-capability.js | Nhận hỏi khả năng/hướng dẫn, tránh khớp AI bên trong từ khác |
| src/ai-routes.js, src/ai-public.js | Tích hợp phạm vi và đường xử lý trực tiếp, observer kiểm thử |
| src/ai-provider.js, src/ai-transport.js | Observer kế hoạch/thời gian và tổng ngân sách timeout |
| server.js | Observer thời gian tùy chọn; không đổi bí mật hoặc dữ liệu |
| public/js/assistant.js | Không báo model lỗi khi câu được xử lý trực tiếp có chủ đích |
| test/ai-scenario-regressions.test.js (mới), test/ai-dual.test.js | Hồi quy HTTP, dữ liệu/quyền/phạm vi và deadline |
| test/ai.test.js | Đường dẫn xuất file tương thích Windows |
| test/ai-public.test.js | Kiểm tra lời từ chối theo lý do, vẫn giữ điều kiện 403/không gọi model |
| test/ai-semantic-routing.test.js | Tắt verified routing trong fixture chuyên fault injection để thực sự thử model và thu hồi quyền khi chờ |
| scripts/qa-ai-*.cjs, docs/ai-qa/* | Bộ chạy, dữ liệu kịch bản, tiêu chí và báo cáo trước/sau |

## Chạy lại

Git Bash, tại thư mục dự án:

\`\`\`bash
npm test
node scripts/qa-ai-scenarios.cjs --label=after-offline
node scripts/qa-ai-scenarios.cjs --mode=mock --label=after-mock
node scripts/qa-ai-report.cjs
\`\`\`

PowerShell dùng npm.cmd test nếu npm.ps1 bị chặn. Không cần đổi Execution Policy.

Kiểm tra model thật (tốn quota, chỉ dữ liệu tổng hợp, cần kết nối mạng):

\`\`\`bash
node scripts/qa-ai-scenarios.cjs --mode=live --ids=K-D05,K-D06,A-D05,B-D13,B-D14,K-L11,C-L01,L-D19,P-D15 --label=live-sample
\`\`\`

Trên giao diện: khởi động lại tiến trình npm start hiện tại khi tiện, tải lại trang, mở hội thoại mới. Thử chuỗi K-D05→06→17→18→19; hỏi giờ nhận/cọc của cơ sở thực; hỏi doanh thu toàn hệ thống khi đang lọc một cơ sở; B-D02→13→14; L-D01→19→20. Kiểm tra tab ẩn danh, booking của mình/khách khác, thu hồi quyền và tải file. Chỉ gửi câu hỏi thao tác nhạy cảm để kiểm tra phản hồi; không xác nhận hành động trên màn hình nghiệp vụ.

## Chi tiết từng ca

Phản hồi đầy đủ, điều kiện, phép kiểm tra và thời gian nằm trong JSON. Bảng dưới là chỉ mục đối chiếu trước/sau.

| Ca | Vai trò | Trước | Sau | ms trước/sau | Lỗi trước sửa |
|---|---|---|---|---|---|
`;
for(const a of after.results){const b=before.results.find(b=>b.id===a.id);out+=`| ${a.id} | ${a.role} | ${b?.status} | ${a.status} | ${b?.ms}/${a.ms} | ${escape(b?.checks.filter(c=>!c.ok).map(c=>c.why).join('; ')||'—')} |\n`;}
fs.writeFileSync(path.join(root,'README.md'),out.replaceAll('\\`','`'));
console.log('Wrote docs/ai-qa/README.md');
