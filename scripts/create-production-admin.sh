#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
printf 'TẠO ADMIN RIÊNG — không đặt lại tài khoản đã có\n'
read -r -p 'Tên đăng nhập: ' HS_ADMIN_USERNAME
read -r -p 'Email thật: ' HS_ADMIN_EMAIL
read -r -p 'Họ tên: ' HS_ADMIN_NAME
read -r -s -p 'Mật khẩu riêng (từ 12 ký tự, có chữ và số): ' HS_ADMIN_PASSWORD
printf '\n'
read -r -s -p 'Nhập lại mật khẩu: ' HS_ADMIN_CONFIRM
printf '\n'
if [ "$HS_ADMIN_PASSWORD" != "$HS_ADMIN_CONFIRM" ]; then printf 'Mật khẩu không khớp.\n'; exit 1; fi
export HS_ADMIN_USERNAME HS_ADMIN_EMAIL HS_ADMIN_NAME HS_ADMIN_PASSWORD
node scripts/create-production-admin.js
unset HS_ADMIN_PASSWORD HS_ADMIN_CONFIRM HS_ADMIN_USERNAME HS_ADMIN_EMAIL HS_ADMIN_NAME
