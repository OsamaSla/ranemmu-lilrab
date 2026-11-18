# Prompt for a fresh session — ranemmu-lilrab (session closeout)

Copy this whole file into a new session as the first message.

---

You are continuing `ranemmu-lilrab` (branch `main`, synced with `origin/main` at
`15bd0c36`). Reply in English. Keep Arabic and Hebrew text unchanged unless the
owner explicitly asks for a translation.

## FIRST — read these, in this order

1. `PROJECT_NOTES.md` — the source of truth. If context is tight, read its
   header plus §1–§4, §7, §8 and §10 in slices rather than all at once.
2. `content/hebrew/taranim/STATE.md` — the recovered Book 2 refrain list
   (verbatim Excel dump, mapping, applied ranges, tooling and gates).
3. Only if new work touches them: `content/hebrew/main/PLAN.md` +
   `content/hebrew/main/STATE.md` (Book 1 rotation driver — all batches done),
   `content/hebrew/glossary.md` (Hebrew authoring rules),
   `docs/BOOK2_REFRAIN_FIX_PROMPT.md` (**historical, now completed** — do not
   follow it as pending work).

## Current verified state — do not re-derive

- All three Hebrew books are **complete**: 1824/1824 translated hymns
  (taranim 375, book3 402, main 1047), 30,898 lines, 100 % pointed. No
  rotation-driver batches remain.
- **Book 2 refrains**: 123 of 375 hymns have a flagged refrain stanza — the
  30 earlier fixes (315–374) plus 93 recovered from the owner's
  `Desktop/1.xlsx` and applied in `c8b62434` → `76066bbb`. The 30 earlier fixes
  are byte-identical to before. Full list lives in `taranim/STATE.md` so it can
  never be lost again.
- **Reader refrain heading** (`6a5ffa74`): pairs the Arabic word with the word
  in the *viewed* language — `القرار · Refrain` / `القرار · Kehrvers` /
  `القرار · פְּזָמוֹן` — for all three books. Book 1 gets it from data
  (`chorus_en/de/he`), Books 2/3 from the printed label plus a viewed-language
  fallback. Verified in the browser on tr0132 (EN/DE/HE), b30002 (EN), h0014
  (EN).
- **Tooling**: `scripts/refrain-batch.mjs` includes `verses_he` in `LANGS`;
  `scripts/book2/sync-hebrew-payloads.mjs` copies the corrected Hebrew grid
  back into the payload files (mandatory — `hebrew-apply.mjs` checks labels).
- The stray `install-windows.ps1` (a Hex/Anomaly installer, unrelated to this
  repo) was deleted.
- **Stanza accordion / windowing was deliberately NOT implemented.** The admin
  editor already has section collapse and per-language toggles (h0383 drops
  from ~205 inputs to ~65 with translations hidden), it is PC-only, and a
  reader accordion would break sing-through reading and risk the rail offsets
  and Arabic↔translation pairing. Only do it if the owner explicitly asks
  again.
- **Pending work: none.** The session was closed clean; everything is
  committed and pushed.

## Commands and environment

- PowerShell here has **no `&&`** — chain with `;` or separate calls.
- Dev server: `node node_modules/expo/bin/cli start --port 8081` (the npm
  scripts resolve to the wrong legacy CLI in this workspace).
- Metro caches imported JSON chunks: after `build:corpus`, restart the dev
  server with `--clear` before trusting what the UI shows.
- The editor is behind Firebase sign-in; the owner must unlock `/admin` first.
  `useAdminGate` is intentionally not persisted, so a full page reload
  re-locks it — navigate client-side when testing.
- Real lint: `node node_modules/eslint/bin/eslint.js <files>` (`npm run lint`
  is vacuous with this CLI).
- Gates, all currently green:
  ```
  npm run hebrew:check
  npm run hebrew:align          # ✓ 1824 translated hymns
  npm run check:hymns           # 1824 / 30,898 lines / 100 % vocalised
  npm run build:corpus          # 1824 hymns / 19 chunks / 3.87 MB search index
  npm run typecheck
  git diff --exit-code -- assets/hymns src/data/generated-chunks.ts
  ```

## Conventions (keep these)

- All text goes through `AppText`; spacing/radius from `src/theme/tokens.ts`.
- i18n keys must be added to ar / en / de together.
- Refrain stanzas carry `chorus: true`; stanza numbering skips them. A bare
  number in an old saved label is never shown as a refrain heading.
- Book 1 `chorus_he` is **only** the fixed word `פְּזָמוֹן` (owner decision),
  not the refrain text. Books 2/3 have no chorus fields — do not "harmonise"
  them by adding fields.
- The reader uses stable verse keys; per-hymn UI state resets in a `useEffect`
  keyed on `id`. Keep Arabic↔translation line pairing and stanza-rail offsets
  intact when touching reading UI.
- `content/*.json` is generated — author in `content/hebrew/<book>/NNNN.json`
  and merge with `hebrew:apply`. Never hand-edit the corpus.

## Rules for this repo

- After any non-trivial change, update `PROJECT_NOTES.md` (and the relevant
  `STATE.md`) and bump "Last verified". Record facts that cost time to learn,
  not things an `ls` answers.
- Commit granularly. **NEVER push unless the owner explicitly says "push";**
  when they do, push once at the very end of the session.
- Never write-probe production data or third-party services.
- Run the gates above and report what passed before claiming done.
- If context gets tight, write a checkpoint to `PROJECT_NOTES.md` and tell the
  owner to run `/compact` — do not let the session run out of context.

## Definition of done for this handoff

- `main` equals `origin/main` at `15bd0c36`, clean working tree.
- The owner knows there is no remaining task; any new one starts from the
  notes and this prompt.
