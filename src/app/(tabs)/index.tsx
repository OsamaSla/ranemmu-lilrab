/**
 * الرئيسية — the landing screen: pick a book to open its library.
 *
 * The three books are displayed in a horizontal carousel with 3D perspective:
 * the front book is full size, while background books show smaller with scale
 * transforms. Cards have press animations and checkmarks for the selected book.
 * Horizontal scrolling pans through books, maintaining tap-to-open functionality.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image as RNImage,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { getBooks, getSummaries } from '../../data/loader';
import type { BookId, HymnSummary } from '../../data/types';
import type { TranslationKey } from '../../i18n';
import { useCorpusVersion } from '../../store/corpus';
import { useLibrary } from '../../store/library';
import { useSettings } from '../../store/settings';
import { radius, shadow, spacing } from '../../theme/tokens';

/** Cover art per book, shown as it looks on the shelf. */
const BOOK_COVERS: Record<BookId, number> = {
  main: require('../../../assets/images/book-cover.jpg'),
  taranim: require('../../../assets/images/book-cover-taranim.jpg'),
  book3: require('../../../assets/images/book-cover-halum.jpg'),
};

/** Per-book accent, matching the number badge colours in `HymnRow`. */
const BOOK_ACCENTS: Record<BookId, string> = {
  main: '#C8A84D',
  taranim: '#8A9A87',
  book3: '#65AAC5',
};

/** Shared width cap for the hero row and the card grid. */
const CONTENT_MAX = 960;
/** Cards stay book-shaped; beyond this width they scale the cover too much. */
const CARD_MAX = 262;
const CARD_GAP = spacing.lg;
/** Cover width / height, matching the printed covers (132 × 190). */
const COVER_RATIO = 0.7;

/**
 * The four destinations a reader reaches for most, pinned above the book grid.
 * Literal routes so Expo Router's typed-routes union can check them.
 */
const QUICK_ACTIONS = [
  { icon: 'magnify', label: 'home.quickSearch', route: '/library' },
  { icon: 'star-outline', label: 'home.quickFavorites', route: '/favorites' },
  { icon: 'playlist-play', label: 'home.quickSetlist', route: '/setlist' },
  { icon: 'help-circle-outline', label: 'home.quickHelp', route: '/help' },
] as const satisfies readonly {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: TranslationKey;
  route: string;
}[];

/** Lift applied on web hover — `shadow.card` is the resting state. */
const HOVER_SHADOW = { boxShadow: '0 14px 34px rgba(11, 42, 48, 0.22)' };

/** Type for book data returned by getBooks() */
type BookData = { id: BookId; count: number; hasEn: boolean; hasDe: boolean; hasHe: boolean };

/** Props for the circular book carousel component. */
interface CircularCarouselProps {
  books: BookData[];
  selectedBook: BookId | null;
  width: number;
  onPress: (id: BookId) => void;
  t: (key: TranslationKey) => string;
  colors: { textMuted: string };
}

