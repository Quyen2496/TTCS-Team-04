# HOMESTAY 1.9.0 — bản đầy đủ

Hướng dẫn chính: [Cập nhật danh mục và vận hành 1.9.0](docs/COLLECTION_1_9_0.md). Bản này có danh mục 10 homestay, ít nhất 100 loại phòng, 3–5 phòng/loại; kèm toàn bộ chức năng tới 1.8.4.

Tài liệu nền của dự án ở bên dưới. Khi cập nhật từ bản đang dùng, ưu tiên hướng dẫn 1.9.0, không chạy seed --reset.

---

# HOMESTAY 1.8.0 — Sprint 4

Bản hiện tại đã có quyết toán, phụ thu, hoá đơn PDF, email booking, báo cáo và sao lưu.

**Đọc docs/SPRINT_4.md trước khi cập nhật hoặc chạy thử.** Không seed lại DB vận hành. Xem docs/KET_QUA_KIEM_THU_SPRINT4.txt để biết các kiểm thử và phần hạ tầng chưa triển khai.

---

## Hướng dẫn nền tảng từ các bản trước

> **HOMESTAY 1.7.1 — Sprint 3 / payOS local:** xem [docs/HUONG_DAN_PAYOS_LOCAL_1_7_1.md](docs/HUONG_DAN_PAYOS_LOCAL_1_7_1.md) để cập nhật, chạy và thử thanh toán.

# HOMESTAY AI 1.5.0

Bổ sung Trợ lý AI vào bản full Sprint 3. Xem [docs/AI_HOMESTAY.md](docs/AI_HOMESTAY.md) và chạy `bash scripts/setup-ai.sh` để bật Groq/Ollama. Mã AI đọc dữ liệu theo quyền, giữ số liệu do backend tính, có lịch sử riêng và xuất Excel/PDF. Các thông tin phiên bản cũ bên dưới giữ để tham chiếu.

# HOMESTAY — Sprint 3 đầy đủ

Bản hiện tại triển khai đủ 10 PBI Sprint 3, thêm Buồng phòng, sửa ô số dòng và nhãn Tạo tài khoản. Xem [docs/SPRINT_3.md](docs/SPRINT_3.md) để chạy thử và đối chiếu kiểm thử. Hướng dẫn nền tảng bên dưới vẫn dùng được; số liệu phiên bản cũ là lịch sử.

# HOMESTAY v5 — 5 vai trò và tài khoản Khách

Giao diện giữ bố cục UI/UX v4 với font Arial, màu xanh, nền và trang trí v3. Dự án Node.js/MongoDB độc lập dùng cổng 3001, có chế độ dữ liệu file để kiểm thử.

## Chức năng

| Vai trò | Chức năng mặc định |
| --- | --- |
| Admin | Quản lý mọi homestay; thêm/sửa/xóa tài khoản; cấp quyền và phạm vi cơ sở; danh mục; giá; booking; báo cáo; nhật ký |
| Chủ homestay | Quản lý phòng, loại phòng, ảnh, giá, booking, khách hàng và báo cáo của các cơ sở được giao |
| Lễ tân | Booking, thông tin khách hàng, cọc, xác nhận, nhận/trả phòng và trạng thái phòng |
| Báo cáo | Thống kê và xuất CSV/in PDF; không xem thông tin cá nhân khách |
| Khách | Đăng ký/đăng nhập, sửa hồ sơ, đặt phòng, xem và huỷ booking của mình, đổi mật khẩu |

Admin có thể thu hẹp từng quyền trong phạm vi vai trò. Quyền và phạm vi dữ liệu được kiểm tra ở máy chủ, mỗi yêu cầu; không chỉ ẩn nút trên giao diện.

Khách chưa đăng nhập vẫn tìm và đặt phòng, tra cứu bằng mã + email. Luồng giữ nguyên: **Tìm phòng → Xem báo giá → Nhập thông tin → Nhận mã booking**. Booking tạo lúc đăng nhập gắn với tài khoản Khách. Booking cũ không tự gắn bằng email; hãy dùng trang Tra cứu. Màn hình Khách không có CCCD hoặc ghi chú nội bộ.

