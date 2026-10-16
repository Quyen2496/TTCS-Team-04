# HOMESTAY 1.7.0 — hoàn thiện Sprint 3 trước Sprint 4

Bản sửa dành cho **HOMESTAY full độc lập**, không phải nhánh frontend của nhóm.

## Phương án và kết quả

| Hạng mục | Cách xử lý |
|---|---|
| Header/footer điện thoại | Menu dạng ngăn kéo, vùng chạm tối thiểu 44px, logo gọn, footer xếp dọc; đóng menu khi chọn liên kết hoặc Escape. |
| Đồng ý chính sách trước đặt phòng | Nút gửi bị khoá đến khi có báo giá và khách tích đồng ý. Server vẫn kiểm tra chính sách để ngăn gửi trực tiếp API. |
| Đặt cọc / QR payOS | Lấy số tiền từ booking trên server; tạo lệnh có hạn; hiển thị QR và trang thanh toán do payOS trả về. |
| Cọc còn thiếu / tổng còn thanh toán | Hiển thị riêng cọc yêu cầu, cọc đã nhận, cọc còn cần chuyển và tiền còn thanh toán tại đặt phòng, tra cứu, tài khoản và thanh toán. |
| Xác nhận giao dịch | Xác minh chữ ký webhook hoặc phản hồi API bằng SDK chính thức. Mỗi tham chiếu chỉ ghi một bút toán. Redirect, ảnh chuyển khoản và nút bấm của khách không tự ghi tiền. |
| Chuyển thiếu, trùng, trễ hoặc booking đổi | Ghi tiền hợp lệ một lần; huỷ/đối chiếu lệnh cũ trước QR mới. Giao dịch vượt tiền hoặc booking hết hạn/đã đổi đưa vào đối soát; không khôi phục booking. |
| Lịch sử đổi booking | Modal có dòng thời gian, người sửa, thời điểm, so sánh trước/sau, chênh lệch tổng tiền và cọc giữ nguyên. |
| Giấy tờ khách | Hồ sơ tài khoản và form đặt phòng có giấy tờ tuỳ chọn. Booking cũ có nút bổ sung từ hồ sơ. Lễ tân được điền sẵn và vẫn phải đối chiếu giấy tờ thật. |
| Sơ đồ phòng | Chọn Từ ngày / Đến ngày, tối đa 31 ngày bao gồm hai đầu; ngày trả phòng không chiếm thêm một đêm. |
| AI | Bỏ phân trang bảng trong cửa sổ lớn; khung nhỏ giữ liên kết chuyển sang màn hình lớn. Vẫn giữ giới hạn dữ liệu mỗi truy vấn và phân quyền server. |
| Production VPS Docker | Có Dockerfile Node 22, Compose, proxy HTTPS Caddy, healthcheck và hướng dẫn. Chưa triển khai lên máy chủ thật. |

Thông tin giấy tờ không xuất hiện trong kết quả đăng nhập, session người dùng, tra cứu công khai hoặc dữ liệu gửi cho payOS. Thông tin khách chỉ được đọc bởi chính khách hoặc nhân viên có quyền và trong đúng homestay.

## Cập nhật bản full trên Windows

Dừng server bằng Ctrl+C. Giải nén HOMESTAY_AI_UPDATE.zip thành thư mục
`D:/CodeGym_project/HOMESTAY_AI_UPDATE` rồi chạy trong Git Bash:

```bash
(
set -e
update_script="$(find "/d/CodeGym_project/HOMESTAY_AI_UPDATE" -type f -name "apply-update.cjs" -print -quit)"
test -n "$update_script"
node "$update_script" "D:/CodeGym_project/HOMESTAY/HOMESTAY"
cd "/d/CodeGym_project/HOMESTAY/HOMESTAY"
npm ci --no-audit --no-fund
npx --yes --package=node@22 -c "node server.js"
)
```

Updater sao lưu mã nguồn trước khi ghi, giữ `.env`, dữ liệu, ảnh tải lên và cấu hình `deploy/.env.production` hiện có. Không cần chạy lại thiết lập email/AI hoặc seed dữ liệu. Dùng Ctrl+F5 sau khi mở web.

## Cấu hình payOS

