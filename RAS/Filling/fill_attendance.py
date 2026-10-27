# -*- coding: utf-8 -*-
"""Fill missing attendance punches in RAS.mdb.
Rule: only on days with exactly 1 punch (has entrance OR exit, missing the other).
  - punch before 12:00 = entrance present -> add exit
  - punch at/after 12:00 = exit present -> add 08:00 entrance
  - Sun-Thu exit: 16:50 group / 16:00 group (see below)
  - Friday exit: 14:30 for all
  - Saturday: skip (free)
Manual rows mirror the software's own format:
  DN=NULL, VerifyMode=1, AttTypeId='H01', Action=1 (in) / 2 (out),
  CollectDate/LastUpdatedDate=now, JobCode=NULL, Antipassback=False.
Two extra DB-control modes (also buttons in the calendar window):
  --check          -> VIEW ONLY: list the missing (half-punch) time entries of the period:
                      days with exactly 1 punch, showing employee name, the punch you have
                      and the punch that is missing. Never writes anything.
                      Launcher: view_missing.bat
  --remark "text"  -> write your remark text into ras_AttRecord.Remark for every punch in
                      the period (narrow it with --din). Shows a preview, asks, backs up.
                      This is the remark the app's own option failed to save.
                      Launcher: set_remark.bat  (or set_remark.bat "my text")
Usage:
  Double-click fill_attendance.bat (or fill_attendance.py) -> calendar prompt + preview + confirm.
  python fill_attendance.py [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--dry-run] [--yes] [--no-gui] [--no-pause] [--show-all] [--fill-empty] [--din 7,10] [--check] [--remark "text"]
  No args -> calendar prompt (GUI if available, else console calendars) + preview + confirm.
  The DB folder is auto-detected: C:/Users/osama/Desktop/TimeLog/Database if present,
  else the script's own folder (so double-click works on this test PC too).
Requires: pip install pyodbc + 'Microsoft Access Driver (*.mdb, *.accdb)'
"""
import calendar
import shutil
import sys
from datetime import datetime, timedelta, date
from pathlib import Path

# ---- CONFIG ----
DB_FOLDER = r"C:\Users\osama\Desktop\TimeLog\Database"
DB_PASSWORD = "ras258"
G_1650 = [11, 14, 15, 23, 25, 19]  # exit 16:50
G_1600 = [10, 5, 7]                # exit 16:00
VERSION = "2026-10-16a"
KEEP_BACKUPS = 3  # how many RAS_backup_*.mdb files to keep in the DB folder
# ----------------

def find_mdb(folder):
    p = Path(folder)
    mdbs = sorted(p.glob("*.mdb"), key=lambda x: x.stat().st_size, reverse=True)
    if not mdbs:
        raise FileNotFoundError(f"No .mdb found in {folder}")
    # prefer RAS.mdb if present
    for m in mdbs:
        if m.name.lower() == "ras.mdb":
            return m
    return mdbs[0]


def resolve_db_folder():
    """Double-click friendly: production folder if present, else script's own folder."""
    for cand in (DB_FOLDER, str(Path(__file__).resolve().parent), str(Path.cwd())):
        try:
            if cand and Path(cand).is_dir() and list(Path(cand).glob("*.mdb")):
                return cand
        except OSError:
            continue
    return DB_FOLDER


def pause(msg="Press Enter to close..."):
    try:
        input(msg)
    except (EOFError, KeyboardInterrupt):
        pass

