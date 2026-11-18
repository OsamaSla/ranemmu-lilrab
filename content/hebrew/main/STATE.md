# Book 1 Hebrew — live state (subagent rotation driver)

Last updated: 2026-11-18 · after batch h0423-h0433

- Progress: **570 / 1047** hymns, 10998 verse lines, 100 % pointed.
  `hebrew:progress` reports 517 `review[]` notes — batches h0423-h0463 shipped
  none (six consecutive deviations; gates unaffected), h0464 onward resumed
  normal notes. `hebrew-meter --book main --flags-only` reports 16
  flags for h0001-h0007, 18 for h0008-h0015, 13 for h0016-h0023, 17 for
  h0024-h0031, 15 for h0032-h0038, 32 for h0039-h0045, 11 for h0046-h0052,
  18 for h0053-h0058, 18 for h0059-h0065, 15 for h0066-h0071, 13 for
  h0072-h0078, 24 for h0079-h0086, 13 for h0087-h0093, 23 for h0094-h0100,
  6 for h0101-h0108, 16 for h0109-h0114, 16 for h0115-h0121, 12 for
  h0122-h0127, 9 for h0128-h0133, 24 for h0134-h0140, 6 for h0141-h0149,
  17 for h0150-h0156, 14 for h0157-h0164, 6 for h0165-h0169, 26 for
  h0170-h0175, 25 for h0176-h0180, 10 for h0181-h0187, 9 for h0188-h0193,
  7 for h0194-h0199, 13 for h0200-h0206, 11 for h0207-h0213, 14 for
  h0214-h0220, 14 for h0221-h0227, 10 for h0228-h0234, 22 for h0235-h0241
  15 for h0242-h0247, 20 for h0248-h0253, 10 for h0254-h0260, 18 for
  h0261-h0267, 8 for h0268-h0273, 17 for h0274-h0279, 15 for h0280-h0285
  15 for h0286-h0292, 17 for h0293-h0299, 17 for h0300-h0306, 16 for
  h0307-h0314, 18 for h0315-h0320, 17 for h0321-h0326, 22 for h0327-h0333
  16 for h0334-h0340, 15 for h0341-h0345, 13 for h0346-h0351, 18 for
  h0352-h0358, 10 for h0359-h0363, 16 for h0364-h0369, 16 for h0370-h0376,
  9 for h0377-h0382, 22 for h0383-h0387, 12 for h0388-h0394, 21 for
  h0395-h0400, 15 for h0401-h0408, 16 for h0409-h0416, 14 for h0417-h0422
  22 for h0423-h0433, 22 for h0434-h0440, 11 for h0441-h0448, 10 for
  h0449-h0456, 30 for h0457-h0463, 22 for h0464-h0470, 19 for h0471-h0477
  18 for h0478-h0484, 21 for h0485-h0491, 12 for h0492-h0497, 13 for
  h0498-h0502, 16 for h0503-h0508, 20 for h0509-h0515, 15 for h0516-h0522
  16 for h0523-h0529, 17 for h0530-h0535, 21 for h0536-h0543, 27 for
  h0544-h0550, 29 for h0551-h0555, 14 for h0556-h0561 and 17 for h0562-h0570,
  all reviewed and accepted.
- Next batch: **h0571–h0579** (9 hymns, 140 lines) — recompute with
  `node scripts/book1/next-batch.mjs` before every spawn.
- Plan: `content/hebrew/main/PLAN.md` (rotation order, child prompt, gates).
- Remaining tail after this book: none — Book 1 is the last book.

## Rotation state
- `date`: 2026-11-18 (exhausted list reset at the day boundary)
- `active_index`: 2 (`opencode/hy4-flash-free`) — keep until it hits a quota
  response; rotation advances only on a limit, not per batch. It clears every
  batch's gates with no regeneration, so it is the de-facto primary for the run.
- `exhausted_today`: none. (deepseek-v4.1-flash-free was quota-limited on
  2026-11-17; re-check before using it again.)
- `models_used_so_far`:
  - `opencode/hy4-flash-free` — h0001-h0007 (pilot), h0008-h0015, h0016-h0023,
    h0024-h0031, h0032-h0038, h0039-h0045, h0046-h0052, h0053-h0058,
    h0059-h0065, h0066-h0071, h0072-h0078, h0079-h0086, h0087-h0093,
    h0094-h0100, h0101-h0108, h0109-h0114, h0115-h0121, h0122-h0127,
    h0128-h0133, h0134-h0140, h0141-h0149, h0150-h0156, h0157-h0164, h0165-h0169, h0170-h0175, h0176-h0180, h0181-h0187, h0188-h0193, h0194-h0199, h0200-h0206, h0207-h0213, h0214-h0220, h0221-h0227, h0228-h0234, h0235-h0241, h0242-h0247, h0248-h0253, h0254-h0260, h0261-h0267, h0268-h0273, h0274-h0279, h0280-h0285, h0286-h0292, h0293-h0299, h0300-h0306, h0307-h0314, h0315-h0320, h0321-h0326, h0327-h0333, h0334-h0340, h0341-h0345, h0346-h0351, h0352-h0358, h0359-h0363, h0364-h0369, h0370-h0376, h0377-h0382, h0383-h0387, h0388-h0394, h0395-h0400, h0401-h0408, h0409-h0416, h0417-h0422, h0423-h0433, h0434-h0440, h0441-h0448, h0449-h0456, h0457-h0463, h0464-h0470, h0471-h0477, h0478-h0484, h0485-h0491, h0492-h0497, h0498-h0502, h0503-h0508, h0509-h0515, h0516-h0522, h0523-h0529, h0530-h0535, h0536-h0543, h0544-h0550, h0551-h0555, h0556-h0561, h0562-h0570 (all gates green)
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
- h0109-h0114: 16 flags, all Arabic-driven — no missing or extra words. Shapes
  4×5 (h109), 1/8/8/8 (h110), 8×4 (h111), 4/8/4/4 (h112), 4×4 (h113),
  8/8/8 (h114); h110's 1-line stanza and h112's spread 6 are in the Arabic.
