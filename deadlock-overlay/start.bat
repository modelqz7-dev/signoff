@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js not found. Install it from https://nodejs.org and run this file again. & pause & exit /b 1)
if not exist node_modules (
  echo First run: installing dependencies, this takes a couple of minutes...
  call npm install || (echo Install failed. & pause & exit /b 1)
)
call npm start
