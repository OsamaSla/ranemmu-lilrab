@echo off
rem One-click publisher for the Firebase review sheet.
rem Usage: double-click, or drag an edited review .xlsx onto this file.
rem It checks the sheet first (dry run, writes nothing), then asks once
rem before publishing to Firebase. Password is masked and never saved.

setlocal EnableDelayedExpansion
cd /d "%~dp0"
cd ..

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required on PATH. Install it from https://nodejs.org/ and retry.
  pause
  exit /b 1
)

rem Sheet file: drag-drop target, else the default export. Optional 2nd
rem argument is the review language (de/en) for non-default exports.
set "SHEET=%~1"
if "%SHEET%"=="" set "SHEET=review\review-sheet.xlsx"
set "LANG=%~2"
if "%LANG%"=="" set "LANG=both"
if not exist "%SHEET%" (
  echo Sheet not found: %SHEET%
  echo Drag the edited .xlsx onto publish-review.cmd, or export first:
  echo   npm run export:review -- --out review\review-sheet.xlsx
  pause
  exit /b 1
)

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

rem Admin credentials (password entry is masked, kept in-process only).
if "%ADMIN_EMAIL%"=="" (
  set /p ADMIN_EMAIL=Admin email:
)
if "%ADMIN_PASSWORD%"=="" (
  for /f "delims=" %%p in ('powershell -NoProfile -Command "$s=Read-Host 'Admin password' -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))"') do set "ADMIN_PASSWORD=%%p"
)
if "%ADMIN_PASSWORD%"=="" (
  echo No password entered - aborting.
  pause
  exit /b 1
)

echo.
echo === Step 1 of 2: checking "%SHEET%" (dry run, nothing is written) ===
node scripts\import-review-sheet.mjs "%SHEET%" --lang %LANG%
if errorlevel 1 (
  echo.
  echo Fix the rows above, save the sheet, and double-click again.
  goto :cleanup
)

echo.
set "ANSWER="
set /p ANSWER=Publish these changes to Firebase [Y/N]?
if /i not "%ANSWER%"=="Y" goto :cleanup

echo.
echo === Step 2 of 2: publishing ===
node scripts\import-review-sheet.mjs "%SHEET%" --lang %LANG% --apply
if errorlevel 1 (
  echo Publish failed - see errors above.
  goto :cleanup
)
echo Published - every device picks the edits up live.

:cleanup
set "ADMIN_PASSWORD="
echo.
pause
