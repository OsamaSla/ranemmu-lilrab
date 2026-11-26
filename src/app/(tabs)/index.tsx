/**
 * الرئيسية — the landing screen: pick a book to open its library.
 *
 * The three books are displayed in a horizontal carousel with 3D perspective:
 * the front book is full size, while background books show smaller with scale
 * transforms. Cards have press animations and checkmarks for the selected book.
 * Horizontal scrolling pans through books, maintaining tap-to-open functionality.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import { getBooks } from '../../data/loader';
import type { BookId } from '../../data/types';
import type { TranslationKey } from '../../i18n';
import { useCorpusVersion } from '../../store/corpus';
import { useSettings } from '../../store/settings';
import { radius, shadow, spacing, type ThemeColors } from '../../theme/tokens';

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
/** Cover width / height, matching the printed covers (132 × 190). */
const COVER_RATIO = 0.7;
/** Card box is taller than the cover: cover + metadata, at full scale. */
const CARD_FULL_HEIGHT = CARD_MAX / COVER_RATIO + 130;
/** Native (unscaled) height of the carousel + arrow row. */
const NATIVE_CAROUSEL_HEIGHT = CARD_FULL_HEIGHT + spacing.lg + 44;
/**
 * The coverflow is laid out at its native 262 px card size on every screen,
 * then the whole thing is scaled down as one unit on narrow viewports. This
 * preserves the exact desktop proportions — card shape, overlap, type size
 * and spacing — instead of rebuilding a different-looking mobile layout.
 */
function carouselScale(screenWidth: number) {
  // At native size the three cards span roughly 540 px; fit that inside the
  // viewport (minus its horizontal padding) without ever enlarging past 1.
  return Math.min(1, Math.max(0.5, (screenWidth - 48) / 540));
}

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

/** Styles for carousel components */
const carouselStyles = {
  arrowButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
};

/** Type for book data returned by getBooks() */
type BookData = { id: BookId; count: number; hasEn: boolean; hasDe: boolean; hasHe: boolean };

/** Props for the circular book carousel component. */
interface CircularCarouselProps {
  books: BookData[];
  selectedBook: BookId | null;
  width: number;
  onPress: (id: BookId) => void;
  t: (key: TranslationKey) => string;
  colors: ThemeColors;
}

/** Duration (ms) of a card's glide to its new slot — deliberately unhurried. */
const SLIDE_DURATION = 650;

/**
 * Keeps one card's animated transform in sync with its slot in the ring.
 * Initial values are taken from the first render's slot so a card never jumps
 * when it mounts; afterwards every change eases smoothly into place.
 */
function useCarouselAnimation(offset: number) {
  const [translateX] = useState(() => new Animated.Value(offset * 165));
  const [scale] = useState(() => new Animated.Value(offset === 0 ? 1 : 0.84));
  const [rotation] = useState(() => new Animated.Value(offset === 0 ? 0 : offset === -1 ? 24 : -24));
  const [opacity] = useState(() => new Animated.Value(offset === 0 ? 1 : 0.9));

  useEffect(() => {
    const config = {
      duration: SLIDE_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    };
    Animated.parallel([
      Animated.timing(translateX, { ...config, toValue: offset * 165 }),
      Animated.timing(scale, { ...config, toValue: offset === 0 ? 1 : 0.84 }),
      Animated.timing(rotation, { ...config, toValue: offset === 0 ? 0 : offset === -1 ? 24 : -24 }),
      Animated.timing(opacity, { ...config, toValue: offset === 0 ? 1 : 0.9 }),
    ]).start();
  }, [offset, translateX, scale, rotation, opacity]);

  return {
    transform: [
      { translateX },
      { scale },
      { rotateY: rotation.interpolate({ inputRange: [-24, 24], outputRange: ['-24deg', '24deg'] }) },
    ],
    opacity,
  };
}

interface CarouselCardProps {
  book: BookData;
  offset: number;
  selectedBook: BookId | null;
  t: (key: TranslationKey) => string;
  colors: ThemeColors;
  onNavigate: () => void;
  onOpen: () => void;
}

/** A single book card that glides between slots with its 3D transform animated. */
function CarouselCard({ book, offset, selectedBook, t, colors, onNavigate, onOpen }: CarouselCardProps) {
  const animated = useCarouselAnimation(offset);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: CARD_MAX,
        height: CARD_FULL_HEIGHT,
        left: '50%',
        marginLeft: -(CARD_MAX / 2),
        alignItems: 'center',
        zIndex: offset === 0 ? 10 : 5,
      }}>
      <Animated.View style={{ ...animated, width: CARD_MAX }}>
        <BookCard
          id={book.id}
          name={t(`book.${book.id}` as const)}
          count={book.count}
          unit={t('home.hymnUnit')}
          languages={[
            ...(book.hasEn ? ['EN'] : []),
            ...(book.hasDe ? ['DE'] : []),
            ...(book.hasHe ? ['HE'] : []),
          ]}
          selected={book.id === selectedBook}
          width={CARD_MAX}
          onPress={offset === 0 ? onOpen : onNavigate}
        />
      </Animated.View>
    </Animated.View>
  );
}

