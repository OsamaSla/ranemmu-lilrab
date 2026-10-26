# PROJECT NOTES — رنموا للرب / ranemmu-lilrab

Living knowledge base for agents and humans. **Read this before exploring the
repo** — it exists so `npm ci`, live Firebase probes and file-by-file reading
are not repeated every session.

- **Last verified:** 2026-10-26, commits `b320dab` (lyric search + lazy
  chunks) and `63f89a0` (regenerated corpus), `main`, live site checked.
- **Update rule:** see [§13](#13-general-rule-for-any-project). Touch only the
  sections a change affected and bump "Last verified".
- Speak Arabic with the owner (Osama). Code comments and commits are English.

---

## 1. What this is

A bilingual (ar/en/de) hymnbook PWA/native app for two Arabic hymn books:

| Book id | Arabic name | English |
| --- | --- | --- |
| `main` | رنموا للرب | Sing to the Lord |
| `taranim` | ترنيمات روحية | Spiritual Songs |

Bundled corpus ≈ 1422 hymns. Optional live overlay from Firestore (admin
edits + new hymns + deletions), with offline-first behavior.

- **Live site:** https://OsamaSla.github.io/ranemmu-lilrab/ (GitHub Pages)
- **Repo:** https://github.com/OsamaSla/ranemmu-lilrab (`main` only)
- **Firebase project:** `ranemmu-lilrab`
- Human docs: `README.md` (dev loop, content workflow), `FIREBASE_SETUP.md`
  (one-time cloud setup), `REVIEW_SHEET.md` (bulk translation review),
  `TUTORIAL_VIDEO.md`.

## 2. Stack (do not trust old Expo knowledge)

From `package.json` / `app.json`:

- Expo SDK **57.0.27**, React **19.2.3**, React Native **0.86.3** (New
  Architecture), expo-router **57** (typed routes), TypeScript 6.
- State: **zustand** (`src/store/*`). No Redux, no react-query.
- Firebase JS SDK **13** (`firebase/app`, `firebase/auth`, `firebase/firestore`).
- `web.output: "static"`, `experiments.reactCompiler: true`,
  `experiments.baseUrl: "/ranemmu-lilrab"`.
- **React Compiler is ON** → the strict hooks lint rules are errors
  (notably `react-hooks/set-state-in-effect`: never call the result of a
  setState-containing function synchronously inside `useEffect`; put the
  work after `await` or in an event handler).
- Expo docs for this SDK: https://docs.expo.dev/versions/v57.0.0/ — check
  before using any Expo API from memory.

## 3. Repo map

```
src/app/            Expo Router routes (screens only; keep helpers outside)
  _layout.tsx, +html.tsx (web <head>, SW registration, umami)
  (tabs)/_layout.tsx, index (home), library, favorites, recents, help, more,
        settings, structure, admin, admin-add, admin-edit, hymn/[id]
src/components/     Shared UI: AppBar, AppText, Card, FeedbackModal, … (all text
                    goes through AppText; never raw <Text>)
src/data/           corpus + cloud: loader (sync reads), chunks (lazy import),
                    generated-chunks (from assets/hymns/full), types, normalize,
                    search, topics, meter, media, firebase, liveSync, publish,
                    feedback
src/store/          zustand: settings (locale/theme/font/pin), overrides
                    (local admin edits), remote (downloaded live docs),
                    session (Firebase auth user), library (sort/filters)
src/hooks/          useT (translate + direction), useTheme, useGoBack
src/i18n/           ar.ts (nested, source of truth) + en.ts/de.ts (flat)
src/theme/          tokens.ts (colors light/dark, spacing, radius), fonts.ts
assets/hymns/       index.json (summaries, bundled statically) + full/NNN.json
                    (hymn bodies, dynamic import() per chunk — generated)
content/            authoring sources (.xlsx, imports); scripts/ builds assets
scripts/            corpus build/check, review sheets, pages fallback, tutorials
public/             manifest.json, sw.js, icons — copied into dist
```

Non-TS files inside `src/app/(tabs)/` (`extract_frames.py`,
`library_fixed_final.py`) are leftover scratch files, not routes. Safe to
delete; Expo Router ignores non-JS extensions.

## 4. Commands (Windows, cmd)

```cmd
npm ci                              :: install (Node 22 works; firebase 13 warns it wants >=24.12)
npm start                           :: expo start --port 8082
npm run web                         :: expo start --web
npx tsc --noEmit                    :: typecheck — must be silent
npx expo lint                       :: lint — currently 1 unrelated warning (MeterText.tsx)
npm run preview:build               :: corpus check+rebuild, export web, serve :8081
npm run build:corpus                :: content/* -> assets/hymns/*
npm run check:hymns                 :: corpus integrity
npm run export:review / import:review  :: bulk spreadsheet translation loop
npm run deploy                      :: local gh-pages deploy (normally CI does it)
```

`node_modules/` is gitignored and absent in fresh downloads — `npm ci` before
running checks. Windows cmd quirks in this environment: `node -e "..."` and
quoted `git commit -m "multi word"` can be mangled; write a temp `.mjs`/message
file instead.

## 5. Data architecture

Read path: `loader.ts` merges **bundled corpus** → **local overrides**
(`store/overrides`) → **remote docs** (`store/remote`). Screens use
`getCorpus()`, `getSummaries()`; search index lives in `data/search.ts`.
`getHymn()`/`getCorpus()` stay **synchronous** — they read whatever chunks are
already in memory.

Lazy hymn bodies (added 2026-10-26):

- `assets/hymns/index.json` (summaries, 214 KB) is still a static `require`.
  `src/data/generated-chunks.ts` (generated) lists each `full/NNN.json` as a
  literal `import('…')` plus `HYMN_CHUNK_BY_ID`, so Metro emits one JS file per
  chunk and the entry bundle carries no hymn text.
- `src/data/chunks.ts` owns the cache: `ensureHymn(id)` (one chunk),
  `ensureAllChunks()` (all 15, ~3.3 MB — full-text search and the admin review
  queue), `isHymnPending(id)` (bundled but not yet imported),
  `loadedChunksInOrder()`, `areAllChunksLoaded()`.
- Reads stay sync by contract: callers `await` the ensure call, then bump a
  local version state. `chunks.ts` calls one listener registered by `loader.ts`
  (`refreshOverlaidCorpus`), which drops the memoised corpus and search index.
- New screen pattern (reader, admin-edit): `getHymn(id)` → `undefined` +
  `isHymnPending(id)` → show `common.loading`, `ensureHymn` in an effect,
  bump state. Without the `isHymnPending` branch the screen flashes "not
  found" before the chunk lands.
- `assets/hymns/full/*.json` are written **minified** on purpose (`JSON.stringify`
  without indent): they are the exact bytes a search downloads. `index.json`
  keeps one-space indentation so its diffs stay reviewable.
- `store/remote.ts` cannot diff a bundled hymn whose chunk is not loaded, so it
  keeps the whole cloud record as the patch (`isBundledId(id)`),
  and `getRemoteFullDocs` skips bundled ids.

Cloud (Firestore):

| Path | Shape | Who writes |
| --- | --- | --- |
| `hymns/{hymnId}` (e.g. `h0001`) | full `Hymn` doc + `updatedAt` | signed-in admin |
| `meta/deleted` | `{ ids: string[] }` tombstones | signed-in admin |
| `feedbacks/{autoId}` | `rating`(1–5 int), `category`, `comment`, `status`, `adminNotes`, `createdAt` | create: anyone (validated); read/update/delete: signed-in admin |

- Sync watermark: `BUNDLED_AT` in `src/data/liveSync.ts`
  (`2026-10-15T00:00:00.000Z`). **Bump it when shipping a release whose bundle
  already contains the edits**, otherwise devices re-download nothing harmful
  but the baseline logic drifts.
- `scripts/migrate-to-firestore.mjs` uploads the corpus in 400-doc batches.
- Firebase config is baked at **build time** from `EXPO_PUBLIC_FIREBASE_*`
  (GitHub Actions secrets). Without them the app runs offline-only and Admin
  falls back to the local PIN gate.
- Firestore rules (`firestore.rules`) are deployed **separately** from the
  Pages build: `firebase deploy --only firestore:rules` or paste in Console.
  CI only deploys the web bundle.

**Never write-probe production Firestore.** A precondition "safe" write probe
used during the feedback fix (`currentDocument.updateTime` in the past) was
still committed by Firestore and created a junk document. Read probes with the
public web API key are fine; test writes belong in the emulator.

## 6. i18n & RTL

- `src/i18n/ar.ts` is the nested source and defines `TranslationKey`.
  `en.ts` / `de.ts` are flat `PartialDictionary`; missing keys fall back to
  Arabic automatically (`translate()` in `src/i18n/index.ts`).
- Add a key in `ar.ts` → add translations in `en.ts`/`de.ts` (optional but
  expected for UI chrome) → use `t('section.key')` via `useT()`.
- Direction is applied in React (`direction.row`, `direction.textAlign`,
  `writingDirection`), **not** `I18nManager.forceRTL`. On web the root
  `<html dir="rtl">` already reverses rows, so `direction.row` is *not*
  `row-reverse` there — do not "fix" that.

## 7. UI conventions

- Typography/colors only through `AppText`, `tokens.ts` colors, `spacing`,
  `radius`; no hex values except in tokens/`+html.tsx`.
- `Card`, `AppBar`, `SegmentedControl`, `IconButton`, `TextButton`,
  `EmptyState` cover most needs.
- Icons: `MaterialCommunityIcons` from `@expo/vector-icons`.
- **On web `Alert.alert` is an empty function** (react-native-web 0.21). Any
  user-visible confirm/result must be inline UI or `Platform.OS !== 'web'`
  gated. Current known offenders: hymn-delete confirm + PIN messages in
  `admin.tsx`, "contact us" in `more.tsx`, clear-recents in `settings.tsx`.
- React Compiler rules: no setState synchronously in `useEffect`; derive with
  `useMemo`; effects for external reads only, with a `cancelled` flag.

## 8. App ratings ("تقييم التطبيق") — current design

- Entry: `more.tsx` row `more.rateApp` → `FeedbackModal`.
- `src/data/feedback.ts`: `submitFeedback` / `fetchFeedbacks` /
  `updateFeedbackStatus` / `updateFeedbackNotes` / `deleteFeedback`. Results are
  explicit (`{ ok, error: 'unconfigured' | 'permission' | 'offline' | 'unknown' }`)
  — never swallow errors again. Sorting/filtering is client-side on purpose:
  `where('status') + orderBy('createdAt')` needs a composite index and fails
  the whole list when missing.
- Admin: "إدارة التقييمات" card in `admin.tsx` (visible after Firebase sign-in):
  filter chips (الكل/جديدة/قيد المعالجة/مكتملة), refresh, status triage, admin
  notes, two-tap delete. Reads require a signed-in admin by rule design.
- History: originally the rules had no `feedbacks` block (catch-all denied
  writes *and* reads) and the modal relied on `Alert` → button appeared dead on
  web. Fixed in `a15e501` (rules + error surfacing + admin panel).

## 9. Deployment

- `.github/workflows/pages.yml`: on push to `main` → `npm ci` →
  `npx expo export -p web` (Firebase env from secrets) →
  `node scripts/pages-fallback.mjs` → upload `dist` → deploy Pages.
  Verify with the Actions API, then confirm the live `entry-*.js` hash changed.
- Service worker (`public/sw.js`): pages network-first, static assets
  stale-while-revalidate. New bundles are content-hashed, so a normal reload
  usually suffices; hard-refresh / clear site data if behavior looks stale.
- Deep links work because every route is exported statically; `404.html` is a
  copy of `+not-found.html`.

## 10. Verified gotchas

1. `Alert.alert` = no-op on web (see §7). This was the root cause of the
   "dead" rating button symptom.
2. Firestore composite index absent ⇒ `getDocs` rejects ⇒ any
   `catch { return [] }` becomes "empty list, no error". Prefer client-side
   filter/sort for small collections.
3. Rules live outside CI; the app can look broken while the bundle is correct.
4. `EXPO_PUBLIC_*` are inlined at build time; changing them requires a rebuild.
5. `assets/hymns` is generated; edit `content/` + `npm run build:corpus`.
6. The downloaded project folder had **no `.git`**; it is now a normal clone of
   `origin/main` (since `a15e501`). Git identity is repo-local
   `OsamaSla <osama.sla@gmail.com>`; `core.autocrlf=true` (LF→CRLF warnings are
   expected and harmless).
7. `TUTORIAL_VIDEO.md` / `tutorial/` and the root `.mp4`/`.jpg` files are
   content assets, not app code.
8. **`assets/hymns` had drifted ahead of `content/`.** The generated JSON was
   hand-patched for months: `221d593` removed SoundCloud links from `content/`
   but the assets kept all 366, and `140862e` wrote YouTube links straight into
   `assets/`. Regenerating therefore looks like data loss. Verified 2026-10-26:
   all 251 curated YouTube links exist identically in `content/`, so
   `npm run build:corpus` drops only the 183 SoundCloud links that are no
   longer in `content/` and adds 21 newer ones. **Never "restore" the dropped
   SoundCloud links** — they were removed on purpose (the reader falls back to
   the YouTube search button). Verify with: diff `mediaUrl` by id between
   `git show HEAD:assets/hymns/index.json` and the working copy.
9. Full-text search needs every chunk, so the first text query upgrades the
   page from 3.14 MB to 8.99 MB of JS (entry + 15 chunks, raw). Expected;
   numbers stay on the summaries, and opening one hymn loads one 0.2–0.5 MB
   chunk.
10. `npx expo export -p web` pre-renders each hymn in Node, where effects do not
    run, so the exported HTML for `/hymn/<id>` contains the loading shell until
    the client hydrates and imports the chunk. The title is still server-rendered;
    the body is client-rendered now. Any future `<head>` SEO/metadata for hymn
    bodies must be fed from `index.json`, not from `getHymn()`.

## 11. Known issues / cleanup candidates

- Admin hymn delete, "contact us", clear-recents use `Alert` → no-ops on web
  (see §7). `recents.tsx` clears without any confirmation, unlike settings.
- Search lives only in `library.tsx` (no separate route): digits are a summary
  lookup, text matches titles immediately and lyrics after the chunks load,
  in two sections with match highlights (`HymnRow highlight`,
  `LyricsMatchRow`). Cap: 2 lines per hymn, 60 lyric rows. The reader's jump
  bar still only jumps by number.
- **`admin-edit.tsx` has no auth gate**, and `ReaderSettingsModal` shows an
  "تحرير الترنيمة" button to every reader. The PIN only gates `admin.tsx`;
  overrides are local-first, so any visitor can edit text on their device and
  see it persisted (Firestore writes still require auth).
- **Web bundle baseline after the lazy-chunk change** (`npx expo export -p web`,
  2026-10-26): entry `entry-*.js` 3.14 MB raw / 0.79 MB gzip, plus 15 chunk
  files (5.85 MB raw together) that load on demand; 16 JS files, 2872 HTML
  pages, dist 104 MB. Previously one 8.98 MB / 2.11 MB gzip entry. Re-measure
  after anything that touches fonts, icons or the i18n dictionaries.
- Alphabetical sort buckets by raw first character, so `أ`/`إ`/`ا` are three
  separate headers (169/77/80 hymns at `3f6c26b`). Fold before bucketing.
- `admin.tsx` is the only screen with hardcoded Arabic strings; it also shows a
  default PIN of `1234` (`store/settings.ts`), which is not real security.
- Installed but not imported anywhere in `src/`: `@expo/ui`, `expo-device`,
  `expo-glass-effect`, `expo-image`, `expo-symbols`, `expo-system-ui`,
  `expo-localization`. Verify with `expo-doctor` before removing.
- No test runner at all; CI only runs `expo export` (no typecheck/lint).
- `admin.tsx` edits are local-first (`overrides`) + cloud publish; there is no
  per-field conflict resolution.
- `src/app/(tabs)/*.py` scratch files should be removed.
- The review pipeline (`REVIEW_SHEET.md`) is the intended bulk-edit path;
  don't hand-edit hundreds of hymns via the admin UI.
- Lint: one pre-existing warning in `MeterText.tsx` (unused eslint-disable).

## 12. Definition of done (checklist)

1. `npx tsc --noEmit` silent; `npx expo lint` no errors.
2. i18n keys added for ar + en + de when the UI shows new text.
3. Web-safe feedback (no bare `Alert` for user-visible outcomes).
4. Firestore changes: rules updated **and** deployment step stated to the owner.
5. Live verification: Actions run green + new `entry-*.js` hash on
   https://OsamaSla.github.io/ranemmu-lilrab/.
6. Corpus or content changes: `npm run build:corpus` run, assets +
   `generated-chunks.ts` committed, and the `mediaUrl` delta checked by id
   against `HEAD` (§10.8) so curated links are not silently dropped.
7. Update this file (§13).

---

## 13. General rule for any project

The pattern is: **one auto-loaded pointer + one living notes file**, updated at
the end of every task.

1. **Pointer where the agent looks automatically.** OpenCode/Codex read
   `AGENTS.md`; Claude Code reads `CLAUDE.md`; Cursor reads
   `.cursor/rules/*.mdc`. Keep those files to rules/instructions and add one
   line: *"Read `PROJECT_NOTES.md` before exploring; update it after
   non-trivial changes."* Extra files nobody loads are wasted tokens.
2. **`PROJECT_NOTES.md` is facts, not instructions.** Sections that pay for
   themselves:
   - What the product is, who uses it, live URLs, repo, external projects.
   - Stack + versions + *surprising* config flags (e.g. React Compiler on).
   - Repo map and where the real logic lives (one line per folder).
   - Commands that actually work on this OS, plus known-broken invocations.
   - Data model / cloud schema / rules / deployment pipeline (with the step
     that CI does **not** do).
   - Conventions (i18n, styling, error reporting, platform differences).
   - "Verified gotchas" — each with how it was proven (error code, file line).
   - Known issues / cleanup candidates, so nobody "fixes" them by accident.
   - A definition-of-done checklist.
3. **Keep it cheap:** ~150–250 lines, bullet style, file paths instead of
   pasted code, link to `README.md`/setup docs for long explanations. Delete
   stale lines instead of appending endlessly.
4. **Write only what cost you time to learn.** Anything a single `ls` or
   `package.json` read answers does not belong here; anything that required a
   network probe, an error reproduction or reading 5 files does.
5. **Keep the date + commit at the top.** If "Last verified" is old, trust the
   code over the notes.
6. **Never record secrets.** Project ids, collection names and public web API
   keys are fine; tokens, passwords and admin credentials are not.
7. **When an agent finishes a task:** update the changed section, bump the
   date, and (optionally) note the commit hash that proves it.
8. **Template for a new repo** — copy this file, keep §13, replace the rest:

   ```md
   # PROJECT NOTES — <name>
   Last verified: <date>, commit <sha>
   ## 1. What this is (URLs, repo, external services)
   ## 2. Stack & surprising config
   ## 3. Repo map
   ## 4. Commands that work (+ sandbox quirks)
   ## 5. Data model, cloud, deploy pipeline (+ what is manual)
   ## 6. Conventions
   ## 7. Verified gotchas (with evidence)
   ## 8. Known issues / cleanup candidates
   ## 9. Definition of done
   ## 10. General rule (this section)
   ```
