/**
 * Worship setlist — user-named categories, each holding an ordered hymn row.
 *
 * A category is a group for a place, an occasion, a feast — whatever the leader
 * needs. The rows are stored locally (../store/setlist) and travel in a shared
 * link as both a flat `ids` list (for the reader's prev/next within one group)
 * and a `groups` list carrying the category names and their hymn ids.
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
import { SetlistCategoryPicker } from '../../components/SetlistCategoryPicker';
import { Toast } from '../../components/Toast';
import { areAllChunksLoaded, ensureAllChunks } from '../../data/chunks';
import { getCorpus, getSummaries } from '../../data/loader';
import { normalizeText } from '../../data/normalize';
import { encodeSetGroups, encodeSetIds, parseSetGroups, parseSetIds } from '../../data/setlist';
import { ensureSearchIndex, isSearchIndexReady, searchHymns, titleKey } from '../../data/search';
import type { HymnSummary } from '../../data/types';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useCorpusVersion } from '../../store/corpus';
import { useSetlist } from '../../store/setlist';
import { confirmAction } from '../../utils/confirm';
import { noFocusRing, radius, spacing } from '../../theme/tokens';

// Same canonical origin the rest of the app shares (see more.tsx). A bare
// title is useless to a recipient, so the share sheet always carries the URL.
const APP_SITE_URL = 'https://ranemmu-lilrab.web.app/';

/** Shared groups carry names, not local ids; give each one a stable local id. */
const groupId = () => `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/** Arabic-Indic and extended digits can be typed on any keyboard. */
function westernDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - (ch <= '\u0669' ? 0x0660 : 0x06F0) + 48),
  );
}

export default function SetlistScreen() {
  const router = useRouter();
  const { ids: idsParam, groups: groupsParam } = useLocalSearchParams<{ ids?: string; groups?: string }>();
  const { t, direction } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const categories = useSetlist((s) => s.categories);
  const activeId = useSetlist((s) => s.activeId);
  const setActive = useSetlist((s) => s.setActive);
  const addCategory = useSetlist((s) => s.addCategory);
  const renameCategory = useSetlist((s) => s.renameCategory);
  const removeCategory = useSetlist((s) => s.removeCategory);
  const add = useSetlist((s) => s.add);
  const remove = useSetlist((s) => s.remove);
  const move = useSetlist((s) => s.move);
  const clearCategory = useSetlist((s) => s.clearCategory);
  const setCategories = useSetlist((s) => s.setCategories);

  const corpusVersion = useCorpusVersion();

  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const active = categories.find((c) => c.id === activeId) ?? categories[0];
  const ids = active?.ids ?? [];

  // A shared link is the source of truth on open; later local edits win.
  useEffect(() => {
    const sharedGroups = parseSetGroups(groupsParam);
    if (sharedGroups?.length) {
      setCategories(sharedGroups.map((group) => ({ id: groupId(), name: group.name, ids: group.ids })));
      return;
    }
    const shared = parseSetIds(idsParam);
    if (shared.length) {
      setCategories([{ id: 'default', name: t('setlist.defaultCategory'), ids: shared }]);
    }
  }, [groupsParam, idsParam, setCategories, t]);

  // Titles are instant from the summaries; lyrics come from the lazy chunks.
  const summaries = useMemo(() => {
    void corpusVersion;
    return getSummaries();
  }, [corpusVersion]);
  const deferredQuery = useDeferredValue(query);
  const needle = normalizeText(westernDigits(deferredQuery.trim()));
  const isNumberQuery = /^\d+$/.test(needle);
  const wantsLyrics = needle.length >= 2 && !isNumberQuery;

  useEffect(() => {
    if (!wantsLyrics) return;
    void Promise.all([ensureAllChunks(), ensureSearchIndex()]).catch(() => {
      /* Title results stay usable if a chunk fails to load. */
    });
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
    if (!active) return;
    setToast(add(id, active.id) ? t('setlist.added') : t('setlist.alreadyAdded'));
    setQuery('');
  };

  const shareSetlist = () => {
    const allIds = categories.flatMap((c) => c.ids);
    if (!allIds.length) return;
    const url = `${APP_SITE_URL}setlist?ids=${encodeSetIds(allIds)}&groups=${encodeSetGroups(categories)}`;
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
    if (!active) return;
    void confirmAction(active.name, t('setlist.clearCategoryConfirm'), {
      confirmLabel: t('setlist.clear'),
      destructive: true,
    }).then((ok) => {
      if (ok) clearCategory(active.id);
    });
  };

  const deleteCategory = () => {
    if (!active) return;
    void confirmAction(active.name, t('setlist.deleteCategoryConfirm'), {
      confirmLabel: t('setlist.deleteCategory'),
      destructive: true,
    }).then((ok) => {
      if (ok) removeCategory(active.id);
    });
  };

  const commitRename = () => {
    if (active && renameValue.trim()) renameCategory(active.id, renameValue.trim());
    setRenaming(false);
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
            disabled={!categories.some((c) => c.ids.length)}
            color={colors.onPrimary}
            style={{ opacity: categories.some((c) => c.ids.length) ? 1 : 0.5 }}
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        {/* Categories — one group per place/occasion. */}
        <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>
          {t('setlist.categories')}
        </AppText>
        <View style={{ flexDirection: direction.row, flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              onPress={() => setActive(category.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: category.id === active?.id }}
              style={({ pressed }) => ({
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: category.id === active?.id ? colors.primary : colors.border,
                backgroundColor: category.id === active?.id ? colors.primary : 'transparent',
                opacity: pressed ? 0.7 : 1,
              })}>
              <AppText
                variant="caption"
                color={category.id === active?.id ? colors.onPrimary : colors.text}
                style={{ fontWeight: '700' }}>
                {category.name} ({category.ids.length})
              </AppText>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('setlist.newCategory')}
            style={{
              flexDirection: direction.row,
              alignItems: 'center',
              gap: 2,
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.md,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
            <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
            <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>
              {t('setlist.newCategory')}
            </AppText>
          </Pressable>
        </View>

        {active ? (
          <View style={{ flexDirection: direction.row, gap: spacing.sm, marginBottom: spacing.md }}>
            <IconButton name="pencil-outline" label={t('setlist.rename')} onPress={() => { setRenameValue(active.name); setRenaming(true); }} />
            <IconButton name="delete-outline" label={t('setlist.deleteCategory')} onPress={deleteCategory} />
          </View>
        ) : (
          <AppText variant="body" color={colors.textMuted} center style={{ marginVertical: spacing.xl }}>
            {t('setlist.noCategories')}
          </AppText>
        )}

        {renaming ? (
          <View style={{ flexDirection: direction.row, gap: spacing.sm, alignItems: 'center', marginBottom: spacing.md }}>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              onSubmitEditing={commitRename}
              accessibilityLabel={t('setlist.categoryName')}
              style={[
                {
                  flex: 1,
                  minHeight: 44,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceMuted,
                  color: colors.text,
                  fontSize: 15,
                },
                noFocusRing,
              ]}
            />
            <IconButton name="check" label={t('setlist.rename')} onPress={commitRename} />
          </View>
        ) : null}

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
            editable={Boolean(active)}
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
          {needle && active ? (
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

        {/* The ordered set of the active category. */}
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
                  onPress={() => move(index, -1, active?.id)}
                />
                <IconButton
                  name="arrow-down"
                  label={t('setlist.down')}
                  size={20}
                  disabled={index === rows.length - 1}
                  style={{ opacity: index === rows.length - 1 ? 0.3 : 1 }}
                  onPress={() => move(index, 1, active?.id)}
                />
                <IconButton name="close" label={t('setlist.remove')} size={20} onPress={() => remove(id, active?.id)} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <SetlistCategoryPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(id) => setActive(id)}
      />
      {toast ? <Toast message={toast} onDismiss={dismissToast} bottom={insets.bottom + spacing.lg} /> : null}
    </View>
  );
}
