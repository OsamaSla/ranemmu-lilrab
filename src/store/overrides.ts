/**
 * On-device admin overrides.
 *
 * The bundled corpus is static, so admin edits cannot rewrite it. Instead
 * every confirmed edit lands here (persisted to AsyncStorage) and
 * src/data/loader merges the patches over the bundled records — the change
 * is visible in the reader, lists and search immediately. The PC pipeline
 * stays the source of truth: "export" shares the patch set as JSON and
 * scripts/apply-overrides.mjs merges it into content/hymns-imported.xlsx.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { refreshOverlaidCorpus, setOverlayReader } from '../data/loader';
import type { Hymn } from '../data/types';

interface OverridesState {
  /** Patches by stable hymn id. Only text-level fields are ever written. */
  overrides: Record<string, Partial<Hymn>>;
  /** Bumped on every write so screens re-read the merged corpus. */
  updatedAt: number;

  setOverride: (id: string, patch: Partial<Hymn>) => void;
  removeOverride: (id: string) => void;
  clearAll: () => void;
}

export const useOverrides = create<OverridesState>()(
  persist(
    (set) => ({
      overrides: {},
      updatedAt: 0,

      setOverride: (id, patch) => {
        set((state) => ({
          overrides: { ...state.overrides, [id]: { ...state.overrides[id], ...patch } },
          updatedAt: state.updatedAt + 1,
        }));
        refreshOverlaidCorpus();
      },

      removeOverride: (id) => {
        set((state) => {
          const next = { ...state.overrides };
          delete next[id];
          return { overrides: next, updatedAt: state.updatedAt + 1 };
        });
        refreshOverlaidCorpus();
      },

      clearAll: () => {
        set((state) => ({ overrides: {}, updatedAt: state.updatedAt + 1 }));
        refreshOverlaidCorpus();
      },
    }),
    {
      name: 'helmenarnam.overrides',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Loader caches must drop whenever the patch set changes, including
      // the rehydrate that runs at startup.
      onRehydrateStorage: () => () => {
        setOverlayReader(() => useOverrides.getState().overrides);
      },
    },
  ),
);

// Feed the loader from this store (one direction only: store -> loader).
setOverlayReader(() => useOverrides.getState().overrides);
