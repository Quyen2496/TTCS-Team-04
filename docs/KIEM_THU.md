# Kết quả kiểm thử HOMESTAY

Ngày: 04/10/2026. Môi trường: Linux, Node.js v24.19.0, npm 11.9.0; trình duyệt Chromium headless. Chưa chạy trực tiếp trên Windows laptop của người dùng.

## Kiểm thử API tự động

Lệnh: `npm test`. Kết quả: **20/20 pass, 0 fail**. Mỗi tình huống chạy Express/API thật và dữ liệu file tạm độc lập; không dùng API mô phỏng. MongoDB chưa được kiểm thử chạy thật trong môi trường hiện tại.

| STT | Tình huống | Kết quả |
|---|---|---|
| 01 | Tìm phòng, giá theo từng đêm, phụ thu khách và tổng tiền | Pass |
| 02 | Tạo booking, replay cùng key sau đổi chính sách, chặn đổi nội dung cùng key | Pass |
| 03 | 20 yêu cầu đồng thời tranh phòng cuối: chỉ một booking được lưu | Pass, với file store |
| 04 | Sai mã/email trả cùng thông báo; chặn sau 10 lần sai | Pass |
| 05 | Khách bị chặn API quản trị; vai trò báo cáo không đọc thông tin booking và không ghi phòng | Pass |
| 06 | Ghi cọc, xác nhận, nhận/trả phòng, dọn phòng; tra cứu không lộ CCCD/ghi chú nội bộ | Pass |
| 07 | Chống sửa giá từ client; giá/chính sách thay đổi trả 409 | Pass |
| 08 | Ngày sai, trên 30 đêm, số khách không hợp lệ, chưa chấp nhận chính sách | Pass |
| 09 | Giữ chỗ hết hạn được nhả khi kiểm tra khả dụng | Pass |
| 10 | Chặn xoá tiện nghi đang gán | Pass |
| 11 | Báo cáo tháng và xuất CSV | Pass |
| 12 | Tối đa 5 booking thành công/giờ/IP; replay không tăng quota | Pass |
| 13 | Huỷ dùng chính sách snapshot, tính hoàn cọc và nhả phòng | Pass |
| 14 | Đổi mật khẩu và ngăn tự khoá quản trị viên đang dùng | Pass |
| 15 | Lưu file và mở lại giữ nguyên booking | Pass |

| 16 | 50 phòng, 10 loại, 30 tiện nghi; phòng nào cũng có đường dẫn ảnh | Pass |
| 17 | Nâng cấp v1 giữ dữ liệu cũ; lặp lại không nhân đôi | Pass |
| 18 | API danh mục 50 phòng có tiện nghi/ảnh, không có dữ liệu riêng tư | Pass |
| 19 | 10 tệp JPEG có thật và API tìm phòng trả ảnh mới | Pass |
| 20 | Sửa ảnh loại phòng cập nhật phòng đang dùng chung ảnh; chặn URL không hợp lệ | Pass |

## Kiểm tra trình duyệt

- Mở trang giới thiệu và tải danh sách loại phòng.
- Tìm phòng → xem báo giá → nhập thông tin → nhận mã booking.
- Tra cứu booking bằng mã/email đúng.
- Đăng nhập admin; mở tổng quan, lễ tân, phòng, loại phòng, tiện nghi, chính sách, báo cáo, tài khoản và nhật ký.
- Xác nhận và nhận phòng từ giao diện lễ tân.
- Kiểm tra chiều ngang các trang chính tại 360px: không tràn ra ngoài viewport; bảng có cuộn riêng.
- Hamburger mở, sidebar vào đúng vị trí và đóng bằng Escape.
- Không có lỗi JavaScript ghi nhận trong luồng trên.

Bổ sung v1.1: kiểm tra trang khám phá có 6 thẻ/trang và trang cuối có 2 thẻ; lọc loại ra 5 phòng; tìm không khớp trả trạng thái rỗng; gallery tải ảnh. Bảng quản trị có 10 dòng/trang, trang cuối 10 dòng, đổi sang 20 dòng hoạt động. Bộ sticker có 66 lựa chọn, tìm “wifi” ra đúng biểu tượng, chọn “Bếp” cập nhật biểu tượng form. Ảnh và sticker được tải từ đường dẫn local.

Ảnh kiểm tra nằm trong `docs/previews/`.

## Phạm vi chưa được xác minh

Đã thử khởi động MongoDB 7.0.14 nhưng môi trường từ chối thao tác hệ thống khi mongod khởi động (`open: Operation not permitted`). Đây không phải một kết quả pass MongoDB. Cần chạy bộ kiểm thử với `TEST_MONGODB_URI` trỏ tới database QA riêng trên laptop để xác minh cả adapter và tính đồng thời MongoDB.

Chưa nghiệm thu tiêu chí tìm 40 phòng/30 đêm trong dưới 2 giây, chưa đo tải lớn, chưa chạy dịch vụ email OTP, chưa test trên điện thoại vật lý. Không đánh đồng kết quả ở file store với kết quả trên MongoDB.

`npm test` không xoá dữ liệu demo đang dùng. Khi đặt `TEST_MONGODB_URI`, fixture sẽ ghi seed vào trạng thái database được chỉ định; chỉ dùng database QA riêng.
