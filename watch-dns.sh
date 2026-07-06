#!/bin/bash

# watch-dns.sh
# DNS反映を監視し、反映後にSSLデプロイを自動実行

TARGET_IP="167.86.69.92"
DOMAIN="ap-aios.com"
LOG_FILE="logs/deploy.log"

echo "========================================"
echo "Starting DNS Watcher for $DOMAIN"
echo "Target IP: $TARGET_IP"
echo "========================================"

while true; do
  TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
  
  # DNS 解決 (Aレコード)
  CURRENT_IP=$(dig +short $DOMAIN @8.8.8.8 | tail -n1)
  WWW_IP=$(dig +short "www.$DOMAIN" @8.8.8.8 | tail -n1)
  
  echo "[$TIMESTAMP] Current IP: $CURRENT_IP (www: $WWW_IP)" >> "$LOG_FILE"
  
  if [ "$CURRENT_IP" == "$TARGET_IP" ]; then
    echo "[$TIMESTAMP] DNS MATCH DETECTED!" | tee -a "$LOG_FILE"
    
    # SSLデプロイ実行
    ./deploy_ssl.sh
    break
  fi
  
  # 5分待機
  sleep 300
done
