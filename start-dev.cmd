@echo off
rem Ranemmu lil-Rab - one double-click dev setup:
rem   static PC preview on :8081 + Metro on :8082, then bundle warm-up.
cd /d "%~dp0"
start "preview :8081" cmd /k npx expo serve --port 8081
start "metro :8082" cmd /k npx expo start --port 8082
node scripts\warm-metro.mjs --port 8082
pause
