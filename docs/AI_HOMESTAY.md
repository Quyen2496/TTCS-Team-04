# Trợ lý AI cho HOMESTAY

Bản 1.5.0 bổ sung vào HOMESTAY full Sprint 3 của Quý. Phần frontend T4 trong ứng dụng nhóm vẫn tạm gác. Bản này không cập nhật repo nhóm tự động.

## Chức năng

- Trang `/assistant.html`, mục Trợ lý AI trên sidebar nhân sự và menu tài khoản Khách.
- Câu hỏi tiếng Việt, câu hỏi gợi ý theo quyền, chọn cơ sở, lịch sử riêng, tạo/đổi tên/xoá cuộc trò chuyện. Lưu tối đa 30 cuộc/tài khoản và 40 tin nhắn/cuộc. Dung lượng lịch sử toàn hệ thống giới hạn 4 MiB để bảo vệ kho dữ liệu; khi đầy, xoá các cuộc cũ trước khi hỏi tiếp.
- Tìm phòng trống và báo giá theo ngày, số đêm, số khách; giá từ lịch giá thật và phụ thu. Trợ lý không giữ phòng; mở luồng Đặt phòng để thao tác.
- Booking theo mã trong cơ sở được cấp; Khách chỉ xem booking đã gắn đúng tài khoản. Không cung cấp tên, điện thoại, email, giấy tờ hoặc ghi chú nội bộ qua câu trả lời AI.
- Lịch khách đến/đi tối đa 31 ngày; danh sách phòng bẩn/sạch; việc cần kiểm tra: sắp hết giữ chỗ, khách đến chưa gán phòng, quá ngày trả, nghĩa vụ hoàn cọc và phòng cần dọn.
- Báo cáo tháng, năm hoặc khoảng ngày tối đa một năm. Tổng booking tính theo ngày nhận; giá trị booking có hiệu lực gồm CONFIRMED/CHECKED_IN/COMPLETED. Giá trị booking trả trong kỳ tính theo actualCheckOut giờ Việt Nam. Cọc được hiển thị riêng.
- Tỷ lệ đêm phòng được đặt: đêm giao với kỳ của CONFIRMED/CHECKED_IN/COMPLETED chia cho đêm phòng khả dụng, loại các đêm bảo trì. Không gồm PENDING; ngày trả không chiếm đêm. Đây không phải công suất sử dụng thực tế xác nhận từ giờ nhận/trả.
- Giá trị booking không được gọi là doanh thu thực thu: Sprint 3 chưa có sổ quyết toán/hoá đơn. AI không giả định phần tiền còn lại đã thu.
- Hướng dẫn đặt/đổi/huỷ, cọc, giờ nhận/trả, vai trò và mã khôi phục mật khẩu. Chính sách hiện tại lấy theo từng cơ sở; tiền hoàn thực tế phụ thuộc snapshot của booking.
- Bảng có phân trang 10/20/50 dòng; kết quả lưu và xuất tối đa 200 dòng, báo rõ khi bị giới hạn. Thu hẹp câu hỏi/kỳ để xem chi tiết.
- Tải Excel `.xlsx`, PDF A4 tiếng Việt và API CSV. Xuất từ cùng kết quả đã nhận, kèm nguồn và thời điểm; hỏi lại để làm mới dữ liệu.

## Tham khảo Warehouse AI

Đã đọc gói `warehouse-ai-chatbot-ai-hotfix-2026-09-29.zip`: `app/ai/provider.py`, `adapter.py`, `query_router.py`, `prompts.py`, `schemas/ai.py`, `AssistantPage.tsx`. Giữ nguyên nguyên tắc: backend tính số liệu, đầu ra mô hình có cấu trúc được kiểm tra, provider lỗi thì fallback có nhãn rõ, lịch sử và xuất báo cáo.

Trong HOMESTAY, mô hình chỉ định tuyến ý định/topic hợp lệ; không sinh SQL hoặc số tiền. Dịch vụ đọc lại dữ liệu và quyền trước khi lưu kết quả. Truy xuất chính sách/hướng dẫn theo các chủ đề của ứng dụng; không triển khai vector database hoặc huấn luyện model riêng. Số liệu/bảng/khuyến nghị theo quy tắc do backend tạo, không phải dự báo của mô hình.

## Bật mô hình AI

Sau cập nhật và `npm ci`, chạy trong Git Bash tại thư mục HOMESTAY:

```bash
bash scripts/setup-ai.sh
```

- Chọn **1** để dùng Groq. Model mặc định `openai/gpt-oss-20b`; có thể nhập model mà tài khoản được phép dùng. Nhập API key ở dòng kín. Dùng cùng Groq key của Warehouse nếu muốn; không chép `.env` Warehouse đè `.env` HOMESTAY.
- Chọn **2** để dùng Ollama. Đảm bảo Ollama đang chạy và model đã có trên máy. Mặc định `qwen2.5-coder:7b`, có thể nhập `qwen3:4b` hoặc model khác bạn đã cài. URL mặc định `http://127.0.0.1:11434/v1`.
- Chọn **3** để giữ chế độ tra cứu dữ liệu theo quy tắc. Không có model AI hoạt động trong chế độ này; giao diện báo rõ.

