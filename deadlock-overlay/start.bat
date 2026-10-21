@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js не найден. Установи его с https://nodejs.org и запусти этот файл снова. & pause & exit /b 1)
if not exist node_modules (
  echo Первый запуск: ставлю зависимости, это займёт пару минут...
  call npm install || (echo Ошибка установки. & pause & exit /b 1)
)
call npm start
