# HOMESTAY 1.8.2 — Đọc CMND và CCCD để điền hồ sơ

## Những phần có thể sử dụng

- Chọn ảnh từ máy tính hoặc thư viện ảnh điện thoại. Trên điện thoại, nút Chụp ảnh sử dụng camera khi trình duyệt hỗ trợ; máy tính có thể mở bộ chọn tệp thay vì camera.
- Hai vị trí ảnh riêng cho mặt trước và mặt sau hoặc mặt có QR. Có nút xoay ảnh, xóa ảnh, dừng đọc.
- Ưu tiên QR có cấu trúc CCCD mà ứng dụng đọc được. Nếu không có QR phù hợp, OCR tiếng Việt và Anh đọc chữ từ ảnh. QR khác định dạng hoặc QR chỉ chứa đường dẫn không được coi là hồ sơ xác thực.
- Có lựa chọn Đọc thêm chữ trên thẻ để bổ sung thông tin ngoài QR như quốc tịch, quê quán, ngày hết hạn. Kết quả QR được ưu tiên nếu kết hợp với OCR. Nếu các số giấy tờ đọc được không khớp, ứng dụng dừng đề xuất điền để lễ tân kiểm tra.
- Bảng đối chiếu: thông tin đang nhập và kết quả đọc được; chỉnh được kết quả, chọn từng mục muốn điền. Trên điện thoại, mỗi mục hiển thị thành nhóm dọc để dễ đọc.
- Cần tích xác nhận đã đối chiếu giấy tờ gốc của đúng khách rồi mới bấm Điền các mục đã chọn. Chưa đọc, đang đọc hoặc đang đối chiếu không tự lưu hồ sơ.
- Có thể chọn riêng khách đứng tên hoặc từng khách đi cùng trong thủ tục Nhận phòng. Chuyển khách sẽ xóa ảnh đang chọn để tránh dùng nhầm giấy tờ.
- Hồ sơ mở rộng gồm họ tên, loại và số giấy tờ, ngày sinh, giới tính, quốc tịch, nơi thường trú, quê quán, ngày cấp, ngày hết hạn và nơi cấp. Mục không đọc được phải nhập bổ sung; không tự suy đoán dữ liệu còn thiếu.
- Xem giấy tờ hiển thị hồ sơ đầy đủ của khách đứng tên và khách đi cùng; giữ kiểm tra vai trò Chủ homestay/Lễ tân, quyền xem khách hàng, phạm vi homestay và nhật ký truy cập hiện có.

## Cách dùng khi nhận phòng

1. Đăng nhập tài khoản lễ tân → Booking & khách → chọn booking đã xác nhận → Nhận phòng.
2. Tại Điền nhanh từ giấy tờ, chọn Khách đứng tên hoặc Khách đi cùng cần nhập.
3. Chọn ảnh hoặc Chụp ảnh. Chọn đúng hai mặt của cùng một khách; ít nhất một ảnh rõ. Ảnh JPG, PNG, WebP, tối đa 8 MB mỗi ảnh. Ảnh HEIC cần chuyển sang JPG hoặc PNG nếu trình duyệt không mở được.
4. Nếu có QR, chọn ảnh rõ mã QR. Nếu cần lấy cả quê quán/quốc tịch/hạn dùng, tích Đọc thêm chữ trên thẻ. Có thể xoay ảnh trước khi đọc để chữ nằm ngang.
5. Bấm Đọc thông tin. Đọc chữ có thể mất vài chục giây trên điện thoại; có thể Dừng đọc và tiếp tục nhập tay. Lần đầu cần tải bộ đọc từ chính website HOMESTAY.
6. Đối chiếu từng mục. Khi thông tin đọc được khác thông tin đang nhập, dòng đó được bỏ chọn sẵn. Muốn thay giá trị cũ phải chủ động chọn lại. Sửa lỗi đọc sai ngay trong bảng nếu cần.
7. Tích Tôi đã đối chiếu… → Điền các mục đã chọn. Ảnh và bảng kết quả được xóa khỏi phần đọc sau khi áp dụng; dữ liệu chỉ mới được đưa vào biểu mẫu.
8. Bổ sung điện thoại, email và các thông tin còn thiếu; giấy tờ không cung cấp số điện thoại/email để tự đọc. Làm tương tự với từng khách đi cùng.
9. Kiểm tra biểu mẫu rồi nhấn Lưu để xác nhận nhận phòng. Dữ liệu chỉ được ghi vào booking ở bước này.

## Bổ sung hồ sơ trước khi nhận phòng

Vào Khách hàng → booking còn chờ hoặc đã xác nhận → Bổ sung giấy tờ. Cũng có phần Điền nhanh từ giấy tờ cho khách đứng tên. Sau khi áp dụng kết quả vào form phải nhấn Lưu. Các booking đã nhận phòng hoặc đã đóng giữ quy trình hồ sơ hiện tại; không tự sửa hóa đơn hoặc thay dữ liệu tài chính bằng OCR.

## Xem lại giấy tờ

