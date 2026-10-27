# -*- coding: utf-8 -*-
"""Produce the tutorial timeline: per-slide timings, narration, subtitles, kit.

    python scripts/tutorial/timeline.py

Outputs (all relative to the project root):
    tutorial/timeline.csv   slide,start,end,duration,narration        (Excel-friendly)
    tutorial/timeline.md    readable table + PowerPoint instructions
    tutorial/narration.srt  subtitle track for the narration
    tutorial/scene_kit/     slide_XX.png + scene_XX.mp3 per scene     (for an editor)

Times are derived from the generated audio, so they match tutorial/final.mp4
exactly (the video length equals the sum of the scene durations).
"""
import csv
import json
import os
import shutil
import subprocess
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CFG = os.path.join(ROOT, "tutorial", "slides.json")


def duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path])
    return float(out.decode().strip())


def clock(sec, sep="."):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".", sep)


def short(sec):
    m = int(sec // 60)
    s = int(round(sec % 60))
    if s == 60:
        m, s = m + 1, 0
    return f"{m}:{s:02d}"


def main():
    cfg = json.load(open(CFG, encoding="utf-8"))
    audio_dir = os.path.join(ROOT, cfg["audio"]["dir"])

    rows = []
    t = 0.0
    for s in cfg["scenes"]:
        n = s["index"]
        mp3 = os.path.join(audio_dir, f"scene_{n:02d}.mp3")
        if not os.path.exists(mp3):
            raise SystemExit(f"missing audio: {mp3} — run make_video.py first")
        d = duration(mp3)
        rows.append({
            "index": n,
            "slide": f"slide_{n:02d}.png",
            "start": t,
            "end": t + d,
            "duration": d,
            "text": s["text"],
        })
        t += d
    total = t

    # ---- CSV
    csv_path = os.path.join(ROOT, "tutorial", "timeline.csv")
    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["slide", "start", "end", "duration_sec", "start_hms", "end_hms", "narration"])
        for r in rows:
            w.writerow([r["index"], f"{r['start']:.2f}", f"{r['end']:.2f}", f"{r['duration']:.2f}",
                        clock(r["start"], ","), clock(r["end"], ","), r["text"]])

    # ---- SRT
    srt_path = os.path.join(ROOT, "tutorial", "narration.srt")
    with open(srt_path, "w", encoding="utf-8") as f:
        for i, r in enumerate(rows, 1):
            f.write(f"{i}\n{clock(r['start'])} --> {clock(r['end'])}\n{r['text']}\n\n")

    # ---- Markdown
    md = [
        "# Tutorial timeline",
        "",
        f"Total length: **{short(total)}** ({total:.1f}s) across **{len(rows)}** slides.",
        "",
        "| # | Slide | Start | End | Length |",
        "|---|-------|-------|-----|--------|",
    ]
    for r in rows:
        md.append(f"| {r['index']} | `{r['slide']}` | {short(r['start'])} | {short(r['end'])} "
                  f"| {r['duration']:.1f}s |")
    md += ["", "## Narration per slide", ""]
    for r in rows:
        md += [f"**{r['index']}** · {short(r['start'])}–{short(r['end'])}", "",
               r["text"], ""]
    md += [
        "## Using this in PowerPoint",
        "",
        "1. The per-slide audio is in `tutorial/audio/scene_XX.mp3` (also copied into",
        "   `tutorial/scene_kit/` next to the slide PNG).",
        "2. On each slide: **Insert → Audio → Audio on My PC**, pick the matching",
        "   `scene_XX.mp3`, then in *Playback* set **Start: Automatically** and tick",
        "   **Play Across Slides** off.",
        "3. Set each slide's advance time to the Length above: **Transitions →",
        "   Advance Slide → After: <length>**. Turn off *On Mouse Click*.",
        "4. Add your character/avatar to each slide, then **File → Export → Create a",
        "   Video** (or record the slideshow). The narration and timings are already set.",
        "",
        "`tutorial/narration.srt` can be imported into most video editors as a subtitle",
        "track to verify alignment.",
        "",
    ]
    with open(os.path.join(ROOT, "tutorial", "timeline.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md))

    # ---- scene kit
    kit = os.path.join(ROOT, "tutorial", "scene_kit")
    os.makedirs(kit, exist_ok=True)
    for r in rows:
        n = r["index"]
        shutil.copyfile(os.path.join(ROOT, "tutorial", "slides_png", r["slide"]),
                        os.path.join(kit, r["slide"]))
        shutil.copyfile(os.path.join(audio_dir, f"scene_{n:02d}.mp3"),
                        os.path.join(kit, f"scene_{n:02d}.mp3"))

    print(f"wrote tutorial/timeline.csv, tutorial/timeline.md, tutorial/narration.srt")
    print(f"wrote tutorial/scene_kit/ ({len(rows)} slides + audio)")
    print(f"total: {short(total)}")
    for r in rows:
        print(f"  {r['index']:>2}  {short(r['start']):>6} - {short(r['end']):>6}  "
              f"({r['duration']:4.1f}s)")


if __name__ == "__main__":
    main()
