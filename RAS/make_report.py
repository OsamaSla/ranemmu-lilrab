# -*- coding: utf-8 -*-
"""Build printable attendance reports (HTML) from the app's Excel export.
Replicates the old VBA (Module2/test1) design:
  - one page per worker + a summary page + an all-in-one print page
  - net hours = (exit - entry) - 1h break; Fridays subtract 1.5h
  - Saturdays: yellow row, no calculation
  - missing punches: light-blue merged row
  - totals: total hours, presence days, absence days
Usage:
  double-click make_report.bat, or:
  python make_report.py [path\to\Daily Att.(....).xls]
Requires: pip install xlrd
"""
import calendar
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path

HEB_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
              "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]
HEB_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]


def hebrew_weekday(d):
    return HEB_DAYS[(d.weekday() + 1) % 7]  # Mon=0 -> Sun index 0


def parse_export(path):
    """Return (rows, warnings). rows = list of dict(uid,name,date,t1,t2,half)."""
    path = Path(path)
    rows = []
    if path.suffix.lower() in (".xlsx", ".xlsm"):
        import openpyxl
        wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
        ws = wb.worksheets[0]
        data = list(ws.iter_rows(min_row=2, values_only=True))
        wb.close()
    else:
        import xlrd
        wb = xlrd.open_workbook(str(path))
        ws = wb.sheet_by_index(0)
        data = []
        for r in range(1, ws.nrows):
            data.append(tuple(ws.cell_value(r, c) for c in range(min(ws.ncols, 5))))
    for rec in data:
        if not rec or rec[0] in (None, ""):
            continue
        uid = rec[0]
        if isinstance(uid, float):
            uid = int(uid)
        uid = str(uid).strip()
        name = str(rec[1]).strip() if len(rec) > 1 else ""
        dtxt = rec[2] if len(rec) > 2 else ""
        if isinstance(dtxt, datetime):
            d = dtxt.date()
        else:
            m = re.match(r"^\s*(\d{1,2})\D(\d{1,2})\s*$", str(dtxt))
            if not m:
                continue
            d = date(2000, int(m.group(2)), int(m.group(1)))
        t1 = str(rec[3]).strip() if len(rec) > 3 and rec[3] is not None else ""
        t2 = str(rec[4]).strip() if len(rec) > 4 and rec[4] is not None else ""
        rows.append({"uid": uid, "name": name, "date": d.replace(year=2000),
                     "raw_date": d, "t1": t1, "t2": t2,
                     "half": bool(t1) != bool(t2)})
    return rows


def detect_year(rows, export_path):
    """Year from export filename (yyyymmdd), else current year."""
    m = re.search(r"(20\d{2})(\d{2})(\d{2})", Path(export_path).name)
    y_exp, m_exp = (int(m.group(1)), int(m.group(2))) if m else \
                   (datetime.now().year, datetime.now().month)
    data_month = rows[0]["date"].month if rows else m_exp
    return y_exp if data_month <= m_exp else y_exp - 1


def hhmm_minutes(s):
    m = re.match(r"^(\d{1,2}):(\d{2})", s or "")
    return (int(m.group(1)) * 60 + int(m.group(2))) if m else None


