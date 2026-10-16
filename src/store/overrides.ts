/**
 * On-device admin overrides.
 *
 * The bundled corpus is static, so admin edits cannot rewrite it. Instead
 * every confirmed edit lands here (persisted to AsyncStorage) and
 * src/data/loader merges the patches over the bundled records — the change
 * is visible in the reader, lists and search immediately. Edits additionally
 * sync to Firestore (best-effort write-through plus the Publish button),
 * and Firestore patches stream back in as remote overlays, so one admin's
 * save appears on every device within seconds.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { refreshOverlaidCorpus, setDeletedReader, setOverlayReader } from '../data/loader';
import type { Hymn } from '../data/types';

interface OverridesState {
  /** Patches by stable hymn id. Only text-level fields are ever written. */
  overrides: Record<string, Partial<Hymn>>;
  /**
   * Tombstoned hymn ids (admin deletions). Monotonic — never shrunk by
   * sync, only by explicit local clear — so a deleted hymn stays hidden
   * on every device. Persisted like overrides.
   */
  deletedIds: string[];
  /** Bumped on every write so screens re-read the merged corpus. */
  updatedAt: number;

  setOverride: (id: string, patch: Partial<Hymn>) => void;
  removeOverride: (id: string) => void;
  clearAll: () => void;
  markDeleted: (id: string) => void;
  /** Union-merge ids synced from Firestore (remote deletions win by union). */
  mergeDeletedIds: (ids: string[]) => void;
}

export const useOverrides = create<OverridesState>()(
  persist(
    (set) => ({
      overrides: {},
      deletedIds: [],
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
        // Tombstones survive: clearing them would resurrect deleted hymns.
        set((state) => ({ overrides: {}, updatedAt: state.updatedAt + 1 }));
        refreshOverlaidCorpus();
      },

      markDeleted: (id) => {
        set((state) => {
          if (state.deletedIds.includes(id)) return state;
          const next = { ...state.overrides };
          delete next[id];
          return { overrides: next, deletedIds: [...state.deletedIds, id], updatedAt: state.updatedAt + 1 };
        });
        refreshOverlaidCorpus();
      },

      mergeDeletedIds: (ids) => {
        set((state) => {
          const missing = ids.filter((id) => !state.deletedIds.includes(id));
          if (missing.length === 0) return state;
          return {
            deletedIds: [...state.deletedIds, ...missing],
            updatedAt: state.updatedAt + 1,
          };
        });
        refreshOverlaidCorpus();
      },
    }),
    {
      name: 'helmenarnam.overrides',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Loader caches must drop whenever the patch set changes, including
      // the rehydrate that runs at startup — otherwise screens memoised on
      // the initial (empty) patch set keep showing unedited records until
      // the next local edit bumps them.
      onRehydrateStorage: () => (state) => {
        setOverlayReader(() => useOverrides.getState().overrides);
        if (
          state &&
          (Object.keys(state.overrides ?? {}).length > 0 || (state.deletedIds ?? []).length > 0)
        ) {
          useOverrides.setState((s) => ({ ...s, updatedAt: s.updatedAt + 1 }));
          refreshOverlaidCorpus();
        }
      },
    },
  ),
);

// Feed the loader from this store (one direction only: store -> loader).
setOverlayReader(() => useOverrides.getState().overrides);
setDeletedReader(() => useOverrides.getState().deletedIds);
