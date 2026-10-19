# HOMESTAY 1.8.0 — Sprint 4

Bản đầy đủ độc lập của Quý, tiếp nối 1.7.1. Đọc yêu cầu từ HOMESTAY_Phan_ra_Sprint_3_4(1).docx ngày 06/10/2026. Giữ phong cách giao diện đã duyệt và các cấu hình hiện có. Không triển khai Docker/VPS trong lần bàn giao này.

## 1. Phạm vi và các quyết định nghiệp vụ

| PBI | Kết quả triển khai | Nơi sử dụng |
|---|---|---|
| S4-01 | Preview từng đêm/phụ thu/cọc/còn thu; kiểm tra phiên bản và báo giá ký; ghi thu phần còn lại và đóng booking một lần, phòng sang trống bẩn | Booking & khách → Trả phòng |
| S4-02 | Nhiều dòng thêm người/thêm giường theo khoảng đêm; đổi đơn giá cần lý do; chặn vượt sức chứa từng đêm; huỷ dòng có lý do, giữ lịch sử | Booking & khách → Phụ thu |
| S4-03 | Cấp số YYYY/NNNNNN trong transaction; một invoice/booking; PDF A4 nhúng font tiếng Việt, tiền bằng chữ, nhiều trang lặp tiêu đề | Booking đã đóng → Hoá đơn PDF; menu Hoá đơn |
| S4-04 | Outbox ghi cùng booking; SMTP sau commit; thư yêu cầu và xác nhận riêng; tối đa 3 retry sau lần đầu, cách 5 phút; trạng thái/lịch sử | Admin → Lịch sử email |
| S4-05 | Nhắc ngày mai lúc 09:00 giờ VN, tối đa một thư nhắc/booking; thư huỷ có lý do/tỷ lệ/tiền phải hoàn | Lịch sử email |
| S4-06 | Công suất <=366 ngày, theo ngày/loại; mẫu số trừ lịch bảo trì; trung bình có trọng số; N/A khi mẫu số 0; CSV UTF-8 BOM | Báo cáo → Công suất phòng |
| S4-07 | Chỉ quyết toán đã đóng, theo ngày trả thực tế VN; tách phòng/phụ thu, ADR, so sánh kỳ trước cùng số ngày; lễ tân chỉ hôm nay | Chủ homestay / Báo cáo / Doanh thu hôm nay |
| S4-08 | Guard API/download; giấy tờ mặc định che, endpoint xem đầy đủ chỉ Chủ homestay/Lễ tân, có audit; các ca deny tự động | API, menu và Nhật ký |
| S4-09 | Bộ dữ liệu riêng 4 loại/20 phòng/30 booking trên 3 tháng, tài khoản vai trò, reset an toàn; hướng dẫn diễn tập | npm run seed:sprint4-demo |
| S4-10 | Backup aggregate DB nhất quán, mã hoá AES-256-GCM, 02:00 VN, giữ 7 bản tốt; restore QA file và MongoDB replica set riêng, có đo thực tế | Admin → Vận hành & sao lưu; CLI |

S4-10 phần máy chủ thật/Compose/reboot-host và nghiệm thu trên URL staging chưa thực hiện, theo yêu cầu chưa dùng Docker/VPS. Không gọi bản chạy local là đã nghiệm thu production. Đây là bản HOMESTAY độc lập, chưa merge vào repo nhóm.

### Chính sách cần chủ homestay kiểm tra

