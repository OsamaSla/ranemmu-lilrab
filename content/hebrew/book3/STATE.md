# Book 3 Hebrew — live state

Last updated: 2026-11-17 · after batch 10 (b30111–b30125), ends session S1

- Progress: **125 / 402** hymns, 1177 verse lines, 100 % pointed. `hebrew-meter
  --flags-only` reports 238 line flags for b30001–b30125, all reviewed and
  accepted; `hebrew:progress` shows 158, which is the `review[]` note count
  (156 from batches 1–8 plus 2 in batch 9), not the meter count.
- Next range: **b30126–b30140** (batch 11, first batch of session S2).
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
- The printed line is the unit, not the sentence: when the Arabic half-phrase
  is short, the Hebrew stays short too (b30056 2:2, b30057 2:2). Padding it to
  the stanza median is a regression, not an improvement.

## Deliberate geometry (do not "fix")

- Book 2 list: `PROJECT_NOTES.md` §15 (short refrains, long acclamations).
- Book 3 batches 1–5: 150 flags reviewed 2026-11-17, all accepted (relative
  line-length warnings, nothing structural).
- Book 3 batch 6 (b30051–b30065): 42 flags after 16 line edits, accepted:
  - stanza shape flags mirror the print: b30053 2/3/2/2, b30057 2/3/2/2,
    b30059 2/1/2/2, b30061 3/2/3/3/3/3/3/3 (stanza 2 is a two-line refrain),
    b30064 2/1/2/2/2/2.
  - short lines that are short in the Arabic: b30056 2:2, b30057 2:2,
    b30058 2:2, b30059 2:1, b30063 2:1/5:1, b30065 1:1.
  - long acclamation lines that are long in the Arabic: b30053 4:1,
    b30054 2:1, b30061 7:1, b30062 1:1/6:2/6:3, b30063 5:2, b30065 1:2.
- Book 3 batch 7 (b30066–b30080): 23 line flags after review, all accepted:
  - shapes that are the print's: b30066 1/5/1/1/1 (stanza 2 is a five-line
    refrain), b30074 5/5/5/5 with its 5-line refrain tags.
  - short lines that are short in the Arabic: b30066 2:1, b30069 2:1/2:2,
    b30072 1:1, b30074 3:3/4:2, b30077 3:1.
  - long acclamation lines that are long in the Arabic: b30066 4:1/5:1,
    b30069 3:1, b30071 4:2, b30074 4:1/4:3, b30075 2:1/3:1, b30077 2:3/4:1/4:3,
    b30078 1:1/3:2, b30079 1:2, b30080 2:4.
  - b30077 keeps `אֲדֹנִי שְׁטֹף אוֹתִי בְּאַהֲבָתְךָ הָעֶלְיוֹנָה` verbatim in
    five places (the print's refrain tag closes every stanza), so the same line
    is flagged five times; that is the hymn's form, not a metre fault.
  - b30070 (Ps 16:1–2), b30073 (2 Cor 12:9) and b30078 (Gen 32:27) quote their
    verses rather than paraphrasing them; each carries the one `R:` note.
- Book 3 batch 8 (b30081–b30095): 24 line flags after review, all accepted, none
  a missing or extra word — they are relative length only:
  - shape flags that are the print's: b30091 2/1/2 and b30094 2/1/2/2/2 (both
    carry a one-line `القرار` acclamation), b30081 1/1/1.
  - short acclamations: b30081 1:1, b30086 4:2, b30091 2:1 (the refrain line,
    -16 against the long stanzas), b30092 2:1, b30093 1:1/1:2.
  - long lines that are long in the Arabic: b30081 3:1, b30082 1:2,
    b30088 1:4, b30089 4:2/5:1, b30093 2:2, b30094 1:1.
  - b30094 2:1 is Ps 119:105 verbatim; b30081 2:1 is Ps 107:9 with the print's
    `لخبز` ending (`מִלֵּא לֶחֶם`) instead of the psalm's `מִלֵּא־טוֹב`.
- Book 3 batch 9 (b30096–b30110): 28 line flags after review, all accepted:
  - shape flags that are the print's: b30100 2/4/4, b30101 2/1/2/2/2 (stanza 2
    is the one-line acclamation `إلهى زدنى نعمة`), b30103 3/2/3/3 (stanza 2 is
    the two-line `القرار`), b30104 2/3/2/2, b30106 4/2/4/4/4, b30109 4/1/4/4.
  - short lines that are short in the Arabic: b30098 2:1/2:2 (the print's
    second stanza is two bare lines against four long ones), b30101 4:1,
    b30105 1:2, b30107 1:1/1:3 (the split refrain), b30108 3:1/4:1,
    b30109 3:3.
  - long lines that are long in the Arabic: b30096 3:3, b30097 1:2,
    b30098 1:1/1:2, b30103 4:1/4:2, b30104 1:1/4:2, b30107 3:4, b30109 2:1.
  - b30103's refrain is 2 Cor 12:9's own wording (`דַּיְּךָ חַסְדִּי`), the verse
    the hymn expands; b30107 renders `راضٍ وشاكر` as `שָׁלֵו וּמוֹדֶה` because
    `רָצוּי` would read "acceptable". Each carries the one `R:` note.
- Book 3 batch 10 (b30111–b30125): 24 line flags after review, all accepted,
  none structural — every stanza count matches the print:
  - short lines that are short in the Arabic: b30111 1:2/3:1, b30112 3:4,
    b30115 3:1 (the print's third stanza starts on a bare two-word call),
    b30117 2:4, b30118 2:1/3:1, b30120 3:1/5:1/6:2, b30123 1:3/3:2.
  - long lines that are long in the Arabic: b30113 1:1, b30115 2:3,
    b30117 1:3, b30118 4:1/5:1/6:2, b30120 2:1/6:1, b30121 3:2,
    b30123 1:2/6:3/6:4.
  - b30119 and b30125 print a repeat count inside the line
    (`(يا ابنى لا تنسى)٣`); the count is a singing instruction, so the phrase is
    written once and the line is not flagged.
  - b30120 2:1–2:2 are Exod 33:14 (`פָּנַי יֵלֵכוּ וְהִנַּחְתִּי לָךְ`) and
    Josh 1:9 (`חֲזַק וֶאֱמָץ`), the verses the print quotes; b30123 builds its
    last line of every stanza on Ps 23, b30118 on Ps 27:14 and 34:6.

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
