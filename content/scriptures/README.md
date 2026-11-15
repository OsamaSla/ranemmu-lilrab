# Scripture references (المراجع الكتابية)

Where each hymn is founded in scripture. The reader prints the reference as one
small centred line above the first stanza — Arabic book name, Arabic-Indic
digits, never tappable. **No Bible text is bundled, cached or committed here**:
only the reference itself ships with the app.

A hymn with no confident reference has no file in this tree and shows nothing.

## Authoring tree

One payload per hymn:

```
content/scriptures/<book>/<number>.json     book = book3 | main | taranim | …
```

```json
{
  "book": "book3",
  "number": 46,
  "refs": ["php.3.13", "rom.8.37"],
  "review": ["php.3.13", "rom.8.37"]
}
```

- `refs` — canonical id (`isa.53.4-6`) or the printed Arabic form
  (`إشعياء ٥٣: ٤-٦`). Parsed once, at apply time; the corpus stores structured
  refs, never strings.
- `review` — the refs nobody has read against the hymn yet. Everything drafted
  by machine starts here; delete an entry once a human has confirmed it. The
  flag is bookkeeping only — nothing renders it.
- `"refs": []` clears an existing reference.

`content/*.json` is generated from this tree — **never hand-edit it**.

## Workflow

```bash
npm run scripture:suggest      # draft from the Smith & Van Dyke text
#   → content/scriptures/_drafts/report.md  (drafts · weak · near misses)
npm run scripture:curate       # drop/correct verdicts → authoring tree
npm run scripture:apply        # merge payloads into content/*.json
npm run scripture:check        # fail if the corpus would drift
```

`suggest` needs network access the first time: it caches the Arabic Bible under
`content/.cache/` (gitignored). It only drafts refs it is confident about, and
lists weak phrase matches separately for a human to promote or ignore.

## Bars

Two kinds of evidence, each weak alone:

- **phrase** — the hymn prints the verse's own words, scored by summed IDF
  (`trigramStrong 20`, `bigramStrong 18` stand alone);
- **overlap** — cosine between the hymn's and the verse's vocabulary.

A weaker phrase needs the overlap to agree. Exact numbers live in `SCORE` at the
top of `scripts/scripture-suggest.mjs`, and every report header prints them, so
a run can be reproduced.

## Rules

- Only a human confirms a reference; the machine drafts and reports.
- A verse can be the hymn's *ground* without being quoted — and a hymn can quote
  a verse in passing without being founded on it. The second case is what the
  weak-phrase section lists.
- Prefer the narrowest range that carries the hymn's thought; `maxRange` stops
  a merge from citing a whole chapter.
- Canonical order (book, chapter, verse) and no duplicates — `scripture:apply`
  and `npm run check:hymns` enforce both.
