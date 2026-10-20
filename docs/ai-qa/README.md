# Kiểm thử trợ lý HOMESTAY — 19/10/2026

**Hiệu năng máy thật 20/10:** [Đồng bộ gói performance, số đo Chrome/Atlas trước–sau và hồi quy phân quyền](../performance/live-20261020/README.md). Build đang chạy và giới hạn kiểm chứng được ghi tại báo cáo này.

**Bản sửa backend mới nhất:** [MongoDB nested projection 31275](backend-projection-fix/README.md), gồm projection trước/sau, stack/request, kiểm thử Atlas chỉ đọc và trạng thái kiểm chứng phiên admin thật.

**Cập nhật mới nhất:** [Kiểm chứng localhost thật, các lỗi A–G và tốc độ trước/sau](service-fixes/README.md). Lượt mới có Chromium + Atlas thật, 10 câu gốc và 8 cách hỏi mới, kèm ảnh và trace backend. Báo cáo dưới đây là lượt kiểm thử trước đó.

Nhánh: feature/quy-homestay-final-1-9-0. Nền ứng dụng package.json 1.9.0; không tìm thấy marker xác nhận bộ cài r12. Giữ các thay đổi chưa commit của Quý. Không push, merge, deploy, seed hoặc thay dữ liệu Atlas, email, thanh toán hay .env.

## Môi trường và phạm vi

Node 24.14.1, Windows. API Express thật trên cổng loopback ngẫu nhiên, JWT thật với secret kiểm thử, Store file trong thư mục tạm và model theo từng chế độ. Không dùng tài khoản hoặc booking thật. Hai cơ sở công khai Nhà Núi QA (A) và Nhà Biển QA (B), 51 phòng, 11 loại phòng. Owner/reception/report/housekeeping chỉ được giao A; Admin toàn hệ thống. Trong ba booking kiểm tra sở hữu, ABCD0001 thuộc khách đang test; ABCD0002 thuộc khách khác; BCDE0003 thuộc khách khác tại B. Có thêm hai booking lịch sử đã đóng của khách đang test để đối chiếu quyết toán. Loại phòng T1/T2 là Phòng đôi ở A/B. Có quyết toán A=1.600.000 và B=2.300.000 trong kỳ 01–18/10/2026, lấy từ fixture chứ không hardcode trong ứng dụng.

Tài liệu Word đã được đọc đầy đủ: 240 ca (200 chính + 40 Buồng phòng), thêm 14 ca công khai ở trạng thái chưa đăng nhập. K-L09 chạy ẩn danh. Tổng 254 lượt đánh giá chính; các câu chuẩn bị được gửi thêm trong cùng phiên theo phụ thuộc. Mỗi ca độc lập tạo phiên mới. Ngày ở được chuyển sang tương lai khi cần. Chuỗi xuất B-D12 giữ nguồn gốc B-D02 qua B-D11; tải Excel/PDF và kiểm tra chữ ký file. B-L03/04/05 thu hồi quyền/cơ sở trong fixture, khôi phục trước ca tiếp theo, kiểm tra tải lại file cũ.

Các câu trong Word là dữ liệu kiểm thử; không thực hiện yêu cầu xoá, đổi quyền, ghi tiền hoặc gửi email trong nội dung câu hỏi. Không mở rộng quyền để khớp kết quả mong đợi. Buồng phòng có trong mã nên chạy đầy đủ phụ lục. Các ca yêu cầu hướng dẫn được tính đạt nếu hướng dẫn đúng và nói rõ giới hạn; điều này không chứng minh chat đã có công cụ ghi nghiệp vụ.

## Kết quả

| Lượt | Đạt | Lỗi | Chưa hỗ trợ | Chưa chạy | Trung vị | p95 |
|---|---:|---:|---:|---:|---:|---:|
| Trước sửa — model tắt | 159 | 95 | 0 | 0 | 11.89 ms | 28.9 ms |
| Sau sửa — model tắt | 254 | 0 | 0 | 0 | 11.57 ms | 38.83 ms |
| Trước sửa — model mô phỏng | 159 | 95 | 0 | 0 | 65.36 ms | 107.18 ms |
| Sau sửa — model mô phỏng | 254 | 0 | 0 | 0 | 33.39 ms | 66.21 ms |
| Mẫu cấu hình model thật — sau sửa | 9 | 0 | 0 | 0 | 11.25 ms | 4363.61 ms |

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

