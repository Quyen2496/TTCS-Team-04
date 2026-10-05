# HOMESTAY v1.1 — 50 phòng, ảnh mẫu và phân trang

Dựa trên `TTCS-Team-04-develop.zip` và đối chiếu `TTCS-Team-04-main.zip` gửi ngày 04/10/2026. Thư mục này không nối remote GitHub của nhóm. Database mặc định riêng: `HOMESTAY_QUY_TEST`; cổng riêng: **3001**.

## Cập nhật từ bản bạn đang chạy

1. Dừng server bằng **Ctrl+C**.
2. Giải nén ZIP mới. Chép **nội dung thư mục HOMESTAY bên trong ZIP** vào đúng thư mục đang chứa `package.json` của bản cũ và đồng ý thay các tệp mã nguồn.
3. Giữ lại `.env`, thư mục `data` và `node_modules` của bạn. ZIP không chứa `.env` hay dữ liệu nên thao tác chép tệp không xoá chúng.
4. Trong Git Bash ở thư mục có `package.json`, chạy:

```bash
npm run update-data
npm start
```

Nếu trước đó thư mục của bạn bị lồng `HOMESTAY/HOMESTAY`, cập nhật vào **thư mục trong cùng có `package.json`**, không chép thêm một lớp thư mục.

`update-data` bổ sung bộ phòng mẫu một lần, giữ ID/phòng cũ, booking, tài khoản, cọc, cấu hình giá và trạng thái phòng. Chạy lại không nhân đôi. Khi dùng file demo, chương trình tạo bản sao lưu trong `data` trước lần nâng cấp đầu tiên. Không dùng `--reset` khi bạn muốn giữ dữ liệu.

Nếu bạn đã tự thêm phòng, chương trình giữ cả phòng đó; tổng có thể nhiều hơn 50. Với bản mới hoặc bản cũ 12 phòng chưa tự thêm, tổng sau nâng cấp là 50.

## Bổ sung ở v1.1

- **50 phòng mẫu / 10 loại**: đơn, đôi, gia đình, Deluxe ban công, Suite, Studio, Bungalow, Loft, Twin và phòng nhóm.
- 10 ảnh chụp mẫu được đóng gói tại `public/assets/rooms`; không phụ thuộc kết nối mạng khi mở trang. Các phòng cùng loại chia sẻ ảnh mẫu; đây không phải 50 ảnh thực tế riêng của một cơ sở lưu trú.
- Nhấn **Xem ảnh** để mở gallery; nhấn **Tiện nghi & ảnh** để xem đầy đủ tiện nghi.
- Trang giới thiệu giữ 3 loại phòng nổi bật; trang khám phá hiển thị 6 phòng/trang ở desktop và 3 phòng/trang trên màn hình nhỏ. Có tìm số phòng/từ khoá/tiện nghi, lọc loại và sắp xếp.
- Kết quả tìm phòng booking phân trang 6 loại/trang ở desktop, 3 loại/trang ở mobile; vẫn đặt theo loại phòng như trước.
- Bảng quản trị mặc định 10 dòng/trang, có thể chọn 20 hoặc 50. Áp dụng phòng, loại phòng, booking, tiện nghi, tài khoản và nhật ký.
- **30 tiện nghi mẫu / 66 sticker**. Khi thêm/sửa tiện nghi, chọn sticker theo nhóm hoặc tìm bằng từ khoá; vẫn có thể nhập biểu tượng riêng.
- Menu sử dụng biểu tượng màu lưu sẵn, không cần font emoji hệ điều hành. Loại phòng có lựa chọn ảnh mẫu; đổi ảnh loại phòng cập nhật những phòng đang dùng chung ảnh đó.

## Chạy bằng Git Bash trên Windows

Cần Node.js 22 trở lên (Node 24 của bạn phù hợp), npm và MongoDB đang chạy trên máy. Giải nén file ZIP để có thư mục `D:\CodeGym_project\HOMESTAY` rồi dán:

```bash
cd /d/CodeGym_project/HOMESTAY
bash scripts/setup.sh --mongo
npm start
```

Mở **http://localhost:3001**. Giữ cửa sổ terminal đang chạy; nhấn `Ctrl+C` để dừng.

Nếu file ZIP nằm trong Downloads và đã có Git Bash với `unzip`, có thể dán toàn bộ:

```bash
mkdir -p /d/CodeGym_project
cd /d/CodeGym_project
unzip -n "$HOME/Downloads/HOMESTAY.zip" -d .
cd HOMESTAY
bash scripts/setup.sh --mongo
npm start
```

