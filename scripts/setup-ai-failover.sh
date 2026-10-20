#!/usr/bin/env bash
set -euo pipefail
set +x
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ -t 0 ]]; then exec 3<&0; elif { exec 3</dev/tty; } 2>/dev/null; then :; else echo 'Chạy trực tiếp trong Git Bash để nhập khoá.'; exit 1; fi
trap 'unset hs_groq_key hs_gemini_key' EXIT
echo 'GROQ + GEMINI: giữ nguyên MongoDB, email, payOS và lịch sử chat.'
read -r -u 3 -p 'AI chính: 1 Groq / 2 Gemini [1]: ' hs_primary
case "${hs_primary:-1}" in 1) hs_primary='groq';; 2) hs_primary='gemini';; *) echo 'Chọn 1 hoặc 2.'; exit 1;; esac
read -r -s -u 3 -p 'Groq API key (Enter để giữ khoá hiện tại): ' hs_groq_key; echo
read -r -s -u 3 -p 'Gemini API key (Enter để giữ khoá hiện tại): ' hs_gemini_key; echo
read -r -u 3 -p 'Groq model (Enter để giữ model hiện tại): ' hs_groq_model
read -r -u 3 -p 'Gemini model (Enter để tự chọn model có trong tài khoản): ' hs_gemini_model
HS_DUAL_PRIMARY="$hs_primary" HS_DUAL_GROQ="$hs_groq_key" HS_DUAL_GEMINI="$hs_gemini_key" HS_DUAL_GROQ_MODEL="$hs_groq_model" HS_DUAL_GEMINI_MODEL="$hs_gemini_model" node "$script_dir/setup-ai-failover.cjs"
