# Book 3 — Phase 0 build plan

State file: `content/book3/manifest.json`
Golden sample: `content/book3/parts/000-golden.json`
Index decode: `content/book3/index.json` (from `assets/1-402-index.pdf`)
Page renders: `assets/book3/pages/` (rendered 400 DPI, split halves)
Batch output: `content/book3/parts/NNN.json`

## Batch flow
1. `npm run book3:next` → picks first pending spread from manifest
2. Read pages; split right/left (RTL) → right page first, left page second
3. Read right-column sadr, left-column ajuz per row
4. Pair into `{ sadr, ajuz }` lines; detect `القرار` chorus
5. Write `NNN.json`; update manifest; build passes

## Gate rules (any agent)
- Each hymn must have ≥1 stanza with lines array ≥1
- Title = index entry (or first sadr); no empty title field
- Chorus stanza must have label="القرار" and chorus=true
- Every hymns' number in range 1..402 sequential check
- `manifest.json` must stay valid JSON; no uncommitted files at session end

## Model usage
- Default model: all transcription + index decode + correction
- Weak models (Tier 1): `book3:*` scripts, manifest updates, commit only — never edit `lines[]`
- Max: optional, only if batch failure rate > 15% across 3 batches
