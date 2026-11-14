# Hebrew glossary & house style — Book 2 (taranim)

Working reference for the hand-authored liturgical Hebrew. The point is
mechanical consistency: a batch must not re-invent a rendering that an earlier
hymn already fixed. When a new word is settled, add it here in the same commit
as the hymn that needed it.

Sources of authority, in order: **the Arabic** → the printed English (bridge
only) → the concordance echo noted below. Where Arabic and English disagree,
Arabic wins.

## Fixed renderings

| Arabic | Hebrew | Notes |
| --- | --- | --- |
| يسوع | יֵשׁוּעַ | **Never `בישו`**, never `ישו`. Always pointed, always full spelling. |
| الرب | הָאָדוֹן / אֲדֹנָי | `אֲדֹנָי` in direct address; `הָאָדוֹן` when speaking about Him. |
| الله / الإله | אֵל / אֱלֹהִים | Construct chains: `אֵל עוֹלָם`, `אֱלֹהֵי יִשְׂרָאֵל`. |
| سلام لك (greeting) | שָׁלוֹם לְךָ | Fixed formula; do not vary to `שלום עליך`. |
| نعمة | חֶסֶד | Covenant-love, not `נועם`. |
| مجد / أمجد | כָּבוֹד / נֶהְדָּר | `מַה־נֶּהְדָּר` = "how glorious". |
| فداء / فدى / الفادي | פְּדוּת / פָּדָה / פּוֹדֶה | `גֹּאֵל` only where the sense is kinsman-redeemer. |
| خلاص / نجاة | יְשׁוּעָה | Also the root pun on the Name; keep `יֵשׁוּעַ` and `יְשׁוּעָה` distinct in one stanza. |
| كاهن عظيم | כֹּהֵן גָּדוֹל | Fixed; never `כהן ראשי`. |
| صليب | צְלָב | Post-biblical loan, but the only usable word in a hymn; `עֵץ` only when "wood/tree" is meant, never `תְּלִיָּה` (hanging). |
| وطن / موطن | מוֹלָד / מוֹלַדְתִּי | Homeland, not `אֶרֶץ` alone; biblical `אֶרֶץ מוֹלַדְתּוֹ` (Gen 11:28). |
| جند / جنود | גְּדוּד / גְּדוּדִים | `גְּדוּדֵי שְׁאוֹל` is fixed; do not use `צָבָא` for hostile troops. |
| تبني (adoption) | בְּנִיּוּת | Post-biblical but the fixed term for υἱοθεσία; do not paraphrase. |
| اشترى / اقتنى | קָנָה | Cultic "acquired"; `קָנָנִי` in the refrain of tr0009. |
| شفيع / يشفع | מַפְגִּיעַ | Hiph'il of פגע, Isa 53:12. The fixed word for intercession. |
| ملجأ / حصن | מַחֲסֶה / מִבְצָר | `מַחֲסֶה` = refuge, `מִבְצָר` = fortress. |
| برج حصين | מִגְדַּל־עֹז | Prov 18:10. Keep the construct, with maqaf. |
| دهن / طيب (poured) | שֶׁמֶן תּוּרַק | Song 1:3, quoted whole; do not paraphrase. |
| أصرف كالذهب (refining) | אֶצְרֹף … כַּזָּהָב | Mal 3:3 register. Keep the verb `צרף`, not `נקה`. |
| جند الجحيم / شيال | גְּדוּדֵי שְׁאוֹל | "Troops of Sheol", as in tr0001. |
| ضعف | חָלְשָׁה / חֻלְשָׁה | `וְאָחוּס עַל־חֻלְשָׁתְךָ` (tr0001) is the fixed mercy line. |
| الأبد / إلى الأبد | לָעַד / עַד־עַד / לְעוֹלָם וָעֶד | Rotate by metre, not at random: `לָעַד` is shortest. |
| خل / حبيب / ودود | דּוֹד / רֵעַ / יָדִיד | `דּוֹד` carries the Song-of-Songs charge; `רֵעַ` is the plain friend. |
| قريبًا / سريعًا | עוֹד מְעַט / מְהֵרָה | Isa 26:20 idiom for "soon". |
| قام (resurrection) | קָם / הֵקִים | `וְקָם` for He rose; `הֵקִים` for He raised (others). |
| صعد / العلى | עָלָה / מָרוֹם | `וְשָׁב אֶל־הַמָּרוֹם` for the ascension. |
| توبة / اعتراف | תְּשׁוּבָה / הִתְוַדּוּת | Post-biblical but liturgical-standard; biblical paraphrase where metre allows. |
| خطية / إثم / ذنب | חַטָּאת / עָוֺן / פֶּשַׁע | Keep the three distinct when the Arabic does. |
| غفر / سامح | סָלַח / מָחַל | `סָלַח` is the cultic word; `מָחַל` is post-biblical, avoid. |
| نفس | נֶפֶשׁ | Not `רוח` — the Arabic `نفس` is the whole living self. |
| روح | רוּחַ | Ambiguous by design (wind/spirit); disambiguate with the verb, not by changing the noun. |
| سلام (peace given) | שָׁלוֹם | `שָׁלוֹם לְךָ` only in greeting; otherwise bare `שָׁלוֹם`. |

