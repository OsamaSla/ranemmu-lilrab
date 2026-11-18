/**
 * The worship setlist as user-defined categories (groups of hymn ids).
 *
 * Like favourites and recents, it stores ids rather than hymn text, so a
 * corpus rebuild never invalidates it. Every category keeps its own ordered
 * row of ids; `activeId` is where a plain `add()` lands. The persisted shape
 * used to be a single flat `ids` array — `migrate` lifts that into one
 * category called «عام» so nobody loses a set on upgrade.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SetCategory {
  id: string;
  name: string;
  ids: string[];
}

interface SetlistState {
  categories: SetCategory[];
  activeId: string | null;

  /** Trims the name; a blank name is ignored and an empty id is returned. */
  addCategory: (name: string) => string;
  renameCategory: (id: string, name: string) => void;
  /** Removes the category and clears `activeId` when it was the active one. */
  removeCategory: (id: string) => void;
  setActive: (id: string) => void;
  /**
   * Appends an id to the resolved category. Resolution order is an explicit
   * `categoryId`, then `activeId`, then the first category (auto-creating a
   * default one when there are none). Returns false on a duplicate.
   */
  add: (id: string, categoryId?: string) => boolean;
  remove: (id: string, categoryId?: string) => void;
  /** Swaps the item at `index` with its neighbour; a no-op at either end. */
  move: (index: number, direction: -1 | 1, categoryId?: string) => void;
  /** Empties a category's ids but keeps the category itself. */
  clearCategory: (id: string) => void;
  /** Replaces everything (used when a shared `?groups=` link is opened). */
  setCategories: (categories: SetCategory[]) => void;
  /** Drops all categories and resets `activeId`. */
  clear: () => void;
}

const DEFAULT_CATEGORY_NAME = 'عام';
const LEGACY_CATEGORY_ID = 'default';

/** Stable enough for local keys; collisions across a user's categories are implausible. */
const newCategoryId = () =>
  `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * The store deliberately does not know the corpus' id grammar (that lives in
 * data/setlist.ts). It only discards non-strings, blanks and repeats.
 */
const sanitiseIds = (ids: unknown): string[] => {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of ids) {
    if (typeof value !== 'string') continue;
    const id = value.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
};

const sanitiseCategories = (categories: unknown): SetCategory[] => {
  if (!Array.isArray(categories)) return [];
  const result: SetCategory[] = [];
  const seenIds = new Set<string>();
  for (const value of categories) {
    if (!value || typeof value !== 'object') continue;
    const raw = value as { id?: unknown; name?: unknown; ids?: unknown };
    let id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!id || seenIds.has(id)) id = newCategoryId();
    seenIds.add(id);
    result.push({
      id,
      name: typeof raw.name === 'string' ? raw.name.trim() : '',
      ids: sanitiseIds(raw.ids),
    });
  }
  return result;
};

/** Explicit id → active category → first category → null. */
const resolveCategoryId = (state: SetlistState, categoryId?: string): string | null => {
  const { categories, activeId } = state;
  if (categoryId && categories.some((category) => category.id === categoryId)) return categoryId;
  if (activeId && categories.some((category) => category.id === activeId)) return activeId;
  return categories[0]?.id ?? null;
};

export const useSetlist = create<SetlistState>()(
  persist(
    (setState, get) => ({
      categories: [],
      activeId: null,

      addCategory: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return '';
        const id = newCategoryId();
        setState((state) => ({
          categories: [...state.categories, { id, name: trimmed, ids: [] }],
        }));
        return id;
      },

      renameCategory: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setState((state) => ({
          categories: state.categories.map((category) =>
            category.id === id ? { ...category, name: trimmed } : category,
          ),
        }));
      },

      removeCategory: (id) =>
        setState((state) => {
          const categories = state.categories.filter((category) => category.id !== id);
          if (categories.length === state.categories.length) return state;
          return { categories, activeId: state.activeId === id ? null : state.activeId };
        }),

      setActive: (id) => setState({ activeId: id }),

      add: (id, categoryId) => {
        const hymnId = id.trim();
        if (!hymnId) return false;
        const targetId = resolveCategoryId(get(), categoryId);
        if (!targetId) {
          // No category yet: create the default one and put the hymn straight in.
          const id = newCategoryId();
          setState((state) => ({
            categories: [
              ...state.categories,
              { id, name: DEFAULT_CATEGORY_NAME, ids: [hymnId] },
            ],
            activeId: id,
          }));
          return true;
        }
        const category = get().categories.find((entry) => entry.id === targetId);
        if (!category || category.ids.includes(hymnId)) return false;
        setState((state) => ({
          categories: state.categories.map((entry) =>
            entry.id === targetId ? { ...entry, ids: [...entry.ids, hymnId] } : entry,
          ),
        }));
        return true;
      },

      remove: (id, categoryId) => {
        const hymnId = id.trim();
        const targetId = resolveCategoryId(get(), categoryId);
        if (!targetId) return;
        setState((state) => ({
          categories: state.categories.map((category) =>
            category.id === targetId
              ? { ...category, ids: category.ids.filter((existing) => existing !== hymnId) }
              : category,
          ),
        }));
      },

      move: (index, direction, categoryId) => {
        const targetId = resolveCategoryId(get(), categoryId);
        if (!targetId) return;
        const category = get().categories.find((entry) => entry.id === targetId);
        if (!category) return;
        const target = index + direction;
        if (index < 0 || target < 0 || target >= category.ids.length) return;
        setState((state) => ({
          categories: state.categories.map((entry) => {
            if (entry.id !== targetId) return entry;
            const ids = [...entry.ids];
            [ids[index], ids[target]] = [ids[target], ids[index]];
            return { ...entry, ids };
          }),
        }));
      },

      clearCategory: (id) =>
        setState((state) => ({
          categories: state.categories.map((category) =>
            category.id === id && category.ids.length ? { ...category, ids: [] } : category,
          ),
        })),

      setCategories: (categories) => {
        const sanitised = sanitiseCategories(categories);
        setState((state) => ({
          categories: sanitised,
          activeId:
            state.activeId && sanitised.some((category) => category.id === state.activeId)
              ? state.activeId
              : (sanitised[0]?.id ?? null),
        }));
      },

      clear: () => setState({ categories: [], activeId: null }),
    }),
    {
      name: 'helmenarnam.setlist',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted, _version): SetlistState => {
        const legacy = (persisted ?? {}) as {
          ids?: unknown;
          categories?: unknown;
          activeId?: unknown;
        };
        if (legacy.categories !== undefined) {
          const categories = sanitiseCategories(legacy.categories);
          const activeId =
            typeof legacy.activeId === 'string' &&
            categories.some((category) => category.id === legacy.activeId)
              ? legacy.activeId
              : (categories[0]?.id ?? null);
          return { categories, activeId } as unknown as SetlistState;
        }
        if (Object.prototype.hasOwnProperty.call(legacy, 'ids')) {
          // Old flat set: keep every hymn id, nothing is discarded.
          return {
            categories: [
              { id: LEGACY_CATEGORY_ID, name: DEFAULT_CATEGORY_NAME, ids: sanitiseIds(legacy.ids) },
            ],
            activeId: LEGACY_CATEGORY_ID,
          } as unknown as SetlistState;
        }
        return { categories: [], activeId: null } as unknown as SetlistState;
      },
    },
  ),
);