/** Circular book carousel component that displays books with 3D perspective transforms. */
function CircularCarousel({ books, selectedBook, width, onPress, t, colors }: CircularCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scale = useMemo(() => carouselScale(width), [width]);
  // A CSS/RN scale transform shrinks the pixels but not the layout box, which
  // would leave a large empty gap above and below. Pull the margins in by the
  // hidden amount so the surrounding content butts up against the scaled art.
  const trim = (NATIVE_CAROUSEL_HEIGHT * (1 - scale)) / 2;

  // Swipe gesture for horizontal navigation
  const swipe = Gesture.Pan()
    .onEnd((event) => {
      if (Math.abs(event.translationX) >= 30) {
        // Swipe right (positive translationX) = go to previous
        // Swipe left (negative translationX) = go to next
        setActiveIndex((prev) => {
          const next = event.translationX > 0 ? prev - 1 : prev + 1;
          return ((next % books.length) + books.length) % books.length;
        });
      }
    });

  // Web keyboard navigation - only on web platform
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev === 0 ? books.length - 1 : prev - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev === books.length - 1 ? 0 : prev + 1));
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [books.length]);

  // Navigation functions
  const goToPrevious = () => setActiveIndex((prev) => (prev === 0 ? books.length - 1 : prev - 1));
  const goToNext = () => setActiveIndex((prev) => (prev === books.length - 1 ? 0 : prev + 1));

  return (
    <View
      style={{
        width: '100%',
        alignItems: 'center',
        marginTop: spacing.lg - trim,
        marginBottom: spacing.lg - trim,
        // Scale the whole native-size layout down as one unit on phones so the
        // PC look is preserved instead of re-flowing text at a smaller width.
        transform: [{ scale }],
      }}>
      <GestureDetector gesture={swipe}>
        <View
          style={{
            width: '100%',
            height: CARD_FULL_HEIGHT,
            position: 'relative',
            alignSelf: 'center',
            justifyContent: 'center',
            alignItems: 'center',
            direction: 'ltr',
          }}>
          {books.map((b, index) => {
            // -1 = left, 0 = centre, 1 = right (wrapping around the ring).
            // Because of the `-1`, activeIndex names the LEFT card, not the
            // centre one — so clicking a book must target index - 1 for it to
            // land in the centre slot.
            const circularOffset = ((index - activeIndex + books.length) % books.length) - 1;
            return (
              <CarouselCard
                key={b.id}
                book={b}
                offset={circularOffset}
                selectedBook={selectedBook}
                t={t}
                colors={colors}
                onNavigate={() => setActiveIndex((index - 1 + books.length) % books.length)}
                onOpen={() => onPress(b.id)}
              />
            );
          })}
        </View>
      </GestureDetector>

      {/* Navigation arrow buttons beneath the books */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xl,
          marginTop: spacing.lg,
          zIndex: 20,
        }}>
        <Pressable onPress={goToPrevious} style={carouselStyles.arrowButton} accessibilityLabel={t('home.previousBook')}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primaryDeep} />
        </Pressable>
        <Pressable onPress={goToNext} style={carouselStyles.arrowButton} accessibilityLabel={t('home.nextBook')}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={colors.primaryDeep} />
        </Pressable>
      </View>
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
  const books = useMemo(() => {
    void corpusVersion; // getBooks() reads a mutable cache.
    return getBooks();
  }, [corpusVersion]);

  const total = books.reduce((sum, b) => sum + b.count, 0);
  // On a phone the four quick-action pills must share one narrow row, and the
  // chrome above the books should not push them down the screen.
  const compact = width < 600;

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
            paddingBottom: compact ? spacing.md : spacing.xl,
            paddingHorizontal: compact ? spacing.lg : spacing.xl,
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
          paddingTop: compact ? spacing.md : spacing.xl,
          paddingHorizontal: compact ? spacing.lg : spacing.xl,
          paddingBottom: insets.bottom + spacing.xxl,
        }}>
        <View style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
          {/* Quick actions — the destinations a reader reaches for most, kept
              above the book grid so they are one tap away on every visit. */}
          <View
            style={{
              flexDirection: direction.row,
              // Keep all four pills on one line even on a narrow phone.
              flexWrap: 'nowrap',
              justifyContent: 'space-between',
              gap: compact ? 3 : spacing.sm,
              marginBottom: compact ? spacing.md : spacing.xl,
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
                  gap: compact ? 3 : spacing.xs,
                  paddingHorizontal: compact ? spacing.sm : spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                  minHeight: 44,
                })}>
                <MaterialCommunityIcons name={action.icon} size={compact ? 15 : 18} color={colors.primary} />
                <AppText
                  variant="label"
                  style={{ fontWeight: '600', fontSize: compact ? 12 : undefined }}>
                  {t(action.label)}
                </AppText>
              </Pressable>
            ))}
          </View>

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
              marginTop: compact ? spacing.sm : spacing.md,
              marginBottom: compact ? spacing.md : spacing.xl,
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
