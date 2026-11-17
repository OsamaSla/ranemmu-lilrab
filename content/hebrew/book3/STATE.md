# Book 3 Hebrew — live state

Last updated: 2026-11-17 · after batch 27 (b30366–b30380), S5 2/4

- Progress: **380 / 402** hymns, 3661 verse lines, 100 % pointed. `hebrew-meter
  --flags-only` reports 803 line flags for b30001–b30380, all reviewed and
  accepted; `hebrew:progress` shows 298, which is the `review[]` note count
  (178 through batch 15, 8 in batch 16, 7 in batch 17, 8 in batch 18, 8 in
  batch 19, 8 in batch 20, 10 in batch 21, 14 in batch 22, 14 in batch 23,
  13 in batch 24, 0 in batch 25, 15 in batch 26, 15 in batch 27), not the
  meter count.
- Next range: **b30381–b30395** (batch 28, third of S5).
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

- Book 3 batch 19 (b30246–b30260): 31 line flags after review, all accepted;
  no missing or extra words, every stanza count matches the print:
   - shape flags are the print's: b30246 2/3/2/2/2, b30253 3/2/3/3, b30258
     2/1/2, b30260 4/5.
   - short lines that are short in the Arabic: b30246 2:2 (the bare "here I am"
     couplet), b30256 2:2, b30259 2:3/4:1, b30260 1:2/1:3 (the short
     new-creation lines).
   - long lines that are long in the Arabic: b30246 1:2/4:2, b30247 1:2,
     b30248 1:1, b30249 3:2, b30250 1:4/4:1, b30251 2:1, b30253 1:1/4:2/4:3,
     b30257 2:1, b30258 2:1 (the threefold "He paid my debts"), b30259 3:4/4:3,
     b30260 2:2/2:3 (the "beware the shut door" warning).
   - b30260's stanza 2 is an invitation whose "regret" is rendered as missing
     the chance to be in Christ; b30257 2:2's (فى وسطكم)٢ is a sung repeat
     count, written once.
   - quoted verses and glossary choices carry the only eight `R:` notes:
     b30248 (the וזן talent/weight wordplay), b30251 (1 Pet 5:7's cast cares /
     Heb 13:5's לֹא תַּעַזְבֵנִי), b30253 (פִּקָּדוֹן for أمانة; Matt 16:24's
     deny self), b30254 (John 3:17 not to condemn), b30256 (Rev 22:1's water
     of life), b30257 (repeat count + רֶגֶשׁ for عواطف), b30258 (سفير as
     envoy שָׁלִיחַ), b30260 (2 Cor 5:17's new creation).

- Book 3 batch 20 (b30261–b30275, S3 complete): 21 line flags after review, all
  accepted; no missing or extra words, every stanza count matches the print:
   - shape flags are the print's: b30266 3/2/3/3 (a two-line couplet as stanza
     2), b30274 4/2/4, b30275 4/1/4 (one-line القرار stanza).
   - relative length only: short lines b30261 1:2/5:2, b30266 4:2, b30268 4:3,
     b30270 1:1, b30273 3:2; long lines b30261 1:1/2:2/4:1, b30266 3:2,
     b30270 2:1/6:1 (the repeated second-person refrain), b30273 1:2/2:1/
     3:1/5:2, b30275 3:1.
   - sung repetitions are written out: b30265's `..` pauses (1:3/2:3),
     b30271's `..` pauses, b30275 2:1's `לֹא לֹא לֹא`; the `..` are kept as in
     the print and not counted as faults.
   - quoted verses and glossary choices carry the only eight `R:` notes:
     b30261 (Christ's pierced side, John 19:34; سفير = שָׁלִיחַ), b30263
     (Eph 3:20), b30264 (Gen 17:1 + Matt 16:24), b30266 (הֵד for صدى;
     الفتور = רְפִיָּה), b30269 (Acts 10:38), b30270 (John 3:30; divine Rock
     is צוּר not סֶלַע), b30273 (Col 1:18; نعمة = חֶסֶד), b30275 (1 Pet 2:11
     גֵּר + 1 Pet 5:7; מוֹלֶדֶת homeland).
   - `build:corpus` now reports 17 lent Hebrew hymns (was 15); b30272 lends to
     h0349 (the hymn appears in both books). This is automatic, not a fault.

- Book 3 batch 21 (b30276–b30290): 39 line flags after one clarifying edit,
  all accepted; no missing or extra words, every stanza count matches the print:
   - shape flags are the print's: b30278 3/6/4, b30280 2/4/2/2, b30284
     2/3/3/3, b30287 3/2/3/3/3, b30288 4/1/4 (one-line القرار stanza).
   - b30288 2:1 keeps the print's `...` sung pauses verbatim.
   - short lines that are short in the Arabic: b30276 4:1, b30277 1:3,
     b30278 1:3/2:2/3:1, b30280 2:1/2:2/4:1, b30284 1:1, b30287 2:2 (the
     one-line refrain)/3:2/5:1, b30288 1:3, b30289 1:2/4:1/5:2.
   - long lines that are long in the Arabic: b30278 1:1/1:2, b30279 2:1,
     b30280 1:1/3:1/3:2, b30286 1:1/2:2 (the repeated hallelujah acclamation),
     b30287 1:1/3:3/4:1/5:2, b30288 2:1/3:3, b30290 3:3/5:1/5:2.
   - one real fault fixed: b30279 2:2 was −5 because the Arabic's `انت` ("You")
     was dropped; restored as `אַתָּה בְּאוֹרְךָ יִתְפַּזֵּר כָּל־הָעָרָפֶל`,
     the flag cleared.
   - quoted verses and glossary choices carry the only ten `R:` notes: b30278
     (שֵׂה Lamb + the عشر/عشور tithes wordplay), b30281 (צוּר, never סֶלַע),
     b30282 (Jabez, 1 Chr 4:10), b30283 (Ezek 37's dry bones), b30284
     (Ps 103), b30286 (קִנְיַן possession), b30287 (absolution + the tax
     collector of Luke 18), b30288 (sung pauses kept), b30289 (גְּדוּדִים for
     hostile troops), b30290 (pierced side, John 19:34–37; מָמוֹן Mammon).
   - `build:corpus` still reports 17 lent Hebrew hymns — no new loans in this
     batch.

- Book 3 batch 22 (b30291–b30305): 39 line flags after review, all accepted;
  no missing or extra words, every stanza count matches the print:
    - shape flags are the print's: b30301 1/2/1/1 (a one-line stanza 1, then a
      two-line stanza 2); b30295 2/2/2/2/2/2/2 carries the same short refrain
      (שִׁחְרְרַנִי יֵשׁוּעַ) after every longer opening line.
    - short lines that are short in the Arabic: b30291 1:3/4:2, b30293 1:2/4:1,
      b30294 4:1, b30296 1:1/4:1, b30297 1:2/5:3, b30299 2:1, b30301 3:1,
      b30302 2:3 (the bare אֲנִי בַּמָּשִׁיחַ refrain), b30303 1:1/2:2/4:1,
      b30304 1:3, b30305 3:1.
    - long lines that are long in the Arabic: b30292 4:2, b30293 2:2 (the
      `.. הַלְּלוּיָה` acclamation), b30294 2:4, b30295 4:1/5:1/6:1/6:2,
      b30297 1:3/2:2/5:2, b30298 2:1/2:2/4:1/4:2, b30299 3:2, b30301 1:1,
      b30302 1:3/4:1, b30304 3:1, b30305 4:1.
    - b30293's `..` sung pauses and b30300's `..` pauses + repeated calls are
      kept verbatim.
    - quoted verses and glossary choices carry the only fourteen `R:` notes:
      b30291 (prodigal son, Eccl 1:14), b30292 (Rom 8:35, מְצוּלָה),
      b30293 (sung pauses), b30294 (1 Thess 4:17, עֲטֶרֶת), b30295 (Rev 1:6),
      b30296 (Ps 23:4 / Phil 3:14, בַּלָּהָה), b30297 (John 20:27 / Phil 3:8's
      רֶוַח), b30298 (מַצְפּוּנִי / 1 Pet 1:8), b30299 (שְׁכִינָה for الحضرة),
      b30300 (Ps 139:23–24), b30302 (נַחַת / הֲוָיָה), b30303 (Isa 53 / Heb
      13:13), b30304 (Isa 53:5 / 40:31), b30305 (Rev 3:20's knock).
    - `build:corpus` still reports 17 lent Hebrew hymns — no new loans in this
      batch.

- Book 3 batch 23 (b30306–b30320): 35 line flags after review, all accepted;
  no missing or extra words, every stanza count matches the print:
    - shape flags are the print's: b30309 4/2/4, b30314 4/2/4/4, b30319
      3/2/3/3 (a two-line stanza 2).
    - short lines that are short in the Arabic: b30306 2:1 (the bare "I am
      indebted" refrain), b30307 2:1 (the `...` sung pauses), b30309 3:3
      (John 10:28's own wording), b30310 2:2 (the single-line acclamation
      `ياحبيب حبك عجيب`), b30311 4:1/5:2, b30312 1:1/2:3 (a repeated couplet),
      b30317 2:1, b30318 2:4, b30319 4:1, b30320 1:1.
    - long lines that are long in the Arabic: b30307 2:2, b30308 2:2,
      b30309 1:3/2:1, b30310 1:1/1:2, b30311 1:2/2:2, b30312 3:1/3:2/3:3,
      b30313 1:2/2:1, b30316 1:1/1:2, b30318 2:2, b30319 2:1/3:2, b30320 3:1.
    - b30306's and b30310's `(…)٣`/`(…)٢` are repeat counts (singing
      instructions), written once; b30307's `...` sung pauses are kept verbatim.
    - quoted verses and glossary choices carry the only fourteen `R:` notes:
      b30306 (repeat count), b30307 (sung pauses + الصمد → הַנִּצְחִי),
      b30308 (الردى → מָוֶת), b30309 (John 10:28–29; quote marks dropped),
      b30311 (بخار → הֶבֶל / Eccl; 2 Cor 6:2's עֵת רָצוֹן), b30312 ("عنى"
      read as "عَيْنِي"), b30313 (dialogue colons), b30314 (السكيب → נֶסֶךְ;
      صافحاً as forgiveness), b30315 (Benedictus, Luke 1:68–79), b30316
      (עֲטֶרֶת קוֹצִים), b30318 (קָנַנִי / קִנְיָן), b30319 (Mal 3:10 /
      Isa 40:31), b30320 (מוֹלַדְתִּי / הֲוָיָתִי).
    - `build:corpus` now reports 18 lent Hebrew hymns (was 17): b30311 lends
      to h0354 (the hymn appears in both books). This is automatic, not a fault.

 - Book 3 batch 24 (b30321–b30335): 46 line flags after review, all accepted;
   no missing or extra words, every stanza count matches the print:
     - shape flags are the print's: b30321 4/3/4, b30323 2/3/2/2, b30324
       1/2/2/2/2, b30326 4/2/4/4, b30327 4/2/2/2/2; b30330 and b30331 are
       eight 3-line stanzas with short closing lines (hence the wide spread).
     - short lines that are short in the Arabic: b30321 2:2, b30322 3:1,
       b30323 3:1/3:2, b30325 1:1/2:4/4:2, b30326 4:2, b30327 5:2,
       b30330 3:2/7:2/8:2, b30331 2:3/3:1/8:1, b30333 1:1/5:2/6:1,
       b30334 3:1/4:2.
     - long lines that are long in the Arabic: b30321 2:3, b30322 1:1,
       b30323 1:1/2:2, b30324 1:1/3:2, b30325 1:2/1:4/2:1, b30326 4:4,
       b30330 1:2/4:3/6:2/8:3, b30331 2:1/6:2, b30333 2:1/3:1/3:2,
       b30334 3:2/4:1.
     - b30325's `..`, and the `...` sung pauses in b30332–b30335, are kept
       verbatim; b30335's 12-line refrain repeats verbatim
       (1:1=1:3=1:9=1:11, 1:2=1:10, 1:4=1:12) as the print sets it.
     - quoted verses and glossary choices carry the only thirteen `R:` notes:
       b30321 (سنا → زִיוְךָ), b30323 (وطننا → מוֹלַדְתֵּנוּ / Phil 4:6),
       b30324 (دار الهنا → בֵּית הָאֹשֶׁר), b30325 (أسكر), b30326 (קָנָה /
       חֻלְשָׁתִי), b30327 (Rev 22:17 / חֲטִיפָה / שָׁקַד), b30329
       (Ps 91:14–16), b30330 (כְּמִיהָה / מַפְגִּיעַ / חֻלְשָׁתִי),
       b30331 (Mark 8:38 / מָדוֹר / wedding supper), b30332 (1 Thess 4:16
       shofar), b30333 (Heb 11:13 / Ps 84:7 / חֲטִיפָה), b30334 (1 Thess 4:17
       / גְּוִיּוֹת), b30335 (refrain repeats / חֲטִיפָה / שָׁקַד).
     - `build:corpus` still reports 18 lent Hebrew hymns — no new loans in this
       batch.

 - Book 3 batch 25 (b30336–b30350, S4 complete): 30 line flags after review,
   all accepted; no missing or extra words, every stanza count matches the
   print. No `R:` notes were needed in this batch (268 `review[]` unchanged):
     - shape flags are the print's: b30342 and b30343 are five one-line
       stanzas (1/1/1/1/1); b30345 and b30347 are 2/3/2/2/2; b30350 is
       2/1/2/2/2 (a one-line stanza 2).
     - short lines that are short in the Arabic: b30336 3:1, b30338 2:4,
       b30339 2:2, b30340 1:2, b30341 2:1, b30342 3:1, b30343 1:1, b30345
       5:2, b30347 1:1/5:1/5:2, b30348 2:1, b30350 1:1/4:2.
     - long lines that are long in the Arabic: b30336 1:1, b30338 1:2,
       b30339 4:1/5:1/5:2, b30340 2:2, b30341 1:1/4:1, b30342 4:1, b30343
       5:1, b30345 1:1/4:1, b30350 5:1.
     - `build:corpus` still reports 18 lent Hebrew hymns — no new loans in this
       batch.

  - Book 3 batch 26 (b30351–b30365, S5 1/4): 26 line flags after review, all
    accepted; no missing or extra words, every stanza count matches the print.
    Fifteen `R:` notes were needed (one per hymn), all quote or glossary driven.
      - shape flags are the print's: b30356 2/2/2/4, b30357 1/2/2/2/2/2/2,
        b30360 4/3/4, b30361 2/2/4, b30364 2/4/2/2, b30365 4/2/4.
      - short lines that are short in the Arabic: b30353 3:3, b30355 2:1,
        b30360 2:3, b30361 2:1, b30362 2:2; b30365 2:2 is -12 only against
        its very long paired line 2:1.
      - long lines that are long in the Arabic: b30351 1:2, b30353 3:1,
        b30354 2:2/2:3/2:4, b30356 2:2, b30357 1:1/3:2, b30359 5:1,
        b30360 1:2, b30362 3:1, b30363 1:3/3:2, b30364 1:2.
      - b361's `..` pauses and b362's `.`/`...` pauses are kept verbatim;
        b352 uses `רַחֲמֵי אֵל` (not חֶסֶד here), b354 `הֶבֶל` for بخار, and
        b360 2:2–2:3 follows 1 Tim 6:11's virtue list.
      - `build:corpus` still reports 18 lent Hebrew hymns - no new loans in this
        batch.

  - Book 3 batch 27 (b30366–b30380, S5 2/4): 33 line flags after review, all
    accepted; no missing or extra words, every stanza count matches the print.
    Fifteen `R:` notes were needed (one per hymn), all quote or glossary driven.
      - shape flags are the print's: b30370 4/3/4, b30373 1/2/1/1/1, b30375
        1/2/1/1, b30379 2/1/1/1.
      - short lines that are short in the Arabic: b30367 4:1, b30368 5:2,
        b30369 3:3, b30370 2:3, b30371 2:1, b30372 1:2, b30373 2:1 (the
        short repeated refrain), b30374 2:1, b30375 1:1, b30376 4:1/5:1,
        b30377 3:1; b30379 1:1 is −20 only because stanza 1 is a short
        couplet against the long verses that follow.
      - long lines that are long in the Arabic: b30366 1:1/1:3, b30367 3:2,
        b30368 1:1/2:1/2:2/4:2, b30371 3:1, b30372 3:2, b30373 5:1,
        b30374 3:1, b30375 4:1 (its third half-phrase), b30376 1:1/3:1,
        b30377 1:1, b30379 2:1.
      - b366's `..` pauses, b368's `..` pauses and b379's `..` pauses are kept
        verbatim; b366 doubles הֶבֶל for سراب سراب, b373's repeated
        בָּא אֲנִי אֵלֶיךָ is the print's refrain, and b380 drops the print's
        «» around the Matt 28:20 quote, keeping the colon.
      - `build:corpus` still reports 18 lent Hebrew hymns - no new loans in this
        batch.

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
