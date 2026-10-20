# Độ trễ HOMESTAY — kiểm chứng máy thật, 20/10/2026

Build đang phục vụ: **36172b4c8e3ff69b**, PID **7488**, cổng **3001**, MongoDB Atlas. Đã kiểm tra executable, command line và thư mục chạy đúng dự án; [bằng chứng cuối](process-after.json). Cloudflare PID **5544** được giữ nguyên. Backend stderr rỗng tại lần kiểm tra cuối.

## Đồng bộ và thay đổi

Đã đọc manifest/HUONG_DAN của gói trong Downloads, kiểm tra Git đang có nhiều thay đổi chưa commit và giữ nguyên công việc cũ. Trước khi sửa thêm, 15 tệp khớp hash chuẩn hoá của gói; HTTP thực tế đã phục vụ build **90b7e360bcd6ca89**. Vì vậy EADDRINUSE được báo trước đó không chứng minh tiến trình khi đo còn chạy mã cũ.

Chỉ sửa thêm ba tệp ứng dụng so với gói:

- `src/read-model.js`: projection theo cột và theo màn hình; profile riêng cho doanh thu, tồn phòng và metadata. Giữ mảng/kiểu dữ liệu, xử lý mảng thiếu/rỗng bằng `$ifNull`. Booking vẫn giữ chi tiết, giá từng đêm và sổ tiền cọc; bỏ khỏi lượt đọc bootstrap các trường nội bộ vốn đã bị loại khi trả frontend, đặc biệt snapshot trong `operationRequests`.
- `server.js`: chọn profile theo route đã chuẩn hoá, vẫn dùng một promise đọc trong cùng request. Route email-status của booking vẫn giữ dữ liệu booking để xác minh sở hữu/phạm vi. Xác thực và phạm vi homestay giữ nguyên.
- `src/store.js` và điểm khởi động trong `server.js`: thêm lựa chọn `--existing-data`, chỉ xác minh state đã tồn tại, không tạo index/upsert/seed/migration lúc khởi động kiểm thử. Mặc định khởi động cũ không đổi. Không sửa các pipeline nhận diện/hội thoại đã chữa lỗi nested `$elemMatch`.

[Diff riêng so với gói](production-changes.patch), [đối chiếu manifest sau sửa](package-comparison-after.json), [hash nguồn trước sửa](source-before.json). Ngoài ba tệp ứng dụng, cập nhật fixture/test projection, test Atlas, thêm test khởi động không ghi dữ liệu; thêm bốn script QA và báo cáo này.

Chỉ dừng PID HOMESTAY **11244** sau khi xác minh cwd, rồi chạy PID **7488** bằng `node server.js --existing-data`; [biên bản](restart.json). Không sửa `.env`, cấu hình email/thanh toán hoặc dữ liệu booking; không seed/migration, push/merge hay khôi phục bản cũ. Worker vận hành sẵn có vẫn hoạt động theo cấu hình trước đó.

## Nguyên nhân có bằng chứng

Trước sửa thêm, các request vẫn trả **200**, không phải lỗi mạng/401/500. Trình duyệt chờ phần đọc Atlas quá lớn:

- `GET /api/admin/state?screen=overview`: mẫu đầu mất 7.730 ms; `atlas_auth` 331 ms, `atlas_operational` 7.380 ms, backend ngoài Atlas khoảng 10 ms, chênh thời gian API/browser khoảng 10 ms. Response HTTP khoảng 469 KB.
- Booking gọi bootstrap rồi `GET /api/admin/shortage-alerts?days=14` tuần tự. Cả hai lượt trước sửa đều dùng projection nghiệp vụ lớn, trong khi response cảnh báo chỉ 26 byte. Owner/Reports/Invoices/Email cũng đọc thêm các mảng không phục vụ kết quả tương ứng.
- Trong dữ liệu thực, riêng `bookings.operationRequests` chiếm khoảng 188 KB do snapshot phản hồi lồng nhau. Không cần tải phần này chỉ để loại khỏi response sau đó.

Phép A/B chỉ đọc trên **cùng kết nối Atlas**, ba cặp truy vấn, cho thấy:

