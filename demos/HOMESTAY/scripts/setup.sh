#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then
  cp .env.example .env
  node -e 'const fs=require("fs"),crypto=require("crypto");fs.writeFileSync(".env",fs.readFileSync(".env","utf8").replace("replace-with-a-long-random-secret",crypto.randomBytes(48).toString("hex")));'
fi
if [ "${1:-}" = "--demo" ]; then
  node -e 'const fs=require("fs");fs.writeFileSync(".env",fs.readFileSync(".env","utf8").replace(/^DATA_MODE=.*$/m,"DATA_MODE=file"));'
elif [ "${1:-}" = "--mongo" ]; then
  node -e 'const fs=require("fs");fs.writeFileSync(".env",fs.readFileSync(".env","utf8").replace(/^DATA_MODE=.*$/m,"DATA_MODE=mongo"));'
fi
npm ci --no-audit --no-fund
npm run seed
printf '\nSẵn sàng: npm start — http://localhost:3001\n'