def parse_args():
    dry = "--dry-run" in sys.argv
    yes = "--yes" in sys.argv
    no_gui = "--no-gui" in sys.argv
    no_pause = "--no-pause" in sys.argv
    show_all = "--show-all" in sys.argv
    fill_empty = "--fill-empty" in sys.argv
    check = "--check" in sys.argv
    only_dins = None
    start = end = None
    remark = None
    for i, a in enumerate(sys.argv):
        if a == "--start" and i + 1 < len(sys.argv):
            start = datetime.strptime(sys.argv[i + 1], "%Y-%m-%d")
        if a == "--end" and i + 1 < len(sys.argv):
            end = datetime.strptime(sys.argv[i + 1], "%Y-%m-%d") + timedelta(days=1)
        if a == "--din" and i + 1 < len(sys.argv):
            only_dins = [int(x) for x in sys.argv[i + 1].split(",") if x.strip().isdigit()]
        if a == "--remark":
            remark = sys.argv[i + 1] if (i + 1 < len(sys.argv)
                                         and not sys.argv[i + 1].startswith("--")) else ""
    if remark is not None:
        remark = remark.strip().strip('"').strip()  # --remark "" -> empty, not two quotes
    if check and remark is not None:
        print("--check and --remark cannot be combined (view vs write).")
        sys.exit(1)
    return (dry, yes, no_gui, no_pause, show_all, fill_empty, only_dins,
            start, end, check, remark)


def tk_pick_range(default_start, default_end, min_date=None, max_date=None,
                  default_remark=""):
    """GUI calendar: click start date, then end date. Returns (start, end_inc, mode, fill_empty, remark)
    mode = 'run' | 'dry' | 'check' | 'remark' | None (cancel). No external deps, plain tkinter."""
    import tkinter as tk
    result = {"start": default_start, "end": default_end, "mode": None,
              "empty": False, "remark": default_remark}

    root = tk.Tk()
    root.title("Attendance fill - pick period")
    state = {"y": default_start.year, "m": default_start.month,
             "picking": "start",
             "start": default_start, "end": default_end}

    hdr = tk.Label(root, text="", font=("Segoe UI", 10, "bold"))
    hdr.grid(row=0, column=0, columnspan=9, pady=4)
    lbl_start = tk.Label(root, text="", fg="blue")
    lbl_end = tk.Label(root, text="", fg="darkgreen")
    lbl_start.grid(row=1, column=0, columnspan=9)
    lbl_end.grid(row=2, column=0, columnspan=9)
    hint = tk.Label(root, text="Click START date, then END date. Green=start, orange=end, yellow=in between.",
                    fg="gray")
    hint.grid(row=3, column=0, columnspan=9)
    grid = tk.Frame(root)
    grid.grid(row=4, column=0, columnspan=9)
    for c, wd in enumerate(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]):
        fg = "red" if c in (4, 5) else None  # Fri+Sat highlight (Fri half, Sat free)
        tk.Label(grid, text=wd, font=("Segoe UI", 9, "bold"), fg=fg).grid(row=0, column=c, padx=3)

    btns = {}

    def refresh():
        for w in grid.grid_slaves(row=1):
            w.destroy()
        y, m = state["y"], state["m"]
        hdr.config(text=f"{calendar.month_name[m]} {y}")
        cal = calendar.monthcalendar(y, m)
        r = 1
        for week in cal:
            for c, day in enumerate(week):
                if day == 0:
                    tk.Label(grid, text="").grid(row=r, column=c, padx=3, pady=2)
                    continue
                d = date(y, m, day)
                b = tk.Button(grid, text=str(day), width=4,
                              command=lambda d=d: pick(d))
                if min_date and d < min_date:
                    b.config(state="disabled")
                if max_date and d > max_date:
                    b.config(state="disabled")
                s, e = state["start"], state["end"]
                if s and e and s <= d <= e:
                    if d == s:
                        b.config(bg="lightgreen")
                    elif d == e:
                        b.config(bg="orange")
                    else:
                        b.config(bg="lightyellow")
                elif s and d == s:
                    b.config(bg="lightgreen")
                # weekend tint
                if d.weekday() == 5:
                    b.config(fg="red")
                b.grid(row=r, column=c, padx=2, pady=2)
            r += 1
        s, e = state["start"], state["end"]
        lbl_start.config(text=f"Start: {s} ({s.strftime('%a')})" if s else "Start: -")
        lbl_end.config(text=f"End: {e} ({e.strftime('%a')})" if e else "End: -")

    def pick(d):
        if state["picking"] == "start" or (state["start"] and state["end"]):
            state["start"] = d
            state["end"] = None
            state["picking"] = "end"
        else:
            if d < state["start"]:
                state["start"] = d
            else:
                state["end"] = d
                state["picking"] = "start"
        refresh()

    def prev_month():
        y, m = state["y"], state["m"]
        m -= 1
        if m < 1:
            m, y = 12, y - 1
        state["y"], state["m"] = y, m
        refresh()

    def next_month():
        y, m = state["y"], state["m"]
        m += 1
        if m > 12:
            m, y = 1, y + 1
        state["y"], state["m"] = y, m
        refresh()

    def goto_today():
        t = date.today()
        state["y"], state["m"] = t.year, t.month
        refresh()

    nav = tk.Frame(root)
    nav.grid(row=5, column=0, columnspan=9, pady=6)
    tk.Button(nav, text="< Prev", command=prev_month).pack(side="left", padx=4)
    tk.Button(nav, text="Today", command=goto_today).pack(side="left", padx=4)
    tk.Button(nav, text="Next >", command=next_month).pack(side="left", padx=4)

    def finish(mode):
        if mode == "remark":
            try:
                txt = ent_remark.get().strip()
            except Exception:
                txt = ""
            if not txt:
                lbl_warn.config(text="Type a remark text first (left box), then press 'Set remark'.",
                                fg="red")
                return
            result["remark"] = txt
        result["start"] = state["start"]
        result["end"] = state["end"] or state["start"]
        result["mode"] = mode
        try:
            result["empty"] = bool(var_empty.get())
        except Exception:
            pass
        root.destroy()

    act = tk.Frame(root)
    act.grid(row=6, column=0, columnspan=9, pady=6)
    var_empty = tk.BooleanVar(value=False)
    tk.Checkbutton(act, text="Also fill 0-punch days (08:00 + exit)",
                   variable=var_empty).pack(side="left", padx=6)
    tk.Button(act, text="Preview (dry-run)", command=lambda: finish("dry")).pack(side="left", padx=6)
    tk.Button(act, text="Proceed", bg="lightgreen",
              command=lambda: finish("run")).pack(side="left", padx=6)
    tk.Button(act, text="Cancel", command=root.destroy).pack(side="left", padx=6)

    act2 = tk.Frame(root)
    act2.grid(row=7, column=0, columnspan=9, pady=(0, 4))
    tk.Label(act2, text="Remark:").pack(side="left", padx=(6, 2))
    ent_remark = tk.Entry(act2, width=30)
    ent_remark.insert(0, default_remark)
    ent_remark.pack(side="left", padx=4)
    tk.Button(act2, text="View missing entries", bg="lightblue",
              command=lambda: finish("check")).pack(side="left", padx=6)
    tk.Button(act2, text="Set remark", bg="wheat",
              command=lambda: finish("remark")).pack(side="left", padx=6)
    lbl_warn = tk.Label(root, text="", fg="red")
    lbl_warn.grid(row=8, column=0, columnspan=9)

    refresh()
    root.mainloop()
    if result["mode"] is None:
        return None, None, None, False, default_remark
    return (result["start"], result["end"], result["mode"],
            result["empty"], result["remark"])


