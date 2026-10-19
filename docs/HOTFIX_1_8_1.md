# HOMESTAY 1.8.1

## Các phần đã sửa

- Mobile từ 800 px trở xuống: logo đầu trang nằm giữa màn hình, nút menu giữ bên phải. Logo, câu giới thiệu và liên kết ở footer đều căn giữa; khoảng cách và vùng bấm được thống nhất.
- Lễ tân có quyền cấp, xem, tải và mở PDF để in hóa đơn trong homestay được giao. Menu lấy lại quyền hiện tại từ máy chủ, không giữ menu cũ trong phiên đăng nhập.
- Bổ sung một lần quyền hóa đơn cho tài khoản lễ tân mang đầy đủ bộ quyền mặc định Sprint 3. Tài khoản đã giới hạn riêng giữ nguyên quyền; lần thu hồi quyền sau cập nhật được giữ nguyên khi khởi động lại.
- Nút Báo đã chuyển tiền bị vô hiệu hóa khi chưa tích xác nhận; bỏ tích thì khóa lại. Đang gửi, lỗi mạng hoặc cập nhật trạng thái không làm nút tự mở sai điều kiện.
- Đối soát chuyển khoản và payOS chỉ cho ghi cọc khi tích xác nhận. Chọn từ chối giao dịch hoặc ghi nghĩa vụ hoàn tiền không bắt xác nhận đã nhận cọc.
- Nhận phòng sớm giữ điều kiện xác nhận trước khi lưu. Quyết toán có cọc dư yêu cầu xác nhận nghĩa vụ hoàn; thay thời điểm hoặc lý do trả phòng khóa Lưu cho tới khi tính lại bảng tiền.
- Ô lựa chọn ảnh, tiện nghi, phạm vi homestay và phân quyền là lựa chọn tùy ý, không bị biến thành xác nhận bắt buộc.

## Cách cập nhật trên máy của Quý

Gói này áp dụng cho HOMESTAY Sprint 4 phiên bản 1.8.0 hoặc chạy lại trên 1.8.1. Nếu còn 1.7.x, hãy áp dụng gói Sprint 4 1.8.0 trước. Không chạy seed hoặc setup demo trên dữ liệu đang dùng.

1. Ở Git Bash đang chạy HOMESTAY, nhấn Ctrl + C và chờ xuất hiện dấu nhắc lệnh. Cloudflare Tunnel có thể giữ nguyên.
2. Giải nén HOMESTAY_FIX_MOBILE_INVOICE_1_8_1.zip vào D:\CodeGym_project\HOMESTAY_FIX_MOBILE_INVOICE_1_8_1.
3. Mở Git Bash rồi dán cả khối bên dưới. Lệnh tự tìm apply-update.cjs kể cả khi giải nén bị lồng thêm một thư mục.

```bash
(
set -e
hs_folder="/d/CodeGym_project/HOMESTAY_FIX_MOBILE_INVOICE_1_8_1"
if [ ! -d "$hs_folder" ]; then
  echo "Chưa thấy thư mục gói cập nhật. Hãy kiểm tra nơi giải nén."
  exit 1
fi
hs_updater="$(find "$hs_folder" -maxdepth 4 -type f -iname 'apply-update.cjs' -print -quit)"
if [ -z "$hs_updater" ]; then
  echo "Chưa tìm thấy apply-update.cjs trong thư mục đã giải nén."
  exit 1
fi
node "$(cygpath -w "$hs_updater")" "D:/CodeGym_project/HOMESTAY/HOMESTAY"
cd "/d/CodeGym_project/HOMESTAY/HOMESTAY"
npx --yes --package=node@22 -c "node server.js"
)
```

Không đổi thư viện phụ thuộc; không cần npm ci cho bản vá này. Trình cập nhật sao lưu các tệp mã nguồn bị thay vào backups/local-update-... trước khi ghi. Nó không chép .env, dữ liệu, ảnh đã tải lên hay cấu hình Tunnel; các giá trị APP_URL và PUBLIC_BASE_URL được giữ nguyên.

## Kiểm tra sau cập nhật

1. Máy tính: nhấn Ctrl + F5. Điện thoại: tải lại trang; nếu vẫn thấy giao diện cũ, mở trong tab ẩn danh để kiểm tra.
2. Đăng xuất và đăng nhập lại bằng tài khoản lễ tân. Vào Booking & khách → booking đã quyết toán và đã đóng → In / tải hoá đơn → Mở PDF để in. Trong tab PDF, chọn biểu tượng máy in hoặc Ctrl + P trên máy tính. Có thể chọn Tải PDF A4 rồi mở bằng WPS để in.
3. Mục Hoá đơn trong sidebar cũng có nút mở PDF và tải PDF. Nếu trình duyệt chặn tab mới, cho phép mở tab hoặc dùng tải PDF.
4. Nếu tài khoản lễ tân có bộ quyền giới hạn riêng, admin vào Tài khoản & quyền → Sửa quyền → tích Hoá đơn · Xem và Hoá đơn · Thêm; cần giữ quyền xem Khách hàng và đúng phạm vi homestay. Lưu xong để lễ tân đăng nhập lại.
5. Booking cũ chỉ có trạng thái Đã trả phòng nhưng chưa có bảng quyết toán sẽ hiển thị Chưa có quyết toán. Không tự tạo khoản thu hoặc hóa đơn bằng dữ liệu chưa được ghi nhận.
6. Thử ô xác nhận: chưa tích thì nút mờ và không bấm được; tích thì mở; bỏ tích thì khóa lại. Điều này áp dụng cho bước xác nhận liên quan, không ẩn cả biểu mẫu.

Hóa đơn này là chứng từ thanh toán nội bộ. Tên miền cố định và cách bật/tắt hệ thống giữ theo hướng dẫn vận hành đã gửi.

## Phạm vi kiểm thử

Xem QA_HOTFIX_1_8_1.txt và các bản ghi kiểm thử đi kèm. Kiểm thử dùng dữ liệu cô lập, không thực hiện giao dịch ngân hàng, gửi thư thật hay truy cập database của bạn.
