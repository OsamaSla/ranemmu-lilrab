/**
 * Admin session: Firebase email/password auth state.
 *
 * Not persisted by us — Firebase Auth persists the session itself
 * (AsyncStorage on native, localStorage on web). This store just mirrors
 * the current user so screens can gate editing and show who is signed in.
 */
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { create } from 'zustand';

import { getFirebaseAuth, isFirebaseConfigured } from '../data/firebase';

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
    const auth = getFirebaseAuth();
    if (!auth) {
      set({ error: 'setup' });
      return false;
    }
    set({ error: null });
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch {
      set({ error: 'auth' });
      return false;
    }
  },

  signOut: async () => {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth).catch(() => {});
    set({ user: null });
  },

  init: () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      set({ ready: true });
      return () => {};
    }
    return onAuthStateChanged(auth, (user) => {
      set({ user, ready: true, error: null });
    });
  },
}));
