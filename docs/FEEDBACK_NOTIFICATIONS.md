# Feedback email notifications (Web3Forms, no backend)

The project stays on Firebase's **Spark (free) plan**. There is no Cloud
Function and no Resend key: the admin notification is a plain `POST` from the
client to Web3Forms, issued immediately after the Firestore write succeeds.
This works from static hosting (Firebase Hosting and GitHub Pages alike) with
zero backend.

## Flow

1. `src/components/FeedbackModal.tsx` writes the document to `feedbacks` in
   Firestore exactly as before — that collection remains the source of truth
   for ratings/messages and for the admin list.
2. `src/data/web3forms.ts` POSTs to `https://api.web3forms.com/submit` with:
   - `access_key` — the build-time env value below;
   - `subject` — `[TarneemAPP] تقييم جديد` or `[TarneemAPP] رسالة جديدة`;
   - `message` — kind, rating, category, comment, replyEmail (when present),
     documentId;
   - `from_name` — `TarneemAPP`;
   - `replyto` — the sender's validated email, **only** for `kind: 'message'`.
     Ratings are anonymous and never get one.
3. The POST is fire-and-forget: it is fired as soon as the Firestore write
   returns, and its failures are logged but never shown to the user. A
   Web3Forms outage cannot turn a successfully saved rating into a red error.

## Access key — `EXPO_PUBLIC_WEB3FORMS_ACCESS_KEY`

Gemini's original suggestion called this `VITE_WEB3FORMS_ACCESS_KEY`. **Vite's
prefix does not work here**: this is an Expo/Metro app, and only `EXPO_PUBLIC_*`
variables are inlined into the static bundle. A `VITE_*` value would be
`undefined` at runtime and notifications would silently never send. The single
source of truth is `process.env.EXPO_PUBLIC_WEB3FORMS_ACCESS_KEY` in
`src/data/web3forms.ts` (cast explicitly because CI typechecks before Expo
regenerates the gitignored `expo-env.d.ts`).

- Local builds: add `EXPO_PUBLIC_WEB3FORMS_ACCESS_KEY=<key>` to the gitignored
  `.env.local`, then rebuild with `--clear` — Metro caches inlined env values.
- CI builds: both `.github/workflows/pages.yml` and
  `.github/workflows/firebase.yml` pass it from the repository secret
  `EXPO_PUBLIC_WEB3FORMS_ACCESS_KEY`. **The owner must add that secret in
  GitHub** (Settings → Secrets and variables → Actions) before a deployed build
  can send mail. An unset secret resolves to an empty string, so the app
  quietly skips notifications instead of failing the build.

The Web3Forms key is public by design (on ordinary static sites it lives in a
hidden form field), so committing it would not make it secret. We still keep it
in env so it can be rotated without editing source; abuse protection is
Web3Forms' rate limiting, not secrecy.

## Sender, recipients and replies

- Web3Forms sends the mail on behalf of `TarneemAPP`; the access key determines
  which Web3Forms mailbox receives it.
- `replyto` is set only for messages with a validated `replyEmail`, so pressing
  Reply answers the sender directly. Ratings carry no `replyto`.
- There is no inbound/reply function: the admin answers from their own mailbox.

## Firestore rules

Firestore Security Rules are managed in the Firebase console in this project —
they are not stored in the repo. The `feedbacks` writes are unchanged, so no
rule update is needed for this change. The old function used Admin SDK
privileges and bypassed client rules; nothing does now.

## What was removed

- `functions/` (`index.js`, `package.json`, `.gitignore`) — the
  `notifyNewFeedback` Firestore `onCreate` trigger and its `resend` dependency.
- The `functions` block in `firebase.json`, including its `nodejs20` runtime pin.
- No Cloud Functions deploy is needed and the Blaze upgrade is not required.

## Verification

Never submit real feedback to production just to test. To verify the payload
locally: transpile `src/data/web3forms.ts` with `babel-preset-expo`, stub
`global.fetch`, and call `notifyFeedbackByEmail(...)` — the full body can be
inspected and no network request is made. For a live test, use a Web3Forms key
bound to a test mailbox and submit one message from a dev build.
