# Prompt for a fresh session — ranemmu-lilrab (session closeout)

Copy this whole file into a new session as the first message.

---

You are continuing `ranemmu-lilrab` (branch `main`, synced with `origin/main` —
read the exact head commit from the "Last verified" line of `PROJECT_NOTES.md`,
do not trust a stale hash here). Reply in English. Keep Arabic and Hebrew text
unchanged unless the owner explicitly asks for a translation.

## FIRST — read these, in this order

1. `PROJECT_NOTES.md` — source of truth. If context is tight, read its header
   plus §1–§4, §7, §8 and §10 in slices rather than all at once.
2. `content/hebrew/taranim/STATE.md` — recovered Book 2 refrain list (verbatim
   Excel dump, mapping, applied ranges, tooling, gates).
3. Only if the work touches them: `content/hebrew/main/PLAN.md` +
   `content/hebrew/main/STATE.md` (Book 1 driver — all batches done),
   `content/hebrew/glossary.md` (Hebrew rules),
   `docs/BOOK2_REFRAIN_FIX_PROMPT.md` (**historical, completed** — not pending).
4. `docs/FEEDBACK_NOTIFICATIONS.md` if feedback/email comes up — it now documents
   the Web3Forms client POST, **not** a Cloud Function.

## Current verified state — do not re-derive

- **Head commit at closeout: `9acc7818`** (pushed, `main == origin/main`, clean
  tree). This session's work, all in `PROJECT_NOTES.md` §31–§32:
  - **Home carousel** (`src/app/(tabs)/index.tsx`): a 3-card circular coverflow.
    Arrows sit below the books; cards glide between slots with a 650 ms
    `Animated.timing`; tapping a side card brings it to centre (note the
    `activeIndex` off-by-one — `onNavigate` uses `index - 1`); swipe + web arrow
    keys work; the whole native-size layout is `transform: scale`-ed down on
    phones (margins trimmed to kill the empty gap). Phone chrome is compact
    (`compact = width < 600`) so the four quick-action pills fit one row.
  - **Onboarding tour** (`OnboardingFlow.tsx`): new first step "Pick your book"
    (i18n `onboarding.tour.books.*` in ar/en/de) — 5 steps now. The earlier GUI
    demo's "onboarding tour" mentioned below was a **different, reverted** demo.
  - **Reader cleanups** (`hymn/[id].tsx`): removed the swipe-language CoachHint;
    wake-lock error fixed with `useKeepAwake('reader', { suppressDeactivateWarnings: true })`.
    The hold-to-fix-a-line editor and 3-dots "Edit hymn" are intact — they are
    gated by `canEdit`.
  - **Admin gate** (`more.tsx`): the "الإدارة" entry is now visible for signed-out
    visitors so they can reach the sign-in form in `/admin` (`|| !signedIn`).
    Owner confirmed they could sign in again and everything works.
- All three Hebrew books are **complete**: 1824/1824 translated hymns
  (taranim 375, book3 402, main 1047), 30,898 lines, 100 % pointed. No
  rotation-driver batches remain.
