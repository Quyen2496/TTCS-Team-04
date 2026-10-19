# Deploy HOMESTAY 1.7.0 — VPS Docker + HTTPS

Bộ cấu hình đã chuẩn bị; chưa có tên miền, địa chỉ VPS hoặc quyền truy cập máy chủ để công bố website thật. Môi trường tạo bản cập nhật chưa có Docker engine nên chưa chạy build/container. Các lệnh dưới đây được thực hiện trên VPS Linux đã cài Docker Engine và Compose plugin.

## Chuẩn bị

- Tên miền trỏ DNS A/AAAA đúng địa chỉ VPS; chỉ giữ AAAA nếu VPS phục vụ IPv6. Mở inbound 80/TCP, 443/TCP (443/UDP tuỳ chọn); không công khai cổng 3001.
- MongoDB replica set/Atlas hỗ trợ transaction, tài khoản DB riêng đủ quyền trên database HOMESTAY production. Cho phép đúng IP public outbound của VPS trong Atlas Network Access; không tắt kiểm tra TLS.
- Sao lưu database và thư mục ảnh trước khi chuyển môi trường. Với dữ liệu hiện tại, dùng bản sao database lên database production riêng để kiểm thử và chốt thời điểm chuyển; không chạy seed/reset trong database đang phục vụ khách.
- Tài khoản admin phải có mật khẩu riêng, không dùng tài khoản demo. Bản full chưa có admin thì dùng script tạo admin riêng bên dưới; không dùng seed tạo tài khoản demo. Website production tự chặn khởi động khi thiếu admin hoặc có tài khoản đang bật dùng mật khẩu demo. Trước khi chuyển, đổi mật khẩu hoặc khoá các tài khoản demo trên bản DB chuẩn bị, kể cả lễ tân/báo cáo/chủ homestay/buồng phòng. Không đưa `.env` vào Git hoặc ZIP gửi người khác.

## Cài đặt

Giải nén `HOMESTAY_PRODUCTION_1_7_0.zip` trên VPS, vào thư mục HOMESTAY và chạy:

```bash
cp deploy/.env.production.example deploy/.env.production
chmod 600 deploy/.env.production
mkdir -p deploy/var/uploads deploy/var/backups
sudo chown -R 1000:1000 deploy/var
```

Điền `deploy/.env.production` trực tiếp trên máy chủ: DOMAIN, ACME_EMAIL, PUBLIC_BASE_URL, APP_URL, URI MongoDB, JWT_SECRET riêng (tối thiểu 32 ký tự). Có thể tạo secret bằng `openssl rand -hex 32`. Giữ URL cùng tên miền HTTPS; thông tin payOS phải cùng một kênh và đúng mã homestay. Email/AI lấy từ cấu hình đang dùng và nhập riêng; không nằm trong bộ mã nguồn này.

Copy **toàn bộ ảnh thực tế** từ `public/assets/uploads` trên máy Windows sang `deploy/var/uploads` trên VPS, giữ nguyên tên tệp/đường dẫn tương đối. Database chỉ chứa đường dẫn ảnh; không chứa byte ảnh. Thiếu bước copy này thì phòng vẫn thiếu ảnh dù đã có dữ liệu ảnh trong DB. Sau khi copy, đặt lại owner UID 1000 cho thư mục ảnh.

Không cần copy `.env` của local lên thư mục root VPS. Production chỉ sử dụng env_file riêng ở deploy. Không đưa `.env` vào image Docker.

```bash
docker compose --env-file deploy/.env.production -f deploy/compose.production.yaml config --quiet
docker compose --env-file deploy/.env.production -f deploy/compose.production.yaml build
```

Kiểm tra định dạng cấu hình bằng Node 22 trên VPS trước khi khởi động:

```bash
npm ci --no-audit --no-fund
node deploy/check-production.cjs
docker compose --env-file deploy/.env.production -f deploy/compose.production.yaml up -d
docker compose --env-file deploy/.env.production -f deploy/compose.production.yaml ps
```

Không dùng `docker compose config` không có `--quiet` khi chia sẻ màn hình/log vì có thể in secret đã nội suy. Preflight chỉ kiểm tra định dạng, không chứng minh Atlas/payOS/DNS hoạt động. VPS cần Node22 để chạy kiểm tra định dạng ở trên; không copy node_modules từ Windows.

## Tạo admin nếu database mới chưa có tài khoản

Sau build, chạy container chuẩn bị (chưa mở proxy) bằng terminal riêng trên VPS:

```bash
docker compose --env-file deploy/.env.production -f deploy/compose.production.yaml run --rm --no-deps app bash scripts/create-production-admin.sh
```

Nhập mật khẩu riêng ngay tại terminal, ký tự không hiển thị. Script chỉ thêm tài khoản nếu username/email chưa tồn tại; không seed/reset DB và không ghi đè admin có sẵn. Nếu các tài khoản demo đang bật, sửa/khoá chúng trên bản chuẩn bị trước khi `up -d`.

## Nghiệm thu

- Mở `https://TEN_MIEN/api/ready`: HTTP 200 khi backend và DB sẵn sàng. Proxy chỉ khởi động sau app healthy; chứng chỉ HTTPS do Caddy cấp khi DNS/cổng đúng.
- Đăng nhập bằng tài khoản production, kiểm tra booking/phân quyền, ảnh phòng, quên mật khẩu và AI.
- Trong Admin chọn đúng homestay, đổi Cách nhận cọc thành payOS và bật nhận cọc. Sau đó đăng ký webhook:

```bash
docker compose --env-file deploy/.env.production -f deploy/compose.production.yaml exec app node scripts/confirm-payos-webhook.js default
```

- Thực hiện giao dịch booking thử qua kênh thật sau khi đã kiểm tra số tiền/tài khoản. Kiểm tra webhook, cọc còn thiếu, giao dịch không ghi trùng và luồng đối soát.
- Restart app; kiểm tra dữ liệu/ảnh vẫn còn. Dữ liệu booking lưu MongoDB, ảnh/backups bind mount, TLS Caddy lưu volume riêng.

## Cập nhật và quay lại

Sao lưu DB và ảnh trước cập nhật. Giữ nguyên `deploy/.env.production`, `deploy/var` và các volume TLS. Lưu thư mục mã nguồn bản trước để quay lại. Rebuild/up app bằng cùng Compose; kiểm tra `/api/ready` và các luồng nghiệm thu. Không chạy `down -v` hoặc xoá thư mục var để cập nhật thông thường. Quay lại mã nguồn cũ không tự khôi phục các giao dịch phát sinh mới; kiểm tra tương thích DB trước khi rollback.

Ứng dụng chạy non-root, Node22, host0.0.0.0 phía trong Docker; chỉ proxy HTTPS public. `TRUST_PROXY=1` ứng với một proxy Caddy và app không mở public port. Không đổi cấu hình proxy nếu chưa kiểm tra rate limit/IP.
