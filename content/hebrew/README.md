# Hebrew translation payloads

Hand-authored, fully vocalised Hebrew, one JSON file per hymn. Nothing here is
consumed at runtime directly — `scripts/hebrew-apply.mjs` merges a payload into
the matching `content/<book>.json` record, and only the merged corpus ships.

## Folders

| Folder | Book | Hymns | Status |
|---|---|---|---|
| `taranim/` | Book 2 — ترنيمات روحية | 375 | **complete** (7,386 lines) |
| `main/` | Book 1 — رنموا للرب | 1,047 | base ready, not started |
| `book3/` | Book 3 — هلم نرنم | 402 | base ready, not started |

File name = `NNNN.json`, zero-padded to the hymn number (`main/0001.json`,
`book3/1001.json`). The folder name must equal the `book` field in the payload.

## Payload shape

```json
{
  "book": "book3",
  "number": 1,
  "title_he": "…",
  "verses_he": [{ "label": "١", "lines": ["…", "…"] }],
  "chorus_he": "…",
  "review": ["…"]
}
```

- `verses_he` must mirror the Arabic hymn **exactly**: same stanza count, same
  labels (Book 3 prints Arabic-Indic numerals, `١` `٢` …, and some hymns label a
  refrain stanza `القرار`), same line count per stanza.
- `chorus_he` is required only when the hymn carries a separate `chorus` field.
- Every line must be pointed Hebrew with no Latin/Arabic characters.
- `review[]` holds the translator notes for that hymn (they are printed by the
  apply script and are the only review mechanism).

## Daily loop

```sh
node scripts/hebrew-progress.mjs                 # coverage + next numbers
node scripts/hebrew-digest.mjs book3 1 10 out.txt # AR + EN + metre + shape
node scripts/hebrew-skeleton.mjs book3 1 10 --write  # exact-label stubs
# … replace the empty strings with pointed Hebrew, fill title_he and review[] …
npm run hebrew:apply        # merge (aborts the whole run on any mismatch)
npm run hebrew:meter        # relative syllable balance, flags > ±2
npm run build:corpus && npm run check:hymns && npm run typecheck
```

Commit per batch. `npm run hebrew:check` is the drift gate: it must print
"no drift" before a commit that touches the corpus.

## Rules that have already cost time

- A trailing comma in `review[]` aborts the whole apply run.
- The meter numbers stanzas by **array index**, not by the printed label, so on
  hymns with a chorus stanza `2:x` may mean the block after it.
- Printed non-rectangular shapes (a 2-line refrain stanza, a chorus first) are
  real; do not pad them to a rectangle. The full list is in `PROJECT_NOTES.md`
  §15.
- Word-splits across printed line-breaks are mirrored at the same syntactic
  seam, not mended.
- `dist/` is tracked; never commit a local `expo export`.
