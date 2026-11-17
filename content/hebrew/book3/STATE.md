# Book 3 Hebrew — live state

Last updated: 2026-11-17 · after batch 18 (b30231–b30245), S3 at 3/5 batches

- Progress: **245 / 402** hymns, 2350 verse lines, 100 % pointed. `hebrew-meter
  --flags-only` reports 503 line flags for b30001–b30245, all reviewed and
  accepted; `hebrew:progress` shows 201, which is the `review[]` note count
  (178 through batch 15, 8 in batch 16, 7 in batch 17, 8 in batch 18), not the
  meter count.
- Next range: **b30246–b30260** (batch 19, fourth of S3).
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
- Book 3 batch 11 (b30126–b30140): 38 line flags after two clarifying edits,
  all accepted; every stanza count matches the print:
  - shape flags are the print's: b30128 2/1/2 (one-line refrain), b30129
    3/5/5/5, b30132 4/3/4/4, b30134 2/3/2/2/5, b30136 2/1/2/2, b30137
    2/4/2/2/2, b30140 2/3/2/2/2/2/2.
  - relative length only: short lines b30126 2:5/5:3, b30129 4:5, b30131
    2:4 (was −5, expanded with `וְתַבִּיט` and `בְּצֶדֶק`), b30136 1:2 (was
    −5, added `לו`), b30139 1:3; long lines b30126 4:4/5:5, b30129 1:1/
    1:3/3:2/4:4, b30130 3:1, b30131 4:3, b30134 3:1, b30140 6:2.
  - b30129's refrain is 1 Sam 7:12's own `עַד־הֵנָּה עֲזָרָנוּ`, b30131 is a
    close rendering of Ps 91 and b30136's repeated line is Ps 57:8's
    `נָכוֹן לִבִּי`; each carries the one `R:` note.
- Book 3 batch 12 (b30141–b30155): 40 line flags after review, all accepted,
  none structural:
  - shape flags are the print's: b30143 4/2/4/4 (a two-line refrain), b30149
    2/3/2/2, b30150 2/1/2/2, b30151 2/2/2/3, b30154 3/2/2/3.
  - lines short in the Arabic: b30142 2:2 (`أو فى ضيق`), b30148 2:1/2:3
    (the bare `تستطيع كل شيء` tag), b30150 2:1, b30151 4:3
    (`יֵשׁוּעַ עַתָּה לִי`), b30152 3:3, b30154 2:1.
  - long lines that are long in the Arabic: b30142 2:1/4:2, b30144 2:1/3:2,
    b30147 2:1/2:2/4:4, b30148 3:2/3:3/5:1, b30149 1:1, b30150 1:1,
    b30151 1:1/4:2, b30152 2:4.
  - b30143's parenthesised refrain tag is written plainly, like its other
    occurrences; b30149 follows 2 Sam 22/Ps 18, b30154 closes on Phil 4:6–7.
  - `b30146` now lends its Hebrew to `h0296` (corpus build reports 15 such
    loans), an automatic consequence of the same hymn appearing in two books.
- Book 3 batch 13 (b30156–b30170): 34 line flags after review, all accepted;
  no missing or extra words, every stanza count matches the print:
  - shape flags are the print's: b30157 2/1/2/2/2, b30165 2/1/2/2, b30166
    3/2/3/3, b30167 3/2/2/2, b30170 2/1/2/2.
  - short lines that are short in the Arabic: b30161 2:1, b30163 6:1, b30164
    2:1, b30165 3:2, b30166 2:2, b30169's short acclamations.
  - long lines that are long in the Arabic: b30156 1:1, b30157 5:1/5:2, b30158
    1:1/1:2, b30160 6:2, b30161 1:2, b30164 4:1, b30165 2:1, b30169 1:1/
    1:4/2:2/3:3, b30170 3:1.
- Book 3 batch 14 (b30171–b30185): 35 line flags after review, all accepted:
  - shape flags are the print's: b30176 2/4/2/2, b30177 4/3/4/4/4, b30180
    4/3/4, b30181 2/1/2/2/2.
  - `b30171` is the same hymn as `tr0375`; its settled wording is reused with
    full pointing instead of being re-translated. `R:` notes also record
    b30174's triple `הנחלה` (Ps 16:5–6), b30180's repeated `لا أخاف` (Ps 23),
    b30182's Ps 57:8 refrain, and b30184's Isa 58:11 / 40:31 echoes.
  - relative length only: short lines b30171 3:3, b30172 1:2, b30173 1:3/3:1,
    b30177 2:3/3:2/5:4, b30180 2:1/2:2/2:3, b30181 1:1/3:1/4:2, b30182
    1:2/2:2, b30183 1:2; long lines b30172 2:2/4:1, b30173 1:4/2:1/3:3,
    b30176 2:1, b30177 1:3/2:2, b30179 1:1, b30181 2:1, b30185 1:1.