def console_pick_range(default_start, default_end, min_date=None, max_date=None,
                       ask_empty=True):
    """Fallback: print console calendars, typed input. Returns (start, end_inc, None, fill_empty, None)."""
    print("\n=== Pick period ===")
    if min_date or max_date:
        print(f"Data in file: {min_date} .. {max_date}")
    # show 2-3 useful months: month of max data + previous
    base = (max_date or date.today())
    months = []
    y, m = base.year, base.month - 1
    if m < 1:
        m, y = 12, y - 1
    months.append((y, m))
    months.append((base.year, base.month))
    for y, m in months:
        print(calendar.month(y, m))
    print("Friday = half day (14:30), Saturday = skipped.")
    while True:
        try:
            s = input(f"Start date [YYYY-MM-DD, default {default_start}]: ").strip()
            e = input(f"End date inclusive [YYYY-MM-DD, default {default_end}]: ").strip()
            sd = datetime.strptime(s or str(default_start), "%Y-%m-%d").date()
            ed = datetime.strptime(e or str(default_end), "%Y-%m-%d").date()
            if ed < sd:
                print("End before start, try again.")
                continue
            fe = "n"
            if ask_empty:  # only meaningful for the fill flow
                fe = input("Also fill 0-punch days (08:00 + exit)? [y/N]: ").strip().lower()
            return sd, ed, None, fe in ("y", "yes"), None
        except ValueError:
            print("Use format YYYY-MM-DD, e.g. 2026-10-01.")


