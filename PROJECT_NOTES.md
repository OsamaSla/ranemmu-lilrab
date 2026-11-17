# PROJECT NOTES — ranemmu-lilrab (hymn library / ترانيم)

Last verified: 2026-11-17, commit eea17b0d, Hebrew Book 3 batch 19 (b30246–b30260), S3 at 260/402

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
- Deploy: GitHub Actions (`.github/workflows/pages.yml`) builds `npx expo export -p web`
  and publishes `dist/` on every push to `main` — the `gh-pages` branch route is
  obsolete; `npm run deploy` only matters for a manual branch upload and hits
  Windows `ENAMETOOLONG`.
- `tsconfig.json`, `eslint.config.js`, `.gitignore` and `expo-env.d.ts` are tracked;
  `npm run typecheck` (`tsc --noEmit`, strict + `@/*` paths) and `npm run lint`
  both pass clean on a fresh clone.
- Corpus loader (`src/data/loader.ts`) memoises merged summaries keyed on store
  object identity (overlays / remote patches / tombstones), so list screens no
  longer re-merge 1.8k records per mount; callers get a copy they can sort.
- Search normalisation (`src/data/normalize.ts`) has a text-only path that skips
  building the highlight origin map, used by title filtering on every keystroke.
- Full-text search now runs on a **build-time index** (`assets/hymns/search-ar.json`,
  Session 11): `scripts/build-corpus.mjs` writes pre-normalised titles + lines for
  every language (4.18 MB on disk), loaded once via a dynamic import from
  `src/data/search.ts`. `scripts/lib/normalize.mjs` mirrors `src/data/normalize.ts`
  for plain Node — keep both in sync or hits silently disappear. Each hymn stores
  an FNV-1a fingerprint of its raw text; an admin edit changes it, so only that
  hymn falls back to on-device normalisation. Origin maps are computed on a
  match, not stored for every line.

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
- `src/i18n/` — ui dictionaries ar / en / de (`useT()` returns `t` + direction);
  hymn content languages are separate (ar + en/de/he fields on the record).
- `content/hebrew/` — hand-authored Hebrew payloads (`taranim/NNNN.json`) +
  `glossary.md`; merged into the corpus by `scripts/hebrew-apply.mjs` (§15).
- `content/hebrew-draft/` — scratch: `1.json` (Aya draft), `1-liturgical.txt`
  (approved hand-authored vocalised Hebrew for `tr0001`).
- `scripts/` — corpus build/import (xlsx ↔ JSON), fonts, tutorial video pipeline.

## 4. Commands that work here

- `npm run start` / `npm run web` — **broken on this checkout**: both `expo`
  (SDK 57) and the legacy `expo-cli` 6.x are installed, and `node_modules/.bin/expo`
  resolves to the legacy one (`ExpoMetroConfig.loadAsync is not a function`).
  Use `node node_modules/expo/bin/cli start --port 8081` instead (verified
  2026-11-14: Metro on :8081, web bundle serves).
- `npm run preview:build` — check hymns + build corpus + static web export + serve on :8083.
- `npm run hebrew:apply` / `hebrew:check` / `hebrew:meter` — merge the
  hand-authored Hebrew payloads from `content/hebrew/<book>/*.json` into the
  corpus (shape + pointing checks, `--check` = drift gate), and the relative
  line-balance report. Details in §15. `hebrew:digest --pack` + `hebrew:pack`
  are the lean authoring loop (see §16). After any corpus rebuild the dev server
  must be restarted with `--clear`: Metro caches the JSON chunks (verified
  2026-11-14, `hasHe` stayed stale until restart).
- `node scripts/refrain-batch.mjs 315:move 318:keep …` — mark stanza 1 of the
  listed hymns as the refrain and renumber the rest; `move` swaps it below the
  old stanza 2 (`1, قرار, 2…`), `keep` leaves it first. EN/DE are reordered and
  relabelled identically; re-running is refused once a hymn has a refrain. Run
  `npm run check:hymns` + `npm run build:corpus` afterwards.
- `npm run duplicates` (`scripts/find-duplicates.mjs`) — lists the hymns the
  corpus prints in more than one book, with each copy's line count and whether
  it carries Hebrew, and says which copies can borrow a translation. See §18.
- `npm run scripture:suggest` / `scripture:curate` / `scripture:apply` /
  `scripture:check` — draft Bible references from the Smith & Van Dyke text
  (cached in gitignored `content/.cache/`), copy the human verdicts into
  `content/scriptures/<book>/`, merge them into the corpus, gate drift. Read
  `content/scriptures/README.md` first; details in §19.
- `npm run typecheck` (`npx tsc --noEmit`) — works on this machine; exit 0 with
  no output (needs the restored untracked `tsconfig.json`, see §2).
- `npm run build:web` — the single web build (2026-11-16, Session 10): typecheck →
  lint → check:hymns → hebrew:check → scripture:check → build:corpus →
  `git diff --exit-code -- assets/hymns src/data/generated-chunks.ts` →
  `npx expo export -p web` → post steps (node `rmSync` for the `dist/(tabs)`
  duplicate tree, pages-fallback, pwa-head, canonical, copy-pwa-assets).
  `preview:build` and `predeploy` now just delegate to it; both deploy workflows
  run it (Pages with `DEPLOY: '1'`, Firebase without) instead of exporting inline.
- Web build: `npx expo export --platform web` produces the real app in `dist/`
  (domain-root base; used by Firebase and Netlify). GitHub Pages uses
  `DEPLOY=1 npx expo export --platform web` (base `/ranemmu-lilrab`). See §12.
  Add `--clear` the first time `.env.local` is created or changed: Metro caches
  the Babel env inlining, so a cached build silently ships an app with
  `isFirebaseConfigured() === false` (no admin, no live sync).
- `npm run build:corpus` also regenerates `assets/hymns/search-ar.json` (it is
  part of the `build:web` drift pathspec). Re-running with no content change is
  byte-identical; the index is deterministic. It is imported lazily only when a
  lyrics search is requested, so it stays out of the entry bundle.
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
  (Session 11: the layout is still required — do not "simplify" to
  `onScrollToIndexFailed` alone; see §8.)
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

## 6. Home screen book grid (verified 2026-11-05, commit 385cf8a1)

`src/app/(tabs)/index.tsx` is a hero bar plus a responsive card grid; routing is
unchanged (`setBook(id)` then `router.push('/library')`).

- Grid: `columns = width >= 880 ? 3 : width >= 360 ? 2 : 1`; card width is
  `min(262, (min(width - 48, 960) - 16 * (columns - 1)) / columns)`; the cover
  keeps `aspectRatio: 0.7` (printed covers are 132 × 190). At 2 columns the odd
  third card is centered by `flexWrap` — intentional, do not "fill" it.
- Card body is exactly two rows (count pill, then the EN/DE pills), so cards
  keep equal heights at every breakpoint. The name uses the `heading` size with
  `fontFamilyBold` passed from `useTheme()`: `AppText`'s `heading` variant has
  weight 400, so `fontWeight: '700'` alone would only synthesise bold.
- Language pills are data-driven: `HymnSummary.hasEn` / `hasDe` are emitted by
  `scripts/build-corpus.mjs`, so `npm run build:corpus` must be rerun after any
  content change that adds/removes translations (`index.json` grew
  268 KB → 314 KB with the flags). `getBooks()` returns
  `{ id, count, hasEn, hasDe }`; `library.tsx` ignores the extra fields.
- Motion: `Animated.spring` scale 1.035 on hover / 0.97 on press plus a web-only
  `HOVER_SHADOW`; `useNativeDriver: Platform.OS !== 'web'`.
- Gotcha: `useRef(new Animated.Value(1)).current` fails `react-hooks/refs`
  ("Cannot access refs during render"). Use
  `useState(() => new Animated.Value(1))`, as in `hymn/[id].tsx`.
- Gotcha: putting `tintColor` in the style of an `RNImage` logs
  `Image: style.tintColor is deprecated. Please use props.tintColor` on web —
  pass it as a prop (the hero watermark).

## 7. Conventions

- All text goes through `AppText` (applies font family/size/theme + RTL writing
  direction). Hymn numbers render in Arabic-Indic digits via `useAppFont={false}`.
