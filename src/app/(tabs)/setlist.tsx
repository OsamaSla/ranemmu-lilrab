/**
 * Worship setlist — an ordered, reorderable row of hymns for a service.
 *
 * The row is stored locally (../store/setlist) but also travels in a single
 * `ids` query parameter. Opening a shared `/setlist?ids=…` link loads that row
 * into the store; every hymn opened from here carries the same parameter so the
 * reader's prev/next walks the set instead of the printed book order.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { IconButton } from '../../components/IconButton';
import { Toast } from '../../components/Toast';
import { areAllChunksLoaded, ensureAllChunks } from '../../data/chunks';
import { getCorpus, getSummaries } from '../../data/loader';
import { normalizeText } from '../../data/normalize';
import { encodeSetIds, parseSetIds } from '../../data/setlist';
import { ensureSearchIndex, isSearchIndexReady, searchHymns, titleKey } from '../../data/search';
import type { HymnSummary } from '../../data/types';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useOverrides } from '../../store/overrides';
import { useRemote } from '../../store/remote';
import { useSetlist } from '../../store/setlist';
import { confirmAction } from '../../utils/confirm';
import { noFocusRing, radius, spacing } from '../../theme/tokens';

// Same canonical origin the rest of the app shares (see more.tsx). A bare
// title is useless to a recipient, so the share sheet always carries the URL.
const APP_SITE_URL = 'https://ranemmu-lilrab.web.app/';

/** Arabic-Indic and extended digits can be typed on any keyboard. */
function westernDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - (ch <= '\u0669' ? 0x0660 : 0x06F0) + 48),
  );
}

