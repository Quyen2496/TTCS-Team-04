#!/usr/bin/env bash
set -euo pipefail
# Never trace the password, even when invoked with bash -x.
set +x
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ -t 0 ]]; then
  exec 3<&0
elif { exec 3</dev/tty; } 2>/dev/null; then
  :
else
  printf '%s\n' 'Chạy lệnh này trực tiếp trong Git Bash hoặc terminal VS Code.' >&2
  exit 1
fi
printf '%s\n' 'THIẾT LẬP GỬI EMAIL HOMESTAY QUA GMAIL' 'Bước này kiểm tra SMTP và gửi 1 thư thử tới chính email bạn nhập.' 'Bật xác minh 2 bước và tạo mật khẩu ứng dụng tại https://myaccount.google.com/apppasswords.' 'Không dùng mật khẩu đăng nhập Google. Không gửi mật khẩu qua chat.' >&2
read -r -p 'Email Gmail/Google Workspace dùng GỬI mã: ' hs_setup_email <&3
read -r -s -p 'Mật khẩu ứng dụng (ký tự sẽ không hiện): ' hs_setup_password <&3
printf '\n' >&2
trap 'unset hs_setup_password' EXIT
HS_SETUP_EMAIL="$hs_setup_email" HS_SETUP_PASSWORD="$hs_setup_password" node "$script_dir/setup-email.js" --from-env
