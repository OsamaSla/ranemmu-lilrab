# Tutorial Video Pipeline

Turns the PowerPoint deck in `tutorial/` into a narrated audio-only video
(slides + Arabic voice + progress dots + music bed), then publishes it so the
app can stream it.

```
PPTX ──▶ PNG slides ──▶ edge-tts audio ──▶ ffmpeg ──▶ final.mp4
                                   │
              Firebase Storage ──▶ in-app stream ─┤
              YouTube           ──▶ shareable link ┘
```

The app side already exists: `src/components/TutorialVideoCard.tsx` is mounted at
the top of the **Help** tab and reads its URLs from `src/data/tutorials.ts`.
Nothing in `src/` needs editing — the publish scripts fill the URLs in for you.

## Prerequisites

| Tool | Why | Check |
|------|-----|-------|
| ffmpeg / ffprobe | audio, encode, concat | `ffmpeg -version` |
| Python 3.11 + pip | deck edits, TTS, video build | `python --version` |
| PowerPoint (desktop) | exporting slides to PNG | opens `.pptx` |
| Node 20+ | Firebase Storage uploader | `node --version` |

```bash
python -m pip install python-pptx edge-tts pillow numpy
# only for the YouTube uploader:
python -m pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
```

## Files

| Path | Role |
|------|------|
| `tutorial/1.pptx` | the source deck (edited, never modified) |
| `tutorial/1-edited.pptx` | generated: fixes + title/closing slides |
| `tutorial/slides.json` | **narration script + settings** — edit this |
| `tutorial/slides_png/` | generated slide images (1920×1080) |
| `tutorial/audio/` | generated per-scene mp3 |
| `tutorial/clips/` | generated per-scene clips |
| `tutorial/final.mp4` | **the finished video** |
| `scripts/tutorial/` | the whole pipeline |


Generated media is git-ignored; only `slides.json` and the scripts are source.

## Build the video

```bash
# 1. fixes + title/closing slide -> tutorial/1-edited.pptx
python scripts/tutorial/edit_deck.py

# 2. export slides at 1920x1080 (needs the file in an ASCII path for COM)
copy tutorial\1-edited.pptx C:\temptest\1-edited.pptx
powershell -ExecutionPolicy Bypass -File scripts/tutorial/export_slides.ps1 `
    -In C:\temptest\1-edited.pptx -Out C:\temptest\slides_hd -Width 1920 -Height 1080
python scripts/tutorial/import_slides.py C:\temptest\slides_hd tutorial\slides_png

