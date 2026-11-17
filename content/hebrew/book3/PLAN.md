# Book 3 Hebrew — session plan (352 hymns to go)

Status: 125 / 402 done (b30001-b30125, 1177 lines, 238 meter line flags, 158
review notes). Session S1 complete and pushed. Remaining: **277 hymns**
(b30126–b30402) in **19 batches of 15**, grouped into **4 working sessions**
(S2–S5).

Read order for a new session: this file → `STATE.md` → `content/hebrew/glossary.md`.
Do **not** read all of `PROJECT_NOTES.md`; §15/§16 is the only relevant part and
this file supersedes it for the batch loop.

---

## 0. Rules that keep the cost down

| waste | today | plan |
|---|---|---|
| digest input | Arabic + English (EN = 53% of bytes) | Arabic only (`--pack`) |
| `review[]` prose | ~530 chars/hymn | none, except one terse `R:` line when a real choice was made |
| JSON scaffolding | ~708 chars/hymn | packer writes it; the author writes plain lines |
| meter output | all 425 hymns (~5k tokens/run) | `--flags-only` for the batch only (~0.5k) |
| context | full notes re-read | `STATE.md` (25 lines) + glossary once per session |

Target: **~0.5k tokens per hymn**, ~1.2k for a 15-hymn batch including gates.
Hard rule: one batch = one commit; one push at the end of a session.

## 1. Pipeline (after S0)

```
node scripts/hebrew-digest.mjs book3 51 65 --pack > content/.cache/hebrew/51-65.digest.txt
#   author content/.cache/hebrew/51-65.he.txt  (same block, Arabic replaced by Hebrew)
node scripts/hebrew-pack.mjs content/.cache/hebrew/51-65.he.txt --book book3
npm run hebrew:apply
npm run hebrew:check
node scripts/hebrew-meter.mjs --book book3 --from 51 --to 65 --flags-only
npm run hebrew:align
npm run build:corpus
git add content/hebrew/book3 content/book3.json assets/hymns
git commit -m "feat(hebrew): Book 3 batch N (b30051-b30065)"
```

Pack format (one block per hymn, `S:L` = stanza:line of the *printed* hymn):

```
#51 | metre 87.87 | shape 4/4/4
T: <title_he>
1:1 <pointed Hebrew line>
1:2 <pointed Hebrew line>
2:1 <pointed Hebrew line>
R: <optional, one line, why a word was chosen>   (at most one per hymn)
```

Both halves of a printed line stay in one string, joined by ` · `.
Full niqqud on every word. Hebrew letters only. Never retype stanza labels.

## 2. Session S0 — tooling (no translation)

| step | file | change |
|---|---|---|
| 0.1 | `PROJECT_NOTES.md` | §16: record batches 2–5 (5 commits, 2026-11-16 21:15–21:27, 50 hymns) + this pipeline |
| 0.2 | `scripts/lib/hebrew-text.mjs` | new: `POINT`/`HEBREW`/`FOREIGN` + `checkLine()`, imported by apply and pack |
| 0.3 | `scripts/hebrew-digest.mjs` | `--no-en`, `--pack` (template above, no EN, no topics) |
| 0.4 | `scripts/hebrew-meter.mjs` | `--book/--from/--to`, `--flags-only` |
| 0.5 | `scripts/hebrew-pack.mjs` | new: validate shape + pointing, write payloads, `--dry-run`, `--force` |
| 0.6 | `package.json` | `hebrew:pack` script |
| 0.7 | `content/hebrew/book3/STATE.md` | new: progress, next range, style card, resume ritual |

Exit criteria: round-trip of b30041–b30050 through `hebrew:pack --dry-run`
deep-equals the committed payloads (ignoring `review[]`); `hebrew:check` clean;
`hebrew:meter --from 1 --to 50 --flags-only` still 96 flags; `eslint` on the
touched scripts clean; one `chore(hebrew)` commit.

## 3. Translation sessions

