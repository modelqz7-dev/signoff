@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js not found. Install it from https://nodejs.org and run this file again. & pause & exit /b 1)
echo Checking dependencies (first run takes a couple of minutes)...
call npm install --no-audit --no-fund || (echo Install failed. & pause & exit /b 1)
call npm start