# 3. narration -> audio -> clips -> tutorial/final.mp4
python scripts/tutorial/make_video.py
```

(`npm run tutorial:deck` / `tutorial:slides` / `tutorial:import` / `tutorial:video`
wrap the same commands.)

Test a single scene without rebuilding everything:

```bash
python scripts/tutorial/make_video.py --scenes 3
python scripts/tutorial/make_video.py --voice ar-EG-ShakirNeural   # male voice
python scripts/tutorial/make_video.py --no-music --no-dots
python scripts/tutorial/make_video.py --no-fade                     # hard cuts
python scripts/tutorial/make_video.py --force-tts                   # re-synthesize audio
python scripts/tutorial/make_video.py --remix                       # only re-mix the music
```

## Timeline & building it yourself

The character is **off by default** (`character.enabled: false` in
`slides.json`), so the video is just *slides + narration + music*. Add your own
presenter on top — or take the timings and build it wherever you like.

```bash
python scripts/tutorial/timeline.py      # npm run tutorial:timeline
```

This writes:

| Output | Contents |
|--------|----------|
| `tutorial/timeline.csv` | slide, start, end, duration, narration (Excel-friendly) |
| `tutorial/timeline.md` | the same table + PowerPoint step-by-step |
| `tutorial/narration.srt` | subtitle track for the narration |
| `tutorial/scene_kit/` | `slide_XX.png` + `scene_XX.mp3` paired per scene |

Current timings:

| # | Start | End | Length |
|---|-------|-----|--------|
| 1 | 0:00 | 0:11 | 10.9s |
| 2 | 0:11 | 0:26 | 14.8s |
| 3 | 0:26 | 0:47 | 21.3s |
| 4 | 0:47 | 0:54 | 7.1s |
| 5 | 0:54 | 1:05 | 11.4s |
| 6 | 1:05 | 1:26 | 20.3s |
| 7 | 1:26 | 1:47 | 21.6s |
| 8 | 1:47 | 1:54 | 6.9s |
| 9 | 1:54 | 2:03 | 9.1s |
| 10 | 2:03 | 2:19 | 15.1s |
| 11 | 2:19 | 2:33 | 14.0s |
| 12 | 2:33 | 2:41 | 8.9s |
| 13 | 2:41 | 2:49 | 7.8s |

**Doing it in PowerPoint:** put `scene_XX.mp3` on each slide
(*Insert → Audio → Audio on My PC*), set *Playback → Start: Automatically*, then
*Transitions → Advance Slide → After: <length>* with *On Mouse Click* off. Add
your character, then *File → Export → Create a Video*. The narration and timings
are already correct.

**Doing it in a video editor:** the timeline CSV/SRT gives you exact in/out
points; `scene_kit/` gives you matched image+audio pairs.

## Editing the narration

Everything is in `tutorial/slides.json`:

- `audio.voice` — any edge-tts Arabic voice (`ar-EG-SalmaNeural` female,
  `ar-EG-ShakirNeural` male, `ar-SA-ZariyahNeural`, …). List them with
  `edge-tts --list-voices`.
- `audio.rate` — e.g. `-4%` for a calmer pace.
- `character.enabled` / `width` / `marginX` / `marginY` — the presenter.
- `music.volume` — the synthesized background pad (0 disables it in practice;
  use `--no-music` to drop it entirely).
- `scenes[].text` — the spoken line, **fully vocalized Arabic (تشكيل)** so the
  voice pronounces it correctly. `scenes[].index` must match the slide number.

## Presentation format (audio-only)

The video is **audio-only**: slides + Arabic narration + progress dots + music bed.
No presenter/avatar is included. The pipeline previously supported an optional
code-drawn character (`scripts/tutorial/character.py`), but it has been removed.
The narration and slide timings remain exactly the same.

Refresh the look instantly without rebuilding the video:

```bash
python scripts/tutorial/preview_character.py C:\temp\char.png
```

Recolour by editing the palette constants at the top of `character.py`
(`SKIN`, `SHIRT`, `HAIR`, `LIP`, …).

Each scene also gets **progress dots** at the bottom and a short
**dip-to-black fade**; with the character enabled it additionally gets a teal
**spotlight** behind the presenter. The **music bed** is a generated slow chord
pad (no external audio file).

## Publish

### Firebase Storage (in-app stream — recommended)

```bash
node --env-file=.env.local scripts/tutorial/publish_video.mjs --email you@x.com --password 'secret'
```

Signs in with the admin account, uploads `tutorial/final.mp4`, and writes the
download URL into `src/data/tutorials.ts` (`TUTORIAL_MP4_URL`). Storage rules
must let that signed-in user write; the `EXPO_PUBLIC_FIREBASE_*` vars come from
`.env.local`.

### YouTube (shareable link)

```bash
python scripts/tutorial/upload_youtube.py --privacy unlisted
```

Needs a Google Cloud OAuth **Desktop app** client saved at
`tutorial/client_secret.json` with the *YouTube Data API v3* enabled. First run
opens a browser once; the token is cached at `tutorial/.youtube-token.json`
(both are git-ignored). The video URL is written into `src/data/tutorials.ts`
(`TUTORIAL_YOUTUBE_URL`).

Then commit the `src/data/tutorials.ts` change — the Help tab picks it up with no
other code changes.

## Troubleshooting

- **`moov atom not found`** on the source recording — it is still being written;
  wait for the recorder to finalize the file.
- **PowerPoint COM errors on the Arabic path** — always copy the pptx to an ASCII
  path (e.g. `C:\temptest`) before exporting, as the commands above do.
- **ffmpeg fails on a scene** — delete `tutorial/clips/scene_XX.*` and rerun;
  audio is cached so only that scene is redone.
- **Text renders mirrored/wrong** — Arabic in `slides.json` only affects speech;
  on-screen Arabic comes from the PPTX.
