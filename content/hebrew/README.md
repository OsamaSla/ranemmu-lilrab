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
- `label` and `chorus` on a Hebrew verse are **copied from the Arabic verse at
  that index** by the apply script; a payload cannot set them differently. The
  Arabic record owns the stanza grid — a payload was authored against one
  snapshot of it and cannot know that a stanza later became the refrain (this
  is why 30 taranim hymns used to ship a refrain stanza without the flag).
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
npm run hebrew:align        # Hebrew grid vs Arabic grid, hymn by hymn
npm run build:corpus && npm run check:hymns && npm run typecheck
```

Commit per batch. `npm run hebrew:check` is the drift gate: it must print
"no drift" before a commit that touches the corpus.

## When the Arabic stanzas change

Reordering a stanza or flagging a refrain in the admin editor is an *override
patch*: it rewrites `verses` for that hymn and leaves the bundled `verses_he`
alone. Two things keep the Hebrew attached to its stanza:

- `src/data/translationAlign.ts` (used by `src/data/loader.ts`) realigns the
  bundled Hebrew against the edited Arabic order **at read time**, matching by
  stanza text, so overrides saved by an older build or already in Firestore fix
  themselves with no migration.
- The admin editor now edits Hebrew too (`verses_he`), and moves it with the
  Arabic stanza, so a fresh save stores an aligned copy.

`npm run hebrew:align` audits the merged corpus after either of those; any
"label" / "refrain flag" / "lines" fault it prints is a shipped error.

## Hymns that another book already has

61 hymns are printed in more than one book. `build:corpus` finds them
(`scripts/lib/duplicates.mjs`) and, when the printed lines agree, lends the
Hebrew of a translated copy to the copies still untranslated — re-cut onto the
borrower's own stanzas, labels and refrain flags. `npm run duplicates` lists
every group with its line counts and says which copies can borrow.

- Do not author a payload for a hymn that already shows Hebrew in the app from a
  twin; check `npm run duplicates` first. A hand-authored payload always wins,
  so writing one is not harmful, just duplicated work.
- A group marked "cannot re-cut (line counts differ)" needs its Hebrew authored
  for that book (or the lines re-broken by hand) — the flat text matches, the
  line breaks do not.
- Nothing is shared at edit time: stanza order, refrains and wording stay per
  book. Same *title* is not evidence of the same hymn.



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