export default function SetlistScreen() {
  const router = useRouter();
  const { ids: idsParam } = useLocalSearchParams<{ ids?: string }>();
  const { t, direction } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const ids = useSetlist((s) => s.ids);
  const add = useSetlist((s) => s.add);
  const remove = useSetlist((s) => s.remove);
  const move = useSetlist((s) => s.move);
  const loadSet = useSetlist((s) => s.set);
  const clearSet = useSetlist((s) => s.clear);

  const corpusVersion = useOverrides((s) => s.updatedAt);
  const remoteVersion = useRemote((s) => s.updatedAt);

  const [query, setQuery] = useState('');
  const [chunkVersion, setChunkVersion] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  // A shared link is the source of truth on open; later local edits win.
  useEffect(() => {
    const shared = parseSetIds(idsParam);
    if (shared.length) loadSet(shared);
  }, [idsParam, loadSet]);

  // Titles are instant from the summaries; lyrics come from the lazy chunks.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const summaries = useMemo(() => getSummaries(), [corpusVersion, remoteVersion, chunkVersion]);
  const deferredQuery = useDeferredValue(query);
  const needle = normalizeText(westernDigits(deferredQuery.trim()));
  const isNumberQuery = /^\d+$/.test(needle);
  const wantsLyrics = needle.length >= 2 && !isNumberQuery;

  useEffect(() => {
    if (!wantsLyrics) return;
    let active = true;
    Promise.all([ensureAllChunks(), ensureSearchIndex()])
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

  const titleMatches = useMemo(() => {
    if (!needle) return [];
    if (isNumberQuery) {
      const digits = needle.replace(/^0+(?=\d)/, '');
      const exact = summaries.filter((s) => String(s.number) === digits);
      return exact.length > 0 ? exact : summaries.filter((s) => String(s.number).startsWith(digits));
    }
    return summaries.filter((s) => titleKey(s).includes(needle));
  }, [summaries, needle, isNumberQuery]);

  const results = useMemo<HymnSummary[]>(() => {
    if (!needle) return [];
    const seen = new Set(titleMatches.map((s) => s.id));
    const rows = [...titleMatches];
    if (wantsLyrics && areAllChunksLoaded() && isSearchIndexReady()) {
      for (const hit of searchHymns(getCorpus(), deferredQuery.trim(), 100)) {
        if (seen.has(hit.hymn.id)) continue;
        seen.add(hit.hymn.id);
        rows.push(hit.hymn);
        if (rows.length >= 20) break;
      }
    }
    return rows.slice(0, 20);
  }, [needle, titleMatches, wantsLyrics, deferredQuery]);

  const byId = useMemo(() => new Map(summaries.map((s) => [s.id, s])), [summaries]);
  const rows = useMemo(() => ids.map((id) => ({ id, hymn: byId.get(id) })), [ids, byId]);

  const openAt = (id: string) => router.push(`/hymn/${id}?ids=${encodeSetIds(ids)}`);

  const addHymn = (id: string) => {
    setToast(add(id) ? t('setlist.added') : t('setlist.alreadyAdded'));
    setQuery('');
  };

  const shareSetlist = () => {
    if (!ids.length) return;
    const url = `${APP_SITE_URL}setlist?ids=${encodeSetIds(ids)}`;
    const message = t('setlist.shareMessage');
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.share) {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(url)
          .then(() => setToast(t('setlist.linkCopied')))
          .catch(() => setToast(url));
      } else {
        setToast(url);
      }
      return;
    }
    Share.share({ message: `${message}\n${url}`, title: t('setlist.title'), url }).catch(() => {});
  };

  const clearAll = () => {
    void confirmAction(t('setlist.title'), t('setlist.clearConfirm'), {
      confirmLabel: t('setlist.clear'),
      destructive: true,
    }).then((ok) => {
      if (ok) clearSet();
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar
        title={t('setlist.title')}
        showBack
        subtitle={ids.length ? `${t('setlist.count')}: ${ids.length}` : undefined}
        action={
          <IconButton
            name="share-variant"
            label={t('setlist.share')}
            onPress={shareSetlist}
            disabled={!ids.length}
            color={colors.onPrimary}
            style={{ opacity: ids.length ? 1 : 0.5 }}
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {/* Build the set: a number or a few words, across every book. */}
        <Card style={{ marginBottom: spacing.lg }}>
          <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
            {t('setlist.addTitle')}
          </AppText>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('setlist.addPlaceholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('setlist.addTitle')}
            autoCorrect={false}
            style={[
              {
                minHeight: 48,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.canvas,
                color: colors.text,
                fontSize: 16,
              },
              noFocusRing,
            ]}
          />
          {needle ? (
            <View style={{ marginTop: spacing.sm }}>
              {results.length === 0 ? (
                <AppText variant="caption" color={colors.textMuted} style={{ paddingVertical: spacing.sm }}>
                  {t('search.noResults')}
                </AppText>
              ) : (
                results.map((hymn) => (
                  <Pressable
                    key={hymn.id}
                    onPress={() => addHymn(hymn.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('setlist.add')} ${hymn.number} ${hymn.title}`}
                    android_ripple={{ color: colors.border }}
                    style={({ pressed }) => [
                      {
                        flexDirection: direction.row,
                        alignItems: 'center',
                        gap: spacing.sm,
                        paddingVertical: spacing.sm,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}>
                    <MaterialCommunityIcons name="plus-circle-outline" size={22} color={colors.primary} />
                    <AppText variant="label" color={colors.textMuted} useAppFont={false} style={{ minWidth: 40 }}>
                      {hymn.number}
                    </AppText>
                    <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
                      {hymn.title}
                    </AppText>
                  </Pressable>
                ))
              )}
            </View>
          ) : null}
        </Card>

        {/* Set actions. */}
        {ids.length ? (
          <View
            style={{
              flexDirection: direction.row,
              alignItems: 'center',
              gap: spacing.sm,
              marginBottom: spacing.md,
            }}>
            <Card padded={false} style={{ flex: 1 }}>
              <Pressable
                onPress={() => openAt(ids[0])}
                accessibilityRole="button"
                accessibilityLabel={t('setlist.start')}
                android_ripple={{ color: colors.border }}
                style={({ pressed }) => [
                  {
                    flexDirection: direction.row,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing.sm,
                    paddingVertical: spacing.md,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}>
                <MaterialCommunityIcons name="play" size={20} color={colors.primary} />
                <AppText variant="label" style={{ fontWeight: '700' }}>
                  {t('setlist.start')}
                </AppText>
              </Pressable>
            </Card>
            <IconButton name="share-variant" label={t('setlist.share')} onPress={shareSetlist} />
            <IconButton name="delete-outline" label={t('setlist.clear')} onPress={clearAll} />
          </View>
        ) : null}

        {/* The ordered set. */}
        {rows.length === 0 ? (
          <AppText variant="body" color={colors.textMuted} center style={{ marginTop: spacing.xl }}>
            {t('setlist.emptyHint')}
          </AppText>
        ) : (
          rows.map(({ id, hymn }, index) => (
            <Card key={`${id}-${index}`} padded={false} style={{ marginBottom: spacing.sm }}>
              <View
                style={{
                  flexDirection: direction.row,
                  alignItems: 'center',
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                }}>
                <AppText
                  variant="label"
                  color={colors.textMuted}
                  useAppFont={false}
                  style={{ minWidth: 26, textAlign: 'center', fontWeight: '700' }}>
                  {index + 1}
                </AppText>
                <Pressable
                  onPress={() => openAt(id)}
                  accessibilityRole="button"
                  accessibilityLabel={hymn ? `${hymn.number} ${hymn.title}` : id}
                  android_ripple={{ color: colors.border }}
                  style={({ pressed }) => [{ flex: 1, paddingVertical: spacing.sm, opacity: pressed ? 0.6 : 1 }]}>
                  <AppText variant="body" numberOfLines={1}>
                    {hymn ? `${hymn.number}  ${hymn.title}` : id}
                  </AppText>
                </Pressable>
                <IconButton
                  name="arrow-up"
                  label={t('setlist.up')}
                  size={20}
                  disabled={index === 0}
                  style={{ opacity: index === 0 ? 0.3 : 1 }}
                  onPress={() => move(index, -1)}
                />
                <IconButton
                  name="arrow-down"
                  label={t('setlist.down')}
                  size={20}
                  disabled={index === rows.length - 1}
                  style={{ opacity: index === rows.length - 1 ? 0.3 : 1 }}
                  onPress={() => move(index, 1)}
                />
                <IconButton name="close" label={t('setlist.remove')} size={20} onPress={() => remove(id)} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {toast ? <Toast message={toast} onDismiss={dismissToast} bottom={insets.bottom + spacing.lg} /> : null}
    </View>
  );
}
