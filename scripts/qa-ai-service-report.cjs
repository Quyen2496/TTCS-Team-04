'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.join(__dirname,'../docs/ai-qa');
const read=label=>JSON.parse(fs.readFileSync(path.join(root,label,'results.json'),'utf8')),before=read('browser-baseline'),after=read('browser-final'),variants=read('browser-variants');
const traces=fs.readFileSync(path.join(root,'service-fixes/runtime-traces.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse),measure=doc=>{const a=doc.results.map(r=>r.completeMs).sort((a,b)=>a-b);return {median:a[Math.floor(a.length/2)],p95:a[Math.ceil(a.length*.95)-1]};};
const b=measure(before),a=measure(after),v=measure(variants),safe=s=>String(s||'').replaceAll('|','\\|').replaceAll('\n',' ');
let text=`# Kiểm chứng localhost, chính sách và hiệu năng — 19/10/2026

Đây là kết quả Chromium thật, ứng dụng localhost:3001 thật và dữ liệu Atlas thật. Các ca công khai dùng phiên ẩn danh mới; không đọc phiên riêng trên trình duyệt người dùng. Không dùng model mô phỏng hoặc fixture để kết luận tốc độ web.

## Phiên bản đang chạy

- Nhánh feature/quy-homestay-final-1-9-0, package.json 1.9.0; giữ thay đổi chưa commit, không dùng ZIP cũ.
- Tiến trình ban đầu PID 22356, thư mục làm việc D:/CodeGym_project/HOMESTAY/HOMESTAY, khởi động 22:03:41 ngày 19/10/2026. Đọc thư mục làm việc từ thông tin tiến trình, không đọc môi trường/bí mật của tiến trình. Các tệp chính đã được sửa trước lúc này; tài nguyên assistant.js và assistant.html trả về khớp tệp trên đĩa. Vì vậy không quy mọi lỗi cho mã cũ.
- Sau sửa chỉ dừng đúng tiến trình HOMESTAY đã kiểm tra cổng; giữ Cloudflare và ứng dụng khác. Bản cuối PID 29028, build **${after.results[0].build}**, khởi động 22:39:43 giờ Việt Nam. /api/health trả runtime build khớp fingerprint mã trên đĩa; tài nguyên frontend cũng khớp. Không thay .env.
- Fingerprint gồm server, Store/access/domain, các mô-đun AI và assistant.js. Hash được chốt khi tiến trình khởi động; không lấy hash mới trên đĩa làm bằng chứng cho tiến trình cũ.
- Trong lượt này chỉ nhận được văn bản mô tả A–G, không có ảnh gốc trong thư mục đính kèm. Các ảnh liên kết bên dưới là ảnh tái hiện mới. D và E hoạt động một phần ở hội thoại mới trong baseline; không tuyên bố tái hiện được mọi biểu hiện trong ảnh chưa nhận.

## Số đo trước/sau trên trình duyệt

Đo từ thao tác Gửi đến khi nội dung trợ lý đã render. Không tính “đang xử lý” là nội dung hữu ích. Chưa triển khai streaming, nên thời gian nội dung hữu ích đầu tiên gần bằng hoàn tất phản hồi. Server-Timing và X-Request-Id liên kết từng yêu cầu với runtime-traces.jsonl; không log câu hỏi, JWT, API key, email, tên khách hoặc chuỗi kết nối.

| Nhóm | Số ca | Trung vị | p95 | Ca >10 giây |
|---|---:|---:|---:|---:|
| A–G, trước sửa | 10 | ${b.median} ms | ${b.p95} ms | ${before.results.filter(r=>r.completeMs>10000).length} |
| A–G, bản cuối | 10 | ${a.median} ms | ${a.p95} ms | ${after.results.filter(r=>r.completeMs>10000).length} |
| Cách hỏi mới, bản cuối | 8 | ${v.median} ms | ${v.p95} ms | ${variants.results.filter(r=>r.completeMs>10000).length} |

Mục tiêu cục bộ dựa trên baseline: với nhóm đọc công khai có đủ công cụ, nội dung hữu ích dưới 5 giây ở p95; với câu phải gọi model, cố giữ toàn luồng dưới 10 giây bằng cách dành thời gian cho đọc dữ liệu cuối. Mẫu trên đáp ứng mục tiêu này, nhưng 10/8 ca là mẫu nhỏ, chưa phải SLO hay bảo đảm tốc độ cho mọi phiên, mọi giờ, mọi tài khoản hoặc qua Cloudflare.

## Nguyên nhân thực tế

1. **Atlas, không phải mặc định do tunnel:** full state khoảng 1.210.056 byte mất 13,17–13,20 giây/lần ở 3 mẫu chỉ đọc. Projection công khai khoảng 314.778 byte mất 3,60–3,64 giây. Chat công khai cũ thường đọc full state hai lần trước/sau model, dẫn tới khoảng 26 giây chỉ để lấy dữ liệu. Các phép đo này nằm trong atlas-read-baseline.json; không có seed/reset/migration trong script đo.
2. **Thiếu lớp xác định trường dữ liệu cần trả:** “hoàn tiền” bị gán sang cọc cần nộp hoặc câu hỏi làm rõ chung. Thêm request công khai theo loại dữ liệu cần trả; huỷ/hoàn cọc, bữa sáng, dịch vụ TV, phương thức thanh toán và hỗ trợ sự cố có công cụ đọc riêng. Hợp đồng câu trả lời giữ đúng công cụ; lỗi provider không biến yêu cầu đầy đủ thành yêu cầu mơ hồ.
3. **Tên cơ sở chỉ khớp chuỗi nguyên văn:** không xử lý tốt đảo thứ tự từ. Resolver đối chiếu các từ đủ đặc trưng từ danh mục thật, có/không dấu và hoa/thường; tên rút gọn nhiều ứng viên phải hỏi lại. Không dùng đoán khoảng cách ký tự để tự chọn hoặc coi mơ hồ là tất cả.
4. **Bộ lọc và ngữ cảnh lấn câu hiện tại:** tiện nghi phòng đã nêu vẫn có thể bị chuyển sang tìm phòng/giá; phòng trống đủ ngày có thể kế thừa phòng đã chọn rồi bị đổi công cụ. Ưu tiên yêu cầu hiện tại và đầy đủ ngày; tiện nghi chỉ đọc danh sách đã xác nhận, không dùng ngày cũ để xác nhận tồn phòng.
5. **Frontend chờ tải lại lịch sử:** sau POST chat đã có kết quả, frontend còn GET lại toàn hội thoại rồi mới render. Bản mới ghép trực tiếp thông điệp vừa nhận (có kiểm tra trùng ID); các yêu cầu mạng sau Gửi trong JSON cho thấy không cần GET đó trước khi hiển thị.
6. **Chat đăng nhập dùng Store nghiệp vụ:** lưu hội thoại từng đi qua quy trình toàn state, sổ phòng, hoá đơn và so sánh email. Bổ sung truy vấn identity, projection công khai và giao dịch chỉ push/set/pull đúng hội thoại của đúng user; có revision, kiểm tra tài khoản trong transaction, giới hạn dung lượng toàn cục, không ghi lại booking, ledger, email hoặc ảnh. Nhánh Mongo được kiểm tra bằng fake driver về phạm vi ghi; chưa đo đăng nhập thật do chưa có thông tin đăng nhập.
7. **Thời gian model cộng dồn:** giữ hạn completion chung cho fallback và thêm ngân sách chung theo yêu cầu. Trước classification chừa lại thời gian đọc dữ liệu dựa trên lần đọc Atlas vừa đo. Không gọi narrator cho dữ liệu có cấu trúc hoặc [RESULT] không được phép viết lại. Không dùng cache giá/phòng trống/quyền; nếu đã chờ model thì đọc lại dữ liệu công khai trước khi trả.

## Kết quả từng câu A–G

Đánh giá độc lập từ projection Atlas gồm chính sách hiện tại, danh mục/tiện nghi và phép đếm phòng trống từ booking + bảo trì. Không dùng router hoặc câu trả lời của AI làm đáp án đúng. Baseline đạt ${before.review?.passed}/10 theo tiêu chí mới; bản cuối ${after.review?.passed}/10.

| Ca | Trước | Sau | ms trước/sau | Mã yêu cầu bản cuối | Kết quả sau sửa |
|---|---|---|---:|---|---|
`;
for(const c of after.results){const old=before.results.find(r=>r.id===c.id);text+=`| [${c.id}](../browser-final/${c.id}.png) | ${old.verdict} | ${c.verdict} | ${old.completeMs}/${c.completeMs} | ${c.requestId} | ${safe(c.result.answer)} |\n`;}
text+=`
## Tách thời gian backend và render

Các span classification đã gồm provider/repair/failover, nên không cộng lại classification với provider để tính tổng. Cột Atlas cộng các lần đọc trong đúng request. Baseline không có Server-Timing nên không thể hồi tố chia từng request cũ; phép đo Atlas độc lập chỉ hỗ trợ giải thích nguyên nhân.

| Ca | Atlas | Classification | Narration | Backend tổng | Nhận phản hồi → render | Nhánh model |
|---|---:|---:|---:|---:|---:|---|
`;
for(const c of [...after.results,...variants.results]){const t=traces.find(t=>t.requestId===c.requestId),spans=t?.spans||[],sum=pattern=>spans.filter(s=>pattern.test(s.stage)).reduce((n,s)=>n+s.ms,0).toFixed(2);text+=`| ${c.id} | ${sum(/^atlas_/)} ms | ${sum(/^classification$/)} ms | ${sum(/^narration$/)} ms | ${sum(/^backend_total$/)} ms | ${c.renderAfterResponseMs} ms | ${spans.filter(s=>s.stage.startsWith('provider_')).map(s=>s.stage+' HTTP '+s.status).join(', ')||'Không gọi model'} |\n`;}
text+=`
Nhóm 10 câu gốc dùng công cụ trực tiếp và Atlas thật; không trình bày là model đã hiểu 10/10. V8 có gọi Groq thật, khoảng 1,2 giây classification, hai lần đọc Atlas tổng khoảng 7,2 giây, toàn lượt khoảng 8,5 giây. Không có dữ liệu để kết luận độ chính xác hoặc tốc độ của tất cả nhánh Groq/Gemini, sửa schema hay cooldown trong phiên thật này; các nhánh đó có kiểm thử hồi quy mô phỏng riêng. Cloudflare chưa được đo.

## Cách hỏi mới và hội thoại

| Ca | Kết quả | ms | Câu hỏi |
|---|---|---:|---|
`;
for(const c of variants.results)text+=`| [${c.id}](../browser-variants/${c.id}.png) | ${c.verdict} | ${c.completeMs} | ${safe(c.question)} |\n`;
text+=`
V6 chạy sau chính sách hoàn tiền của Mộc Miên trong cùng hội thoại; V7 chạy sau yêu cầu hỗ trợ điều hoà. V4 hỏi hai ý huỷ/hoàn tiền và bữa sáng. Dữ liệu xác nhận có ăn sáng không được suy thành đã gồm trong giá hoặc tự đặt mức phí. Smart TV không được suy thành có Netflix/YouTube Premium trả phí. Apple Pay/Google Pay chưa triển khai được phân biệt với QR đang bật ở cơ sở.

## Kiểm thử hồi quy và quyền

- Bộ cuối: **437 bài, 435 đạt, 0 lỗi, 2 bỏ qua** do cần MongoDB QA riêng. Xem regression-final.txt.
- Bộ kịch bản cũ: 254/254 đạt các tiêu chí tự động ở chế độ model tắt; 254/254 ở mô phỏng. Phần mô phỏng cũ dùng kế hoạch cục bộ để phát sinh phản hồi giả, chỉ dùng hồi quy tích hợp/hợp đồng, không đánh giá nhận diện của model. Lần sửa này dùng thêm expected data cố định độc lập, provider luôn lỗi trong fixture và oracle Atlas cho trình duyệt thật.
- Thêm 12 bài cho dịch vụ công khai, gồm đủ 6 vai trò đang bật và ẩn danh, tên mơ hồ/đảo từ, sự cố, bữa sáng, TV, thanh toán, tiện nghi và phòng trống sau chủ đề khác. Thêm 3 bài cho projection/giới hạn ghi hội thoại và bảo toàn lịch sử user khác.
- Bài cũ yêu cầu câu huỷ thiếu cơ sở tự trả tất cả đã được đổi theo yêu cầu mới: hỏi đúng cơ sở, rồi hỏi có tên để đối chiếu chính sách. Không nới quyền hoặc nới schema provider để ép đạt.
- Kiểm tra JWT, current user/sessionVersion, quyền sau model, phạm vi và quyền sở hữu booking, lịch sử/file xuất vẫn được giữ. Không thêm công cụ ghi cọc, huỷ booking, đổi quyền hay gửi email.

## Tệp đã sửa

| Tệp | Mục đích |
|---|---|
| src/ai-entities.js (mới), src/ai-query-scope.js | Resolver cơ sở, biến thể tên và mơ hồ |
| src/ai-public-request.js (mới), src/ai-public-services.js (mới), src/ai-public-info.js | Trường dữ liệu công khai, chính sách và giới hạn dịch vụ |
| src/ai-conversation.js | Ưu tiên công cụ hiện tại; tiện nghi và ngày đầy đủ |
| src/store.js | Projection, identity, cập nhật hội thoại tối thiểu, telemetry Atlas |
| src/ai-public.js, src/ai-routes.js | Tích hợp đọc theo công cụ, tránh đọc lặp, lưu chat đúng phạm vi |
| src/ai-telemetry.js (mới), src/ai-provider.js, src/ai-transport.js, server.js | Build, trace ID, Server-Timing, ngân sách request và provider |
| public/js/assistant.js | Render POST ngay, chống trùng, không đợi GET lịch sử |
| test/ai-public-services.test.js, test/ai-store-projection.test.js (mới), test/ai.test.js | Ca mới và cập nhật kỳ vọng thiếu cơ sở |
| scripts/qa-ai-browser*.cjs, qa-ai-atlas-read.cjs, qa-ai-process.py, qa-ai-service-report.cjs | Đo/đối chiếu thật, xác minh tiến trình, tạo báo cáo |

## Giới hạn còn lại

- Chưa dùng tài khoản đăng nhập thật để đo Atlas/ghi lịch sử mới hoặc nghiệp vụ nội bộ. Không tự mint JWT cho người dùng thật hoặc tạo tài khoản hàng loạt. Nhánh Mongo giao dịch hội thoại mới có unit test mô phỏng driver; kiểm thử Mongo QA thực vẫn bị bỏ qua. Cần kiểm tra thêm bằng tài khoản được cấp trong môi trường QA.
- Chưa xác nhận Safari/mobile, Cloudflare, tải đồng thời, mạng khác, mọi cách diễn đạt hoặc dịch vụ chưa có trường dữ liệu. Không hứa hiểu đúng 100%.
- Atlas vẫn có băng thông/độ trễ đáng kể: câu đọc nhiều danh mục mất khoảng 3,5–3,7 giây, câu model + đọc lại có thể sát 10 giây. Không cache mù để làm đẹp số đo.
- Không thay bí mật .env, không seed/reset Atlas, không sửa booking thật, ảnh hoặc cấu hình email/thanh toán. Chỉ các hội thoại ẩn danh trong RAM được tạo khi đo. Tiến trình hiện tại được khởi động bằng node server.js với log timing, cùng cấu hình .env; tác vụ email/payOS/sao lưu là các tác vụ sẵn có của ứng dụng.

## Chạy và thử lại

Ứng dụng đã được khởi động lại ở localhost:3001. Quý tải lại trang (Ctrl+F5) và mở hội thoại mới. Nếu tự khởi động lại: npm start trong Git Bash; PowerShell dùng npm.cmd start. Không chạy thêm tiến trình khi cổng đang có server.

Các lệnh kiểm thử trong thư mục dự án:

\`\`\`bash
npm test
node scripts/qa-ai-scenarios.cjs --label=service-fixes/legacy-offline
node scripts/qa-ai-browser.cjs --label=browser-final
node scripts/qa-ai-browser.cjs --suite=variants --label=browser-variants
node scripts/qa-ai-browser-review.cjs browser-final browser-variants
node scripts/qa-ai-service-report.cjs
\`\`\`

Browser runner cần playwright-core và Chrome đã cài; driver được cài trong thư mục tạm, không thay dependency dự án. Runner thật dùng quota ứng dụng/provider; không chạy dồn quá giới hạn. Script review kết nối Atlas chỉ đọc. AI_TIMING_LOG chỉ định đường log JSONL tùy chọn khi khởi động; không sửa .env để bật log. Mỗi dòng chỉ có requestId/requestKey/build/trạng thái/thời gian.

Thử trực tiếp: hỏi “chính sách hoàn tiền”, sau đó nêu tên Mộc Miên; thử đảo thành “mộc miên homestay đà lạt”; hỏi tất cả; hỏi điều hoà hỏng; hỏi bữa sáng, TV, Apple Pay/Google Pay/QR; hỏi tiện nghi phòng đã nêu rõ và phòng trống đủ ngày. Dùng hội thoại mới cho câu độc lập; V6/V7 là câu nối tiếp đã ghi trên.
`;
fs.writeFileSync(path.join(root,'service-fixes/README.md'),text.replaceAll('\\`','`'));console.log('Wrote service-fixes/README.md');
