# HANDOFF — ranemmu-lilrab (hymn app / ترانيم)

Last updated: 2026-11-17 · `HEAD` / `origin/main` = `ea3ab115` · working tree clean
Deployed and verified live (Pages run #280 and Firebase run #79 both `success`).

Read this before touching anything; details and evidence live in `PROJECT_NOTES.md`
(1429 lines, sections 1–27). `WORKPLAN.md` (local only, gitignored) is the session
plan and is now fully checked off.

> `HANDOFF-TO-NEXT-AI.md` is a stale 2026 snapshot about Firebase "page not found"
> problems that were fixed long ago. Ignore it; this file supersedes it.

## 1. What was just built

Newest first. Everything below is committed and live.

- **Reader: touch scrolling restored + stanza rail moved to the physical left**
  (`9e957496`). The swipe-to-next-hymn `GestureDetector` made its child
  `touch-action: none` on web, so a phone could only move down a hymn by tapping
  a stanza dot. Added `touchAction="pan-y"`. The rail now renders before the
  text column inside the `flexDirection: 'row'` / `direction: 'ltr'` container.
- **CI typecheck fix** (`cf51c002`). CI failed with `TS7006` because
  `expo-env.d.ts` is gitignored and generated only by Expo; `src/data/adminAccess.ts`
  now casts the env read explicitly.
- **Hebrew in the admin review queue** (`380e73f3`). The queue toggle is now
  EN/DE/HE, filters on `verses_he`, pushes `?lang=he` into `admin-edit`, and
  enables the `book3` book filter. Hebrew has no `translationStatus`, so its rows
  show a neutral `—` badge and a total-only count.
- Earlier the same day: Session 12 worship setlists (`3aec3d45`) and the Session 13
  refactor — single `useCorpusVersion()` store (`4842bdd0`), ReaderScreen split into
  toolbar/rail/verse blocks/notices/scroll hook (`e02a61db`), lazy Firebase Auth
  and admin routes (`d49ce35a`).

## 2. Exact file paths modified (this session's code commits)

| Path | Commit | Change |
| --- | --- | --- |
| `src/app/(tabs)/hymn/[id].tsx` | `9e957496` | rail rendered before the `ScrollView`; `touchAction="pan-y"` on `GestureDetector` |
| `src/components/reader/StanzaRail.tsx` | `9e957496` | left dock; physical `paddingLeft`/`paddingRight`/`borderRightWidth` |
| `src/data/adminAccess.ts` | `cf51c002` | typed `EXPO_PUBLIC_ADMIN_EMAILS` read (CI without `expo-env.d.ts`) |
| `src/app/(tabs)/admin.tsx` | `380e73f3` | EN/DE/HE review toggle, `verses_he` filter, `book3`, neutral HE badge |
| `PROJECT_NOTES.md` | `cc25f011`, `ea3ab115`, `cf51c002` | sections 26–27, header date |

Created now (not yet part of the three commits above): `HANDOFF.md` (this file)
and the checked-off `WORKPLAN.md` (gitignored, local only).

## 3. Known bugs, traps and gotchas

- **`GestureDetector` on web defaults to `touch-action: none`.** Any scrollable
  child of it stops accepting touch pans; desktop wheel still works, so it looks
  fine in dev. Pass `touchAction="pan-y"`. Cost: no pinch-zoom on the reader text
  (the font-size control covers it).
- **RTL + logical edge props.** In `StanzaRail`, `paddingStart`/`borderLeftWidth`
  resolved to the wrong physical edge. Use `paddingLeft`/`borderRightWidth` there.
  The row container pins `direction: 'ltr'`, so source order is physical order.
- **`onLayout` on web is a `ResizeObserver` and does not fire in a background
  browser tab.** The rail's offset store stays empty in an unfocused automation
  tab: dots do nothing and the highlight never moves. That is not a code bug —
  foreground the tab (or open a fresh one) before diagnosing.
- **Validate production behaviour with an export, not Metro.**
  `node node_modules/expo/bin/cli export -p web` then
  `node node_modules/expo/bin/cli serve --port 8083`. Dev Metro on 8081 shows
  stale/background-tab quirks and `expo start` prints a harmless
  `wake lock with tag reader has not activated yet` error on unmount.
- **`expo-env.d.ts` is gitignored and CI runs `typecheck` before anything else.**
  Every new `process.env.EXPO_PUBLIC_*` read that feeds a callback needs an
  explicit `string | undefined` cast, or CI fails while local `tsc` passes.
- **`npm run lint` is vacuous** (`expo lint` — no config). Run real ESLint:
  `node node_modules/eslint/bin/eslint.js <files>`.
- **Metro keeps serving the old corpus JSON** after `npm run build:corpus`.
  Restart with `--clear`; the static export always reads the new files.
- **`.env.local` is present**, so Firebase is configured and admin editing needs a
  signed-in allowlisted admin. The PIN gate (`1234`) only applies when the
  Firebase env vars are absent; testing it means temporarily renaming `.env.local`
  and restoring it.
- **Known intermittent `Error #418` hydration log on `/hymn/<id>`** on both hosts;
  the verses still render. Investigated and not reproducible from a fresh load —
  do not chase it unless content is missing.
- **`gh` CLI is not installed.** Check CI at
  `https://api.github.com/repos/OsamaSla/ranemmu-lilrab/actions/runs` or the Actions page.
- **Expo Router URL-encodes commas** (`?ids=tr0001%2Cb30249`); the param still
  arrives decoded, so parse after decoding.
- **Never `git push` without explicit instruction** — a push deploys to GitHub
  Pages and Firebase Hosting immediately. `WORKPLAN.md` is gitignored, so checking
  it off is local-only.

## 4. Exact next task

**There is no unchecked task left in `WORKPLAN.md`.** All 13 sessions (Phases 1–3)
are now `[x]`, so the plan is exhausted and the next item must come from the
documented backlog rather than the plan.

Recommended first task for the next session — finish the Book 3 translations
(recorded in `PROJECT_NOTES.md` §9):

```powershell
$env:TRANSLATE_MODEL = 'qwen2.5:14b'
node scripts/book3/translate-ollama.mjs
```

Two Book 3 hymns still have no translation. After it runs, re-check with
`npm run hebrew:check`, rebuild with `npm run build:corpus`, review the output in
`/admin` with the HE toggle, and commit (no push).

Optional, if a bundle-size claim is wanted before writing Phase 4: measure the
web entry chunk (`dist/_expo/static/js/web/*.js`) on a build from `d49ce35a^` vs
`HEAD` to confirm the Session 13 lazy-loading win, since it was never quantified.
