/**
 * Legacy admin unlock, for builds where Firebase is not configured.
 *
 * The PIN gate used to be screen-local state inside `admin.tsx`, which meant no
 * other screen could honour it: the reader's "تحرير الترنيمة" button and the
 * admin-edit/admin-add routes were open to anyone. It lives here instead so
 * `useCanEdit()` is the one place that answers "may this visitor edit?".
 *
 * Deliberately **not** persisted: unlocking lasts for the session, exactly like
 * the old `useState` did. Firebase-configured builds ignore this store and gate
 * on a signed-in admin account.
 */
import { create } from 'zustand';

interface AdminGateState {
  unlocked: boolean;
  unlock: () => void;
}

export const useAdminGate = create<AdminGateState>()((set) => ({
  unlocked: false,
  unlock: () => set({ unlocked: true }),
}));