| Phép đo | Projection cũ | Tổng quan mới |
|---|---:|---:|
| Trung vị lượt đọc | 7.286 ms | 1.299 ms |
| Byte nhận tại socket/lượt | 690.465 | 107.612 |
| Kích thước JSON kết quả | 664.562 | 100.339 |

Truy vấn `_id` nhỏ có trung vị 101 ms; ping 99 ms. Explain phía MongoDB báo 1 ms, xét một document. Bốn chỉ số Tổng quan so sánh bằng nhau giữa hai projection. Đây là bằng chứng chi phí tải kết quả lớn là phần chính trong ca đo này; chưa đủ để quy trách nhiệm riêng cho gói Atlas hay đường truyền. Probe compression không thương lượng được zlib nên **không bật compression** trong mã ứng dụng. [Số liệu A/B](atlas-projection-ab.json).

Có đọc state đầy đủ trong worker email định kỳ và các tác vụ nền khác; chưa định lượng riêng mức tranh chấp của từng worker. Chúng được giữ nguyên ở cả hai lượt đo. Không coi đây là nguyên nhân đã chứng minh hoặc tắt tác vụ để làm đẹp số đo.

## Trình duyệt thật → localhost → Atlas thật

Chrome thật, tài khoản **admin do người dùng tự đăng nhập**. Mỗi màn hình tải lại ba lần trước và ba lần sau; chờ load/render hoàn tất và nút refresh hết disabled. Tổng **42 lượt tải màn hình**, toàn bộ request quan sát được trả 200 và không có lỗi trang. Owner ở đây là màn hình Chủ homestay được mở bằng **admin**, không phải phiên tài khoản owner.

Các số dưới tính bằng **giây**. “Lần đầu” là lần đầu trong nhóm đo, không phải cam kết browser/DB pool lạnh; “sau” là trung vị hai lần tiếp theo. Không cache quyền qua request.

| Màn hình | Trước: đầu | Trước: sau | Trước: trung vị 3 | Mới: đầu | Mới: sau | Mới: trung vị 3 |
|---|---:|---:|---:|---:|---:|---:|
| Tổng quan | 7,840 | 7,987 | 7,840 | 1,690 | 1,614 | 1,614 |
| Chủ homestay | 11,191 | 10,201 | 10,335 | 1,772 | 1,762 | 1,772 |
| Booking | 16,180 | 16,114 | 16,153 | 5,552 | 5,856 | 5,786 |
| Phòng | 8,133 | 7,984 | 8,133 | 2,839 | 2,712 | 2,714 |
| Báo cáo | 10,319 | 10,144 | 10,150 | 1,814 | 1,981 | 1,939 |
| Hoá đơn | 9,128 | 9,147 | 9,132 | 1,288 | 1,282 | 1,288 |
| Email | 9,743 | 8,949 | 9,140 | 1,628 | 1,626 | 1,628 |

Phân rã sau sửa, trung vị ba lượt; đơn vị **ms**, các request trong cùng màn hình được cộng. “Auth” đã gồm truy vấn xác thực; không cộng lại `atlas_auth`. “Backend khác” là backend trừ tất cả span Atlas, không phải CPU profiler. “Ngoài API” gồm tải tài nguyên, chờ frontend và render. Trung vị từng cột lấy riêng nên không nhất thiết cộng đúng bằng trung vị tổng.

| Màn hình | Request | Auth | Atlas nghiệp vụ | Backend khác | API/browser chênh | Ngoài API |
|---|---:|---:|---:|---:|---:|---:|
| Tổng quan | 1 | 291 | 1.270 | 5 | 3 | 53 |
| Chủ homestay | 2 | 572 | 1.105 | 13 | 5 | 57 |
| Booking | 2 | 608 | 5.025 | 24 | 8 | 53 |
| Phòng | 1 | 287 | 2.353 | 4 | 4 | 65 |
| Báo cáo | 2 | 668 | 1.146 | 12 | 5 | 63 |
| Hoá đơn | 2 | 574 | 646 | 2 | 4 | 49 |
| Email | 2 | 569 | 996 | 2 | 4 | 53 |

