# PROJECT NOTES — ranemmu-lilrab (هymn library / ترانيم)

Last verified: 2026-11-04, commit 7eff84df (book3 topics)

## 1. What this is

Expo Router app (web + native) for an Arabic Coptic hymn corpus ("ترانيم
للرب"): browse/search hymns, read them with metre-aware layout, favourites,
recents, admin editing/publishing backed by Firebase, plus an admin gate.

- Repo: https://github.com/OsamaSla/ranemmu-lilrab (branch `main`)
- Deploy: GitHub Pages via `npm run deploy` (`expo export -p web` → `gh-pages -d dist`)

## 2. Stack & surprising config

- Expo SDK 57, React 19.2, React Native 0.86.3, react-native-web 0.21, TS 6.0,
  expo-router 57, zustand 5, Firebase 13.
- Dev server port is pinned to **8081** in `package.json` scripts (8082 hits Windows EACCES port exclusions). Preview is on **8083**.
- `app.config.js` sets `baseUrl: '/ranemmu-lilrab'` dynamically for deploy (`DEPLOY=1`, CI, `predeploy`), leaving it empty for local dev to avoid 404s.
- `src/app/` is the router root (Expo Router reads `app/` normally — check
  `app.json`/`expo-router` config before moving files).
- **Repo hygiene gap:** `tsconfig.json`, `eslint.config.js` and `.gitignore` are
  *not* tracked in the tree (they were deleted in commit `33c8011`).
  `tsconfig.json` has since been restored from `33c8011~1` on disk (untracked);
  `eslint.config.js` is still missing. Consequences:
  - `npm run typecheck` (`tsc --noEmit`) now works, because the restored
    `tsconfig.json` exists (`strict` + `@/*` paths). It is untracked, so a
    fresh clone still prints the compiler help instead of type-checking.
  - `npm run lint` (`expo lint`) has no ESLint config.
  - `expo start` regenerates `tsconfig.json`/`.gitignore` if absent and creates
    `.expo/`; the generated tsconfig lacks `strict` and the `@/*` paths.
  - Because `.gitignore` is gone, `node_modules/` shows up as untracked.

## 3. Repo map (where the logic lives)

- `src/app/(tabs)/` — screens: `index` (home), `library` (full list + in-list
  search + ±50 paging), `hymn/[id]` (reader), `favorites`, `recents`,
  `structure` (metre families), `settings`, `more`, `help`, `admin*`.
- `src/data/` — corpus loading (`loader.ts`), lazy hymn chunks (`chunks.ts`,
  `generated-chunks.ts`), full-text search (`search.ts`), normalisation
  (`normalize.ts`), topics, Firebase, publish, live sync.
- `src/store/` — zustand stores (settings, favourites, overrides, remote, session).
- `src/components/` — shared UI (AppText, Card, HymnRow, LyricsMatchRow, filters).
- `src/theme/` — design tokens + bundled font registry.
- `src/i18n/` — ar / en / de dictionaries (`useT()` returns `t` + direction).
- `scripts/` — corpus build/import (xlsx ↔ JSON), fonts, tutorial video pipeline.

## 4. Commands that work here

- `npm run start` / `npm run web` — Expo dev server on :8081 (`--web` opens web).
- `npm run preview:build` — check hymns + build corpus + static web export + serve on :8083.
- `npm run typecheck` (`npx tsc --noEmit`) — works on this machine; exit 0 with
  no output (needs the restored untracked `tsconfig.json`, see §2).
- Syntax/transpile check for a single file:
  `babel.transformSync(src, {presets: [require.resolve('babel-preset-expo')]})`.

## 5. Library list + ±50 paging (verified 2026-10-28)

`src/app/(tabs)/library.tsx` renders one `SectionList` (sections = number order,
alphabet buckets, or search results) with two ±50 buttons above it.

- `SectionList.scrollToLocation` → `VirtualizedList.scrollToIndex`, which
  **throws** `"scrollToIndex should be used in conjunction with getItemLayout or
  onScrollToIndexFailed"` whenever the target cell is beyond
  `highestMeasuredCellIndex` (see
  `node_modules/@react-native/virtualized-lists/Lists/VirtualizedList.js:179-195`).
  A 50-row jump is always outside the rendered window, so this was the native
  failure. react-native-web ships the same invariant.
- The `onScrollToIndexFailed` + estimate-and-retry approach **cannot work**:
  without `getItemLayout` the list clamps its tail spacer to the measured cells
  (`VirtualizedList.js:1010-1021`), so the scrollable content never grows enough
  to reach an unmeasured row — retries land back where they started.
- Fix now in place: a `getItemLayout` on the SectionList using averaged cell
  heights (`ROW_HEIGHT = 90`, `HEADER_HEIGHT = 41`, header + N rows + footer per
  section). With a layout the tail spacer is unconstrained and `scrollToIndex`
  is allowed for any cell.
- `getItemLayout` also fixes the initial render: without it the web list was
  ~800 px tall (only a couple of rows); with it the content is the full model.
- Current row index is tracked from `onViewableItemsChanged`
  (`viewabilityConfig: {itemVisiblePercentThreshold: 0}`): SectionList view
  tokens carry a **per-section** `index` and a `section` object, and
  header/footer tokens have `index == null` and hand the section object to
  `keyExtractor` (hence the defensive `keyExtractor`).
- `jumpBy()` updates `scrollIndexRef` optimistically (so rapid taps stack) and
  ignores viewability reports for 600 ms (`jumpSettledAtRef`) because mid-jump
  reports include every row the list flies past.
- `jumpBy()` dismisses the keyboard first (Android otherwise only closes the
  keyboard when tapping while the search field is focused).
- Layout: the two buttons are 40×22 stacked (4 px gap) inside the search row,
  after the field in `direction.row` order — i.e. on the left in Arabic (RTL)
  and on the right in English/German. They no longer occupy a row of their own
  above the list. They show chevron-up (page up) above chevron-down (page down)
  rather than "−50"/"+50"; the `accessibilityLabel`s still say "Scroll up/down
  by 50".

## 6. Conventions

- All text goes through `AppText` (applies font family/size/theme + RTL writing
  direction). Hymn numbers render in Arabic-Indic digits via `useAppFont={false}`.
- Spacing/radius come from `src/theme/tokens.ts`; never hardcode paddings.
- i18n: add keys to `ar.ts`, `en.ts`, `de.ts` together.
- Comments in the codebase are English prose explaining *why*.

## 7. Verified gotchas

- `npx tsc --noEmit` is clean with the restored `tsconfig.json`. An earlier run
  with an ad-hoc `tsconfig.tmpcheck.json` reported an implicit `any` at
  `src/data/adminAccess.ts:17`; it does not reproduce with the restored config,
  so do not chase it.
- `git log --all` contains an unrelated branch commit `33c8011` that deleted
  most of the repo including `tsconfig.json` — do not use it as a baseline.
- `HymnRow` height varies (1 or 2 title lines), so `getItemLayout` is an
  average and a jump can land a few rows off; that is why the next tap is
  re-anchored from `onViewableItemsChanged` rather than trusting the estimate.

## 8. Known issues / cleanup candidates

- Commit the restored `tsconfig.json` (and recreate `eslint.config.js` /
  `.gitignore`) so `npm run typecheck` / `npm run lint` work on a fresh clone.
- `src/app/(tabs)/` still contains stray helper scripts from earlier work
  (`extract_frames.py`, `library_fixed_final.py`).
- ±50 button accessibility labels are hardcoded English strings.

## 9. Definition of done

- Touched file transpiles (`babel-preset-expo`) and `npx tsc --noEmit` is clean
  (see §2/§4).
- No new `onScroll`-per-frame work in list screens (mobile scroll perf).
- Manual check on both web and a phone-sized viewport for list paging/search.


## 10. Book 3 ("ترانيم للرب الجزء الثالث") Transcription Progress

- Source booklet scans: `assets/book3/split/` (`spread_XXX_left.png`, `spread_XXX_right.png`)
- Target output parts: `content/book3/parts/b3000XX.json`
- Target corpus output: `content/book3/book3.json`
- Builder script: `scripts/book3/build-book3.mjs`
- Last verified: 2026-11-04 (post-book3-build, translation pipeline, deploy)
- Source parts: `content/book3/parts/*.json` (b30001..b30402, 402 hymns)
- Corpus rebuilt (`content/book3/book3.json` + `content/book3.json`): 402 hymns, EN: 401, DE: 400 (verified `node scripts/book3/check_real.mjs`). Translation source: `content/book3/book3-translated.json`.
- Chunk bundle rebuilt (`assets/hymns/full/*.json` + index): 1824 hymns / 19 chunks; `build-corpus.mjs` passes (`ALLOWED_LATIN_FIELDS` includes `translationStatus`).
- Translation pipeline: `scripts/book3/translate-ollama.mjs` (Ollama, `qwen2.5:7b` default; plain-text `TITLE:` + numbered lines format; resumable; writes `translation-run.log`, failures to `translation-debug-<lang>.txt`).
- `HymnRow` book3 color (`#65AAC5`) restored (`src/components/HymnRow.tsx` line 45); rebuilt chunks verified (`check_chunk_new.mjs`).
- Topics: book3 is tagged with the same heuristic as main/taranim. Shared tagger
  `scripts/lib/topic-tagger.mjs` (`normalizeAr`/`scoreHymn`/`tagHymn`, weights 3/1,
  minPrimary 4, minSecondary 3, max 3 secondaries); `scripts/tag-topics.mjs` imports it,
  and `scripts/book3/build-book3.mjs` re-tags every hymn on each build (parts stay clean,
  rebuilds never drop tags). Result: 348/402 book3 hymns tagged (54 score below the
  threshold — same behaviour as the 160 untagged hymns in main/taranim).
  Verified `node scripts/book3/check-topics.mjs` (book3: worship 55, cross 83,
  comfort 70, repentance 11, fellowship 109, warfare 8, word 1, eternity 10, church 1
  primaries) and `node scripts/tag-topics.mjs` → 0 newly tagged, idempotent.
- `main` pushed (`493decf` → `9d2b2343`); deploy rebuilt `dist/` but `gh-pages` push blocked (`ENAMETOOLONG`). Manual workaround: `checkout` temp → `cp -r dist/*` → `force push gh-pages`. Site stays at previous version.
- Translation: background `qwen2.5:7b` finished; 2 hymns still missing (from user's report). Run `node scripts/book3/translate-ollama.mjs` to finish; local app at `localhost:8081` works.