## Pointing conventions

- Everything is **fully vocalised**. No unpointed word is allowed in
  `title_he` / `verses_he` / `chorus_he`; `hebrew-apply.mjs` rejects it.
- Maqaf `־` for genuine compounds and construct chains that read as one unit:
  `מִגְדַּל־עֹז`, `בֶּן־אָדָם`, `עַד־עַד`, `יֶשׁ־לָנוּ`. Do not use it as a
  hyphen for line breaks.
- Divine name: `יָהּ` is allowed in short liturgical lines; `אֲדֹנָי` and
  `אֱלֹהִים` elsewhere. Never the tetragrammaton.
- `יֵשׁוּעַ` keeps its final `ע` with patah; do not use the abbreviated `יֵשׁוּ`.
- Furtive patah stays on the final guttural: `רוּחַ`, `שָׁמֵחַ`, `מָשִׁיחַ`.
- Where a choice changes the tune, prefer the shorter pointing; note it in the
  payload's `review` array.

## Register rules

- Biblical/liturgical, not modern conversational. Banned as anachronisms:
  `מטוס`, `טלפון`, `אינטרנט`, `מחשב`, `פרויקט`, `בדרך כלל`, `בעצם`.
- Prefer construct chains over `של`: `דִּבְרֵי אֵל`, not `הדברים של אל`.
- Prefer the *vav-consecutive* for narrative ("and He…") and the plain
  imperfect for ongoing states.
- Parallelism is expected: A/B lines should mirror in syntax, not only in
  meaning. Keep the Arabic's own parallelism where it survives.
- No em-dashes, no parentheses, no quotation marks inside a line except `:`
  before direct speech (`אוֹמֵר לִי: הִנְנִי־חַי`).
- Christological titles keep their force: `בֶּן־אָדָם`, `כֶּבֶשׂ הָאֱלֹהִים`,
  `מֶלֶךְ הַכָּבוֹד`, `צֶמַח דָּוִד` are not softened to generic "servant".

## Batch workflow

1. Write `content/hebrew/taranim/NNNN.json`
   ```
   { "book": "taranim", "number": 7, "title_he": "…",
     "verses_he": [ { "label": "1", "lines": ["…"] } ],
     "chorus_he": "…",          // only when the hymn has a chorus
     "review": ["2:3 note — …"] }
   ```
2. `node scripts/hebrew-apply.mjs` — shape/pointing checks, then merge.
   `--check` proves the corpus is already in sync (safe pre-commit gate).
3. `node scripts/hebrew-meter.mjs --lines` — relative line balance; a flag is
   a prompt to re-read, not an automatic failure. `--strict` to gate.
4. `npm run build:corpus && npm run check:hymns && npm run typecheck`
5. Update `PROJECT_NOTES.md` §15 (count of translated hymns, any new decisions).

## Open decisions

- **Refrain hymns**: `chorus_he` should repeat the refrain text exactly in
  every stanza that carries `chorus: true`; the meter check ignores it. Settle
  on the first refrain hymn in Book 2 and record the rule here.
- **Dialogue hymns** (`يقول لي` / congregational reply): keep the speaker
  shifts but do not add speaker labels — the reader prints lines only.
- **Acrostics**: if Book 2 has one, the initial letters win over exact
  parallelism; note the compromise in `review`.
