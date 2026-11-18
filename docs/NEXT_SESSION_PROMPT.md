# Prompt for a fresh session — ranemmu-lilrab (session closeout)

Copy this whole file into a new session as the first message.

---

You are continuing `ranemmu-lilrab` (branch `main`, synced with `origin/main` —
read the exact head commit from the "Last verified" line of `PROJECT_NOTES.md`,
do not trust a stale hash here). Reply in English. Keep Arabic and Hebrew text
unchanged unless the owner explicitly asks for a translation.

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
4. `docs/FEEDBACK_NOTIFICATIONS.md` if the ratings/message feature comes up —
   it holds the manual Cloud Function deploy steps.

## Current verified state — do not re-derive

- All three Hebrew books are **complete**: 1824/1824 translated hymns
  (taranim 375, book3 402, main 1047), 30,898 lines, 100 % pointed. No
  rotation-driver batches remain.
- **Book 2 refrains**: 123 of 375 hymns have a flagged refrain stanza — the
  30 earlier fixes (315–374) plus 93 recovered from the owner's
  `Desktop/1.xlsx` and applied in `c8b62434` → `76066bbb`. Full list lives in
  `taranim/STATE.md` so it can never be lost again.
- **Reader refrain heading** (`6a5ffa74`): pairs the Arabic word with the word
  in the *viewed* language (`القرار · Refrain` / `Kehrvers` / `פְּזָמוֹן`) for
  all three books, Book 1 from `chorus_en/de/he`, Books 2/3 from the printed
  label plus a viewed-language fallback.
- **Tooling**: `scripts/refrain-batch.mjs` includes `verses_he` in `LANGS`;
  `scripts/book2/sync-hebrew-payloads.mjs` copies the corrected Hebrew grid
  back into the payload files (mandatory — `hebrew-apply.mjs` checks labels).
- **Feedback** (`d507b6c0`): «التقييمات» has an anonymous rating path and an
  email message path (hint «إن كان لديك أي فكرة لتحسين التطبيق، اكتبها هنا كرسالة
  للمصمم»). Both share the `feedbacks` collection; messages carry `replyEmail`.
  Admin list has kind chips. «تواصل معنا» opens a mailto to the admin address.
  A Firestore `onCreate` function emails the admin via Resend with From name
  `TarneemAPP` and Reply-To set to the sender. **Manual steps remain for the
  owner**: Blaze plan, secrets/env, function deploy, Firestore rules (§28).
- **Setlist** (`ac89c336`): user-defined categories with their own ordered hymn
  rows; the hymn page asks which category when adding; shared links carry a
  `groups` param. See `PROJECT_NOTES.md` §29.
- **Final reader UI** (see `PROJECT_NOTES.md` §8 for measurements): golden header
  is back + centred title + centred tools; the language button sits on the left
  rail and rolls through languages on swipe/tap; fullscreen has no top bar and
  its exit button is at the foot of the rail; the AI/translation note is a
  footnote after the last stanza; text margins are 12px. Stanza rail offsets
  and Arabic↔translation pairing were preserved; verified at 360×740.
- The stray `install-windows.ps1` (Hex/Anomaly installer, unrelated to this
  repo) was deleted.
- **Stanza accordion / windowing was deliberately NOT implemented** — the
  editor is PC-only with its own collapse/toggles, and a reader accordion would
  break sing-through reading. Only do it if the owner explicitly asks again.
- **Rejected idea (owner asked on 2026-11-19):** Gemini suggested replacing
  Resend with Firebase Auth's client-side `sendEmailVerification()`. That
  verifies an account's address; it does **not** notify the admin about new
  feedback (feedback is anonymous, there is no signup) and cannot carry the
  feedback content or a Reply-To. It is not a substitute for the notification
  function. Only implement it as a separate feature if explicitly requested.
- **CI lint is real** (§8): `fb179538` failed both workflows at "Build web app"
  due to new ESLint errors; fixed in `208fbd48`. Always run `npx eslint src`
  before pushing — local `npm run lint` is vacuous.

## Commands and environment

- PowerShell here has **no `&&`** — chain with `;` or separate calls.
- Dev server: `node node_modules/expo/bin/cli start --port 8081` (the npm
  scripts resolve to the wrong legacy CLI in this workspace).
- Metro caches imported JSON chunks: after `build:corpus`, restart with `--clear`
  before trusting what the UI shows.
- The editor is behind Firebase sign-in; the owner must unlock `/admin` first.
  `useAdminGate` is intentionally not persisted, so a full page reload
  re-locks it — navigate client-side when testing.
- **Lint gate:** `npx eslint src` (not `npm run lint`).
- Gates, all green at handoff:
  ```
  npm run hebrew:check
  npm run hebrew:align          # ✓ 1824 translated hymns
  npm run check:hymns           # 1824 / 30,898 lines / 100 % vocalised
  npm run build:corpus          # 1824 hymns / 19 chunks / 3.87 MB search index
  npm run typecheck
  npx eslint src
  git diff --exit-code -- assets/hymns src/data/generated-chunks.ts
  ```

## Conventions (keep these)

- All text goes through `AppText`; spacing/radius from `src/theme/tokens.ts`.
- i18n keys must be added to ar / en / de together.
- Refrain stanzas carry `chorus: true`; stanza numbering skips them. A bare
  number in an old saved label is never shown as a refrain heading.
- Book 1 `chorus_he` is **only** the fixed word `פְּזָמוֹן` (owner decision).
  Books 2/3 have no chorus fields — do not "harmonise" them by adding fields.
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

- `main` equals `origin/main`, clean working tree, CI green after the lint fix.
- The owner knows the only outstanding item is the **manual** Cloud Function
  deploy (§28 / `docs/FEEDBACK_NOTIFICATIONS.md`); no code work is pending.
- Any new session starts from this prompt plus `PROJECT_NOTES.md`.
