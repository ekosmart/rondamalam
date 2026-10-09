@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 atau lebih baru diperlukan untuk membuka game lokal ini.
  pause
  exit /b 1
)
if not exist "dist\index.html" (
  echo Build tidak ditemukan. Jalankan npm install dan npm run build dahulu.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:4173"
node server.mjs
pause