Mẫu 9 ca chính sau sửa có 6 lần gọi HTTP tới provider (kể cả câu chuẩn bị), 2 kế hoạch hợp lệ theo schema trong toàn lượt. Các mục modelPlans, serverPlan, result, checks trong live-sample.json tách đầu ra model, kế hoạch máy chủ, phản hồi cuối và kiểm tra dữ liệu/quyền. HTTP 200 của provider không được coi là kế hoạch hợp lệ.

| Ca | Thời gian | Kế hoạch model hợp lệ ở câu chính | Provider/engine cuối | Fallback |
|---|---:|---:|---|---|
| K-D05 | 4363.61 ms | 1 | groq/ai | — |
| K-D06 | 2367.66 ms | 0 | gemini/rules | invalid_response |
| K-L11 | 11.37 ms | 0 | gemini/rules | invalid_response |
| A-D05 | 35.13 ms | 0 | rules/rules | verified_request |
| C-L01 | 5.33 ms | 0 | không gọi/từ chối | — |
| L-D19 | 11.25 ms | 0 | rules/rules | verified_request |
| B-D13 | 10.61 ms | 0 | rules/rules | verified_request |
| B-D14 | 9.62 ms | 0 | rules/rules | verified_request |
| P-D15 | 8.57 ms | 0 | rules/rules | verified_request |

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

```bash
npm test
node scripts/qa-ai-scenarios.cjs --label=after-offline
node scripts/qa-ai-scenarios.cjs --mode=mock --label=after-mock
node scripts/qa-ai-report.cjs
```

PowerShell dùng npm.cmd test nếu npm.ps1 bị chặn. Không cần đổi Execution Policy.

Kiểm tra model thật (tốn quota, chỉ dữ liệu tổng hợp, cần kết nối mạng):

```bash
node scripts/qa-ai-scenarios.cjs --mode=live --ids=K-D05,K-D06,A-D05,B-D13,B-D14,K-L11,C-L01,L-D19,P-D15 --label=live-sample
```

Trên giao diện: khởi động lại tiến trình npm start hiện tại khi tiện, tải lại trang, mở hội thoại mới. Thử chuỗi K-D05→06→17→18→19; hỏi giờ nhận/cọc của cơ sở thực; hỏi doanh thu toàn hệ thống khi đang lọc một cơ sở; B-D02→13→14; L-D01→19→20. Kiểm tra tab ẩn danh, booking của mình/khách khác, thu hồi quyền và tải file. Chỉ gửi câu hỏi thao tác nhạy cảm để kiểm tra phản hồi; không xác nhận hành động trên màn hình nghiệp vụ.

## Chi tiết từng ca

Phản hồi đầy đủ, điều kiện, phép kiểm tra và thời gian nằm trong JSON. Bảng dưới là chỉ mục đối chiếu trước/sau.

