# Review-sheet pipeline — bulk proofreading without page-by-page navigation

Two scripts move the 1422 hymns between Firebase and a spreadsheet, so
reviewers correct texts, retag topics and flip review status in bulk:

```
npm run export:review -- --out content/review-sheet.xlsx [--lang de] [--local] [--csv]
npm run import:review -- content/review-sheet.xlsx [--lang de] [--local] [--apply]
```

## Workflow (with Google Sheets)

**Easiest — one click:** double-click `publish-review.cmd` (or drag the
edited `.xlsx` onto it). It checks the sheet, asks once, then publishes.
Password entry is masked and never saved; Firebase config is reused from
`.env.local`.

Manual alternative (same steps the `.cmd` runs):

1. **Export:** `npm run export:review -- --out content/review-sheet.xlsx`
   (needs the `EXPO_PUBLIC_FIREBASE_*` env vars — read is public, no
   sign-in required). The export is the bundle overlaid with live Firebase
   edits (the same picture the app renders), since Firebase only holds
   hymns an admin has touched. One row per hymn: ID, Number, Book,
   Title (Arabic), Arabic Text, German Title, German Translation, Primary
   Category, Tags, IsReviewed. `--lang en` exports the English columns
   instead; `--local` uses the bundle only (offline).

   The workbook has two tabs:
   - **Dashboard** (first): live metrics — Total Hymns, Reviewed,
     Pending, Progress % — plus per-category and per-book breakdowns
     (Total / Reviewed / Pending each). Values are formulas over the
     Review tab, so the board stays current as reviewers edit.
   - **Review**: the hymn rows. Header frozen, Auto-Filter on, dropdown
     guardrails on IsReviewed. Do not rename this tab — the import
     finds it by name (older single-sheet exports still import: any tab
     whose header holds ID + IsReviewed is accepted).
2. **Review in Google Sheets:** Drive → New → File upload → open with
   Sheets → share with proofreaders. They edit the text/category/review
   columns directly, hundreds of hymns per session.
3. **Download:** File → Download → Microsoft Excel (.xlsx).
4. **Import dry run:** `npm run import:review -- content/review-sheet.xlsx`
   validates every row and reports the detected changes — nothing is
   written. Fix any reported rows and re-run.
5. **Apply:** add `--apply` (needs `ADMIN_EMAIL` + `ADMIN_PASSWORD`).
   Only changed fields are written back in batches, each stamped so every
   device picks the edits up live within seconds.

`--local` on either script uses `content/*.json` instead of Firebase
(offline; import is then dry-run only) — handy for testing the sheet
without touching production.

## Column rules

- **ID / Number / Book** are match keys — never edit them. Rows match by
  ID, so sorting or filtering in Sheets is harmless.
- **Arabic Text / Translation** use stanza headers (`[1]`, `[2]`, …
  `[قرار]` for the refrain, stanzas separated by a blank line).
  Line and stanza counts must stay identical to the stored hymn —
  structural edits (reorder/add/remove) are rejected; those stay a PC job
  via the corpus xlsx pipeline.
- **Blank translation cells mean "no change"** — translations are never
  deleted from the sheet. Filling a blank translation cell creates it
  (shape must match the Arabic).
- **Blank Tags clears the tags**; blank Primary Category keeps the stored
  one. Unknown topic ids are rejected (valid: `worship cross comfort
  repentance fellowship warfare word eternity church`).
- **Blank IsReviewed means "no change"** (never mass-unreviews);
  `TRUE` → VERIFIED, `FALSE` → AI_DRAFT.
- Any validation error aborts the whole run before a single write.