Thiết lập kiểm tra một câu hỏi mẫu trước khi lưu. Lỗi kết nối/key/model/JSON không ghi `.env`. Cấu hình MongoDB, JWT, SMTP hiện có được giữ; bản cũ được sao lưu trong `backups/ai`, có ignore để không commit secret. Dừng server và khởi động lại sau khi lưu.

```bash
npx --yes --package=node@22 -c "node server.js"
```

Đăng nhập rồi mở `http://localhost:3001/assistant.html` (hoặc cổng được server in ra). Không cần chạy seed lại để thêm AI.

Tài liệu nhà cung cấp: https://console.groq.com/docs/text-chat, https://console.groq.com/docs/models, https://docs.ollama.com/api/openai-compatibility. PDF sử dụng PDFKit và DejaVu Sans nhúng để giữ tiếng Việt: https://pdfkit.org/docs/text.html. License font ở `public/assets/fonts/DEJAVU_LICENSE.txt`.

## Thử nhanh

1. Admin: “Báo cáo tháng 10/2026”, “Báo cáo năm 2026”, “Còn tháng trước?”. Đối chiếu nguồn/kỳ, trả lời “Có” rồi chọn Excel/PDF.
2. Khách: “Tìm phòng từ 20/10 đến 22/10 cho 2 khách”, “Booking của tôi”, “Giờ nhận phòng là khi nào?”. Ngày ngắn dd/MM dùng năm hiện tại; ngày quá khứ không được dùng cho tìm phòng.
3. Lễ tân: “Khách đến hôm nay”, “Khách trả phòng ngày mai”, “Gợi ý việc cần xử lý”. Hỏi báo cáo doanh thu sẽ bị từ chối nếu không có reports.view.
4. Buồng phòng: “Phòng nào cần dọn?”. Hỏi booking/báo cáo phải bị từ chối.
5. Chủ homestay: chọn cơ sở được cấp; cơ sở khác bị chặn. Bỏ quyền/cơ sở rồi mở lại kết quả cũ hoặc tải lại: dữ liệu bị che/chặn.
6. Tạo cuộc mới, đổi tên, reload, xoá. Tài khoản khác không được đọc cuộc trò chuyện này.
7. Tắt provider/nhập key sai trong cấu hình kiểm thử: kết quả cơ bản vẫn lấy từ hệ thống và giao diện ghi chế độ dữ liệu.

## Ranh giới dữ liệu

Mô hình nhận câu hỏi đã che email, chuỗi số giấy tờ/điện thoại và key theo mẫu; không nhận database, danh sách khách, lịch sử trả lời hoặc thông tin đăng nhập. Việc che tự động không thể bảo đảm nhận diện mọi thông tin riêng tư tự do, vì vậy không nhập mật khẩu/giấy tờ vào câu hỏi. Key chỉ nằm phía server.

AI không tự sửa booking, phòng, giá, ghi cọc, chuyển khoản, gửi email hoặc tạo hoá đơn. Mỗi câu trả lời được tính theo dữ liệu tại thời điểm ghi trên kết quả. Tối đa 20 câu/5 phút/tài khoản; một yêu cầu đang xử lý; thử lại cùng mã không tạo cặp tin nhắn trùng.

Nhật ký chat không được đưa vào `/api/admin/state`. Chỉ chủ cuộc chat xem được lịch sử. Mỗi lần đọc/xuất lại kiểm tra quyền và danh sách cơ sở hiện tại; báo cáo cần quyền reports.export để tải.

## Sửa kết nối Groq 1.4.1

Mặc định chuyển sang `openai/gpt-oss-20b` như Warehouse. `llama-3.3-70b-versatile` đã ngừng cho gói Free/Developer ngày 16/08/2026; khách Enterprise có hợp đồng được miễn. Nguồn: https://console.groq.com/docs/deprecations.
GPT-OSS dùng `max_completion_tokens=2048`, `reasoning_effort=low`, `include_reasoning=false`; vẫn kiểm tra JSON intent/topic, không lấy số liệu do model tự sinh. Tham số: https://console.groq.com/docs/reasoning và https://console.groq.com/docs/api-reference.
Script báo HTTP 401/key, 403/quyền, 404/model, 429/hạn mức, 400/tham số; tách DNS/TLS/timeout/mạng, phản hồi sai và hết token. Không in key, lỗi gốc hoặc nội dung phản hồi nhà cung cấp. Lỗi xác minh không ghi `.env`.
Chạy lại `bash scripts/setup-ai.sh`, chọn 1, nhấn Enter giữ model GPT-OSS và nhập Groq key kín. Không cần chạy lại setup-email hoặc seed dữ liệu.

## Chat nổi 1.4.2

