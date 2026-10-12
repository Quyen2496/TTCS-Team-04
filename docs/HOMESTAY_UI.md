# HomeStay — UI dùng chung

Mẫu chuẩn: booking T4 của Quý, PR #17. Giữ màu, font và kích thước mẫu.
Trong head, tải /css/homestay-ui.css trước CSS riêng của module.
Gắn class="homestay-ui" vào body để bật giao diện chung.

Thành phần dùng chung:
- Header: topbar, brand, brand-mark, nav-current, staff-link.
- Khung: container, page-title, eyebrow, section-title, card, footer.
- Form: form-grid, field, full, optional, checkbox-label.
- Nút: btn primary, btn secondary, text-button; nhóm nút: actions.
- Thông báo: notice, notice error, notice warning, notice loading.
- Phòng: room-grid, room-card, room-image, room-content, status.
- Bảng/tiền: table-scroll, money, price-label, totals, grand-total.
- Tiện ích: muted, sr-only, skip-link.

Sao chép header và SVG thương hiệu từ HTML booking; đổi nội dung/điều hướng
theo chức năng, giữ thiết kế. Thông báo dùng role="status" aria-live="polite".
Không dùng thanh bước booking trên trang không có quy trình nhiều bước.

Font Arial/sans-serif; chữ #26332d; chữ phụ #737c77; xanh #34764d;
hover #28623e; viền #dfe6df; xanh nhạt #e8f2eb; kem #fff0dc; lỗi #a73737.
Card bo 14px; input/nút bo 8px, cao tối thiểu 45px; khung max-width 1120px.
Breakpoint 900px và 600px, kiểm tra ở 360px. Bảng cuộn trong table-scroll.

Không ghi đè token, font, màu, header, card và nút trong CSS module.
Không nạp Bootstrap/theme khác gây xung đột. Chuyển markup sang thành phần
chung và bỏ CSS cũ xung đột; chỉ link stylesheet chưa đủ để đồng nhất.
CSS chung chỉ tác động bên trong .homestay-ui; :where giữ độ ưu tiên selector.

booking.css chỉ giữ progress, bố cục tìm/báo giá/chính sách và kết quả booking.
JavaScript và các lời gọi API không đổi. Kiểm thử CSS dùng API giả lập
không chứng minh nghiệp vụ database; xem T4_BOOKING_API_CONTRACT.md.
