/**
 * الرئيسية — the landing screen: pick a book to open its library.
 *
 * The three books are cards rather than bare covers: the cover keeps the
 * printed shelf look, while the body carries the name and metadata pills.
 * The grid is measured from the viewport (1–3 columns) so the cards keep one
 * aspect ratio on phones and desktops alike, and cards scale on hover/press —
 * on web too — so the whole surface reads as tappable.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { getBooks } from '../../data/loader';
import type { BookId } from '../../data/types';
import { useOverrides } from '../../store/overrides';
import { useRemote } from '../../store/remote';
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

/** Lift applied on web hover — `shadow.card` is the resting state. */
const HOVER_SHADOW = { boxShadow: '0 14px 34px rgba(11, 42, 48, 0.22)' };

/** One metadata pill under a book title. */
function MetaBadge({ label, icon }: { label: string; icon?: 'music-note' | 'check-circle' }) {
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
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
      {icon ? (
        <MaterialCommunityIcons
          name={icon}
          size={11}
          color={icon === 'check-circle' ? colors.accent : colors.textMuted}
        />
      ) : null}
      <AppText
        variant="caption"
        color={colors.textMuted}
        style={{ fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: isCode ? 0.5 : 0 }}>
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

        <View style={{ padding: spacing.md, borderTopWidth: 2, borderTopColor: accent }}>
          <AppText
            variant="heading"
            center
            numberOfLines={2}
            style={{
              fontFamily: fontFamilyBold,
              minHeight: Math.round(type.heading * 1.5) * 2,
            }}>
            {name}
          </AppText>
          <View style={{ alignItems: 'center', gap: 6, marginTop: spacing.sm }}>
            <MetaBadge icon="music-note" label={`${count} ${unit}`} />
            <View style={{ flexDirection: direction.row, flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
              {languages.map((code) => (
                <MetaBadge key={code} icon="check-circle" label={code} />
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
  const corpusVersion = useOverrides((s) => s.updatedAt);
  const remoteVersion = useRemote((s) => s.updatedAt);
  const book = useSettings((s) => s.book);
  const setBook = useSettings((s) => s.setBook);
  // corpusVersion only retriggers this after admin edits land.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const books = useMemo(() => getBooks(), [corpusVersion, remoteVersion]);

  const total = books.reduce((sum, b) => sum + b.count, 0);

  // 3 columns on desktop, 2 on phones (where a single cover would be huge),
  // 1 only on very narrow screens.
  const columns = width >= 880 ? 3 : width >= 360 ? 2 : 1;
  const gridWidth = Math.min(width - spacing.xl * 2, CONTENT_MAX);
  const cardWidth = Math.max(
    120,
    Math.min(CARD_MAX, Math.floor((gridWidth - CARD_GAP * (columns - 1)) / columns)),
  );

  // One tap selects the book and opens its library right away.
  const chooseBook = (id: BookId) => {
    setBook(id);
    router.push('/library');
  };

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

          <View
            style={{
              flexDirection: direction.row,
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: CARD_GAP,
            }}>
            {books.map((b) => (
              <BookCard
                key={b.id}
                id={b.id}
                name={t(`book.${b.id}` as const)}
                count={b.count}
                unit={t('home.hymnUnit')}
                languages={[
                  ...(b.hasEn ? ['EN'] : []),
                  ...(b.hasDe ? ['DE'] : []),
                  ...(b.hasHe ? ['HE'] : []),
                ]}
                selected={b.id === book}
                width={cardWidth}
                onPress={() => chooseBook(b.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
