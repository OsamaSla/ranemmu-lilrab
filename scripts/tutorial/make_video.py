# -*- coding: utf-8 -*-
"""Build the tutorial video from tutorial/slides.json.

Pipeline per scene:
    1. edge-tts            -> tutorial/audio/scene_XX.mp3
    2. audio features      -> viseme + openness + idle motion
    3. character renderer  -> tutorial/clips/char_XX.mov   (alpha)
    4. background plate    -> slide + spotlight + progress dots
    5. ffmpeg              -> slide + presenter + audio (+ fades) = tutorial/clips/scene_XX.mp4
Then all clips are concatenated and mixed with a soft music bed -> tutorial/final.mp4

Usage:
    python scripts/tutorial/make_video.py
    python scripts/tutorial/make_video.py --scenes 2          # one scene (test)
    python scripts/tutorial/make_video.py --no-music --no-dots
    python scripts/tutorial/make_video.py --voice ar-EG-ShakirNeural
"""
import argparse
import asyncio
import json
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CFG_PATH = os.path.join(ROOT, "tutorial", "slides.json")
FPS = 30
VID_W, VID_H = 1920, 1080
FADE = 0.25
TEAL = (42, 169, 162)


# ------------------------------------------------------------------- helpers
def ffprobe_duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path])
    return float(out.decode().strip())


async def tts(text, voice, rate, out):
    import edge_tts
    await edge_tts.Communicate(text, voice, rate=rate).save(out)


def run(cmd, **kw):
    r = subprocess.run(cmd, **kw)
    if r.returncode != 0:
        raise SystemExit(f"command failed ({r.returncode}): {' '.join(str(c) for c in cmd[:6])} ...")


# --------------------------------------------------------------- background
def background(slide, index, total, dots=True):
    img = Image.open(slide).convert("RGBA").resize((VID_W, VID_H))
    if dots:
        r, gap = 5, 24
        span = (total - 1) * gap
        x0, y0 = VID_W // 2 - span // 2, VID_H - 30
        d = ImageDraw.Draw(img)
        for i in range(total):
            c = (x0 + i * gap, y0)
            if i == index:
                d.ellipse([c[0] - r - 2, c[1] - r - 2, c[0] + r + 2, c[1] + r + 2], fill=TEAL + (255,))
            else:
                d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=(120, 132, 138, 130))
    return img.convert("RGB")


# -------------------------------------------------------------------- music
def write_music(path, dur, sr=44100):
    """A soft, slow chord pad — generated, no external asset."""
    chords = [
        (220.00, 261.63, 329.63),   # Am
        (174.61, 220.00, 261.63),   # F
        (130.81, 196.00, 261.63),   # C
        (196.00, 246.94, 293.66),   # G
    ]
    seg = 8.0
    n = int(dur * sr)
    t = np.arange(n) / sr
    out = np.zeros(n)
    for ci, freqs in enumerate(chords * (int(dur / (seg * len(chords))) + 2)):
        start = ci * seg
        if start >= dur:
            break
        a, b = int(start * sr), min(n, int((start + seg + 1.2) * sr))
        tt = np.arange(b - a) / sr
        env = np.clip(tt / 1.6, 0, 1) * np.clip((seg + 1.2 - tt) / 1.4, 0, 1)
        sig = np.zeros(b - a)
        for f in freqs:
            for h, amp in ((1, 1.0), (2, 0.28), (3, 0.12)):
                sig += amp * np.sin(2 * np.pi * f * h * tt + h * 0.7) / (h ** 1.1)
        out[a:b] += sig * env
    out = out / (np.max(np.abs(out)) or 1.0) * 0.35
    # gentle stereo: slight detune on the right
    stereo = np.stack([out, np.roll(out, 220)], axis=1)
    pcm = (stereo * 32767).astype("<i2")
    import wave
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


