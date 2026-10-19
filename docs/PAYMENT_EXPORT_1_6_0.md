# HOMESTAY full 1.6.0 — đặt cọc khách hàng và xuất báo cáo

## Thiết lập lần đầu

Admin / chủ homestay có quyền Giá & chính sách → chọn đúng một homestay → Tài khoản nhận cọc & QR. Điền ngân hàng, BIN 6 số, số tài khoản, tên người nhận IN HOA không dấu và tỷ lệ cọc (mặc định 30%, có thể đổi 1–100%). Bật chuyển khoản sau khi kiểm tra tài khoản. Cơ sở chưa cấu hình không nhận nhầm tài khoản của cơ sở khác.

Tra cứu BIN và mẫu QR tại tài liệu chính thức: https://www.vietqr.io/en/danh-sach-api/link-tao-ma-nhanh/ . Trường mẫu QR mặc định compact2 dành cho kiểm thử; có thể nhập mã mẫu riêng của cơ sở từ my.vietqr.io khi triển khai chính thức. Tên hiển thị trên QR không phải chứng thực tên chủ tài khoản; khách cần đối chiếu người nhận trong ứng dụng ngân hàng.

## Khách đặt cọc

Sau khi đặt phòng, tại Booking của tôi hoặc Tra cứu booking, chọn Đặt cọc / Chuyển khoản QR. Khách chưa đăng nhập dùng mã booking + đúng email; thông tin này không được đưa lên URL. Phiên thanh toán có hạn 30 phút, hết hạn cần tra cứu lại.

Màn hình hiện tổng tiền, mức cọc, cọc đã ghi nhận, cọc còn cần chuyển, hạn giữ chỗ và tài khoản nhận. Bấm Hiện QR để tạo QR đúng số tiền và nội dung COC + mã booking. Tạo ảnh gửi tài khoản người nhận, số tiền và mã booking tới VietQR.io; trang giải thích trước khi bấm. QR cần kết nối Internet; lỗi tải vẫn có thông tin để nhập chuyển khoản thủ công. Trên cùng điện thoại, mở/lưu ảnh và chọn ảnh QR trong ứng dụng ngân hàng.

Sau khi chuyển thành công, khách nhập số tiền thực chuyển và mã giao dịch. Một thông báo chờ đối soát mỗi booking; chưa cộng cọc, chưa xác nhận booking, chưa gia hạn giữ chỗ. Có thể báo số tiền thực chuyển khác mức gợi ý nhưng không vượt phần chưa thanh toán. Lịch sử hiển thị chờ, ghi nhận hoặc chưa khớp cùng ghi chú của nhân viên.

## Đối soát

Booking & khách → Đối soát chuyển khoản. Kiểm tra giao dịch trong tài khoản ngân hàng của cơ sở, chọn giao dịch khách báo, ghi chú và tích đã kiểm tra tiền thực nhận. Xác nhận ghi đúng một dòng trong sổ cọc; từ chối giữ nguyên tiền và cho khách sửa/báo lại. Booking vẫn cần bước Xác nhận của lễ tân. Ghi tiền cọc thủ công và điều chỉnh vẫn hoạt động như trước. Nếu đã ghi tay cho giao dịch này, từ chối thông báo với ghi chú đã ghi nhận trước để tránh cộng hai lần.

Booking hết hạn / huỷ không tạo yêu cầu QR mới hoặc báo chuyển. Nếu khách đã chuyển, liên hệ cơ sở để xử lý ngoài luồng; không tự xác nhận tiền hoặc khôi phục booking.

## AI và xuất file

Xem phòng từ AI giữ loại phòng/ngày/số khách; Đặt phòng trên trang chi tiết tự lấy báo giá cho loại đã chọn, không phải tìm lại. Nếu AI chưa có ngày, dùng ngày mặc định đang hiển thị; khách vẫn xem và chấp nhận chính sách trước khi gửi.

Sửa nhận diện câu hỏi chính sách huỷ booking và xem danh sách booking; quyền và phạm vi vẫn được kiểm tra tại máy chủ. Xuất file vẫn cần khách yêu cầu hoặc đồng ý như 1.5.0.

Excel có tiêu đề xanh, dòng tóm tắt xuống dòng, chỉ số có nền, bảng xen màu, định dạng tiền VND, bộ lọc và cố định hàng tiêu đề. PDF có khối chỉ số, định dạng tiền, tiêu đề bảng lặp khi qua trang và số trang. Dữ liệu và phân quyền không thay đổi. CSV giữ dạng dữ liệu thô.

## Kiểm thử

123 kiểm thử tự động: 122 đạt, 1 bỏ qua vì yêu cầu MongoDB riêng, 0 lỗi. 8 kiểm thử mới về đặt cọc và 1 hồi quy AI. Kiểm thử trình duyệt với API thật + dữ liệu file thử nghiệm: desktop 1440px, mobile 360px, lỗi tải QR có hướng dẫn dự phòng, khách báo chuyển chưa ghi tiền, nhân viên đối soát, cấu hình ngân hàng, giữ phòng/ngày/số khách khi điều hướng. Không lỗi JavaScript, không tràn ngang.

Excel đã đọc lại bằng Artifact Tool, kiểm tra giá trị số và ảnh bố cục. PDF mẫu 1 trang và bảng 80 dòng/9 trang đã render, kiểm tra đầu bảng, số trang và đủ mã dòng. Không thử chuyển tiền thật, dịch vụ QR thực tế, MongoDB Atlas, WPS/Excel desktop hay gửi email/Groq thật trong lần cập nhật này.
