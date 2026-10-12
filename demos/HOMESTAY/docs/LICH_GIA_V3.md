# Lịch giá và ngày lễ / sự kiện — cập nhật 05/10/2026

## Sử dụng trên giao diện

1. Đăng nhập bằng tài khoản quản trị viên, vào **Giá & chính sách**.
2. Chọn tháng và loại phòng, nhấn **Xem lịch**.
3. Nhấn **Chỉnh bảng giá loại phòng** để đặt bốn giá: ngày thường (thứ Hai–thứ Sáu), thứ Bảy, Chủ nhật, lễ / sự kiện. Các giá cao điểm phải lớn hơn giá ngày thường.
4. Nhấn một ô ngày, hoặc **Đặt ngày / khoảng ngày**, để chỉnh loại ngày:
   - **Lễ / sự kiện**: nhập tên sự kiện và áp dụng giá sự kiện của từng loại phòng.
   - **Ngày thường**: áp dụng giá thường dù ngày đó rơi vào cuối tuần hoặc trước đó là sự kiện.
   - **Thứ Bảy / Chủ nhật**: áp dụng bảng giá tương ứng cho ngày đã chọn.
   - **Tự động theo thứ trong tuần**: gỡ loại ngày và giá riêng để trở về lịch mặc định.
5. Có thể nhập **giá riêng** cho từng loại phòng trong một ngày / khoảng ngày. Để trống thì dùng bảng giá theo loại ngày. Khoảng ngày gồm cả ngày bắt đầu và kết thúc; khi lưu sẽ thay cấu hình của tất cả ngày trong khoảng.

Lịch mẫu có **20/10/2026 — Ngày Phụ nữ Việt Nam**, phân loại sự kiện. Đây là cấu hình kinh doanh có thể sửa, không phải lịch nghỉ lễ bắt buộc. Sự kiện đặt theo ngày và năm cụ thể, không tự lặp hằng năm. Chọn tháng 10 năm tiếp theo để thêm sự kiện cho năm đó.

## Quy tắc tính giá

- Ưu tiên: giá riêng theo ngày và loại phòng → loại ngày đặt trong lịch → lịch thứ trong tuần.
- Thứ Sáu là ngày thường; thứ Bảy và Chủ nhật là cuối tuần.
- Đêm tính theo ngày nhận của đêm đó. Nhận 19/10, trả 20/10 chỉ tính đêm 19/10. Nhận 20/10, trả 21/10 tính giá sự kiện đêm 20/10.
- Tiền phòng là tổng từng đêm, cộng phụ thu thêm người theo chính sách hiện có.
- Booking đã tạo giữ tổng tiền, giá từng đêm, nguồn giá và chính sách đã lưu. Đổi lịch / giá chỉ áp dụng báo giá và booking mới.
- Khi lịch hoặc giá thay đổi, khách đang giữ báo giá cũ phải lấy báo giá mới, kể cả khi tổng tiền không đổi.
- “Giá từ” trong kết quả tìm phòng lấy giá thấp nhất trong các đêm của kỳ lưu trú được chọn.

## Cập nhật trên máy Quý

Tải `HOMESTAY_lich_gia_v3.zip` vào Downloads, dừng server bằng Ctrl+C, rồi dán vào Git Bash:

```bash
(
set -e
update_dir="/d/CodeGym_project/HOMESTAY_lich_gia_v3"
mkdir -p "$update_dir"
unzip -o "$HOME/Downloads/HOMESTAY_lich_gia_v3.zip" -d "$update_dir"
bash "$update_dir/HOMESTAY/scripts/install-pricing-update.sh" /d/CodeGym_project/HOMESTAY/HOMESTAY
cd /d/CodeGym_project/HOMESTAY/HOMESTAY
npm run update-data && npm start
)
```

Nếu không có lệnh `unzip`, giải nén bằng Windows, chép nội dung thư mục `HOMESTAY` trong ZIP vào `D:\CodeGym_project\HOMESTAY\HOMESTAY`, đồng ý ghi đè tệp mã nguồn; ZIP không chứa `.env` hoặc dữ liệu. Sau đó chạy `npm run update-data && npm start` ở thư mục đang chứa `package.json`.

