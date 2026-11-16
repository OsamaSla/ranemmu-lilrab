/**
 * Firebase bootstrap (JS SDK — works in Expo Go, dev builds and web).
 *
 * Config comes from EXPO_PUBLIC_FIREBASE_* env vars (see FIREBASE_SETUP.md
 * and .env.example). When any required value is missing the app runs fully
 * offline on its bundled corpus: every accessor below degrades to null and
 * all cloud features no-op with a clear message instead of crashing.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';

// Re-exported so existing admin callers keep working; readers import the
// boolean from ./firebaseConfig directly and never load this SDK module.
export { isFirebaseConfigured, HYMNS_COLLECTION, DELETED_DOC } from './firebaseConfig';

let app: FirebaseApp | null = null;
let auth: FirebaseAuth.Auth | null = null;
let db: Firestore | null = null;

function getApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

/**
 * Auth instance, or null when unconfigured. Native uses AsyncStorage-backed
 * persistence so the admin stays signed in; web uses the default
 * browser-local persistence.
 *
 * Note: `getReactNativePersistence` ships in the react-native bundler
 * condition of firebase/auth, which TypeScript cannot see — hence the
 * guarded lookup instead of a static import. Missing export simply falls
 * back to in-memory auth.
 */
function reactNativePersistence(): FirebaseAuth.Persistence | undefined {
  try {
    const getter = (
      FirebaseAuth as unknown as {
        getReactNativePersistence?: (storage: unknown) => FirebaseAuth.Persistence;
      }
    ).getReactNativePersistence;
    return typeof getter === 'function' ? getter(AsyncStorage) : undefined;
  } catch {
    return undefined;
  }
}

export function getFirebaseAuth(): FirebaseAuth.Auth | null {
  const a = getApp();
  if (!a) return null;
  if (!auth) {
    if (Platform.OS === 'web') {
      auth = FirebaseAuth.getAuth(a);
    } else {
      try {
        const persistence = reactNativePersistence();
        auth = persistence ? FirebaseAuth.initializeAuth(a, { persistence }) : FirebaseAuth.getAuth(a);
      } catch {
        // Hot-reload double init (or any native quirk): reuse the instance.
        auth = FirebaseAuth.getAuth(a);
      }
    }
  }
  return auth;
}

/** Firestore instance, or null when unconfigured. */
export function getFirebaseDb(): Firestore | null {
  const a = getApp();
  if (!a) return null;
  if (!db) {
    if (Platform.OS === 'web') {
      try {
        db = initializeFirestore(a, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        });
      } catch {
        db = getFirestore(a);
      }
    } else {
      db = getFirestore(a);
    }
  }
  return db;
}