/** Circular book carousel component that displays books with 3D perspective transforms. */
function CircularCarousel({ books, selectedBook, width, onPress, t, colors }: CircularCarouselProps) {
  const [scrollX] = useState(() => new Animated.Value(0));

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: Platform.OS !== 'web' }
  );

  const ITEM_WIDTH = CARD_MAX * 0.85;

  return (
    <View
      style={{
        width: '100%',
        height: CARD_MAX * 1.5,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: width / 2 - CARD_MAX / 2,
        }}>
        {books.map((b, index) => {
          const inputRange = [
            (index - 1) * ITEM_WIDTH,
            index * ITEM_WIDTH,
            (index + 1) * ITEM_WIDTH,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1, 0.8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
            extrapolate: 'clamp',
          });

          const zIndex = scrollX.interpolate({
            inputRange,
            outputRange: [0, 10, 0],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={b.id}
              style={{
                width: CARD_MAX,
                alignItems: 'center',
                marginHorizontal: -CARD_MAX * 0.15,
                zIndex,
              }}>
              <Animated.View
                style={{
                  transform: [{ scale }],
                  opacity,
                  width: CARD_MAX,
                  alignItems: 'center',
                }}>
                <BookCard
                  id={b.id}
                  name={t(`book.${b.id}` as const)}
                  count={b.count}
                  unit={t('home.hymnUnit')}
                  languages={[
                    ...(b.hasEn ? ['EN'] : []),
                    ...(b.hasDe ? ['DE'] : []),
                    ...(b.hasHe ? ['HE'] : []),
                  ]}
                  selected={b.id === selectedBook}
                  width={CARD_MAX}
                  onPress={() => onPress(b.id)}
                />
              </Animated.View>
              <AppText
                variant="caption"
                color={colors.textMuted}
                style={{
                  marginTop: spacing.xs,
                  fontWeight: selectedBook === b.id ? '600' : '400',
                }}>
                {t(`book.${b.id}` as const)}
              </AppText>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

/** One metadata pill under a book title. */
function MetaBadge({
  label,
  icon,
  compact = false,
}: {
  label: string;
  icon?: 'music-note' | 'check-circle';
  /** Language tags sit three-in-a-row on narrow cards, so they run tighter. */
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const { direction } = useT();
  // The count label is Arabic prose; only the two-letter language codes are
  // tracked out, where letter-spacing reads as a deliberate tag.
  const isCode = /^[A-Z]+$/.test(label);
  return (
    <View
      style={{
        flexDirection: direction.row,
        alignItems: 'center',
        gap: compact ? 2 : 4,
        paddingHorizontal: compact ? 5 : spacing.sm,
        paddingVertical: compact ? 2 : 3,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={compact ? 9 : 11}
          color={icon === 'check-circle' ? colors.accent : colors.textMuted}
        />
      ) : null}
      <AppText
        variant="caption"
        color={colors.textMuted}
        style={{
          fontSize: compact ? 9.5 : 11,
          lineHeight: compact ? 12 : 15,
          fontWeight: '700',
          letterSpacing: isCode && !compact ? 0.5 : 0,
        }}>
        {label}
      </AppText>
    </View>
  );
}

interface BookCardProps {
  id: BookId;
  name: string;
  count: number;
  unit: string;
  languages: string[];
  selected: boolean;
  width: number;
  onPress: () => void;
}

/**
 * One book card. Motion is local to the card (scale is an `Animated.Value`),
 * so hovering a card never re-renders the grid or the hero.
 */
function BookCard({ id, name, count, unit, languages, selected, width, onPress }: BookCardProps) {
  const { colors, type, fontFamilyBold } = useTheme();
  const { direction } = useT();
  const [scale] = useState(() => new Animated.Value(1));
  const hovered = useRef(false);
  const [hovering, setHovering] = useState(false);
  const accent = BOOK_ACCENTS[id];

  const animate = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: Platform.OS !== 'web',
      friction: 9,
      tension: 120,
    }).start();

  const onHoverIn = () => {
    hovered.current = true;
    setHovering(true);
    animate(1.035);
  };

  const onHoverOut = () => {
    hovered.current = false;
    setHovering(false);
    animate(1);
  };

  return (
    <Animated.View
      style={{
        width,
        borderRadius: radius.lg + 4,
        transform: [{ scale }],
        ...(hovering ? HOVER_SHADOW : shadow.card),
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[name, `${count} ${unit}`, ...languages].join(' · ')}
        accessibilityState={{ selected }}
        onPress={onPress}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(hovered.current ? 1.035 : 1)}
        android_ripple={{ color: colors.border }}
        style={{
          borderRadius: radius.lg + 4,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? accent : colors.border,
          backgroundColor: colors.surface,
          overflow: 'hidden',
          cursor: 'pointer',
        }}>
        <View style={{ width: '100%', aspectRatio: COVER_RATIO, backgroundColor: colors.surfaceMuted }}>
          <RNImage source={BOOK_COVERS[id]} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          {selected ? (
            <View
              style={{
                position: 'absolute',
                top: spacing.sm,
                ...(direction.isRTL ? { left: spacing.sm } : { right: spacing.sm }),
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: accent,
              }}>
              <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} />
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: spacing.md, paddingVertical: 10, borderTopWidth: 2, borderTopColor: accent }}>
          <AppText
            variant="heading"
            center
            numberOfLines={2}
            style={{
              fontFamily: fontFamilyBold,
              // Phone cards are only ~160px wide and the book names fit one
              // line there, so reserving a second line just lengthened every
              // card. Wide cards keep the two-line reserve for i18n titles.
              minHeight: Math.round(type.heading * 1.5) * (width < 200 ? 1 : 2),
            }}>
            {name}
          </AppText>
          <View style={{ alignItems: 'center', gap: 4, marginTop: 3 }}>
            <MetaBadge icon="music-note" label={`${count} ${unit}`} />
            <View style={{ flexDirection: direction.row, flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
              {languages.map((code) => (
                <MetaBadge key={code} icon="check-circle" label={code} compact />
              ))}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const corpusVersion = useCorpusVersion();
  const book = useSettings((s) => s.book);
  const setBook = useSettings((s) => s.setBook);
  const recents = useLibrary((s) => s.recents);
  const books = useMemo(() => {
    void corpusVersion; // getBooks() reads a mutable cache.
    return getBooks();
  }, [corpusVersion]);

  // The three most recently opened hymns, resolved against the current corpus
  // (stale ids drop out after a content rebuild). Shown as "Continue reading".
  const recentHymns = useMemo(() => {
    void corpusVersion; // getSummaries() reads a mutable cache.
    const byId = new Map(getSummaries().map((s) => [s.id, s]));
    const resolved: HymnSummary[] = [];
    for (const entry of recents) {
      const summary = byId.get(entry.id);
      if (summary) resolved.push(summary);
      if (resolved.length >= 3) break;
    }
    return resolved;
  }, [recents, corpusVersion]);

  const total = books.reduce((sum, b) => sum + b.count, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Brand header. The notes artwork is a tinted watermark, so it never
          competes with the title on small screens. */}
      <View style={{ backgroundColor: colors.primaryDeep, overflow: 'hidden' }}>
        <RNImage
          source={require('../../../assets/images/home-notes.png')}
          resizeMode="contain"
          tintColor={colors.onPrimary}
          style={{
            position: 'absolute',
            top: -18,
            ...(direction.isRTL ? { left: -50 } : { right: -50 }),
            width: 300,
            height: 150,
            opacity: 0.14,
          }}
        />
        <View
          style={{
            width: '100%',
            maxWidth: CONTENT_MAX,
            alignSelf: 'center',
            paddingTop: insets.top + spacing.md,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.xl,
            flexDirection: direction.row,
            alignItems: 'center',
            gap: spacing.md,
          }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.onPrimary,
            }}>
            <MaterialCommunityIcons name="music-clef-treble" size={24} color={colors.primaryDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title" color={colors.onPrimary} numberOfLines={1} style={{ fontWeight: '700' }}>
              {t('appName')}
            </AppText>
            <AppText variant="caption" color={colors.onPrimary} numberOfLines={1} style={{ opacity: 0.82 }}>
              {t('home.tagline')}
            </AppText>
          </View>
          <View
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: 5,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.28)',
              backgroundColor: 'rgba(255,255,255,0.16)',
            }}>
            <AppText variant="caption" color={colors.onPrimary} style={{ fontWeight: '700' }}>
              {total} {t('home.hymnUnit')}
            </AppText>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing.xl,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xxl,
        }}>
        <View style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
          {/* Quick actions — the destinations a reader reaches for most, kept
              above the book grid so they are one tap away on every visit. */}
          <View
            style={{
              flexDirection: direction.row,
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: spacing.sm,
              marginBottom: spacing.xl,
            }}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => router.push(action.route)}
                accessibilityRole="button"
                accessibilityLabel={t(action.label)}
                style={({ pressed }) => ({
                  flexDirection: direction.row,
                  alignItems: 'center',
                  gap: spacing.xs,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                  minHeight: 44,
                })}>
                <MaterialCommunityIcons name={action.icon} size={18} color={colors.primary} />
                <AppText variant="label" style={{ fontWeight: '600' }}>
                  {t(action.label)}
                </AppText>
              </Pressable>
            ))}
          </View>

          {/* Continue reading — the last three hymns opened, newest first. */}
          {recentHymns.length > 0 ? (
            <View style={{ marginBottom: spacing.xl }}>
              <AppText variant="heading" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                {t('home.continueReading')}
              </AppText>
              <View style={{ gap: spacing.sm }}>
                {recentHymns.map((hymn) => (
                  <Pressable
                    key={hymn.id}
                    onPress={() => router.push(`/hymn/${hymn.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={hymn.title}
                    style={({ pressed }) => ({
                      flexDirection: direction.row,
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                    })}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radius.sm,
                        backgroundColor: colors.surfaceMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <MaterialCommunityIcons name="book-open-variant" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="body" numberOfLines={1} style={{ fontWeight: '600' }}>
                        {hymn.title}
                      </AppText>
                      <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                        {`${t('common.hymnNumber')} ${hymn.number}`}
                      </AppText>
                    </View>
                    <MaterialCommunityIcons
                      name={direction.isRTL ? 'chevron-left' : 'chevron-right'}
                      size={22}
                      color={colors.textMuted}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <AppText variant="title" center style={{ fontWeight: '700' }}>
            {t('home.chooseTitle')}
          </AppText>
          <AppText
            variant="caption"
            center
            color={colors.textMuted}
            style={{ marginTop: spacing.xs }}>
            {t('home.pickHint')}
          </AppText>
          <View
            style={{
              width: 36,
              height: 3,
              borderRadius: 2,
              backgroundColor: colors.primary,
              alignSelf: 'center',
              marginTop: spacing.md,
              marginBottom: spacing.xl,
            }}
          />



          <CircularCarousel
            books={books}
            selectedBook={book}
            width={width}
            onPress={(id) => {
              setBook(id);
              router.push('/library');
            }}
            t={t}
            colors={colors}
          />
        </View>
      </ScrollView>
    </View>
  );
}
