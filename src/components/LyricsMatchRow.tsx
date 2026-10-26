/**
 * One full-text search hit: where the query matched inside a hymn's lyrics.
 *
 * The matched span is highlighted in place (with diacritics intact, thanks to
 * the normalisation map in ./data/search), and tapping the row opens the
 * reader on the stanza that contains it.
 */
import { Pressable, Text, View } from 'react-native';

import { AppText } from './AppText';
import { Card } from './Card';
import { highlight } from '../data/search';
import type { SearchMatch } from '../data/types';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../theme/tokens';

interface LyricsMatchRowProps {
  match: SearchMatch;
  onPress: () => void;
}

export function LyricsMatchRow({ match, onPress }: LyricsMatchRowProps) {
  const { colors } = useTheme();
  const { t, direction } = useT();
  const runs = highlight(match.line, match.start, match.end);

  return (
    <Card padded={false} style={{ marginBottom: spacing.sm }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${match.hymn.number} ${match.hymn.title}`}
        android_ripple={{ color: colors.border }}
        style={({ pressed }) => ({ padding: spacing.md, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ flexDirection: direction.row, alignItems: 'center' }}>
          <View
            style={{
              minWidth: 36,
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              alignItems: 'center',
            }}>
            <AppText
              variant="label"
              color={colors.onPrimary}
              useAppFont={false}
              style={{ fontWeight: '700' }}>
              {match.hymn.number}
            </AppText>
          </View>
          <AppText
            variant="caption"
            color={colors.textMuted}
            numberOfLines={1}
            style={{ flex: 1, paddingHorizontal: spacing.sm }}>
            {match.hymn.title}
          </AppText>
          {match.label ? (
            <AppText variant="caption" color={colors.textMuted}>
              {`${t('reader.verseOf')} ${match.label}`}
            </AppText>
          ) : null}
        </View>

        <AppText variant="body" style={{ marginTop: spacing.sm }}>
          {runs
            ? runs.map((run, index) =>
                run.highlighted ? (
                  <Text
                    key={index}
                    style={{ backgroundColor: colors.primary, color: colors.onPrimary }}>
                    {run.text}
                  </Text>
                ) : (
                  run.text
                ),
              )
            : match.line}
        </AppText>
      </Pressable>
    </Card>
  );
}
