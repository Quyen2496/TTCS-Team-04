# Thiết lập gửi mã email — HOMESTAY 1.3.2

## Vì sao hai địa chỉ email đều chưa nhận được mã?

Thông báo “Chưa cấu hình email gửi mã” có nghĩa máy đang chạy HOMESTAY chưa có **tài khoản gửi thư** trong `.env`. Việc nhập Gmail hay email trường ở trang Quên mật khẩu chỉ xác định **người nhận**, không tự tạo tài khoản SMTP gửi thư.

Cần hai việc riêng:

1. Cấu hình một email gửi có thể đăng nhập SMTP.
2. Đặt email thật trên tài khoản HOMESTAY cần khôi phục. Khi nhập email đó ở Quên mật khẩu, mã sẽ gửi tới người sở hữu tài khoản.

## Cách nhanh trong Git Bash

### 1. Tạo mật khẩu ứng dụng trên Google

Dùng Gmail do bạn quản lý. Bật Xác minh 2 bước ở tài khoản Google, rồi mở:

https://myaccount.google.com/apppasswords

Tạo mật khẩu ứng dụng tên HOMESTAY. Nếu không thấy chức năng này, kiểm tra điều kiện tại https://support.google.com/accounts/answer/185833; tài khoản tổ chức có thể bị quản trị viên hạn chế.

Mật khẩu ứng dụng khác mật khẩu đăng nhập Gmail. Nhập trực tiếp trên máy của bạn ở bước sau; không gửi qua chat.

### 2. Chạy bước thiết lập tự động

Sau khi áp dụng gói cập nhật, dán vào Git Bash:

```bash
cd "/d/CodeGym_project/HOMESTAY/HOMESTAY"
bash scripts/setup-email.sh
```

Lần lượt nhập email **gửi** và mật khẩu ứng dụng. Mật khẩu không hiện ký tự khi gõ/dán. Chương trình sẽ:

- Kiểm tra kết nối SMTP và đăng nhập.
- Gửi một thư thử tới chính địa chỉ email gửi vừa nhập.
- Chỉ lưu cấu hình khi máy chủ SMTP chấp nhận thư.
- Giữ cấu hình MongoDB, JWT, DATA_MODE và các biến khác; sao lưu `.env` cũ ở `backups/email`.

Nếu SMTP lỗi, `.env` không đổi. Nếu thông báo file vừa được sửa, chạy lại để tránh ghi đè thay đổi mới. Sau khi thiết lập thành công, kiểm tra Inbox/Spam. Máy chủ nhận thư chưa bảo đảm thư đã nằm trong Inbox.

### 3. Đặt đúng email trên tài khoản HOMESTAY

Đăng nhập Admin → **Tài khoản & quyền** → **Sửa tài khoản**.

Tại “Email nhận mã khôi phục”, nhập email thật mà người dùng nhận được thư. Lưu. Không dùng `letan@homestay.test`, `chunha@homestay.test` hoặc các email mẫu để nhận mã.

Một email gửi có thể gửi mã tới nhiều người nhận. Email người nhận có thể là Gmail hoặc email trường; không cần SMTP riêng của từng người nhận. Email khôi phục phải trùng email đã lưu trên tài khoản đang hoạt động.

### 4. Khởi động lại server

Tại cửa sổ đang chạy server, nhấn Ctrl+C rồi chạy:

```bash
cd "/d/CodeGym_project/HOMESTAY/HOMESTAY"
npx --yes --package=node@22 -c "node server.js"
```

Mở http://127.0.0.1:3001/forgot-password.html → nhập email đã lưu trên tài khoản → lấy mã → đặt mật khẩu mới. Kiểm tra thư rác. Không sử dụng mã đã được thay bằng lần gửi mới.

## Nếu không muốn dùng Gmail để gửi

Giữ cách cấu hình SMTP của nhà cung cấp theo `EMAIL_VA_HO_SO.md`. Bước `setup-email.sh` là cách nhanh cho Gmail/Google Workspace, không tự chuyển cấu hình SMTP hiện có nếu bạn không chạy nó. Lệnh `node scripts/check-email.js` hỗ trợ cấu hình SMTP bất kỳ trong `.env`.

## Đổi tên vai trò

Giao diện hiện dùng **Chủ homestay** ở sidebar, tiêu đề tổng quan, chọn vai trò, danh sách tài khoản và các mô tả ảnh/quyền. Mã vai trò vẫn là `owner`, tài khoản đã có tên `chunha` vẫn đăng nhập bằng tên đó; không tạo thêm tài khoản hoặc đổi mật khẩu đang dùng.

Yêu cầu tên được đối chiếu với sheet “2. User Roles”, dòng 7 của bảng backlog được cung cấp. Các yêu cầu trước đó về nhiều cơ sở và vai trò Báo cáo vẫn được giữ theo phạm vi đã thống nhất. Bản này không thay toàn bộ kiến trúc ứng dụng bằng stack trong bảng backlog.

## Kiểm chứng

Luồng thiết lập và luồng API gửi mã đã được kiểm tra với Nodemailer qua một máy chủ SMTP TLS cục bộ: kết nối, đăng nhập, gửi thư thử, gửi mã, nhập mã và đăng nhập bằng mật khẩu mới. Kiểm tra lỗi SMTP không ghi `.env`, giữ cấu hình Mongo/JWT, sao lưu và không ghi đè file được sửa đồng thời.

Chưa có mật khẩu ứng dụng của người dùng nên chưa xác minh được gửi thư qua Gmail thật trên máy người dùng. Bước thiết lập phía trên thực hiện việc này trực tiếp trên máy bạn.

Tài liệu chính thức: https://nodemailer.com/smtp và https://support.google.com/accounts/answer/185833.