1. Tạo tài khoản/kênh tại [my.payos.vn](https://my.payos.vn), liên kết tài khoản nhận tiền và lấy Client ID, API Key, Checksum Key của **cùng một kênh**. Không dùng Groq API key.
2. Admin → Giá & chính sách → Cấu hình chuyển khoản: xem mã homestay. Mỗi kênh được ràng buộc với đúng homestay; không sao chép tài khoản ngân hàng của cơ sở khác.
3. Trên máy local: `bash scripts/setup-payos.sh`. Nhập mã homestay, URL và ba thông tin kênh tại terminal; không gửi key qua chat. Script sao lưu `.env` và giữ cấu hình email/AI/MongoDB.
4. Khởi động lại server. Trong cấu hình chuyển khoản, chọn payOS, tên kênh `default`, bật chuyển khoản và lưu.
5. Website production phải có HTTPS công khai. Đăng ký webhook `https://TEN_MIEN/api/webhooks/payos/default` bằng lệnh `node scripts/confirm-payos-webhook.js default` sau khi website đã chạy. localhost không nhận webhook từ payOS; chỉ có thể kiểm tra trạng thái bằng API khi bấm Cập nhật trạng thái.
6. Nhiều homestay: dùng `PAYOS_CHANNELS_JSON` trong môi trường server, mỗi key trỏ tới `{homestayId,clientId,apiKey,checksumKey}`. Trong UI chỉ nhập tên key; không nhập secret vào UI. Thay `default` trong đường dẫn webhook và lệnh đăng ký theo tên kênh.

Luồng khách: booking → Đặt cọc → Tạo QR payOS → quét bằng ứng dụng ngân hàng hoặc mở trang payOS → quay lại theo dõi. Trang tự đọc trạng thái 8 giây/lần; **Cập nhật trạng thái** đối chiếu trực tiếp API để khôi phục giao dịch khi webhook chậm/mất.

Nếu khách chuyển thiếu, hệ thống ghi phần đã xác minh, báo phần còn thiếu và đối chiếu/huỷ lệnh cũ trước khi tạo QR cho phần thiếu. Nếu timeout khi tạo lệnh, hệ thống giữ orderCode để tránh tạo trùng; dùng cập nhật/huỷ QR để kiểm tra trước khi tạo lại.

Giao dịch cần đối soát: Booking & khách → Đối soát payOS. Nhân viên có quyền chọn ghi nhận cọc sau khi kiểm tra ngân hàng, hoặc ghi **cần hoàn tiền**. Quyết định cần hoàn chỉ lưu việc cần xử lý; **không thực hiện chuyển khoản hoàn tiền**. payOS ghi tiền không đồng nghĩa tự xác nhận booking.

Chế độ QR thủ công vẫn có thể chọn; thông báo đã chuyển của khách chỉ chờ nhân viên đối soát như phiên bản trước.

## Kiểm thử và điều kiện nghiệm thu

- `npm test`: test dữ liệu, quyền, booking, hồ sơ, tiền cọc, giao dịch trùng/giả/trễ, timeout và đối soát. Test MongoDB chuyên biệt cần URI kiểm thử replica set riêng.
- Bộ kiểm tra trình duyệt dùng API app thật và merchant payOS giả lập, kiểm tra mobile, chính sách, hồ sơ/nhận phòng, lịch sử, sơ đồ, AI và QR.
- Chưa kiểm thử giao dịch ngân hàng thật, webhook của kênh thật, Docker build hay VPS thật trong môi trường này. Cần nghiệm thu các bước sau trên staging/production có cấu hình thật: tạo QR; chuyển khoản booking thử đã kiểm tra tiền; kiểm tra chữ ký webhook và cọc; kiểm tra số cọc không tăng khi webhook gửi lại; đổi ngày/huỷ khi chưa trả; chuyển trễ đưa vào đối soát; đăng nhập/quên mật khẩu/AI; ảnh tải lên tồn tại sau restart container.
- Chỉ kết luận Sprint 3 sẵn sàng production khi đã nghiệm thu thực tế và triển khai theo `deploy/README.md`.

Nguồn tích hợp: [payOS API](https://payos.vn/docs/api/), [SDK Node.js chính thức](https://github.com/payOSHQ/payos-lib-node), [Compose health dependencies](https://docs.docker.com/compose/how-tos/startup-order/), [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy). Đối chiếu ngày 14/10/2026.
