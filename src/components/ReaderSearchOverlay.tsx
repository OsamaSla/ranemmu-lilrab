/**
 * Floating search opened from the reader's toolbar.
 *
 * The bar is split in two: a wide field for a hymn number or words, and a
 * compact book picker (one book, or every book). It deliberately stays over
 * the reader instead of pushing a route — picking a result swaps the hymn in
 * place, and closing returns to the same stanza the reader was on.
 *
 * Results mirror the library search: a number stays a summary lookup, free
 * text matches titles immediately and the lyrics once every chunk is loaded.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { FilterSelect } from './FilterSelect';
import { HymnRow } from './HymnRow';
import { areAllChunksLoaded, ensureAllChunks } from '../data/chunks';
import { getBooks, getCorpus, getSummaries } from '../data/loader';
import { normalizeText } from '../data/normalize';
import { searchHymns } from '../data/search';
import type { BookId, HymnSummary } from '../data/types';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../theme/tokens';

interface ReaderSearchOverlayProps {
  onClose: () => void;
  onSelect: (id: string) => void;
  /** Book of the hymn being read; the picker starts here. */
  currentBook: BookId;
}

/** Convert Arabic-Indic digits so a printed number can be typed on any keyboard. */
function westernDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x0660 + 48),
  );
}

export function ReaderSearchOverlay({ onClose, onSelect, currentBook }: ReaderSearchOverlayProps) {
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<BookId | 'all'>(currentBook);
  const [chunkVersion, setChunkVersion] = useState(0);

  const books = useMemo(() => getBooks(), []);
  const activeBook = scope === 'all' ? undefined : scope;
  // chunkVersion retriggers this after the lyrics finish loading.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const summaries = useMemo(() => getSummaries(activeBook), [activeBook, chunkVersion]);

  const trimmed = query.trim();
  const needle = normalizeText(trimmed);
  const isNumberQuery = /^\d+$/.test(needle);
  const wantsLyrics = needle.length >= 2 && !isNumberQuery;

  const titleMatches = useMemo(() => {
    if (!needle) return [];
    if (isNumberQuery) {
      const digits = needle.replace(/^0+(?=\d)/, '');
      const exact = summaries.filter((s) => String(s.number) === digits);
      if (exact.length > 0) return exact;
      return summaries.filter((s) => String(s.number).startsWith(digits));
    }
    return summaries.filter((s) => normalizeText(s.title).includes(needle));
  }, [summaries, needle, isNumberQuery]);

  useEffect(() => {
    if (!wantsLyrics) return;
    let active = true;
    ensureAllChunks()
      .then(() => {
        if (active) setChunkVersion((n) => n + 1);
      })
      .catch(() => {
        /* Title results stay usable if a chunk fails to load. */
      });
    return () => {
      active = false;
    };
  }, [wantsLyrics]);

  const lyricsReady = areAllChunksLoaded();
  const lyricsLoading = wantsLyrics && !lyricsReady;

  const results = useMemo<HymnSummary[]>(() => {
    if (!trimmed) return [];
    const seen = new Set(titleMatches.map((s) => s.id));
    const rows = [...titleMatches];
    if (wantsLyrics && lyricsReady) {
      const byId = new Map(summaries.map((s) => [s.id, s]));
      for (const hit of searchHymns(getCorpus(activeBook), trimmed, 200)) {
        if (hit.inTitle || seen.has(hit.hymn.id)) continue;
        const summary = byId.get(hit.hymn.id);
        if (!summary) continue;
        seen.add(hit.hymn.id);
        rows.push(summary);
        if (rows.length >= 40) break;
      }
    }
    return rows.slice(0, 40);
  }, [trimmed, titleMatches, wantsLyrics, lyricsReady, summaries, activeBook]);

  const pickerWidth = width >= 480 ? 170 : 112;
  // A compact floating bar, not a full-width sheet: 520 px on desktop, and a
  // 24 px gutter on phones. Centered so wide screens keep it near the reader.
  const panelWidth = Math.min(width - spacing.xl * 2, 520);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('search.clear')}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          style={{
            position: 'absolute',
            top: insets.top + spacing.md,
            left: (width - panelWidth) / 2,
            width: panelWidth,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.md,
            maxHeight: '76%',
          }}>
          {/* Wider search field + narrower book picker, as one floating bar. */}
          <View style={{ flexDirection: direction.row, alignItems: 'center', gap: spacing.sm }}>
            <View
              style={{
                flex: 1,
                flexDirection: direction.row,
                alignItems: 'center',
                backgroundColor: colors.surfaceMuted,
                borderRadius: radius.pill,
                paddingHorizontal: spacing.md,
                height: 50,
              }}>
              <MaterialCommunityIcons name="magnify" size={21} color={colors.textMuted} />
              <TextInput
                value={query}
                autoFocus
                onChangeText={(text) => setQuery(westernDigits(text))}
                placeholder={t('search.placeholder')}
                placeholderTextColor={colors.textMuted}
                returnKeyType="search"
                underlineColorAndroid="transparent"
                style={{
                  flex: 1,
                  marginHorizontal: spacing.sm,
                  color: colors.text,
                  fontFamily,
                  fontSize: 17,
                  writingDirection: direction.dir,
                  textAlign: direction.textAlign,
                  // No browser focus ring or Android underline: the field is
                  // the whole frame and the panel edge is only a surface.
                  // `solid` + 0 width is required: Chromium still paints its
                  // platform ring when the style is left as `auto`.
                  outlineStyle: 'solid',
                  outlineWidth: 0,
                  outlineColor: 'transparent',
                }}
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel={t('search.clear')}
                  hitSlop={8}
                  style={{ padding: spacing.xs }}>
                  <MaterialCommunityIcons name="close-circle" size={22} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <FilterSelect
              title={t('book.choose')}
              icon="book-open-page-variant"
              options={[
                { value: 'all', label: t('book.all'), count: books.reduce((sum, b) => sum + b.count, 0) },
                ...books.map((b) => ({
                  value: b.id,
                  label: t(`book.${b.id}` as const),
                  count: b.count,
                })),
              ]}
              value={scope}
              onChange={(value) => setScope(value === 'all' ? 'all' : (value as BookId))}
              flat
              style={{ width: pickerWidth }}
            />
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={8}
              style={{ padding: spacing.xs, outlineStyle: 'solid', outlineWidth: 0 }}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {trimmed ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: spacing.sm }}
              style={{
                flexGrow: 0,
                flexShrink: 1,
                marginTop: spacing.sm,
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
              }}>
              {results.length > 0 ? (
                <>
                  <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>
                    {`${results.length} ${t('search.resultCount')}`}
                  </AppText>
                  {results.map((hymn) => (
                    <HymnRow
                      key={hymn.id}
                      hymn={hymn}
                      showStar={false}
                      highlight={isNumberQuery ? undefined : trimmed}
                      subtitle={
                        scope === 'all'
                          ? t(`book.${hymn.book ?? 'main'}` as const)
                          : hymn.primaryTopic
                            ? t(`topic.${hymn.primaryTopic}` as const)
                            : undefined
                      }
                      onPress={() => onSelect(hymn.id)}
                    />
                  ))}
                </>
              ) : (
                <AppText variant="body" center color={colors.textMuted} style={{ paddingVertical: spacing.xl }}>
                  {lyricsLoading ? t('search.lyricsLoading') : t('search.noResults')}
                </AppText>
              )}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
