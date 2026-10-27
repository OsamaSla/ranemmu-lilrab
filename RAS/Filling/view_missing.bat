@echo off
rem View missing (half-punch) time entries: calendar -> table on screen. Read only, never writes.
cd /d "%~dp0"
python "%~dp0fill_attendance.py" --check %*
pause
