#!/usr/bin/env bash
set -euo pipefail
set +x
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ -t 0 ]]; then exec 3<&0; elif { exec 3</dev/tty; } 2>/dev/null; then :; else printf '%s\n' 'Chạy trực tiếp trong Git Bash/terminal.' >&2; exit 1; fi
printf '%s\n' 'THIẾT LẬP KÊNH PAYOS' 'Không gửi API key/checksum key qua chat. Mã homestay hiển thị tại Giá & chính sách → Tài khoản nhận cọc & QR.' >&2
read -r -p 'Mã homestay (24 ký tự): ' hs_payos_property <&3
read -r -p 'URL website (https://tenmien hoặc http://localhost:3001 khi dev): ' hs_payos_url <&3
read -r -s -p 'payOS Client ID: ' hs_payos_client <&3; printf '\n' >&2
read -r -s -p 'payOS API key: ' hs_payos_api <&3; printf '\n' >&2
read -r -s -p 'payOS Checksum key: ' hs_payos_checksum <&3; printf '\n' >&2
trap 'unset hs_payos_api hs_payos_checksum hs_payos_client' EXIT
HS_PAYOS_PROPERTY="$hs_payos_property" HS_PAYOS_URL="$hs_payos_url" HS_PAYOS_CLIENT="$hs_payos_client" HS_PAYOS_API="$hs_payos_api" HS_PAYOS_CHECKSUM="$hs_payos_checksum" node "$script_dir/setup-payos.js"