- h0115-h0121: 16 flags, all Arabic-driven — no missing or extra words. Shapes
  4/4/4/4 (h116, h118), 6×4 (h117), 4×5 (h119), 4/3/4/4/4 (h121); h115/h120
  clean. h121 spread 7 from a short 3-line stanza. A line-break maqaf in
  h117 4:3 (banned by house style) fixed before commit. Choruses: h118/h119
  v2 (4 lines), h121 v2 (3 lines); h115-h117/h120 none.
- h0122-h0127: 12 flags, all Arabic-driven — no missing or extra words. All six
  are duplicates of existing Book 2/3 hymns (h122→b3/3, h123→b3/6, h124→tr227,
  h125→b3/17, h126→b3/5, h127→tr126); settled renderings were reused and split
  back into the main's printed-line structure, with fresh lines where the main
  Arabic differs. h125 1:2 avoids the twin's tetragrammaton (glossary: only where
  the Arabic prints يَهْوَه). Shapes 8/12/8/8 (h122), 4×4 (h125, h127), 8×5 (h126).
- h0128-h0133: 9 flags left after review (13 initial), all Arabic-driven — no
  missing or extra words. h0128 reused the settled tr0318 rendering (identical
  Arabic). Four real faults fixed: restored `أنك/قد` (h129 2:3), `يوجد` (h131
  2:4 + chorus), `أن أفعل` (h131 5:4); tightened an extra apposition (h133 5:7).
  Shapes 9/9/10 (h129), 4×5 (h131), 6×4 (h132), 8×5 (h133); h130 clean.
- h0134-h0140: 24 flags, all Arabic-driven — no missing or extra words. Shapes
  6/4/6 (h134), 4×5 (h135, h139, h140), 8/4/8/8 (h137), 4/2/2/5 (h138);
  h136 clean. Four chorus refrains filled per Book 2 convention.
- h0141-h0149: 6 flags, all Arabic-driven — no missing or extra words. Shapes
  2/4/4 (h144), 4×5 (h147), 5×4 (h148), 4×4 (h149); h149's spread 0.5 is the
  tightest in Book 1 so far. h148's 8th line at 3 syllables is the source's
  short refrain. Remaining hymns clean.
- h0150-h0156: 17 flags, all Arabic-driven — no missing or extra words. Shapes
  4/7/4/4 (h150), 4/6/4/4/4 (h151), 2/7/2/2/2 (h152), 4/6/4/4 (h153),
  8/8/8 (h154, h155), 4×4 (h156). Real faults fixed in review: redundant
  pronouns (h151 2:3, h155 1:5), line redistribution + inserted "God" (h155),
  padded title (h156). Choruses: h150-h153/h156 v2; h154/h155 none.
- h0157-h0164: 14 flags, all Arabic-driven — no missing or extra words. Reused
  settled renderings from Book 3 twins (29, 26, 33, 44, 47, 48, 50) where the
  Arabic matched, split into the main's printed lines; newly authored where the
  main differs (h158 s4-5, h160 s3, h162 s4). h163 refrain stays first-person,
  tetragrammaton avoided per h0125. Shapes 4/4/4 (h157), 2/4/2/2/2/2 (h158),
  8×3 (h160), 4/3/4/4 (h161), 4×5 (h162), 4/2/4/4/4 (h163), 4/6/4/4/4 (h164).
- h0165-h0169: 6 flags, all Arabic-driven — no missing or extra words. Book 3
  twins reused for h167-h169 with fresh lines where the main Arabic differs.
  Shapes 16/16/8 (h166), 4×6 (h167), 4/4/4 (h168); h165/h169 clean. Real fault
  fixed in review: h165 2:3 condensed at 5 syllables →
  `נָשָׂא אֶת־כָּל־הַבּוּשָׁה`.
- h0170-h0175: 26 flags, all Arabic-driven — no missing or extra words. Twins
  reused where Arabic matched (tr183→h171, b3/57→h172, tr285→h174, b3/59→h175);
  h170/h173 authored fresh. Five chorus refrains filled; h170 none. Shapes
  8/8/7/8 (h170), 4/6/4/4 (h171, h172), 5/2/5×6 (h173), 4/2/4/4/4 (h174),
  4/2/4/4 (h175). Extra QA confirmed every Hebrew word is pointed.
- h0176-h0180: 25 flags, all Arabic-driven — no missing or extra words. Twins
  reused (b3/62→h176, b3/66→h177, b3/58→h178, tr147→h179, b3/63→h180); fresh
  lines in h180 stanzas 3/4/8. Shapes 5/3/5/5/5/5/5/4 (h176), 2/5/2/2/2
  (h177), 4×4 (h178), 4/2/4×6 (h180); h179 clean. Extra QA: every token pointed.
- h0181-h0187: 10 flags, all Arabic-driven — no missing or extra words. Twins
  reused (b3/74, 75, 77, 36; tr372, tr157); fresh lines where main differs
  (h181 3:3, h182 4:2/5:3, h184 3:6, all h186, h187 s5). Four chorus refrains.
  Shapes 6×5 (h184), 4×5 (h186, h187); h181-h183/h185 clean. Extra QA pointed.