`unzip -n` tránh ghi đè các file đã có. Nếu đã có thư mục HOMESTAY từ lần tải trước, giải nén vào thư mục trống trước khi dùng bản mới.

## Chạy ngay khi chưa mở MongoDB

```bash
cd /d/CodeGym_project/HOMESTAY
bash scripts/setup.sh --demo
npm start
```

Chế độ demo vẫn dùng backend thật và ghi dữ liệu vào `data/homestay.json`. Đây là một lựa chọn để test độc lập, **không phải kiểm thử MongoDB**. Dữ liệu hai chế độ tách biệt. Chuyển lại MongoDB bằng `bash scripts/setup.sh --mongo`; dữ liệu MongoDB trước đó được giữ nguyên.

## Tài khoản mẫu

Mật khẩu chung ban đầu: **Quy@123456**.

| Tài khoản | Quyền |
|---|---|
| `admin` | Toàn bộ quản trị |
| `letan` | Phòng, booking, ghi cọc, nhận/trả phòng |
| `baocao` | Tổng quan và báo cáo; không xem CCCD hay thông tin khách trong quản trị |

Trang nhân viên: http://localhost:3001/login.html. JWT có hạn 30 phút. Đổi mật khẩu ở trang Tổng quan. Quản trị viên có thể cấp mật khẩu mới trong mục Tài khoản.

## Các chức năng

| Phân hệ | Có thể thực hiện |
|---|---|
| Khách | Trang giới thiệu, khám phá phòng và tiện nghi, tìm phòng theo ngày/số khách |
| Booking | Tìm phòng → Xem báo giá → Nhập thông tin → Nhận mã booking; giá tính lại ở server |
| Giữ phòng | Chọn một phòng cụ thể cho toàn bộ kỳ ở; giữ chỗ 24 giờ, chống trùng, tự nhả giữ chỗ quá hạn |
| Tra cứu | Mã booking + email; trạng thái, loại phòng, ngày, số đêm, tổng tiền, tiền cọc; chặn sau 10 lần sai/15 phút/IP |
| Lễ tân | Danh sách/tìm booking, xác nhận, ghi cọc, nhận phòng với CCCD/CMND, trả phòng, huỷ và tính tiền hoàn cọc theo snapshot |
| Phòng | Thêm/xoá phòng chưa được dùng; trạng thái sạch trống/bẩn trống/bảo trì; nhận/trả phòng cập nhật đang có khách |
| Loại phòng | Thêm/sửa/xoá khi chưa dùng, sức chứa, giá thường/cuối tuần, gán tiện nghi, ngừng bán |
| Tiện nghi | Thêm/sửa/xoá; kích hoạt/vô hiệu; ngăn xoá tiện nghi đang gán |
| Chính sách | Giờ nhận/trả, phụ thu thêm người, tỷ lệ hoàn cọc; phiên bản mới khi thay đổi |
| Tài khoản | Tạo nhân viên, vai trò, khoá/mở; đổi mật khẩu/cấp mật khẩu mới; mật khẩu băm BCrypt |
| Báo cáo | Theo tháng nhận phòng, số booking/số đêm, giá trị booking, cọc, trạng thái; xuất CSV mở bằng Excel; in/lưu PDF từ trình duyệt |
| Nhật ký | Nhật ký thao tác trong bản kiểm thử |
| Giao diện | Màu sắc/thành phần chung theo mẫu booking; sidebar desktop, hamburger ở màn hình ≤1000px; hỗ trợ Escape và bàn phím |

50 phòng, 10 loại phòng, 30 tiện nghi được tạo khi database chưa có trạng thái. Seed chỉ bổ sung tài khoản còn thiếu và không xoá booking hiện tại. Không có booking mẫu để bạn bắt đầu kiểm thử từ đầu.

Ngày cuối tuần áp dụng **thứ Sáu và thứ Bảy**; ngày trả phòng không tính tiền. Một yêu cầu đặt **một phòng**, 1–30 đêm. Cọc chỉ là số tiền nhân viên ghi nhận; không có kết nối cổng thanh toán. Báo cáo giá trị booking không phải sổ kế toán doanh thu đã thu đủ tiền.

## Kiểm thử nhanh

