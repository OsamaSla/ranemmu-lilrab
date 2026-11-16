/**
 * Firebase configuration only — no SDK imports.
 *
 * Roughly ten modules need just `isFirebaseConfigured` to decide whether to
 * show an admin affordance. Importing that boolean from ./firebase used to
 * evaluate `firebase/app`, `firebase/auth` and `firebase/firestore` in every
 * reader's entry chunk. This module is env-only, so those readers can ask the
 * question without downloading the SDK; the SDK lives behind dynamic imports
 * in ./firebase and is only loaded when a cloud feature is actually used.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

export { firebaseConfig };

/** True once the owner has filled in the env config (see FIREBASE_SETUP.md). */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

/** Firestore collection holding one document per hymn, keyed by hymn id. */
export const HYMNS_COLLECTION = 'hymns';

/** Firestore document carrying the shared tombstone set. */
export const DELETED_DOC = 'deleted';