def build_model(rows, year):
    """Group by worker -> per-day calc using the VBA rules."""
    warnings = []
    # real dates with year
    for r in rows:
        r["date"] = r["date"].replace(year=year)
    halfs = [r for r in rows if r["half"]]
    if halfs:
        warnings.append(" half-punches (entry without exit or vice versa): " +
                        ", ".join(f"{r['name']} {r['date'].strftime('%d/%m')}" for r in halfs[:12]) +
                        (" ..." if len(halfs) > 12 else ""))
    workers = {}
    order = []
    for r in rows:
        key = r["uid"]
        if key not in workers:
            workers[key] = {"uid": r["uid"], "name": r["name"], "days": {}}
            order.append(key)
        workers[key]["days"][r["date"].day] = r
    month = rows[0]["date"].month
    dim = calendar.monthrange(year, month)[1]
    out = []
    for key in order:
        w = workers[key]
        if len(w["days"]) != dim:
            warnings.append(f" {w['name']} (ID {w['uid']}): {len(w['days'])}/{dim} days in export")
        days = []
        total = 0.0
        present = 0
        saturdays = 0
        for day in range(1, dim + 1):
            d = date(year, month, day)
            wd = (d.weekday() + 1) % 7  # 6 = Saturday
            rec = w["days"].get(day)
            entry = {"d": d, "day_name": hebrew_weekday(d), "is_sat": wd == 6,
                     "is_fri": wd == 5, "t1": "", "t2": "", "net": None, "half": False}
            if rec:
                entry["t1"], entry["t2"], entry["half"] = rec["t1"], rec["t2"], rec["half"]
            if wd == 6:
                saturdays += 1
            elif rec and rec["t1"] and rec["t2"] and not rec["half"]:
                a, b = hhmm_minutes(rec["t1"]), hhmm_minutes(rec["t2"])
                if a is not None and b is not None and b > a:
                    net = (b - a - (90 if wd == 5 else 60)) / 60.0
                    entry["net"] = max(net, 0.0)
                    total += entry["net"]
                    present += 1
            days.append(entry)
        out.append({"uid": w["uid"], "name": w["name"], "days": days,
                    "total": total, "present": present, "saturdays": saturdays,
                    "absent": dim - present - saturdays, "month": month, "year": year})
    return out, warnings, dim


def fmt_hours(h):
    return f"{h:05.2f}"


def worker_html(w, dim):
    rows_html = []
    for e in w["days"]:
        cls = "sat" if e["is_sat"] else ("miss" if not e["t1"] else ("half" if e["half"] else ""))
        if e["is_sat"]:
            cells = f'<td class="date">{e["d"].strftime("%d/%m")}</td><td class="dayname satfill" colspan="5">שבת</td>'
        elif not e["t1"]:
            cells = (f'<td class="date">{e["d"].strftime("%d/%m")}</td>'
                     f'<td class="dayname">{e["day_name"]}</td>'
                     f'<td class="missfill" colspan="4"></td>')
        else:
            net = fmt_hours(e["net"]) if e["net"] is not None else ""
            cells = (f'<td class="date">{e["d"].strftime("%d/%m")}</td>'
                     f'<td class="dayname">{e["day_name"]}</td>'
                     f'<td class="time">{e["t1"]}</td>'
                     f'<td class="time">{e["t2"]}</td>'
                     f'<td class="time">{net and "" or ""}{"" if e["net"] is None else ""}</td>'
                     f'<td class="net">{net}</td>')
            # note: "שעות עבודה" column shows duration, VBA kept it as time diff
            a, b = hhmm_minutes(e["t1"]), hhmm_minutes(e["t2"])
            dur = ""
            if a is not None and b is not None and b > a:
                dur = f"{(b-a)//60:02d}:{(b-a)%60:02d}"
            cells = cells.replace('<td class="time"></td>', f'<td class="time">{dur}</td>')
        rows_html.append(f'<tr class="{cls}">{cells}</tr>')
    month_label = f'{HEB_MONTHS[w["month"]-1]} {w["year"]}'
    return f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>{w["name"]} - {month_label}</title>
<style>
{COMMON_CSS}
</style>
</head>
<body>
<section class="sheet">
  <div class="head"><span class="t">דוח שעות</span><h1>{w["name"]}</h1></div>
  <div class="body">
    <table class="att">
      <thead><tr><th>תאריך</th><th>יום</th><th>שעת כניסה</th><th>שעת יציאה</th><th>שעות עבודה</th><th>ש.ע. עשרוני</th></tr></thead>
      <tbody>
{chr(10).join("        " + r for r in rows_html)}
      </tbody>
    </table>
    <div class="month">{month_label}</div>
  </div>
  <table class="totals">
    <tr><td>סה"כ שעות</td><td class="big">{fmt_hours(w["total"])}</td></tr>
    <tr><td>ימי נוכחות</td><td class="big">{w["present"]}</td></tr>
    <tr><td>ימי העדרות</td><td class="big">{w["absent"]}</td></tr>
  </table>
  <button class="no-print" onclick="window.print()">הדפס</button>