1. Mở trang khách, tìm phòng từ hôm nay đến ngày mai.
2. Chọn phòng, kiểm tra báo giá và phụ thu, nhập thông tin/email thật của bạn hoặc email thử.
3. Nhận mã booking, tra bằng đúng mã + email; thử sai một trong hai.
4. Đăng nhập `admin`; Lễ tân & booking → Ghi cọc → Xác nhận → Nhận phòng. Nhập CCCD thử **123456789012**.
5. Nhận phòng chỉ thực hiện được khi đã đến ngày nhận, chưa hết kỳ lưu trú và phòng sạch trống.
6. Tra cứu bằng trang khách lần nữa: thấy trạng thái đang ở và số cọc; không thấy CCCD/ghi chú nội bộ.
7. Trả phòng → Quản lý phòng → đổi bẩn trống thành sạch trống.
8. Xem báo cáo tháng hiện tại, tải CSV và in/lưu PDF.
9. Thu hẹp trình duyệt xuống 360px: mở hamburger, chọn menu, đóng bằng Escape hoặc chạm nền.

Kiểm thử tự động (dùng dữ liệu file tạm, không tác động dữ liệu đang test):

```bash
cd /d/CodeGym_project/HOMESTAY
npm test
```

Có thể chạy cùng bộ kiểm thử trên **database MongoDB QA riêng**:

```bash
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/HOMESTAY_QA npm test
```

**Lệnh QA ghi lại trạng thái seed vào database được chỉ định. Chỉ dùng `HOMESTAY_QA`, không trỏ đến database đang sử dụng.**

Khi bạn muốn xoá toàn bộ dữ liệu của riêng bản test để làm lại:

```bash
npm run seed -- --reset
```

`--reset` xoá booking/tài khoản/cấu hình hiện tại của database hoặc file demo đang chọn, rồi tạo lại dữ liệu ban đầu.

## Cấu trúc và các điểm cần biết

- `public/modules/bookings/`: giữ HTML, CSS và JavaScript booking của bản develop; bổ sung shell chung/sidebar.
- `public/css/homestay-ui.css`: CSS chung của bản develop.
- `public/css/shell.css`, `public/js/shell.js`: layout và menu mới.
- `public/index.html`, `rooms.html`, `login.html`, `admin.html`, `modules/lookup/index.html`: trang của bản độc lập.
- `src/domain.js`: giá, tồn phòng, booking, tra cứu, chuyển trạng thái, báo cáo.
- `src/store.js`: lưu MongoDB hoặc file demo; cập nhật nguyên tử.
- `server.js`: API có kiểm tra quyền phía server.
- `.env`: tự tạo secret riêng khi setup; không nằm trong ZIP.
- `docs/KIEM_THU.md`: kết quả và phạm vi xác minh.

Để chạy trên MongoDB cài trực tiếp trên laptop mà không yêu cầu replica set, bản độc lập lưu trạng thái trong **một document** của collection `homestay_state`, dùng revision và compare-and-set cho cập nhật nguyên tử. Hai yêu cầu không thể đồng thời giữ cùng phòng. Cấu trúc này phục vụ test cá nhân; khác với schema nhiều collection ở dự án nhóm và không phải bản thay thế để merge vào develop. Giới hạn document MongoDB 16 MB khiến cách lưu này không dành cho dữ liệu lớn.

Backend nguồn thiếu API tìm/quote và seed dữ liệu; những phần đó đã được bổ sung trong bản này. Một số chức năng nguồn chưa hoàn thiện được triển khai thống nhất lại trong backend riêng. Không triển khai gửi OTP qua email, lưu ảnh phòng/upload, cổng thanh toán hoặc phát hành online. Quên mật khẩu xử lý qua quản trị viên. Không khẳng định đã hoàn thành các tiêu chí trong tài liệu khác chưa được cung cấp trong hai ZIP.

Server chỉ lắng nghe `127.0.0.1` để test trên máy. Nếu bạn đang dùng cổng 3001, sửa `PORT` trong `.env` rồi khởi động lại. Nếu kết nối MongoDB thất bại, mở MongoDB trước hoặc chạy chế độ demo bên trên.

## Nguồn ảnh và sticker

Ảnh mẫu: các tác giả trên Unsplash, theo Unsplash License. Bảng nguồn/tác giả cho từng tệp: `docs/PHOTO_CREDITS.json`. Ảnh chỉ dùng để minh hoạ dữ liệu kiểm thử.

Sticker SVG: **Twemoji**, Twitter và các cộng tác viên / Jdecked, bản 17.0.2. Đồ hoạ được sử dụng nguyên bản theo **CC BY 4.0**: https://creativecommons.org/licenses/by/4.0/. Nguồn: https://github.com/jdecked/twemoji. Ghi nhận tác giả và giấy phép này cần được giữ lại khi chia sẻ mã nguồn.