- Giá cuối tuần giữ Thứ Bảy/Chủ nhật như bản Quý đã dùng; không đổi giá đã chốt trong booking.
- Phí trả muộn mặc định 50.000 VND/giờ, thêm giường 100.000 VND/đêm; đây là giá khởi tạo có thể sửa tại Giá & chính sách → Phí phát sinh & trả muộn. Phí thêm người dùng cấu hình hiện có. Các mức chưa nêu cụ thể trong backlog được đặt thành tham số để cơ sở phê duyệt.
- Sau giờ trả trong snapshot (mặc định 12:00), làm tròn số giờ trễ lên. Đúng 18:00 còn tính theo giờ; sau 18:00 thay bằng một đêm theo giá phòng đêm cuối đã đặt, không cộng cả hai. Mỗi lần vượt thêm mốc 18:00 ngày kế tiếp tính thêm một đêm. Không cộng lại phụ thu khách gốc vào phí trả muộn.
- Trả trước NGÀY dự kiến giữ đủ đêm đã đặt, bắt buộc lý do; nhả tồn tương lai. Thu đúng số còn lại mới đóng; nếu dư cọc phải xác nhận nghĩa vụ hoàn. Việc hoàn tiền thực hiện riêng, không có lệnh chuyển tiền ngân hàng tự động.
- Chính sách và sức chứa được chốt cho booking; booking cũ lấy chính sách đang áp dụng khi nâng cấp. Thay cấu hình mới chỉ áp dụng booking mới.
- Booking mới quyết toán sang CLOSED (Đã đóng). COMPLETED của các bản trước vẫn giữ và hiển thị Đã trả phòng. Booking cũ thiếu settlement không bị tự tạo số tiền thu/hoá đơn; báo cáo cảnh báo và chưa cộng các bản thiếu chứng từ này vào doanh thu.
- Số hoá đơn cấp liên tục theo năm trên toàn hệ thống. Counter cùng aggregate state và projection hoá đơn được ghi chung Mongo transaction; projection có unique(year,sequence), unique(bookingId). PDF lỗi vẫn giữ số cũ để tải lại.
- Email nhắc có một key/booking, không gửi nhắc lần hai sau khi đã gửi dù đổi ngày. Job chưa gửi có thể cập nhật khi lịch đổi; reminder kiểm tra lại booking trước gửi. SMTP timeout khi chưa rõ đã nhận chuyển UNCERTAIN, không tự gửi lặp mù. Không cam kết SMTP exactly-once.

## 2. Cập nhật bản đang chạy trên Windows

1. Dừng server bằng Ctrl+C.
2. Giải nén HOMESTAY_SPRINT4_1_8_0.zip vào `D:\CodeGym_project\HOMESTAY_SPRINT4_1_8_0`.
3. Mở Git Bash, chạy:

```bash
(
set -e
hs_package="/d/CodeGym_project/HOMESTAY_SPRINT4_1_8_0"
hs_updater="$(find "$hs_package" -maxdepth 4 -type f -name 'apply-update.cjs' -print -quit)"
if [ -z "$hs_updater" ]; then
  echo "Chưa tìm thấy apply-update.cjs; kiểm tra lại thư mục đã giải nén."
  exit 1
fi
node "$hs_updater" "D:/CodeGym_project/HOMESTAY/HOMESTAY"
cd "/d/CodeGym_project/HOMESTAY/HOMESTAY"
npm ci --no-audit --no-fund
npm run setup:sprint4
npx --yes --package=node@22 -c "node server.js"
)
```

Updater sao lưu các tệp mã nguồn thay đổi vào backups/local-update-*. Không đổi .env, booking, ảnh tải lên hoặc mật khẩu. `setup:sprint4` chỉ bật backup và bổ sung khoá/thư mục backup, sao lưu .env trước khi ghi; giữ nguyên MongoDB/payOS/SMTP/AI. Nếu chưa muốn bật backup, bỏ dòng `npm run setup:sprint4`.

Mở http://localhost:3001, Ctrl+F5 rồi đăng xuất/đăng nhập lại để nạp quyền mới. Tài khoản có danh sách quyền tuỳ chỉnh cần Admin cấp thêm invoices.view/invoices.create/reports.revenue khi phù hợp; không tự nâng quyền tài khoản đã bị giới hạn.

Không chạy lại seed/update-data trên DB đang vận hành để thử Sprint 4. Dữ liệu demo có lệnh riêng bên dưới.

## 3. Chạy toàn bộ quy trình