Số request mỗi màn hình không đổi so với gói đã cài. Lần sửa này giảm dữ liệu đọc từ Atlas, không dùng cache quyền cũ. [Trước](browser-baseline.json), [sau](browser-after.json), [tổng hợp endpoint và thời gian](timing-summary.json) có từng mẫu, HTTP status, bytes, Server-Timing và build.

**Đăng nhập:** POST `/api/auth/login` trên build gói có một mẫu thật 443 ms/200. Build mới có ba mẫu thật 480/427/448 ms, trung vị **448 ms**, đều 200; Atlas login trung vị 371 ms. Không tái hiện được riêng POST đăng nhập mất 10 giây trong ca này. Hai mẫu bổ sung lặp request thành công ngay trong bộ nhớ Chrome, không lấy mật khẩu/token ra collector. Chỉ báo thời gian từng POST; không coi thời gian điều hướng đã bị phép lặp trì hoãn là thời gian UI đăng nhập tự nhiên. [Trước](login.json), [sau](login-after.json).

Booking vẫn gần **5,8 giây**, Phòng khoảng **2,7 giây**: còn tải chi tiết nghiệp vụ/gallery cần thiết. Chưa tuyên bố mọi thao tác tức thời hay đã đo cold start sau thời gian dài không sử dụng.

## Hồi quy và ranh giới kiểm chứng

- **Mô phỏng, HTTP local + fixture:** toàn bộ suite 455 test: **452 đạt, 0 lỗi, 3 bỏ qua**. Test fresh-auth xác nhận tài khoản inactive/stale sessionVersion bị 401 ở request kế tiếp; thu hồi permission bị 403; owner không đọc phạm vi khác; guest không vào quản trị. Các test AI/hội thoại cũ vẫn chạy. Ba ca mới đã đỏ trước khi sửa; [trích kết quả](test-results.txt).
- **Atlas thật, chỉ đọc:** **10/10 đạt**. Bao gồm tái hiện projection cũ bị MongoDB 31275, kiểm tra pipeline mới trên dữ liệu thật, missing/empty/owned/foreign/duplicate/literal, và so sánh doanh thu/tồn phòng/cảnh báo/room-board với state đầy đủ. Các tình huống tổng hợp chạy bằng `$replaceWith` trong pipeline, không insert. Transaction không đổi được abort, không ghi.
- **Phiên admin thật qua Chrome + web3001 + Atlas:** auth/me và danh sách hội thoại 200; đọc hội thoại sẵn có của mình 200 với **26 messages**; ID hội thoại thật của tài khoản khác trả **404/NOT_FOUND**, không có data. Không Authorization trả 401; scope không tồn tại trả 403, không có data. [Kết quả có request ID](security-real-admin.json). Không ghi nội dung hội thoại vào artifact.
- **Chưa kiểm chứng bằng tài khoản thật:** owner/guest và việc khoá/thu hồi quyền tài khoản sản xuất. Các ca này chỉ chạy fixture để tránh sửa tài khoản thật. Lượt này không gửi chat mới, không đo Groq/Gemini, không kiểm chứng lại UI hiển thị lịch sử sau tải trang; chỉ xác minh API đọc lịch sử sẵn có và giữ các test AI. Không coi các test này là đăng nhập owner/guest thật.

## Chạy lại

```powershell
npm.cmd test
$env:HOMESTAY_ATLAS_READONLY_QA='1'
node --test test/ai-store-atlas-readonly.test.js
Remove-Item Env:HOMESTAY_ATLAS_READONLY_QA
node scripts/qa-performance-atlas.cjs
node scripts/qa-performance-browser.cjs --label=after
node scripts/qa-performance-security.cjs
```

Các script browser cần Chrome kiểm thử đang mở CDP9223 và phiên do người dùng tự đăng nhập; dùng Playwright-core trong thư mục Temp hiện tại. Không nhập token/mật khẩu vào CLI. Chạy lại cùng label sẽ ghi đè artifact của label đó; dùng label khác nếu cần lưu mốc mới. Collector không lưu HAR, Authorization, response nghiệp vụ hoặc thông tin đăng nhập. `scripts/check-performance.cjs` từ gói vẫn được giữ; số đo bàn giao ở đây dùng trình duyệt và Atlas thật, không lấy số mô phỏng làm tốc độ thực.
