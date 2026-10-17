@echo off
rem One-click exporter for the Firebase review sheet (English + German in one file).
rem Double-click this file, or drag a target .xlsx onto it to export to that path.
setlocal EnableDelayedExpansion
cd /d "%~dp0"
cd ..

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required on PATH. Install it from https://nodejs.org/ and retry.
  pause
  exit /b 1
)

rem Target file: drag-drop, else the default review sheet.
set "OUT=%~1"
if "%OUT%"=="" set "OUT=review\review-sheet.xlsx"

rem Firebase web config from .env.local (same file the app uses).
if exist .env.local (
  for /f "usebackq tokens=1* delims==" %%a in (".env.local") do (
    set "k=%%a"
    if defined k (
      if not "!k:~0,1!"=="#" (
        if not "%%b"=="" set "%%a=%%b"
      )
    )
  )
)
if "%EXPO_PUBLIC_FIREBASE_API_KEY%"=="" (
  echo Missing Firebase config. Copy .env.example to .env.local and fill it in.
  pause
  exit /b 1
)

echo.
echo Exporting Firebase + bundle to "%OUT%" (English + German)...
node scripts\export-review-sheet.mjs --lang both --out "%OUT%"
if errorlevel 1 (
  echo.
  echo Export failed - see errors above.
  pause
  exit /b 1
)

echo.
echo Done. Close the file in Excel first if it was open, then reopen to see the new columns/Search tab.
pause