- **Book 2 refrains**: 123/375 flagged (30 earlier + 93 recovered from the
  owner's `Desktop/1.xlsx`); list lives in `taranim/STATE.md`. The refrain rail
  dot now highlights when **tapped or when the refrain stanza is centred**
  (`9e83f0dc`) — it is no longer permanently lit or permanently off.
- Reader refrain heading pairs the Arabic word with the word in the *viewed*
  language (`القرار · Refrain` / `Kehrvers` / `פְּזָמוֹן`) for all three books.
- **Reader UI** (measurements in `PROJECT_NOTES.md` §8): slim golden header,
  swipeable language button on the rail, fullscreen with no top bar and exit at
  the rail foot, translation notice after the last stanza, 12px text margins.
  The active stanza has a gold background **and is kept centred** — scrolling
  settles by snapping it to the centre, a rail tap centres immediately, 24px
  hysteresis prevents flicker. Scrolling past the last stanza suspends snapping
  so «موجودة أيضاً في» / «ترنيمات مشابهة» stay reachable.
- **Feedback** (`c762ba74`): «التقييمات» has an anonymous rating path and a
  message path sharing the `feedbacks` collection; messages carry `replyEmail`.
  Admin list has kind chips; «تواصل معنا» is a mailto. The admin alert is a
  **client-side POST to Web3Forms** right after the Firestore write — no Cloud
  Function, no Resend, Spark plan; `functions/` was deleted and `firebase.json`
  has only `hosting`. Key: `EXPO_PUBLIC_WEB3FORMS_ACCESS_KEY` (**NOT** `VITE_*` —
  Expo only inlines `EXPO_PUBLIC_*`). The owner added it to local `.env.local`
  and as a GitHub Actions secret; both hosted bundles were verified to contain
  the code + key. A live end-to-end email check is the owner's to do.
- **Script repairs** (`572fe54e`, from a Claude Opus output folder): eight
  legacy scripts got `node:`/explicit `Buffer` imports, `render.mjs` was
  converted CJS → ESM, and real bugs were fixed in `deploy-netlify.mjs` and
  `generate-static.mjs`. `npm run lint` is now **real** (`npx eslint src --ext
  .ts,.tsx`) — the old `expo lint` was vacuous; `build:web` uses this gate.
- **GUI enhancement demo cancelled**: sepia theme, onboarding tour, expandable
  toolbar, continuous font slider, interlinear toggle and rail-position setting
  were applied, demonstrated and **fully reverted at the owner's request** —
  no code or history trace. Do not re-apply without a fresh explicit request.
  The only keeper from that review is the refrain-dot fix above.
- Stanza accordion/windowing deliberately NOT implemented. Firebase Auth
  `sendEmailVerification()` was rejected as a feedback-notification substitute.
- The stray `install-windows.ps1` (unrelated Hex/Anomaly installer) was deleted.

## Commands and environment

- PowerShell has **no `&&`** — chain with `;` or separate calls.
- Dev server: `node node_modules/expo/bin/cli start --port 8081` (npm scripts
  resolve to the wrong legacy CLI here). Use `--clear` after changing env or
  corpus content.
- **Do not run `build:corpus` while Metro is live** — it causes transient
  "Unable to resolve assets/hymns/full/NNN.json" errors until a `--clear` restart.
- The editor is behind Firebase sign-in (admin email `osama.sla@gmail.com`).
  When signed out, the Admin entry in the More tab now stays visible so the
  sign-in form in `/admin` is reachable. `useAdminGate` (offline PIN builds)
  is intentionally not persisted — navigate client-side.
- Headless-browser verification uses the repo's `playwright-core` + Edge at
  `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`; skip onboarding
  by seeding `localStorage['ranemmu.onboarding.v1']='true'` before `goto`. The
  Expo overlay returns "Uncaught Error" on unhandled rejections, so check the
  console when testing navigation.
- Gates, all green at handoff:
  ```
  npm run hebrew:check
  npm run hebrew:align          # ✓ 1824 translated hymns
  npm run check:hymns           # 1824 / 30,898 lines / 100 % vocalised
  npm run build:corpus          # 1824 hymns / 19 chunks / 3.87 MB search index
  npm run typecheck
  npm run lint                  # real ESLint gate since 2026-11-22
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
- Never write-probe production data or third-party services (read-only OK).
- Run the gates above and report what passed before claiming done.
- If context gets tight, write a checkpoint to `PROJECT_NOTES.md` and tell the
  owner to run `/compact` — do not let the session run out of context.

## Definition of done for this handoff

- `main` equals `origin/main` at `9acc7818`, clean working tree, both deploy
  workflows triggered on that commit.
- No code work pending. Owner confirmed the admin sign-in works again.
  The only outstanding item is the owner's own live end-to-end email check
  after one real feedback submission.
- Any new session starts from this prompt plus `PROJECT_NOTES.md` — paste this
  whole file as the first message, then read the notes (header + §1–§4, §7, §8,
  §10, and the new §31–§32).
