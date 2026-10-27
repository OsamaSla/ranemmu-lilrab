/**
 * On-device admin overrides.
 *
 * The bundled corpus is static, so admin edits cannot rewrite it. Instead
 * every confirmed edit lands here (persisted to AsyncStorage) and
 * src/data/loader merges the patches over the bundled records — the change
 * is visible in the reader, lists and search immediately. Edits additionally
 * sync to Firestore (write-through plus the Publish button), and Firestore
 * patches stream back in as remote overlays, so one admin's save appears on
 * every device within seconds.
 *
 * An override is only a *temporary* local copy: every entry carries the time
 * it was written (`savedAt`), and `dropIfNewerInCloud` removes it as soon as a
 * newer cloud version of the same hymn arrives. Without that, a device kept
 * re-applying its own old copy forever — published from the PC, edited on the
 * phone, and the PC still showed the pre-edit text.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { refreshOverlaidCorpus, setDeletedReader, setOverlayReader } from '../data/loader';
import type { Hymn } from '../data/types';

interface OverridesState {
  /** Patches by stable hymn id. Only text-level fields are ever written. */
  overrides: Record<string, Partial<Hymn>>;
  /** When each override was written on this device (ISO), for last-write-wins. */
  savedAt: Record<string, string>;
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
  /**
   * Drops local overrides that the cloud has superseded. `cloudStamps` maps a
   * hymn id to the `updatedAt` of the document just received; anything newer
   * than the local write wins (including the removal of a field), so a stale
   * local copy can never mask fresher cloud data.
   */
  dropIfNewerInCloud: (cloudStamps: Record<string, string>) => void;
  markDeleted: (id: string) => void;
  /** Union-merge ids synced from Firestore (remote deletions win by union). */
  mergeDeletedIds: (ids: string[]) => void;
}

export const useOverrides = create<OverridesState>()(
  persist(
    (set, get) => ({
      overrides: {},
      savedAt: {},
      deletedIds: [],
      updatedAt: 0,

      setOverride: (id, patch) => {
        set((state) => ({
          overrides: { ...state.overrides, [id]: { ...state.overrides[id], ...patch } },
          savedAt: { ...(state.savedAt ?? {}), [id]: new Date().toISOString() },
          updatedAt: state.updatedAt + 1,
        }));
        refreshOverlaidCorpus();
      },

      removeOverride: (id) => {
        set((state) => {
          const next = { ...state.overrides };
          const stamps = { ...(state.savedAt ?? {}) };
          delete next[id];
          delete stamps[id];
          return { overrides: next, savedAt: stamps, updatedAt: state.updatedAt + 1 };
        });
        refreshOverlaidCorpus();
      },

      clearAll: () => {
        // Tombstones survive: clearing them would resurrect deleted hymns.
        set((state) => ({ overrides: {}, savedAt: {}, updatedAt: state.updatedAt + 1 }));
        refreshOverlaidCorpus();
      },

      dropIfNewerInCloud: (cloudStamps) => {
        const state = get();
        const overrides = { ...state.overrides };
        const stamps = { ...(state.savedAt ?? {}) };
        let changed = false;
        for (const [id, cloudStamp] of Object.entries(cloudStamps)) {
          if (overrides[id] === undefined || !cloudStamp) continue;
          // Missing savedAt means the entry predates this field (legacy build):
          // it was written by the old publish path, so the cloud wins.
          const localStamp = stamps[id] ?? '';
          if (cloudStamp > localStamp) {
            delete overrides[id];
            delete stamps[id];
            changed = true;
          }
        }
        if (!changed) return;
        set({ overrides, savedAt: stamps, updatedAt: state.updatedAt + 1 });
        refreshOverlaidCorpus();
      },

      markDeleted: (id) => {
        set((state) => {
          if (state.deletedIds.includes(id)) return state;
          const next = { ...state.overrides };
          const stamps = { ...(state.savedAt ?? {}) };
          delete next[id];
          delete stamps[id];
          return {
            overrides: next,
            savedAt: stamps,
            deletedIds: [...state.deletedIds, id],
            updatedAt: state.updatedAt + 1,
          };
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
