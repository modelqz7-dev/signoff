@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js not found. Install it from https://nodejs.org & pause & exit /b 1)
call npm install --no-audit --no-fund || (echo Install failed. & pause & exit /b 1)
if "%~1"=="" (
  call npx electron tools/audit.js "https://www.deadchaps.gg/?utm_source=deadlock-api.com&utm_medium=referral"
) else (
  call npx electron tools/audit.js %*
)
echo.
echo Send the files from the audit-out folder to Claude.
pause
