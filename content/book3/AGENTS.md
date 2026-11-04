# Book 3 — ترانيم للرب الجزء الثالث (402 hymns)

Status: **complete** — 402 hymns transcribed (EN 401 / DE 400 translated,
348 topic-tagged). This folder is the authoring source; the app reads the
built corpus, never these files.

## Layout

- `parts/b30001.json` … `parts/b30402.json` — one file per hymn, source format:
  `{ number, title, verses: [{ label, chorus?, lines: [{ sadr, ajuz }] }] }`
- `parts/b30301.json` … `parts/b30320.json` — superseded early duplicates of
  301–320; the builder keeps the last file for a number, so they never
  duplicate output.
- `book3.json` — built app format (written by the builder; never edit by hand)
- `book3-translated.json` — EN/DE translation store (Ollama drafts)
- `manifest.json` — batch bookkeeping, stays valid but no longer drives a queue

## Build

1. `npm run book3:build` — assemble parts, merge translations, tag topics;
   writes `content/book3/book3.json` and `content/book3.json`.
2. `npm run book3:publish` — gate: verifies hymns 1..402 are all present,
   then copies the built file to `content/book3.json`.
3. `npm run build:corpus` — rebuild `assets/hymns/` chunks + `generated-chunks.ts`.

## Rules

- One entry per printed row, flattened as `sadr · ajuz`.
- Refrain stanzas keep `chorus: true` and label `القرار` / `قرار`.
- Never edit `book3.json` by hand — rebuild it from `parts/`.
- Topics are recomputed on every build; change tagging in
  `scripts/lib/topic-tagger.mjs`, not in the built JSON.
