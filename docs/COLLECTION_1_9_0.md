# HOMESTAY 1.9.0 — bản đầy đủ để giữ làm bản chính

Bản này bao gồm các chức năng và bản sửa tới 1.8.4: phân quyền, đặt phòng, payOS, nhận phòng/đọc giấy tờ, quyết toán, hoá đơn, email, báo cáo, sao lưu, AI. Bổ sung bộ danh mục lớn và các trang khám phá cơ sở/phòng. Không cần Docker hoặc VPS.

## Nội dung mới

- Làm mới hai cơ sở đầu tiên, thêm tám cơ sở; tổng cộng mười homestay khi bắt đầu từ hai cơ sở cũ.
- Thái Nguyên, Đà Lạt, Sa Pa, Ninh Bình, Hội An, Đà Nẵng, Quy Nhơn, Phú Quốc, Vũng Tàu, Cần Thơ.
- Mỗi cơ sở có ít nhất mười loại phòng. Mỗi loại có từ ba đến năm phòng vật lý; số phòng không trùng trong cùng cơ sở.
- Danh mục không có dữ liệu cũ tạo 400 phòng. Với 50 phòng gốc của HOMESTAY được giữ lại, bộ kiểm thử nâng cấp có 410 phòng. Nếu có cơ sở/loại phòng riêng ngoài bộ mẫu, chúng được giữ lại nên tổng có thể cao hơn.
- Tên, vị trí, giới thiệu, diện tích, bố trí giường, sức chứa, giá thường/cuối tuần/sự kiện, tiện nghi và nội quy riêng theo cơ sở.
- Trang riêng từng homestay; bộ lọc điểm đến; tìm phòng không dấu; phân trang 12 loại/trang; thư viện ảnh và giao diện điện thoại.
- 50 ảnh minh hoạ có nguồn, kèm 50 ảnh thu nhỏ WebP nằm sẵn trong gói; không cần tải ảnh từ website bên ngoài khi khách truy cập. Ảnh minh hoạ được sử dụng lại có chọn lọc giữa các loại phòng; đây không phải 100 bộ ảnh chụp độc lập.

## Cơ sở và ảnh mẫu

Đây là các cơ sở hư cấu dùng để học tập, kiểm thử và demo quy trình đặt phòng. Giá và địa chỉ là dữ liệu minh hoạ, không phải báo giá/địa chỉ xác minh của đơn vị lưu trú thật. Không tạo đánh giá, điểm sao, lượt khách giả hoặc số điện thoại của người khác. Ảnh Unsplash là hình minh hoạ phong cách, có thể khác bố trí giường/kiến trúc thật; xem nguồn tại PHOTO_CREDITS_COLLECTION_1_9_0.json. Thay bằng ảnh thực tế đã được chủ cơ sở cho phép trước khi vận hành thật.

## Cập nhật vào thư mục bạn đang chạy

1. Trong cửa sổ chạy server, nhấn Ctrl+C và chờ về dấu nhắc. Để Cloudflare Tunnel tiếp tục chạy cũng được.
2. Giải nén ZIP thành D:\CodeGym_project\HOMESTAY_FINAL_1_9_0. Thư mục cần có apply-update.cjs, CAP_NHAT_GIT_BASH.sh và HOMESTAY.
3. Mở Git Bash, chạy:

```bash
cd "/d/CodeGym_project/HOMESTAY_FINAL_1_9_0"
bash CAP_NHAT_GIT_BASH.sh "/d/CodeGym_project/HOMESTAY/HOMESTAY"
```

Trình cập nhật dùng Node 22, kiểm tra các tệp, sao lưu mã cũ, cài dependency theo lockfile, xem trước và sao lưu dữ liệu mã hoá trước khi áp dụng danh mục. Khi thành công sẽ khởi động server. Truy cập http://localhost:3001 hoặc tên miền Cloudflare đang dùng; nhấn Ctrl+F5 nếu trình duyệt còn giữ giao diện cũ.

Nếu thư mục giải nén bị lồng hai lớp, mở lớp trong có CAP_NHAT_GIT_BASH.sh rồi chọn Git Bash Here và chạy lệnh bash ở trên.

Các bước thủ công tương đương, khi đang đứng tại thư mục gói cập nhật:

```bash
npx --yes --package=node@22 node apply-update.cjs "D:/CodeGym_project/HOMESTAY/HOMESTAY"
cd "/d/CodeGym_project/HOMESTAY/HOMESTAY"
npm ci --no-audit --no-fund
npx --yes --package=node@22 node scripts/update-collection.js --preview
npx --yes --package=node@22 node scripts/update-collection.js
npx --yes --package=node@22 node server.js
```

Giữ nguyên thư mục đang chạy; không chép thư mục HOMESTAY mới đè thủ công lên dữ liệu cũ. Gói mã nguồn không chứa .env thật, tài khoản, dữ liệu khách hoặc ảnh bạn tải lên.