Ảnh homestay/phòng/loại phòng được chủ homestay tải từ máy, PNG/JPG/WebP, tối đa 5 MB/ảnh và 10 ảnh/bộ. Khi chưa tải ảnh, hiển thị “Chưa có ảnh”. Giá và chính sách từng cơ sở riêng; chọn homestay trước khi cấu hình.

## Cập nhật bản đang chạy

Xem `docs/CAP_NHAT_V5.md`. Gói cập nhật có `apply-update.cjs` để kiểm tra payload và sao lưu mã nguồn trước khi chép. Dừng server trước khi cập nhật; giữ lại `.env`, `data`, `public/assets/uploads` và `node_modules`. Sau cập nhật chạy `npm ci`, `npm test`, `npm run update-data`, `npm start`. Chạy lại `update-data` không nhân đôi phòng hoặc xóa booking.

## Chạy mới bằng Git Bash

Trong thư mục chứa `package.json`:

```bash
bash scripts/setup.sh --demo
npm start
```

Mở http://127.0.0.1:3001. Chế độ demo lưu dữ liệu trong `data/homestay.json` và không cần MongoDB.

Muốn dùng MongoDB: điền `MONGODB_URI` trong `.env`, đặt `DATA_MODE=mongo`, chạy `npm run update-data` và `npm start`. Node cần từ 22 trở lên. Có thể giữ cách dùng Node 22 đang hoạt động trên máy bạn khi kết nối Atlas.

Các tài khoản kiểm thử được tạo nếu chưa tồn tại: `admin`, `chunha`, `letan`, `baocao`; mật khẩu `Quy@123456`. Mật khẩu tài khoản cũ được giữ nguyên. Khách tự tạo tại `/register.html`. Bộ phòng ban đầu có 50 phòng/10 loại và 30 tiện nghi; ảnh mẫu cũ không hiển thị như ảnh thực tế.

## Email đặt lại mật khẩu

Đổi mật khẩu yêu cầu mật khẩu cũ đúng, mật khẩu mới từ 8 ký tự gồm chữ và số (tối đa 72 byte theo BCrypt), và hủy các phiên cũ.

Quên mật khẩu gửi mã email 6 số qua SMTP; thời hạn 10 phút, dùng một lần, khóa sau 5 lần nhập sai, tối đa 3 lần gửi/giờ/email. Mã mới thay thế mã cũ; đổi mật khẩu thu hồi các phiên cũ. Cấu hình SMTP trong `.env` theo [hướng dẫn email](docs/EMAIL_VA_HO_SO.md). Không trả mã ra API hoặc ghi mã vào log.

## Kiểm thử

`npm test`: 50 bài kiểm thử API/nghiệp vụ, gồm tranh phòng cuối, replay, báo giá, phân quyền, phạm vi cơ sở, upload, booking cá nhân và reset mật khẩu. Đã kiểm tra trình duyệt ở 1440px và 360px; luồng đăng ký → đặt phòng → xem booking cá nhân hoạt động. Kết quả và ảnh chụp ở `docs/previews-v5/`.

Kiểm thử tự động hiện chạy với dữ liệu file và email giả lập; chưa kiểm thử trực tiếp MongoDB Atlas hoặc gửi SMTP của bạn.

### Thiết lập email và tên vai trò — 1.3.2

Chạy `bash scripts/setup-email.sh` trong Git Bash để kiểm tra và cấu hình Gmail, sau đó đặt email thật trên tài khoản cần khôi phục và khởi động lại server. Chi tiết: [THIET_LAP_EMAIL.md](docs/THIET_LAP_EMAIL.md). Giao diện dùng tên Chủ homestay; tên đăng nhập `chunha` và mã `owner` được giữ.

Bản AI 1.5.0: gợi ý phòng theo số người, chọn xem tiện nghi và hỏi tiếp ngày/khách, chỉ hiện Excel/PDF khi đồng ý xuất. Xem `docs/AI_HOMESTAY.md` và `docs/TEST_AI_1_5_0.txt`.
