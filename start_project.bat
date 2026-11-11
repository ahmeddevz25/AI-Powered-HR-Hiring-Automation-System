@echo off
echo ===================================================================
echo Starting AI-Powered HR Hiring Automation System (Backend + Frontend)
echo ===================================================================

set "SCRIPT_DIR=%~dp0"

start "HR Backend (FastAPI :8001)" cmd /k "cd /d ""%SCRIPT_DIR%backend"" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"
start "HR Frontend (React Vite :5173)" cmd /k "cd /d ""%SCRIPT_DIR%frontend"" && npm.cmd run dev"

echo.
echo Backend API: http://127.0.0.1:8001/docs
echo Frontend UI: http://localhost:5173
echo.