- Book 3 batch 15 (b30186–b30200): 29 line flags after review, all accepted;
  no missing or extra words, every stanza count matches the print:
  - shape flags are the print's: b30191 1/4/4/4 (a one-line theme stanza),
    b30194 2/3/3/3, b30196 2/5/2/2, b30200 2/4/2/2.
  - lines short in the Arabic: b30187 3:1, b30188 2:2, b30191 4:2 (the
    child-in-the-bosom line), b30193 4:1, b30196 2:2, b30197 3:1/5:2,
    b30198 1:1–1:3 (Ps 23's short lines), b30199 4:1.
  - long lines that are long in the Arabic: b30188 1:1/1:3, b30190 1:2/2:1/
    3:3/3:4, b30193 1:2, b30195 1:2, b30196 4:1, b30197 4:2, b30198 2:1–2:3,
    b30200 1:2.
  - printed repetitions are written out, not counted as faults: b30189's
    `(كاملة)٣` is a repeat count (the phrase is written once), b30192's
    `لا .. لا ..` and b30196's `لا .. لا` are sung repetitions.
  - `R:` notes for quoted verses: b30188 (2 Cor 12:7–10), b30189 (Zech 4:10 /
    2 Chr 16:9), b30191 (Ps 55:23 / Rom 8:32 / Isa 49:15), b30192 (Jer 32:27),
    b30196 (Matt 6:26–28), b30198 (Ps 23), b30199 (Ps 27:6 / Rom 8:31).
- Book 3 batch 16 (b30201–b30215): 26 line flags after review, all accepted;
  no missing or extra words, every stanza count matches the print:
  - shape flags are the print's: b30201 2/1/2/2 and b30210 2/1/2 (a one-line
    stanza 2), b30202 4/2/4/4 (a two-line stanza 2).
  - lines short in the Arabic: b30202 1:2/1:4 (the short vocative acclamations),
    b30206 2:2 (the terse "Your cross redeemed me" half), b30207 5:2, b30209
    6:1 (the closing stanza drops the long "follow Jesus" refrain).
  - long lines that are long in the Arabic: b30201 3:2, b30202 1:3, b30203 5:1,
    b30205 2:1, b30206 1:4/4:2/4:3, b30207 1:1, b30208 3:2/5:1, b30210 1:2,
    b30211 2:2, b30212 1:1–1:2, b30213 4:1.
  - quoted verses carry the only eight `R:` notes: b30202 (2 Cor 12:9's own
    `דַּיְּךָ חַסְדִּי`), b30203 (Ps 23:4 / the furnace youths of Dan 3), b30204
    (Rom 8:35–36 / Ps 44:22), b30205 (1 Thess 4:17 / Rev 19:9), b30206
    (Isa 53:12 for the intercessor), b30212 (Ps 115:1), b30213 (Joel 2:25),
    b30214 (1 Cor 2:8 / Isa 49:22).
- Book 3 batch 17 (b30216–b30230): 25 line flags after review, all accepted;
  no missing or extra words, every stanza count matches the print:
  - shape flags are the print's: b30224 2/3/2/2 (a three-line stanza 2).
  - short lines that are short in the Arabic: b30217 2:1, b30220 1:1, b30222
    1:2/3:1, b30223 1:2/2:1, b30224 2:1 (the bare "I leave all" couplet),
    b30227 1:1/4:1, b30230 3:1.
  - long lines that are long in the Arabic: b30216 5:2, b30217 1:2/5:2,
    b30218 2:2, b30219 2:1, b30220 1:2/2:1, b30222 4:2, b30224 1:1,
    b30227 2:1/3:1, b30230 2:1 (the threefold "I follow You" refrain).
  - quoted verses carry the only seven `R:` notes: b30216 (Matt 28:20),
    b30217 (John 6:68), b30219 (John 19:28's צָמֵא אֲנִי), b30220
    (Rev 4:10's crowns), b30222 (Mary's alabaster jar), b30229 (Ps 86:11),
    b30230 (Rev 2:10's crown of life).

- Book 3 batch 18 (b30231–b30245): 38 line flags after one clarifying edit,
  all accepted; no missing or extra words, every stanza count matches the print:
   - shape flags are the print's: b30231 4/2/4/4, b30232 1/2/2/2,
     b30233 4/3/4, b30234 2/1/2, b30236 2/1/2/2/2, b30239 4/2/4,
     b30244 4/1/4/4/1 (one-line القرار stanzas), b30245 4/2/4/4.
   - short lines that are short in the Arabic: b30231 3:1, b30233 1:1,
     b30234 3:2, b30239 3:2, b30241 2:2, b30242 2:1/2:2/2:3 (the three-line
     refrain), b30243 1:2/4:2, b30244 2:1 (the bare "come to Jesus" couplet).
   - long lines that are long in the Arabic: b30231 2:2 (the "my possession,
     my servant" acclamation), b30232 2:2, b30234 1:2, b30235 1:1/2:3,
     b30236 5:1/5:2, b30237 3:1, b30240 2:1, b30242 3:1, b30243 4:3,
     b30245 4:1.
   - one real fault fixed: b30231 4:4 was −6 because `לְרַגְלָיו` dropped the
     Arabic's `موطئ قدميه` (the place of His feet); restored as
     `אֵצֶל מִדְרַךְ רַגְלָיו`, the flag cleared.
   - quoted verses and glossary choices carry the only eight `R:` notes:
     b30231 (קִנְיָן for ملكه), b30232 (נַחֲלָה for نصيب),
     b30233 (קָנָה for اشترى), b30237 (חֻלְשָׁתִי / מַפְגִּיעַ),
     b30241 (מַטָּרָה for قصد), b30243 (Isa 6:6-7's burning coal on the lips),
     b30244 (Golgotha not Gethsemane; כֹּפֶר for فدية), b30245 (John 4:35's
     whitened fields).

**CI gotcha (fixed 2026-11-17):** `build:web` runs `build:corpus` then
`git diff --exit-code -- assets/hymns src/data/generated-chunks.ts`. A batch
commit that adds Hebrew payloads but omits the regenerated `assets/hymns/`
fails that gate in CI — this is what broke the S1 docs push (#281). Always
`npm run build:corpus` and stage `assets/hymns` in the same commit as the
payloads; locally `git diff --exit-code -- assets/hymns ...` must return 0.

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
