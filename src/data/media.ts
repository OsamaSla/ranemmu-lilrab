/**
 * Per-hymn melody links.
 *
 * Two tiers: a curated `mediaUrl` (YouTube video, SoundCloud track, direct
 * MP3, …) wins whenever an admin has set one; otherwise the reader falls
 * back to a YouTube search for the hymn number + title, so every hymn is
 * listenable with zero data entry.
 */
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import type { Hymn } from './types';

/** True for a non-empty http(s) URL. Shared by admin validation and import checks. */
export function isValidMediaUrl(url: string): boolean {
  return /^https?:\/\/\S+\.\S+/.test(url.trim());
}

/** Curated recording URL, or undefined when the hymn has none (blank counts as none). */
export function curatedMediaUrl(hymn: Pick<Hymn, 'mediaUrl'>): string | undefined {
  const url = hymn.mediaUrl?.trim();
  return url ? url : undefined;
}

/** YouTube search for this hymn's melody — the zero-data fallback for every hymn. */
export function youtubeSearchUrl(hymn: Pick<Hymn, 'number' | 'title'>): string {
  const query = encodeURIComponent(`${hymn.number} ${hymn.title} ترنيمة`);
  return `https://www.youtube.com/results?search_query=${query}`;
}

/** Curated link when set, otherwise the YouTube-search fallback. */
export function resolveHymnMediaUrl(hymn: Pick<Hymn, 'number' | 'title' | 'mediaUrl'>): {
  url: string;
  curated: boolean;
} {
  const curated = curatedMediaUrl(hymn);
  if (curated) return { url: curated, curated: true };
  return { url: youtubeSearchUrl(hymn), curated: false };
}

/**
 * Opens a melody URL in the in-app browser, falling back to the OS handler
 * (YouTube app / external browser) where the in-app browser is unavailable.
 */
export async function openHymnMedia(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Linking.openURL(url).catch(() => {});
  }
}
