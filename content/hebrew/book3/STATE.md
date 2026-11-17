# Book 3 Hebrew — live state

Last updated: 2026-11-17 · start of S0 (tooling done, no new hymns yet)

- Progress: **50 / 402** hymns, 465 verse lines, 100% pointed, 96 meter flags
  (plus 150 `review[]` notes written by the earlier batches).
- Next range: **b30051–b30065** (batch 6 of 24).
- Plan: `content/hebrew/book3/PLAN.md` (sessions, batches, per-batch commands).
- Do not re-read all of `PROJECT_NOTES.md`; §15 (Book 2 decisions) and §16
  (base + batch log) are the only relevant parts. This file is the checkpoint.

## Style card (from Book 2, keep identical)

- Elevated biblical/liturgical Hebrew, **full niqqud on every word**.
- One Hebrew line per printed Arabic line; both half-phrases stay in one string
  joined by ` · `.
- Glossary (full list in `content/hebrew/glossary.md`): `יֵשׁוּעַ` (never בישו),
  `רִבּוֹנִי`, `שָׁלוֹם לְךָ`, `מַפְגִּיעַ`, `כֹּהֵן גָּדוֹל`, `פָּדָה`/`פּוֹדֶה`/`גֹּאֵל`,
  `שַׂר־שָׁלוֹם`, `מִגְדַּל־עֹז`, `שֶׁמֶן תּוּרַק`, `גְּדוּדֵי שְׁאוֹל`,
  `אֶצְרֹף … כַּזָּהָב`.
- New settled word → add it to the glossary in the same commit as the hymn.
- Meter flags are a prompt to re-read, not errors. Deliberate asymmetries stay
  and are listed below.

## Deliberate geometry (do not "fix")

- Book 2 list: `PROJECT_NOTES.md` §15 (short refrains, long acclamations).
- Book 3 so far: none recorded; batches 1–5 left 150 flags, all reviewed on
  2026-11-17 and accepted (they are relative line-length warnings).

## Per-batch loop

```
node scripts/hebrew-digest.mjs book3 <from> <to> --pack > content/.cache/hebrew/<from>-<to>.digest.txt
#   author content/.cache/hebrew/<from>-<to>.he.txt (same block, Hebrew substituted)
node scripts/hebrew-pack.mjs content/.cache/hebrew/<from>-<to>.he.txt --book book3
npm run hebrew:apply && npm run hebrew:check
node scripts/hebrew-meter.mjs --book book3 --from <from> --to <to> --flags-only
npm run hebrew:align && npm run build:corpus
git add content/hebrew/book3 content/book3.json assets/hymns
git commit -m "feat(hebrew): Book 3 batch <n> (b3<from>-b3<to>)"
```

Review flags for the batch; fix only real faults. One push at the end of the
session, after `hebrew:progress` is copied here.
