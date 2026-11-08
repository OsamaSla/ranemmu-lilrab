/**
 * Per-hymn melody links.
 *
 * Two tiers: a curated `mediaUrl` (YouTube video, direct MP3, …) wins
 * whenever an admin has set one; otherwise the reader falls back to a YouTube
 * search for the hymn number + title, so every hymn is listenable with zero
 * data entry.
 *
 * SoundCloud links are rejected on purpose: the bundled data no longer
 * carries them and a cloud override saved before that cleanup must not bring
 * one back on devices. Those hymns fall through to the YouTube search.
 */
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import type { Hymn } from './types';

/** True for a non-empty http(s) URL. Shared by admin validation and import checks. */
export function isValidMediaUrl(url: string): boolean {
  return /^https?:\/\/\S+\.\S+/.test(url.trim());
}

/** True when a curated URL points at SoundCloud (never played by the reader). */
export function isSoundCloudUrl(url: string): boolean {
  return /^https?:\/\/(?:www\.|m\.)?soundcloud\.com\//i.test(url.trim());
}

/** Curated recording URL, or undefined when the hymn has none (blank counts as none). */
function curatedMediaUrl(hymn: Pick<Hymn, 'mediaUrl'>): string | undefined {
  const url = hymn.mediaUrl?.trim();
  if (!url || isSoundCloudUrl(url)) return undefined;
  return url;
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