# ----------------------------------------------------------------- pipeline
def build_scene(scene, cfg, args, total_scenes):
    n = scene["index"]
    voice = args.voice or cfg["audio"]["voice"]
    rate = cfg["audio"].get("rate", "+0%")
    audio_dir = os.path.join(ROOT, cfg["audio"]["dir"])
    clip_dir = os.path.join(ROOT, "tutorial", "clips")
    os.makedirs(audio_dir, exist_ok=True)
    os.makedirs(clip_dir, exist_ok=True)

    mp3 = os.path.join(audio_dir, f"scene_{n:02d}.mp3")
    if not os.path.exists(mp3) or args.force_tts:
        asyncio.run(tts(scene["text"], voice, rate, mp3))
    dur = ffprobe_duration(mp3)
    total = max(1, int(round(dur * FPS)))
    print(f"scene {n:02d}: {dur:5.1f}s  {total} frames")

    bg = os.path.join(clip_dir, f"bg_{n:02d}.png")
    background(os.path.join(ROOT, scene["image"]), n - 1, total_scenes,
               dots=not args.no_dots).save(bg)

    out = os.path.join(clip_dir, f"scene_{n:02d}.mp4")
    fo = max(0.0, dur - FADE)
    vfade = f"fade=t=in:st=0:d={FADE},fade=t=out:st={fo:.2f}:d={FADE}"
    afade = f"afade=t=in:st=0:d={FADE},afade=t=out:st={fo:.2f}:d={FADE}"
    cmd = ["ffmpeg", "-y", "-v", "error", "-loop", "1", "-framerate", str(FPS), "-i", bg,
           "-i", mp3, "-vf", vfade, "-af", afade, "-c:v", "libx264", "-crf", "19",
           "-preset", "medium", "-c:a", "aac", "-b:a", "160k", "-t", f"{dur:.3f}", out]
    run(cmd)
    return out


def concat(clips, out):
    lst = os.path.join(ROOT, "tutorial", "clips", "concat.txt")
    with open(lst, "w", encoding="utf-8") as f:
        for c in clips:
            f.write(f"file '{c.replace(os.sep, '/')}'\n")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out])


def mix_music(video, out, volume):
    dur = ffprobe_duration(video)
    mw = os.path.join(ROOT, "tutorial", "clips", "music.wav")
    write_music(mw, dur + 1)
    run(["ffmpeg", "-y", "-v", "error", "-i", video, "-i", mw, "-filter_complex",
         f"[1:a]volume={volume},afade=t=in:st=0:d=3,afade=t=out:st={max(0.0, dur - 4):.1f}:d=4[m];"
         f"[0:a][m]amix=inputs=2:duration=first:normalize=0[a]",
         "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ac", "2", out])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenes", type=int, nargs="*", help="only these scene indexes")
    ap.add_argument("--voice")
    ap.add_argument("--no-concat", action="store_true")
    ap.add_argument("--no-music", action="store_true")
    ap.add_argument("--no-dots", action="store_true")
    ap.add_argument("--no-fade", action="store_true")
    ap.add_argument("--force-tts", action="store_true")
    ap.add_argument("--remix", action="store_true", help="only re-mix music onto the existing silent cut")
    args = ap.parse_args()

    cfg = json.load(open(CFG_PATH, encoding="utf-8"))
    if args.remix:
        silent = os.path.join(ROOT, "tutorial", "clips", "_final_nomusic.mp4")
        final = os.path.join(ROOT, "tutorial", "final.mp4")
        mix_music(silent, final, cfg.get("music", {}).get("volume", 0.09))
        print("remixed -> tutorial/final.mp4")
        return
    if args.no_fade:
        global FADE
        FADE = 0.0

    scenes = cfg["scenes"]
    if args.scenes:
        scenes = [s for s in scenes if s["index"] in args.scenes]

    clips = [build_scene(s, cfg, args, len(cfg["scenes"])) for s in scenes]

    if args.no_concat or len(clips) != len(cfg["scenes"]):
        print(f"\nbuilt {len(clips)} clip(s) -> tutorial/clips/")
        return

    silent = os.path.join(ROOT, "tutorial", "clips", "_final_nomusic.mp4")
    concat(clips, silent)
    final = os.path.join(ROOT, "tutorial", "final.mp4")
    if args.no_music:
        os.replace(silent, final)
    else:
        mix_music(silent, final, cfg.get("music", {}).get("volume", 0.09))
    print(f"\nfinal -> tutorial/final.mp4  ({len(clips)} scenes)")


if __name__ == "__main__":
    main()
