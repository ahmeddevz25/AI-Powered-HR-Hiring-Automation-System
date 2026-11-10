@echo off
echo ===================================================================
echo Starting AI-Powered HR Hiring Automation System (Backend + Frontend)
echo ===================================================================

start "HR Backend (FastAPI :8000)" cmd /k "cd /d d:\hr-hiring-automation\backend && C:\Users\AHMED\python\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
start "HR Frontend (React Vite :5173)" cmd /k "cd /d d:\hr-hiring-automation\frontend && C:\nvm4w\nodejs\npm.cmd run dev"

echo.
echo Backend API: http://127.0.0.1:8000/docs
echo Frontend UI: http://localhost:5173
echo.