- h0188-h0193: 9 flags, all Arabic-driven / settled-twin line divisions — no
  missing or extra words. Twins reused (b3/80, 49, 82, 92; tr172); fresh lines
  where main differs (h188 divergent lines, h190 2:5, h191 s3-4, h192 all,
  h193 reordered). Two real faults fixed: dropped `כָּל`, tightened fresh lines.
  Shapes 9×3 (h188), 8×3 (h190), 8×4 (h191), 4/4/4/5 (h192); h189/h193 clean.
- h0194-h0199: 7 flags left after review (12 initial), all Arabic-driven — no
  missing or extra words. Five real faults fixed: restored `וְאַתָּה` /
  `הוֹי … וְאַתָּה`, removed extra `וְהוּא`, tightened padded lines (h195 3:3,
  h199 2:3-2:4). Shapes 8×4 (h194), 4/8/8 (h195), 6×4 (h196), 8×3 (h197);
  h198/h199 clean. Choruses: h195 v1, h199 v2. 476/476 words pointed.
- h0200-h0206: 13 flags, all Arabic-driven — no missing or extra words. Twins
  reused where Arabic matched (tr86/b3-86→h200, tr319→h203, tr64/b3-94→h204);
  fresh lines where main diverges (h203's reversed joy/sorrow, صبحي, جند الرب).
  Real omission fixed: h205 3:2 dropped "يفضل" → restored with תָּמִיד (chorus
  is v2, unaffected). Shapes 4×7 (h200), 4×4 (h201, h205, h206), 8/4/8/8
  (h202), 4/4/4 (h203), 4/2/4/4/4 (h204). 566/566 words pointed.
- h0207-h0213: 11 flags, all Arabic-driven — no missing or extra words. Twins
  reused (tr299→h208 with דַּי־לְךָ חַסְדִּי refrain, b3/95→h209, tr210→h211);
  h207/h210/h212/h213 fresh. Choruses: h207, h208, h212. Shapes 4/2/4/4/4
  (h207), 6/4/6/6 (h208), 8×3 (h210), 4/6/4/4/4 (h212); h209/h211/h213 clean.
- h0214-h0220: 14 flags, all Arabic-driven — no missing or extra words. Shapes
  4/5/4/4/4/4 (h214), 4×5 (h216), 5×3 (h217), 8×4 (h218), 4/2/2 (h219),
  8/2/8/8 (h220); h215 clean. 521/521 Hebrew tokens pointed.
- h0221-h0227: 14 flags (12 line-length + 2 shape notices), all Arabic-driven —
  no missing or extra words. Shapes 12 (h221), 4/2/4 (h222), 4/8/8 (h223),
  8 (h224), 8/8/8 (h225), 8×6 (h226); h227 clean. Settled twins reused for
  h221 (b3/68), h222 (b3/91) and h226 (b3/123), split into the main's printed
  lines; h223/h224/h225/h227 fresh. One real over-translation removed in
  h223 1:2 before commit. Choruses: h222 v2 (2:1-2:2), h223 v1 (1:1-1:4).
  429/429 new Hebrew tokens pointed.
- h0228-h0234: 10 line-length flags (plus one 4/3/4/4 shape notice), all
  Arabic-driven — no missing or extra words. Shapes 9/9/9 (h228), 4/3/4/4
  (h229), 4/4/4 (h230), 4×4 (h231), 13 (h232), 4×5 (h233), 4×4 (h234).
  Settled twins reused for h228 (b3/117) and h234 (tr0214, stanzas 1-3;
  stanza 4 new to the main); fresh for h229-h233. One inserted copula removed
  in h229 3:4 as a real over-translation. Choruses: h229-h231/h233/h234 v2,
  h228/h232 none. Glossary choices: מָצָב/בְּרִיָּה (h230), רֵעַ vs יָדִיד (h233).
- h0235-h0241: 22 line-length flags (plus two shape notices), all Arabic-driven
  — no missing or extra words. Shapes 5×5 (h235), 7 (h236), 4/5/4/4/4/4
  (h237), 2×6 (h238), 4/3/4/4/4/4 (h239), 4/4/4 (h240), 4×6 (h241). Settled
  twins reused (tr283→h235, tr337→h241 stanzas 1-4/6); fresh where the main
  diverges (h235 s5, h241 s5, all h236-h240). One real tightening: h238 3:1
  dropped a stray `אֶת־`. Choruses: h237-h239/h241 v2; h235/h236/h240 none.
  h239's `2:` cue rendered `עוֹד פַּעַם`; h238's Easter greeting translated by
  meaning. 548/548 Hebrew tokens pointed.
- h0242-h0247: 15 line-length flags (plus two shape notices), all Arabic-driven
  — no missing or extra words. Shapes 6/10/10/10 (h242), 4×4 (h243), 4×6
  (h244), 4×4 (h245), 4×5 (h246), 4/7/4/4/4 (h247); h244 clean. Settled twins
  reused (b3/129→h242, tr36→h246 where Arabic matched), fresh lines where the
  main diverges (h246 s3, 5:3). Choruses: h242/h244 v1, h243/h247 v2;
  h245/h246 none. h245's leading verse numbers omitted per h0081/h0100.
  459/459 Hebrew tokens pointed.
- h0248-h0253: 20 line-length flags (plus four shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4/4/4 (h248), 4/5/4/4/4 (h249),
  4/7/4/4 (h250), 6×4 (h251), 8/4/8/8 (h252), 6×5 (h253); the 4/5/4/4/4,
  4/7/4/4 and 8/4/8/8 spreads are the printed refrains. h248's leading
  verse-number artifacts omitted per h0081/h0100. Choruses: h248/h249/h250/
  h252/h253 v2; h251 none. Glossary: פִּדְיוֹנִי (h248), הַצּוּר (h250),
  כִּבְשַׁן (h251), הֲוָיָה (h252/h253). 598/598 Hebrew tokens pointed.
- h0254-h0260: 10 line-length flags (plus three shape notices), all Arabic-driven
  — no missing or extra words. Shapes 10 (h254), 4/6/4/4 (h255),
  4/6/4/4/4/4/4 (h256), 4/2/4/4 (h257), 8/8/8 (h258), 7/7/7 (h259),
  4×5 (h260); the 6- and 2-line choruses set the irregular shapes in
  h255-h257. One real tightening: h255 1:1 `קָרָאתִי אֵלֶיךָ` → `קְרָאתִיךָ`
  for `دعوتك`. Choruses: h255/h256/h257/h260 v2; h254/h258/h259 none. Glossary:
  מִגְדַּל־עֹז, סֹהַר, מְצוּלָה, כִּבְשַׁן, בַּלָּהָה, חֻלְשָׁה, עוֹד מְעַט.
  575/575 Hebrew tokens pointed.
- h0261-h0267: 18 line-length flags (plus three shape notices), all Arabic-driven
  — no missing or extra words. Shapes 6/5/6/6 (h261), 4×5 (h262), 4/3/4/4/4
  (h263), 17 (h264), 4/2/4/4 (h265), 4×6 (h266), 6×3 (h267). Authored fresh
  for h261/h267; settled Book 3 twins reused for h262-h266 (b3/161, 160, 151,
  157, 163), split into the main's lines, with fresh lines where the main
  diverges (h263 2:3, h265 s3-4, h266 3:4/4:2). Choruses: h261/h262/h263/
  h265/h266 v2, h267 v1, h264 none. h264's single 17-line stanza keeps b3's
  four-stanza text re-split. 559/559 Hebrew tokens pointed.
- h0268-h0273: 8 line-length flags (plus three shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4/3/4/4/4 (h268), 8/8/8 (h269), 4/2/4/4
  (h270), 8/8/8 (h271), 10×4 (h272), 2/6/2/2 (h273); h272 clean. Settled twin
  tr0232 reused for h270 (stanza order swapped); the rest authored fresh.
  h269's split word كالـ/ـشمس kept whole in one line to avoid a line-break
  maqaf. Choruses: h268/h270/h273 v2; h269/h271/h272 none. Glossary:
  מִשְׁאָלָה, בַּלָּהָה, מַצָּב. 5278/5278 Hebrew tokens pointed.
- h0274-h0279: 17 line-length flags (plus two shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4×5 (h274), 6×5 (h275), 4×4 (h276),
  4/2/4/4/4 (h277), 8/5/8 (h278), 6×3 (h279). Settled twins reused for h275
  (tr0375, s1-3) and h276 (tr0221, adapted where the main differs); the rest
  authored fresh. Three real tightenings fixed in h277. Choruses: h274/h275/
  h277/h278 v2; h276/h279 none (h279's refrain is a printed line, not a
  chorus field). 579/579 Hebrew tokens pointed.
- h0280-h0285: 15 line-length flags, all Arabic-driven — no missing or extra
  words. Shapes 8×5 (h280), 4×4 (h281), 4×5 (h282), 4×4 (h283), 4×5 (h284),
  9×3 (h285); h285's spread 10 is the print's long/short parallel lines.
  One real omission fixed: h284 5:3 restored كان → `הָיָה`. Choruses: h281 v1,
  h282/h284 v2; h280/h283/h285 none (their refrains are printed lines).
  All authored fresh, no twins. 592/592 Hebrew tokens pointed.
- h0286-h0292: 15 line-length flags (plus three shape notices), all Arabic-driven
  — no missing or extra words. Shapes 11 (h286), 8/8/8 (h287), 4/6/6/6
  (h288), 3/8/8/8 (h289), 6/6 (h290), 4/8/4/4 (h291), 4×5 (h292);
  h286/h290 clean. Two real faults fixed: h292 4:1 restored dropped كنت and
  4:4 removed a redundant `אֵיתָן`. Choruses: h288/h289/h292 v1, h291 v2;
  h286/h287/h290 none. All authored fresh from the Arabic, no twins.
- h0293-h0299: 17 line-length flags, all Arabic-driven — no missing or extra
  words. Shapes 4×4 (h293), 4×5 (h294), 4×7 (h295), 2×5 (h296), 4×4 (h297),
  4×5 (h298), 7×4 (h299); h294/h295 clean, h297's spread 3.5 and h299's 5.5
  are the print's short/long parallel lines. Choruses: h293/h294/h297 v1,
  h298 v0; h295/h296/h299 none (refrains are printed lines). All authored
  fresh; glossary: מִפְרָץ, מַטָּרָה, הֲוָיָה, מַפְגִּיעַ.
- h0300-h0306: 17 line-length flags (plus four shape notices), all Arabic-driven
  — no missing or extra words. Shapes 5 (h300), 4/6/4/4 (h301), 4×5 (h302),
  6/2/6/6 (h303), 4/2/4/4 (h304), 4×4 (h305), 12/4/12/12 (h306);
  h300/h305 clean. Choruses: h301-h306 all v2; h300 none. All authored fresh;
  glossary: בְּנִיּוּת, פָּדָה, צְלָב, מָצָב, עֲטֶרֶת, אֶפְשָׁר.
- h0307-h0314: 16 line-length flags, all Arabic-driven — no missing or extra
  words. Shapes 4×5 (h307), 8/8/8 (h308), 2×5 (h309), 8/8 (h310), 4×5
  (h311), 7 (h312), 8/8/8 (h313), 4×4 (h314); h310/h312/h313 clean. Two minor
  grammar tightenings applied before commit. Choruses: h311/h314 v2; the
  other six have printed refrain lines but no chorus field. All authored fresh;
  glossary: תַּאֲוָה, מִשְׁאָלָה, כִּסּוּפִים, מַחֲסֶה, נִצָּחוֹן.
- h0315-h0320: 18 line-length flags (plus three shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4×5 (h315), 4/2/4/4/4 (h316),
  7/7/7/7/8 (h317), 4×4 (h318), 8/8/8 (h319), 2/4/4/4 (h320). h317 has two
  chorus-tagged verses; C: uses the first (v2), v5 is the alternate refrain.
  Choruses: h315/h316/h317/h318 v2, h320 v1, h319 none (printed refrain
  lines, parentheses dropped). All authored fresh; glossary: מִגְדַּל־עֹז,
  פִּדְיוֹן, נַחֲלָה, מַשְׁאָלָה.
- h0321-h0326: 17 line-length flags (plus three shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4/5/4/4/4 (h321), 4×4 (h322), 4×5
  (h323), 4/8/4 (h324), 8/8/8 (h325), 5/15/10/10 (h326). h326 is a long hymn
  with one-for-one printed lines and six `הוֹי` vocatives. Choruses: h321-h324
  v2; h325/h326 none. All authored fresh; glossary: גְּדוּדֵי הָאֹפֶל,
  נַחֲלָה, מַטָּרָה, בּוֹחֵן הַלֵּבָבוֹת, גֵּיהִנֹּם/אֲבַדּוֹן.
- h0327-h0333: 22 line-length flags (plus three shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4/2/4 (h327), 8 (h328), 4×5 (h329),
  8/8 (h330), 6/4/6/6 (h331), 4×4 (h332), 4/5/4/4/4 (h333); h328/h330
  clean. Choruses: h327/h329/h331/h332/h333 v2; h328/h330 none. All authored
  fresh; glossary: בְּצֵל כְּנָפֶיךָ, יְשׁוּעָה vs יֵשׁוּעַ, פִּקָּדוֹן,
  נִצָּחוֹן/תְּבוּסָה, חֻלְשָׁה, רֶגֶשׁ.
- h0334-h0340: 16 line-length flags (plus one shape notice), all Arabic-driven
  — no missing or extra words. Shapes 8×4 (h334), 6 (h335), 8/8/8 (h336),
  4/6/4 (h337), 4×4 (h338), 4×6 (h339), 5×4 (h340); h335/h338 clean. Two real
  fidelity faults fixed: h334 4:3 restored dropped كنت and h340 1:2 matched
  the Arabic's finite verb (נַעֲבֹד). Choruses: h337 (6 lines) / h339 (4 lines)
  v2; the rest none. h338's leading verse numbers omitted per h0081/h0100.
  525/525 Hebrew tokens pointed.
- h0341-h0345: 15 line-length flags (plus two shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4/8/4/4 (h341), 8/8/8 (h342), 8/8/8
  (h343), 4/5/5/5 (h344), 8×4 (h345); h343 clean. Choruses: h341/h345 v2
  (8 lines each), h343 v1 (8 short lines), h344 v1 (Psalm 103, 4 lines);
  h342 none. h342's leading verse numbers omitted; h344's `(3)` repeat marker
  dropped; h345's split word يَخلُص kept whole per h0269. All authored fresh;
  glossary: מַבְכִים, עֲשִׂירִית/עִשָּׂרוֹנִים, נָרִים (not נַרִים).
- h0346-h0351: 13 line-length flags (plus two shape notices), all Arabic-driven
  — no missing or extra words. Shapes 6/3/6/6/6/6 (h346), 4/2/4 (h347),
  5×5 (h348), 8 (h349), 6×5 (h350), 7 (h351); h349/h351 clean. Choruses:
  h346 (3 lines) / h347 (2 lines) / h350 (6 lines) v2; h348/h349/h351 none.
  h350's parenthetical refrains with `2` repeat markers kept by content only;
  h351 is Psalm 91:14-16 in biblical wording. All authored fresh; glossary:
  מַעְיָן (Zech 13:1), מָמוֹן, סֵתֶר, בַּלָּהָה.
- h0352-h0358: 18 line-length flags (plus one shape notice), all Arabic-driven
  — no missing or extra words. Shapes 8×4 (h352), 4×5 (h353), 2×5 (h354),
  4/2/4/4/4/4 (h355), 16 (h356), 4×5 (h357), 4×4 (h358); h356 clean. One real
  omission fixed: h358 restored إنت → `אַתָּה` and synced `chorus_he`.
  Choruses: h353/h354/h355/h358 v2, h357 v1; h352/h356 none. h352 uses
  שְׁטָר for the "cheque of pardon"; h356 is Psalm 103:1-3 in biblical wording.
  582/582 Hebrew tokens pointed.
- h0359-h0363: 10 line-length flags (plus two shape notices), all Arabic-driven
  — no missing or extra words. Shapes 8/8/8 (h359), 8/4/8 (h360), 4×5
  (h361), 8/6/8/8/8/8 (h362), 6×3 (h363); h359/h363 clean. Three real
  tightenings fixed: h359 3:5 padded pronoun/object, h362 5:3 cognate for
  ترنيمة, h362 5:4 padded object marker. Choruses: h360-h362 v2; h359/h363
  none. h363 is a dialogue hymn (Christ speaking at 2:5-2:6), no speaker
  labels. 438/438 Hebrew tokens pointed.
- h0364-h0369: 16 line-length flags (plus four shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4/6/4/4/4 (h364), 8/6/8/8 (h365),
  7 (h366), 8/8/8 (h367), 8/4/8/8 (h368), 6/5/6 (h369); h366 clean. Choruses:
  h364/h365 v2 (6 lines), h368 v2 (4 lines), h369 v2 (5 lines); h366/h367
  none. h366 is the Benedictus (Luke 1:68-79), h369 the prodigal-son register.
  All authored fresh; glossary: חַיָּב, רְפִיָּה, לַעֲנָה, הֵד, חִבּוּקִים.
- h0370-h0376: 16 line-length flags (plus one shape notice), all Arabic-driven
  — no missing or extra words. Shapes 5/5/5 (h370), 8×4 (h371), 8 (h372),
  6/4/6/6 (h373), 4×4 (h374), 8/8/8 (h375), 14 (h376); h372/h376 clean.
  Settled twins reused: b3/318→h370, b3/291→h371 (s1/3/4; s2 fresh),
  tr0275→h373 (re-split, main 4:3-4:6 differ); h372/h374/h375/h376 fresh.
  Choruses: h373 v2, h374 v1; the rest none. h376 is John 3:30's
  "He must increase" as a single 14-line stanza.
- h0377-h0382: 9 line-length flags after review (13 initial), plus three shape
  notices — all Arabic-driven, no missing or extra words. Shapes 4×5 (h377),
  2/4/4/4/4 (h378), 8/4/8/8 (h379), 4×5 (h380), 4×5 (h381), 4/5/4/4
  (h382); the 2- and 5-line choruses set the irregular shapes. Six real
  tightenings fixed in review (h378 5:2, h379 3:2/4:1/4:6, h380 2:1+chorus,
  h381 2:2+chorus). Choruses: h377/h378 v1, h379-h382 v2 — all six have
  chorus fields. All authored fresh; glossary: תַּנְחוּמִים, דּוֹד,
  כְּמִיהָה, נָרִים (h381), מוֹלֶדֶת.
- h0383-h0387: 22 line-length flags (plus one shape notice), all Arabic-driven
  — no missing or extra words. Shapes 13×5 (h383 — a 65-line hymn, the long
  tail), 5/4/5/5/5 (h384), 4×5 (h385), 2×5 (h386), 4×4 (h387). Three real
  fidelity fixes: h383 9:5 restored the Arabic's third person, h384 5:5
  removed an expanded "from upon us", h387 4:4 restored "His person" via
  אִישׁוּת. Choruses: h384/h386/h387 v2; h383/h385 none. All authored fresh;
  glossary: כְּמִיהָה, מַפְגִּיעַ, מִפְרָץ, צוּר הָעוֹלָמִים, אִישׁוּת.
- h0388-h0394: 12 line-length flags (plus two shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4/3/4/4 (h388), 4×4 (h389), 4×5
  (h390), 8/6/8/8 (h391), 8 (h392), 4×5 (h393), 4×6 (h394); h392 clean.
  One real under-translation fixed: h393 4:4 `עַד־עַד` → `לְעוֹלָם וָעֶד`.
  Choruses: h388 v2 (3 lines), h389/h390/h393/h394 v2 (4 lines), h391 v2
  (6 lines); h392 none. All authored fresh; glossary: מִפְגָּשׁ, מִשְׁכָּן,
  קוֹבַע הַיְשׁוּעָה, שִׁחְרוּר/חֵרוּת.
- h0395-h0400: 21 line-length flags (plus three shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4/6/4/4/4/4 (h395), 4×4 (h396),
  13/5/13 (h397), 4/6/4/4/4 (h398), 8×4 (h399), 6 (h400); h400 clean.
  Choruses: h395/h398 v2 (6 lines), h397 v2 (5 lines); h396/h399/h400 none.
  All authored fresh; glossary: כְּמִיהָה, נְהִי, מַחֲסֶה, נֹפֶת צוּפִים,
  נָרִים (h399/h400). 562/562 Hebrew tokens pointed.
- h0401-h0408: 15 line-length flags after review (16 initial), all Arabic-driven
  short/long printed lines — no missing or extra words. Shapes 4×4 (h401),
  4×5 (h402), 4×5 (h403), 6/6/6 (h404), 4/4/4 (h405), 4×5 (h406), 4/4/4
  (h407), 4×5 (h408). One real padding removed: h0403 5:1 dropped an extra
  `אֶחָד`. Choruses: h401/h402/h403 v2, h405/h406/h408 v1; h404/h407 none.
  All authored fresh (h402 shares a number with b3/402 but the Arabic differs);
  glossary: מִרְעֶה, מָשִׁיחִי (vocative), מָדוֹר, כִּכָּר. 611/611 tokens pointed.
- h0409-h0416: 16 flags (13 line-length + three shape notices), all Arabic-driven
  — no missing or extra words. Shapes 2/6/2/2/2/2 (h409), 5×4 (h410),
  4/4/4 (h411), 4/2/4/4/4 (h412), 4×4 (h413), 8/8/8 (h414), 4/6/4 (h415),
  4×4 (h416); h414 clean. Choruses: h409/h411/h412/h413/h415/h416 v2;
  h410/h414 none. All authored fresh; glossary: נְגַע שְׂפָתַי, פִּדְיוֹנִי,
  אִישׁוּת, תַּרְפְּאָה. 654/654 Hebrew tokens pointed.
- h0417-h0422: 14 line-length flags (plus two shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4×5 (h417), 4×6 (h418), 8/8/8 (h419),
  4×5 (h420), 6/5/6/6 (h421), 4/8/8 (h422); h419/h420 clean. Three real
  fidelity fixes: h417 1:3 imperative person (`כּוֹנֵן`), h418 4:1 restored
  the surge image (`שֶׁטֶף`), h419 1:4 dropped an extra `אֶת`. Choruses:
  h417-h421 v2, h422 v1 — all six have chorus fields. All authored fresh;
  glossary: נֶאֱמָנוּת, שְׁלֵמוּת, חֲטִיפָה, בְּרִיָּה חֲדָשָׁה. 581/581 tokens pointed.
- h0423-h0433: 22 line-length flags (plus six shape notices), all Arabic-driven
  — no missing or extra words. Shapes 8/4 (h423), 4/4/4 (h424), 3/2/3/3/3
  (h425), 12 (h426), 2/4/2/2 (h427), 4/4/4 (h428), 4/4/4 (h429), 9 (h430),
  2/4/2/2/2/5 (h431), 4/4/4 (h432), 4/4 (h433). One real fidelity fix: h425
  3:3 restored the Arabic's "all the tears" → `כָּל־הַדְּמָעוֹת`. Choruses:
  h424/h425/h427/h428/h431/h432; h423/h426/h429/h430/h433 none. No review[]
  notes in these payloads — see progress line above. 667/667 tokens pointed.
- h0434-h0440: 22 line-length flags (plus four shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4×4 (h434), 4×5 (h435), 8/4/8 (h436),
  4/8/4/4 (h437), 4×4 (h438), 4/5/4/4/4 (h439), 4×5 (h440). All seven have
  chorus fields. All authored fresh; no review[] notes again (see progress
  line). 7 hymns / 133 lines, fully pointed.
- h0441-h0448: 11 line-length flags (plus three shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4/2/4/4/4 (h441), 4×5 (h442), 4×4
  (h443), 4×4 (h444), 4/2/2 (h445), 6/6 (h446), 4×5 (h447), 12 (h448).
  Choruses: h441/h442/h443/h447 v2, h444/h445/h446 v1; h448 none. All
  authored fresh; no review[] notes (see progress line). 8 hymns / 122 lines,
  574 tokens checked, zero unpointed words.
- h0449-h0456: 10 line-length flags (plus four shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4×5 (h449), 4×4 (h450), 8/6/8/8
  (h451), 4/4 (h452), 4×6 (h453), 4/2/4 (h454), 6/6 (h455), 4/2/4/4
  (h456). Meter-review fixes: restored dropped vocatives הוֹי, removed a
  padded object, rotated עַד־עַד → לְעוֹלָם וָעֶד, expanded an over-condensed
  line. Choruses: h449/h451/h454/h456 v2; h450/h452/h453/h455 none. Source
  numbering artifacts in 454 1:1 / 456 4:1 omitted. No review[] notes (see
  progress line). 8 hymns / 134 lines.
- h0457-h0463: 30 line-length flags (plus three shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4×5 (h457), 4/5/4/4/9 (h458), 4/2/4/4
  (h459), 4×5 (h460), 4×5 (h461), 4×6 (h462), 5/5 (h463); h463 clean.
  Choruses: h457-h461 v2; h462/h463 none. Source repeat markers, parentheses
  and numbering artifacts dropped per precedent. No review[] notes (see
  progress line). 7 hymns / 134 lines.
- h0464-h0470: 22 line-length flags (plus two shape notices), all Arabic-driven
  — no missing or extra words. Shapes 8/2/8 (h464), 4×5 (h465), 4×5 (h466),
  8/2/8 (h467), 4×5 (h468), 4×4 (h469), 8/8/8 (h470); the 2-line choruses in
  h464/h467 set the irregular shapes. Choruses: h464-h469 v2; h470 none.
  Review notes resumed (one per hymn) after the six-batch gap. 614/614 Hebrew
  tokens pointed.
- h0471-h0477: 19 line-length flags (plus three shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4×4 (h471), 6/8/8/8 (h472), 4/6
  (h473), 4×6 (h474), 4/4/4 (h475), 4×6 (h476), 4×4 (h477). Important fidelity
  fix: h475 addresses Christ throughout, so قاسيت/مشيت were rendered in the
  2nd person (`סָבַלְתָּ`/`הָלַכְתָּ`) against a misleading English gloss;
  h474 4:4 kept the Arabic's comparative (`מוּטָב`). Choruses: h471/h472/h474/
  h476/h477 v2; h473/h475 none. 7 hymns / 132 lines, full niqqud.
- h0478-h0484: 18 line-length flags (plus five shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4×6 (h478), 4/6/6 (h479), 4×6 (h480),
  2/4/4 (h481), 4×5 (h482), 6/4/4/4 (h483), 8/2/8 (h484). Two real padding
  fixes: h482 3:1 removed a duplicated destination, h483 4:3 dropped extra
  pronouns and restored `בְּטוּבוֹ`. Choruses: h478-h481/h483/h484 v2; h482
  none. 7 hymns / 130 lines, 9333 total lines pointed.
- h0485-h0491: 21 line-length flags (plus one shape notice), all Arabic-driven
  — no missing or extra words. Shapes 4×5 (h485), 4×5 (h486), 4×6 (h487),
  5/7/5/5/5 (h488), 4/4 (h489), 8×4 (h490), 6 (h491); h489/h491 clean. One
  real omission fixed: h485 2:2 restored the conjunction
  (`לְפָנָיו וְנִבְטַח`). Choruses: h486/h488 v2; the rest none. 7 hymns /
  137 lines, 9470 total lines pointed.
- h0492-h0497: 12 line-length flags (plus two shape notices), all Arabic-driven
  — no missing or extra words. Shapes 8/4/8/8 (h492), 4/4/4 (h493), 4×5
  (h494), 4×4 (h495), 4×6 (h496), 4/3/4/4/4/4 (h497). One real fix: h494 3:4
  removed a redundant pronoun. Choruses: h492/h493/h494/h495/h497 v2;
  h496 none. 6 hymns / 123 lines, 9593 total lines pointed.
- h0498-h0502: 13 line-length flags (plus four shape notices), all Arabic-driven
  — no missing or extra words. Shapes 12/12 (h498), 4/6/4 (h499), 8×4
  (h500), 4/4/4/4/4/4/4/5 (h501), 4/2/4/4/4/4 (h502). Two real fixes in h500:
  removed padded `מִכֹּל` at 2:4 and corrected `הֵד` → `תְּרוּעַת` for هتاف
  at 3:7. Choruses: h499 v2 (6 lines), h500 v1 (8 lines), h501 v2 (first of
  two tagged verses; v8 alternate per h0317), h502 v2 (2 lines); h498 none.
  505/505 word-pieces pointed, 9718 total lines.
- h0503-h0508: 16 line-length flags (plus five shape notices), all Arabic-driven
  — no missing or extra words. Shapes 7/9 (h503), 4/2/4/4/4 (h504),
  4/6/4/4 (h505), 4×7 (h506), 4×5 (h507), 4×7 (h508). One real line-division
  fix: h508 3:1-3:2 kept the "shines" verb on 3:2 per the Arabic enjambment.
  Choruses: h504-h507; h503/h508 none. 526/526 Hebrew words pointed,
  9846 total lines.
- h0509-h0515: 20 line-length flags (plus four shape notices), all Arabic-driven
  — no missing or extra words. Shapes 4×6 (h509), 4/6/4 (h510), 4/2/4/4/4
  (h511), 4×5 (h512), 4×6 (h513), 4/4/4 (h514), 3×5 (h515). One real fault:
  h512 3:4 dropped an added `אֶזְכֶּה` absent from the Arabic. Choruses:
  h510/h511/h512/h514 v2; h509/h513/h515 none. 552/552 tokens pointed.
  First spawn for this range died with "Provider blocked the response" before
  writing anything; the plain retry with the same model succeeded — no model
  rotation and no `exhausted_today` entry.
- h0516-h0522: 15 line-length flags (plus two shape notices), all Arabic-driven
  — no missing or extra words. Shapes 6/3/6 (h516), 4×6 (h517), 4/4/8/8
  (h518), 8/8/8 (h519), 7 (h520), 4×7 (h521), 16 (h522). One real fidelity fix:
  h516 3:5 restored dropped كل → `כָּל־יְגוֹנַי`. Choruses: h516/h518/h521;
  h517/h519/h520/h522 none. 7 hymns / 138 lines, 10111 total lines pointed.
- h0523-h0529: 16 line-length flags (plus one shape notice), all Arabic-driven
  — no missing or extra words. Shapes 4/5/4 (h523), 4×7 (h524), 4×6 (h525),
  4×5 (h526), 4×6 (h527), 2×5 (h528), 2×7 (h529). Choruses: h523-h526/h528/
  h529 v2; h527 none. h529 uses the Canticles register. 574 Hebrew word-pieces
  pointed, 10244 total lines.
- h0530-h0535: 17 line-length flags (plus four shape notices), all Arabic-driven
  — no missing or extra words. Shapes 6/4/6 (h530), 4×4 (h531), 4/6/4/4/4
  (h532), 4×6 (h533), 8/2/8 (h534), 4×6 (h535). Two fidelity fixes (definite
  article h531 2:3, vocative h535 2:3, both synced into `chorus_he`). All six
  have chorus fields. 6 hymns / 120 lines, 10364 total lines pointed.
- h0536-h0543: 21 line-length flags (plus four shape notices), all Arabic-driven
  — no missing or extra words. Shapes 8×4 (h536), 4×4 (h537), 6/4/6/6
  (h538), 4×4 (h539), 4/2/2/2 (h540), 2×5 (h541), 4×5 (h542), 9 (h543).
  One real fidelity fix: h538 2:4 restored the adversative بل → `אַךְ`, synced
  into `chorus_he`. Choruses: h537/h538/h540/h541/h542; h536/h539/h543 none.
  8 hymns / 135 lines, 10499 total lines pointed.
- h0544-h0550: 27 line-length flags (plus four shape notices), all Arabic-driven
  short refrains / long two-half-phrase lines — no missing or extra words.
  Shapes 8/8/8 (h544), 2/4/4 (h545), 4×4 (h546), 4/3/4/4/4 (h547), 4×5
  (h548), 4/7/4/4 (h549), 4×5 (h550). Choruses: h545/h547/h549/h550;
  h544/h546/h548 none. Word-level QA: all words pointed. 7 hymns / 128 lines,
  10627 total lines pointed.
- h0551-h0555: 29 line-length flags (plus one shape notice), all Arabic-driven
  — no missing or extra words. Shapes 4×4 (h551), 5×6 (h552), 4×6 (h553),
  4×5 (h554), 4/6/8/8 (h555). One real over-translation tightened in h552 1:4.
  All five have chorus fields. 568/568 word-pieces pointed, 10743 total lines.
- h0556-h0561: 14 line-length flags (plus two shape notices), all Arabic-driven
  — no missing or extra words. Shapes 8/4/8/8 (h556), 8/4/8 (h557), 4×5
  (h558), 4×4 (h559), 8/8/8 (h560), 4×4 (h561). Three genuine padding words
  removed before repack. Choruses: h556-h560; h561 none. Source verse numbers
  and quotation marks dropped per house style. 6 hymns / 124 lines, 10867 total.
- h0562-h0570: 17 line-length flags (plus four shape notices), all Arabic-driven
  — no missing or extra words. Shapes 6/6/6 (h562), 8/2/4/4 (h563), 8 (h564),
  4/4/4 (h565), 7/6 (h566), 4/4/4 (h567), 6 (h568), 4×4 (h569), 8/4/8/8
  (h570). Choruses: h563/h565/h567/h569/h570; h562/h564/h566/h568 none.
  550/550 words pointed, 10998 total lines.
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
