# HOMESTAY 1.7.1 — sửa Sprint 3 và payOS trên máy local

Bản đầy đủ cho Quý, ngày 15/10/2026. Dùng Node.js và dữ liệu hiện có trên máy. Phần triển khai Docker/VPS được để ngoài công việc lần này.

## 1. Cập nhật thư mục HOMESTAY đang dùng

1. Tại terminal đang chạy server, nhấn **Ctrl+C**.
2. Giải nén `HOMESTAY_SPRINT3_PAYOS_LOCAL_1_7_1.zip` thành đúng thư mục `D:\CodeGym_project\HOMESTAY_SPRINT3_PAYOS_LOCAL_1_7_1` (đặt đường dẫn này ở ô Destination của Extract All). Ngay trong thư mục này có `apply-update.cjs`, `manifest.json` và thư mục `HOMESTAY` đầy đủ.
3. Mở Git Bash và dán cả khối sau:

```bash
(
set -e
node "/d/CodeGym_project/HOMESTAY_SPRINT3_PAYOS_LOCAL_1_7_1/apply-update.cjs" "D:/CodeGym_project/HOMESTAY/HOMESTAY"
cd "/d/CodeGym_project/HOMESTAY/HOMESTAY"
npm ci --no-audit --no-fund
npx --yes --package=node@22 -c "node server.js"
)
```

Updater kiểm tra đúng dự án, kiểm tra mã băm từng tệp và sao lưu mã nguồn trong `backups/local-update-...` trước khi cập nhật. `.env`, booking, tài khoản, ảnh tải lên và dữ liệu đang dùng được giữ nguyên. Không chạy seed/reset để cập nhật. Nếu updater báo lỗi, dừng tại đó và xem thông báo; server chưa được khởi động bởi khối lệnh trên.