| Ca | Vai trò | Trước | Sau | ms trước/sau | Lỗi trước sửa |
|---|---|---|---|---|---|
| K-D01 | guest | Đạt | Đạt | 25.09/36.22 | — |
| K-D02 | guest | Đạt | Đạt | 19.97/72.67 | — |
| K-D03 | guest | Đạt | Đạt | 8.33/107.26 | — |
| K-D04 | guest | Đạt | Đạt | 12.46/61.66 | — |
| K-D05 | guest | Đạt | Đạt | 36.48/96.25 | — |
| K-D06 | guest | Đạt | Đạt | 10.9/31.88 | — |
| K-D07 | guest | Lỗi | Đạt | 13.01/28.88 | Đúng phòng và cơ sở được hỏi |
| K-D08 | guest | Đạt | Đạt | 11.66/55.45 | — |
| K-D09 | guest | Đạt | Đạt | 9.66/45.99 | — |
| K-D10 | guest | Đạt | Đạt | 11.16/23.04 | — |
| K-D11 | guest | Đạt | Đạt | 8.86/43.75 | — |
| K-D12 | guest | Đạt | Đạt | 11.58/29.39 | — |
| K-D13 | guest | Lỗi | Đạt | 13.99/29.45 | Chỉ đường thanh toán khi chưa chọn cơ sở |
| K-D14 | guest | Đạt | Đạt | 9.1/31.27 | — |
| K-D15 | guest | Lỗi | Đạt | 14.69/16.6 | Đúng booking yêu cầu |
| K-D16 | guest | Lỗi | Đạt | 8.43/29.32 | Câu hợp lệ được trả lời; Không chặn nhầm |
| K-D17 | guest | Đạt | Đạt | 16.05/52.48 | — |
| K-D18 | guest | Đạt | Đạt | 14.85/22.4 | — |
| K-D19 | guest | Lỗi | Đạt | 11.18/17.98 | Chọn đúng phương án bằng số |
| K-D20 | guest | Lỗi | Đạt | 26.21/12.31 | Đúng hướng dẫn nghiệp vụ, không thay bằng tra dữ liệu |
| K-L01 | guest | Đạt | Đạt | 7.73/22.67 | — |
| K-L02 | guest | Đạt | Đạt | 6.87/19.09 | — |
| K-L03 | guest | Đạt | Đạt | 10.96/9.06 | — |
| K-L04 | guest | Đạt | Đạt | 9.08/14.62 | — |
| K-L05 | guest | Đạt | Đạt | 13.77/21.29 | — |
| K-L06 | guest | Đạt | Đạt | 8.59/27.03 | — |
| K-L07 | guest | Lỗi | Đạt | 11.05/17.65 | Từ chối cơ sở ngoài quyền |
| K-L08 | guest | Đạt | Đạt | 20.67/25.96 | — |
| K-L09-ANON | anonymous | Đạt | Đạt | 17.52/9.56 | — |
| K-L10 | guest | Đạt | Đạt | 19.69/20.33 | — |
| K-L11 | guest | Lỗi | Đạt | 18.25/26.43 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| K-L12 | guest | Lỗi | Đạt | 6.47/26.05 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| K-L13 | guest | Lỗi | Đạt | 21.96/14.27 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| K-L14 | guest | Lỗi | Đạt | 7.51/25.84 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| K-L15 | guest | Đạt | Đạt | 8.27/25.13 | — |
| K-L16 | guest | Lỗi | Đạt | 5.39/15.76 | Ngoài lĩnh vực: giải thích phạm vi |
| K-L17 | guest | Lỗi | Đạt | 5.61/11.94 | Ngoài lĩnh vực: giải thích phạm vi |
| K-L18 | guest | Lỗi | Đạt | 8.3/13.05 | Ngoài lĩnh vực: giải thích phạm vi |
| K-L19 | guest | Lỗi | Đạt | 6.14/15.36 | Ngoài lĩnh vực: giải thích phạm vi |
| K-L20 | guest | Đạt | Đạt | 11.5/12.44 | — |
| A-D01 | admin | Lỗi | Đạt | 9.61/17.17 | Giải thích khả năng AI và giới hạn thực thi |
| A-D02 | admin | Đạt | Đạt | 6.63/12.46 | — |
| A-D03 | admin | Đạt | Đạt | 11.69/17.03 | — |
| A-D04 | admin | Đạt | Đạt | 8.15/16.46 | — |
| A-D05 | admin | Đạt | Đạt | 17.64/24.17 | — |
| A-D06 | admin | Đạt | Đạt | 14.55/11.8 | — |
| A-D07 | admin | Đạt | Đạt | 14.48/17.15 | — |
| A-D08 | admin | Đạt | Đạt | 16.11/14.92 | — |
| A-D09 | admin | Đạt | Đạt | 12.99/9.82 | — |
| A-D10 | admin | Đạt | Đạt | 9.57/17.02 | — |
| A-D11 | admin | Đạt | Đạt | 9.07/13.91 | — |
| A-D12 | admin | Đạt | Đạt | 7.67/13.13 | — |
| A-D13 | admin | Lỗi | Đạt | 12.71/15.63 | Đúng hướng dẫn nghiệp vụ, không thay bằng tra dữ liệu |
| A-D14 | admin | Đạt | Đạt | 11.13/14.18 | — |
| A-D15 | admin | Lỗi | Đạt | 8.22/11.23 | Đúng hướng dẫn nghiệp vụ, không thay bằng tra dữ liệu |
| A-D16 | admin | Đạt | Đạt | 12.69/12.07 | — |
| A-D17 | admin | Lỗi | Đạt | 6.45/13.11 | Tổng 51 phòng vật lý trong fixture |
| A-D18 | admin | Đạt | Đạt | 11.41/36.55 | — |
| A-D19 | admin | Lỗi | Đạt | 8.69/24.65 | Giải thích khả năng AI và giới hạn thực thi |
| A-D20 | admin | Đạt | Đạt | 10.09/54.66 | — |
| A-L01 | admin | Đạt | Đạt | 9.75/43.09 | — |
| A-L02 | admin | Đạt | Đạt | 7.36/36.28 | — |
| A-L03 | admin | Đạt | Đạt | 12.21/11.63 | — |
| A-L04 | admin | Đạt | Đạt | 7.37/9.34 | — |
| A-L05 | admin | Đạt | Đạt | 15.08/11.53 | — |
| A-L06 | admin | Đạt | Đạt | 9.11/15.9 | — |
| A-L07 | admin | Đạt | Đạt | 17.16/29.03 | — |
| A-L08 | admin | Đạt | Đạt | 14.09/19.75 | — |
| A-L09 | admin | Đạt | Đạt | 18/33.3 | — |
| A-L10 | admin | Lỗi | Đạt | 5.96/18.8 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| A-L11 | admin | Lỗi | Đạt | 27.81/11.94 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| A-L12 | admin | Lỗi | Đạt | 15.48/12.43 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| A-L13 | admin | Lỗi | Đạt | 7.16/8.9 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| A-L14 | admin | Lỗi | Đạt | 16.95/15.28 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| A-L15 | admin | Lỗi | Đạt | 6.9/12.19 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| A-L16 | admin | Lỗi | Đạt | 6.48/19.32 | Ngoài lĩnh vực: giải thích phạm vi |
| A-L17 | admin | Lỗi | Đạt | 15.91/16.85 | Ngoài lĩnh vực: giải thích phạm vi |
| A-L18 | admin | Lỗi | Đạt | 17.36/11.01 | Ngoài lĩnh vực: giải thích phạm vi |
| A-L19 | admin | Lỗi | Đạt | 8.08/13.26 | Ngoài lĩnh vực: giải thích phạm vi |
| A-L20 | admin | Đạt | Đạt | 7.16/15.85 | — |
| C-D01 | owner | Lỗi | Đạt | 8.9/21.14 | Câu hợp lệ được trả lời; Không chặn nhầm; Nêu đúng cơ sở được giao, không chỉ tên vai trò |
| C-D02 | owner | Đạt | Đạt | 14.48/17.74 | — |
| C-D03 | owner | Đạt | Đạt | 14.73/21.44 | — |
| C-D04 | owner | Đạt | Đạt | 12.66/39.03 | — |
| C-D05 | owner | Đạt | Đạt | 11.89/31.08 | — |
| C-D06 | owner | Đạt | Đạt | 11.91/23.12 | — |
| C-D07 | owner | Đạt | Đạt | 11.65/32.02 | — |
| C-D08 | owner | Lỗi | Đạt | 12.04/23.63 | Đúng booking yêu cầu |
| C-D09 | owner | Đạt | Đạt | 11.3/39.72 | — |
| C-D10 | owner | Đạt | Đạt | 13.52/12.13 | — |
| C-D11 | owner | Đạt | Đạt | 14.84/10.38 | — |
| C-D12 | owner | Lỗi | Đạt | 11.56/14.05 | Đúng hướng dẫn nghiệp vụ, không thay bằng tra dữ liệu |
| C-D13 | owner | Lỗi | Đạt | 9.54/13.35 | Đúng hướng dẫn nghiệp vụ, không thay bằng tra dữ liệu |
| C-D14 | owner | Đạt | Đạt | 13.71/11.65 | — |
| C-D15 | owner | Lỗi | Đạt | 10.73/8.97 | Đúng phòng và cơ sở được hỏi |
| C-D16 | owner | Đạt | Đạt | 12.02/12.88 | — |
| C-D17 | owner | Lỗi | Đạt | 14.65/15.79 | Có đúng nguồn xuất |
| C-D18 | owner | Đạt | Đạt | 13.54/16.26 | — |
| C-D19 | owner | Lỗi | Đạt | 13.66/12.7 | Đổi metric, giữ tháng 8 |
| C-D20 | owner | Đạt | Đạt | 17.3/17.18 | — |
| C-L01 | owner | Lỗi | Đạt | 17.52/5.96 | Từ chối cơ sở ngoài quyền |
| C-L02 | owner | Lỗi | Đạt | 14.85/8.19 | Từ chối cơ sở ngoài quyền |
| C-L03 | owner | Lỗi | Đạt | 12.16/6.47 | Từ chối cơ sở ngoài quyền |
| C-L04 | owner | Đạt | Đạt | 9.03/5.75 | — |
| C-L05 | owner | Đạt | Đạt | 15.54/15.49 | — |
| C-L06 | owner | Đạt | Đạt | 8.44/9.67 | — |
| C-L07 | owner | Đạt | Đạt | 6.97/7.85 | — |
| C-L08 | owner | Đạt | Đạt | 12.23/12.97 | — |
| C-L09 | owner | Đạt | Đạt | 7.59/10.3 | — |
| C-L10 | owner | Đạt | Đạt | 9.97/7.21 | — |
| C-L11 | owner | Đạt | Đạt | 8.95/10.04 | — |
| C-L12 | owner | Lỗi | Đạt | 14.43/17.32 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| C-L13 | owner | Lỗi | Đạt | 7.65/13.31 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| C-L14 | owner | Lỗi | Đạt | 9.73/15.52 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| C-L15 | owner | Đạt | Đạt | 29.89/19.98 | — |
| C-L16 | owner | Lỗi | Đạt | 19.58/8.11 | Ngoài lĩnh vực: giải thích phạm vi |
| C-L17 | owner | Lỗi | Đạt | 16.15/17.74 | Ngoài lĩnh vực: giải thích phạm vi |
| C-L18 | owner | Lỗi | Đạt | 16.64/9.18 | Ngoài lĩnh vực: giải thích phạm vi |
| C-L19 | owner | Lỗi | Đạt | 10.19/8.8 | Ngoài lĩnh vực: giải thích phạm vi |
| C-L20 | owner | Đạt | Đạt | 10/25.87 | — |
| L-D01 | reception | Đạt | Đạt | 15.91/38.83 | — |
| L-D02 | reception | Đạt | Đạt | 16.27/12.75 | — |
| L-D03 | reception | Đạt | Đạt | 18.99/7.56 | — |
| L-D04 | reception | Lỗi | Đạt | 13.03/8.43 | Đúng booking yêu cầu; Tách cọc còn thiếu với tổng còn thanh toán |
| L-D05 | reception | Lỗi | Đạt | 11.95/21.92 | Đúng booking yêu cầu |
| L-D06 | reception | Đạt | Đạt | 12.17/8.99 | — |
| L-D07 | reception | Đạt | Đạt | 15.12/8.03 | — |
| L-D08 | reception | Đạt | Đạt | 13.15/10.19 | — |
| L-D09 | reception | Lỗi | Đạt | 12.16/9.87 | Đúng hướng dẫn nghiệp vụ, không thay bằng tra dữ liệu |
| L-D10 | reception | Đạt | Đạt | 11.21/7.21 | — |
| L-D11 | reception | Đạt | Đạt | 12.11/13.2 | — |
| L-D12 | reception | Đạt | Đạt | 14.38/8.12 | — |
| L-D13 | reception | Lỗi | Đạt | 16.7/7.58 | Đúng hướng dẫn nghiệp vụ, không thay bằng tra dữ liệu |
| L-D14 | reception | Đạt | Đạt | 23.27/10.04 | — |
| L-D15 | reception | Đạt | Đạt | 16.69/10.87 | — |
| L-D16 | reception | Đạt | Đạt | 15.05/13.92 | — |
| L-D17 | reception | Đạt | Đạt | 11.47/12.76 | — |
| L-D18 | reception | Đạt | Đạt | 11.62/10.86 | — |
| L-D19 | reception | Lỗi | Đạt | 12.18/14.31 | Câu hợp lệ được trả lời; Không chặn nhầm; Giữ lịch và ngày mai |
| L-D20 | reception | Lỗi | Đạt | 30.63/11.64 | Giữ lịch và ngày mai |
| L-L01 | reception | Đạt | Đạt | 11.36/7.68 | — |
| L-L02 | reception | Đạt | Đạt | 13.11/14.01 | — |
| L-L03 | reception | Lỗi | Đạt | 24.22/4.68 | Từ chối cơ sở ngoài quyền |
| L-L04 | reception | Đạt | Đạt | 8.04/8.85 | — |
| L-L05 | reception | Đạt | Đạt | 8.48/5.85 | — |
| L-L06 | reception | Đạt | Đạt | 11.73/11.1 | — |
| L-L07 | reception | Đạt | Đạt | 12.48/11.57 | — |
| L-L08 | reception | Đạt | Đạt | 9.33/14.3 | — |
| L-L09 | reception | Đạt | Đạt | 7.97/9.87 | — |
| L-L10 | reception | Đạt | Đạt | 9.66/9.88 | — |
| L-L11 | reception | Lỗi | Đạt | 36.81/17.03 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| L-L12 | reception | Lỗi | Đạt | 45.45/24.91 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| L-L13 | reception | Lỗi | Đạt | 133.59/29.6 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| L-L14 | reception | Lỗi | Đạt | 9.33/12.86 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| L-L15 | reception | Đạt | Đạt | 8.92/11.37 | — |
| L-L16 | reception | Đạt | Đạt | 10.11/33.69 | — |
| L-L17 | reception | Đạt | Đạt | 8.85/29.02 | — |
| L-L18 | reception | Lỗi | Đạt | 15.2/15.34 | Ngoài lĩnh vực: giải thích phạm vi |
| L-L19 | reception | Lỗi | Đạt | 10.16/12.19 | Ngoài lĩnh vực: giải thích phạm vi |
| L-L20 | reception | Lỗi | Đạt | 7.5/7.88 | Ngoài lĩnh vực: giải thích phạm vi |
| B-D01 | report | Lỗi | Đạt | 14.92/10.11 | Giải thích khả năng AI và giới hạn thực thi |
| B-D02 | report | Đạt | Đạt | 14.21/9.72 | — |
| B-D03 | report | Đạt | Đạt | 16.28/13.21 | — |
| B-D04 | report | Đạt | Đạt | 17.54/12.23 | — |
| B-D05 | report | Đạt | Đạt | 15.34/11.73 | — |
| B-D06 | report | Đạt | Đạt | 32.78/7.44 | — |
| B-D07 | report | Đạt | Đạt | 8.86/12.64 | — |
| B-D08 | report | Đạt | Đạt | 12.75/12.9 | — |
| B-D09 | report | Đạt | Đạt | 18.17/13.9 | — |
| B-D10 | report | Lỗi | Đạt | 13.78/9.61 | Đúng phòng và cơ sở được hỏi |
| B-D11 | report | Đạt | Đạt | 18.52/12.5 | — |
| B-D12 | report | Đạt | Đạt | 10.33/5.59 | — |
| B-D13 | report | Đạt | Đạt | 16.98/9.12 | — |
| B-D14 | report | Lỗi | Đạt | 65.16/14.49 | Đổi metric, giữ tháng 8 |
| B-D15 | report | Lỗi | Đạt | 44.72/12.65 | Câu hợp lệ được trả lời; Không chặn nhầm |
| B-D16 | report | Lỗi | Đạt | 26.95/10.24 | Giải thích đúng định nghĩa tài chính |
| B-D17 | report | Lỗi | Đạt | 13.29/7.74 | Giải thích đúng định nghĩa tài chính |
| B-D18 | report | Lỗi | Đạt | 18.92/8.88 | Phân biệt kỳ rỗng với lỗi hoặc thiếu quyền |
| B-D19 | report | Đạt | Đạt | 14.13/8.8 | — |
| B-D20 | report | Đạt | Đạt | 20.38/11.44 | — |
| B-L01 | report | Lỗi | Đạt | 23.32/6.36 | Từ chối cơ sở ngoài quyền |
| B-L02 | report | Đạt | Đạt | 19.1/14.82 | — |
| B-L03 | report | Đạt | Đạt | 7.13/7.83 | — |
| B-L04 | report | Đạt | Đạt | 18.48/7.37 | — |
| B-L05 | report | Đạt | Đạt | 7.19/5.08 | — |
| B-L06 | report | Đạt | Đạt | 5.75/9.03 | — |
| B-L07 | report | Đạt | Đạt | 8.45/5.09 | — |
| B-L08 | report | Đạt | Đạt | 10.08/4.52 | — |
| B-L09 | report | Đạt | Đạt | 8.21/5.05 | — |
| B-L10 | report | Đạt | Đạt | 8.51/7.45 | — |
| B-L11 | report | Lỗi | Đạt | 7.86/6.9 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| B-L12 | report | Lỗi | Đạt | 5.96/5.26 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| B-L13 | report | Lỗi | Đạt | 9.25/5.1 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| B-L14 | report | Lỗi | Đạt | 13.76/4.94 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| B-L15 | report | Đạt | Đạt | 13.05/5.6 | — |
| B-L16 | report | Đạt | Đạt | 11.1/5.09 | — |
| B-L17 | report | Đạt | Đạt | 41.2/4.55 | — |
| B-L18 | report | Lỗi | Đạt | 21.29/7.54 | Ngoài lĩnh vực: giải thích phạm vi |
| B-L19 | report | Lỗi | Đạt | 28.81/6.66 | Ngoài lĩnh vực: giải thích phạm vi |
| B-L20 | report | Đạt | Đạt | 23.73/5.59 | — |
| P-D01 | housekeeping | Lỗi | Đạt | 23.75/5.22 | Câu hợp lệ được trả lời; Không chặn nhầm; Nêu đúng cơ sở được giao, không chỉ tên vai trò |
| P-D02 | housekeeping | Lỗi | Đạt | 32.3/6.56 | Đúng bộ lọc buồng phòng |
| P-D03 | housekeeping | Lỗi | Đạt | 26.08/5.86 | Đúng bộ lọc buồng phòng |
| P-D04 | housekeeping | Lỗi | Đạt | 68.47/4.89 | Đúng bộ lọc buồng phòng |
| P-D05 | housekeeping | Lỗi | Đạt | 26.1/4.97 | Đúng bộ lọc buồng phòng |
| P-D06 | housekeeping | Lỗi | Đạt | 9.28/5 | Đúng hướng dẫn nghiệp vụ, không thay bằng tra dữ liệu |
| P-D07 | housekeeping | Lỗi | Đạt | 9.39/8 | Đúng hướng dẫn nghiệp vụ, không thay bằng tra dữ liệu |
| P-D08 | housekeeping | Đạt | Đạt | 15.71/4.68 | — |
| P-D09 | housekeeping | Đạt | Đạt | 8.98/9.77 | — |
| P-D10 | housekeeping | Lỗi | Đạt | 7.73/5.02 | Đúng hướng dẫn nghiệp vụ, không thay bằng tra dữ liệu |
| P-D11 | housekeeping | Lỗi | Đạt | 7.65/7.6 | Câu hợp lệ được trả lời; Không chặn nhầm; Danh sách cả 2 cơ sở công khai |
| P-D12 | housekeeping | Đạt | Đạt | 8.75/6.35 | — |
| P-D13 | housekeeping | Đạt | Đạt | 9.4/5.52 | — |
| P-D14 | housekeeping | Lỗi | Đạt | 9.43/5.08 | Đúng phòng và cơ sở được hỏi |
| P-D15 | housekeeping | Lỗi | Đạt | 15.69/5.42 | Đúng phòng và cơ sở được hỏi |
| P-D16 | housekeeping | Đạt | Đạt | 15.42/7.25 | — |
| P-D17 | housekeeping | Đạt | Đạt | 12.72/6.33 | — |
| P-D18 | housekeeping | Đạt | Đạt | 9.33/8.96 | — |
| P-D19 | housekeeping | Đạt | Đạt | 10.01/8.5 | — |
| P-D20 | housekeeping | Lỗi | Đạt | 13.25/9.8 | Đúng bộ lọc buồng phòng |
| P-L01 | housekeeping | Đạt | Đạt | 6.29/7.68 | — |
| P-L02 | housekeeping | Đạt | Đạt | 10.72/4.9 | — |
| P-L03 | housekeeping | Đạt | Đạt | 6.35/9.27 | — |
| P-L04 | housekeeping | Đạt | Đạt | 28.9/5.24 | — |
| P-L05 | housekeeping | Đạt | Đạt | 26.66/4.8 | — |
| P-L06 | housekeeping | Đạt | Đạt | 14.61/2.91 | — |
| P-L07 | housekeeping | Đạt | Đạt | 11.45/4.7 | — |
| P-L08 | housekeeping | Đạt | Đạt | 9.13/8.42 | — |
| P-L09 | housekeeping | Đạt | Đạt | 12.39/10.04 | — |
| P-L10 | housekeeping | Đạt | Đạt | 6.96/9.8 | — |
| P-L11 | housekeeping | Đạt | Đạt | 12.87/5.41 | — |
| P-L12 | housekeeping | Đạt | Đạt | 9.94/5.96 | — |
| P-L13 | housekeeping | Đạt | Đạt | 16.23/5.97 | — |
| P-L14 | housekeeping | Đạt | Đạt | 4.67/9.01 | — |
| P-L15 | housekeeping | Đạt | Đạt | 10.5/5.42 | — |
| P-L16 | housekeeping | Lỗi | Đạt | 10.95/9.62 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| P-L17 | housekeeping | Lỗi | Đạt | 7.66/5.08 | Mơ hồ: hỏi rõ, không báo thiếu quyền |
| P-L18 | housekeeping | Lỗi | Đạt | 8.64/5.31 | Ngoài lĩnh vực: giải thích phạm vi |
| P-L19 | housekeeping | Lỗi | Đạt | 8.35/10.03 | Ngoài lĩnh vực: giải thích phạm vi |
| P-L20 | housekeeping | Lỗi | Đạt | 8.59/5.61 | Ngoài lĩnh vực: giải thích phạm vi |
| K-D01-ANON | anonymous | Đạt | Đạt | 2.7/2.35 | — |
| K-D02-ANON | anonymous | Đạt | Đạt | 28.02/2.95 | — |
| K-D03-ANON | anonymous | Đạt | Đạt | 5.67/4.04 | — |
| K-D04-ANON | anonymous | Đạt | Đạt | 18.58/2.39 | — |
| K-D05-ANON | anonymous | Đạt | Đạt | 15.06/4.19 | — |
| K-D06-ANON | anonymous | Đạt | Đạt | 3.49/4.35 | — |
| K-D07-ANON | anonymous | Lỗi | Đạt | 3.03/2.96 | Đúng phòng và cơ sở được hỏi |
| K-D08-ANON | anonymous | Đạt | Đạt | 4.51/4.88 | — |
| K-D09-ANON | anonymous | Đạt | Đạt | 3.06/5.88 | — |
| K-D10-ANON | anonymous | Đạt | Đạt | 3.03/2.03 | — |
| K-D11-ANON | anonymous | Đạt | Đạt | 1.98/4.3 | — |
| K-D12-ANON | anonymous | Đạt | Đạt | 2.54/2.63 | — |
| K-D13-ANON | anonymous | Lỗi | Đạt | 2.38/2.41 | Câu hợp lệ được trả lời; Không chặn nhầm; Chỉ đường thanh toán khi chưa chọn cơ sở |
| K-D16-ANON | anonymous | Lỗi | Đạt | 5.99/2 | Câu hợp lệ được trả lời; Không chặn nhầm |
