# Cập nhật giao diện HOMESTAY v4 — trước Sprint 3

Bản này dựa trên HOMESTAY v2 và lịch giá v3. Tham khảo cách Traveloka đặt tìm kiếm, ảnh lớn, thẻ phòng và hành động đặt phòng; giữ thương hiệu Homestay, ảnh mẫu và dữ liệu của dự án. Không tạo giá khuyến mại, đánh giá hay địa chỉ chưa có dữ liệu.

## Góp ý đã xử lý

| Góp ý | Kết quả |
| --- | --- |
| Trang giới thiệu không sidebar, menu trên | Header khách mới; burger trên điện thoại |
| Chi tiết tách riêng | `room-detail.html`: gallery, tiện nghi, sức chứa, diện tích, giá và chính sách |
| Khách không phân trang, chia nhóm | Nhóm theo sức chứa tiêu chuẩn; tìm booking hiển thị đầy đủ kết quả |
| Bỏ tag nhân viên trên đầu | Đăng nhập quản lý chuyển xuống footer |
| Tiện nghi & ảnh → Xem chi tiết | Các thẻ phòng dẫn đến trang chi tiết |
| Giữ chỗ thành công, chờ xử lý/liên hệ | Hiển thị mã, thông tin khách, hạn giữ chỗ; hiển thị liên hệ cơ sở khi đã cấu hình |
| Sidebar ngắn hơn | Gộp Phòng / loại phòng / tiện nghi; menu theo vai trò |
| Thêm phòng đầy đủ | Tạo và sửa số phòng, loại, tầng, trạng thái, ảnh mẫu và ghi chú nội bộ; giá/tiện nghi kế thừa loại phòng |
| Phần chủ homestay | Dashboard Chủ homestay cho admin: số liệu và lối vào xử lý; không thêm vai trò mới |
| Gộp các mục dư | Danh mục phòng chung nhóm, tab chuyển chức năng |
| Giá & chính sách | Giữ lịch giá v3; bổ sung thời hạn giữ chỗ và thông tin liên hệ |
| Báo cáo rõ hơn | Số liệu tổng, thanh trạng thái, thống kê theo loại phòng; bảng riêng trạng thái phân trang |
| Phân quyền và phân trang | Bảng quyền tham khảo; quyền được kiểm tra ở API; trang hiện tại/đầu/cuối bị disabled đúng |
| Thông tin khách đầy đủ | Danh sách booking thêm số điện thoại, email và số khách; chi tiết và thông tin riêng theo quyền |

Thời hạn **giữ chỗ chờ xác nhận** mặc định 24 giờ, có thể cấu hình 1–168 giờ ở Giá & chính sách. Booking đã tạo giữ hạn cũ. Quy tắc này không tự thu/hoàn tiền cọc: tiền cọc vẫn do nhân sự ghi nhận và áp dụng chính sách hoàn của booking. Chưa thêm cổng thanh toán hay tự gửi email/SMS.

## Bốn repo được đọc và áp dụng

