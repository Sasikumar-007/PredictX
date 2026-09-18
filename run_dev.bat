@echo off
title PredictX Launcher
echo ===================================================
echo             PredictX Local Development
echo ===================================================
echo.
echo [1/2] Launching Backend Server on http://127.0.0.1:8000 ...
start "PredictX Backend (FastAPI)" cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching Frontend Server on http://localhost:5173 ...
start "PredictX Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo Both servers are starting up in separate windows!
echo - Backend API:  http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs)
echo - Frontend App: http://localhost:5173
echo ===================================================
echo.
pause
