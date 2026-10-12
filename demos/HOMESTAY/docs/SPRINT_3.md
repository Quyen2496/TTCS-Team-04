# HOMESTAY — Sprint 3 đầy đủ

Bản độc lập để Quý kiểm thử, tiếp nối v5. Ngày xây dựng: 10/10/2026. Giữ bố cục v4, font/màu v3. Thực hiện 10 PBI của kế hoạch `HOMESTAY_Phan_ra_Sprint_3_4.docx` (06/10/2026); chưa phải bản merge vào TTCS-Team-04.

## Chức năng đã triển khai

| PBI | Chức năng | Thử ở đâu |
|---|---|---|
| S3-01 | Ghi cọc tiền mặt/chuyển khoản, ngày nhận, mã tham chiếu; sổ cọc bất biến; điều chỉnh bằng bút toán mới; xác nhận và gỡ hạn giữ chỗ | Booking & khách → Ghi cọc / Điều chỉnh cọc / Xác nhận |
| S3-02 | Tồn phòng theo từng đêm; Mongo unique(roomId, stayDate) + transaction; huỷ/hết hạn nhả tồn; kiểm tra lại khi đổi | Luồng đặt công khai / Booking tại quầy; kiểm thử 200 yêu cầu |
| S3-03 | Gán phòng cùng loại, trống toàn kỳ; đổi phòng có lý do/lịch sử; đang ở chỉ sang sạch trống, phòng cũ sang bẩn | Booking & khách → Gán / đổi phòng |
| S3-04 | Đổi ngày/loại/phòng, báo giá từng đêm, chênh lệch, giữ cọc, báo cọc dư; kiểm tra phiên bản và hiệu lực preview; lịch sử old/new/actor/time | Booking & khách → Đổi ngày / loại / Lịch sử đổi |
| S3-05 | Huỷ có lý do, preview tỷ lệ/tiền hoàn từ chính sách snapshot; không huỷ đang ở; chống gửi lặp; lưu nghĩa vụ hoàn thủ công | Booking & khách → Huỷ |
| S3-06 | Chọn phòng cụ thể tại quầy, mặc định ngày nhận hôm nay; email tuỳ chọn; source COUNTER, CONFIRMED, không chờ xác nhận; mã booking và lối tắt nhận phòng | Booking & khách → Booking tại quầy |
| S3-07 | Xác nhận + đã gán + sạch trống; tên/giấy tờ khách đứng tên, đủ tên khách đi cùng; cảnh báo trước 14:00; thời gian thực lưu UTC, hiển thị giờ VN | Booking & khách → Nhận phòng |
| S3-08 | Cảnh báo 14 ngày theo ngày/loại: booking còn hiệu lực > phòng khả dụng; xem booking liên quan; bảo trì giảm khả dụng mà không tự xoá booking | Đầu màn hình Booking & khách |
| S3-09 | Tài khoản Buồng phòng, danh sách chỉ phòng bẩn ưu tiên khách đến hôm nay; một nút báo sạch; báo sự cố kèm khoảng bảo trì; nút ≥44px | Buồng phòng |
| S3-10 | Lưới tối đa 14 ngày; màu kèm chữ, tên/mã khi rê hoặc chạm; mở chi tiết; cuộn trong vùng lưới, giữ nguyên khi đóng hồ sơ | Sơ đồ 14 ngày |

Chỉnh sửa theo ảnh: ô “Số dòng mỗi trang” là 110 × 36px ở desktop/360px; chữ “Tạo tài khoản” thống nhất ở đăng nhập và đăng ký.

## Tài khoản và dữ liệu

Sau `node scripts/seed.js`, tài khoản mẫu: `admin`, `chunha`, `letan`, `baocao`, `buongphong`; mật khẩu mẫu `Quy@123456`. Seed chỉ thêm tài khoản chưa có, không đổi mật khẩu tài khoản hiện có. Khách tự đăng ký trên `/register.html`.

Buồng phòng được bổ sung để đáp ứng S3-09. Không có quyền booking, cọc, giá hoặc báo cáo; chỉ dữ liệu cơ sở được giao. Chủ homestay/lễ tân/admin vẫn theo phạm vi/quyền hiện có. Tài khoản có danh sách quyền tự chỉnh từ v5 chỉ nhận chức năng mới khi Admin cấp tương ứng.

Seed không xoá booking, cấu hình, ảnh thật hay dữ liệu. Số dư cọc v5 được chuyển thành dòng “Số dư trước Sprint 3”, không mất tiền cọc. Booking cũ chưa nhận cần thao tác Gán phòng trước Nhận phòng. Ngày trả không chiếm một đêm. Tiền cọc dư và tiền phải hoàn được ghi nhận, không tự chuyển khoản.

## Kiểm thử thực tế

