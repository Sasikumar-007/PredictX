# PredictX Local Development Server Runner
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "           PredictX Local Development              " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Starting Backend (FastAPI)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "[2/2] Starting Frontend (Vite)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "Servers started in separate windows!" -ForegroundColor Green
Write-Host "Backend API  : http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs)" -ForegroundColor Yellow
Write-Host "Frontend App : http://localhost:5173" -ForegroundColor Yellow
Write-Host "===================================================`n" -ForegroundColor Cyan
