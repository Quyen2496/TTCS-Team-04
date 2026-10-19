# Frontend T4 Sprint 3 — Quý

Nhánh `feature/t4-quy-sprint3-booking-change-walkin`, nền `develop` tại `5b04dd6153a9de9a8ff37d82a2e26d1ca6cdf567` (đã merge backend Phú `674f11e` qua PR #36 và các cập nhật T3/T5 sau đó). Màn hình: `/modules/bookings/staff.html`.

Phạm vi chỉ frontend T4, kiểm thử frontend và tài liệu phối hợp. Backend Phú, mã của các đội và `demos/HOMESTAY` được giữ nguyên. Giao diện đặt phòng khách giữ thiết kế/quy trình Tìm phòng → Xem báo giá → Nhập thông tin → Nhận mã booking; chỉ thêm lối vào màn hình tại quầy khi đã đăng nhập nhân viên.

## Các phần đã làm

| Task | Frontend | Giới hạn backend hiện tại |
| --- | --- | --- |
| S3-04-LC01-FE | Tra booking bằng mã/email; chọn ngày mới; xem tổng tiền trước/sau và chênh lệch; đồng ý trước khi PUT; huỷ preview khi sửa lựa chọn | Chưa có preview riêng/phiên bản/giá kỳ vọng; `/modify` chưa kiểm tra tồn và khóa phòng-đêm |
| S3-04-LC02-FE | Chọn loại phòng từ availability; lưu thay đổi; đối chiếu kết quả; vùng lịch sử chỉ đọc dữ liệu do API trả | Backend chưa lưu/trả lịch sử; frontend không tự sinh lịch sử kiểm toán |
| S3-06-LC01-FE | Walk-in mặc định nhận hôm nay; tìm phòng; xem quote; tên/điện thoại, email tuỳ chọn; chống gửi lặp; hiển thị mã và trạng thái thực tế từ response | Walk-in hiện lỗi tạo mã và thiếu dữ liệu bắt buộc schema; backend chưa khóa phòng-đêm; isPaidNow=false trả PENDING thay vì CONFIRMED theo AC |
| S3-06-LC02-FE | Lối tắt sang màn hình nhận phòng; trạng thái email chỉ hiển thị nếu API xác nhận | Chưa có nhận phòng liên kết Booking; API CheckIn thuộc collection khác; chưa có gửi email walk-in |

Ngày tính theo lịch Việt Nam; 1–30 đêm, số khách nguyên 1–100. Báo giá do API tính; frontend đối chiếu cấu trúc/ngày/loại/số tiền, không dùng giá tự đặt. Tiền cọc/thu/hoàn không đồng nhất với chênh lệch tổng giá. Màn hình không tạo dữ liệu giả khi API lỗi.

`authToken`/`authUser` đúng với trang đăng nhập nhóm; ưu tiên một cặp sessionStorage rồi mới localStorage. Chỉ admin/staff vào UI. Đây là kiểm soát giao diện; **backend phải xác thực và kiểm tra vai trò**. Không lưu hồ sơ khách/booking vào localStorage hoặc sessionStorage. Không tự retry PUT/POST. Lỗi 400/409 giữ form; lỗi mạng/500/phản hồi thành công không đọc được khóa thao tác để đối chiếu kết quả trước khi gửi lại.

## API đã nối theo mã của Phú

| Thao tác | Request | Response sử dụng |
| --- | --- | --- |
| Tra booking | `GET /api/bookings/lookup?bookingCode=...&email=...` | `{success:true,data:{_id,bookingCode,roomTypeId,checkIn,checkOut,guestCount,totalAmount,depositAmount,status,email}}` |
| Loại phòng phù hợp | `GET /api/bookings/availability?checkIn=...&checkOut=...&guestCount=...` | `{success:true,data:[{roomTypeId,name,capacity,availableRooms}]}` |
| Giá trước khi đổi/tại quầy | `POST /api/bookings/quote` — `roomTypeId,checkIn,checkOut,quantity` | `{success:true,data:{roomTypeId,roomTypeName,pricePerNight,totalNights,quantity,totalAmount}}` |
| Đổi ngày/loại | `PUT /api/bookings/:bookingId/modify` — `newRoomTypeId,newCheckIn,newCheckOut` | `{success:true,data:booking,priceDifference}` |
| Tạo tại quầy | `POST /api/bookings/walk-in` — `guestName,phone,email? ,roomTypeId,checkIn,checkOut,guestCount,isPaidNow` | `{success:true,data:booking}` |

Email trống **không được gửi** trong body; không dùng email mặc định do backend tạo để nói rằng khách đã cung cấp email. isPaidNow chỉ true khi nhân viên đánh dấu đã thu đủ tiền, không ép true để giả xác nhận/thanh toán.

Lịch sử `changeHistory` và trạng thái email `emailStatus` là phần frontend sẵn sàng đọc **nếu backend bổ sung**; không có các trường này ở backend hiện tại. Format dự kiến cho phối hợp: changeHistory `[{at,actorName,description,reason}]`; emailStatus SENT/FAILED. Màn hình báo chưa có thông tin khi API chưa trả, không giả định đã gửi email. Liên kết nhận phòng `/?bookingCode=...` chỉ mở giao diện T2; giao diện T2 hiện chưa đọc query và chưa liên kết model Booking.

## Chạy kiểm thử frontend ngay, cạnh HOMESTAY full

Cổng fixture **3002**, HOMESTAY full vẫn **3001**, server nhóm thật **3000**. Dữ liệu fixture chỉ trong RAM, có nhãn lớn trên màn hình, không kết nối MongoDB và không tạo booking thật. Không dùng fixture để nghiệm thu backend.

Trong thư mục repo nhánh này, Git Bash:

```bash
npm ci --no-audit --no-fund
T4_UI_TEST_FIXTURE=1 npx --yes --package=node@22 -c "node test/t4/fixture-server.cjs"
```

Mở `http://localhost:3002/modules/bookings/staff.html`. Fixture tự đăng nhập tài khoản kiểm thử; tra mã **TEST1234**, email **test@example.test**. Dừng bằng Ctrl+C. Có thể thử đổi ngày/loại, xem chênh lệch, xác nhận; chọn tab Booking tại quầy và thử không nhập email.

## Chạy với backend thật sau khi sửa các lỗi chặn

```bash
npx --yes --package=node@22 -c "node server.js"
```

Đăng nhập admin/staff bằng trang `/login.html`, mở `http://localhost:3000/modules/bookings/staff.html` hoặc cổng trong `.env`. Token được gửi trong Authorization. Cần cấu hình MongoDB của repo nhóm riêng; không chép `.env` của bản HOMESTAY full đè vào repo này. Chưa có seed dữ liệu thật trong thay đổi frontend này.

**Hiện chưa chạy được server thật** do lỗi cú pháp server/model và router của backend tại base commit. Xem [T4_PHU_BACKEND_BLOCKERS.md](T4_PHU_BACKEND_BLOCKERS.md). PR frontend phải giữ Draft đến khi Phú sửa và hai người kiểm thử tích hợp MongoDB.

## Kiểm thử tự chạy

```bash
node --test test/t4/staff-api.test.cjs
node test/t4/backend-check.cjs
```

Lệnh thứ hai là chẩn đoán backend, hiện trả exit 1 vì các lỗi đã xác nhận; không phải kết quả frontend bị lỗi. Không kết nối database, không sửa backend.

Browser test dùng Playwright riêng, không thêm dependency vào package.json dự án. Cài công cụ ở thư mục riêng (ví dụ D:/CodeGym_project/T4_BROWSER_TOOLS):

```bash
npm install --prefix /d/CodeGym_project/T4_BROWSER_TOOLS --no-audit --no-fund playwright
/d/CodeGym_project/T4_BROWSER_TOOLS/node_modules/.bin/playwright install chromium
T4_BROWSER_NODE_MODULES="D:/CodeGym_project/T4_BROWSER_TOOLS/node_modules" node test/t4/staff-browser.cjs
```

Kết quả kiểm thử ngày 12/10/2026: [T4_QUY_SPRINT3_TEST_RESULTS.md](T4_QUY_SPRINT3_TEST_RESULTS.md).

Kiểm tra thêm sau khi develop cập nhật 5b04dd6: adapter đọc totalDeposit khi có, fallback depositAmount của bản Phú; nhận checkInDate/checkOutDate khi API không trả checkIn/checkOut. Không tự đổi tên trường ghi của API modify.
