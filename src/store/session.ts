/**
 * Admin session: Firebase email/password auth state.
 *
 * Not persisted by us — Firebase Auth persists the session itself
 * (AsyncStorage on native, localStorage on web). This store just mirrors
 * the current user so screens can gate editing and show who is signed in.
 *
 * The Auth SDK (and the Firebase bootstrap it needs) is imported dynamically.
 * `useCanEdit` subscribes to this store on every screen, including the reader,
 * so a static `firebase/auth` import here would put the whole SDK in every
 * visitor's entry bundle. The dynamism is hidden behind `loadAuth()`.
 */
import { create } from 'zustand';
import type { User } from 'firebase/auth';

import { isFirebaseConfigured } from '../data/firebaseConfig';

type AuthSdk = typeof import('firebase/auth');
type FirebaseModule = typeof import('../data/firebase');

let sdkPromise: Promise<[AuthSdk, FirebaseModule]> | null = null;

/** Loads the Auth SDK once, on the first cloud auth operation. */
function loadAuth(): Promise<[AuthSdk, FirebaseModule]> {
  if (!sdkPromise) {
    sdkPromise = Promise.all([import('firebase/auth'), import('../data/firebase')]);
  }
  return sdkPromise;
}

interface SessionState {
  user: User | null;
  /** True once the auth listener has reported at least once. */
  ready: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Attaches the auth listener; returns the unsubscribe function. */
  init: () => () => void;
}

export const useSession = create<SessionState>()((set) => ({
  user: null,
  ready: !isFirebaseConfigured,
  error: null,

  signIn: async (email, password) => {
    if (!isFirebaseConfigured) {
      set({ error: 'setup' });
      return false;
    }
    set({ error: null });
    try {
      const [authSdk, firebase] = await loadAuth();
      const auth = firebase.getFirebaseAuth();
      if (!auth) {
        set({ error: 'setup' });
        return false;
      }
      await authSdk.signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch {
      set({ error: 'auth' });
      return false;
    }
  },

  signOut: async () => {
    if (isFirebaseConfigured) {
      try {
        const [authSdk, firebase] = await loadAuth();
        const auth = firebase.getFirebaseAuth();
        if (auth) await authSdk.signOut(auth).catch(() => {});
      } catch {
        /* Offline sign-out still clears the mirrored user below. */
      }
    }
    set({ user: null });
  },

  init: () => {
    if (!isFirebaseConfigured) {
      set({ ready: true });
      return () => {};
    }
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void loadAuth()
      .then(([authSdk, firebase]) => {
        if (cancelled) return;
        const auth = firebase.getFirebaseAuth();
        if (!auth) {
          set({ ready: true });
          return;
        }
        unsubscribe = authSdk.onAuthStateChanged(auth, (user) => {
          set({ user, ready: true, error: null });
        });
      })
      .catch(() => set({ ready: true }));
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  },
}));
