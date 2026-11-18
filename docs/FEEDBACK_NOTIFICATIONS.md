# Feedback email notifications (Cloud Functions)

One Firestore-triggered function, `notifyNewFeedback`, sends **one** email to the
admin for every new document in `feedbacks`. The app-side writes are unauthenticated;
this backend only reads the created snapshot and calls Resend.

## One-time setup

1. **Upgrade the Firebase project to the Blaze (pay-as-you-go) plan.** Cloud
   Functions for Firebase is not available on the Spark (free) plan. Billing is
   enabled in the Firebase console, not in this repo.
2. Install the function dependencies (no lockfile is committed):
   ```sh
   cd functions && npm install
   ```
3. Store the Resend key as a Firebase Secret (it is never committed):
   ```sh
   firebase functions:secrets:set RESEND_API_KEY
   ```
   The function declares `secrets: ['RESEND_API_KEY']`; without that declaration
   `process.env.RESEND_API_KEY` is `undefined` even after the command above.
   If the key is unset, the function logs a warning and sends nothing.
4. Set the admin notification address (defaults to `osama.sla@gmail.com`):
   ```sh
   # runtime environment variable (recommended)
   firebase functions:env:set ADMIN_NOTIFY_EMAIL=you@example.com
   ```
   It can also be stored as a secret via
   `firebase functions:secrets:set ADMIN_NOTIFY_EMAIL`; in that case add
   `'ADMIN_NOTIFY_EMAIL'` to the `secrets` array in `functions/index.js` before
   deploying (a declared-but-missing secret fails the deploy).
5. **Runtime** — `firebase.json` already declares
   `"functions": { "source": "functions", "runtime": "nodejs20" }`. v1
   `runWith()` has no `runtime` field, so this is where Node is pinned; change it
   there if you move to Node 22.

## Deploy

From the repo root (`.firebaserc` already points at `ranemmu-lilrab`):

```sh
firebase deploy --only functions
```

**The GitHub workflows do not deploy functions.** `firebase.yml` uses
`FirebaseExtended/action-hosting-deploy@v0` (hosting only) and `pages.yml`
publishes the GitHub Pages mirror, so functions must be deployed manually after
every change to `functions/index.js` or `functions/package.json`.

Verify with `firebase functions:log` and by creating one feedback document from
the app. No emails are sent for pre-existing documents (onCreate trigger only).

## Sender, recipients and replies

- The email is **From: `TarneemAPP <onboarding@resend.dev>`**. This is Resend's
  test sender and can only deliver to the verified email address of the Resend
  account owner — which is the admin notification case here, hence no domain
  verification is needed for this single recipient.
- Subject: `[TarneemAPP] رسالة جديدة` for a message, `[TarneemAPP] تقييم جديد`
  for a rating. The plain-text body contains kind, rating, category, comment,
  replyEmail (when present), createdAt and the document id.
- For `kind: 'message'`, a validated `replyEmail` is sent as the `Reply-To`
  header (the Resend SDK calls it `reply_to`). The admin presses **Reply** in
  their own Gmail and the answer goes straight to the sender. Ratings are
  anonymous and get no Reply-To.
- There is deliberately **no second function** to receive replies: `onboarding@resend.dev`
  cannot receive mail, and arbitrary end users cannot be delivered to by the
  test sender. The admin's own mailbox handles the reply instead.

## Firestore rules

Firestore Security Rules are managed in the Firebase console in this project —
they are not stored in the repo and are not part of this change. If the new
`kind` / `replyEmail` fields need different write validation, updating and
publishing the rules is a **manual** console step. The function itself runs with
Admin SDK privileges and is not affected by client rules.

## Exact `feedbacks` document fields

| Field | Type | Notes |
| --- | --- | --- |
| `rating` | number | 1–5 for ratings; `0` for messages |
| `category` | string | `missing_hymn` \| `translation` \| `bug` \| `other`; `message` for messages |
| `comment` | string | free text (rating ≤500 chars, message ≤1000) |
| `status` | string | `pending` |
| `adminNotes` | string | `''` initially |
| `createdAt` | serverTimestamp | resolved to a Firestore Timestamp on read |
| `kind` | string | `rating` (default, anonymous, no email) or `message` |
| `replyEmail` | string | only for `kind: 'message'`; validated before use as Reply-To |

Rating documents may omit `kind` and `replyEmail`; the function treats any
`kind` other than `message` as `rating` and never sets Reply-To for it.