# ---- helpers for --check (view missing) and --remark (write remark) ----

def cput(s):
    """String that is always safe to print on the current console encoding."""
    enc = getattr(sys.stdout, "encoding", None) or "utf-8"
    try:
        return str(s).encode(enc, errors="replace").decode(enc, errors="replace")
    except Exception:
        return str(s)


def load_names(cur):
    """DIN -> employee name (ras_Users). Empty dict if the join fails."""
    names = {}
    try:
        cur.execute("SELECT [DIN], [UserName] FROM ras_Users")
        for din, nm in cur.fetchall():
            try:
                names[int(din)] = nm or ""
            except (TypeError, ValueError):
                continue
    except Exception as e:
        print(f"(names unavailable: {e})")
    return names


def load_punches(cur, start, end):
    """(DIN, date) -> [clock, ...] for the period, all DINs, ordered by DIN then Clock."""
    from collections import defaultdict
    sql = "SELECT [DIN], [Clock] FROM ras_AttRecord WHERE 1=1"
    params = []
    if start:
        sql += " AND [Clock]>=?"
        params.append(start)
    if end:
        sql += " AND [Clock]<?"
        params.append(end)
    sql += " ORDER BY [DIN],[Clock]"
    cur.execute(sql, params)
    by_day = defaultdict(list)
    for din, clk in cur.fetchall():
        try:
            d = int(din)
        except (TypeError, ValueError):
            continue
        by_day[(d, clk.date())].append(clk)
    return by_day


