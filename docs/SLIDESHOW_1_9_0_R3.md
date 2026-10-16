# Trình chiếu giới thiệu homestay — 1.9.0 R3

Banner trang chủ tự trượt qua ảnh đại diện của các homestay đang hoạt động mỗi 6 giây. Có nút ảnh trước/sau, chấm chọn ảnh, tạm dừng/phát, bộ đếm, tên và điểm đến; bấm tên để xem đúng cơ sở. Điện thoại hỗ trợ vuốt ngang. Bàn phím hỗ trợ Tab và phím mũi tên khi chọn điều khiển.

Tạm dừng khi đưa chuột lên banner, khi tab không hiển thị hoặc banner ra ngoài màn hình. Khi người dùng thao tác thủ công hoặc đưa tiêu điểm bàn phím vào banner, cần bấm phát để tự chạy lại. Nếu thiết bị bật giảm chuyển động, ban đầu không tự chạy và chuyển ảnh ngay khi bấm nút. Chỉ giữ hai thẻ ảnh và tải trước một ảnh kế tiếp, không dùng video/GIF hoặc thư viện ngoài.

## Cập nhật

Dừng server bằng Ctrl+C, giải nén gói HOMESTAY_SLIDESHOW_1_9_0_R3, chạy CAP_NHAT_SLIDESHOW_GIT_BASH.sh với đối số thư mục đang dùng D:/CodeGym_project/HOMESTAY/HOMESTAY. Có sao lưu mã nguồn tự động, không thay đổi dữ liệu, .env hoặc ảnh tải lên, không cần npm ci. Sau khi server bật, mở trang chủ và Ctrl+F5.

Bản đầy đủ HOMESTAY_FINAL_1_9_0 đã kèm sửa danh mục R2 và trình chiếu R3. Gói trình chiếu nhỏ chỉ cập nhật phần giao diện; không chạy lại cập nhật danh mục.

## Dọn bộ cài cũ trên máy

Giữ thư mục đang chạy D:\CodeGym_project\HOMESTAY, đặc biệt .env, data, public/assets/uploads và backups. Giữ một bộ mã nguồn đầy đủ mới nhất để cài lại. Với các thư mục chỉ chứa bộ cài đã giải nén, không có thay đổi hoặc dữ liệu riêng, có thể xoá:

- HOMESTAY_AI_1_4_1
- HOMESTAY_AI_1_4_2
- HOMESTAY_AI_1_5_0
- HOMESTAY_AI_1_6_0
- HOMESTAY_AI_1_8_4
- HOMESTAY_AI_UPDATE
- HOMESTAY_FIX_MOBILE_INVOICE_1_8_1
- HOMESTAY_HOTFIX_1_8_3
- HOMESTAY_ID_READER_1_8_2
- HOMESTAY_lich_gia_v3
- HOMESTAY_SPRINT3_FULL
- HOMESTAY_SPRINT3_PAYOS_LOCAL_1_7_1
- HOMESTAY_SPRINT4_1_8_0
- HOMESTAY_V5_5_ROLES

Các thư mục gói sửa HOMESTAY_FIX_DANH_MUC_1_9_0_R2 và HOMESTAY_SLIDESHOW_1_9_0_R3 cũng có thể xoá sau khi đã áp dụng thành công và đã giữ bộ đầy đủ mới nhất. Chỉ xoá bộ cài; không xoá các tệp tương ứng trong thư mục đang chạy.

Chưa xoá Sprint 01 HOMESTAY, T4_QUY_SPRINT3_FRONTEND, TTCS-T4-QUY-S3, TTCS-Team-04: đây có thể là bài tập hoặc repository nhóm riêng. Kiểm tra đã lưu/push phần việc riêng trước khi dọn.

Dùng Delete để đưa vào Thùng rác trước, sau đó kiểm tra website vẫn chạy được rồi mới dọn Thùng rác. Xoá bộ cài giúp giảm dung lượng ổ đĩa, không trực tiếp giải phóng RAM của ứng dụng đang chạy. Gói cập nhật không tự xoá thư mục nào trên máy.
