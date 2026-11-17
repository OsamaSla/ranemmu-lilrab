# Book 1 Hebrew — live state (subagent rotation driver)

Last updated: 2026-11-17 · setup complete, no batch started yet

- Progress: **0 / 1047** hymns, 0 / 19,685 verse lines, 0 % pointed.
- Next batch: **h0001–h0007** (7 hymns, 124 lines) — recompute with
  `node scripts/book1/next-batch.mjs` before every spawn.
- Plan: `content/hebrew/main/PLAN.md` (rotation order, child prompt, gates).
- Remaining tail after this book: none — Book 1 is the last book.

## Rotation state
- `date`: 2026-11-17
- `active_index`: 1 (`opencode/deepseek-v4.1-flash-free`)
- `exhausted_today`:
  - `opencode/deepseek-v4.1-flash-free` — reported quota-limited by user, 2026-11-17
- `models_used_so_far`: [] (empty; no payloads yet)
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
- None yet — first batch not started.

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