| session | batches | hymns | range |
|---|---|---|---|
| S1 | 5 | 75 | b30051–b30125 |
| S2 | 5 | 75 | b30126–b30200 |
| S3 | 5 | 75 | b30201–b30275 |
| S4 | 5 | 75 | b30276–b30350 |
| S5 | 4 | 52 | b30351–b30402 |

Batch ranges inside a session (15 each, last one shorter):

- S1: 51–65, 66–80, 81–95, 96–110, 111–125
- S2: 126–140, 141–155, 156–170, 171–185, 186–200
- S3: 201–215, 216–230, 231–245, 246–260, 261–275
- S4: 276–290, 291–305, 306–320, 321–335, 336–350
- S5: 351–365, 366–380, 381–395, 396–402 (7)

### Start of every session

1. `git status` must be clean (previous session pushed).
2. Read `STATE.md`, then `glossary.md` once.
3. `npm run hebrew:progress`; the next range is the first number with no payload.
4. Work through the session's batches with the pipeline above.

### End of every session (gate before hand-off)

```
node scripts/hebrew-meter.mjs --book book3 --flags-only   # review the flags
npm run hebrew:align                                       # must be ✓ n translated
npm run check:hymns                                        # 1824 hymns, all pass
npm run typecheck                                          # no app code changed, must be clean
npm run hebrew:progress                                    # copy into STATE.md
```

Then: update `STATE.md` (progress, next range, anything surprising), add one
line to the `PROJECT_NOTES.md` §16 batch log if the session changed behaviour,
commit, and **one** `git push` (it deploys both hosts).

### Per-batch review policy

Read the meter flags for the batch and fix only real faults: `no vowels at all`,
a flag caused by a missing/extra word, or a line that no longer carries the
Arabic. Deliberate asymmetries (short refrains, a long acclamation line) stay and
are listed in `STATE.md`, exactly as §15 does for Book 2.

Quality guard rails, unchanged: `hebrew:apply` refuses labels/line counts that
drift, `hebrew:pack` refuses an unpointed or non-Hebrew line, `hebrew:align`
audits the merged corpus. Glossary terms come from `content/hebrew/glossary.md`.

## 4. Why a fresh session per session

- Five batches ≈ 40–50k tokens of context; a sixth would start crowding the
  window with finished batches that no longer matter.
- A new session pays ~8k to reload `STATE.md` + glossary; compacting mid-session
  pays more and risks losing a decision that was never written down.
- With `STATE.md` + per-batch commits, a crashed session resumes at the last
  committed batch — nothing is lost but the current batch's draft.

## 5. Definition of done (whole book)

- 402/402 payloads, `npm run hebrew:check` clean, `hebrew:align` ✓ 727 translated
  hymns (375 taranim + 352 book3), `check:hymns` pass, `typecheck` clean.
- Meter flags reviewed; deliberate cases recorded in `STATE.md`.
- Browser spot check per session on the dev server: `HE` chip, disclaimer, RTL,
  pointed text, zero console errors.
- `PROJECT_NOTES.md` §16 states the final count and the remaining tail (Book 1).

## 6. Resume checklist (any new session)

```
git log --oneline -3
node scripts/hebrew-progress.mjs
node scripts/hebrew-digest.mjs book3 <next> <next+14> --pack
```

If `content/hebrew/book3/<next>.json` already exists, the batch was committed;
continue from the next gap. Never re-author a committed payload.

## 7. When to open a new session

Measured on this machine: one 15-hymn batch costs ~12–15k tokens (digest ~4k,
authoring ~6k, apply log + meter flags ~2k). Two batches per session leaves
plenty of room; **three is the point to stop** — the third digest is written
against a context already holding two finished batches that no longer matter.

So: after **2 batches** finish the session cleanly (STATE + notes committed);
start the next session with the paste-block below. Never push mid-session — one
push at the end of the session group, and only after the S1 gate (§3) passes.

Paste block for a new session:

```
read content/hebrew/book3/PLAN.md and STATE.md, continue at <batch>, <range>
```

Everything else (glossary, style card, loop commands, deliberate flags) is in
those two files — do not paste them again.
