# Attendance Fill & Report Workflow (clean)

Files in this folder:
- fill_attendance.py / .bat  -> open DB, calendar pick, preview, fill exits
- view_missing.bat           -> view only: list missing (half-punch) time entries
- set_remark.bat             -> write a remark text onto the punches of a period
- make_report.py / .bat      -> read app's exported .xls, build HTML reports

Daily work (fill):
  1. Close the attendance app fully (end process, check no .ldb file in Database\).
  2. Double-click fill_attendance.bat.
  3. Pick start/end dates in calendar; Preview first (dry-run); confirm y.
  4. A new backup (RAS_backup_...mdb) is written; keep the 3 newest, rest deleted.
  5. Open app; query Raw tab; if needed, use Stat to recalculate.

Check missing time entries (never writes):
  1. Double-click view_missing.bat (or fill_attendance.py -> "View missing entries" button).
  2. Pick the period; the console lists every day with only ONE punch:
     DIN, name, date, the punch you have and the punch that is missing (entry/exit).
  3. Saturdays are listed separately (free day, ignored). 0-punch days are not listed.
  4. To fix what is listed: run fill_attendance.bat on the same period.

Set a remark on punches (the app's own remark option did not save for you):
  0. Close the attendance app fully first (same rule as fill - no .ldb file).
  1. Double-click set_remark.bat, or set_remark.bat "your text" to pre-fill it.
     In the calendar window: type the text, pick start/end, press "Set remark".
  2. Preview shows DIN, name, date, old -> new remark; then ask y/N.
  3. Backup is written first (same RAS_backup_... rule), then Remark is updated.
  4. Optional narrow-down: --din 7,10 updates only those employees.
     Re-running is safe: rows already carrying the same text are skipped.
  5. Open the app -> Raw tab to see if the remark shows (Stat to recalculate).

CLI equivalents (same script):
  python fill_attendance.py --check --start 2026-10-01 --end 2026-10-15
  python fill_attendance.py --remark "text" --start 2026-10-01 --end 2026-10-15 [--din 5,7] [--yes]

Daily work (report from export):
  1. Export from the app: Daily Att. -> .xls
  2. Place the .xls file in this folder.
  3. Double-click make_report.bat.
  4. Report folder created: report_MM-YYYY\ -> open all.html for all employees.

One PDF (all employees together):
  Open report_XX-YYYY/all.html in any browser -> Print -> Save as PDF.

Notes:
- Database: Database\RAS.mdb must stay alone in that folder (no RAS1.mdb copies).
- Do not swap database files between PCs (they are different snapshots).
- Fill only applies exit rows to single-punch workdays; zero-punch days are left untouched by design; tick "Also fill 0-punch days" in the calendar only when needed.
