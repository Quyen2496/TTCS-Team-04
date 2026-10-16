HOMESTAY AI 1.5.0 — tư vấn phòng, hỏi tiếp và đồng ý xuất file

NÂNG TỪ AI ĐÃ HOẠT ĐỘNG
1. Dừng server cũ bằng Ctrl+C.
2. Giải nén ZIP mới vào D:/CodeGym_project/HOMESTAY_AI_1_5_0.
3. Chạy khối lệnh Git Bash dưới đây. Giữ nguyên key AI/email/MongoDB, không cần thiết lập lại.

(
set -e
update_script="$(find /d/CodeGym_project/HOMESTAY_AI_1_5_0 -type f -name apply-update.cjs -print -quit)"
test -n "$update_script"
node "$update_script" "D:/CodeGym_project/HOMESTAY/HOMESTAY"
cd /d/CodeGym_project/HOMESTAY/HOMESTAY
npx --yes --package=node@22 -c "node server.js"
)

Mở http://localhost:3001, nhấn Ctrl+F5 và đăng nhập. Nút chat tròn hiện trên các trang khách và quản trị; trang Trợ lý AI lớn không hiện thêm widget.
Bấm nút tròn để mở/thu gọn, kéo nút hoặc tiêu đề chat để di chuyển. Có thể dùng phím mũi tên khi nút/tiêu đề có focus, Escape để thu gọn.
Bảng lớn có liên kết “Bấm vào đây để chuyển sang màn hình lớn hơn”, mở đúng cuộc trò chuyện/tin nhắn ở trang Trợ lý AI. Nút ↗ trên tiêu đề luôn mở màn hình lớn.
Lịch sử và câu hỏi đang nhập được giữ khi chuyển trang trong cùng tab/tài khoản. Chọn cơ sở trong AI không đổi cơ sở ở trang nghiệp vụ.

CÀI AI LẦN ĐẦU TỪ SPRINT 3 1.3.2
Sau khi áp dụng, tại thư mục HOMESTAY chạy npm ci --no-audit --no-fund, bash scripts/setup-ai.sh rồi chạy server bằng Node 22. Groq mặc định openai/gpt-oss-20b. Không chép .env Warehouse đè lên .env HOMESTAY.

Không cần seed lại. Giữ nguyên .env, dữ liệu, ảnh và cấu hình email. Backup mã nguồn vào backups/ai-update-... trước khi cập nhật; .gitignore giữ quy tắc riêng.
Gói này chỉ cập nhật HOMESTAY full riêng của Quý, không tự sửa hoặc đẩy repo nhóm.
Chi tiết: docs/AI_HOMESTAY.md. Kiểm thử bản hiện tại: docs/TEST_AI_1_5_0.txt.

Hoàn tác nếu chưa sửa mã sau cập nhật:
node restore-update.cjs "D:/CodeGym_project/HOMESTAY/HOMESTAY/backups/ai-update-..."
Sau hoàn tác: npm ci rồi chạy lại server. .env/dữ liệu không bị hoàn tác.

MỚI TRONG 1.5.0
Gợi ý phòng theo số người → chọn thẻ hoặc tên/thứ tự → xem tiện nghi, diện tích, sức chứa và giá. Chưa có ngày chỉ là tham khảo; có ngày mới kiểm tra phòng trống và giá từng đêm. Nhóm lớn có phương án nhiều phòng, mỗi phòng cần booking riêng.
Ẩn nút Excel/PDF mặc định. Kết quả có dữ liệu và đủ quyền xuất mới hỏi trước; đồng ý mới hiện định dạng. Nguồn/thời điểm có thể mở khi cần.
Sửa câu hỏi số phòng có khách, số khách khi hỏi tiếp và tránh nhầm gợi ý phòng với công việc. Giữ phân quyền phía server.
