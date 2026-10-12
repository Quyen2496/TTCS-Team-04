# Cập nhật HOMESTAY v5 trên máy Quý

1. Tải `HOMESTAY_V5_5_ROLES.zip`, giải nén tại `D:\CodeGym_project` để có `D:\CodeGym_project\HOMESTAY_V5`.
2. Dừng server HOMESTAY bằng Ctrl+C.
3. Dán đoạn sau vào Git Bash. Đích là thư mục đang có `package.json` của Quý:

```bash
cd /d/CodeGym_project/HOMESTAY_V5
node apply-update.cjs "/d/CodeGym_project/HOMESTAY/HOMESTAY"
cd /d/CodeGym_project/HOMESTAY/HOMESTAY
npm ci --no-audit --no-fund
npm test
npm run update-data
npm start
```

Gói chỉ ghi các tệp mã nguồn trong manifest. `.env`, cơ sở dữ liệu, ảnh tải lên và thư mục `node_modules` đang dùng được giữ lại; `npm ci` cài lại đúng các dependency trong bản mới, có thêm Nodemailer cho email. Mã nguồn được sao lưu vào `backups/ui-v5-...` trước khi thay.

Nếu đang dùng Node 22 để khắc phục kết nối Atlas:

```bash
cd /d/CodeGym_project/HOMESTAY/HOMESTAY
npx --yes --package=node@22 -c "node scripts/seed.js && node server.js"
```

## Các trang cần mở

- Trang chủ: http://127.0.0.1:3001/
- Đăng nhập: http://127.0.0.1:3001/login.html
- Đăng ký Khách: http://127.0.0.1:3001/register.html
- Tài khoản/booking của Khách: http://127.0.0.1:3001/account.html
- Quản lý: http://127.0.0.1:3001/admin.html

Tài khoản tạo mới nếu chưa có: `admin`, `chunha`, `letan`, `baocao` — `Quy@123456`. Tài khoản đã có vẫn dùng mật khẩu cũ. Đăng nhập lại sau cập nhật để menu nhận quyền mới.

## Tải ảnh và cấp quyền

1. Admin mở **Homestay cộng tác** để tạo hoặc sửa cơ sở.
2. Mở **Tài khoản & quyền**, tạo Chủ homestay/Lễ tân/Báo cáo, chọn cơ sở và các chức năng.
3. Chủ homestay chọn cơ sở, vào Homestay hoặc Loại phòng/Phòng, chọn **Sửa / tải ảnh**, chọn tệp và Lưu.
4. Chọn ảnh bìa hoặc gỡ ảnh trong hộp sửa. Ảnh loại phòng cập nhật các phòng đang dùng bộ ảnh chung.
5. Mở **Booking & khách** và **Khách hàng** để xem thông tin liên hệ, địa chỉ, quốc tịch đã được khách cung cấp.

## Bật quên mật khẩu qua email

Mở `.env` bằng VS Code và thêm/điền:

```dotenv
APP_URL=http://localhost:3001
SMTP_HOST=dia-chi-smtp-cua-ban
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=email-gui
SMTP_PASS=mat-khau-smtp-hoac-mat-khau-ung-dung
MAIL_FROM=email-gui
```

Khởi động lại server sau khi sửa. Nếu dùng SMTPS cổng 465 thì đặt `SMTP_SECURE=true`. `APP_URL` phải là URL thực người nhận mở được (địa chỉ tunnel nếu truy cập ngoài máy). Email tài khoản nhân viên cần là email nhận thư thật, sửa trong **Tài khoản & quyền**.

SMTP chưa được cấu hình sẽ báo lỗi rõ trên màn hình. Các kiểm thử dùng email giả lập để kiểm chứng hạn 30 phút, dùng một lần và giới hạn 3 lần/giờ.

## Chạy một bản mới để test riêng

Thư mục `files` trong gói là mã nguồn đầy đủ. Sao chép nó sang một thư mục mới, mở Git Bash tại đó và chạy:

```bash
bash scripts/setup.sh --demo
npm start
```

Không cần MongoDB ở chế độ demo. Nếu cổng 3001 đang được dùng, đổi `PORT` trong `.env` của bản riêng.

## Hoàn tác mã nguồn

Đường dẫn sao lưu được in khi cập nhật. Dừng server rồi chạy:

```bash
node "/d/CodeGym_project/HOMESTAY_V5/restore-update.cjs" "/d/CodeGym_project/HOMESTAY/HOMESTAY" "/d/CodeGym_project/HOMESTAY/HOMESTAY/backups/ui-v5-TEN_THU_MUC_THUC_TE"
```

Sau đó chạy `npm ci` ở thư mục dự án. Hoàn tác chỉ phục hồi mã nguồn; không lùi dữ liệu đã được nâng cấp hoặc các booking mới. Nếu mã đã thay đổi sau cập nhật, công cụ dừng để giữ các thay đổi đó.

Lưu ý bản 1.3.1: luồng liên kết 30 phút phía trên đã được thay bằng mã 6 số/10 phút. Xem EMAIL_VA_HO_SO.md; liên kết reset của bản cũ cần yêu cầu lại mã.
