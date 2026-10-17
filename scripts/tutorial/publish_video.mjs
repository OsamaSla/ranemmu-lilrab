#!/usr/bin/env node
/**
 * Uploads tutorial/final.mp4 to Firebase Storage and (optionally) writes the
 * resulting download URL into src/data/tutorials.ts so the in-app
 * TutorialVideoCard streams it directly.
 *
 * Requires an existing (admin) Firebase Auth user, because Storage rules
 * normally demand a signed-in caller:
 *
 *   node --env-file=.env.local scripts/tutorial/publish_video.mjs \
 *        --email you@example.com --password 'secret'
 *
 * Or set FIREBASE_ADMIN_EMAIL / FIREBASE_ADMIN_PASSWORD in the environment.
 * Flags:
 *   --file <path>   video to upload (default tutorial/final.mp4)
 *   --remote <key>  storage path         (default tutorial/final.mp4)
 *   --no-patch      do not touch src/data/tutorials.ts
 *   --dry-run       do everything except the upload
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return def;
  const next = argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
};
const has = (name) => argv.includes(`--${name}`);

const file = resolve(flag('file', 'tutorial/final.mp4'));
const remote = flag('remote', 'tutorial/final.mp4');
const dry = has('dry-run');
const patch = !has('no-patch');

const env = process.env;
const config = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

const email = flag('email', env.FIREBASE_ADMIN_EMAIL);
const password = flag('password', env.FIREBASE_ADMIN_PASSWORD);

if (!config.apiKey || !config.projectId || !config.storageBucket) {
  console.error('Missing EXPO_PUBLIC_FIREBASE_* — run with: node --env-file=.env.local ...');
  process.exit(1);
}
if (!email || !password || email === true || password === true) {
  console.error('Missing admin credentials. Pass --email/--password or set FIREBASE_ADMIN_EMAIL / FIREBASE_ADMIN_PASSWORD.');
  process.exit(1);
}

const size = statSync(file).size;
console.log(`upload: ${basename(file)} (${(size / 1024 / 1024).toFixed(1)} MB) -> gs://${config.storageBucket}/${remote}`);
if (dry) {
  console.log('dry run — nothing uploaded.');
  process.exit(0);
}

const app = initializeApp(config);
const auth = getAuth(app);
const storage = getStorage(app);

await signInWithEmailAndPassword(auth, email, password);
console.log(`signed in as ${email}`);

const bytes = readFileSync(file);
const task = uploadBytesResumable(ref(storage, remote), bytes, {
  contentType: 'video/mp4',
  cacheControl: 'public, max-age=31536000, immutable',
});

await new Promise((res, rej) => {
  task.on('state_changed',
    (s) => {
      const pct = ((s.bytesTransferred / s.totalBytes) * 100).toFixed(0);
      process.stdout.write(`\r  ${pct}%   `);
    },
    rej,
    res);
});
process.stdout.write('\r  100%\n');

const url = await getDownloadURL(task.snapshot.ref);
console.log(`\nURL:\n${url}\n`);

if (patch) {
  const ts = resolve('src/data/tutorials.ts');
  const src = readFileSync(ts, 'utf8');
  const out = src.replace(
    /export const TUTORIAL_MP4_URL: string = '[^']*';/,
    `export const TUTORIAL_MP4_URL: string = '${url}';`,
  );
  if (out === src) {
    console.warn('! could not find TUTORIAL_MP4_URL in src/data/tutorials.ts — set it manually.');
  } else {
    writeFileSync(ts, out);
    console.log('patched src/data/tutorials.ts (TUTORIAL_MP4_URL)');
  }
}

process.exit(0);