- Spacing/radius come from `src/theme/tokens.ts`; never hardcode paddings.
- i18n: add keys to `ar.ts`, `en.ts`, `de.ts` together.
- Refrain stanzas carry `chorus: true` and the printed word as label
  (`القرار`, or the hymn's `chorus` field); stanza numbering skips refrains.
  The admin editor enforces this on toggle/move (`renumberLabels` in
  `src/app/(tabs)/admin-edit.tsx`). The reader (`src/app/(tabs)/hymn/[id].tsx`,
  `refrainHeading`) shows the hymn's chorus word, else the verse label, else
  `القرار` — a bare number in an old saved label is never displayed.
- Comments in the codebase are English prose explaining *why*.
- The reader screen survives next/prev navigation (`router.replace`); only its
  inner ScrollView is keyed by hymn id, so the component instance is reused.
  Any per-hymn UI state must be reset in a `useEffect` keyed on `id` — the
  stanza-rail highlight (`activeVerseIndex` in `hymn/[id].tsx`) used to carry
  the previous hymn's dot until the first scroll event recomputed it.

## 8. Verified gotchas

- `npx tsc --noEmit` is clean locally **because `expo-env.d.ts` exists locally**.
  That file is gitignored (Expo generates it on `start`/`export`), and
  `build:web` runs `typecheck` first — so on a fresh CI clone
  `process.env.EXPO_PUBLIC_*` is `any` and `adminAccess.ts` used to fail with
  `TS7006: Parameter 'value' implicitly has an 'any' type` (line 17). Fixed at
  source: the env read is cast to `string | undefined` with an explicit local
  annotation. Verified with `expo-env.d.ts` temporarily renamed away, which
  reproduces the old error and passes after the fix. Any new
  `process.env.EXPO_PUBLIC_*` read that feeds a callback needs the same cast.
- `git log --all` contains an unrelated branch commit `33c8011` that deleted
  most of the repo including `tsconfig.json` — do not use it as a baseline.
- `HymnRow` height varies (1 or 2 title lines), so `getItemLayout` is an
  average and a jump can land a few rows off; that is why the next tap is
  re-anchored from `onViewableItemsChanged` rather than trusting the estimate.
- Admin editor save validation (`src/app/(tabs)/admin-edit.tsx`,
  `firstBlank`/`sameVerses`): a blank line that is **already blank in the
  stored record** must not block the save — before 2026-11-06 any such hymn was
  impossible to save ("العنوان والسطور لا يمكن أن تكون فارغة"). Only a line the
  editor emptied is rejected, and the message now names the language, stanza and
  line. Reproduced by injecting `verses_en[1].lines[4] = ''` into a tr0258
  override; the old code refused, the new one saves and writes only the fields
  that actually changed. A missing field (`chorus`, `authorOriginal`, absent
  `chorus: false`) is no longer treated as an edit, so untouched saves report
  "لا يوجد تغيير ليُحفظ" instead of writing a no-op patch.
- The editor's shape guard reports `admin.errShape` (reopen the hymn) when a
  translation array no longer mirrors the record; that state can only come from
  a record change under a dirty form, so do not "fix" it by relaxing the check.
  It compares **sorted** stanza line counts, because moving a stanza up/down is
  a supported edit — a per-index comparison blocked the user's refrain-move on
  tr0258 ("تعذّر الحفظ: تغيّرت بنية ترجمة الترنيمة…") on 2026-11-06, and the
  same reasoning makes `firstBlank` match a source blank by stanza width, not by
  index, so a moved stanza keeps its own gap.
- No-op patches came from `changed()` (JSON equality) on text fields: a field
  absent in the record (`undefined`) and a blank input (`''`) serialise
  differently, so every save rewrote `chorus_en=''`/`chorus_de=''` (and
  `chorus`/`authorOriginal`). Text fields now compare through `sameText`. Verified
  in the browser: refrain-move + save writes `verses · verses_en · verses_de`
  only, and saving again says "لا يوجد تغيير ليُحفظ".
- Book 2 refrains (2026-11-06, `scripts/refrain-batch.mjs`): 30 taranim hymns
  (315, 318, 323, 326, 332–334, 337, 338, 342–344, 350, 351, 353, 357–360, 362–364,
  366, 368–374) had their first stanza flagged as the refrain. Mode `move`
  (all except 318, 362, 364) swaps it below the old stanza 2, so the printed
  order is `1, القرار, 2, 3…`; mode `keep` leaves it first. Stanzas are relabelled
  `القرار` + 1…n in ar/en/de, and `index.json`'s `hasChorus` flips for exactly
  these 30 — that is the check to run if the count looks wrong.
- Gotcha: after `npm run build:corpus`, a **running Metro dev server keeps
  serving the old JSON chunk** — the reader still showed the pre-change stanza
  order until the server was restarted (`npm run web -- --clear`). The static
  export always reads the new files, so this is a dev-only trap, but do not
  "fix" a data change that looks absent before restarting Metro.
- Reader refrain heading (`src/app/(tabs)/hymn/[id].tsx`): it is deliberately
  louder than the stanza numbers — `palette.refrain` on light, `palette.refrainReader`
  on dark/fullscreen, plus the matching `*Glow` as a 0/0/12 `textShadow`,
  `fontWeight: '700'`, `letterSpacing: 0.5` and `0.9 × readerSize` (numbers stay
  gold at `0.7 ×` and weight 400). The weight is required: `fontFamily:
  readerFontBold` alone leaves weight 400, which web renders as regular. Verified
  computed styles in the browser: 18px/700 vs 14px/400 at the default 20px reader
  size, both themes and fullscreen.
- Session 10 (2026-11-16, CI/build unification): `npm run lint` → `expo lint` is
  **not** a real expo command in the legacy `expo-cli` 6.x installed here (it prints
  `"lint" is not an expo command` and exits 0), so the `build:web` lint gate is
  currently vacuous. Real debt only shows via `npx eslint .` (16 errors in legacy
  scripts, e.g. `__filename`/`Buffer` `no-undef` in ESM scripts, dynamic env access).
- Session 10 (2026-11-16): `npx expo export -p web` now fails locally with
  `--public-url must be a valid HTTPS URL` (needs `--public-url <https-url>`, else
  `Missing required option: --public-url`), and with an explicit `--public-url` it
  next fails on `Missing package "metro/src/Server" ... react-native is not
  installed` (legacy CLI + local Node v24; CI pins Node 22 and evidently got past
  this). The unified `npm run build:web` therefore cannot run to completion in this
  sandbox — pre-existing, the export command itself was not changed in Session 10.

- Session 11 (2026-11-17, search index): the 4.18 MB `search-ar.json` is a
  dynamic import; `library.tsx` and `ReaderSearchOverlay.tsx` gate lyric search
  on `areAllChunksLoaded() && isSearchIndexReady()` so the first query never
  normalises the corpus itself. Verified in the dev server on :8081: typing
  "نرنم" produced 3 title hits + 16 lyric hits from the prebuilt strings. The
  build-side JSON was cross-checked against all 1,824 chunk records: 0
  fingerprint/title/line mismatches. Plain Node cannot import the TS
  normaliser, hence the mirrored `scripts/lib/normalize.mjs`; edit both files
  together.
- Session 11 (2026-11-17, list layout): do NOT remove `getItemLayout` from the
  library's `SectionList`. Re-reading `VirtualizedList.js:1010-1021` confirmed
  the tail spacer is clamped to measured cells without it, so a 50-row jump
  can never reach an unmeasured row. The fixed `ROW_HEIGHT = 90` was replaced
  by **measured** heights: `HymnRow` reports its card height through `onLayout`
  (`onMeasured`), section headers through another `onLayout`, and
  `getItemLayout` sums those into a cached prefix layout (bootstrap 88/40 only
  until the first measurement). `getItemLayout` must close over the render's
  `sections` array, not a ref synced in an effect: on the first render the ref
  is still empty, so the list computed a ~1.9k px content box instead of the
  full ~92k px model (caught in the browser). ESLint's `react-hooks/refs` rule
  forbids assigning refs during render, which is why the callback closes over
  the value instead. `HymnRow` is now `memo()`-wrapped; keep `onMeasured`
  stable. Browser check: the ±50 press did call `scrollToIndex` (confirmed via
  the getItemLayout call for cell 50), but headless Chromium ignored both
  `scrollTo({behavior:'smooth'})` and `'instant'`, so visual scrolling could
  not be verified there — a browser-environment limitation, not app code.

## 9. Known issues / cleanup candidates

- Two Book 3 hymns still lack a translation (run
  `set TRANSLATE_MODEL=qwen2.5:14b && node scripts/book3/translate-ollama.mjs`).
- 54 Book 3 hymns score below the topic threshold and stay untagged (same
  behaviour as 160 untagged main/taranim hymns) — add keywords to
  `scripts/lib/topic-keywords.mjs` if they need a topic.
- ±50 button accessibility labels are hardcoded English strings.
- React error #418 (hydration mismatch) was investigated on 2026-11-07 and is
  **not reproducible on the current build**: a fresh load of `/`, `/library`
  and `/hymn/tr0001` hydrates with no console error on Firebase and Pages. A
  canary test (inject an extra `<div>` into the exported `#root`, serve it
  locally) *does* raise #418, so the detection path works — the error only
  appeared when a cached app shell met a newer bundle during a deploy. Two
  cache hazards made that possible and are fixed: Firebase served clean-URL
  HTML (`/`, `/library`, `/hymn/*`) with the default `max-age=3600` because
  `**/*.html` never matches those paths, and `public/sw.js` used to be a
  cache-first worker (`ranemmu-static-v3`/`ranemmu-pages-v3`). `firebase.json`
  now sends `no-cache` for `**` then re-enables immutable caching for
  `/_expo/**` and `/assets/**`; `public/sw.js` is an inert worker that deletes
  legacy `ranemmu-*` caches once. Verified headers: `/`/`/library`/`/sw.js`
  `no-cache`, font `.ttf` `max-age=31536000, immutable`.
- **#418 update (2026-11-07, c45bb0c8)**: `/hymn/<id>` pages now log one
  `Error #418 args[]=HTML` on some loads on *both* hosts while still rendering
  the verses correctly (~250 ms). It is not caused by the canonical tags: the
  same error reproduces on the pre-change build (`ccc6d1a1`) served from a
  worktree on localhost. `/`, `/library` and `/admin` were clean in the same
  run; `/more` flaked once on Pages. Treat it as the known intermittent
  hydration warning, not a reader failure — check for missing content before
  chasing it.
- `CNAME` contains `osamsla.github.io/ranemmu-lilrab` (a URL, not a domain). It is
  ignored by Actions publishing but would break branch-based Pages publishing.
- Stale scratch dirs on disk (`scratch_crops/`, `scratch_index/`) are gitignored;
  delete them freely once the Book 3 scans are no longer needed.

## 10. Definition of done

- Touched file transpiles (`babel-preset-expo`) and `npx tsc --noEmit` is clean
  (see §2/§4).
- No new `onScroll`-per-frame work in list screens (mobile scroll perf).
- Manual check on both web and a phone-sized viewport for list paging/search.


## 11. Book 3 ("ترانيم للرب الجزء الثالث") Transcription Progress

- Source booklet scans: `assets/book3/split/` (`spread_XXX_left.png`, `spread_XXX_right.png`)
- Target output parts: `content/book3/parts/b3000XX.json`
- Target corpus output: `content/book3/book3.json`
- Builder script: `scripts/book3/build-book3.mjs`
- Last verified: 2026-11-04 (post-book3-build, translation pipeline, deploy)
- Source parts: `content/book3/parts/*.json` (b30001..b30402, 402 hymns)
- Corpus rebuilt (`content/book3/book3.json` + `content/book3.json`): 402 hymns, EN: 401, DE: 400 (verified with `npm run check:hymns`). Translation source: `content/book3/book3-translated.json`.
- Chunk bundle rebuilt (`assets/hymns/full/*.json` + index): 1824 hymns / 19 chunks; `build-corpus.mjs` passes (`ALLOWED_LATIN_FIELDS` includes `translationStatus`).
- Translation pipeline: `scripts/book3/translate-ollama.mjs` (Ollama, `qwen2.5:7b` default; plain-text `TITLE:` + numbered lines format; resumable; writes `translation-run.log`, failures to `translation-debug-<lang>.txt`).
- `HymnRow` book3 color (`#65AAC5`) restored (`src/components/HymnRow.tsx` line 45); rebuilt chunks verified in the browser (`/hymn/b30001`).
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

## 12. Web hosting — the real Expo app (verified 2026-11-07)

- The web site is the **Expo static export**, not the old hand-generated reader:
  `npx expo export --platform web` (output `dist/`). It contains the app home
  (book grid: رنموا للرب 1047 / ترانيم روحية 375 / هلم نرنم 402),
  `library.html`, and 1,825 `hymn/<id>.html` pages plus `_expo/` JS bundles.
  The hand-generated `scripts/create-web.mjs` / `dist/hymn/<id>/index.html`
  reader is **legacy** and is not what gets deployed any more.
- **Firebase root cause**: `firebase.json` had `"public": "."`, so deploys
  published the repo root. `/library.html` returned 404 while `/dist/library.html`
  returned 200 (proven with curl). Now `"public": "dist"`, `cleanUrls: true`
  (so `/hymn/tr0001` serves `dist/hymn/tr0001.html`, `/library.html` 301s to
  `/library`), no root→library redirect (the app home lives at `/`), and
  `Cache-Control` rules in `firebase.json`: `**` → `no-cache`, then
  `/_expo/**` and `/assets/**` → `public, max-age=31536000, immutable`
  (rule order matters: later rules win). `.firebaserc` defaults to project
  `ranemmu-lilrab`, so `firebase deploy --only hosting` needs no `--project`.
- Live verification: `/` → 200 and renders the book grid; `/library` → 200;
  `/library.html` → 301 → `/library`; `/hymn/tr0001` → 200 and renders the full
  hymn text; `/manifest.json`, `/sw.js`, `/icons/icon-192.png`,
  `/_expo/.../entry-*.js` → 200.
- **Hydration disabled on purpose (2026-11-14)**: the static export ships
  pre-rendered HTML and told the client to hydrate it, but the two trees can
  never agree — the build machine has no viewport (`useWindowDimensions()` → 0,
  so the home grid pre-renders 1 column at 120px), no icon font
  (`@expo/vector-icons` emits an empty text node), and no lazy hymn chunk
  (reader pages pre-render as "جارٍ التحميل"). Every route except `/` threw
  React error #418 in the console. `src/app/+html.tsx` now injects, before
  Expo's own script, a non-writable `globalThis.__EXPO_ROUTER_HYDRATE__` getter
  that always returns `false`, so Expo Router does a plain client render into
  `#root`. The pre-rendered markup is still what crawlers get. Verified with a
  local export served over HTTP: `/`, `/settings`, `/library`, `/hymn/tr0001`,
  `/hymn/tr0375`, `/recents`, `/help`, `/more` all render with **zero console
  errors** (the earlier icon wrapper, viewport gate and colour-scheme gate were
  tried and removed — none of them was sufficient on its own).
- **`public/index.html` renamed to `public/landing.html`**: as `index.html` it
  answered `GET /` on the dev server and hid the app behind the APK-download
  page, while in the export the route's own HTML always won, so the landing was
  unreachable in production. Now dev and production agree (app at `/`, landing
  at `/landing.html`).
- `dist/` is **not tracked** (untracked 2026-11-16, `adae2beb`; CI builds it on
  every push). Never commit a local `expo export`: without `DEPLOY=1` the bundle
  uses `publicPath "/"` instead of `/ranemmu-lilrab/` and would break the Pages
  deploy.
- **Reader web crash fixed 2026-11-07**: `src/app/(tabs)/hymn/[id].tsx` called
  `scrollRef.current.addListener(...)` (native-only). On web this threw
  `TypeError: e.addListener is not a function` and unmounted the reader to a
  blank page, which is why hymns only "loaded" forever. Replaced with
  `onScroll={onReaderScroll}` + `scrollEventThrottle={16}` on both reader
  ScrollViews (normal + fullscreen). `npm run typecheck` is clean again — the
  three old errors at lines 273/294/295 are gone. Verified in the browser:
  `https://ranemmu-lilrab.web.app/hymn/tr0001` shows the verses.
- `app.config.js` sets `experiments.baseUrl = '/ranemmu-lilrab'` **only when
  `DEPLOY=1`**. It deliberately no longer infers deploy from `CI` /
  `GITHUB_ACTIONS`: Netlify runs in CI too but is served from the domain root.
- `src/app/+html.tsx` registers the service worker with scope `${base}/`
  (`/ranemmu-lilrab/` on Pages). The old `${base}` produced a `SecurityError`
  ("scope is not under the max scope allowed") on every Pages page. Fixed and
  deployed at `2898ec9e`; live check: `getRegistrations()` on Pages returns
  scope `https://osamasla.github.io/ranemmu-lilrab/` and the console has no
  `SecurityError`; served `index.html` registers
  `'/ranemmu-lilrab/sw.js'` with `scope:'/ranemmu-lilrab/'`.
- GitHub Pages live verification (`2898ec9e`): `/` renders the book grid,
  `/library` renders 1,047 cards for the first book at `/library`, clicking a
  book on the home grid client-navigates to `/library`, and
  `/hymn/tr0001` renders the full hymn text. All checks done in the in-app
  browser, not just curl.
- **Firebase build needs the cloud config (fixed 2026-11-07)**: the app reads
  `EXPO_PUBLIC_FIREBASE_*` at build time (`src/data/firebase.ts`). The Pages
  workflow injects them from GitHub secrets, but the repo has no committed
  `.env`, so a plain local export produced an offline-only bundle — Firebase
  `/admin` said "الحفظ السحابي غير مهيأ بعد" while Pages showed the real
  "تسجيل الدخول". Fix: `.env.local` (gitignored via `.env*.local`) now holds
  the same public web config, copied out of the live Pages bundle with
  `node <temp>/write-env-local.cjs`. Rebuild with `--clear` (Metro caches the
  inlined env; without it the new keys never reach the bundle — proven by
  grepping the entry for `apiKey:"…"`). After the fix the deployed Firebase
  `/admin` shows the sign-in screen and both hosts run identically. Any future
  build from a fresh clone needs that `.env.local` or the Pages-style env vars.
- **Automatic Firebase deploy (2026-11-07)**: `.github/workflows/firebase.yml`
  now runs on every push to `main` and deploys for real —
  `FIREBASE_SERVICE_ACCOUNT_RANEMMU_LILRAB` was added to the repo secrets, and
  run `5dd6c55` at 16:40 finished with **Deploy to Firebase Hosting: success**
  (the 16:29 attempt failed, see below). The live entry hash changed
  (`entry-07b28b…` local → `entry-dcf444…` CI), which proves the CI-built
  bundle is the one being served. Manual `firebase deploy` is now only a
  fallback.
- **Service-account gotcha**: with the admin SDK key, firebase-tools first calls
  `GET serviceusage.googleapis.com/v1/projects/<id>/services/firebasehosting.googleapis.com`.
  Hosting-only roles pass the IAM check but fail there with
  `403 … permission: serviceusage.services.get`. Fix: grant the service account
  **Service Usage Viewer** (`roles/serviceusage.serviceUsageViewer`) in Cloud
  IAM — read-only, enough for the check. Evidence: run at 16:29 failed with that
  exact 403, the 16:40 retry after the grant succeeded.
- GitHub Pages: `.github/workflows/pages.yml` builds the app with `DEPLOY=1`
  (prefixed `/ranemmu-lilrab/`), removes the duplicate `dist/(tabs)` tree, adds
  canonical URLs, and writes `dist/404.html = dist/index.html` so deep links
  (`/hymn/tr0001`) boot the router client-side. Netlify builds the root variant
  (`netlify.toml`).
- **Canonical origin = Firebase (2026-11-07)**: `https://ranemmu-lilrab.web.app`
  is the original; GitHub Pages is a mirror. `scripts/canonical.mjs` writes one
  `<link rel="canonical" href="https://ranemmu-lilrab.web.app<route>">` per
  exported page, deriving the route from the file path (`index.html` → `/`,
  `more.html` → `/more`, `hymn/tr0001.html` → `/hymn/tr0001`). It only touches
  pages that load `/_expo/static/js/` (so static docs from `public/` and the
  Pages `404.html` shell are skipped) and is idempotent. Wired into
  `pages.yml`, `firebase.yml` and `npm run predeploy`; **a manual Firebase
  deploy must run it after `expo export`** or that build ships without tags.
  `+html.tsx` additionally emits a static root canonical plus a 200-byte inline
  script that rewrites the href to `origin + location.pathname` (stripping
  `EXPO_BASE_URL`), which is the only way the Pages SPA fallback can point a
  deep link at its own URL. `more.tsx` now shares the Firebase URL
  (`APP_SITE_URL`) and shows `more.officialSite` in the footer so a visitor on
  the mirror can find the original. Sessions/localStorage are still per-origin:
  signing in on one host does not sign you in on the other (Firestore data is
  shared).
- Gotcha: GitHub Pages was not enabled at first (`GET /repos/.../pages` → 404)
  even though both old workflows reported success; it is now enabled and
  deploying from Actions. Only `pages.yml` exists (`deploy.yml` removed).
- Gotcha (fixed 2026-11-16): `dist/` used to be committed — 3,729 regenerated
  files per deploy, and most of the repository's history. Both workflows build
  it from source, so it is now in `.gitignore` and out of the index.
- **Installed web app (PWA) auto-refresh (2026-11-08)**: the home-screen web
  app used to keep the bundle it booted with while the window stayed alive.
  `src/hooks/useAppUpdateCheck.ts` (called from `src/app/_layout.tsx`) fetches
  the deployed `index.html` with `cache: 'no-store'`, reads the entry bundle it
  names, and reloads when that differs from the running `entry-*.js` — on
  mount, on `visibilitychange` → visible, and on a persisted `pageshow`. Compare
  only the **hashed file name**: the same file is `/_expo/...` on Firebase and
  `/ranemmu-lilrab/_expo/...` on Pages, and resolving the matched path against
  the origin dropped the base and made Pages reload every 60 s (caught on the
  first live test). The app root (origin + base) is derived by slicing the
  running script `src` at `/_expo/`. It never reloads on
  `/admin-edit`/`/admin-add` or while an input/textarea is focused (unsaved
  edits), and a 60 s sessionStorage guard (`app.update.reloadedAt`) prevents
  loops if a host briefly serves two bundles. Native no-ops. This only works
  because pages are served `no-cache` and `public/sw.js` is inert — if either
  changes, switch the check to a generated `version.json` instead of parsing
  `index.html`.
- `public/manifest.json`: `start_url` changed from `library.html` to `./` so a
  freshly installed icon opens the app home. `id` is pinned to `library.html`
  **on purpose**: that path was Chrome's implicit id (it defaulted to the old
  `start_url`), so keeping it lets the already-installed icon be recognised as
  the same app. Do not "clean up" that value; changing it orphans the existing
  install. Phones that still open the library can remove/re-add the icon once.

