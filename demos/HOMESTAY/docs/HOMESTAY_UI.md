# Giao diện dùng chung — HOMESTAY v4

Quy chuẩn hiện tại ở [DESIGN.md](../DESIGN.md); chức năng và giới hạn ở [PRODUCT.md](../PRODUCT.md). Bản v4 thay bố cục xanh lá/sidebar của trang khách bằng header trên, tìm phòng theo ngày/số khách, thẻ phòng theo nhóm và trang chi tiết riêng.

## Tích hợp

Body giữ `class="homestay-ui"`. Nạp `/css/homestay-ui.css`, `/css/shell.css`, CSS module (nếu có), rồi `/css/travel-ui.css` cuối cùng. Nạp `/js/common.js` trước `/js/shell.js`; shell tự chọn header khách hoặc sidebar nhân sự theo đường dẫn.

`travel-ui.css` là theme cuối cùng; không thêm stylesheet/theme bên ngoài để đổi font và màu theo từng trang. Font Be Vietnam Pro được lưu cùng giấy phép trong `public/assets/fonts`.

## Thành phần

- Header khách: thương hiệu, menu điều hướng, burger trên màn hình nhỏ. Không sidebar; liên kết đăng nhập quản lý ở footer.
- Quản trị: sidebar 216px, menu theo quyền, nhóm Phòng / loại phòng / tiện nghi.
- Phòng: `room-grid`, `room-card`, `room-image`, `room-content`; liên kết Xem chi tiết tới `room-detail.html?id=...`.
- Form: `form-grid`, `field`, `full`, `checkbox-label`; nút `btn primary`, `btn secondary`.
- Trạng thái: `notice`, `notice error`, `notice warning`, `notice loading`; nội dung động dùng `role="status"` / `aria-live` khi phù hợp.
- Bảng: `table-scroll`; phân trang dùng `HS.pager`. Trang hiện tại và đầu/cuối không khả dụng có `disabled` thật. Trạng thái trang riêng cho mỗi bảng.
- Khả năng truy cập: `skip-link`, `sr-only`, focus ring; menu hỗ trợ Escape, giữ Tab trong menu đang mở, `inert` khi đóng trên màn hình nhỏ.

Danh sách khách hiển thị đủ kết quả theo nhóm, không dùng phân trang. Giá booking tiếp tục tính ở server theo lịch v3; giao diện không tự quyết định tổng tiền.

Kiểm chứng: [CAP_NHAT_UI_V4.md](CAP_NHAT_UI_V4.md). Ảnh đã chụp và JSON kết quả trình duyệt nằm trong `docs/previews-v4`.
