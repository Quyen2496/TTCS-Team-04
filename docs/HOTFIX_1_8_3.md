# HOMESTAY 1.8.3 — bản vá cho 1.8.2

Bản này sửa đúng nhóm lỗi đã xác nhận khi rà soát 1.8.2. Không thay đổi thư viện phụ thuộc, không cần cài lại npm, không seed hoặc thay database.

## 1. Những phần đã sửa

1. Phân quyền API: dùng đường dẫn route đã được Express khớp để chọn chính sách, đồng nhất chữ hoa/thường, dấu / cuối và HEAD. API có đăng nhập nhưng chưa có chính sách sẽ bị chặn. Tài khoản khách không thể vượt vào API quản lý; phản hồi quản lý vẫn che giấy tờ và API không được cache.
2. Số dư booking: tính từ tổng quyết toán và tiền thực thu khi trả phòng, không chỉ trừ cọc khỏi giá đặt ban đầu. Không đếm hai lần biên nhận vừa nằm trong quyết toán vừa nằm trong sổ thu. Tra cứu, Booking của tôi và trang thanh toán dùng cùng phép tính. Booking cũ chưa có quyết toán không bị tự coi là đã thanh toán.
3. Quyền khách: kiểm tra quyền xem/sửa hồ sơ, xem booking, xem thanh toán và hủy booking trên mỗi yêu cầu. Trang tài khoản vẫn mở được khi một phần quyền bị thu hồi; nút Lưu bị khóa và các nút không có quyền bị ẩn.
4. Hủy booking/email: lưu tỷ lệ hoàn, số tiền hoàn, lý do, người hủy, thời điểm và sự kiện trước khi xếp email. Chính sách dùng bản chốt lúc đặt. Bấm gửi lại không tạo thêm sự kiện/email hủy. Thư hủy cũ còn trong hàng đợi thiếu metadata được diễn đạt an toàn, giữ nguyên số tiền đã lưu; email đã gửi trước đây không thể chỉnh lại.

Ví dụ: booking 350.000đ, cọc 105.000đ, thu nốt 245.000đ khi trả phòng → tổng đã thu 350.000đ, còn thanh toán 0đ. Nếu có phụ thu thì hiển thị thêm tổng quyết toán.

## 2. Cập nhật trên Windows bằng Git Bash

1. Tại cửa sổ đang chạy server HOMESTAY, nhấn Ctrl+C và đợi về dấu $. Không chạy hai server cùng lúc trên cổng 3001.
2. Giải nén HOMESTAY_HOTFIX_1_8_3.zip vào D:\CodeGym_project\HOMESTAY_HOTFIX_1_8_3. Không dán đè thủ công vào thư mục dự án.
3. Mở Git Bash và dán cả khối dưới đây. Lệnh tìm file trong tối đa 4 cấp để xử lý trường hợp giải nén bị lồng thư mục.

```bash
(
set -e
hs_patch="/d/CodeGym_project/HOMESTAY_HOTFIX_1_8_3"
hs_updater="$(find "$hs_patch" -maxdepth 4 -type f -name 'apply-update.cjs' -print -quit)"
if [ -z "$hs_updater" ]; then
  echo "Chưa thấy apply-update.cjs. Kiểm tra lại thư mục giải nén."
  exit 1
fi
node "$(cygpath -w "$hs_updater")" "D:/CodeGym_project/HOMESTAY/HOMESTAY"
cd "/d/CodeGym_project/HOMESTAY/HOMESTAY"
npx --yes --package=node@22 -c "node server.js"
)
```

4. Mở website và nhấn Ctrl+F5 để tải lại JavaScript. Thử đăng nhập tài khoản khách và lễ tân; không cần đổi cấu hình Cloudflare.

Chương trình cập nhật kiểm tra hash trước khi ghi, sao lưu các tệp mã nguồn bị thay đổi vào backups/local-update-..., và tự khôi phục các tệp vừa ghi nếu cập nhật gặp lỗi. Chạy lại cùng gói không tạo bản sao dư nếu không có thay đổi.

Giữ nguyên .env, tài khoản, booking, ảnh tải lên, cấu hình email/payOS/Cloudflare và các sao lưu hiện có. Đây là cập nhật mã nguồn; không tự khởi động lại dịch vụ trên máy bạn. Các khoản tiền đã lưu không được sửa lại bằng tác vụ chuyển dữ liệu.

## 3. Kiểm tra sau khi cập nhật

- Xem phiên bản: cd /d/CodeGym_project/HOMESTAY/HOMESTAY rồi chạy node -p "require('./package.json').version" → 1.8.3.
- Tài khoản khách bình thường: xem và lưu hồ sơ, xem booking của mình; không truy cập tài khoản quản lý.
- Tài khoản khách bị bỏ quyền sửa: nút Lưu hồ sơ bị khóa; gửi API trực tiếp cũng bị chặn.
- Booking đã thu đủ và đóng: tra cứu công khai, tài khoản khách và trang thanh toán đều hiển thị số còn thanh toán 0đ.
- Hủy một booking thử theo chính sách được hoàn 100%: email ghi đúng tỷ lệ, số tiền và lý do. Không dùng booking thật đang cần giữ để thử hủy.
- Lễ tân vẫn cấp/tải/mở hóa đơn; OCR/QR và các checkbox xác nhận vẫn hoạt động.

Có thể chạy kiểm thử bằng: npx --yes --package=node@22 -c "node --test test/*.test.js". Hai bài tích hợp MongoDB QA cần database QA riêng; không trỏ các biến QA vào database đang sử dụng.

## 4. Phạm vi xác minh

Đã chạy kiểm thử tự động trên dữ liệu giả lập riêng và trình duyệt Chromium. Không kết nối MongoDB Atlas thật, không gửi email thật, không tạo giao dịch payOS thật và không thay đổi dịch vụ đang chạy trên máy Windows của bạn. Chi tiết nằm trong docs/QA_HOTFIX_1_8_3.txt.
