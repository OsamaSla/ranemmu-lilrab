/**
 * One place that decides whether the app is running as a phone, a tablet or a
 * desktop. Screens that need a different layout on a phone (the reader, for
 * one) should branch on this instead of repeating their own `width < N`
 * checks, so the breakpoints stay consistent and there is a single knob to
 * change later.
 *
 * Widths come from `useWindowDimensions()`, which is also what the rest of the
 * app measures with. During the static web export there is no viewport, so the
 * width is 0 and the mode is `phone`; that is harmless because hydration is
 * disabled and the client re-renders with the real size (see +html.tsx).
 */
import { useWindowDimensions } from 'react-native';

export type ScreenMode = 'phone' | 'tablet' | 'desktop';

/**
 * Below this width the screen is treated as a phone: one narrow reading
 * column, no side-by-side text. A phone in landscape can exceed it, which is
 * intentional — extra width is what makes a two-column layout readable.
 */
export const PHONE_MAX_WIDTH = 500;

/** Tablets and small laptops. Above this the layout gets the desktop frame. */
export const TABLET_MAX_WIDTH = 1024;

/** Pure helper, so callers that already have a width can avoid the hook. */
export function screenModeFor(width: number): ScreenMode {
  if (width < PHONE_MAX_WIDTH) return 'phone';
  if (width < TABLET_MAX_WIDTH) return 'tablet';
  return 'desktop';
}

export function useScreenMode(): ScreenMode {
  const { width } = useWindowDimensions();
  return screenModeFor(width);
}

/** Convenience for the many places that only care about the phone case. */
export function useIsPhone(): boolean {
  return useScreenMode() === 'phone';
}
