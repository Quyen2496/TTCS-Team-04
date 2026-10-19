#!/usr/bin/env bash
set -euo pipefail
set +x
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ -t 0 ]]; then exec 3<&0; elif { exec 3</dev/tty; } 2>/dev/null; then :; else echo 'Chạy trực tiếp trong cửa sổ Git Bash để nhập cấu hình.'; exit 1; fi
trap 'unset ai_key' EXIT
echo 'THIẾT LẬP TRỢ LÝ AI HOMESTAY'
echo '1. Groq: dùng API key, giống AI Warehouse.'
echo '2. Ollama: dùng model đang chạy trên máy.'
echo '3. Chỉ tra cứu dữ liệu theo quy tắc, chưa bật mô hình AI.'
read -r -u 3 -p 'Chọn 1/2/3 [1]: ' ai_choice
ai_key=''; ai_base=''; ai_model=''
case "${ai_choice:-1}" in
 1) ai_provider='groq'; read -r -u 3 -p 'Model [openai/gpt-oss-20b]: ' ai_model; read -r -s -u 3 -p 'Groq API key (không hiện ký tự): ' ai_key; echo ;;
 2) ai_provider='ollama'; read -r -u 3 -p 'Model [qwen2.5-coder:7b]: ' ai_model; read -r -u 3 -p 'URL [http://127.0.0.1:11434/v1]: ' ai_base ;;
 3) ai_provider='disabled' ;;
 *) echo 'Chọn 1, 2 hoặc 3.'; exit 1 ;;
esac
echo 'Đang kiểm tra một câu hỏi mẫu trước khi lưu cấu hình…'
HS_AI_PROVIDER="$ai_provider" HS_AI_MODEL="$ai_model" HS_AI_KEY="$ai_key" HS_AI_BASE="$ai_base" node "$script_dir/setup-ai.js"
