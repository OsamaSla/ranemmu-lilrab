/**
 * Per-user library state: favourites and reading history.
 *
 * Both are keyed by hymn id rather than storing hymn text, so the content
 * pipeline can replace the corpus without invalidating saved state.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** How many entries the recents list keeps before dropping the oldest. */
export const RECENTS_LIMIT = 60;

export interface RecentEntry {
  id: string;
  /** Epoch milliseconds of the most recent open. */
  at: number;
}

interface LibraryState {
  favorites: string[];
  recents: RecentEntry[];

  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  /** Records an open, moving the hymn to the front of the recents list. */
  touchRecent: (id: string) => void;
  clearRecents: () => void;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recents: [],

      isFavorite: (id) => get().favorites.includes(id),

      toggleFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((existing) => existing !== id)
            : [id, ...state.favorites],
        })),

      touchRecent: (id) =>
        set((state) => ({
          recents: [{ id, at: Date.now() }, ...state.recents.filter((e) => e.id !== id)].slice(
            0,
            RECENTS_LIMIT,
          ),
        })),

      clearRecents: () => set({ recents: [] }),
    }),
    {
      name: 'helmenarnam.library',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
