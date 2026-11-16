/**
 * The setlist being edited: an ordered row of hymn ids.
 *
 * Like favourites and recents, it stores ids rather than hymn text, so a
 * corpus rebuild never invalidates it. `set` replaces the whole row — that is
 * what loading a shared `?ids=` link does.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SetlistState {
  ids: string[];

  /** Appends an id; returns false when it is already in the set. */
  add: (id: string) => boolean;
  remove: (id: string) => void;
  /** Swaps the item at `index` with its neighbour; a no-op at either end. */
  move: (index: number, direction: -1 | 1) => void;
  /** Replaces the whole set (used when a shared link is opened). */
  set: (ids: string[]) => void;
  clear: () => void;
}

const sameRow = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, index) => id === b[index]);

export const useSetlist = create<SetlistState>()(
  persist(
    (setState, get) => ({
      ids: [],

      add: (id) => {
        if (get().ids.includes(id)) return false;
        setState((state) => ({ ids: [...state.ids, id] }));
        return true;
      },

      remove: (id) =>
        setState((state) => ({ ids: state.ids.filter((existing) => existing !== id) })),

      move: (index, direction) =>
        setState((state) => {
          const target = index + direction;
          if (index < 0 || target < 0 || target >= state.ids.length) return state;
          const ids = [...state.ids];
          [ids[index], ids[target]] = [ids[target], ids[index]];
          return { ids };
        }),

      set: (ids) => {
        if (sameRow(get().ids, ids)) return;
        setState({ ids: [...ids] });
      },

      clear: () => setState({ ids: [] }),
    }),
    {
      name: 'helmenarnam.setlist',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
