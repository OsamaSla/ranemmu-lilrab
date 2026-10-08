/**
 * User settings, persisted to AsyncStorage.
 *
 * `theme` is separate from the OS colour scheme so a reader can force dark
 * chrome while fullscreen reading stays black-on-white regardless.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_LOCALE, type LocaleCode } from '../i18n';
import { DEFAULT_FONT_ID } from '../theme/fonts';
import type { ThemeName } from '../theme/tokens';

/** Reader text size bounds, in points. */
export const READER_SIZE_MIN = 14;
export const READER_SIZE_MAX = 40;
export const READER_SIZE_STEP = 2;

/** App chrome text size bounds, as a scale applied on top of the type scale. */
export const APP_SCALE_MIN = 0.85;
export const APP_SCALE_MAX = 1.3;
export const APP_SCALE_STEP = 0.05;

export type ThemePreference = ThemeName | 'system';

interface SettingsState {
  theme: ThemePreference;
  locale: LocaleCode;
  /** Chosen from FONT_FAMILIES; used for hymn text and app chrome. */
  fontFamily: string;
  /** Multiplier applied to the type scale for app chrome. */
  appScale: number;
  /** Point size for hymn text. */
  readerSize: number;
  /** Admin area PIN. */
  adminPin: string;

  setTheme: (theme: ThemePreference) => void;
  setFontFamily: (id: string) => void;
  setAdminPin: (pin: string) => void;
  setAppScale: (scale: number) => void;
  setReaderSize: (size: number) => void;
  increaseReaderSize: () => void;
  decreaseReaderSize: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Snaps to the step grid so the slider and the +/- buttons never disagree. */
const snap = (value: number, step: number) => Math.round(value / step) * step;

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      locale: DEFAULT_LOCALE,
      fontFamily: DEFAULT_FONT_ID,
      appScale: 1,
      readerSize: 20,
      adminPin: '1234',

      setTheme: (theme) => set({ theme }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setAdminPin: (adminPin) => set({ adminPin }),

      setAppScale: (appScale) =>
        set({ appScale: clamp(snap(appScale, APP_SCALE_STEP), APP_SCALE_MIN, APP_SCALE_MAX) }),

      setReaderSize: (readerSize) =>
        set({ readerSize: clamp(readerSize, READER_SIZE_MIN, READER_SIZE_MAX) }),

      increaseReaderSize: () =>
        set((state) => ({
          readerSize: clamp(state.readerSize + READER_SIZE_STEP, READER_SIZE_MIN, READER_SIZE_MAX),
        })),

      decreaseReaderSize: () =>
        set((state) => ({
          readerSize: clamp(state.readerSize - READER_SIZE_STEP, READER_SIZE_MIN, READER_SIZE_MAX),
        })),
    }),
    {
      name: 'helmenarnam.settings',
      storage: createJSONStorage(() => AsyncStorage),
      // v1: the settings language switch is gone (translations live per
      // hymn in the reader), so any stored non-Arabic locale resets to Arabic.
      // v2: adds the admin PIN (defaults to '1234' for older stores).
      version: 2,
      migrate: (persisted) => ({
        adminPin: '1234',
        ...((persisted ?? {}) as Record<string, unknown>),
        locale: 'ar',
      }),
    },
  ),
);
