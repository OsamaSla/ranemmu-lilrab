# Firebase setup — live hymn editing

The app reads hymns from its bundled corpus offline and overlays live
edits from Firestore. Follow these once, in order. Nothing below goes
into git (config lives in `.env.local`, credentials only in your shell).

## 1. Create the project

1. Go to <https://console.firebase.google.com/> → Add project (any name,
   e.g. `ranemmu-lilrab`). Google Analytics: skip it, the app doesn't use it.
2. **Build → Firestore Database → Create database.**
   - Start in **production mode** (we deploy our own rules next).
   - Location: pick the region closest to your users (e.g. `eur3`).
3. **Build → Authentication → Sign-in method → Email/Password → Enable.**
4. **Authentication → Users → Add user.** Create one account per
   trusted proofreader (e.g. `name@ranemmu.app` + a strong password).
   Anyone signed in may edit hymns and flip review status — there is no
   per-user role, so only create accounts for people you trust.
5. **Authentication → Settings → User actions → DISABLE "Create
   (sign-up)" and "Delete".** With sign-up off, only the accounts YOU
   create above can ever sign in; strangers cannot self-register.
6. **Project settings (gear) → Your apps → Web (`</>`) → Register app**
   (nickname `ranemmu-web`). Copy the `firebaseConfig` values.

## 2. Configure the app

```cmd
copy .env.example .env.local
```

Fill `.env.local` with the values from step 6. The app reads them at
build time (`EXPO_PUBLIC_*`). Without them it runs offline-only and the
Admin panel falls back to the legacy PIN gate.

## 3. Deploy the security rules

```cmd
npm i -g firebase-tools
firebase login
firebase init firestore   :: accept defaults; it will pick up firestore.rules
firebase deploy --only firestore:rules
```

Rules summary (`firestore.rules`): everyone reads `hymns/*`, only a
signed-in user creates/updates, nobody deletes, everything else denied.

## 4. Upload the corpus (one time)

In a `cmd` window (replace values; never commit them):

```cmd
set EXPO_PUBLIC_FIREBASE_API_KEY=...
set EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
set EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
set EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
set EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
set EXPO_PUBLIC_FIREBASE_APP_ID=...
set ADMIN_EMAIL=admin@ranemmu.app
set ADMIN_PASSWORD=...secret...
node scripts/migrate-to-firestore.mjs --dry-run
node scripts/migrate-to-firestore.mjs
```

Expected: `1422 hymn documents` (count grows with the corpus), written
400 at a time. Open Firestore console → `hymns` → spot-check `h0001`
(has `updatedAt: 2026-10-15T00:00:00.000Z`).

## 5. Verify live editing

1. `npx expo start`, open the app, go to Admin → sign in with the admin
   account.
2. Edit any hymn → Save. On a second device (or web), the reader updates
   within seconds, no reload.
3. "Save to cloud (N)" uploads every pending local edit at once.

## Notes for maintainers

- **Costs:** first launch per device reads ~0 documents (bounded query
  against the bundled baseline); afterwards only changed hymns are
  downloaded. Writes happen only on admin saves.
- **New app releases with a rebuilt bundle:** bump `BUNDLED_AT` in
  `src/data/liveSync.ts` to the release date so fresh installs don't
  re-download edits already baked into the bundle. (Keep the migration
  script `STAMP` default in sync when re-migrating from scratch.)
- **New hymns created in Admin** sync live too and appear in the
  library on all devices (reader/search pick them up; web static export
  includes them after the next site build).
- The old GitHub-inbox publishing flow is gone: `apply-inbox.yml`,
  the `overrides-inbox` branch, and the GitHub token settings were
  removed. Local JSON export in Admin remains as a backup.
