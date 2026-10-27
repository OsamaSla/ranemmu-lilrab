@echo off
REM Opens the combined all-employee report in the default browser.
REM On that page: Ctrl+P -> "Save as PDF" -> one file with all employees.
cd /d "%~dp0"
start "" "report_09-2026\all.html"