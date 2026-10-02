/**
 * Live search overlay.
 *
 * Results reference positions as `verse:line` (e.g. ٢:٣) to match the printed
 * book, and matched substrings are highlighted in place. The diacritic- and
 * tatweel-insensitive matching lives in ../data/normalize; the search itself is
 * over the fully loaded corpus, which is synchronous by design.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text as RNText, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '../../components/AppText';
import { EmptyState } from '../../components/EmptyState';
import { getCorpus } from '../../data/loader';
import { toArabicDigits } from '../../data/normalize';
import { highlight, searchHymns } from '../../data/search';
import type { SearchMatch } from '../../data/types';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { radius, spacing } from '../../theme/tokens';

const QUERY_MIN_LENGTH = 1;

export default function SearchScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();
  const [query, setQuery] = useState('');

  const matches = useMemo(() => searchHymns(getCorpus(), query.trim(), 200), [query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View
        style={{
          flexDirection: direction.row,
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl,
          paddingBottom: spacing.md,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          style={{ padding: spacing.xs }}>
          <MaterialCommunityIcons name={direction.isRTL ? 'chevron-right' : 'chevron-left'} size={26} />
        </Pressable>

        <View
          style={{
            flex: 1,
            flexDirection: direction.row,
            alignItems: 'center',
            marginHorizontal: spacing.sm,
            backgroundColor: colors.surfaceMuted,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            height: 44,
          }}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="search"
            style={{
              flex: 1,
              marginHorizontal: spacing.sm,
              color: colors.text,
              fontFamily,
              fontSize: 16,
              writingDirection: direction.dir,
              textAlign: direction.textAlign,
            }}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel={t('search.clear')}
              hitSlop={8}
              style={{ padding: spacing.xs }}>
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={matches}
        keyExtractor={(match, index) =>
          match.inTitle
            ? `title-${match.hymn.id}`
            : `${match.hymn.id}-${match.verseIndex}-${match.lineIndex}-${index}`
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          <EmptyState
            icon={query.trim().length < QUERY_MIN_LENGTH ? 'magnify' : 'text-search'}
            title={
              query.trim().length < QUERY_MIN_LENGTH ? t('search.placeholder') : t('search.noResults')
            }
            hint={query.trim().length >= QUERY_MIN_LENGTH ? t('search.noResultsHint') : undefined}
          />
        }
        renderItem={({ item }) => (
          <SearchResultRow match={item} onPress={() => router.push(`/hymn/${item.hymn.id}`)} />
        )}
      />
    </View>
  );
}

function SearchResultRow({ match, onPress }: { match: SearchMatch; onPress: () => void }) {
  const { colors } = useTheme();
  const { t, direction } = useT();
  const { fontFamily } = useTheme();

  const runs = match.inTitle
    ? [{ text: match.line, highlighted: true }]
    : (highlight(match.line, match.start, match.end) ?? [{ text: match.line, highlighted: false }]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('common.hymnNumber')} ${match.hymn.number}`}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          marginBottom: spacing.sm,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <View style={{ flexDirection: direction.row, alignItems: 'center', marginBottom: spacing.xs }}>
        <View
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            borderRadius: radius.sm,
            backgroundColor: colors.primary,
          }}>
          <AppText variant="caption" color={colors.onPrimary} useAppFont={false} style={{ fontWeight: '700' }}>
            {toArabicDigits(match.hymn.number)}
          </AppText>
        </View>
        <AppText
          variant="label"
          color={colors.textMuted}
          numberOfLines={1}
          style={{ flex: 1, marginHorizontal: spacing.sm }}>
          {match.hymn.title}
        </AppText>
      </View>

      <RNText
        style={{
          color: colors.text,
          fontFamily,
          fontSize: 15,
          lineHeight: 24,
          writingDirection: direction.dir,
          textAlign: direction.textAlign,
        }}>
        {runs.map((run, index) => (
          <RNText
            key={index}
            style={
              run.highlighted
                ? {
                    backgroundColor: colors.accent,
                    color: colors.onPrimary,
                    fontWeight: '700',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }
                : undefined
            }>
            {run.text}
          </RNText>
        ))}
      </RNText>

      {!match.inTitle && match.label ? (
        <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
          {t('reader.verseOf')} {match.label}
        </AppText>
      ) : null}
    </Pressable>
  );
}