# PROJECT NOTES — ranemmu-lilrab (hymn library / ترانيم)

Last verified: 2026-11-14, commit 3432cb5a (Hebrew reader language; see §15)

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
  line-balance report. Details in §15. After any corpus rebuild the dev server
  must be restarted with `--clear`: Metro caches the JSON chunks (verified
  2026-11-14, `hasHe` stayed stale until restart).
- `node scripts/refrain-batch.mjs 315:move 318:keep …` — mark stanza 1 of the
  listed hymns as the refrain and renumber the rest; `move` swaps it below the
  old stanza 2 (`1, قرار, 2…`), `keep` leaves it first. EN/DE are reordered and
  relabelled identically; re-running is refused once a hymn has a refrain. Run
  `npm run check:hymns` + `npm run build:corpus` afterwards.
- `npm run typecheck` (`npx tsc --noEmit`) — works on this machine; exit 0 with
  no output (needs the restored untracked `tsconfig.json`, see §2).
- Web build: `npx expo export --platform web` produces the real app in `dist/`
  (domain-root base; used by Firebase and Netlify). GitHub Pages uses
  `DEPLOY=1 npx expo export --platform web` (base `/ranemmu-lilrab`). See §12.
  Add `--clear` the first time `.env.local` is created or changed: Metro caches
  the Babel env inlining, so a cached build silently ships an app with
  `isFirebaseConfigured() === false` (no admin, no live sync).
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

- `npx tsc --noEmit` is clean with the restored `tsconfig.json`. An earlier run
  with an ad-hoc `tsconfig.tmpcheck.json` reported an implicit `any` at
  `src/data/adminAccess.ts:17`; it does not reproduce with the restored config,
  so do not chase it.
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
- Gotcha: `dist/` is committed, and `.gitignore` previously ignored it, so new
  export files needed `git add -f`. The ignore rule was removed on 2026-11-07.
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

Only `tr0001`–`tr0158` carry Hebrew so far (158 hymns, 3120 verse lines, all
pointed; `verify-hebrew.mjs` prints 3278 because it counts the 158 `title_he`
strings as lines too).
Register is elevated biblical/liturgical Hebrew, **fully vocalised with niqqud**,
and the app displays the vocalised text (user's explicit choice — do not strip
niqqud at render time). Chosen cadence: Book 2 in printed order, 20 per batch,
flags-only review. Batches land as `content/hebrew/taranim/NNNN.json`; the
corpus is never hand-edited. **Resume at `tr0159`** — batch size is free (the
apply script merges whatever payloads exist), so continue in 10–20 hymn steps
and keep committing per step.

- Fields: `title_he` / `verses_he` / `chorus_he` on the hymn record,
  `hasHe` on `HymnSummary` (emitted by `scripts/build-corpus.mjs`). Any content
  change needs `npm run build:corpus`; `validate.mjs` checks that `verses_he`
  mirrors the Arabic stanza/line grid one-to-one.
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
  position across stanzas, flag > ±2. Hymns 1–158 pass except the deliberate
  cases listed below. A flag is a prompt to re-read, not an automatic error
  (`--strict` to gate).
- `content/hebrew/glossary.md` holds the fixed renderings (`יֵשׁוּעַ` never
  `בישו`, `שָׁלוֹם לְךָ`, `אֶצְרֹף … כַּזָּהָב`, `גְּדוּדֵי שְׁאוֹל`,
  `מִגְדַּל־עֹז`, `שֶׁמֶן תּוּרַק`, `כֹּהֵן גָּדוֹל`, `מַפְגִּיעַ`,
  `פָּדָה`/`פּוֹדֶה`/`גֹּאֵל`), pointing conventions and the batch workflow.
  Add new settled words there in the same commit as the hymn.
- Reader (`src/app/(tabs)/hymn/[id].tsx`): fourth chip `HE`, indigo
  `#5E35B1`/`#EDE7F6` (`CHIP_COLORS`), Hebrew under each Arabic line,
  RTL/right-aligned, **no bundled `fontFamily`** (none of the six families has
  Hebrew glyphs, so the platform font is the only one with niqqud positioning)
  and `lineHeight` 1.9× so points are not clipped. The AI badge/disclaimer block
  is gated to `en`/`de`: the Hebrew is human-authored, not an Aya draft.