Sau đăng nhập, nút chat tròn xuất hiện trên các trang khách và quản trị. Bấm để mở/thu gọn; kéo nút tròn hoặc thanh tiêu đề để di chuyển. Phím mũi tên trên nút/tiêu đề cũng di chuyển; Escape thu gọn. Vị trí và trạng thái mở được nhớ theo tài khoản trong tab, tự giới hạn vào màn hình khi đổi kích thước. Không hiển thị chat trùng trên trang Trợ lý AI.
Khung nhỏ dùng cùng API và lịch sử riêng; mở khung không tạo thêm cuộc chat trống. Chuyển trang giữ cuộc trò chuyện đang chọn; thu gọn giữ khung và câu hỏi đang nhập. Lựa chọn cơ sở của AI không đổi cơ sở ở màn hình nghiệp vụ.
Bảng hơn 3 cột, hơn 5 dòng hoặc hơn 4 chỉ số có bản tóm tắt trong khung nhỏ và liên kết **Bấm vào đây để chuyển sang màn hình lớn hơn**. Liên kết mở đúng cuộc trò chuyện và tin nhắn ở trang Trợ lý AI; trang lớn giữ bảng, phân trang, PDF/Excel và lịch sử đầy đủ. Nút ↗ trên tiêu đề luôn mở màn hình lớn.
Chỉ `/assistant.html` được nhúng từ cùng origin (SAMEORIGIN + CSP frame-ancestors self). Các trang khác vẫn chặn nhúng; thông điệp giữa khung nhỏ và trang cha kiểm tra origin và cửa sổ gửi. Phiên hết hạn đóng widget; API vẫn kiểm tra vai trò/phạm vi/tài khoản mỗi lần.

## Hội thoại và tư vấn phòng 1.5.0

- “Gợi ý phòng cho 4 người” trả về tối đa 6 phương án dạng thẻ. Chưa có số người thì hỏi lại, chưa có ngày thì chỉ đưa giá ngày thường tham khảo và nói rõ chưa kiểm tra phòng trống.
- Bấm loại phòng hoặc nhắn “Phòng thứ 1”/tên loại phòng để xem mô tả, diện tích, sức chứa, tiện nghi đã cập nhật, giờ nhận/trả và liên kết xem ảnh/đặt phòng. Hỏi tiếp số người, ngày và số đêm giữ loại phòng đang chọn; số khách mới thay số cũ.
- Nhóm lớn có phương án nhiều phòng cùng loại, chia khách không vượt sức chứa, cộng giá từng phòng và phụ thu. Không gán cả nhóm vào một phòng quá sức chứa. Kiểm tra số phòng trong danh mục, và lịch trống khi có ngày. Mỗi phòng vẫn cần một booking riêng; chưa hỗ trợ ghép nhiều loại phòng tự động.
- Câu trả lời trò chuyện thân thiện hơn; nguồn/thời điểm nằm trong mục mở rộng. Mô hình vẫn chỉ hỗ trợ phân loại; backend dựng lời trả lời và tính dữ liệu, không gửi danh mục/phòng/giá/tiện nghi hoặc câu trả lời cũ cho nhà cung cấp. Không phải hội thoại sinh tự do với mọi chủ đề.
- Excel/PDF ẩn mặc định. Kết quả có bảng dữ liệu và đủ quyền xuất mới hỏi “Bạn có muốn xuất kết quả này thành file Excel hoặc PDF không?”. Bấm “Có, xuất file” hoặc nhắn “Có” mới hiện lựa chọn. “Để sau” giữ nội dung trong chat. Có thể yêu cầu xuất file sau đó hoặc ngay trong câu hỏi báo cáo.
- Nút xuất gắn vào đúng kết quả nguồn trong cùng cuộc trò chuyện, giữ số liệu và thời điểm đã nhận. API tải file được bảo vệ bởi quyền và chủ cuộc chat; việc ẩn nút là trải nghiệm hội thoại, không thay cơ chế phân quyền. Thu hồi reports.export thì không còn hiện định dạng báo cáo và không tải được.
- Chọn thẻ phòng kiểm tra lại nguồn hội thoại, loại phòng còn hoạt động và cơ sở được phép. Chọn thẻ cũ giữ đúng nhóm/ngày của thẻ đó. Không tự tạo booking/ghi tiền/sửa trạng thái.
- “Số lượng phòng có khách” là trạng thái OCCUPIED hiện tại; thêm khoảng ngày là số phòng khác nhau gắn với booking CHECKED_IN/COMPLETED có lịch lưu trú giao kỳ. Mỗi phòng chỉ đếm một lần; lịch sử này không chứng minh giờ sử dụng thực tế. Cần reports.view; khách và lễ tân không được xem nếu chưa cấp quyền.

Thử: “Gợi ý phòng cho 4 người” → chọn thẻ → “2 khách” → “Nhóm mình ở 2 đêm từ ngày mai”. Xuất: “Báo cáo tháng này” → “Có” → chọn Excel/PDF. Kiểm thử hiện tại: `docs/TEST_AI_1_5_0.txt`; các tài liệu TEST_AI_1_4_* là kết quả các bản trước.