1. Khách tìm phòng → xem báo giá → nhập thông tin → đồng ý chính sách → đặt, lưu mã. Trạng thái Chờ xác nhận; email thông báo đã nhận yêu cầu nếu có SMTP.
2. Lễ tân mở Booking & khách → ghi cọc/đối soát chuyển khoản hoặc chờ payOS xác thực. Xác nhận booking là bước riêng, không tự xác nhận vì khách bấm Đã chuyển tiền.
3. Xác nhận → gán phòng sạch → nhận phòng. Giấy tờ mặc định che; Chủ homestay/Lễ tân xem đầy đủ có nhật ký. Admin không tự có quyền đọc đầy đủ số giấy tờ.
4. Khi đang ở chọn Phụ thu: thêm giường/người, khoảng đêm, số lượng, đơn giá. Chỉnh đơn giá phải có lý do. Huỷ dòng dùng Huỷ dòng và lý do, không xoá dấu vết.
5. Chọn Trả phòng → xem bảng từng đêm/phụ thu/cọc. Thay thời điểm/lý do thì bấm Xem / cập nhật bảng tiền. Thời điểm nhập là giờ Việt Nam; không cho đóng với giờ trả tương lai.
6. Nếu trả sớm nhập lý do; chọn hình thức tiền mặt/chuyển khoản, mã tham chiếu khi chuyển khoản; số thực thu khớp bảng tiền. Xác nhận nghĩa vụ hoàn nếu có cọc dư.
7. Lưu thành công thấy Đã đóng và phòng trống bẩn. Buồng phòng → Đã sạch.
8. Booking đã đóng → Hoá đơn PDF. Tải A4, mở/in trong trình đọc PDF. Menu Hoá đơn cho tải lại. Chứng từ nội bộ không phải hoá đơn điện tử thuế.
9. Chủ homestay/Báo cáo → chọn doanh thu hoặc công suất, khoảng ngày và loại phòng. Công suất có CSV; lễ tân chỉ có Doanh thu hôm nay.
10. Admin → Lịch sử email để lọc thư; Vận hành & sao lưu xem SMTP, backup và nhật ký.

## 4. Email và payOS

Giữ cấu hình đang dùng. Nếu chưa có SMTP, chạy `bash scripts/setup-email.sh` trên máy và nhập riêng tại terminal. Email booking nằm trong outbox bền vững; SMTP lỗi không làm booking thất bại. Worker chạy mỗi 15 giây; lần thử lại cách 5 phút, tối đa 4 lần gửi gồm lần đầu. Hàng đợi không chứa mật khẩu SMTP. Thư nhắc chạy sau 09:00 ngày trước ngày nhận, theo Asia/Ho_Chi_Minh; thư huỷ chỉ nói số tiền phải hoàn, không nói đã hoàn.

APP_URL/PUBLIC_BASE_URL cần đúng địa chỉ website mà khách truy cập để link trong email và quay về payOS sử dụng được. Để localhost khi thử cùng máy; nếu dùng Cloudflare thì đổi sang URL HTTPS hiện tại. Không bật Cloudflare Access trước endpoint webhook. Tunnel chỉ công khai server đang chạy, không giữ website hoạt động khi laptop tắt.

payOS vẫn cấu hình qua scripts/setup-payos.sh và Tài khoản nhận cọc & QR. Không nhập các key payOS vào các ô ngân hàng của chế độ thủ công. Backend xác minh giao dịch, không tin ảnh chuyển khoản hay redirect. Không cần cấu hình lại nếu bản 1.7.1 của bạn đã hoạt động.

## 5. Dữ liệu nghiệm thu riêng

Dừng server đang chiếm cổng 3001 rồi chạy:

```bash
cd "/d/CodeGym_project/HOMESTAY/HOMESTAY"
npm run seed:sprint4-demo
HOMESTAY_DATA_FILE="$(cygpath -w "$PWD/HOMESTAY_DEMO_SPRINT4/homestay.json")" DATA_MODE=file npx --yes --package=node@22 -c "node server.js"
```

Lệnh seed chỉ tạo/reset tệp trong thư mục HOMESTAY_DEMO… hoặc HOMESTAY_QA…, từ chối ghi đè tệp không có nhãn demo. Có đúng 4 loại, 20 phòng, 30 booking trên 3 tháng theo ngày chạy. Giá có ngày thường, cuối tuần và sự kiện. Tài khoản: admin, chunha, letan, baocao, buongphong; mật khẩu demo `Quy@123456`. Khách tự đăng ký. Đây là dữ liệu giả riêng; không dùng các tài khoản này cho production.

Để quay về dữ liệu thật: dừng server, mở terminal mới và chạy Node 22 bình thường, không đặt HOMESTAY_DATA_FILE/DATA_MODE=file. Các biến ở dòng chạy demo chỉ có hiệu lực cho tiến trình đó.

## 6. Sao lưu và phục hồi

