# バックアップ手順書

## 1. データベース (PostgreSQL)
バックアップの実行:
```bash
docker compose exec db pg_dump -U aios_user aios_db > backup_$(date +%F).sql
```
リストアの実行:
```bash
cat backup_XXX.sql | docker compose exec -T db psql -U aios_user aios_db
```

## 2. アップロードファイル
`backend/uploads` ディレクトリを定期的にアーカイブしてください。

## 3. 自動バックアップ (推奨)
cron を使用して毎日 `pg_dump` を実行し、外部ストレージに保存することを推奨します。