- 73/73 kiểm thử đạt trong lượt chạy có MongoDB replica set 7.0.14; 20 ca Sprint 3 qua MongoDB, 20 ca nghiệp vụ nền tảng qua MongoDB, 3 ca clock/migration thuần bộ nhớ; các bộ pricing/platform/UI dùng fixture riêng theo thiết kế.
- Node 22.23.3: 72 kiểm thử đạt + 1 ca Mongo-only bỏ qua khi chạy toàn bộ ở chế độ file.
- 200 đặt trực tuyến song song và 200 tại quầy khác mã: đúng 1 thành công, 199 lỗi 409 cho phòng cuối.
- 200 yêu cầu gửi lại cùng mã: 1 booking, tất cả nhận lại cùng kết quả; cả online và tại quầy.
- Ghi trùng trực tiếp vào collection `homestay_room_nights` bị unique index từ chối.
- Kiểm tra ranh giới 13:59/14:00 VN và chính xác 48h/24h tính hoàn.
- 21 màn hình/trạng thái desktop 1440px và mobile 360px, không lỗi JavaScript hoặc tràn ngang toàn trang; nút buồng phòng ≥44px. Log kiểm thử được giữ trong docs; ảnh QA chỉ dùng để kiểm tra nội bộ.
- Lưới 50 phòng ×14 ngày tải API và render khoảng 13ms trong lượt đầu ở môi trường kiểm thử Chromium headless, dữ liệu demo nhỏ. Không phải cam kết tốc độ trên máy/mạng của Quý; log chính thức ghi số đo mới nhất.

Chưa kết nối Atlas của Quý hoặc merge/deploy repo nhóm. SMTP gửi thư booking và quyết toán/hoá đơn thuộc Sprint 4; email quên mật khẩu vẫn dùng SMTP v5. Việc lưu sự kiện có email ở tại quầy chưa có nghĩa đã gửi thư.

## MongoDB và chống trùng

Giữ MongoDB như dự án hiện tại. Store cập nhật state và collection phòng-đêm trong cùng transaction, chỉ mục unique(roomId,stayDate) chặn trùng ở DB. Khi rollback, lịch/tiền/cọc cũ còn nguyên. Giao dịch không ghi lại dữ liệu đối với retry đã có kết quả; lỗi cạnh tranh tạm thời được thử lại có giới hạn.

Cần MongoDB Atlas hoặc replica set; không dùng MongoDB standalone. Chế độ file chỉ dành demo một tiến trình. Nguồn backlog ghi ràng buộc PostgreSQL exclusion; bản này thực hiện phương án tương đương cho Mongo đã nêu ở R0-02. Không tuyên bố đã thực hiện PostgreSQL hoặc thay DB của nhóm. Nhóm/giảng viên vẫn cần duyệt ánh xạ AC khi nghiệm thu repo nhóm.

Tài liệu chính thức: https://www.mongodb.com/docs/drivers/node/current/crud/transactions/ và https://www.mongodb.com/docs/manual/core/index-unique/.

## Thử nhanh sau cập nhật

1. Đặt một booking hôm nay qua trang khách, lưu mã.
2. Đăng nhập `letan`, mở Booking & khách; ghi cọc 100.000 VND, hình thức, ngày nhận, tham chiếu nếu chuyển khoản.
3. Xác nhận → Gán phòng sạch → Nhận phòng (họ tên, giấy tờ, khách đi cùng). Trước 14:00 đánh dấu tiếp tục nhận sớm hoặc bấm Huỷ.
4. Gán / đổi phòng sang phòng sạch khác, nhập lý do; Chi tiết hiển thị lịch sử. Trả phòng → Buồng phòng báo sạch.
5. Tạo Booking tại quầy không email; đọc mã, mở ngay thủ tục nhận phòng.
6. Tạo booking mới ngày tương lai; đổi ngày/loại, xem báo giá và chênh lệch rồi lưu; xem lịch sử; thử huỷ và đối chiếu tiền hoàn.
7. Mở Sơ đồ 14 ngày, chạm mã booking. Buồng phòng báo sự cố phòng trống, lễ tân thấy bảo trì; khi booking vượt khả dụng sẽ có cảnh báo.
8. Thử role Khách/Báo cáo gọi chức năng trái quyền; API từ chối. Chạy `npm test` để thực hiện regression bằng dữ liệu file riêng.

## Bổ sung ngày 11/10/2026

Hồ sơ khách nhận phòng và lịch sử lưu trú đã được mở rộng; mật khẩu có nút Hiện/Ẩn. Quên mật khẩu dùng mã email 6 số thay liên kết cũ. Xem `EMAIL_VA_HO_SO.md` để cấu hình SMTP, kiểm tra gửi thư và các thay đổi chi tiết. Các kết quả 73 ca/21 trạng thái phía trên là bản Sprint 3 ban đầu; kết quả bản mới nằm trong `TEST_EMAIL_PROFILE.txt`.

Bản 1.3.2: dùng tên Chủ homestay trên giao diện và có thiết lập gửi email tự động; xem THIET_LAP_EMAIL.md và TEST_EMAIL_SETUP_1_3_2.txt (82 ca và 22 trạng thái).
