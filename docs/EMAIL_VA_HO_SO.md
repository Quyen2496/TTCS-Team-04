# Cập nhật hồ sơ khách và mã email

## Thay đổi

- Nút Hiện / Ẩn mật khẩu trên đăng nhập, đăng ký, đặt lại, đổi mật khẩu và các form tài khoản quản trị; nút không gửi form.
- Nhận phòng hiển thị loại/phòng, ngày đến/đi, số đêm/khách, tổng tiền, cọc và số tiền còn lại. Hồ sơ khách đứng tên có điện thoại, email, ngày sinh, giới tính, quốc tịch, địa chỉ, loại và số giấy tờ (CCCD/CMND hoặc hộ chiếu).
- Khách đi cùng có họ tên và các trường ngày sinh, giới tính, quốc tịch, giấy tờ, địa chỉ. Tên khách đứng tên, giấy tờ khách đứng tên và đủ tên khách đi cùng vẫn bắt buộc. Các trường bổ sung có thể để trống khi khách chưa cung cấp; trẻ em không bắt buộc số giấy tờ.
- Danh sách khách có nút Chi tiết mở hồ sơ và lịch sử từng booking: cơ sở, phòng, ngày đến/đi, trạng thái, tổng/cọc, nhận/trả thực tế, khách đi cùng. Booking tại quầy không có email không bị gom thành một khách. Chỉ tài khoản có quyền khách hàng mới xem được hồ sơ và giấy tờ.
- Quên mật khẩu: nhập email → gửi mã 6 số → nhập mã và mật khẩu mới. Mã dùng một lần, hết hạn 10 phút, tối đa 5 lần sai và 3 lần gửi mỗi giờ/email; mã mới vô hiệu mã cũ. Mã chỉ lưu dưới dạng hash trong database, không trả về giao diện hoặc log; đổi mật khẩu thu hồi các phiên cũ.

## Cấu hình gửi thư thật

Cập nhật giữ nguyên `.env` hiện có. Vì vậy cần tự bổ sung cấu hình gửi email trong **file `.env` tại thư mục chạy server**, không chỉ sửa `.env.example`.

Ví dụ dùng một tài khoản Gmail làm người gửi (email khách nhận có thể là Gmail hoặc email trường):

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=email-gui-cua-ban@gmail.com
SMTP_PASS=mat-khau-ung-dung-cua-email-gui
MAIL_FROM="Homestay Việt <email-gui-cua-ban@gmail.com>"
```

Gmail cần bật xác minh hai bước và tạo **mật khẩu ứng dụng**, không điền mật khẩu đăng nhập Google thông thường. Nếu tài khoản tổ chức không cho phép tạo mật khẩu ứng dụng, dùng SMTP được quản trị viên của tổ chức cung cấp hoặc một tài khoản gửi khác. Không gửi `.env` hay mật khẩu qua chat.

Nhà cung cấp khác: dùng SMTP_HOST/USER/PASS do họ cung cấp; cổng 465 dùng `SMTP_SECURE=true`, cổng 587 dùng `false` (ứng dụng vẫn bắt buộc nâng cấp STARTTLS). Không tắt kiểm tra chứng chỉ TLS.

Dừng server cũ, kiểm tra tại đúng thư mục HOMESTAY:

```bash
npx --yes --package=node@22 -c "node scripts/check-email.js"
```

Lệnh trên chỉ kiểm tra kết nối/đăng nhập. Muốn gửi một thư kiểm tra tới email của bạn:

```bash
npx --yes --package=node@22 -c "node scripts/check-email.js --to email-nhan-cua-ban@example.com"
```

Được SMTP chấp nhận chưa đảm bảo thư nằm trong Inbox; kiểm tra Spam và cấu hình người gửi của nhà cung cấp. Chạy lại server sau khi chỉnh `.env`.

## Email tài khoản và lỗi đăng nhập

Vào Tài khoản & phân quyền → Sửa tài khoản, đặt email thật mà người dùng nhận được thư. Quên mật khẩu chỉ gửi tới email đã lưu trên một tài khoản đang hoạt động; không gửi tới email bất kỳ. User mẫu có thể mang email thử nghiệm `@homestay.test`, cần đổi sang email thật trước. Thông báo gửi mã giống nhau cho email có/không có tài khoản để tránh tiết lộ tài khoản.

Seed giữ nguyên mật khẩu các tài khoản đã có. `letan / Quy@123456` chỉ đúng nếu tài khoản vừa được tạo bằng seed và chưa đổi mật khẩu. Nếu mật khẩu cũ không đúng, dùng mã email sau khi đặt email thật hoặc nhờ Admin cấp lại mật khẩu qua giao diện. Bản cập nhật không tự ghi đè mật khẩu của bạn.

Lỗi SMTP chưa cấu hình/đăng nhập bị từ chối/kết nối thất bại được báo rõ trên màn hình, không còn bị che thành “Lỗi máy chủ”. Mã chưa gửi được sẽ bị xóa và yêu cầu thất bại không tiêu hao lượt gửi.

## Kiểm chứng và giới hạn

Kiểm thử API dùng hộp thư giả lập để xác nhận nội dung mã, hết hạn, giới hạn nhập sai, gửi lại, sử dụng một lần, xử lý lỗi SMTP và thu hồi phiên. Giao diện kiểm tra ở desktop và điện thoại. Chưa có thông tin đăng nhập SMTP của người dùng nên không xác nhận được email tới hộp thư thật trên máy người dùng; dùng lệnh kiểm tra trên để xác minh.

Nguồn cấu hình: https://nodemailer.com/smtp và https://support.google.com/accounts/answer/185833.

## Thiết lập nhanh từ bản 1.3.2

Nếu màn hình báo chưa cấu hình email gửi mã, xem [THIET_LAP_EMAIL.md](THIET_LAP_EMAIL.md). Lệnh `bash scripts/setup-email.sh` nhập mật khẩu ứng dụng kín, kiểm tra gửi thư và lưu .env tự động sau khi SMTP nhận thư thử.