## 13. Reader search, all-books scope, SoundCloud cleanup (verified, commit 9c961324)

Verified locally with `npm run typecheck`, `npm run check:hymns` (1824 hymns,
all checks passed), `build:corpus`, a web export served on :8083, and
`node node_modules/eslint/bin/eslint.js` on the touched files. Shipped in
`9c961324`; library topic label changed to "كل المواضيع".

- SoundCloud melody links: `content/taranim.json` was the only source with them
  (204 `mediaUrl` values); they were deleted and `npm run build:corpus` rewrote
  `assets/hymns/full/014–018.json` + `index.json` (0 occurrences left under
  `content/`/`assets/`). 140 **YouTube** `mediaUrl` values in taranim remain.
  `src/data/media.ts` also rejects a SoundCloud URL in `curatedMediaUrl`, so a
  cloud/admin override saved before the cleanup cannot resurrect one; those
  hymns fall back to the YouTube search. `isValidMediaUrl` still accepts any
  http(s) URL (admin-side validation is unchanged).
- Reader (`src/app/(tabs)/hymn/[id].tsx`): the fullscreen body title + metre
  block and the normal-header metre line are removed. The cog/settings toolbar
  icon was removed in `9c961324` (the red X in the user's screenshot) but the
  user asked for it back on 2026-11-09: a `cog-outline` button now sits between
  the magnifier and share, and `ReaderSettingsModal` is mounted in both the
  normal and fullscreen returns. The sheet carries the A−/A+ reader size,
  font-family chips, theme, the melody links and (for admins) Edit hymn.
  Reader size/font/theme also remain in the Settings tab.
- Reader toolbar magnifier now opens `src/components/ReaderSearchOverlay.tsx`
  instead of navigating to `/library`: a floating modal panel with a wide
  number/text field, a narrow book picker (defaults to the current hymn's book,
  includes "all books"), and an inline result list. The panel is capped at
  520 px on desktop and keeps a 24 px gutter on phones, is centered, and has
  no border, outline or shadow at all — only a plain surface fill (input
  `outlineStyle: 'solid'` + `outlineWidth: 0` + `underlineColorAndroid`,
  flat picker) so no frame line appears in either theme or on Android.
  Chromium still paints its platform ring when `outline-style` is `auto` even
  with width 0, which is why `solid` is required. The field/picker pills and the
  results card also carry their own surfaces. Reader toolbar `IconButton`s use
  the same `solid`/0 outline so the tapped magnifier cannot leave a ring behind
  the sheet. Number/title
  matches are instant; lyrics come from
  `ensureAllChunks()` + `searchHymns()` like the library. Picking a result
  closes the panel and `router.push`es the hymn; the component is mounted only
  while open, so each opening starts clean.
- The ring suppression is shared as `noFocusRing` in `src/theme/tokens.ts`
  (`outlineStyle: 'solid'`, `outlineWidth: 0`, `outlineColor: 'transparent'`).
  It is applied to the main library search input (plus its clear and ±50
  buttons) and to every `FilterSelect` pressable, because focusing any of them
  otherwise drew the same white frame line. Use the token for new web-visible
  fields.
- Library (`src/app/(tabs)/library.tsx`) order is now book/sort row → topic
  filter → search bar; the field is 56 px tall with 18 px text and the ±50
  buttons grew to 44×26. The book picker gained "كل الكتب" (all books); it is a
  **local** scope (`bookScope`) so the global `setBook` / home grid is
  untouched, and it resets whenever the global book changes. With all books the
  list sorts by book rank then printed number (duplicate numbers across books
  would otherwise interleave) and each row's subtitle shows its book name.
- i18n: `book.all` added to ar/en/de together.
- Browser checks on :8083: reader overlay filtered a number ("249" → 1 result)
  and cross-book title/lyrics text ("نرنم"/"بانت" with all books → 5/18+
  results); picking a result landed on `/hymn/tr0074`; library all-books showed
  1824 in the app bar, and "249" returned one row per book with book labels.
  The known React #418 still appears once on `/hymn/*` and does not break
  rendering.

## 14. Melody playback idea — POC outcome (2026-11-09, no code committed)

Goal the user set: every hymn should be able to play a simple synthesised
melody so people can hear how it is sung. Only source available: recordings
(YouTube). Accuracy bar is low — "a rough idea of the tune and its rhythm".

- Nothing in the app was changed; all work lives in
  `%TEMP%\opencode\melody-refs` (scripts) and `%USERPROFILE%\Desktop\melody-test`
  (the four MP3s given to the user). Re-running requires the same temp scripts,
  which are disposable.
- Test hymn: `tr0001` "لنا في كلام الإله الصمد", clip 0:00–0:19 of
  `%USERPROFILE%\Desktop\ترنيمة لنا في كلام الإله الصمد.mp3`
  (mp3, 48 kHz stereo, 110 kbps, 5:33 total).
- Finding: that recording is **polyphonic** — Demucs (htdemucs) separation
  yields a vocals stem that still carries chord stacks (C3/F3/A3/C4/F4 at t≈6 s),
  so it is a part-sung choir, not a solo line. Monophonic trackers therefore
  jump between voices: hand-rolled YIN, harmonic-salience tracking and pYIN all
  produced octave jumps (e.g. F4→F3) and chord-tone walks. pYIN on the separated
  vocals was the most stable but still unreliable.
- Tempo/rhythm detection is reliable: spectral-flux autocorrelation gives a
  ~0.28 s beat unit (~105 BPM), and the 1–3 kHz envelope shows a 3.4 Hz
  syllable rate — i.e. there is definitely singing.
- Toolchain that works on this machine: Python 3.11 + ffmpeg 9; for separation,
  an isolated venv at `%TEMP%\opencode\demucs-env` with `demucs` (torch 2.15
  CPU), `librosa` 0.11, `soundfile`, `numpy`. CPU separation of 35 s takes ~16 s.
  The system Python has only numpy + onnxruntime, so nothing heavy was added
  globally.
- Conclusion: the synth side is cheap and fine; the bottleneck is **source
  material**. A solo/unison (single cantor) recording transcribes well; a
  choir-with-accompaniment mix does not, without a real melody model.
  Next step if resumed: ask for a solo-cantor video or an a-cappella verse, then
  reuse `multipitch.py`/`pyin_melody.py` from the temp folder.

## 15. Hebrew translation (verified 2026-11-14)

Only `tr0001`–`tr0375` carry **authored** Hebrew so far (375 hymns, 7386 verse
lines, all pointed; `verify-hebrew.mjs` prints 7761 because it counts each
`title_he` as one extra line), plus Book 3 hymns 1–200 (§16). **Book 2 (taranim)
is now complete.** On top of
that, `build:corpus` now lends Book 1/3 copies the Hebrew their Book 2 twin
already has (14 hymns in the built corpus; see §18).
Register is elevated biblical/liturgical Hebrew, **fully vocalised with niqqud**,
and the app displays the vocalised text (user's explicit choice — do not strip
niqqud at render time). Chosen cadence: Book 2 in printed order, 20 per batch,
flags-only review. Batches land as `content/hebrew/taranim/NNNN.json`; the
corpus is never hand-edited. **Book 2 is complete; Books 1 and 3 have their
authoring base ready — see §16** for folders, tooling and the first batch.
Batch size is free (the
apply script merges whatever payloads exist), so continue in 10–20 hymn steps
and keep committing per step.

- Fields: `title_he` / `verses_he` / `chorus_he` on the hymn record,
  `hasHe` on `HymnSummary` (emitted by `scripts/build-corpus.mjs`). Any content
  change needs `npm run build:corpus`; `validate.mjs` checks that `verses_he`
  mirrors the Arabic stanza/line grid one-to-one.
- Reader disclaimer (2026-11-16): the Hebrew view prints
  «התרגום העברי הזה נעשה על ידי בינה מלאכותית ואינו אמין ב־100% — הוא נותן רק את
  הרעיון המרכזי של המזמור» above stanza 1, next to the scripture line.
  `TRANSLATION_NOTES` in `src/app/(tabs)/hymn/[id].tsx` holds one note per viewed
  language; the Hebrew one is **always** shown, while EN/DE are gated on
  `translationStatus === 'AI_DRAFT'` and come with a badge. Why: that status is
  one flag per record (set by the EN/DE review), so a "Verified" badge over the
  Hebrew would claim a review the Hebrew never had — the note is the honest
  thing to print. The note mixes Hebrew with "AI" and "100%", so it needs
  `writingDirection: 'rtl'`; with the default LTR base the digits and the dash
  land on the wrong side (checked via Range rects: first char x 260 > last 40).
- Authoring lives in `content/hebrew/taranim/NNNN.json`
  (`{book, number, title_he, verses_he, chorus_he?, review[]}`), **not** in the
  corpus. `scripts/hebrew-apply.mjs` validates (book, stanza count, labels,
  line counts, every line Hebrew + pointed + free of Latin/Arabic) and merges;
  a mismatch aborts the whole run, so a batch cannot half-land. It re-serialises
  as the corpus is authored (indent 1, LF, no trailing newline) and inserts the
  `*_he` keys after the `*_de` block, keeping diffs small. `--check` is the
  drift gate for CI/pre-commit.
- `scripts/hebrew-meter.mjs` is a *relative* singability check, not metre
  proof: syllables ≈ vowel points (shva excluded) + shuruq, median per line
  position across stanzas, flag > ±2. Hymns 1–375 pass except the deliberate
  cases listed below. A flag is a prompt to re-read, not an automatic error
  (`--strict` to gate). Note the meter numbers stanzas by **array index**, not by
  the corpus label, so in hymns that print a chorus stanza the reported `2:x` /
  `3:x` refers to the block *after* it — check the label before editing.
- `content/hebrew/glossary.md` holds the fixed renderings (`יֵשׁוּעַ` never
  `בישו`, `שָׁלוֹם לְךָ`, `אֶצְרֹף … כַּזָּהָב`, `גְּדוּדֵי שְׁאוֹל`,
  `מִגְדַּל־עֹז`, `שֶׁמֶן תּוּרַק`, `כֹּהֵן גָּדוֹל`, `מַפְגִּיעַ`,
  `פָּדָה`/`פּוֹדֶה`/`גֹּאֵל`), pointing conventions and the batch workflow.
  Add new settled words there in the same commit as the hymn.
- Reader (`src/app/(tabs)/hymn/[id].tsx`): fourth chip `HE`, indigo
  `#5E35B1`/`#EDE7F6` (`CHIP_COLORS`), Hebrew under each Arabic line,
  RTL/right-aligned, **now typeset in the bundled Hebrew face**
  (`NotoSansHebrew`, `HEBREW_FONT_FAMILY` in `src/theme/fonts.ts` — a subsetted
  OFL Noto Sans Hebrew with full GPOS niqqud/cantillation, instanced to static
  400/700 from the variable source, bundled at `assets/fonts/NotoSansHebrew-*.ttf`,
  ~14 KB each) and `lineHeight` 1.9× so points are not clipped. The AI badge/disclaimer block
  is gated to `en`/`de`: the Hebrew is human-authored, not an Aya draft.
- Hebrew field wiring (2026-11-16, Session 9): the quick-fix sheet's Hebrew input
  (`src/components/LineFixSheet.tsx`) and the admin editor's Hebrew fields
  (`src/app/(tabs)/admin-edit.tsx`) now set `fontFamily: HEBREW_FONT_FAMILY` on the
  Hebrew text instead of relying on the platform font; the Hebrew branch keeps the
  taller leading (`Math.round((translationSize + 2) * 1.7)`). The boot loader
  (`useAppFonts` in `src/theme/fonts.ts`) also loads the Hebrew face alongside the
  active Arabic family, so a Hebrew line never flashes the fallback before the font
  lands.
- Search: `verses_he` and `title_he` join the index; `src/data/normalize.ts`
  now drops Hebrew niqqud/cantillation (`\u0591-\u05BD`, `\u05BF`,
  `\u05C1-\u05C2`, `\u05C4-\u05C5`, `\u05C7`) and folds maqaf to a space, so a
  plain "יש לנו" matches "יֶשׁ־לָנוּ" (checked against the three stanza-1 lines).
- Aya (Ollama `aya-expanse:8b`, `scripts/poc-hebrew2.mjs`) is **dropped from the
  loop**: correcting its drafts cost as much as translating from the Arabic, and
  the Arabic is the authority. Kept as a second opinion for a stubborn line.
- Batch 2–375 review flags (1678, all in the payload `review[]`): deliberate
  borrowings from Song 1:3,8 / 2:3 / 5:5-6,10-16 / 8:7, Prov 1:9 / 8:24-30 / 11:30 / 18:10,
  Isa 9:18 / 13:13 / 17:7 / 26:20 / 30:15 / 38:12 / 40:7-31 / 42:7 / 43:25 / 49:15 / 51:17 / 52:7,14 / 53 (fully, hymns 130, 240) /
  55:1-2 / 57:15 / 64:3,5 / 65:17, Zeph 2:3, Jer 9:17 / 23:6 / 32:27, Joel 2:2,
  Ps 1:1 / 4:8 / 15:1 / 16:5,8 / 18:2-3 / 19:3,8,9,11 / 20:6 / 22:2,15,21 / 23:1-6 / 25:3 / 27:1,5,8 / 30:5-6 / 31:6 /
  32:1-2 / 33:1 / 34:8-11,20 / 36:9-10 / 39:13 / 41:4 / 42:2,8-9 / 46 / 49:7-8 / 50:14 / 51:3-13 /
  55:23 / 62:2-9 / 65:3 / 67:2 / 68:19 / 69:22 / 73:21,25 / 77:12 / 78:19,35 / 84:3,7-11 / 88:2,15-16 / 89:27,52 / 90:2 / 91 (fully, hymn 229) /
  93:2 / 95:6 / 97:9 / 101:4 / 103 (hymn 251) / 107:7,23-29 / 110:1 / 111:9 / 114:8 / 116:12 / 118:22-23 /
  119:1,9-16,24,35,37,96,103-105 / 121:1 / 130:5,6 / 133:1 / 139 / 141:2 / 145:7,13 /
  146:7 / 147:3 / 148:2,
  Ps 8:2,4 / 16:2 / 17:15 / 18:20 / 23:5 / 24:1-3 / 25:1 / 37:4 / 42:2,8 / 46:2 /
  47:6,7 / 48:3 / 51:7,12 / 73:23-24 /
  78:15-16,19 / 81:3 / 85:9 / 92:6 / 95:1-7 / 96:1 / 100:2-3 / 102:8 / 103:2,3 /
  104:2,10,12 / 107:6,13-14 / 115:1 / 118:7 / 119:12,25 / 126:1 / 119:105,
  Lam 1:12,16 / 2:11 / 3:22 / 4:22,
  Isa 1:18 / 6:2-3 / 7:14 / 10:22-23 / 40:28,31 / 49:25 / 53:3,5,7,10-12 / 59:17 / 60:2,3 / 62:11, Hab 1:12,3:9,
  Exod 13:21 / 16:4,15 / 21:30 / 34:7, Lev 4:6 / 15 / 26:34, Num 6:26 / 10:12 / 23:19 / 24:17,
  Deut 8:3 / 31:6, Mal 3:10,20, Zech 2:9 / 13:7 / 14:3, Dan 2:18-27 / 3 / 6 / 7:10,13,14, Job 1:7 / 3:9 / 5:9 / 27:6 / 35:10 / 42:2, Prov 15:30 / 12:4,
  Matt 5:16 / 7:24-27 / 9:2,12 / 10:24-25,42 / 11:29 / 16:18 / 17:8 / 18:20 / 23:8 / 27:29,37-51 / 28:18-20, Mark 4:39 / 16:19,
  Luke 2:7,12,14 / 11:9-10 / 12:35-37 / 18:7 / 22:44 /
  22:19-44 / 23:46, John 1:12,14-18,29 / 3:16 / 5:24 / 6:35-37 / 7:37-38 / 8:12,36 / 10:28 /
  12:32 / 13:1,23 / 14:2-27 / 15:20 / 17:5 / 19:28-34 / 20:19 / 21:25, Acts 1:9-11 / 4:12 / 17:28 /
  20:28, Rom 3:19-26 / 5:1-14 / 6:4,9 / 8:1-39 / 10:9,11 / 11:33 / 13:10-12 / 14:8,17,
  1 Cor 2:9 / 4:7 / 5:7 / 6:19-20 / 9:24 / 10:13 / 11:26 / 12:13 / 13:4-7 / 15:3,25-55 / 16:22,
  2 Cor 1:20 / 3:18 / 4:6,8-9 / 5:1,5-21 / 8:9 / 9:6-7 / 12:9-10, Gal 2:20 / 4:4 / 6:10,14, Eph 1:3-23 / 2:1-18 / 3:8-20 /
  4:8-32 / 5:16 / 6:10-17, Phil 1:21-23 / 2:6-10 / 3:7-14 / 4:4-7, Col 1:15-20 / 2:9,15 / 3:1-16,
  1 Thess 1:10 / 4:16-17 / 5:4-5, 1 Tim 2:5-8 / 3:16 / 6:8,15, 2 Tim 1:9-10 / 3:16,
  Heb 1:3 / 2:9 / 4:9-16 / 6:19 / 7:22-26 / 8:6 / 10:12-23 / 11:13,26 / 12:1-2,22 / 13:5-6,12-20,
  1 Pet 1:5,18-24 / 2:9-25 / 4:14 / 5:7-10, 2 Pet 3:18, 1 John 1:7 / 2:15-17 / 3:2-3 / 4:8-19 / 5:14-15,
  Rev 1:5-7,16 / 3:20-21 / 4:11 / 5:5-13 / 7:9,10,14,17 / 8:3-4 / 11:12,15 / 19:7-16 / 21:3-4 /
  22:7-20,
  Ps 3:4 / 19:2 / 28:7 / 36:10 / 44:16 / 116:7 / 119:17-20,81,116 / 121:4 /
  126:1-3 / 130:6 / 137:1-4 / 139:13, Isa 21:11-12 / 25:8 / 35:4 / 40:11,22 / 55:8-9 / 63:1,
  Exod 3:14 / 33:18-19, Lev 25:23, 2 Sam 22:29, Prov 8:23,25-31, Song 5:2,
  Matt 13:45-46 / 16:16 / 24:44 / 25:34, Mark 14:36, John 4:6-7,14 / 6:35 / 11:35 / 12:3,
  1 Cor 15:51-52, Eph 2:7, Phil 2:7 / 3:21, Col 1:13,16 / 2:14, Titus 2:13,
  Heb 9:15-22 / 10:23, Jas 1:17, 2 Pet 1:19 / 3:9,12, 1 John 2:1,
  Rev 1:7 / 3:21 / 4:4 / 5:9-10 / 7:17 / 11:15 / 19:7-11 / 22:16,17,20;
  post-biblical but fixed terms (`צְלָב`, `בְּנִיּוּת`, `מוֹלַדְתִּי`,
  `חֻלְשָׁה`, `שַׁיָּכוּת`, `הִתְגַּלְּמָה`/`הִתְגַּלְּמוּת`, `מָצָב`, `זִקָּה`,
  `עֲמִידָה`, `חֻפָּה`, `מַטָּרָה`, `קִנְיָן`, `סֹהַר`, `מְצוּלָה`,
  `נֹפֶת צוּפִים`, `יְקָבִים`, `אֳפָיִים`, `סַכָּנָה`, `גְּוִיָּה`,
  `גָּלְגָּלְתָּא`, `מִשְׁאָלָה`, `בַּלָּהָה`, `כִּפָּה`, `אֶפְשָׁר`,
  `רֶגֶשׁ`, `מַעְיָן`, `נַחֲלָה`, `הֵד`, `מוֹלֶדֶת`, `עֹגֶן`, `נַחַת`,
  `קְטֹרֶת`, `בִּטּוּי`, `רֶוַח`/`הֶפְסֵד`, `שַׂר־שָׁלוֹם`, `נָמוֹס`,
  `שַׁעֲשֻׁעַי`, `מִדּוֹת`, `תְּבוּסָה`, `עוֹלֵל`, `כֹּפֶר`, `תַּאֲוָה`,
  `סִפּוּר`, `חֲטִיפָה`, `כְּמִיהָה`, `רֹשֶׁם`, `מָדוֹר`, `נִצָּחוֹן`,
  `פִּדְיוֹן`, `שֵׂה הָאֱלֹהִים`, `עֲטֶרֶת`, `עָטָה`, `שָׁקַד`, `אֹפֶן`,
  `חֶבְרָה`, `הֲוָיָה`, `כִּסּוּפִים`, `מִצְפֶּה`, `פְּנִינָה`, `נֵרְדְּ`,
  `נֶסֶךְ`, `חָגַג`, `מֶתֶג`, `פִּקָּדוֹן`, `מִפְרָץ`, `כִּבְשַׁן`,
  `אֶהְיֶה`); one dropped `رَبُّنَا`
  for metre (`tr0003` 3:2). Read
  the flag list, not the whole batch.
- `tr0003` 4:4 was **replaced by the user** with
  `כִּי אַהֲבָתוֹ רָבָה מִכָּל־תְּאוּרָה` — it runs 11 syllables against the
  hymn's 6-syllable line-4 median, so `hebrew-meter.mjs` flags it deliberately;
  do not "fix" it back.
- Printed shapes the meter script calls `irregular` by construction: `tr0014`
  2/4/4, `tr0031` 3/4/4/4/4 (a 3-line refrain stanza first), `tr0037` 4/8/8,
  `tr0064` 2/4/4/4 (Psalm 119:105 as a two-line opening), `tr0086` 2/4/4/4 (a
  two-line acclamation before three 4-line stanzas), `tr0125` 3/4/4/4 (a
  three-line acclamation before three 4-line stanzas), `tr0126` 2/4/4/4 (a
  two-line refrain stanza first), `tr0135` 2/4/4/4/4 (a two-line consecration
  first), `tr0156` 3/4/4 (a bracketed question stanza first), `tr0157` 4/4/4/4
  where stanza 1 is the short acclamation (printed metre `15.11.15.11 – 8.8.8.11`),
  `tr0158` 2/3/3/3/3 (two acclamation lines first), `tr0168` 6/4/4/4 (a six-line
  first stanza where lines 3 and 6 are the repeated refrain), `tr0176` 2/2/2/2/2
  (five two-line epigrams), `tr0177` 4/4/4/4 with the short acclamation first
  (same printed metre as `tr0157`), `tr0178` 5/5/5 where stanza 1 is the summons
  (printed metre `11.11.11.11.11 – 12.12.12.12.11`), `tr0180` 2/4/4/4 (the
  refrain doubled as the whole first stanza), `tr0183` 5/4/4/4 (the fifth line
  being the "sweet, sweet, sweet" climax), `tr0190` 4/8/8 (the two long stanzas
  are the love-measured and the sea-of-ink stanzas), `tr0196` 3/4/4/4/4/4/4
  (refrain line `מַטָּרָתִי הַמָּשִׁיחַ` closing every stanza; stanza 1 prints it
  twice in its first line, hence the +7 flag), `tr0197` 4/4/4/4 with the short
  consecration stanza first (same printed metre as `tr0157`/`0177`), `tr0202`
  1/1/1/1/1 (every stanza one slash-joined line), `tr0211` 2/4/4/4/4 (a
  two-line acclamation first), `tr0212` 2/4/4/4/4 (the refrain alone as the
  first stanza), `tr0216` 2/4/4/4/4 (two-line confession then four-line
  stanzas ending in "increase my faith"), `tr0218`/`tr0219` 2/4/4/4 (refrain
  stanza first), `tr0220` 3/4/4/4, `tr0222` 7/4/4/4 (the seven-line crowned
  refrain stanza), `tr0225` 6/4/4/4 (the six-line summons), `tr0228`/`tr0232`
  2/4/4/4 (two-line refrain stanza first), `tr0244` 4/8/8 (stanza 1 is four long
  lines, the rest eight short ones), `tr0247` 2/4/4/4 (two-line doubled refrain
  first), `tr0248` 2/8/8/8 (two-line refrain then three eight-line stanzas),
  `tr0249` 2/5/5/5 (two-line call, then three five-line stanzas), `tr0250`
  2/4/4/4/4/4, `tr0251` 3/4/4/4 (three-line acclamation first), `tr0252` 5/4/4/4
  (stanza 1's last two lines are the short ones), `tr0258` 2/8/8 (two long
  lines of praise, then two eight-line stanzas), `tr0259` 5/4/4/4/4 (the
  five-line "I shall see Him" stanza first), `tr0275` 3/4/4/4 (the three-line
  "this is His word" stanza first; its 1:2 is the first long line, which is why
  the meter calls it a +3 against stanza 2's short second line), `tr0276` 2/4/4
  (a two-line acclamation, then two four-line stanzas), `tr0281` 3/4/4/4/4/4
  (three-line acclamation with the triple `שָׁלוֹם`), `tr0282` 3/4/4/4/4/4 (the
  three-line "sweetest hymn" stanza first), `tr0283` 5/5/5/5/5 (stanza 5 prints
  the whole chorus slash-joined on its first line — the payload keeps that one
  string and the four broken-out lines after it, so the meter counts the chorus
  line as +47), `tr0285` 3/4/4/4/4 (three-line refrain first, and its lines are
  the print's shorter 8.8 refrain against the 12.8.12.8 stanzas), `tr0286`
  1/4/4/4/4 (the theme line alone as stanza 1), `tr0291` 2/8/8 (a long two-line
  couplet first, then eight short lines per stanza), `tr0295` 3/4/4/4/4 (the
  print's `12.7.7` theme stanza first, so 1:1 is a long line against short
  stanza openings), `tr0297` 3/2/2/2/2/2/2, `tr0299` 3/6/6/6 (the acclamation
  stanza is three lines), `tr0311` 2/8/8, `tr0313` 3/4/4/4, `tr0315` 4/6/4/4
  (the six-line chorus as its labelled stanza), `tr0318` with the chorus first,
  `tr0323` 4/6/4/4, `tr0326` with the chorus second, `tr0337` 4/4/4/4/5,
  `tr0338` 8/4/8 (four very long chorus lines between short-lined stanzas),
  `tr0343`/`tr0344` with chorus second, `tr0350`/`tr0351`/`tr0353` chorus
  second/third (`tr0353` 8/2/8/8: a two-line chorus), `tr0357`–`tr0360` chorus
  second, `tr0362` and `tr0364` chorus **first**, `tr0368` 4/2/4/4/4 (two-line
  chorus), `tr0369` 8/6/8, `tr0370` 8/6/8/8, `tr0371` 8/4/8/8, `tr0373` chorus
  second, `tr0374` 4/4/4/4/4, `tr0375` 6/6/6. Do not pad
  them to a rectangle. `tr0014` 2:2 (12 vs 8) comes from the
  same mixed shape. `tr0139`, `tr0151`, `tr0181` and `tr0202` are stanzas of one
  printed line each, with the
  phrases separated by `/` in the source; the payload keeps one string per
  stanza including the slashes, so the meter script counts each stanza as a
  single long line.
- `tr0091`, `tr0130` and `tr0143` print `يَهْوَه` (the divine name applied to
  Jesus); the
  Hebrew keeps `יְהֹוָה` rather than substituting `אֲדֹנָי`, because the hymn's
  argument is exactly that this is who was before the mountains (91), who is
  the awaited Christ of Isaiah 53 (130), and who is the Head of the gathered
  church (143).
- Validated: `npm run check:hymns` (1824, all pass), `npm run build:corpus`
  (index 305 KB, 19 chunks), `npm run typecheck`, apply `--check` clean,
  payload↔corpus parity for all 375 (`title_he`, `verses_he`, labels, shape).
- Browser (web, dev server, 2026-11-14): samples `tr0007`/`0013`/`0018`/`0021`/`0026`,
  `tr0077`/`0086`/`0093`/`0096`, `tr0098`/`0099`/`0113`/`0116`,
  `tr0120`/`0125`/`0128`/`0130`, `tr0131`/`0133`/`0135`/`0139`,
  `tr0141`/`0143`/`0146`/`0149`/`0151`/`0157`/`0158`,
  `tr0159`/`0163`/`0168`/`0172`/`0176`/`0177`/`0178`,
  `tr0179`/`0181`/`0183`/`0188`/`0190`/`0196`/`0198`,
  `tr0199`/`0202`/`0205`/`0208`/`0212` and
  `tr0215`/`0218`/`0220`/`0222`/`0225` and
  `tr0255`/`0257`/`0259`/`0262`/`0264`/`0268` and
  `tr0269`/`0271`/`0275`/`0276`/`0278`/`0280`/`0282` and
  `tr0283`/`0284`/`0286`/`0289`/`0291`/`0294`/`0296` and
  `tr0297`/`0306`/`0321`/`0340`/`0359`/`0370`/`0375` after clicking
  `HE` — chip fills `#5E35B1`, every stanza line rendered
  (`20/28/35/30/5/16/14`, `24/24/18/16/10/16/15`, `24/4/17/16/20/27/16`,
  `20/5/24/40/16`, then `20/14/15/19/18`, `24/14/18/24/24`,
  `20/17/15/17/16`, `20/20/21/24/24/12`, `24/24/15/10/24/32/23`,
  `25/18/17/24/18/24/32` and `15/30/33/32/30/30/18`), all
  pointed, `direction: rtl`, `text-align: right`, platform font
  (`-apple-system`), zero console errors. `tr0027` (no Hebrew) still shows only
  `عر/EN/DE` and no Hebrew characters.
- Admin editor now covers Hebrew (`title_he`, `chorus_he`, `verses_he`, a `HE`
  chip next to AR/EN/DE, RTL/platform-font fields) — see §17. Taranim
  is **complete** (375/375); books 3–4 are untouched. Home book cards now show a
  third `HE` pill when the book carries Hebrew (`getBooks()` returns `hasHe`;
  the language row wraps so three badges never overflow a narrow card).
- Gotcha: hand-editing a payload's `review[]` is easy to leave a trailing comma
  in — `JSON.parse` aborts the whole apply run (seen once on `0006.json`).
- Gotcha: Metro caches the imported corpus chunks, so after `build:corpus` the
  new `hasHe`/verses do not appear until the dev server is restarted with
  `--clear` (verified 2026-11-14 on `tr0005`: chips stayed `عر/EN/DE`).
- Gotcha: `react-hooks/set-state-in-effect` is reported at
  `src/app/(tabs)/hymn/[id].tsx` (the `setActiveVerseIndex(null)` reset) — it
  predates this work. `npm run lint` is broken here (`expo lint` is not a
  command in this CLI); lint files directly with
  `node node_modules/eslint/bin/eslint.js <files>`.

## 16. Hebrew translation base — Books 1 and 3 (prepared 2026-11-15, commit f2797605)

Book 2 is finished (§15). The remaining two books now have the same authoring
base, so a batch can start on either without touching code.

| Folder | Book | Hymns | Verse lines | Chorus hymns | Labels |
|---|---|---|---|---|---|
| `content/hebrew/main/` | Book 1 — رنموا للرب | 1,047 | 19,685 | 694 | `1` … `13` (Western digits) |
| `content/hebrew/book3/` | Book 3 — هلم نرنم | 402 | 3,827 | 0 | `١` … `٨` (Arabic-Indic) plus refrain labels `القرار` (180) and `قرار` (66) |

- `hebrew-apply.mjs` now indexes hymns by **book across all `content/*.json`
  files**, because Book 1 is split between `main.json` (1–1000) and
  `main-1001-1047.json` (1001–1047). It writes each hymn back to the file it
  came from and only re-serialises files that actually changed (otherwise the
  first run reformatted all of `book3.json`). Payload `book` must equal the
  folder name, and missing `book` keys in the corpus fall back to the file name.
- New tooling (also npm scripts): `hebrew:digest` (`scripts/hebrew-digest.mjs`
  — AR + EN + metre + shape for a range), `hebrew:skeleton`
  (`scripts/hebrew-skeleton.mjs` — exact-label stub payloads, `--write` to
  create them), `hebrew:progress` (`scripts/hebrew-progress.mjs` — coverage,
  pointed %, flags, next numbers per book).
- Labels are **data, not design**: Book 3 mixes `القرار` and `قرار`, and two of
  its hymns start at `1` instead of `١`. Never retype a label — run
  `hebrew:skeleton` and replace only the `""` lines.
- Verified: `hebrew:skeleton book3 1 1 --write` produces a stub that
  `hebrew:apply --check` rejects with exactly the 17 expected errors (missing
  title + 16 empty lines), and deleting the stub returns the gate to "no
  drift". `hebrew:progress` reports
  `taranim 375/375 · 7,386 lines · 100% pointed` and 0/1,047 and 0/402 for the
  other two.
- Start with **Book 3** (402 hymns, 9.5 lines each, no chorus fields) as the
  cheaper proof that the workflow carries over; Book 1 is the long tail and
  needs `chorus_he` on 694 hymns. First batch:
  `node scripts/hebrew-digest.mjs book3 1 10`.

- First batch landed (b30001–b30010, 10 hymns, 108 verse lines, 2026-11-16):
  5 stanzas with refrains, 1 single-stanza hymn, 1 long hymn (9, 5 lines × 3).
  Gates: `hebrew:apply --check` clean, `hebrew:meter` flags 6 of 10 (deliberate
  asymmetry in b30009's closing line and the short refrains of b30005/b30008),
  `hebrew:align` reports 385 translated hymns, `build:corpus` 1824 hymns,
  `check:hymns` all pass, `tsc --noEmit` clean. Browser: HE chip + disclaimer
  render on b30001/b30006/b30009, 0 console errors.
  Register: elevated biblical Hebrew, full niqqud, glossary terms
  (`יֵשׁוּעַ`, `שַׂר שָׁלוֹם`, `שַׁעֲשׁוּעַי`), each printed line keeps the
  Arabic's two half-phrases joined by ` · ` so the grid matches one-to-one.
  Next batch: `node scripts/hebrew-digest.mjs book3 51 60`.

- Batches 2–5 landed the same evening (2026-11-16, 21:15–21:27, commits
  `e25a9356`/`da51b528`/`df6c1954`/`0bade5c5`/`3d91c63e`): b30011–b30050, ten
  hymns per commit, one continuous run. State is **50/402** (465 lines, 100 %
  pointed). Note `hebrew:progress` counts `review[]` notes (150), not meter
  flags: `hebrew:meter --book book3 --from 1 --to 50` reports 96 lines outside
  ±2, reviewed and accepted 2026-11-17.
- Lean batch tooling (2026-11-17, S0): `hebrew-digest --pack` prints the
  `hebrew-pack` template (no EN gloss — it was 53 % of the digest bytes — and no
  topics), `--no-en` covers the long format; `scripts/hebrew-pack.mjs`
  (`npm run hebrew:pack`) shape/pointing-gates a batch file and writes the
  payloads; the shared checks live in `scripts/lib/hebrew-text.mjs` and are
  imported by apply + pack; `hebrew-meter` takes `--book/--from/--to` and
  `--flags-only`. Round-trip proof: b30041–b30050 → pack text →
  `hebrew-pack --force` reproduced every title, label and line byte-for-byte;
  the only difference is that the regenerated payloads now carry the `chorus`
  flag that `hebrew-apply` always mirrored from the Arabic anyway. Session plan
  `content/hebrew/book3/PLAN.md`, live checkpoint
  `content/hebrew/book3/STATE.md`.
- Batch 6 (2026-11-17, S1): b30051–b30065, 15 hymns / 149 lines, state
  **65/402** (614 lines, all pointed). Loop as documented: digest `--pack`
  (8,504 chars for 15 hymns) → author → `hebrew-pack` → apply → check → meter
  → align (✓ 440) → `build:corpus`. Meter found 52 flags; 16 lines tightened
  (mostly over-long halves in b30054/56/57/58/61/62/64/65), leaving 42, all
  accepted: shape flags mirror the print (b30053 2/3/2/2, b30057 2/3/2/2,
  b30059 2/1/2/2, b30061 3/2/3/…, b30064 2/1/2/2/2/2 — b30061 stanza 2 is a
  two-line refrain), and the short lines are short in the Arabic too
  (b30056 2:2, b30057 2:2, b30058 2:2). Lesson recorded in `STATE.md`: the
  printed line is the unit — pad a short Arabic half-phrase and the tune
  stumbles. Next: b30066–b30080.
- Batch 7 (2026-11-17, S1): b30066–b30080, 15 hymns / 132 lines, state
  **80/402** (746 lines, all pointed, 153 `review[]` notes). Same loop; meter
  found 23 flags and none needed a rewrite — every one is a shape the print
  itself sets (b30066 1/5/1/1/1 with a five-line refrain stanza, b30074 5/5/5/5
  with its refrain tags) or a line that is short/long in the Arabic. The one
  wording fix was b30080 2:3 (`מִכָּל־` for the Arabic's superlative `أحلى`).
  Three `R:` notes only, all quote-driven: b30070 = Ps 16:1–2, b30073 = 2 Cor
  12:9, b30078 = Gen 32:27. Gates: apply ✓ 454, `hebrew:align` ✓ 455,
  `build:corpus` 1824 hymns / 19 chunks, `check:hymns` 30,898 lines 100 %
  vocalised. Next: b30081–b30095.
  Gotcha: on Windows PowerShell `node scripts/hebrew-digest.mjs book3 66 80
  --pack > file` writes UTF-16LE-with-BOM and the file reads as *binary*;
  redirect through `cmd /c "… > file"` instead.
- Batch 8 (2026-11-17, S1): b30081–b30095, 15 hymns / 128 lines, state
  **95/402** (874 lines, 100 % pointed, 156 `review[]`). Same loop with no code
  changes; meter found 24 flags and again none was a real fault — b30091 and
  b30094 are the print's 2/1/2 and 2/1/2/2/2 shapes (a one-line `القرار`), the
  rest are short acclamations or long lines in the Arabic. Two quoted psalms
  carry the only `R:` notes: b30094 2:1 = Ps 119:105 verbatim, b30081 2:1 =
  Ps 107:9 ending on `מִלֵּא לֶחֶם` as the print's `ملأ خبزاً` does. Gates:
  apply ✓ 469, `hebrew:align` ✓ 470, `build:corpus` 1824 hymns, search index
  3.34 MB. Session cost measured: ~12–15k tokens per batch, so PLAN §7 now says
  stop after two batches per session. Next: b30096–b30110.
- Batch 9 (2026-11-17, S1): b30096–b30110, 15 hymns / 147 lines, state
  **110/402** (1021 lines, 100 % pointed, 158 `review[]`). Meter: 28 flags, none
  a missing/extra word — print shapes (b30100 2/4/4, b30101 2/1/2/2/2, b30103
  3/2/3/3, b30104 2/3/2/2, b30106 4/2/4/4/4, b30109 4/1/4/4) plus relative
  length. Two `R:` notes: b30103's refrain is 2 Cor 12:9's own `דַּיְּךָ חַסְדִּי`,
  b30107 renders `راضٍ وشاكر` as `שָׁלֵו וּמוֹדֶה` (`רָצוּי` = "acceptable").
- Batch 10 (2026-11-17, S1 closed): b30111–b30125, 15 hymns / 156 lines, state
  **125/402** (1177 lines, 238 meter flags, 158 `review[]`). Same loop, no code
  changes; 24 flags, all relative length, no structural fault. Decision worth
  keeping: when the print puts a repeat count inside the line
  (`(يا ابنى لا تنسى)٣`, b30119; b30125's `٣٦٥`), the count is a singing
  instruction — write the phrase once and do not flag it; b30125 spells the
  number in words because Hebrew letters only are allowed. S1 gate:
  `hebrew:align` ✓ 500, `check:hymns` 1824 / 30,898 lines, `typecheck` clean.
  Next session: S2, b30126–b30140.
- Batches 11 and 12 (2026-11-17, S2 paused after two batches by hand-off):
  b30126–b30155, 30 hymns / 315 lines, state **155/402** (1492 lines, 100 %
  pointed, 166 `review[]`, 316 meter flags for b30001–b30155). 38 + 40 flags,
  none structural — print shapes and relative length; b30143's parenthesised
  refrain tag is written plainly, repeat counts inside lines stay a singing
  instruction. `R:` notes for quoted verses: b30129 (1 Sam 7:12), b30131
  (Ps 91), b30136 (Ps 57:8), b30138 (Ps 34:11), b30149 (2 Sam 22/Ps 18),
  b30154 (Phil 4:6–7).
- **Workflow fix (same hand-off):** PR-style CI failed on the S1 docs commit
  (#281, both pages.yml and firebase-hosting-merge.yml) at
  `git diff --exit-code -- assets/hymns src/data/generated-chunks.ts` inside
  `build:web`: batch 10's Hebrew payloads were committed without the rebuilt
  corpus assets. Regenerated `assets/hymns` (commit `fix(build): regenerate
  corpus assets for batch 10 Hebrew`) and verified the diff gate is now clean;
  every later batch commit stages `assets/hymns` with the payloads. Verify
  locally with `npm run build:corpus && git diff --exit-code -- assets/hymns
  src/data/generated-chunks.ts` before pushing.
- Batches 13 and 14 (2026-11-17, S2 paused after four batches by hand-off):
  b30156–b30185, 30 hymns / 289 lines, state **185/402** (1781 lines, 100 %
  pointed, 171 `review[]`, 385 meter flags for b30001–b30185). 34 + 35 flags,
  none structural. b30171 duplicates tr0375, so its already-settled wording is
  reused with full pointing; b30172's repeat-count tags and b30174's triple
  `الميراث` are singing/text repetitions, written out rather than dropped.
  Gates: `hebrew:align` ✓ 560, `check:hymns` 1824, `typecheck` clean, diff gate
  clean. Next: batch 15, b30186–b30200 (last of S2).
- Batch 15 (2026-11-17, S2 closed): b30186–b30200, 15 hymns / 136 lines, state
  **200/402** (1917 lines, 100 % pointed, 178 `review[]`, 414 meter flags for
  b30001–b30200). 29 flags, none structural — print shapes (b30191 1/4/4/4,
  b30194 2/3/3/3, b30196 2/5/2/2, b30200 2/4/2/2) and relative length only.
  Repeat counts inside lines stay singing instructions (b30189's `(كاملة)٣`,
  b30192's repeated `لا`), written out once; quoted verses carry the only seven
  `R:` notes (2 Cor 12, Zech 4 / 2 Chr 16, Ps 55 / Rom 8 / Isa 49, Jer 32,
  Matt 6, Ps 23, Ps 27 / Rom 8). Gates: `hebrew:apply --check` clean,
  `hebrew:align` ✓ 575, `check:hymns` 1824 / 30,898 lines, `typecheck` clean,
  diff gate clean after staging the rebuilt `assets/hymns`. Next session: S3,
  b30201–b30215.
- Batches 16 and 17 (2026-11-17, S3 first two batches, commits `5a1557cd` /
  `e3ac2247`): b30201-b30230, 30 hymns / 278 lines, state **230/402** (2195
  lines, 100 % pointed, 193 `review[]`, 465 meter flags for b30001-b30230).
  26 + 25 flags, none structural — print shapes (b30201/b30210 one-line stanza
  2, b30202 two-line stanza 2, b30224 2/3/2/2), short acclamations, and long
  lines/repeated refrains, all present in the Arabic. `R:` notes for quoted
  verses: 2 Cor 12:9, Ps 23:4, Rom 8:35-36, 1 Thess 4:17 / Rev 19:9, Isa 53:12,
  Ps 115:1, Joel 2:25, 1 Cor 2:8, Matt 28:20, John 6:68 / 19:28, Rev 4:10,
  Ps 86:11, Rev 2:10. Gates per batch: `hebrew:apply --check` clean,
  `hebrew:align` ✓ 605, `check:hymns` 1824, `typecheck` clean, diff gate clean
  with rebuilt `assets/hymns` staged. Next: batch 18, b30231-b30245.
- Batch 18 (2026-11-17, S3 third batch, commit `d0f5bd76`): b30231-b30245, 15
  hymns / 155 lines, state **245/402** (2350 lines, 100 % pointed, 201
  `review[]`, 503 meter flags for b30001-b30245). 38 flags, none structural —
  print shapes (b30231 4/2/4/4, b30232 1/2/2/2, b30233 4/3/4, b30234 2/1/2,
  b30236 2/1/2/2/2, b30239 4/2/4, b30244 4/1/4/4/1, b30245 4/2/4/4), short
  acclamations and long lines already in the Arabic. One real fix: b30231 4:4
  restored `אֵצֶל מִדְרַךְ רַגְלָיו` so the −6 flag cleared (the print's
  `موطئ قدميه` had been dropped). Eight `R:` notes for glossary/verse choices
  (קִנְיָן, נַחֲלָה, קָנָה, חֻלְשָׁתִי/מַפְגִּיעַ, מַטָּרָה, Isa 6:6-7,
  Golgotha/כֹּפֶר, John 4:35). Gates: `hebrew:align` ✓ 620,
  `build:corpus` 1824 hymns, `hebrew:check` no drift, `check:hymns` 1824,
  `typecheck` clean, diff gate clean with rebuilt `assets/hymns` staged.
  Next: batch 19, b30246-b30260.
- Batch 19 (2026-11-17, S3 fourth batch, commit `eea17b0d`): b30246-b30260, 15
  hymns / 139 lines, state **260/402** (2489 lines, 100 % pointed, 209
  `review[]`, 534 meter flags for b30001-b30260). 31 flags, none structural —
  print shapes (b30246 2/3/2/2/2, b30253 3/2/3/3, b30258 2/1/2, b30260 4/5),
  short acclamations and long lines already in the Arabic. Eight `R:` notes
  for glossary/verse choices (וזן wordplay, 1 Pet 5:7 / Heb 13:5, פִּקָּדוֹן /
  Matt 16:24, John 3:17, Rev 22:1, repeat count / רֶגֶשׁ, שָׁלִיחַ for سفير,
  2 Cor 5:17). Gates: `hebrew:apply --check` no drift, `hebrew:align` ✓ 635,
  `build:corpus` 1824 hymns / 15 loans, `check:hymns` 1824, `typecheck` clean,
  diff gate clean with rebuilt `assets/hymns` staged. Next: batch 20,
  b30261-b30275.
- Batch 20 (2026-11-17, S3 closed): b30261-b30275, 15 hymns / 149 lines, state
  **275/402** (2638 lines, 100 % pointed, 217 `review[]`, 555 meter flags for
  b30001-b30275). 21 flags, none structural — print shapes (b30266 3/2/3/3,
  b30274 4/2/4, b30275 4/1/4), short acclamations and long lines already in
  the Arabic; sung `..` pauses and b30275's `לֹא לֹא לֹא` written out.
  Eight `R:` notes for quoted verses/glossary (John 19:34 pierced side,
  Eph 3:20, Gen 17:1 + Matt 16:24, הֵד / רְפִיָּה, Acts 10:38, John 3:30 +
  צוּר, Col 1:18 + חֶסֶד, 1 Pet 2:11 / 5:7 + מוֹלֶדֶת). Gates:
  `hebrew:apply --check` no drift, `hebrew:align` ✓ 650, `check:hymns` 1824 /
  30,898 lines, `typecheck` clean, diff gate clean with rebuilt `assets/hymns`
  staged. `build:corpus` reports 17 loans (b30272 lends to h0349). Next
  session: S4, b30276-b30290.
- Batch 21 (2026-11-17, S4 first batch, commit `53d97e34`): b30276-b30290, 15
  hymns / 164 lines, state **290/402** (2802 lines, 100 % pointed, 227
  `review[]`, 594 meter flags for b30001-b30290). 40 flags, one real fault
  fixed: b30279 2:2 had dropped the Arabic's `انت` ("You"), restored as
  `אַתָּה בְּאוֹרְךָ...`, flag cleared → 39; the rest are print shapes (b30278
  3/6/4, b30280 2/4/2/2, b30284 2/3/3/3, b30287 3/2/3/3/3, b30288 4/1/4)
  and short/long lines already in the Arabic. b30288's `...` sung pauses kept
  verbatim. Ten `R:` notes, mostly quoted verses (Jabez 1 Chr 4:10, Ezek 37,
  Ps 103, Luke 18 tax collector, John 19:34-37) and glossary choices (צוּר,
  שֵׂה, קִנְיַן, גְּדוּדִים, מָמוֹן), plus the عشر/عشور tithes wordplay.
  Gates: `hebrew:check` no drift, `hebrew:align` ✓ 665, `build:corpus` 1824
  hymns / 19 chunks / 17 loans (no new loans), `check:hymns` 1824 / 30,898
  lines, `typecheck` clean, diff gate clean with rebuilt `assets/hymns` staged.
  Next: batch 22, b30291-b30305.
- Batch 22 (2026-11-17, S4 second batch, commit `1d34baa`): b30291-b30305, 15
  hymns / 180 lines, state **305/402** (2982 lines, 100 % pointed, 241
  `review[]`, 633 meter flags for b30001-b30305). 39 flags, none structural —
  print shapes (b30301 1/2/1/1, b30295's seven refrains) and short/long lines
  already in the Arabic; b30293's and b30300's `..` sung pauses kept verbatim.
  Fourteen `R:` notes for quoted verses/glossary (prodigal son + Eccl 1:14,
  Rom 8:35 + מְצוּלָה, 1 Thess 4:17 + עֲטֶרֶת, Rev 1:6, Ps 23:4 / Phil 3:14,
  John 20:27 / Phil 3:8's רֶוַח, מַצְפּוּנִי / 1 Pet 1:8, שְׁכִינָה,
  Ps 139:23–24, נַחַת / הֲוָיָה, Isa 53 / Heb 13:13, Isa 53:5 / 40:31,
  Rev 3:20). Gates: `hebrew:check` no drift, `hebrew:align` ✓ 680,
  `build:corpus` 1824 hymns / 19 chunks / 17 loans (no new loans), diff gate
  clean with rebuilt `assets/hymns` staged. Next: batch 23, b30306-b30320.
- Search-bar focus frame (2026-11-17): the WCAG rule in `src/app/+html.tsx`
  used `:focus-visible { outline: 2px solid #A8842E !important }`; Chromium
  treats a mouse click into a text input as `:focus-visible`, and `!important`
  beat the `noFocusRing` inline token, so the library search bar appeared
  inside a gold rectangle. The rule now excludes `input`/`textarea`/`select`
  and explicitly resets their outline; the ring remains for keyboard-focused
  links and buttons. Verified by `npm run typecheck` (clean); local
  `expo start --web` is broken in this workspace (legacy CLI + mismatched
  expo deps), so visual confirmation needs CI or the user's dev server.

## 17. Hebrew stanzas follow the Arabic ones (2026-11-15)

Two defects, both found on Book 2 after the Arabic stanzas had been reordered
and refrains defined in the admin editor.

- **The admin editor had no Hebrew.** `src/app/(tabs)/admin-edit.tsx` now
  carries `title_he` / `chorus_he` / `linesHe` through the form, reorders
  `linesHe` in `moveStanza`, validates the Hebrew grid (`sameShape`,
  `firstBlank`) and writes `verses_he` in the save patch. `HE` is a fourth
  language chip; it shows by default unless the editor was opened from the
  German queue (`?lang=de`). Inputs use the platform font with
  `writingDirection: 'rtl'` — none of the six bundled families carry Hebrew
  glyphs (`fontFamily` is deliberately overridden), and the line box is 48px so
  niqqud is not clipped.
- **Overrides left the translation behind.** An admin edit is a *patch*
  (`store/overrides.ts`), and moving a stanza rewrites `patch.verses` while the
  bundled `verses_he` stayed in the old order; `loader.ts` spread the patch
  over the record and paired `verses_he[i]` with the wrong Arabic stanza. Fixed
  at read time in `src/data/translationAlign.ts` (`alignTranslation`), called
  from `applyPatch` in `src/data/loader.ts` for `getHymn` and `getCorpus`:
  stanzas are matched by **text** (labels are renumbered when a refrain is
  defined, so they cannot identify a stanza), with a shared-line fallback for a
  stanza that was moved *and* edited, and leftovers keeping source order. Only
  the bundled copy is realigned — a patch that carries `verses_he` was written
  against the patched order already. This means overrides already saved in
  Firestore or in another device's AsyncStorage fix themselves; no migration.
- `hebrew-apply.mjs` now copies each Hebrew verse's `label` and `chorus` from
  the Arabic verse at the same index instead of trusting the payload, and 30
  taranim hymns were re-applied: they had shipped a refrain stanza without the
  `chorus` flag (`tr0315`, `0318`, `0323`, `0326`, `0332`–`0334`, `0337`,
  `0338`, `0342`–`0344`, `0350`, `0351`, `0353`, `0357`–`0360`, `0362`–`0364`,
  `0366`, `0368`–`0374`). Labels already matched; only the flag was missing, so
  the reader rendered the right text but not the `القرار` heading style.
- New gate: `npm run hebrew:align` (`scripts/hebrew-align.mjs`) compares the
  merged corpus stanza by stanza — count, label, refrain flag, line count —
  and exits non-zero on any fault. Run it after editing Arabic in a translated
  hymn. Current state: `✓ 375 translated hymn(s)`.
- Verified on the dev server (2026-11-15), two ways:
  1. Injected an override for `tr0315` with the refrain moved last and one
     Arabic line edited (`moved + edited` case). Reader under the `HE` chip
     showed `מַה־סּוֹד…` / `וְהַכַּלָּה…` / `וּבַסּוֹף…` / refrain `הִנֵּה הֶחָתָן בָּא`
     under the matching Arabic stanzas, `القرار` heading on the last one.
  2. In the editor (non-Firebase build for the PIN gate): the Hebrew fields
     render with 18 pointed values, `move down` on stanza 1 carried its Hebrew
     and renumbered the headings to `(القرار) (1) (2) (3)`, and save wrote
     `verses=[4] · verses_en=[4] · verses_de=[4] · verses_he=[4]` with all four
     grids in the same order. `typecheck` and `eslint` clean; zero console
     errors.
- Gotcha: `useAdminGate` is intentionally **not persisted**, so a full page
  load re-locks the editor. To test the editor in a browser, unlock on `/admin`
  and then navigate **client-side** (the review list row), not by URL.
- Gotcha: `flattenStyle` copies `fontFamily: undefined` through, so
  `[fieldStyle, { fontFamily: undefined }]` still renders in Cairo. The Hebrew
  fields are built from a font-less box instead; verified by computed style —
  Arabic fields `Cairo`, Hebrew fields
  `-apple-system, …, "Segoe UI", Roboto, …` (no bundled family has Hebrew
  glyphs, so Cairo would be tofu).
- Gotcha: the dev server on 8081 was held by a stale Metro process from a
  previous session (listening, but not answering); `netstat -ano | findstr
  :8081` then `Stop-Process -Id <pid>`.

## 18. Hymns printed in more than one book (2026-11-15)

Books overlap, and until now the app had no idea: each record (`h0487`,
`tr0166`, `b30013`) was independent, so the same hymn was translated twice.
61 groups (123 records) are the *same text*; 228 further groups share only a
title and are **different hymns** — never link those.

| pair | groups |
|---|---|
| Book 3 ↔ Book 1 | 44 |
| Book 1 ↔ Book 2 | 16 |
| all three (`h0128` / `tr0318` / `b30007`) | 1 |

- Detection: `scripts/lib/duplicates.mjs` (`hymnKey`). Arabic **letters only** —
  harakat, tatweel, punctuation and spaces dropped, `أإآ→ا`, `ى→ي`, `ة→ه` —
  because each book typesets the same hymn differently. Same-book repeats are
  ignored.
- **A matching text does not mean matching lines.** The same hymn is cut into
  different printed lines (and stanzas): `b30013` 4 lines vs `h0142` 8;
  `main:168` `1:4 / 1:4* / 2:4` vs `book3:31` `١:2 / القرار:4* / ٢:2`. Only
  **14 of the 61 groups** print a compatible line grid; the other 47 need the
  lines re-broken by hand before a translation can be re-cut.
- `lineCompatible(a, b)` compares the normalised printed lines one by one and
  is the gate for reuse. `reflowHebrew(target, source)` then re-lays the flat
  list of Hebrew lines onto **the target's own stanza widths, labels and
  `chorus` flags**, and returns `null` if the counts disagree (so a mismatch
  can never silently shift text).
- `build-corpus.mjs` does this every build: writes
  `assets/hymns/links.json` (`id → sibling ids`, 123 entries) and lends Hebrew
  in book order `b3 → main → taranim`, skipping a target that already has
  `verses_he` **or** `title_he` — a hand-authored payload always wins. Build log
  prints the pairs: currently 14 (`h0128←tr0318`, `h0107←tr0113`, …,
  `h0788←tr0362`). Books 1 and 3 therefore show Hebrew for 14 hymns even though
  `content/hebrew/main/` and `book3/` are still empty; `hebrew:align` still
  reports 375 because it audits authored payloads, not the built corpus.
- Read path: `getLinks(id)` in `src/data/loader.ts` resolves the ids through the
  **merged** summaries, so an admin rename shows the new title and a deleted
  copy disappears without regenerating anything.
- UI (the "where else does it appear" ask):
  - reader: docked at the **foot of the stanza rail** on the physical right —
    a small caption (`reader.alsoInShort`) plus one badge per copy showing a
    book glyph, the book name (9px, wraps to 2 lines) and the number at 12px;
    tapping it opens that copy. It sits *outside* the rail's ScrollView so it
    stays put when a hymn has more stanzas than fit, and pads
    `insets.bottom + spacing.xxl` because the tab bar overlays the screen.
    The earlier header line (`موجودة أيضاً في: …`) was removed: the same text in
    the header and the rail was noise.
  - reader body: a card under the text with a `HymnRow` per copy (book name as
    subtitle) that navigates to `/hymn/<id>`;
  - info sheet: its own section above the topics, rows close the sheet and push;
  - admin editor: a card listing the copies (with `· HE`), each opening that
    copy's editor — editing one copy does **not** change the others (they have
    their own stanza grid), which is why the card exists.
  - `reader.alsoIn` / `reader.alsoInShort` (ar/en/de) + `bookLabelKey()` in
    `src/i18n/index.ts`; using `t('book.book3')` inline would fall back to
    "Sing to the Lord" when a key is missing.
  - The info sheet used to be reachable **only** through the header's also-in
    chip (the toolbar had no info button). With that line gone, a
    `information-outline` button was added to the reader toolbar.
- Verified on the dev server (2026-11-15): `h0487` shows the `HE` chip with the
  borrowed 24 pointed lines (6×4, labels `1…6`), the rail badge reads
  `ترنيمات روحية 166` under the stanza dots and taps through to `tr0166`, and
  the card under the text lists the same copy; `b30013` (4 lines, no Hebrew)
  shows `رنموا للرب 142` and the reverse on `h0142`. Admin editor for
  `h0487` (`?id=h0487&lang=en`) shows the copies card with `HE`; zero console
  errors, `typecheck` + `eslint` clean, `check:hymns` 30,898 lines / 100 %
  vocalised.
- Gotcha fixed while here: `HymnInfoSheet`'s backdrop was declared
  `accessibilityRole="button"` **around** the whole panel, so every interactive
  row became a `<button>` inside a `<button>` — React logged a hydration
  warning on web as soon as the sheet gained links. The backdrop is now a plain
  `Pressable`; the close icon and `onRequestClose` carry the accessible
  dismissal.
- Not done (deliberate): no shared patch. Stanza order, refrain and wording stay
  per book, so an admin restructure cannot break the other book's shape. Title
  matching is *not* used to guess duplicates.

## 19. Scripture references — the hymn's ground (2026-11-15)

The reader shows where a hymn is founded in scripture: **one small centred RTL
line above stanza 1**, 12px muted, `book-cross` glyph, refs joined with `·`.
Arabic book name and Arabic-Indic digits whatever the UI language, because the
reference belongs to the Arabic hymn. **Not tappable**, and no Bible text is
bundled, cached in git or shipped — only the reference string. A hymn with no
confident reference renders nothing (no placeholder, no topic fallback).
Present in fullscreen too.

- Data: structured `scriptures: [{ book:'isa', chapter:53, from:4, to:6, review?:true }]`
  (`src/data/types.ts`). Canonical order, no duplicates. Payload text is parsed
  once, by `scripture-apply`, so the app never parses.
- `src/data/scripture-books.json` — 66 books `{ id, ar, en, also?, chapters }`,
  chapter counts verified against GetBible `arabicsv`; `psa` prints as
  `مزمور`, 25 books carry print-spelling aliases.
- Logic mirrors: `scripts/lib/bible-books.mjs` (Node) and
  `src/data/scriptures.ts` (Metro). Deliberately duplicated — the scripts use
  `node:` imports Hermes cannot load; the book table itself is shared JSON.
  App-side **error messages are Arabic**; the script copy stays English
  (logs). Mixing English text into the RTL field produced a bidi jumble
  (`chapter 99 outside 1..66` wedged inside `إشعياء ٩٩: ١`).
- Authoring tree: `content/scriptures/<book>/<number>.json`
  `{ book, number, refs: ["isa.53.4-6" | "إشعياء ٥٣: ٤-٦"], review: [same form] }`.
  `refs: []` clears. `content/*.json` is generated — never hand-edit.
  Docs for authors: `content/scriptures/README.md`.
- Pipeline (`package.json`): `scripture:suggest` → `_drafts/report.md`
  (drafts · weak · near misses) → `scripture:curate` (`DROP`/`FIX` verdicts) →
  `scripture:apply` → `scripture:check` (drift gate). `.gitignore` covers
  `content/.cache/` and `content/scriptures/_drafts/`.
- Matching: Arabic folding + IDF-weighted cosine + rarity-weighted phrase
  strength. Bars in `SCORE` (`scripts/scripture-suggest.mjs`, printed in every
  report): phrase ≥ 20 alone, ≥ 16 with cos ≥ 0.15, ≥ 13 with cos ≥ 0.25;
  word pair ≥ 18 alone, ≥ 13 with cos ≥ 0.30; cosine only ≥ 0.35. Adjacent
  verses merge while overlap keeps up (`rangeShare 0.55`, `maxRange 6`).
- Current state (2026-11-15): 265 drafts from 1,824 hymns (phrase 118,
  phrase+overlap 80, word pair 35, overlap 32), 407 weak phrase matches listed
  but **not** drafted. Human pass dropped 11 false positives (idioms such as
  «لست أدرى», verses saying the opposite) and corrected 13 by hand →
  **261 references on 254 hymns**, all still `review: true`. ~14 % coverage is
  expected: the rest intentionally show nothing.
- `scripts/lib/validate.mjs` now rejects unknown book, chapter out of range,
  reversed range, duplicate ref and an empty `scriptures` array (all five
  negative cases fired in a throwaway check).
- Admin editor (`/admin-edit?id=h0529&lang=en`): free-text field `scripturesText`
  parsed by `parseScriptureText`; live preview line while typing, Arabic parser
  message in red on error; save writes `patch.scriptures` only when the
  **canonical keys** changed, so re-saving untouched text does not erase a
  `review` flag.
- Verified on the 8091 dev server at a real 360×740 viewport (headless Edge via
  the repo's `playwright-core`): `h0529` (longest line, 38 chars →
  `نشيد الأنشاد ١: ٤ · نشيد الأنشاد ٥: ١٠`) renders 168×18px, one line, both
  normal and fullscreen, `scrollWidth === 360`, zero console errors; `b30001`
  (no refs) shows nothing above stanza 1. Admin field: invalid input →
  `إشعياء: الفصل ٩٩ خارج ١-٦٦`; valid input previews; save reports
  `scriptures=[1]`.
- Gotcha fixed: `scripture-apply` serialised every corpus with indent 1, so the
  first run rewrote `content/book3.json` (indent **2**) end to end — 40k lines
  of noise. It now detects the file's own indent (`readCorpusFile`), and
  `main.json` / `taranim.json` stay at 1.
- Gotcha (pre-existing, left alone): saving any admin form rewrites `verses`,
  `verses_en`, `verses_de` even when only `scriptures` changed, because a
  chorus stanza's stored label (`"1"`) is replaced by the refrain word
  (`"القرار"`) in `toForm`, so `sameVerses` always differs. Verified on
  `h0529` (`scriptures=[1] · verses=[7] · verses_en=[7] · verses_de=[7]`).
  Worth fixing separately; do not "fix" it inside a scripture change.
- Not done (deliberate): per-stanza citations; clearing `review` flags (a human
  must actually read the verse first); any Bible-text display.

## 20. Repository size — where 3.1 GB went, and the rule that prevents it (2026-11-16)

The working folder reached **3.13 GB** for a project whose own code is ~30 MB of
text. Measured breakdown before cleaning:

| item | size | cause |
|---|---|---|
| `node_modules/` | 971 MB | Expo/RN toolchain, 81k files — normal, rebuildable |
| `.git/` | 917 MB | **840 MB of it was local-only dead objects** (18,709 unreachable: abandoned branches, intermediate exports). Real history was 68 MB |
| `assets/book3/` | 737 MB | 457 page scans + OCR slices PNG-rasterised from `assets/1-401.pdf` |
| `scratch_crops/`, `scratch_index/` | 372 MB | debug crops cut during the Book 3 transcription |
| `dist/` | 134 MB | static export, **tracked** (3,729 files rewritten every deploy) |

What actually grew the history: `dist/` (11,303 blob versions, 332 MB), the
corpus JSONs (2,346 versions, 218 MB — `main.json` alone is 3.3 MB per version),
and `RAS/` (two 39 MB Access `.mdb` files + a 7.9 MB screen recording, 78 MB,
committed and later deleted).

Done 2026-11-16 (`adae2beb`): `git rm -r --cached dist` + `/dist/` in
`.gitignore`; deleted `dist/`, `scratch_crops/`, `scratch_index/` and
`assets/book3/{pages,split}` (the PDFs `assets/1-401.pdf` and
`assets/1-402-index.pdf` stay — they are the source the PNGs were rasterised
from); `git reflog expire --expire=now --all && git gc --prune=now`, which took
`.git` from **909 MB to 63 MB** without rewriting history or force-pushing.

Result: **3.13 GB → 1.08 GB**, and 971 MB of that is `node_modules`.

- Rule: **`dist/` is generated, never committed.** Both `pages.yml` and
  `firebase.yml` run `expo export` themselves; the committed copy only made
  history noise.
- Rule: the book scans and OCR scratch stay out of git (`assets/book3/`,
  `scratch_crops/`) and can be deleted at will — the transcriptions live in
  `content/`, and the page images can be rasterised again from the PDFs.
- The one thing to preserve before a `gc --prune=now` is the stash: it was
  archived to the branch `archive/stash-566-590` first, because expiring the
  reflog drops stash entries.
- Do not expect `git gc` to help again on its own: it was the *unreachable*
  objects that made the pack large, and those only accumulate when branches are
  abandoned or a rewrite is abandoned midway.

## 21. Deezer previews — tried and rejected (2026-11-16, no code kept)

A working prototype (search + JSONP + 30-second playback under the listen
buttons in «إعدادات النص») was built, verified and **deliberately reverted**:
a 30-second sample of a hymn is not worth the UI. Nothing of it remains in
`src/`.

Rejected because the clip length is **not ours to choose**: `preview` is a
fixed 30-second MP3 that Deezer renders per track (`cdnt-preview.dzcdn.net`,
signed, expiring). There is no length or offset parameter, and full-track
streaming needs their JS SDK plus a logged-in user (OAuth, registered app id)
or a Premium download — never a plain URL. Do not rebuild this before Deezer
offers longer previews.

- **Web cannot `fetch` `api.deezer.com`.** It returns the CORS method and header
  lists but **no `access-control-allow-origin`**, so the body is hidden;
  `output=jsonp&callback=cb` works (proved with `node fetch` + an `Origin`
  header). Native `fetch` is fine. This is the trap worth remembering.
- **Catalogue is good, format is the blocker:** a 60-hymn sample across the
  three books returned **17 (28 %) usable matches**, mostly exact-title hits on
  real Arabic hymn channels (Maher Fayez, Lydia Shadeed, Ayman Kafrouny, St
  Mary's Choir Ard El Golf). Scoring on the share of distinctive title words
  works; 0.75 for ≥3-word titles rejected the one false positive (0.67, a
  different hymn by the same singer).
- **expo-audio on web plays a detached `new Audio(uri)`**, so
  `document.querySelector('audio')` finds nothing — hook `window.Audio` in
  Playwright to read `currentTime`. Verified playing at t=2.8 s, pausing, and
  rewinding to 0 when the modal closed.
- **If `ReaderSettingsModal` ever grows again**, cap the sheet at
  `maxHeight: '92%'` with the handle + title row pinned and the body in a
  `ScrollView`: adding one block pushed the title to **top −128 px** on a
  360×640 screen, leaving the close button unreachable.
- Full-hymn playback alternatives were weighed and none taken: embedded
  YouTube (needs a Data API key — search costs 100 units, ~182k for the whole
  corpus — plus `react-native-webview`), SoundCloud (app registration, id in
  the public bundle, patchy catalogue), hosting audio (rights). The existing
  «ابحث عن اللحن على يوتيوب» button also needs no key and plays the full hymn.

## 22. Reader chrome: compact settings sheet + centred header (2026-11-16)

`ReaderSettingsModal` was **567 px tall on a 360×640 screen (89 %)**, hiding the
hymn behind it. It is now **370 px (58 %)**, and 46 % at 412×800. Measured with
Playwright at `/hymn/tr0009`; the four cuts:

- font-size label moved **onto** the stepper row (`flexDirection: row`), not a
  separate line — saves ~26 px;
- `FontChips` takes `scroll` (`src/components/FontChips.tsx`): one horizontal
  `ScrollView` instead of a wrapping block. Chips use `paddingHorizontal:
  spacing.sm` and `gap: spacing.xs` **only when `scroll`**, so the row is 392 px
  in a 328 px slot — the cut last chip is the scroll cue. Height stays 48.
  The settings screen keeps the default wrapped block;
- the «المظهر» heading is gone (the segmented control labels itself);
- the two listen pills share one row (`flex: 1` each) with `reader.listenShort`
  («استمع» / Listen / Anhören) and `reader.listenSearchShort` («يوتيوب» /
  YouTube). Full wording stays on `accessibilityLabel`.

Header (`src/app/(tabs)/hymn/[id].tsx`): `headerIcon` box is **34 px** (was
40), toolbar `gap: 0`, `paddingHorizontal: spacing.xs`, plus `flexGrow: 1` +
`justifyContent: 'center'` on the toolbar content container; both header columns
also use `spacing.xs`. Why 34: header padding 8 + back button 48 leaves a
**288 px** column at 360 px wide, and 8 icons × 34 = **272 px** fit, so the row
centres under the hymn number (icons centre 156 vs row centre 154 → 2 px off;
`scrollWidth == clientWidth`). Below ~340 px the row scrolls from the RTL start
with nothing clipped. `IconButton`'s `hitSlop` keeps the 34 px boxes tappable.

Checks: `tsc --noEmit` clean, 0 console errors, font stepper 20 → 22 works.
`eslint` reports one pre-existing `react-hooks/set-state-in-effect` at
`[id].tsx:320` — it is on HEAD too, not from this change.

Reader action placement (2026-11-17): the **search magnifier is a toolbar button**
(`ReaderToolbar.tsx`, `onSearch` prop → `setSearchOpen(true)`), not an overflow
item — moved out of the 3-dots menu for one-tap reach. The 3-dots menu now holds
info, text settings, share, add-to-setlist and, for editors, «تحرير ترنيمة»
(`admin.editHymn` → `/admin-edit?id=…`), which was removed from the settings
sheet. Verified in the browser at `/hymn/b30261`: search button present in the
toolbar and absent from the open menu; no console errors.

`HymnInfoSheet.tsx` now lists optional rows for the author (reusing
`admin.author`, `author` + `authorOriginal` joined by ` · `) and the scripture
reference (`admin.scriptures`). The hymn's own book name leads the **header
line** before «الترنيمة N — title» via `bookLabelKey(hymn.book)` — not the
reference row. Only the metre row uses `MeterText`: it converts `.`/`,`/`&` to
a small «و», which would mangle author names (verified on `tr0001`, whose author
value contains a comma). Verified at `/hymn/b30261`:
«هلم نرنم · الترنيمة 261 — …».

## 23. Quick fix: hold a line to correct it (2026-11-16)

Fixing one wrong word used to be: open settings sheet → admin editor → scroll the
whole hymn. Now an **editor holds any line in the reader for 350 ms** and a sheet
(`src/components/LineFixSheet.tsx`) opens pre-filled with that exact line.
No new header button — the 8-icon row already fills 272 of 288 px (§22).

Wiring (`src/app/(tabs)/hymn/[id].tsx`):

- gate is `useCanEdit()` (Firebase admin email **or** on-device PIN); a visitor's
  lines are plain `View`s, so there is no hold affordance and no a11y noise;
- per-line `onLayout` stores `id:verse:line → y` in `lineOffsets` (a ref, kept
  separate from `verseOffsets` so the rail's reset-on-first-layout contract is
  untouched); `scrollY` is captured in `onReaderScroll`;
- `openLineFix` scrolls the held line to ~20 % from the top before opening the
  sheet — keyboard + sheet cover the bottom, and editing a line you cannot see
  beside its stanza is how the wrong word gets pasted over a right one;
- sheet state is **tagged with the hymn id** and read through a guard
  (`fixState.hymnId === id`), not reset by an effect: the screen survives
  next/prev navigation and the existing `setActiveVerseIndex(null)` effect
  already trips `react-hooks/set-state-in-effect`.

Editing model: one Arabic line + **one translation language at a time** (EN/DE/HE
chips, only languages that actually have a line at that index). Drafts for every
available language persist while the sheet is open, so switching chips cannot
lose an edit. Save is disabled until something changed; an emptied line is
refused with the language named (`reader.fixEmpty` + `AR`/`English`/…).

Patch building copies `label` and `chorus` verbatim and replaces **only** the
one line inside `verses` and the changed `verses_<lang>` arrays. Consequences:

- it cannot renumber a stanza or re-flag a refrain;
- it sidesteps the admin editor's deferred label bug (§9) where `toForm` turns a
  chorus stanza's stored `"1"` into `"القرار"` and every save rewrites
  `verses`/`verses_en`/`verses_de`;
- `translationStatus` is never touched — an edited translation is not marked
  verified, deliberately.

Save semantics: `setOverride(id, patch)` first (local is the source of truth in a
live setting), sheet closes instantly, then a best-effort
`syncHymnToCloud(id, patch)`. A `Toast` (`src/components/Toast.tsx`) reports
`uploaded | local | failed | noauth` via `reader.fixSavedCloud/Local/SyncFailed/
SyncNoAuth` and offers **تراجع** for 5 s; undo re-applies the arrays captured
before the write (only the keys actually replaced — an `undefined` key would
erase a field) and re-uploads them.

Discovery: the settings sheet shows «اضغط مطولًا على أي سطر لتصحيحه»
(`reader.fixHint`), editors only. It used to sit under the full-editor button;
that button is now in the reader's 3-dots menu (§22), so the hint stands alone.

Verified with Playwright at 360×640 and 412×800, 0 console errors:
visitor has 0 fix targets; PIN `1234` → 12 targets on `h0107` (3 stanzas × 4);
sheet pre-filled with the held line; position line + 3 chips; save
disabled→enabled; in-place update; toast + undo restores; correction persists in
`helmenarnam.overrides` across reload; EN edit renders in the parallel view;
empty line refused; DE/EN/HE chips on `h0107`; `b30279` (no translations) shows
one field and no chips; fullscreen keeps sheet + toast + in-place update; cancel
writes nothing; a chip switch keeps the other draft.

`tsc --noEmit` clean; `eslint` still reports only the pre-existing
`react-hooks/set-state-in-effect` (§9).

## 24. Worship setlists — `?ids=` (2026-11-17, Session 12)

A setlist is just an **ordered row of hymn ids**; no backend, no schema. Two
pieces of state, deliberately separate:

- `src/store/setlist.ts` — persisted zustand store (`helmenarnam.setlist`) with
  `ids`, `add` (returns false for a duplicate), `remove`, `move(index, ±1)`,
  `set`, `clear`. Ids only, like favourites/recents, so a corpus rebuild cannot
  invalidate it.
- `src/data/setlist.ts` — pure helpers: `parseSetIds` (accepts a string or an
  array from expo-router, splits on commas, drops non-slug/duplicate ids),
  `encodeSetIds`, `setNeighbours` (resolves neighbour ids to summaries via
  `getSummaries()`; `index === -1` means the hymn is not in the set).

`src/app/(tabs)/setlist.tsx` (hidden tab route, reached from More →
`more.setlist`) builds the list: search by number/title (instant from summaries)
or lyrics (gated on `ensureAllChunks()` + `ensureSearchIndex()`, same as the
reader overlay), add, up/down reorder, remove, clear (confirm), Share, and
"read in order". Share composes `https://ranemmu-lilrab.web.app/setlist?ids=…`
(the Firebase origin, as `more.tsx` does) and uses the clipboard fallback on
desktop. Opening a shared link runs an effect keyed on the `ids` param that
calls `set()` — the link wins on open, later local edits win after that.

Reader integration (`src/app/(tabs)/hymn/[id].tsx`): reads `ids`, and when the
current hymn is in the set, **replaces** `getNeighbours()` with
`setNeighbours()`. prev/next buttons, `ArrowLeft/ArrowRight` and the swipe
gestures all go through one `goToHymn()` that calls `router.replace` with
`?ids=…` preserved (so a whole session stays in the set); a hymn reached by
search/similar has no set param and falls back to book neighbours. A small
`n/m` badge sits between the prev/next icons only while in a set. The overflow
menu gained `playlist-plus` → "add current hymn to setlist".

Gotchas verified in the browser on :8081 (0 console errors):

- Expo Router URL-encodes the comma (`?ids=tr0001%2Cb30249`); the param still
  arrives decoded, so splitting on `,` works. Do not "simplify" by scanning the
  raw URL.
- Adding a new route makes `npm run typecheck` fail with `"/setlist" is not
  assignable to Href` until `.expo/types/router.d.ts` is regenerated. Start the
  dev server once (`node node_modules/expo/bin/cli start --port 8081`) — the
  generated file is gitignored and CI rebuilds it from the route files, so no
  type file is committed.
- Browser check: search "249" → 3 book results, add two, reorder swaps rows,
  Start → `/hymn/tr0001?ids=…` with a `1/2` badge, next → `/hymn/b30249?ids=…`
  badge `2/2`, prev back to `1/2`, a fresh `/setlist?ids=h0042,tr0005,h0100`
  tab loads exactly those 3 hymns, reader overflow adds `tr0010` to the store.
- `t()` takes **only a key** (`useT.ts`) — no interpolation; the count subtitle
  is built as `` `${t('setlist.count')}: ${ids.length}` ``.

## 25. Architecture refactor — corpus store, reader split, lazy Firebase (2026-11-17, Session 13)

Three commits: `4842bdd0` (#15), `e02a61db` (#16), `d49ce35a` (#20).

**Corpus version (#15).** `src/store/corpus.ts` is a dependency-free
`useSyncExternalStore` counter. `bumpCorpusVersion()` is called from
`refreshOverlaidCorpus()` — the single funnel for chunk loads, override writes
and remote patches — and from `ensureSearchIndex().finally()` (the index is
part of the derived search corpus). All 12 screens now call `useCorpusVersion()`
instead of `useOverrides(s=>s.updatedAt)` + `useRemote(s=>s.updatedAt)`, and the
local `setChunksVersion`/`chunkVersion` state is gone. ESLint then complains the
version is an *unnecessary* memo dep (the reads are inside `getSummaries()` etc.),
so each memo explicitly reads it with `void corpusVersion;` — that keeps the
dependency honest without a per-screen `eslint-disable`. Net: ~10 suppressions
and all local chunk-version hacks removed.

**Reader split (#16).** `hymn/[id].tsx` 1,565 → 818 lines. New modules under
`src/components/reader/`: `ReaderToolbar` (language chips + icon row + set
badge), `StanzaRail`, `VerseBlock` (memoised), `TranslationNotice`,
`ReaderIconButton`, plus shared `readerText.ts` (chips, disclaimers,
`refrainHeading`). `src/hooks/useVerseScroll.ts` owns the rail measurement,
`onReaderScroll`, `?verse` deep link and quick-fix line offsets. The normal and
fullscreen branches already shared one `versesView`/rail/overlay tree; they now
share component instances too, which removes the last of the fullscreen
duplication. Verified in the browser: set badge, next/prev with `?ids=`
preserved, HE disclaimer + pointed text, fullscreen toggle both ways, rail dots,
0 console errors.

**Lazy cloud/admin (#20).** `src/data/firebaseConfig.ts` holds the env config,
`isFirebaseConfigured` and collection names with **no SDK imports**; ~9 callers
that only need the boolean now import it there. `firebase.ts` re-exports them
and keeps the SDK behind dynamic imports: `session.ts` (`firebase/auth`),
`_layout.tsx` (`liveSync`), `LineFixSheet` (cloud sync) and `FeedbackModal`
(feedback) all `import()` on first use. `app.config.js` sets
`EXPO_ROUTER_IMPORT_MODE=lazy` so Expo Router wraps routes in `React.lazy`.

- Verified: `node node_modules/expo/bin/cli export -p web` completes with lazy
  mode (all 1,825 hymn pages + admin routes). Dev navigation works on `/`,
  `/library`, `/hymn/*?ids=`, `/setlist`, `/admin`; a dummy admin sign-in
  reaches Firebase and returns "بيانات الدخول غير صحيحة" — i.e. the dynamic
  Auth import loads, with no module-resolution errors.
- Caveat: the local web export still listed only the entry + 19 corpus chunks +
  search index, and the entry contained firebase strings. So the *runtime*
  loading is deferred, but do not claim a measured smaller web entry bundle
  from this machine; verify chunk sizes on CI before advertising a number.

Gotcha from a mid-edit hot reload: Metro transiently reported `Duplicate
declaration "TOOLBAR_HEIGHT"`, `isFirebaseConfigured is not defined` and
`startLiveSync is not defined`. All three were stale HMR states caught while
splicing files — a fresh `start --clear` was clean. Do not chase them if they
appear during a large refactor; check `tsc --noEmit` first.

## 26. Hebrew in the review queue (2026-11-17, follow-up `380e73f3`)

`admin.tsx` review queue only offered EN/DE — Hebrew translations were
authorable in `admin-edit` but not reachable through the review flow. Now the
language toggle has EN/DE/HE, `reviewLang` is `'en'|'de'|'he'`, and the filter
picks `verses_en`/`verses_de`/`verses_he`. Tapping a row pushes
`lang: reviewLang`, so HE opens the editor on the Hebrew fields (verified:
`/admin-edit?id=tr0001&lang=he` loaded 25 pointed-Hebrew field values).

Book filter gained `book3` (Hebrew exists there too), and row subtitles use
`bookLabelKey(book)` instead of a two-way ternary.

**Hebrew has no review flag of its own** — `translationStatus` is the EN/DE
review result (§15) — so in HE mode the queue ignores the draft/reviewed
filter, hides those chips, shows `—` instead of a status badge, and prints only
the total count up top. Do not "restore" the draft/reviewed filter for Hebrew;
it would claim a review the Hebrew never had.

Verified in the PIN-gated build (`.env.local` temporarily set aside, then
restored): HE chip → 439 hymns, neutral `—` badges, tap → editor with Hebrew
fields. `tsc --noEmit` + ESLint clean.

## 27. Reader stanza rail: left side + web touch scrolling (2026-11-17)

Two reader issues found after the Session 13 deploy, both in the rail/scroller
row of `src/app/(tabs)/hymn/[id].tsx`.

**Touch scrolling was dead on mobile web.** `GestureDetector` defaults to
`touch-action: none` on its child; wrapping the text `ScrollView` in the
swipe-to-next-hymn fling therefore blocked touch pans, leaving the stanza dots
as the only way down a hymn. Fix: `touchAction="pan-y"` on the `GestureDetector`
— vertical pans go back to the browser, horizontal ones still reach the fling.
Symptom to recognise: wheel scrolling works on desktop but a phone cannot drag
the text. (`touch-action: pan-y` also drops pinch-zoom on that element; the
reader's own font-size control covers that.)

Note this predates Session 13 — the deployed build at the time already had
`touch-action: none`; it was only noticed after the push.

**Rail moved to the physical left**, per the owner's request: it now renders
before the `ScrollView` inside the `flexDirection: 'row'` container (that
container pins `direction: 'ltr'`, so source order is physical order).
`StanzaRail` uses physical `paddingLeft`/`paddingRight` and `borderRightWidth`
instead of `paddingStart`/`paddingEnd`/`borderLeftWidth`, because the app is RTL
and the logical props resolved to the wrong edge. Verified in an exported build:
rail `x=0`, width 52, border on its right; dot tap scrolls and highlights.

**Testing gotcha:** `onLayout` on web comes from `ResizeObserver`, which a
background browser tab does not deliver. In a non-focused automation tab the
rail's offset store stays empty — dots do nothing and the highlight never moves,
which looks exactly like a code bug. Bring the tab to the front (or use a freshly
opened tab) before diagnosing; a foreground production export measured all six
stanzas and highlighted correctly.