- `npm run setup:sprint4`: bật BACKUP_ENABLED=true, tạo/giữ BACKUP_KEY, ghi BACKUP_DIR và sao lưu .env. Khoá không in ra terminal. Khi chưa có BACKUP_KEY mà JWT_SECRET đủ dài, giữ khoá tương thích với backup trước đó. Sau khi đã tạo BACKUP_KEY, thay JWT_SECRET không thay khoá backup.
- `npm run backup`: sao lưu ngay DB đang cấu hình, in tên bản/tổng số booking/phòng/hoá đơn/tổng tiền và thời gian thực.
- Mỗi ngày lúc 02:00 Asia/Ho_Chi_Minh, nếu máy/server hoạt động, tạo một bản thành công; nếu khởi động muộn sẽ chạy bù trong ngày. Giữ 7 bản thành công, chỉ xoá cũ sau khi bản mới ghi và xác minh xong. Thất bại không xoá bản tốt.
- Dữ liệu DB được đọc từ aggregate state nhất quán; room_nights và projection invoices được dựng lại và kiểm tra khi restore. File .hsbackup nén rồi mã hoá AES-256-GCM, có checksum. Đây là backup dữ liệu ứng dụng, không thay thế mongodump toàn cluster của Atlas.
- Phải giữ BACKUP_KEY riêng an toàn. Mất khoá không đọc được backup. Backup không kèm .env, không kèm thư mục ảnh tải lên. Sao chép riêng `public/assets/uploads` và giữ cấu hình/khoá ở nơi an toàn ngoài laptop để khôi phục đầy đủ.

Phục hồi ra tệp QA mới (không ghi vào dữ liệu đang chạy):

```bash
node scripts/restore-qa.js "DUONG_DAN/BAN_SAO.hsbackup" "D:/CodeGym_project/HOMESTAY_QA_RESTORE/homestay.json"
```

Phục hồi vào MongoDB QA riêng: đặt HOMESTAY_QA_MONGODB_URI trong terminal/môi trường máy, tên DB bắt đầu HOMESTAY_QA… hoặc HOMESTAY_DEMO…, Atlas/replica set, đích chưa có dữ liệu. Không thay MONGODB_URI đang vận hành. Sau đó:

```bash
node scripts/restore-mongo-qa.js "DUONG_DAN/BAN_SAO.hsbackup"
```

CLI từ chối DB vận hành và DB QA đã có dữ liệu; restore state/phòng-đêm/hoá đơn trong transaction, có unique index. In số lượng, tổng tiền và thời gian phục hồi thực tế; xem kết quả kiểm thử đi kèm.

## 7. Kiểm thử và nghiệm thu

`npm test` chạy hồi quy trên tệp cô lập. `npm run test:sprint4` chạy các trường hợp mới; ca Mongo riêng bỏ qua khi không cấu hình URI QA. Khi muốn chạy Mongo thật, dùng SPRINT4_MONGODB_URI trỏ DB HOMESTAY_SPRINT4_QA riêng và SPRINT3_MONGODB_URI cho DB test Sprint 3; tuyệt đối không trỏ DB vận hành. Test Mongo reset dữ liệu trong DB QA được chỉ định.

Kết quả đã chạy: xem docs/KET_QUA_KIEM_THU_SPRINT4.txt. Bằng chứng local/QA không thay thế nghiệm thu staging của nhóm. Chưa dùng Atlas, SMTP, payOS hoặc giao dịch ngân hàng thật của Quý trong môi trường kiểm thử này. Phần SMTP dùng Nodemailer và server TLS test cô lập; phần payOS giữ bộ kiểm thử merchant giả và xác minh chữ ký từ bản trước.

Nguồn kỹ thuật: MongoDB transactions https://www.mongodb.com/docs/drivers/node/current/crud/transactions/ ; unique indexes https://www.mongodb.com/docs/manual/core/index-unique/ ; Nodemailer https://nodemailer.com/smtp và https://nodemailer.com/errors ; PDFKit https://pdfkit.org/docs/text.html .

Bộ kiểm tra trình duyệt tham khảo nằm tại `scripts/verify-sprint4-ui.cjs`. Cần cài Playwright và Chromium riêng nếu muốn chạy; không bắt buộc để sử dụng ứng dụng hoặc `npm test`. Script tự tạo dữ liệu thử trong thư mục tạm, không dùng DB đang vận hành; đầu ra giả lập nằm trong HOMESTAY_QA_UI.
