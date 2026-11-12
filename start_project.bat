@echo off
echo ===================================================================
echo Starting AI-Powered HR Hiring Automation System (Backend + Frontend)
echo ===================================================================

set "SCRIPT_DIR=%~dp0"
set "PY_CMD=python"
if exist "C:\Users\AHMED\python\python.exe" set "PY_CMD=C:\Users\AHMED\python\python.exe"

set "NPM_CMD=npm.cmd"
if exist "C:\nvm4w\nodejs\npm.cmd" set "NPM_CMD=C:\nvm4w\nodejs\npm.cmd"

start "HR Backend (FastAPI :8001)" /D "%SCRIPT_DIR%backend" cmd /k "%PY_CMD% -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"
start "HR Frontend (React Vite :5173)" /D "%SCRIPT_DIR%frontend" cmd /k "call %NPM_CMD% run dev"

echo.
echo Backend API: http://127.0.0.1:8001/docs
echo Frontend UI: http://localhost:5173
echo.