Mở [http://127.0.0.1:3001](http://127.0.0.1:3001) và nhấn **Ctrl+F5**. Nếu `.env` của bạn đặt cổng khác, mở đúng cổng đó. Dùng cùng một địa chỉ website trong suốt luồng thanh toán để phiên booking vẫn được nhận diện.

Mở cả frontend và backend trong VS Code:

```bash
code "/d/CodeGym_project/HOMESTAY/HOMESTAY"
```

Frontend ở `public/`; backend là `server.js` và `src/`.

## 2. Chạy riêng bản mới để xem giao diện

Nếu muốn thử trong thư mục mới, dán:

```bash
(
set -e
cd "/d/CodeGym_project/HOMESTAY_SPRINT3_PAYOS_LOCAL_1_7_1/HOMESTAY"
bash scripts/setup.sh --demo
npx --yes --package=node@22 -c "node server.js"
)
```

Bản thử mới dùng dữ liệu file, không cần MongoDB. Dừng server cũ trước vì cả hai mặc định dùng cổng 3001. Tài khoản thử mới: `admin`, `chunha`, `letan`, `baocao`, `buongphong`; mật khẩu `Quy@123456`. Khách tự đăng ký tại `/register.html`. Tài khoản và mật khẩu cũ được giữ khi cập nhật theo mục 1.

## 3. Thiết lập payOS để thử thanh toán

**Bạn cần Client ID, API Key và Checksum Key của cùng một kênh payOS.** Mã QR thật chỉ tạo được sau khi bạn nhập các thông tin này trên máy. Không gửi key vào chat.

1. Tại [https://my.payos.vn](https://my.payos.vn), tạo/chọn kênh thanh toán và liên kết tài khoản ngân hàng nhận tiền.
2. Đăng nhập HOMESTAY bằng admin → **Giá & chính sách** → chọn đúng homestay → **Tài khoản nhận cọc & QR**. Sao chép mã homestay được hiển thị trong cửa sổ này.
3. Dừng server bằng Ctrl+C. Trong thư mục dự án đang dùng, chạy:

```bash
bash scripts/setup-payos.sh
```

4. Nhập mã homestay và URL website. Nếu bạn mở web tại `http://127.0.0.1:3001`, nhập đúng URL này. Sau đó nhập lần lượt Client ID, API Key, Checksum Key; terminal ẩn các thông tin kênh lúc nhập. Script sao lưu `.env` và giữ cấu hình MongoDB/email/AI.
5. Chạy lại server:

```bash
npx --yes --package=node@22 -c "node server.js"
```

6. Admin → **Giá & chính sách** → chọn homestay vừa thiết lập → **Tài khoản nhận cọc & QR** → chọn cách nhận cọc **payOS**, kênh **default**, tỷ lệ cọc mong muốn → bật chuyển khoản và lưu.

Local tạo được QR thật và tự đọc giao dịch từ API payOS mỗi 8 giây khi trang thanh toán đang mở. Nút **Cập nhật trạng thái** cho phép đối chiếu ngay. Localhost không nhận webhook trực tiếp từ payOS; phần đọc API cho phép thử luồng trên máy mà chưa triển khai máy chủ. Mỗi giao dịch phải qua đối chiếu tại backend trước khi ghi cọc; tham số `status=PAID` trên trang trở về không ghi tiền.

Các homestay khác chưa cấu hình kênh sẽ không dùng chung tài khoản nhận tiền của homestay này. Nếu bạn cần cấu hình nhiều kênh, dùng `PAYOS_CHANNELS_JSON` theo cấu trúc trong tài liệu 1.7.0; mỗi kênh gắn với một `homestayId`.

## 4. Cách thử và kết quả mong đợi

| Hạng mục | Cách kiểm tra | Kết quả |
|---|---|---|
| Header/footer mobile | Thu cửa sổ xuống khoảng 360px, mở/đóng burger, nhấn Escape | Logo/menu/footer vừa màn hình; menu đóng đúng thao tác |
| Đồng ý chính sách | Tìm phòng, lấy báo giá, mở form; tích rồi bỏ tích chính sách | Nút đặt chỉ mở khi có báo giá và đã đồng ý; API cũng kiểm tra |
| QR payOS | Tạo booking → Đặt cọc → Tạo QR payOS | QR và link từ payOS; số tiền lấy từ booking trên server |
| Số tiền cọc | Ví dụ tổng 700.000, tỷ lệ cọc 30% | Cọc yêu cầu 210.000; đã cọc 0; cọc cần chuyển 210.000 |
| Cọc cập nhật local | Chuyển tiền cho booking thử rồi để trang thanh toán đang mở | Backend tự đối chiếu; cọc cập nhật; đủ cọc thì ngừng hiển thị QR để chuyển thêm |
| Tiền còn thanh toán | Ví dụ đã nhận cọc 210.000 của booking 700.000 | Cọc cần chuyển 0; tiền còn thanh toán toàn booking 490.000 |
| Chuyển thiếu | Giao dịch 100.000 cho lệnh 210.000 | Cọc nhận 100.000; thiếu 110.000; lệnh cũ được đối chiếu/huỷ trước khi tạo QR mới |
| Chữ ký/giao dịch lặp | Chạy `npm run test:payos` | Webhook giả bị chặn; gửi lại cùng giao dịch không tăng cọc |
| QR hết hạn/đã huỷ | Tiền tới sau khi QR hết hạn/huỷ | Lưu bằng chứng, chuyển đối soát; không tự cộng cọc |
| Huỷ bị lỗi | payOS chưa xác nhận huỷ hoặc đang xử lý | Hiển thị chưa huỷ được; giữ lệnh cũ để kiểm tra |
| Lịch sử đổi ngày | Lễ tân → Booking & khách → đổi lịch → Lịch sử đổi | Modal so sánh trước/sau, người sửa, thời điểm, chênh lệch, cọc giữ nguyên |
| Giấy tờ khách | Khách cập nhật hồ sơ/đặt phòng có CCCD; lễ tân mở nhận phòng | Giấy tờ được điền sẵn; lễ tân vẫn đối chiếu giấy tờ thật |
| Sơ đồ phòng | Chọn Từ ngày/Đến ngày, thử ngày trả và khoảng sai | Hiển thị tối đa 31 ngày; ngày trả không chiếm đêm; nhập sai vẫn giữ bộ lọc |
| AI | Hỏi dữ liệu có bảng tại màn hình AI lớn | Hiển thị các dòng liên tục; không có phân trang bảng |

Cọc được ghi nhận không tự chuyển booking sang Đã xác nhận; lễ tân vẫn xử lý bước xác nhận như quy trình hiện tại. Khoản cần đối soát nằm tại **Booking & khách → Đối soát payOS**; quyết định cần hoàn tiền chỉ ghi công việc cần xử lý, không tự chuyển tiền ngân hàng.

## 5. Những điểm sửa thêm trong 1.7.1

- Đối chiếu API tự động tại trang thanh toán local; cập nhật ngay khi quay lại tab.
- Ngăn huỷ/tạo QR/cập nhật trạng thái chạy chồng nhau trên giao diện.
- Nhận tiền sau hạn QR hoặc sau huỷ QR được lưu để đối soát.
- payOS chưa xác nhận huỷ không còn được báo như huỷ thành công.
- Giữ lệnh khi provider đang `PROCESSING`, ngăn tạo lệnh thanh toán trùng.
- Giao dịch đã ghi nhận trong lúc tạo QR không bị đổi trạng thái trở lại PENDING.
- Giữ bộ chọn ngày của sơ đồ khi nhập sai và cho sửa lại ngay.
- Thông báo cấu hình/kết nối payOS rõ hơn; phiên đặt cọc hết hạn mở lại form tra cứu.

## 6. Kiểm thử

Chạy toàn bộ bài kiểm thử:

```bash
npm test
```

Chạy riêng payOS:

```bash
npm run test:payos
```

Bài kiểm thử dùng dữ liệu tạm và merchant giả lập; không tạo thanh toán ngân hàng thật. Xem kết quả lần kiểm tra này trong `docs/KET_QUA_KIEM_THU_1_7_1.txt`. Kiểm thử MongoDB cạnh tranh cần URI replica set dành riêng cho kiểm thử; không dùng URI dữ liệu đang chạy cho bài này. Chưa thực hiện giao dịch/kênh payOS thật vì chưa có cấu hình của bạn.

Tài liệu tích hợp: [SDK Node.js chính thức](https://payos.vn/docs/sdks/back-end/node), [payOS API](https://payos.vn/docs/api/).
