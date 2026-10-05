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