</section>
</body>
</html>"""


def summary_html(workers, warnings, month, year, pages=True):
    month_label = f"{HEB_MONTHS[month-1]} {year}"
    rows = "\n".join(
        f'<tr><td>{w["uid"]}</td><td class="namecell"><a href="w_{w["uid"]}.html">{w["name"]}</a></td>'
        f'<td>{w["present"]}</td><td class="num">{fmt_hours(w["total"])}</td></tr>'
        for w in workers)
    warn = ""
    if warnings:
        warn = '<div class="warn">⚠' + "<br>".join(warnings) + "</div>"
    body_sections = ""
    if pages:
        secs = []
        for w in workers:
            inner_rows = []
            for e in w["days"]:
                if e["is_sat"]:
                    inner_rows.append(f'<tr><td class="date">{e["d"].strftime("%d/%m")}</td><td class="dayname satfill" colspan="5">שבת</td></tr>')
                elif not e["t1"]:
                    inner_rows.append(f'<tr><td class="date">{e["d"].strftime("%d/%m")}</td><td class="dayname">{e["day_name"]}</td><td class="missfill" colspan="4"></td></tr>')
                else:
                    a, b = hhmm_minutes(e["t1"]), hhmm_minutes(e["t2"])
                    dur = f"{(b-a)//60:02d}:{(b-a)%60:02d}" if (a is not None and b is not None and b > a) else ""
                    net = fmt_hours(e["net"]) if e["net"] is not None else ""
                    inner_rows.append(f'<tr><td class="date">{e["d"].strftime("%d/%m")}</td><td class="dayname">{e["day_name"]}</td><td class="time">{e["t1"]}</td><td class="time">{e["t2"]}</td><td class="time">{dur}</td><td class="net">{net}</td></tr>')
            secs.append(f"""<section class="sheet">
  <div class="head"><span class="t">דוח שעות</span><h1>{w["name"]}</h1></div>
  <div class="body">
    <table class="att">
      <thead><tr><th>תאריך</th><th>יום</th><th>שעת כניסה</th><th>שעת יציאה</th><th>שעות עבודה</th><th>ש.ע. עשרוני</th></tr></thead>
      <tbody>
{chr(10).join("        " + r for r in inner_rows)}
      </tbody>
    </table>
    <div class="month">{month_label}</div>
  </div>
  <table class="totals">
    <tr><td>סה"כ שעות</td><td class="big">{fmt_hours(w["total"])}</td></tr>
    <tr><td>ימי נוכחות</td><td class="big">{w["present"]}</td></tr>
    <tr><td>ימי העדרות</td><td class="big">{w["absent"]}</td></tr>
  </table>
</section>""")
        body_sections = "\n" + "\n".join(secs)
    return f"""<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>סיכום {month_label}</title>
<style>
{COMMON_CSS}
</style>
</head>
<body>
<section class="sheet summary">
  <h1 class="sumtitle">סיכום {month_label}</h1>
  {warn}
  <table class="sum">
    <thead><tr><th>מס'</th><th>שם עובד</th><th>ימי נוכחות</th><th>שעות עבודה</th></tr></thead>
    <tbody>
{rows}
    </tbody>
  </table>
  <div class="no-print nav">
    <a href="index.html">חזור</a> · <a href="all.html">הדפס הכל (PDF אחד)</a>
  </div>
  <button class="no-print" onclick="window.print()">הדפס</button>