Lệnh cài chỉ chép các tệp liên quan đến lịch giá, sao lưu mã nguồn cũ vào `data/pricing-code-backup-*.tar`. Không chép `.env`, không thay `shell.js` bạn đã sửa, không chép dữ liệu mẫu đè lên dữ liệu hiện có. Nếu một lệnh báo lỗi, dừng và xử lý lỗi trước khi chạy tiếp.

`npm run update-data` bổ sung các trường giá và lịch mẫu một lần; chạy lại không đặt lại lịch bạn đã chỉnh. Giá ngày thường hiện có được giữ. Giá cuối tuần cũ được dùng làm mặc định cho cả thứ Bảy và Chủ nhật; nếu giá cũ không cao hơn giá thường, giá mặc định mới được nâng để đáp ứng quy tắc. Giá sự kiện mặc định cao hơn giá cuối tuần 25%, làm tròn lên nghìn VND; hãy chỉnh theo giá kinh doanh của bạn. Giờ nhận/trả, phụ thu, chính sách huỷ, tài khoản, trạng thái phòng và booking được giữ.

Sau khi khởi động, mở `/admin.html?page=settings` và nhấn Ctrl+F5. Các máy cùng dùng Atlas cần cập nhật cùng phiên bản backend trước khi chỉnh lịch giá.

## Kiểm chứng

- 36/36 kiểm thử Node đạt: 20 kiểm thử hồi quy và 16 kiểm thử lịch giá.
- Kiểm thử mới gồm thứ Sáu/thứ Bảy/Chủ nhật, sự kiện ưu tiên cuối tuần, đổi về thường, giá riêng theo loại phòng, giao tháng/năm, ngày nhuận, không tính ngày trả, snapshot booking, báo giá cũ, ngày/giá sai, nâng dữ liệu chạy lại, giá từ theo kỳ lưu trú, phân quyền và API lưu cấu hình.
- Giao diện Chromium đã thử ở 1440px và 360px: sửa bảng giá, đổi sự kiện về thường, giá riêng 20/10, khoảng ngày, gỡ cấu hình tự động, báo giá → tạo booking, giữ giá booking sau thay lịch; không ghi nhận lỗi JavaScript hoặc tràn ngang trên màn hình kiểm tra.
- Kiểm thử dữ liệu dùng chế độ file với dữ liệu tạm. Chưa chạy kiểm thử mới trên MongoDB Atlas thật trong môi trường này.
- Không thêm thư viện npm; sử dụng Store hiện tại (MongoDB cập nhật bằng revision, hoặc file).

## API quản trị

| API | Nội dung |
| --- | --- |
| `GET /api/admin/pricing/calendar?month=YYYY-MM&roomTypeId=ID` | Lịch một tháng với giá thực tế của loại phòng |
| `PUT /api/admin/pricing/calendar` | `{startDate,endDate,kind,name,prices}`; `prices` ánh xạ ID loại phòng → số tiền VND |
| `PUT /api/admin/room-types/:id/prices` | `{weekdayPrice,saturdayPrice,sundayPrice,eventPrice}` |

Chỉ admin được sử dụng. Mỗi lần đổi tối đa 366 ngày; tối đa 4.000 ngày có cấu hình riêng trong lịch. Giá là số nguyên VND dương. Mỗi thay đổi tăng phiên bản và ghi nhật ký; không sửa các booking đã lưu.

## Đưa bản cập nhật vào PR #28

Plugin GitHub trả lỗi 403 khi tạo tree nên bản cập nhật này chưa được ghi lên GitHub. Khi muốn cập nhật PR hiện có, chạy tại repo clone riêng:

```bash
(
set -e
cd /d/CodeGym_project/TTCS-Team-04-HOMESTAY
git switch feature/quy-homestay-demo
git pull --ff-only origin feature/quy-homestay-demo
bash /d/CodeGym_project/HOMESTAY_lich_gia_v3/HOMESTAY/scripts/install-pricing-update.sh "$PWD/demos/HOMESTAY"
git add -- demos/HOMESTAY
git diff --cached --stat
git commit -m "feat: add editable event calendar and nightly room rates"
git push origin feature/quy-homestay-demo
)
```

Lệnh cài không chép `.env`, dữ liệu hoặc thư viện. Bản sao lưu mã nguồn nằm trong `data/` đã được bỏ qua bởi `.gitignore`. PR #28 tự nhận commit mới, không cần mở PR mới; không merge vào `develop` trong lệnh này.
