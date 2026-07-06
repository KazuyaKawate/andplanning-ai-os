# 障害対応手順書

## 1. サービスの停止
`http://ap-aios.com` が応答しない場合:
```bash
docker compose ps
```
Restarting になっているコンテナがあればログを確認します:
```bash
docker compose logs <service_name>
```

## 2. Nginx が起動しない
SSL証明書の期限切れまたは欠落が主な原因です。`nginx.conf` を HTTP モードにして一時的に復旧させてから証明書を更新してください。

## 3. データベース接続エラー
`db` コンテナのヘルスチェックを確認してください。ディスク容量不足により PostgreSQL が停止することがあります。

## 4. ワーカーの遅延
Celery ログを確認し、Redis への接続が維持されているか確認してください。
```bash
docker compose logs worker
```
