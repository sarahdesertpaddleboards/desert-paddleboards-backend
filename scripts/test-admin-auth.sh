#!/usr/bin/env bash
set -e

echo "🔐 Logging in…"
curl -s -c cookies.txt \
  -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarahdesertpaddleboards@gmail.com","password":"3v3ryth1ng1sAw3s0m3!"}' \
  | grep '"success":true'

echo "👤 Fetching admin profile…"
curl -s -b cookies.txt http://localhost:3000/admin/me \
  | grep 'sarahdesertpaddleboards@gmail.com'

echo "✅ Admin auth regression test passed"
