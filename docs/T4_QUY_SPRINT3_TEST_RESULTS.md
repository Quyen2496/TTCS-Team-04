# Kiểm thử frontend T4 Sprint 3 — 12/10/2026

Nền develop 5b04dd6 (đã có Phú 674f11e và merge T3/T5 sau đó). Node 24.19.0; Chromium 153 headless. Đây là kiểm thử **frontend với API fixture**, chưa phải MongoDB end-to-end.

- 7 ca `node --test test/t4/staff-api.test.cjs` đạt, 0 lỗi: ngày/số khách, availability, giá/số đêm/tổng tiền, booking đúng nguồn và lịch, trạng thái được đổi, cặp token/user, Authorization/body, không retry tự động và lỗi ghi chưa rõ kết quả.
- 9 luồng browser đạt, 0 lỗi JavaScript: lookup và đối chiếu giá; sửa ngày hủy preview/consent; 409 giữ form và không báo thành công; double click chỉ gửi một PUT đúng 3 trường; lịch sử chỉ từ response; lỗi walk-in giữ khách; không email chỉ gửi một POST/mã/status máy chủ; 500 khóa thao tác và không tự retry; giao diện 360px không tràn ngang/menu burger/Escape; customer không vào UI nhân viên. Tóm tắt 9 mục trong JSON đi kèm; một mục có nhiều kiểm tra.
- Kiểm tra render desktop và 360px; ảnh chỉ dùng kiểm tra nội bộ, không đóng gói.
- `git diff --check` đạt. Backend/package/dependency/common CSS, code T1/T2/T3/T5 và demos/HOMESTAY không sửa.
- Server/model booking ở develop mới nhất lỗi cú pháp do xử lý merge; router thật không nạp được, service tạo booking online không có, walk-in lỗi crypto và schema thiếu roomId/holdExpiresAt. Chi tiết chẩn đoán và phần chưa có auth/lịch sử/email/nhận phòng liên kết: T4_PHU_BACKEND_BLOCKERS.md.

File kết quả: `test/t4/browser-results.json`, `test/t4/backend-status.json`. Fixture chỉ trong RAM, không dùng vào server.js, luôn có nhãn kiểm thử. Browser test reproducible trong `test/t4/staff-browser.cjs` với Playwright ngoài dependency dự án; hướng dẫn cài ở T4_QUY_SPRINT3_FRONTEND.md.

Chưa kiểm tra Atlas/MongoDB hoặc gửi thư thật. Không tuyên bố hoàn tất toàn bộ AC S3-04/S3-06 hay chạy được backend thật. Nhánh frontend sẵn sàng để phối hợp; còn cần Phú sửa backend và nghiệm thu tích hợp.

Kiểm tra thêm sau khi develop cập nhật 5b04dd6: adapter đọc totalDeposit khi có, fallback depositAmount của bản Phú; nhận checkInDate/checkOutDate khi API không trả checkIn/checkOut. Không tự đổi tên trường ghi của API modify.
