# Book 1 Hebrew — live state (subagent rotation driver)

Last updated: 2026-11-17 · after batch h0101-h0108

- Progress: **108 / 1047** hymns, 1980 verse lines, 100 % pointed. `hebrew:progress`
  reports 96 `review[]` notes. `hebrew-meter --book main --flags-only` reports 16
  flags for h0001-h0007, 18 for h0008-h0015, 13 for h0016-h0023, 17 for
  h0024-h0031, 15 for h0032-h0038, 32 for h0039-h0045, 11 for h0046-h0052,
  18 for h0053-h0058, 18 for h0059-h0065, 15 for h0066-h0071, 13 for
  h0072-h0078, 24 for h0079-h0086, 13 for h0087-h0093, 23 for h0094-h0100
  and 6 for h0101-h0108, all reviewed and accepted.
- Next batch: **h0109–h0114** (6 hymns, 137 lines) — recompute with
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
    h0024-h0031, h0032-h0038, h0039-h0045, h0046-h0052, h0053-h0058,
    h0059-h0065, h0066-h0071, h0072-h0078, h0079-h0086, h0087-h0093,
    h0094-h0100, h0101-h0108 (all gates green)
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
- h0032-h0038: 15 flags, all Arabic-driven shape/length asymmetries — no missing or
  extra words. Print shapes 4/5/4/4 (h32), 4/6/4/4 (h33), 4/4/4/4 (h34),
  2×7 (h35), 4/4/4/4/4 (h36), 4/4/4 (h37), 12/12/12 (h38); short lines
  (h33 2:4/4:1, h35 7:1/7:2, h36 1:3/1:4, h37 2:1) and long ones
  (h33 4:3/4:4, h34 4:2, h35 3:1/3:2, h38 1:7). h35 3:2 at +4 was re-read and kept.
- h0039-h0045: 32 flags, all Arabic-driven — no missing or extra words. Shapes
  4/10/10 (h39), 4/2/4/4 (h40), 4/4/4/4 (h41, h44, h45), 4/3/4/4/4 (h42),
  6/6/6/6 (h43). h39 has two 10-line stanzas with uneven parallels (1:4 -8,
  3:7 +4); h41's chorus stanza 2 is genuinely long in the Arabic (two
  half-phrases per line, +6…+10) and `chorus_he` repeats 2:1-2:4 verbatim —
  verified against the digest, not padding; h45's medians are skewed by a
  16/14-syllable pair (2:3 -8, 2:4 -6). h44 had no flags.
- h0046-h0052: 11 flags, all Arabic-driven — no missing or extra words. Shapes
  4/4/4/4/4 (h46-h48), 4/4/4/4/4/4 (h49), 2/8/6 (h52); h50-h51 clean. h52's
  2/8/6 irregularity and h49's long "الكيان/المحبة" parallels are in the Arabic.
  Choruses: v2 for h46-h50, v1 for h51-h52.
- h0053-h0058: 18 flags, all Arabic-driven — no missing or extra words. Shapes
  10/10/10 (h53, h57), 4/4/4/4 (h54, h56, h58), 4/2/4/4/4 (h55); short
  2:4/3:4 lines in h54, long chorus lines, skewed medians in h55/h57.
  Choruses: h54 v1 (title stanza), h55 v1 (2-line refrain).
- h0059-h0065: 18 flags, all Arabic-driven — no missing or extra words. Shapes
  4/4/4 (h59, h60, h64), 4/4/4/4/4 (h61), 4/4/4/4 (h62), 8/4/8/8 (h63),
  9/9/9 (h65); short refrains drag the medians in h61/h65, long Arabic lines
  kept in h59/h63/h65.
- h0066-h0071: 15 flags, all Arabic-driven — no missing or extra words. Shapes
  4/4/4/4 (h66, h67), 7/5/5/5/5 (h68), 5/8/5/5 (h69), 4×6 (h70), 4×5 (h71);
  short vocative/parenthetical lines and long two-half-phrase lines kept.
  Choruses: h67-h68 v1, h69-h71 v2; h66 none.
- h0072-h0078: 13 flags, all Arabic-driven — no missing or extra words. Shapes
  4/4/4/4 (h72, h73), 8/4/8 (h75), 6/4/6/6 (h76), 6/6/6 (h77), 9/9/9 (h78);
  h74/h77 shapes noted in the digest; skewed medians in long two-half-phrase
  lines and short vocatives.
- h0079-h0086: 24 flags, all Arabic-driven — no missing or extra words. Shapes
  4/4/4/4 (h79, h86), 4/2/4/4 (h80), 2/4/2/2 (h81), 8/2/8/8 (h82),
  8/8/8 (h83), 4/4/4 (h84), 4/8/4/4 (h85). Two real faults fixed in review:
  h81 4:1 `נַרִים` → `נָרִים`; h85 4:3 stray Arabic letter in `בַּצְּלָב`.
  h83 has no chorus; the other seven do.
- h0087-h0093: 13 flags, all Arabic-driven — no missing or extra words. Shapes
  4/4/4/4/4 (h87, h93), 4/4/4/4 (h88, h91), 8/4/8/8 (h90), 8/8 (h92);
  h89 clean. h92's spread 8 is a long 8th line in the Arabic. Two dropped
  pronouns `أنّي`/`أنا` restored in review then repacked. Choruses: h87-h91
  and h93 v2; h92 none.
- h0094-h0100: 23 flags, all Arabic-driven — no missing or extra words. Shapes
  4/4/4/4 (h94), 2/5/5/5 (h95), 4/4/4/4/4 (h96, h100), 4/4/4/4 (h98),
  4/2/4/4/4 (h99); h97 clean. h100's printed leading verse numbers
  (1/2/3/4 at 1:1, 3:1, 4:1, 5:1) are source numbering artifacts, not words —
  omitted per the h0081 precedent (verified against the digest). Choruses:
  h94/h95/h97 v1, h96/h98/h99/h100 v2.
- h0101-h0108: 6 flags left after review (9 initial), all Arabic-driven — no
  missing or extra words. Shapes 4×5 (h101, h103, h108), 4×6 (h105); h102,
  h104, h106, h107 clean. Real faults fixed: restored dropped `كنت` (`הָיִיתִי`,
  h101 3:1) and `قد` (`כְּבָר`, h101 5:3), removed extra `גַּם` (h103 2:4),
  tightened `כַּאֲשֶׁר`→`כְּשֶׁ` (h108 3:2). Source numbering artifacts (`4 –` at
  h101 5:1, h108 5:1) omitted per h0081/h0100. Choruses: h101-h103/h105/h108 v2.
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
