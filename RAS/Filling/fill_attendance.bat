@echo off
rem Double-click launcher: opens calendar, previews, asks to proceed.
cd /d "%~dp0"
python "%~dp0fill_attendance.py"
pause
