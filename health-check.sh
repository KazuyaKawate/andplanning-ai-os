#!/bin/bash

# health-check.sh
# AIOS 最終動作確認スクリプト

LOG_FILE="logs/deploy.log"
BASE_URL="https://ap-aios.com"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] Starting Health Check..." >> "$LOG_FILE"

paths=(
  "/"
  "/signup"
  "/pricing"
  "/faq"
  "/contact"
  "/terms"
  "/privacy"
  "/legal"
  "/os"
  "/login"
  "/os/dashboard"
  "/os/admin/beta"
  "/os/business"
)

errors=0

for path in "${paths[@]}"; do
  url="${BASE_URL}${path}"
  status=$(curl -o /dev/null -s -w "%{http_code}" "$url")
  
  if [ "$status" -eq 200 ] || [ "$status" -eq 302 ] || [ "$status" -eq 301 ]; then
    echo "  [PASS] $status - $path" >> "$LOG_FILE"
  else
    echo "  [FAIL] $status - $path" >> "$LOG_FILE"
    errors=$((errors + 1))
  fi
done

# API Health Check
api_status=$(curl -s "$BASE_URL/api/health" | grep -o '"status":"ok"')
if [ "$api_status" == '"status":"ok"' ]; then
  echo "  [PASS] API Health" >> "$LOG_FILE"
else
  echo "  [FAIL] API Health" >> "$LOG_FILE"
  errors=$((errors + 1))
fi

if [ "$errors" -eq 0 ]; then
  echo "========================================"
  echo "AIOS公開準備完了"
  echo "========================================"
  echo "[$TIMESTAMP] Health Check Result: ALL PASS" >> "$LOG_FILE"
  exit 0
else
  echo "Health Check Failed with $errors errors. Check $LOG_FILE"
  echo "[$TIMESTAMP] Health Check Result: FAILED ($errors errors)" >> "$LOG_FILE"
  exit 1
fi
