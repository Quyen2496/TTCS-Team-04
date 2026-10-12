#!/usr/bin/env bash
set -e
source_dir="$(cd "$(dirname "$0")/.." && pwd -P)"
destination_dir="${1:-}"
if [ -z "$destination_dir" ] || [ ! -f "$destination_dir/package.json" ]; then
  echo "Cách dùng: bash scripts/install-pricing-update.sh /duong/dan/HOMESTAY"
  echo "Thư mục đích cần chứa package.json của bản HOMESTAY đang chạy."
  exit 1
fi
destination_dir="$(cd "$destination_dir" && pwd -P)"
files=(
  server.js src/domain.js src/pricing.js
  public/admin.html public/js/admin.js public/js/pricing-admin.js
  public/css/pricing.css public/modules/bookings/js/booking.js
  scripts/seed.js scripts/install-pricing-update.sh
  test/pricing.test.js docs/LICH_GIA_V3.md
)
for item in "${files[@]}"; do
  if [ ! -f "$source_dir/$item" ]; then echo "Thiếu tệp cập nhật: $item"; exit 1; fi
done
if [ "$source_dir" != "$destination_dir" ]; then
  mkdir -p "$destination_dir/data"
  existing=()
  for item in "${files[@]}"; do
    if [ -f "$destination_dir/$item" ]; then existing+=("$item"); fi
  done
  if [ "${#existing[@]}" -gt 0 ]; then
    backup="$destination_dir/data/pricing-code-backup-$(date +%Y%m%d-%H%M%S).tar"
    tar -C "$destination_dir" -cf "$backup" "${existing[@]}"
    echo "Đã sao lưu các tệp mã nguồn cũ trong data/."
  fi
  for item in "${files[@]}"; do
    mkdir -p "$destination_dir/$(dirname "$item")"
    cp "$source_dir/$item" "$destination_dir/$item"
  done
fi
echo "Đã cập nhật lịch giá. Giữ nguyên .env, tài khoản và booking hiện có."
echo "Tại thư mục HOMESTAY đích, chạy: npm run update-data && npm start"