def report_missing(all_day, names, only_dins=None):
    """Print the half-punch days (exactly 1 punch) of the loaded period. Returns row count."""
    rows, sat_rows = [], []
    for (d, dt), clocks in sorted(all_day.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        if only_dins and d not in only_dins:
            continue
        if len(clocks) != 1:
            continue
        punch = clocks[0]
        have_exit = punch.hour >= 12
        item = (d, dt, punch, have_exit)
        (sat_rows if dt.weekday() == 5 else rows).append(item)

    print("\n=== Missing (half-punch) time entries ===")
    if not rows and not sat_rows:
        print("none - every punched day in this period has entry + exit.")
        print("(0-punch days are not listed: this view shows half-punches only.)")
        return 0
    print(f"{'DIN':>4}  {'Name':<20}  {'Date':<10} {'Day':<4} "
          f"{'Punch':<8} {'Missing':<8}")
    n_in = n_out = 0
    for d, dt, punch, have_exit in rows:
        miss = "exit" if not have_exit else "entry"
        if have_exit:
            n_out += 1   # exit present, entrance missing
        else:
            n_in += 1    # entrance present, exit missing
        have = "exit" if have_exit else "entry"
        name = cput(names.get(d, ""))[:20]
        day = dt.strftime("%a")
        print(f"{d:>4}  {name:<20}  {dt:%Y-%m-%d} {day:<4} "
              f"{punch:%H:%M} {have:<5} -> {miss}")
    if sat_rows:
        print(f"\nSaturday single punches (free day, not counted): {len(sat_rows)}")
        for d, dt, punch, have_exit in sat_rows:
            print(f"  DIN={d} {cput(names.get(d, ''))[:20]:<20} {dt} {punch:%H:%M}")
    print(f"\ntotal: {len(rows)} half-punch days "
          f"({n_in} missing exit, {n_out} missing entry)"
          + (f" + {len(sat_rows)} Saturday singles" if sat_rows else ""))
    print("fix: run without --check over the same period -> the missing punch is added.")
    return len(rows)


def make_backup(mdb):
    """Copy mdb next to it (newest name) and keep only KEEP_BACKUPS backups.
    The pyodbc connection must be closed before calling."""
    bak = mdb.with_name(f"{mdb.stem}_backup_{datetime.now():%Y%m%d_%H%M%S}.mdb")
    shutil.copy2(mdb, bak)
    print(f"backup: {bak}")
    try:
        olds = sorted(mdb.parent.glob(f"{mdb.stem}_backup_*.mdb"),
                      key=lambda p: p.stat().st_mtime)
        for old in olds[:-KEEP_BACKUPS]:
            old.unlink()
            print(f"old backup removed: {old.name}")
    except OSError as e:
        print(f"(backup cleanup skipped: {e})")
    return bak


def do_remark(conn, mdb, start, end, only_dins, text, yes, no_pause):
    """Write `text` into ras_AttRecord.Remark for every punch in the period.
    Shows preview + count, asks, backs up the DB, then updates."""
    cur = conn.cursor()
    sql = "SELECT [ID], [DIN], [Clock], [Remark] FROM ras_AttRecord WHERE 1=1"
    params = []
    if start:
        sql += " AND [Clock]>=?"
        params.append(start)
    if end:
        sql += " AND [Clock]<?"
        params.append(end)
    if only_dins:
        sql += " AND [DIN] IN (" + ",".join("?" for _ in only_dins) + ")"
        params += list(only_dins)
    sql += " ORDER BY [Clock], [DIN]"
    cur.execute(sql, params)
    hits = list(cur.fetchall())
    names = load_names(cur)
    todo = [h for h in hits if (h[3] or "") != text]
    same = len(hits) - len(todo)

    print(f'\n=== Set remark "{text}" ===')
    if not hits:
        print("No punches in this period for the selected DINs - nothing to do.")
        conn.close()
        if not no_pause and len(sys.argv) == 1:
            pause()
        return
    print(f"punches in period: {len(hits)} | to change: {len(todo)} | "
          f"already have this remark: {same}")
    for i, (rid, din, clk, old) in enumerate(todo[:60]):
        print(f"  {clk:%Y-%m-%d %H:%M} DIN={int(din)} "
              f"{cput(names.get(int(din), ''))[:20]:<20} "
              f"old={cput(old or '-')!r} -> new={text!r}")
    if len(todo) > 60:
        print(f"  ... and {len(todo) - 60} more rows")
    if not todo:
        conn.close()
        if not no_pause and len(sys.argv) == 1:
            pause()
        return

    if not yes:
        ans = input(f"Proceed: update Remark on {len(todo)} rows? [y/N]: ").strip().lower()
        if ans not in ("y", "yes"):
            print("Cancelled, nothing written.")
            conn.close()
            if not no_pause and len(sys.argv) == 1:
                pause()
            return

    conn.close()  # release lock before copy
    make_backup(mdb)
    import pyodbc
    conn = pyodbc.connect(
        f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={mdb};PWD={DB_PASSWORD};",
        timeout=30, autocommit=False)
    cur = conn.cursor()
    n = 0
    for rid, _din, _clk, _old in todo:
        cur.execute("UPDATE ras_AttRecord SET [Remark]=? WHERE [ID]=?", text, rid)
        n += 1
    conn.commit()
    conn.close()
    print(f"remark set on {n} rows.")
    if not no_pause and len(sys.argv) == 1:
        pause()


def main():
    import pyodbc
    (dry, yes, no_gui, no_pause, show_all, fill_empty, only_dins,
     start, end, check_flag, remark) = parse_args()
    # mode: 'fill' (default) | 'check' (view missing) | 'remark' (write remark text)
    mode = "check" if check_flag else ("remark" if remark is not None else "fill")
    exit_map = {d: "16:50" for d in G_1650} | {d: "16:00" for d in G_1600}
    targets = list(exit_map)
    if only_dins:
        targets = [d for d in targets if d in only_dins]
    folder = resolve_db_folder()
    mdb = find_mdb(folder)
    import os
    print(f"script {VERSION} | targets 16:50={G_1650} 16:00={G_1600}")
    print(f"folder: {folder}")
    try:
        for cand in sorted(Path(folder).glob("*.mdb")):
            st = cand.stat()
            print(f"  candidate: {cand.name} size={st.st_size} mtime={datetime.fromtimestamp(st.st_mtime):%Y-%m-%d %H:%M:%S}")
    except OSError as e:
        print(f"  (list failed: {e})")
    print(f"DB: {mdb} ({mdb.stat().st_size} bytes)")

    cs = (f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};"
          f"DBQ={mdb};PWD={DB_PASSWORD};")
    conn = pyodbc.connect(cs, timeout=30, autocommit=False)
    cur = conn.cursor()

    # data range hint for the calendar
    try:
        cur.execute("SELECT MIN([Clock]), MAX([Clock]) FROM ras_AttRecord")
        mn, mx = cur.fetchone()
        min_d, max_d = (mn.date() if mn else None), (mx.date() if mx else None)
    except Exception:
        min_d = max_d = None

    if start is None or end is None:
        d_end = max_d or date.today()
        d_start = date(d_end.year, d_end.month, 1)
        gui_ok = False
        if not no_gui:
            try:
                ps, pe, gmode, fe, rtext = tk_pick_range(d_start, d_end, min_d, max_d,
                                                         remark or "")
                if ps is None:
                    print("Cancelled.")
                    conn.close()
                    if not no_pause and len(sys.argv) == 1:
                        pause()
                    return
                start = datetime(ps.year, ps.month, ps.day)
                end = datetime(pe.year, pe.month, pe.day) + timedelta(days=1)
                if gmode in ("dry", "run"):        # buttons -> fill flow
                    mode = "fill"
                    dry = dry or gmode == "dry"
                    fill_empty = fill_empty or fe
                else:                              # 'check' | 'remark' buttons
                    mode = gmode
                    if gmode == "remark":
                        remark = rtext
                gui_ok = True
            except Exception as ex:
                print(f"GUI calendar unavailable ({ex}), console calendars:")
        if not gui_ok:
            ps, pe, _, fe, _ = console_pick_range(d_start, d_end, min_d, max_d,
                                                  ask_empty=(mode == "fill"))
            start = datetime(ps.year, ps.month, ps.day)
            end = datetime(pe.year, pe.month, pe.day) + timedelta(days=1)
            fill_empty = fill_empty or fe

    print(f"Period: {start.date()} .. {(end - timedelta(seconds=1)).date()}")

    all_day = load_punches(cur, start, end)
    by_day = {k: v for k, v in all_day.items() if k[0] in targets}

    if mode == "check":
        report_missing(all_day, load_names(cur), only_dins)
        conn.close()
        if not no_pause and len(sys.argv) == 1:
            pause()
        return

    if mode == "remark":
        if not (remark or "").strip():
            print('No remark text given. Use: --remark "your text" '
                  "(or type it into the Remark box of the calendar window).")
            conn.close()
            if not no_pause and len(sys.argv) == 1:
                pause()
            return
        do_remark(conn, mdb, start, end, only_dins, remark.strip(), yes, no_pause)
        return

    if show_all:
        print("\n--- All DINs: punches per day (0/1/2+) ---")
        for (d, dt) in sorted(all_day):
            n = len(all_day[(d, dt)])
            mark = "SINGLE*" if n == 1 and dt.weekday() != 5 else str(n)
            grp = "16:50" if d in G_1650 else ("16:00" if d in G_1600 else "-")
            print(f"  DIN={d} {dt} {dt.strftime('%a')} count={mark} group={grp}")
        print("--- end ---\n")

    now = datetime.now()
    plan = []  # (DIN, new_clock, action, source_tag)
    skipped_sat = 0
    for (d, dt), clocks in sorted(by_day.items()):
        if len(clocks) != 1:
            continue
        if dt.weekday() == 5:  # Saturday free
            skipped_sat += 1
            continue
        punch = clocks[0]
        if punch.hour < 12:
            et = "14:30" if dt.weekday() == 4 else exit_map[d]
            h, m = map(int, et.split(":"))
            plan.append((d, datetime(dt.year, dt.month, dt.day, h, m, 0), 2, punch))
        else:
            plan.append((d, datetime(dt.year, dt.month, dt.day, 8, 0, 0), 1, punch))

    n_empty_days = 0
    if fill_empty and start and end:
        dd = start.date()
        while dd < end.date():
            if dd.weekday() != 5:
                for d in targets:
                    if (d, dd) not in by_day:
                        et = "14:30" if dd.weekday() == 4 else exit_map[d]
                        h, m = map(int, et.split(":"))
                        plan.append((d, datetime(dd.year, dd.month, dd.day, 8, 0, 0), 1, "empty"))
                        plan.append((d, datetime(dd.year, dd.month, dd.day, h, m, 0), 2, "empty"))
                        n_empty_days += 1
            dd += timedelta(days=1)
        plan.sort(key=lambda x: (x[1], x[0]))

    print(f"fill_empty={'ON' if fill_empty else 'off'} | single-punch workdays added: "
          f"{len([p for p in plan if p[3] != 'empty'])} | empty workdays x2 rows: {n_empty_days} "
          f"(skipped Sat: {skipped_sat})")
    for d, nc, act, punch in plan[:60]:
        tag = "exit" if act == 2 else "entry"
        src = punch.time() if punch != "empty" else "no punch"
        print(f"  DIN={d} {nc.date()} punch={src} -> add {tag} {nc} Action={act}")
    if len(plan) > 60:
        print(f"  ... and {len(plan) - 60} more rows")

    if not plan:
        # explain WHY nothing to do (this is the diagnostic users paste back)
        n_complete = sum(1 for v in by_day.values() if len(v) >= 2)
        days = (end.date() - start.date()).days if (start and end) else 0
        n_zero, zero_sample = 0, []
        if start and end:
            dd = start.date()
            while dd < end.date():
                if dd.weekday() != 5:
                    for d in targets:
                        if (d, dd) not in by_day:
                            n_zero += 1
                            if len(zero_sample) < 10:
                                zero_sample.append((d, dd))
                dd += timedelta(days=1)
        other_singles = sorted((d, dt) for (d, dt), v in all_day.items()
                               if len(v) == 1 and dt.weekday() != 5 and d not in targets)[:10]
        print(f"diagnostic: days in period={days}, target day-groups={len(by_day)}, "
              f"complete(2+)={n_complete}, zero-punch target-days(skipped by single-only rule)={n_zero}")
        if zero_sample:
            print("  zero-punch sample (not filled: rule=singles only):")
            for d, dt in zero_sample:
                print(f"    DIN={d} {dt} {dt.strftime('%a')}")
        if other_singles:
            print("  singles for IDs OUTSIDE the 9 configured (add IDs to config to fill):")
            for d, dt in other_singles:
                print(f"    DIN={d} {dt} {dt.strftime('%a')}")
        print("If you expected fills: check period, check the 9 IDs, or the rule skips 0-punch days.")

    if dry or not plan:
        print("DRY-RUN, nothing written." if dry else "Nothing to do.")
        conn.close()
        if not no_pause and len(sys.argv) == 1:
            pause()
        return

    if not yes:
        ans = input(f"Proceed: insert {len(plan)} rows? [y/N]: ").strip().lower()
        if ans not in ("y", "yes"):
            print("Cancelled, nothing written.")
            conn.close()
            if not no_pause and len(sys.argv) == 1:
                pause()
            return

    conn.close()  # release lock before copy
    make_backup(mdb)

    conn = pyodbc.connect(cs, timeout=30, autocommit=False)
    cur = conn.cursor()
    for d, nc, act, _ in plan:
        cur.execute(
            "INSERT INTO ras_AttRecord ([DN],[DIN],[Clock],[VerifyMode],[Action],"
            "[AttTypeId],[CollectDate],[JobCode],[Antipassback],"
            "[LastUpdatedUID],[LastUpdatedDate],[Remark]) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            0, d, nc, 1, act, "H01", now, 0, False, 0, now, "")
    conn.commit()
    print(f"inserted {len(plan)} rows.")
    conn.close()
    if not no_pause and len(sys.argv) == 1:
        pause()


if __name__ == "__main__":
    try:
        main()
    except SystemExit as e:
        if str(e):
            print(f"Error: {e}")
        try:
            pause()
        except Exception:
            pass
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error: {e}")
        try:
            import tkinter as tk
            from tkinter import messagebox
            r = tk.Tk()
            r.withdraw()
            messagebox.showerror("Attendance fill", f"Failed:\n{e}")
            r.destroy()
        except Exception:
            pass
        pause()
