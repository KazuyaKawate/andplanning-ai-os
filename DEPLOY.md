# デプロイ手順書

## 1. サーバー要件
- Ubuntu 24.04+
- Docker & Docker Compose
- 公開用グローバルIP (167.86.69.92)

## 2. 初期セットアップ
1. リポジトリのクローン
2. `.env` ファイルの作成 (`backend/.env.example` を参照)
3. `docker compose up -d --build`

## 3. SSL証明書の取得 (Certbot)
DNSが浸透した後、以下のコマンドを実行して証明書を取得します。
```bash
docker run --rm \
  -v /opt/andPlanning-ai-os/certbot/conf:/etc/letsencrypt \
  -v /opt/andPlanning-ai-os/certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d ap-aios.com -d www.ap-aios.com \
  --email info@andplanning.com --agree-tos --non-interactive
```
取得後、`nginx.conf` を HTTPS モード（バックアップ参照）に戻して再起動します。

## 4. 更新
```bash
git pull origin master
docker compose up -d --build
```
