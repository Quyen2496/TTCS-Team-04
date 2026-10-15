# HOMESTAY — Sprint 3 đầy đủ

Bản kiểm thử độc lập cho Quý, tiếp nối v5; triển khai đủ S3-01…S3-10: sổ cọc/xác nhận, chống trùng theo đêm, gán/đổi phòng, đổi ngày/loại, huỷ/hoàn cọc, tại quầy, nhận phòng, cảnh báo thiếu tồn, buồng phòng/sự cố và sơ đồ 14 ngày.

Vai trò: Admin, Chủ nhà, Lễ tân, Báo cáo, Khách và Buồng phòng. Quyền và dữ liệu giới hạn theo homestay; khách không có API quản trị. Ảnh thật tải lên thuộc cơ sở. Giữ bố cục v4, font/màu v3.

Giữ chức năng v5 về đăng ký/hồ sơ, booking cá nhân, mật khẩu và SMTP reset. Giữ giá thứ Bảy/Chủ nhật và lịch lễ/sự kiện v3. Tiền cọc/hoàn là ghi nhận thủ công. MongoDB cần Atlas hoặc replica set, state + khoá phòng-đêm cùng transaction. File demo chạy một tiến trình.

Xem docs/SPRINT_3.md để biết kết quả kiểm thử, ánh xạ AC Mongo/PostgreSQL và phạm vi chưa nghiệm thu trên Atlas/repo nhóm.
