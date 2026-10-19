# Các lỗi backend chặn tích hợp frontend T4 Sprint 3

Đối chiếu `develop 5b04dd6` (merge T3/T5) và bản Phú `674f11e`, ngày 12/10/2026. Frontend không sửa backend trong nhánh Quý. Đây là các lỗi đã thấy từ source/chạy chẩn đoán; chưa nghiệm thu với MongoDB thật.

## Lỗi mới ở develop sau merge T3/T5

`node --check server.js` báo Unexpected token `}`; `node --check src/modules/bookings/booking.model.js` báo Unexpected token `/`. Mã còn các dòng `feature/t3-quynh-audit-log-api` và `develop` nằm trong phần thực thi; router cũng có các dòng thừa này và dùng verifyToken chưa import. Cần giải quyết merge đúng, không chỉ xoá dấu <<<< / ==== / >>>>.

Model mới đồng thời có checkInDate/checkOutDate và checkIn/checkOut required; đổi depositAmount thành totalDeposit. Cần thống nhất với service Phú đang ghi checkIn/checkOut để tránh mất dữ liệu và sai cọc. Frontend đọc fallback tên ngày và ưu tiên totalDeposit nếu có, nhưng không sửa schema/service.

Bằng chứng develop mới: test/t4/backend-status.json. Bằng chứng chạy bản Phú trước merge T3/T5: test/t4/backend-status-phu-674f11e.json. Các lỗi chức năng bên dưới được xác nhận trên bản Phú; sau merge, service đó vẫn chưa thay đổi và bị lỗi model chặn nạp.

## Lỗi trong backend Phú cần sửa để chạy được

1. **Server dừng trước khi kết nối database.** `booking.router.js` đăng ký cancelBooking nhưng controller không có hàm này. `require('./src/modules/bookings/booking.router')` trả `Route.patch() requires a callback function but got a [object Undefined]`. Cần triển khai/gắn controller đúng; không bỏ chức năng huỷ để làm mất tính năng cũ.
2. **Booking online bị mất service.** Controller createBooking vẫn gọi bookingService.createBookingService nhưng service không định nghĩa/export. Cần giữ lại triển khai chống trùng của S3-02, không chỉ trả success giả.
3. **Walk-in không tạo được mã.** `booking.service.js` dùng crypto.randomBytes nhưng chưa import `node:crypto`. Node 24 có WebCrypto global nên lỗi `crypto.randomBytes is not a function`; Node khác có thể báo crypto chưa định nghĩa.
4. **Walk-in thiếu dữ liệu bắt buộc.** Booking schema yêu cầu roomId và holdExpiresAt; service không cấp. Sửa import crypto xong vẫn không thể save. Cần quy trình chọn/gán phòng theo AC và trạng thái/hạn giữ đúng nghiệp vụ, không chỉ nới schema để bỏ kiểm tra. Model hiện cũng không có isWalkIn, nên marker service truyền sẽ bị schema strict loại.
5. **Sức chứa và giá chưa có trong schema RoomType.** Service đọc capacity/basePrice/price, nhưng model chỉ lưu name/isSelling/images. Availability có thể fallback capacity bằng số khách được hỏi; quote fallback 500000. Cần lưu/kiểm tra sức chứa, giá thực tế và lọc loại đang bán; không dùng fallback để báo rằng mọi loại đủ chỗ.

## Phần cần hoàn thiện để đạt AC Sprint 3

- `/modify` và `/walk-in` hiện chưa có verifyToken/requireRoles. Frontend chỉ ẩn nghiệp vụ với customer; client có thể bỏ qua UI. Server phải kiểm tra quyền admin/staff và phạm vi homestay nếu repo nhóm hỗ trợ.
- `/modify` hiện `$set` ngày/loại/giá mà chưa kiểm tra booking chưa nhận, tồn đúng loại/sức chứa, phiên bản/giá preview, phòng hiện tại và khóa BookingRoomNight. Cần transaction/khoá phù hợp để đổi không giữ lịch cũ hoặc gây trùng lịch mới. Availability khi đổi cần bỏ booking đang chỉnh khỏi phép tính thay vì coi phòng của chính nó là xung đột.
- `/walk-in` save thẳng Booking, chưa giữ khoá phòng-đêm và chưa chọn phòng vật lý. Status isPaidNow=false là PENDING, khác AC tại quầy được xác nhận ngay; việc xác nhận không nên giả định đã thu đủ tiền. Email không cung cấp đang bị thay bằng walkin@homestay.com; không được gửi thư tới địa chỉ giả hoặc dùng để xác thực tra cứu.
- Không có changeHistory/audit thay đổi cũ/mới/người/thời điểm. Frontend có vùng đọc lịch sử, cần backend trả dữ liệu thật (đề xuất trong docs frontend); không dùng lịch sử trình duyệt thay kiểm toán server.
- Chưa gửi/trả trạng thái gửi email walk-in. Cần kết quả SENT/FAILED/SKIPPED rõ ràng, tạo booking thành công không bị nói thành email đã gửi. Phản hồi hiện tại không có thông tin này.
- T2 `/api/reception/checkins` dùng model CheckIn riêng, không chuyển status/model Booking của T4 và không dùng chung khóa phòng-đêm. Chưa có API nhận phòng liên kết booking mới. Frontend chỉ mở màn hình nhận phòng; cần thống nhất với T2 trước khi nối hành động ghi.
- API S2 hiện có dạng availability `{data:[capacity,availableRooms...]}`, quote gộp pricePerNight/totalNights, create `{booking:...}` khác contract cũ và frontend khách đang dùng. Cần thống nhất response S2 để không làm mất luồng đặt phòng cũ; nhánh frontend S3 này không sửa luồng S2 đang bị lệch contract.

## Cách tái kiểm tra

```bash
node test/t4/backend-check.cjs
```

Chẩn đoán nạp router và đọc schema; một lượt test service có stub riêng cho truy vấn RoomType và save chỉ validate để kiểm tra payload, không kết nối hoặc ghi MongoDB. Sau khi sửa cần chạy thêm tích hợp thật: tìm → đổi → đối chiếu booking/khóa phòng-đêm/cọc/lịch sử; tạo tại quầy → nhận phòng cùng booking; hai người tranh phòng; khách không gọi API nhân viên được; có/không email; lỗi gửi email không mất booking.

Backend hiện chặn tích hợp, không kết luận Sprint 3 nhóm đã hoàn thành chỉ từ các ca frontend fixture đạt.
