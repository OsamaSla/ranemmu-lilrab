# Translation brief — hymns 21-40 (20 hymns, EN + DE)

Source: source.md (vocalised Arabic). Output: fill the EN/DE sheets of
draft-21-40.xlsx — one translated line per row, First half column
(or split across First/Second half for long lines, joined with ❖ on import).

## Hard rules (the importer rejects anything else)

1. NEVER add, remove, merge, split or reorder rows. Row count per hymn must
   stay identical to the Arabic sheet — stanza counts and per-stanza line
   counts are validated on import.
2. Keep the Kind and Stanza No. columns exactly as prefilled.
3. Fill the Title cell on each hymn's first row (both languages).
4. Chorus label is prefilled (Refrain / Kehrvers) — leave it.

## Language guidance

- Singable church register, faithful over beautiful. Prefer clarity a
  congregation can sing; keep line lengths roughly matching the Arabic.
- German: liturgical "Du" (never Sie); English: plain reverent diction.
- Names, doxologies and Scripture echoes stay; explain nothing in footnotes.
- Unsure about a line? Translate literally and flag it in the Notes column.

## After drafting

All AI text is DRAFT. A human reviewer reads every line in Excel before any
merge. Reviewed files merge into content/hymns-imported.xlsx, then
`npm run add-batch` validates, rebuilds and re-exports.
