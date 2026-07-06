#!/bin/bash

# deploy_ssl.sh
# SSL証明書の取得とNginxのHTTPS化

LOG_FILE="logs/deploy.log"
DOMAIN="ap-aios.com"
EMAIL="info@andplanning.com"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] Starting SSL Deployment..." >> "$LOG_FILE"

# 1. Certbot実行
echo "  Requesting SSL certificate..." >> "$LOG_FILE"
docker run --rm --name certbot \
  -v /opt/andPlanning-ai-os/certbot/conf:/etc/letsencrypt \
  -v /opt/andPlanning-ai-os/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d $DOMAIN -d "www.$DOMAIN" --email $EMAIL --agree-tos --non-interactive >> "$LOG_FILE" 2>&1

if [ $? -ne 0 ]; then
  echo "[$TIMESTAMP] SSL Certificate Request FAILED" >> "$LOG_FILE"
  exit 1
fi

# 2. Nginx 設定切り替え
echo "  Updating Nginx config to SSL mode..." >> "$LOG_FILE"
cp nginx.conf.ssl nginx.conf

# 3. Nginx 再起動
docker compose restart nginx >> "$LOG_FILE" 2>&1

# 4. HTTP -> HTTPS リダイレクト確認
echo "  Verifying HTTP to HTTPS redirect..." >> "$LOG_FILE"
redirect_status=$(curl -I -L -s -o /dev/null -w "%{url_effective}" http://$DOMAIN)
if [[ "$redirect_status" == https://* ]]; then
  echo "  [PASS] Redirected to $redirect_status" >> "$LOG_FILE"
else
  echo "  [FAIL] No HTTPS redirect detected ($redirect_status)" >> "$LOG_FILE"
  exit 1
fi

# 5. ヘルスチェック実行
./health-check.sh