- [Impeccable](https://github.com/pbakaus/impeccable): README, skill và hướng dẫn new-work/craft-floor. Áp dụng hệ thống màu/font, phân cấp, khả năng truy cập và vòng kiểm tra giao diện. Tạo PRODUCT.md / DESIGN.md từ nguồn dự án.
- [Matt Pocock skills](https://github.com/mattpocock/skills): README và codebase-design. Đọc luồng Store → domain → API → frontend, tái sử dụng shell/phân trang, bổ sung API sửa phòng cùng kiểm tra quyền.
- [Ponytail](https://github.com/DietrichGebert/ponytail): README và SKILL.md. Kiểm tra mục tiêu, sửa dự án hiện có rồi xác minh luồng sử dụng và bàn giao.
- [Prompt Optimizer](https://github.com/linshenkx/prompt-optimizer): README và template tối ưu prompt chuyên nghiệp. Đây là ứng dụng, không có skill SKILL.md để cài như ba repo trên; dùng cách làm rõ mục tiêu/ràng buộc thành tiêu chí kiểm tra từ ảnh góp ý.

Các hướng dẫn phù hợp đã được áp dụng cho bản này; không cài dịch vụ bên ngoài hoặc chạy prompt optimizer. Không sao chép logo, thương hiệu hay hình ảnh Traveloka.

## Cài bản cập nhật

Tải HOMESTAY_UI_V4.zip vào `D:\CodeGym_project\HOMESTAY`, dừng server bằng Ctrl+C. Trong Git Bash:

```bash
(
set -e
cd /d/CodeGym_project/HOMESTAY
unzip -o HOMESTAY_UI_V4.zip
bash HOMESTAY_UI_V4/apply-update.sh ./HOMESTAY
cd HOMESTAY
npm test
npm run update-data
npm start
)
```

Nếu không có unzip, giải nén bằng Windows vào thư mục ngoài này, sau đó chạy từ lệnh `bash` trở xuống. Đích phải là thư mục chứa `package.json` của HOMESTAY đang chạy, không chép thêm lớp thư mục.

Trình cài chỉ chép tệp trong manifest. `.env`, `data`, `node_modules` không nằm trong payload. Mỗi lần thay đổi tạo bản sao mã nguồn cũ trong `backups/ui-v4-...`; đường dẫn được in sau khi cài. Các chỉnh sửa mã nguồn trên máy bạn được sao lưu trước khi giao diện mới thay thế. Không cần cài thêm dependency npm.

`npm run update-data` chỉ nâng dữ liệu mẫu/lịch giá còn thiếu, không reset booking hoặc tài khoản. Nếu đã cập nhật v3 thì nâng dữ liệu là idempotent. Nếu Atlas đang lỗi kết nối, lệnh này sẽ báo lỗi và chuỗi lệnh dừng; bản v4 không sửa cấu hình Atlas. Không dùng `--reset` để cập nhật.

Hoàn tác chỉ mã nguồn bằng:

```bash
node HOMESTAY_UI_V4/restore-update.cjs ./HOMESTAY ./HOMESTAY/backups/ui-v4-THOI_DIEM
```

Thay THOI_DIEM bằng tên thư mục sao lưu đã in; dừng server trước khi hoàn tác. Công cụ hoàn tác kiểm tra mã nguồn vẫn đúng bản vừa cài trước khi ghi lại. Nó không hoàn tác dữ liệu hoặc thay đổi do bạn thực hiện sau này.

## Kiểm chứng

- 40/40 bài kiểm thử Node pass: 20 nghiệp vụ, 16 lịch giá, 4 kiểm thử API v4.
- Kiểm thử mới: tạo/sửa phòng, ảnh sai/số phòng trùng, chặn vai trò không được phép, chặn đổi loại hoặc bảo trì phòng đang được giữ, cấu hình thời hạn giữ chỗ và snapshot, liên hệ hợp lệ, báo cáo tổng hợp không lộ thông tin khách.
- Chromium ở 1440 và 390 px: trang chủ, khám phá, chi tiết, tìm → báo giá → tạo booking thành công, đăng nhập admin, chủ homestay, danh mục, booking/khách, tài khoản/quyền, báo cáo, chính sách và thêm phòng qua dialog. Không ghi nhận lỗi JavaScript/tràn ngang trong luồng kiểm tra.
- Kiểm tra bổ sung 360 và 768 px ở trang khách và tám màn hình quản trị: không tràn ngang toàn trang; bảng có vùng cuộn riêng. Menu khách/quản trị đóng bằng Escape; menu quản trị mở đúng ở 360 px.
- Kiểm thử dùng file dữ liệu cô lập. Chưa xác minh bản này trên MongoDB Atlas thật.
- Trình cài thử trên bản v2 và v3, cài lại không ghi đè khi không thay đổi, sao lưu/hoàn tác giữ nguyên cấu hình và dữ liệu.

Ảnh giao diện và JSON kết quả nằm trong docs/previews-v4. Ảnh/phòng/booking trong hình là dữ liệu kiểm thử.
