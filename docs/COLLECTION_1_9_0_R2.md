# Sửa cập nhật danh mục 1.9.0 R2

Áp dụng khi mã nguồn đã lên 1.9.0 nhưng cập nhật danh mục báo một loại có hơn năm phòng.
Bản R2 không xoá phòng hoặc sửa booking. Các phòng gắn bất kỳ booking nào (kể cả lịch sử phòng đã đổi), phòng đang ở, bẩn hoặc bảo trì giữ nguyên loại. Chỉ phòng sạch trống chưa từng gắn booking mới được chuyển sang loại bổ sung trong cùng homestay. Mỗi loại bổ sung có 3–5 phòng; nếu cần thì tạo thêm phòng để đủ ba phòng.

Ví dụ: sáu phòng cùng loại, có phòng an toàn để chuyển → giữ năm phòng ở loại gốc, chuyển một phòng chưa dùng sang loại bổ sung và thêm hai phòng mới. ID của cả sáu phòng cũ vẫn giữ. Danh mục có thể nhiều hơn 100 loại để giữ đủ phòng có sẵn.
Nếu hơn năm phòng cùng loại đã có booking hoặc chưa sạch trống thì bản R2 dừng, báo số phòng cần rà soát, không thay đổi danh mục. Không dùng reset hoặc xoá phòng để vượt kiểm tra này.

## Cách chạy

Giải nén gói sửa vào D:\CodeGym_project\HOMESTAY_FIX_DANH_MUC_1_9_0_R2. Dừng HOMESTAY bằng Ctrl+C nếu đang chạy, rồi chạy SUA_DANH_MUC_GIT_BASH.sh với đối số thư mục đang dùng D:/CodeGym_project/HOMESTAY/HOMESTAY. Script tự sao lưu mã nguồn, xem trước, sao lưu dữ liệu mã hoá, cập nhật danh mục rồi bật server. Không cần npm ci lại.

Khi báo hoàn tất, mở website và Ctrl+F5. Giữ file .env, data, uploads và backups. Gói này không chứa hoặc yêu cầu mật khẩu của bạn.

Các kiểm thử bổ sung: chia 6 phòng, chia nhiều loại dư, bảo vệ phòng có lịch sử booking/đang dùng, sao chép lịch giá riêng, chạy lại không nhân bản, dừng nguyên trạng khi không thể chia an toàn.
