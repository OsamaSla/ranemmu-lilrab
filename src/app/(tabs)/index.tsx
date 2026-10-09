/**
 * الرئيسية — the landing screen.
 *
 * Mirrors the reference app: a decorative backdrop, the app name, a search
 * field that opens the live search overlay, and a primary CTA into the library.
 * The audio toggle from the reference app's top bar is intentionally absent.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Image as RNImage, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { getBooks } from '../../data/loader';
import type { BookId } from '../../data/types';
import { useOverrides } from '../../store/overrides';
import { useSettings } from '../../store/settings';
import { radius, shadow, spacing } from '../../theme/tokens';

/** Cover art per book, shown side by side as the book picker. */
const BOOK_COVERS: Record<BookId, number> = {
  main: require('../../../assets/images/book-cover.jpg'),
  taranim: require('../../../assets/images/book-cover-taranim.jpg'),
};

export default function HomeScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const corpusVersion = useOverrides((s) => s.updatedAt);
  const book = useSettings((s) => s.book);
  const setBook = useSettings((s) => s.setBook);
  // corpusVersion only retriggers this after admin edits land.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const books = useMemo(() => getBooks(), [corpusVersion]);

  // First tap selects the book in place so the scoped search below serves
  // it; tapping the already-selected cover opens the library.
  const chooseBook = (id: BookId) => {
    if (id === book) {
      router.push('/library');
      return;
    }
    setBook(id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('appName')} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xxl,
        }}>
        {/* Music-notes banner above the book cover. In-flow with explicit
            dimensions — no absolute positioning, so it renders identically
            on native and web. Tinted with the theme text colour for both
            dark and light backgrounds. */}
        <RNImage
          source={require('../../../assets/images/home-notes.png')}
          resizeMode="contain"
          style={{
            alignSelf: 'center',
            width: 280,
            height: 120,
            marginBottom: spacing.md,
            opacity: 0.35,
            tintColor: colors.text,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -100,
            ...(direction.isRTL ? { right: -100 } : { left: -100 }),
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: colors.accent,
            opacity: 0.07,
            pointerEvents: 'none',
          }}
        />

        {/* The printed book's cover, as it looks on the shelf. */}
        <AppText variant="heading" center style={{ fontWeight: '700', marginBottom: spacing.md }}>
          {t('book.choose')}
        </AppText>

        {/* Book picker: both covers side by side. First tap selects that
            book everywhere (library, search, reader neighbours) so the scoped
            actions below serve it; tapping the selected cover opens it. */}
        <View
          style={{
            flexDirection: direction.row,
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: spacing.lg,
            marginBottom: spacing.sm,
          }}>
          {books.map((b) => {
            const selected = b.id === book;
            return (
              <Pressable
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={t(`book.${b.id}` as const)}
                accessibilityState={{ selected }}
                onPress={() => chooseBook(b.id)}
                android_ripple={{ color: colors.border }}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  opacity: pressed ? 0.75 : 1,
                  maxWidth: 150,
                })}>
                <RNImage
                  source={BOOK_COVERS[b.id]}
                  resizeMode="cover"
                  style={{
                    width: 132,
                    height: 190,
                    borderRadius: radius.lg,
                    borderWidth: selected ? 3 : 1,
                    borderColor: selected ? colors.primary : colors.border,
                    ...shadow.card,
                  }}
                />
                <AppText
                  variant="body"
                  center
                  style={{ fontWeight: selected ? '700' : '400', marginTop: spacing.sm }}>
                  {t(`book.${b.id}` as const)}
                </AppText>
                <AppText variant="caption" center color={colors.textMuted}>
                  {t('library.count')}: {b.count}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* How the picker works: select first, then search or browse below. */}
        <AppText
          variant="caption"
          center
          color={colors.textMuted}
          style={{ marginBottom: spacing.lg }}>
          {t('home.pickHint')}
        </AppText>

        {/* Umbrella heading: the covers above already name each book. The
            actions below act on the selected book only. */}
        <AppText variant="display" center style={{ marginBottom: spacing.xs }}>
          {t('library.title')}
        </AppText>
        <AppText
          variant="caption"
          center
          color={colors.textMuted}
          style={{ marginBottom: spacing.sm }}>
          {t('search.inBook')} {t(`book.${book}` as const)}
        </AppText>

        {/* Search trigger. A real field would need a keyboard on tap; routing to
            the search screen keeps focus handling in one place. Body-size text
            so the long placeholder fits on one line. */}
        <Pressable
          accessibilityRole="search"
          accessibilityLabel={`${t('home.searchPlaceholder')} — ${t(`book.${book}` as const)}`}
          onPress={() => router.push('/search')}
          android_ripple={{ color: colors.border }}
          style={({ pressed }) => [
            {
              flexDirection: direction.row,
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: spacing.lg,
              minHeight: 56,
              opacity: pressed ? 0.7 : 1,
              ...shadow.card,
            },
          ]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
          <AppText
            variant="body"
            color={colors.textMuted}
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ flex: 1, paddingHorizontal: spacing.md }}>
            {t('home.searchPlaceholder')}
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/library')}
          android_ripple={{ color: colors.border }}
          style={({ pressed }) => [
            {
              marginTop: spacing.lg,
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              paddingVertical: spacing.lg,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <AppText variant="heading" color={colors.onPrimary} style={{ fontWeight: '700' }}>
            {t('home.viewAllHymns')}
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}