- Search: `verses_he` and `title_he` join the index; `src/data/normalize.ts`
  now drops Hebrew niqqud/cantillation (`\u0591-\u05BD`, `\u05BF`,
  `\u05C1-\u05C2`, `\u05C4-\u05C5`, `\u05C7`) and folds maqaf to a space, so a
  plain "יש לנו" matches "יֶשׁ־לָנוּ" (checked against the three stanza-1 lines).
- Aya (Ollama `aya-expanse:8b`, `scripts/poc-hebrew2.mjs`) is **dropped from the
  loop**: correcting its drafts cost as much as translating from the Arabic, and
  the Arabic is the authority. Kept as a second opinion for a stubborn line.
- Batch 2–158 review flags (741, all in the payload `review[]`): deliberate
  borrowings from Song 1:3 / 2:3 / 5:10-16 / 8:7, Prov 8:24-30 / 18:10,
  Isa 26:20 / 40:31 / 51:17 / 52:14 / 53 (fully, hymn 130) / 55:1,
  Ps 4:8 / 16:8 / 22:2 / 23:4 / 33:1 / 34:9-11 / 36:9-10 / 39:13 / 42:8 / 46 /
  51:6 / 68:19 / 73:25 / 84:7 / 88:2 / 90:2 / 95:6 / 97:9 / 103 / 110:1 /
  116:12 / 119:105 / 121 / 139 / 145:13, Lam 1:2 / 4:22, Zech 13:7,
  Matt 17:8 / 18:20 / 23:8 / 27:37 / 28:18, Luke 18:7 / 22:44, John 1:14-18 /
  3:16 / 5:24 / 6:35 / 7:37 / 10:28 / 12:32 / 13:1 / 14:2-27 / 17:5 / 19:30-34 /
  20:19, Rom 3:19 / 5:1-14 / 6:9 / 8:1-39 / 10:11 / 13:12 / 14:8, 1 Cor 9:24 /
  11:26 / 12:13 / 15:55, 2 Cor 5:14 / 8:9, Gal 2:20 / 6:14, Eph 1:3-23 /
  2:1-18 / 3:10-20 / 4:8-30 / 5:16, Phil 2:7 / 3:7-12, Col 1:15-20 / 2:9 /
  3:1, 1 Thess 4:16-17, 1 Tim 2:5 / 3:16 / 6:15, 2 Tim 1:10, Heb 1:3 / 4:15 /
  6:19 / 7:22-25 / 10:12 / 13:12-20, 1 Pet 1:4 / 2:11 / 5:10, 1 John 3:2,
  Rev 1:5-6 / 3:20 / 4:11 / 5:12-13 / 7:9 / 11:12 / 19:7 / 21:4 / 22:20;
  post-biblical but fixed terms (`צְלָב`, `בְּנִיּוּת`, `מוֹלַדְתִּי`,
  `חֻלְשָׁה`, `שַׁיָּכוּת`, `הִתְגַּלְּמָה`/`הִתְגַּלְּמוּת`, `מָצָב`, `זִקָּה`,
  `עֲמִידָה`, `חֻפָּה`); one dropped `رَبُّنَا` for metre (`tr0003` 3:2). Read
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
  `tr0158` 2/3/3/3/3 (two acclamation lines first). Do not pad them to a
  rectangle. `tr0014` 2:2 (12 vs 8) comes from the
  same mixed shape. `tr0139` and `tr0151` are stanzas of one printed line each, with the
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
  (index 303 KB, 19 chunks), `npm run typecheck`, apply `--check` clean,
  payload↔corpus parity for all 158 (`title_he`, `verses_he`, labels, shape).
- Browser (web, dev server, 2026-11-14): samples `tr0007`/`0013`/`0018`/`0021`/`0026`,
  `tr0077`/`0086`/`0093`/`0096`, `tr0098`/`0099`/`0113`/`0116`,
  `tr0120`/`0125`/`0128`/`0130`, `tr0131`/`0133`/`0135`/`0139` and
  `tr0141`/`0143`/`0146`/`0149`/`0151`/`0157`/`0158` after clicking
  `HE` — chip fills `#5E35B1`, every stanza line rendered (`20/28/35/30/5/16/14`), all
  pointed, `direction: rtl`, `text-align: right`, platform font
  (`-apple-system`), zero console errors. `tr0027` (no Hebrew) still shows only
  `عر/EN/DE` and no Hebrew characters.
- Not done: no admin editor for `verses_he` (admin-edit is ar/en/de only), home
  book cards still show EN/DE pills only, 158 of 375 taranim hymns translated.
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


