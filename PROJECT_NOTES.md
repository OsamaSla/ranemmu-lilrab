# PROJECT NOTES — ranemmu-lilrab (hymn library / ترانيم)

Last verified: 2026-11-07, commit cb4ca333 (real Expo app + reader web fix)

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
- `src/i18n/` — ar / en / de dictionaries (`useT()` returns `t` + direction).
- `scripts/` — corpus build/import (xlsx ↔ JSON), fonts, tutorial video pipeline.

## 4. Commands that work here

- `npm run start` / `npm run web` — Expo dev server on :8081 (`--web` opens web).
- `npm run preview:build` — check hymns + build corpus + static web export + serve on :8083.
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
- All static pages log React error #418 (hydration mismatch) once and then
  client-render correctly. Cosmetically it can flash the server HTML; not yet
  investigated.
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
  `/library`), no root→library redirect (the app home lives at `/`), HTML
  `no-cache`, `_expo/**` immutable. `.firebaserc` defaults to project
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
  ("scope is not under the max scope allowed") on every Pages page.
- GitHub Pages: `.github/workflows/pages.yml` builds the app with `DEPLOY=1`
  (prefixed `/ranemmu-lilrab/`), removes the duplicate `dist/(tabs)` tree, and
  writes `dist/404.html = dist/index.html` so deep links (`/hymn/tr0001`) boot
  the router client-side. Netlify builds the root variant (`netlify.toml`).
- Gotcha: GitHub Pages was not enabled at first (`GET /repos/.../pages` → 404)
  even though both old workflows reported success; it is now enabled and
  deploying from Actions. Only `pages.yml` exists (`deploy.yml` removed).
- Gotcha: `dist/` is committed, and `.gitignore` previously ignored it, so new
  export files needed `git add -f`. The ignore rule was removed on 2026-11-07.


