# Frontend T2 – Nghiệp vụ lễ tân

Frontend thuần HTML/CSS/JS, không React/Vite/npm/Tailwind.

## Cấu trúc
- `public/css/homestay-ui.css`: thành phần giao diện chung
- `public/css/homestay-layout.css`: sidebar/header/responsive/accessibility
- `public/js/homestay-layout.js`: menu mobile, backdrop, Escape, focus trap
- `public/modules/reception/`: trang nghiệp vụ lễ tân

## API frontend đang gọi
- `GET /api/reception/rooms` – danh sách phòng có trạng thái/lịch sử
- `PATCH /api/reception/rooms/:id/status` – đổi trạng thái
- `POST /api/reception/rooms/:id/maintenance` – đưa phòng vào bảo trì
- `GET /api/reception/bookings` – danh sách booking lễ tân
- Giao diện gán phòng đã chuẩn bị nhưng đang khóa cho đến khi backend có API gán phòng.

Frontend không dùng localStorage để lưu trạng thái phòng và không dùng dữ liệu booking giả.
Nếu `/api/reception/rooms` chưa tồn tại, danh sách phòng thử đọc `GET /api/rooms` để vẫn hiển thị dữ liệu phòng thật; các thao tác thay đổi trạng thái vẫn yêu cầu API nghiệp vụ lễ tân.


## Sprint 3 – gán phòng và đổi phòng

Frontend Sprint 3 có giao diện cho: (1) gán phòng cho booking đã xác nhận; (2) đổi phòng cho booking đã nhận phòng, chỉ cho phép phòng đích trống sạch; (3) đổi phòng booking chưa nhận phòng và bắt buộc nhập lý do; (4) hiển thị lịch sử đổi phòng và thông tin booking đang chiếm phòng khi máy chủ trả về xung đột HTTP 409. Không lưu trạng thái nghiệp vụ trong localStorage và không giả lập kết quả thành công.

### API contract frontend dự kiến
- `GET /api/reception/bookings` – danh sách booking (đang được dùng ở Sprint 1–2).
- `GET /api/reception/bookings/:id/available-rooms` – trả về phòng phù hợp cho booking đã chọn. Backend phải lọc đúng loại phòng và xác nhận phòng không bị chiếm trong **bất kỳ đêm nào** của khoảng lưu trú; với booking đã nhận phòng chỉ trả phòng `CLEAN_VACANT`/trống sạch.
- `POST /api/reception/bookings/:id/room` với `{ "roomId": "..." }` – gán phòng cho booking đã xác nhận.
- `PATCH /api/reception/bookings/:id/room` với `{ "roomId": "...", "reason": "..." }` – đổi phòng, lưu phòng cũ/mới, người thao tác, lý do và thời gian vào lịch sử.
- `GET /api/reception/bookings/:id/room-history` – lịch sử đổi phòng.

Backend phải kiểm tra trạng thái booking, loại phòng, xung đột ngày ở và trạng thái phòng lại ở thời điểm POST/PATCH (không chỉ tin danh sách gợi ý). Khi xung đột, nên trả HTTP `409` và payload ví dụ `{ "message": "Phòng đã bị chiếm", "conflictingBooking": { "bookingCode": "...", "guestName": "...", "checkIn": "YYYY-MM-DD", "checkOut": "YYYY-MM-DD" } }`. Nếu endpoint chưa tồn tại, UI sẽ báo rõ và không thông báo thành công. Các endpoint trên là contract frontend đề xuất, cần thống nhất với bạn phụ trách backend trước khi demo end-to-end.
