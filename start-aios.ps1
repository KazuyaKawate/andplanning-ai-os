# AIOS Launcher — Backend (FastAPI) + Frontend (Next.js) を起動してブラウザを開く

$PROJECT = "C:\Users\kazbi\Desktop\andplanning-ai-os"
$BACKEND  = "$PROJECT\backend"
$FRONTEND = "$PROJECT\website"
$UVICORN  = "$BACKEND\.venv\Scripts\uvicorn.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AIOS — AI Operating System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Backend ──────────────────────────────────────────────
Write-Host "[1/2] Backend 起動中 (port 8000)..." -ForegroundColor Yellow
Start-Process "cmd.exe" -ArgumentList "/k", "title AIOS Backend && cd /d `"$BACKEND`" && `"$UVICORN`" app.main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

Start-Sleep -Seconds 2

# ── Frontend ─────────────────────────────────────────────
Write-Host "[2/2] Frontend 起動中 (port 3000)..." -ForegroundColor Yellow
Start-Process "cmd.exe" -ArgumentList "/k", "title AIOS Frontend && cd /d `"$FRONTEND`" && npm run dev" -WindowStyle Normal

# ── ブラウザを開く ────────────────────────────────────────
Write-Host ""
Write-Host "サーバー起動を待機中 (5秒)..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Write-Host "ブラウザを開いています..." -ForegroundColor Green
Start-Process "http://localhost:3000/os/dashboard"

Write-Host ""
Write-Host "AIOS 起動完了!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000/os/dashboard" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "終了するには各ターミナルウィンドウを閉じてください。" -ForegroundColor Gray
