# Book 1 Hebrew — live state (subagent rotation driver)

Last updated: 2026-11-17 · after batch h0024-h0031

- Progress: **31 / 1047** hymns, 531 verse lines, 100 % pointed. `hebrew:progress`
  reports 19 `review[]` notes. `hebrew-meter --book main --flags-only` reports 16
  flags for h0001-h0007, 18 for h0008-h0015, 13 for h0016-h0023 and 17 for
  h0024-h0031, all reviewed and accepted.
- Next batch: **h0032–h0038** (7 hymns, 133 lines) — recompute with
  `node scripts/book1/next-batch.mjs` before every spawn.
- Plan: `content/hebrew/main/PLAN.md` (rotation order, child prompt, gates).
- Remaining tail after this book: none — Book 1 is the last book.

## Rotation state
- `date`: 2026-11-17
- `active_index`: 2 (`opencode/hy4-flash-free`) — keep until it hits a quota
  response; rotation advances only on a limit, not per batch.
- `exhausted_today`:
  - `opencode/deepseek-v4.1-flash-free` — reported quota-limited by user, 2026-11-17
- `models_used_so_far`:
  - `opencode/hy4-flash-free` — h0001-h0007 (pilot), h0008-h0015, h0016-h0023,
    h0024-h0031 (all gates green)
- Reset `exhausted_today` at the next local day boundary. On a quota response
  from a child, add that model here and advance `active_index` before retrying
  the same range.

## Style card (from Book 2 / Book 3, keep identical)
- Elevated biblical/liturgical Hebrew, **full niqqud on every word**.
- One Hebrew line per printed Arabic line; both half-phrases stay in one string
  joined by ` · `. Never retype stanza labels.
- Glossary (`content/hebrew/glossary.md`): `יֵשׁוּעַ` (never בישו), `רִבּוֹנִי`,
  `שָׁלוֹם לְךָ`, `מַפְגִּיעַ`, `כֹּהֵן גָּדוֹל`, `פָּדָה`/`פּוֹדֶה`/`גֹּאֵל`,
  `שַׂר־שָׁלוֹם`, `מִגְדַּל־עֹז`, `שֶׁמֶן תּוּרַק`, `גְּדוּדֵי שְׁאוֹל`,
  `אֶצְרֹף … כַּזָּהָב`.
- New settled word → add to the glossary in the same commit as the hymn.
- Meter flags are a prompt to re-read, not errors. Deliberate asymmetries stay
  and are listed below.
- The printed line is the unit, not the sentence: a short Arabic half-phrase
  stays short in Hebrew. Padding it is a regression.
- **Chorus**: `C:` gets the Hebrew text of the chorus-tagged verse, joined by
  ` · ` (Book 2's `chorus_he` convention). The Arabic label `القرار`/`قرار` stays
  as stanza-label data.

## Deliberate geometry (do not "fix")
- h0001-h0007 (pilot): 16 flags, all Arabic-driven shape/length — no missing or
  extra words. h0001 6/4/6/6 and h0007 4/2/4/4 (short chorus verse); h0003,
  h0004, h0005 short/long chorus lines and shorter parallels where the Arabic
  is shorter. h0003 1:4 and h0004 2:1/2:4 are long in the Arabic.
- h0008-h0015: 18 flags, all deliberate — print shapes 4/2/4/4 (h0009), 8/4/8
  (h0010), 4/2/4 (h0012), 6/8/8 (h0013), 8/4/8/8 (h0015); short Arabic lines
  (h0008 2:4/3:4, h0011 2:2, h0013 3:2/3:4, h0015 4:3) and long ones (h0008
  2:3, h0009 1:2, h0011 3:3, h0013 1:6, h0015 2:1/2:2/2:4). No words lost.
- h0016-h0023: 2 real omissions fixed during review (h17 4:1 restored `كنتُ`
  → `אֲנִי`; h20 3:1 restored `اللي` → `אֲשֶׁר`); remaining 13 flags deliberate —
  shapes 4/2/4/4 (h17), 4/5/4/4 (h19), short Arabic lines (h16 1:1/1:3, h19 3:2,
  h20 3:1, h22 5:4, h23 1:4) and long ones (h16 2:2, h17 2:2, h18 4:3, h20 1:3,
  h22 4:1). No words lost.
- h0024-h0031: 1 real omission fixed during review (h30 3:2 dropped "المُعيب",
  restored `הַמְּגוּנָה`); remaining 17 flags deliberate — shapes 4/6/4/4/4
  (h24), 9/9 (h26), 4/2/4/4/4 (h28), short/long Arabic parallels (h24 1:1/4:1/
  5:4, h25 3:2, h26 1:3/2:3, h28 1:1, h29 1:1/4:2, h30 2:1-2:4/4:1/4:3).
- Tooling fix (commit `71522d3a`): `hebrew-meter.mjs` now falls back to the corpus
  file name when a hymn has no `book` key, so `--book main` sees hymns 1-1000.

## Per-batch loop
```
node scripts/book1/next-batch.mjs
# parent spawns one subagent with PLAN.md's prompt and the active model
# parent verifies progress, updates this file, rotates on quota, repeats
```

## Resume ritual
If the session is interrupted: run `node scripts/hebrew-progress.mjs` and
`node scripts/book1/next-batch.mjs`; the first gap is the next batch. Never redo
a committed payload. Check the rotation state above before spawning.