## Cơ chế bảo toàn dữ liệu

- Giữ nguyên ID của hai cơ sở cũ, các loại phòng và các phòng được tái sử dụng; sửa tên/số phòng, ảnh và nội dung danh mục theo yêu cầu.
- Giữ booking, lịch sử giá đã chốt, giao dịch/cọc, hoá đơn, tài khoản, mật khẩu, quyền nhân viên và cấu hình thanh toán cũ. Booking cũ giữ tên phòng/cơ sở trong snapshot tại thời điểm đặt; danh mục hiện hành dùng tên mới.
- Không tự mở rộng phạm vi của nhân viên. Admin có thể chọn cơ sở mới trong trang Tài khoản để phân công; lễ tân/chủ nhà chỉ xem cơ sở được cấp.
- Cơ sở mới mặc định chưa bật nhận cọc. Admin chọn từng homestay, cấu hình tài khoản nhận tiền/kênh payOS đúng cơ sở rồi mới bật. Kênh payOS gắn ID cơ sở cũ vẫn giữ nguyên.
- Không xoá ảnh upload cũ. Ảnh đại diện/bộ ảnh của danh mục được thay theo yêu cầu; tệp upload vẫn nằm nguyên để dùng lại khi cần.
- Không tự xoá phòng nếu một loại có hơn năm phòng; dừng và báo tên loại cần rà soát. Không tự sửa giá lịch riêng đang xung đột với giá cơ bản mới.
- Chạy lại cập nhật không nhân bản và không ghi đè chỉnh sửa sau lần cập nhật thành công.
- Sao lưu mã: backups/local-update-…/files. Sao lưu dữ liệu: backups/catalog-1-9-0/<thời điểm>/*.hsbackup, mã hoá bằng BACKUP_KEY hoặc JWT_SECRET hiện có, cần tối thiểu 32 ký tự. Lưu khoá cũ để đọc được bản sao lưu.
- Danh mục chỉ thay đổi sau khi bản sao lưu dữ liệu được ghi và kiểm tra thành công. MongoDB dùng transaction của hệ thống hiện có.

## Kiểm tra sau khi cập nhật

- Admin → Homestay: kiểm tra mười cơ sở và ảnh đại diện.
- Admin → Loại phòng/Phòng: chọn từng cơ sở, kiểm tra ít nhất mười loại và 3–5 phòng/loại.
- Mở trang Homestay, lọc điểm đến, xem cơ sở, chọn ngày, xem phòng và báo giá.
- Thử tài khoản lễ tân/chủ nhà: chỉ thấy cơ sở được phân công; admin phân thêm nếu cần.
- Xem lại một booking/hoá đơn cũ, không tạo giao dịch thanh toán thật chỉ để kiểm tra giao diện.
- npm test chạy toàn bộ bộ kiểm thử dữ liệu giả. Không thực hiện thanh toán hoặc gửi email thật trong kiểm thử tự động.

## Bật / tắt về sau

Tắt server bằng Ctrl+C. Khi bật lại, mở Git Bash:

```bash
cd "/d/CodeGym_project/HOMESTAY/HOMESTAY"
npx --yes --package=node@22 node server.js
```

Không cần chạy lại trình cập nhật mỗi lần bật máy. Cloudflare Tunnel cần đang chạy để truy cập từ bên ngoài; nếu đã cài dịch vụ tự khởi động thì kiểm tra trạng thái dịch vụ sau khi bật máy.

## Cài riêng để thử, không đụng bản đang dùng

Dùng thư mục HOMESTAY nằm trong gói ZIP, chạy npm ci và bash scripts/setup.sh --demo, sau đó npm run update:collection, npm start. Đổi PORT trong .env nếu bản đang dùng cũng chạy cổng 3001. Đây là môi trường mới với tài khoản demo, không thay thế cấu hình tài khoản đang dùng ở bản chính.

## Những bản cũ có thể dọn sau khi kiểm tra

Sau khi bản 1.9.0 chạy tốt, bạn có thể xoá các ZIP cập nhật 1.7.x, 1.8.0–1.8.4 và thư mục giải nén chỉ chứa bộ cài cũ. Bản 1.9.0 này đã kèm mã nguồn đầy đủ; không cần giữ chuỗi ZIP vá cũ để cài lại mã nguồn.

Giữ thư mục đang chạy D:\CodeGym_project\HOMESTAY\HOMESTAY, .env hiện dùng, data, public/assets/uploads và backups. ZIP mã nguồn không thay thế bản sao dữ liệu và cấu hình riêng của bạn. Nên giữ ít nhất một bản sao hoạt động tốt trước khi cập nhật. Không có thao tác xoá bản cũ tự động trong gói này.