Booking & khách → Xem giấy tờ. Màn hình hiển thị các trường hồ sơ đã được lưu, kể cả thông tin bổ sung của khách đi cùng. Không đọc lại ảnh cũ vì bản cập nhật này không lưu ảnh gốc lên server.

## Ảnh và thông tin được xử lý ra sao

Ảnh được giải mã, đọc QR và OCR trong trình duyệt đang mở HOMESTAY. Bộ đọc, mô hình tiếng Việt/Anh được đóng gói cùng website; không gọi dịch vụ OCR/AI ngoài và không cần API key Groq, OpenAI hoặc dịch vụ OCR trả phí. Máy của khách hoặc lễ tân thực hiện việc đọc ảnh.

Ảnh, QR thô và chữ OCR không được gửi lên API hay lưu vào MongoDB. Chỉ các thông tin đã chọn trong form được gửi khi lưu hồ sơ. Xóa ảnh, áp dụng kết quả hoặc đóng hộp thoại sẽ bỏ ảnh khỏi phần đọc của ứng dụng. Ảnh gốc do người dùng chọn/chụp vẫn có thể còn trong thư viện ảnh của thiết bị theo hoạt động của hệ điều hành.

OCR có thể sai dấu, nhầm chữ/số hoặc bỏ sót khi ảnh nghiêng, mờ, lóa, chữ nhỏ hay nền phức tạp. Điểm đọc chữ không phải điểm xác thực danh tính. Chức năng này hỗ trợ nhập liệu, không xác thực thẻ thật/giả, không đọc chip và không kết nối cơ sở dữ liệu dân cư.

## Cập nhật trên máy của Quý

Gói HOMESTAY_ID_READER_1_8_2.zip áp dụng cho Sprint 4 phiên bản 1.8.0 hoặc 1.8.1; chạy lại trên 1.8.2 được. Đã bao gồm bản sửa mobile, hóa đơn lễ tân và nút xác nhận của 1.8.1. Không dùng gói này như dự án chạy độc lập.

1. Nhấn Ctrl + C trong Git Bash đang chạy server.
2. Giải nén vào D:\CodeGym_project\HOMESTAY_ID_READER_1_8_2.
3. Dán cả khối sau vào Git Bash:

```bash
(
set -e
hs_folder="/d/CodeGym_project/HOMESTAY_ID_READER_1_8_2"
if [ ! -d "$hs_folder" ]; then
  echo "Chưa thấy thư mục gói cập nhật. Kiểm tra nơi giải nén."
  exit 1
fi
hs_updater="$(find "$hs_folder" -maxdepth 4 -type f -iname 'apply-update.cjs' -print -quit)"
if [ -z "$hs_updater" ]; then
  echo "Chưa tìm thấy apply-update.cjs. Kiểm tra thư mục giải nén."
  exit 1
fi
node "$(cygpath -w "$hs_updater")" "D:/CodeGym_project/HOMESTAY/HOMESTAY"
cd "/d/CodeGym_project/HOMESTAY/HOMESTAY"
npx --yes --package=node@22 -c "node server.js"
)
```

Không đổi thư viện chạy server nên không cần npm ci cho bản này. Trình cập nhật kiểm tra hash trước khi ghi, sao lưu mã nguồn bị thay, giữ .env, booking, tài khoản, ảnh homestay và cấu hình Tunnel. Không chạy seed hoặc setup demo để thử tính năng trên dữ liệu đang dùng.

4. Máy tính nhấn Ctrl + F5; điện thoại tải lại trang. Đăng xuất/đăng nhập lại nếu menu vẫn cũ. Vào Khách hàng → Bổ sung giấy tờ hoặc Booking & khách → Nhận phòng để thử. Tên miền công khai giữ nguyên.

## Nếu chưa đọc được

- Chụp lại rõ, đúng chiều, sát thẻ nhưng đủ bốn góc và không lóa; chọn ảnh có QR rõ trước.
- Nếu số đọc được trên hai ảnh không khớp, kiểm tra có nhầm khách không; có thể tắt Đọc thêm chữ để chỉ dùng QR sau khi đối chiếu.
- Nếu báo thiếu bộ đọc, cập nhật lại đầy đủ thư mục public/vendor/identity bằng trình cập nhật; không chỉ chép tệp JavaScript giao diện.
- Nếu điện thoại chậm hoặc không hỗ trợ, nhập thủ công vẫn dùng được. Không cần bật Docker hoặc VPS.

## Nguồn thư viện

- Tesseract.js 7.0.0 và tesseract.js-core 7.0.0 — https://github.com/naptha/tesseract.js
- jsQR 1.4.0 — https://github.com/cozmo/jsQR
- Mô hình vie và eng từ @tesseract.js-data phiên bản 1.0.0, bản 4.0.0_best_int.
- Văn bản giấy phép đi kèm public/vendor/identity/LICENSES.txt.

Phạm vi kiểm thử và giới hạn có trong QA_ID_READER_1_8_2.txt. Không dùng giấy tờ thật của người dùng trong bộ kiểm thử.