</section>
{body_sections}
</body>
</html>"""


COMMON_CSS = """
* { box-sizing: border-box; }
body { margin:0; background:#eef1f5; font-family:David,"Arial Hebrew",Arial,sans-serif; }
.sheet { background:#fff; width:190mm; margin:8mm auto; padding:8mm; border:1px solid #ccc; }
.head { display:flex; align-items:center; gap:12px; border:2px solid #000; padding:4px 10px; }
.head .t { font-size:15px; font-weight:bold; }
.head h1 { flex:1; margin:0; text-align:center; font-size:26px; }
.body { display:flex; gap:6px; margin-top:6px; }
table.att { border-collapse:collapse; flex:1; }
table.att th, table.att td { border:1px solid #000; text-align:center; font-size:14px; padding:3px 6px; height:26px; }
table.att th { background:#dfe7f2; font-weight:bold; }
td.date { font-weight:bold; }
.satfill { background:#ffff00; }
.missfill { background:#d9e2f3; }
tr.half td { background:#ffe699; }
.month { writing-mode:vertical-rl; transform:rotate(180deg); border:2px solid #000;
         font-size:26px; font-weight:bold; text-align:center; padding:6px 2px; }
table.totals { border-collapse:collapse; margin-top:8px; margin-right:auto; width:70mm; }
table.totals td { border:1px solid #000; padding:4px 8px; font-size:14px; font-weight:bold; text-align:center; }
table.totals td.big { font-size:18px; color:#2f5597; width:32mm; }
h1.sumtitle { text-align:center; font-size:34px; margin:0 0 10px; }
table.sum { border-collapse:collapse; margin:auto; }
table.sum th, table.sum td { border:1px solid #000; padding:5px 14px; font-size:16px; text-align:center; }
table.sum th { background:#dfe7f2; }
table.sum td.namecell { font-weight:bold; }
table.sum td.num { font-size:16px; color:#2f5597; }
.warn { background:#fff3cd; border:1px solid #e0a800; padding:8px; margin:0 auto 10px; width:fit-content; font-size:13px; }
.nav { text-align:center; margin:10px 0; font-size:15px; }
.nav a { color:#2f5597; }
button.no-print { display:block; margin:10px auto; padding:6px 22px; font-size:15px; cursor:pointer; }
@media print {
  body { background:#fff; }
  .no-print { display:none !important; }
  .sheet { margin:0; border:none; width:auto; padding:0; page-break-after:always; }
  .sheet:last-child { page-break-after:auto; }
}
@page { size:A4 portrait; margin:10mm; }
"""


def main():
    folder = Path(__file__).resolve().parent
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    src = None
    if args:
        src = Path(args[0])
    else:
        cands = sorted(folder.glob("Daily Att*.xls*"),
                       key=lambda p: p.stat().st_mtime, reverse=True)
        cands += sorted(folder.glob("*.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
        if cands:
            src = cands[0]
    if not src or not src.exists():
        print("No export file found. Drop the exported file next to this script or pass its path.")
        try:
            input("Press Enter to close...")
        except EOFError:
            pass
        return
    print(f"export: {src.name}")
    rows = parse_export(src)
    if not rows:
        print("The export has no data rows.")
        input("Press Enter to close...")
        return
    year = detect_year(rows, src)
    workers, warnings, dim = build_model(rows, year)
    month = workers[0]["month"]
    month_label = f"{HEB_MONTHS[month-1]}{year}"
    out = folder / f"report_{month:02d}-{year}"
    out.mkdir(exist_ok=True)
    for w in workers:
        (out / f'w_{w["uid"]}.html').write_text(worker_html(w, dim), encoding="utf-8")
    (out / "index.html").write_text(summary_html(workers, warnings, month, year, pages=False), encoding="utf-8")
    (out / "all.html").write_text(summary_html(workers, warnings, month, year, pages=True), encoding="utf-8")
    print(f"month: {month_label} | workers: {len(workers)} | days/worker: {dim}")
    for w in workers:
        print(f"  ID {w['uid']:>3} {w['name']}: {fmt_hours(w['total'])} h, "
              f"{w['present']} present, {w['absent']} absent")
    for wn in warnings:
        print("WARN:" + wn)
    print(f"report folder: {out}")
    print("open index.html -> per-worker pages; all.html -> one click -> Print -> Save as PDF")
    try:
        os.startfile(str(out / "index.html"))
    except Exception:
        pass
    if len(sys.argv) == 1:
        try:
            input("Press Enter to close...")
        except EOFError:
            pass


if __name__ == "__main__":
    main()
