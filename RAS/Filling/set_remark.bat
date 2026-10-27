@echo off
rem Write a remark text onto the punches of a period.
rem   set_remark.bat "sick note"  -> text pre-filled, pick dates, click "Set remark"
rem   double-click                -> type the remark text in the window yourself
cd /d "%~dp0"
python "%~dp0fill_attendance.py" --remark %1
pause
