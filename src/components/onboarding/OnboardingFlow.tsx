/**
 * OnboardingFlow — the first-run experience.
 *
 * Rendered as a full-screen overlay from the root layout, so it needs no route
 * of its own and can never leave a half-finished navigation stack behind. Four
 * stages:
 *
 *   welcome    — what the app is, in four value cards
 *   bookPicker — pick the first book (persisted through settings.setBook)
 *   tour       — four coach-mark style feature cards with mini illustrations
 *   gestures   — three interactive gesture demos for the reader
 *
 * Every string is localised; layout uses `direction.row` so the whole flow
 * mirrors under Arabic without per-step overrides.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Image as RNImage,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../AppText';
import { getBooks } from '../../data/loader';
import { bookLabelKey, type TranslationKey } from '../../i18n';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useCorpusVersion } from '../../store/corpus';
import { useSettings } from '../../store/settings';
import { radius, spacing } from '../../theme/tokens';

const CONTENT_MAX = 720;

const BOOK_COVERS: Record<string, number> = {
  main: require('../../../assets/images/book-cover.jpg'),
  taranim: require('../../../assets/images/book-cover-taranim.jpg'),
  book3: require('../../../assets/images/book-cover-halum.jpg'),
};

type Stage = 'welcome' | 'bookPicker' | 'tour' | 'gestures';

const TOUR: {
  id: 'books' | 'search' | 'library' | 'reader' | 'gestures';
  icon: 'view-carousel' | 'magnify' | 'format-list-numbered' | 'book-open-variant' | 'gesture-swipe';
  title: TranslationKey;
  body: TranslationKey;
}[] = [
  { id: 'books', icon: 'view-carousel', title: 'onboarding.tour.books.title', body: 'onboarding.tour.books.body' },
  { id: 'search', icon: 'magnify', title: 'onboarding.tour.search.title', body: 'onboarding.tour.search.body' },
  { id: 'library', icon: 'format-list-numbered', title: 'onboarding.tour.library.title', body: 'onboarding.tour.library.body' },
  { id: 'reader', icon: 'book-open-variant', title: 'onboarding.tour.reader.title', body: 'onboarding.tour.reader.body' },
  { id: 'gestures', icon: 'gesture-swipe', title: 'onboarding.tour.gestures.title', body: 'onboarding.tour.gestures.body' },
];

const GESTURES: {
  id: 'swipeLanguage' | 'railTap' | 'fullscreen';
  icon: 'gesture-swipe-vertical' | 'cursor-default-click-outline' | 'fullscreen';
  title: TranslationKey;
  body: TranslationKey;
}[] = [
  { id: 'swipeLanguage', icon: 'gesture-swipe-vertical', title: 'onboarding.gestures.swipeLanguage.title', body: 'onboarding.gestures.swipeLanguage.body' },
  { id: 'railTap', icon: 'cursor-default-click-outline', title: 'onboarding.gestures.railTap.title', body: 'onboarding.gestures.railTap.body' },
  { id: 'fullscreen', icon: 'fullscreen', title: 'onboarding.gestures.fullscreen.title', body: 'onboarding.gestures.fullscreen.body' },
];

interface OnboardingFlowProps {
  onComplete: () => void;
  /** Optional: lets the "skip" button finish immediately. */
  onSkip?: () => void;
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const { t, direction } = useT();
  const { colors, fontFamilyBold } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const corpusVersion = useCorpusVersion();
  const setBook = useSettings((s) => s.setBook);

  const [stage, setStage] = useState<Stage>('welcome');
  const [bookIndex, setBookIndex] = useState(0);
  const [tourIndex, setTourIndex] = useState(0);
  const [gestureIndex, setGestureIndex] = useState(0);
  const [progress] = useState(() => new Animated.Value(1));

  const books = useMemo(() => {
    void corpusVersion; // getBooks() reads a mutable cache.
    return getBooks();
  }, [corpusVersion]);

  // Fade the step content on every change. Re-created cheaply per transition
  // instead of tracking a listener, which keeps the component stateless.
  const animateIn = () => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const stepNumber = stage === 'welcome' ? 0 : stage === 'bookPicker' ? 1 : stage === 'tour' ? 2 : 3;
  const totalSteps = 4;

  const finish = () => {
    if (books[bookIndex]) setBook(books[bookIndex].id);
    onComplete();
  };

  const next = () => {
    animateIn();
    if (stage === 'welcome') {
      setStage('bookPicker');
      return;
    }
    if (stage === 'bookPicker') {
      if (books[bookIndex]) setBook(books[bookIndex].id);
      setStage('tour');
      setTourIndex(0);
      return;
    }
    if (stage === 'tour') {
      if (tourIndex < TOUR.length - 1) setTourIndex(tourIndex + 1);
      else setStage('gestures');
      return;
    }
    if (gestureIndex < GESTURES.length - 1) setGestureIndex(gestureIndex + 1);
    else finish();
  };

  const back = () => {
    animateIn();
    if (stage === 'bookPicker') setStage('welcome');
    else if (stage === 'tour') {
      if (tourIndex > 0) setTourIndex(tourIndex - 1);
      else setStage('bookPicker');
    } else if (stage === 'gestures') {
      if (gestureIndex > 0) setGestureIndex(gestureIndex - 1);
      else {
        setStage('tour');
        setTourIndex(TOUR.length - 1);
      }
    }
  };

  const skip = onSkip ?? finish;
  const isLast = stage === 'gestures' && gestureIndex === GESTURES.length - 1;

  const cardWidth = Math.min(200, Math.max(140, (Math.min(width, CONTENT_MAX) - spacing.xl * 2 - spacing.md) / 2));

  return (
    <View style={[styles.root, { backgroundColor: colors.canvas, paddingTop: insets.top }]}>
      {/* Progress + skip */}
      <View style={{ flexDirection: direction.row, alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.md }}>
        <View style={{ flex: 1, flexDirection: direction.row, gap: 6 }}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: index < stepNumber ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>
        <Pressable onPress={skip} accessibilityRole="button" accessibilityLabel={t('common.skip')} hitSlop={8}>
          <AppText variant="label" color={colors.textMuted} style={{ fontWeight: '600' }}>
            {t('common.skip')}
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.xl,
        }}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{
            width: '100%',
            maxWidth: CONTENT_MAX,
            alignSelf: 'center',
            opacity: progress,
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}>
          {stage === 'welcome' ? (
            <WelcomeStep t={t} colors={colors} direction={direction} fontFamilyBold={fontFamilyBold} />
          ) : null}

          {stage === 'bookPicker' ? (
            <BookPickerStep
              t={t}
              colors={colors}
              direction={direction}
              fontFamilyBold={fontFamilyBold}
              books={books}
              selected={bookIndex}
              onSelect={setBookIndex}
              cardWidth={cardWidth}
            />
          ) : null}

          {stage === 'tour' ? (
            <TourStep t={t} colors={colors} direction={direction} index={tourIndex} />
          ) : null}

          {stage === 'gestures' ? (
            <GestureStep t={t} colors={colors} direction={direction} index={gestureIndex} />
          ) : null}
        </Animated.View>
      </ScrollView>

      {/* Footer navigation */}
      <View
        style={{
          flexDirection: direction.row,
          gap: spacing.md,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
        }}>
        {stage !== 'welcome' ? (
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={({ pressed }) => ({
              paddingHorizontal: spacing.xl,
              paddingVertical: spacing.md,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
            })}>
            <AppText variant="body" style={{ fontWeight: '600' }}>
              {t('common.back')}
            </AppText>
          </Pressable>
        ) : null}

        <Pressable
          onPress={next}
          accessibilityRole="button"
          accessibilityLabel={isLast ? t('common.done') : stage === 'welcome' ? t('common.next') : t('common.next')}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: spacing.md,
            borderRadius: radius.pill,
            backgroundColor: pressed ? colors.primaryDeep : colors.primary,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
          })}>
          <AppText variant="body" color={colors.onPrimary} style={{ fontWeight: '700' }}>
            {isLast ? t('common.done') : t('common.next')}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stage 1 — welcome
// ---------------------------------------------------------------------------

function WelcomeStep({
  t,
  colors,
  direction,
  fontFamilyBold,
}: {
  t: (key: TranslationKey) => string;
  colors: ReturnType<typeof useTheme>['colors'];
  direction: ReturnType<typeof useT>['direction'];
  fontFamilyBold: string;
}) {
  const features: { icon: 'music-note' | 'translate' | 'wifi-off' | 'book-open-page-variant'; title: TranslationKey; body: TranslationKey }[] = [
    { icon: 'music-note', title: 'onboarding.welcome.feature1.title', body: 'onboarding.welcome.feature1.body' },
    { icon: 'translate', title: 'onboarding.welcome.feature2.title', body: 'onboarding.welcome.feature2.body' },
    { icon: 'wifi-off', title: 'onboarding.welcome.feature3.title', body: 'onboarding.welcome.feature3.body' },
    { icon: 'book-open-page-variant', title: 'onboarding.welcome.feature4.title', body: 'onboarding.welcome.feature4.body' },
  ];

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MaterialCommunityIcons name="music-clef-treble" size={44} color={colors.onPrimary} />
      </View>
      <AppText variant="display" center style={{ fontWeight: '700', fontFamily: fontFamilyBold, marginTop: spacing.lg }}>
        {t('appName')}
      </AppText>
      <AppText variant="body" center color={colors.textMuted} style={{ marginTop: spacing.sm, maxWidth: 460 }}>
        {t('onboarding.welcome.tagline')}
      </AppText>

      <View style={{ width: '100%', maxWidth: 460, alignSelf: 'center', marginTop: spacing.xl, gap: spacing.md }}>
        {features.map((feature) => (
          <View key={feature.title} style={{ flexDirection: direction.row, alignItems: 'flex-start', gap: spacing.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.md,
                backgroundColor: colors.surfaceMuted,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <MaterialCommunityIcons name={feature.icon} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" style={{ fontWeight: '700' }}>
                {t(feature.title)}
              </AppText>
              <AppText variant="label" color={colors.textMuted} style={{ marginTop: 2 }}>
                {t(feature.body)}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stage 2 — book picker
// ---------------------------------------------------------------------------

function BookPickerStep({
  t,
  colors,
  direction,
  fontFamilyBold,
  books,
  selected,
  onSelect,
  cardWidth,
}: {
  t: (key: TranslationKey) => string;
  colors: ReturnType<typeof useTheme>['colors'];
  direction: ReturnType<typeof useT>['direction'];
  fontFamilyBold: string;
  books: ReturnType<typeof getBooks>;
  selected: number;
  onSelect: (index: number) => void;
  cardWidth: number;
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      <AppText variant="title" center style={{ fontWeight: '700', fontFamily: fontFamilyBold }}>
        {t('onboarding.bookPicker.title')}
      </AppText>
      <AppText variant="body" center color={colors.textMuted} style={{ marginTop: spacing.sm }}>
        {t('onboarding.bookPicker.body')}
      </AppText>

      <View
        style={{
          flexDirection: direction.row,
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: spacing.md,
          marginTop: spacing.xl,
        }}>
        {books.map((book, index) => {
          const isSelected = index === selected;
          return (
            <Pressable
              key={book.id}
              onPress={() => onSelect(index)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={t(bookLabelKey(book.id))}
              style={({ pressed }) => ({
                width: cardWidth,
                borderRadius: radius.lg,
                borderWidth: isSelected ? 3 : 1,
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: colors.surface,
                overflow: 'hidden',
                opacity: pressed ? 0.9 : 1,
              })}>
              <View style={{ width: '100%', aspectRatio: 0.7, backgroundColor: colors.surfaceMuted }}>
                <RNImage
                  source={BOOK_COVERS[book.id]}
                  resizeMode="cover"
                  style={{ width: '100%', height: '100%' }}
                />
                {isSelected ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: spacing.sm,
                      right: spacing.sm,
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} />
                  </View>
                ) : null}
              </View>
              <View style={{ padding: spacing.md, alignItems: 'center', gap: 2 }}>
                <AppText variant="body" center style={{ fontWeight: '700' }} numberOfLines={2}>
                  {t(bookLabelKey(book.id))}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {book.count} {t('home.hymnUnit')}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stage 3 — feature tour
// ---------------------------------------------------------------------------

function TourStep({
  t,
  colors,
  direction,
  index,
}: {
  t: (key: TranslationKey) => string;
  colors: ReturnType<typeof useTheme>['colors'];
  direction: ReturnType<typeof useT>['direction'];
  index: number;
}) {
  const step = TOUR[index];
  if (!step) return null;

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MaterialCommunityIcons name={step.icon} size={30} color={colors.onPrimary} />
      </View>
      <AppText variant="caption" center color={colors.primary} style={{ marginTop: spacing.md, fontWeight: '700' }}>
        {`${t('onboarding.tour.step')} ${index + 1} / ${TOUR.length}`}
      </AppText>
      <AppText variant="title" center style={{ fontWeight: '700', marginTop: spacing.xs }}>
        {t(step.title)}
      </AppText>
      <AppText variant="body" center color={colors.textMuted} style={{ marginTop: spacing.sm, maxWidth: 460 }}>
        {t(step.body)}
      </AppText>

      <View style={{ width: '100%', marginTop: spacing.xl, alignItems: 'center' }}>
        <TourIllustration id={step.id} colors={colors} direction={direction} t={t} />
      </View>
    </View>
  );
}

function TourIllustration({
  id,
  colors,
  direction,
  t,
}: {
  id: (typeof TOUR)[number]['id'];
  colors: ReturnType<typeof useTheme>['colors'];
  direction: ReturnType<typeof useT>['direction'];
  t: (key: TranslationKey) => string;
}) {
  if (id === 'books') {
    return (
      <View style={{ width: '100%', maxWidth: 360, alignItems: 'center' }}>
        {/* Three overlapping cards: the centre one full size, the two side
            ones smaller and angled — mirroring the real home carousel. */}
        <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'center' }}>
          {[0, 1, 2].map((slot) => {
            const centre = slot === 1;
            return (
              <View
                key={slot}
                style={{
                  width: centre ? 104 : 84,
                  height: centre ? 150 : 121,
                  marginHorizontal: centre ? 0 : -18,
                  borderRadius: radius.sm,
                  borderWidth: 2,
                  borderColor: centre ? colors.primary : colors.border,
                  backgroundColor: colors.surface,
                  transform: [{ rotate: slot === 0 ? '12deg' : slot === 2 ? '-12deg' : '0deg' }],
                  zIndex: centre ? 2 : 1,
                }}
              />
            );
          })}
        </View>
        <View style={{ flexDirection: direction.row, alignItems: 'center', gap: spacing.xl, marginTop: spacing.lg }}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={colors.primary} />
          <MaterialCommunityIcons name="chevron-right" size={26} color={colors.primary} />
        </View>
      </View>
    );
  }

  if (id === 'search') {
    return (
      <View
        style={{
          flexDirection: direction.row,
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.surfaceMuted,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
          height: 52,
          width: '100%',
          maxWidth: 360,
        }}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
        <AppText variant="body" color={colors.textMuted}>
          tr001 / نرنم
        </AppText>
      </View>
    );
  }

  if (id === 'library') {
    return (
      <View
        style={{
          width: '100%',
          maxWidth: 360,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        }}>
        {['tr0001', 'tr0002', 'tr0003'].map((code, row) => (
          <View
            key={code}
            style={{
              flexDirection: direction.row,
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.md,
              borderBottomWidth: row < 2 ? 1 : 0,
              borderBottomColor: colors.border,
            }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.sm,
                backgroundColor: colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <AppText variant="caption" color={colors.primary} style={{ fontWeight: '700' }}>
                {code.slice(2)}
              </AppText>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted, width: '70%' }} />
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, width: '45%' }} />
            </View>
            <MaterialCommunityIcons name="star-outline" size={20} color={colors.textMuted} />
          </View>
        ))}
      </View>
    );
  }

  if (id === 'reader') {
    return (
      <View
        style={{
          width: '100%',
          maxWidth: 360,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          gap: spacing.sm,
        }}>
        <AppText variant="body" center style={{ fontWeight: '700' }}>
          {t('common.hymnNumber')}
        </AppText>
        <View style={{ gap: 6 }}>
          {[90, 100, 80, 95].map((w, line) => (
            <View
              key={line}
              style={{ height: 7, borderRadius: 4, backgroundColor: colors.surfaceMuted, width: `${w}%` as DimensionValue }}
            />
          ))}
        </View>
        <View style={{ flexDirection: direction.row, justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: direction.row, gap: 4 }}>
            {[0, 1, 2, 3].map((dot) => (
              <View
                key={dot}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: dot === 1 ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>
          <MaterialCommunityIcons name="fullscreen" size={18} color={colors.textMuted} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: direction.row, flexWrap: 'wrap', justifyContent: 'center', gap: spacing.lg }}>
      {GESTURES.map((gesture) => (
        <View key={gesture.id} style={{ alignItems: 'center', width: 84, gap: spacing.xs }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MaterialCommunityIcons name={gesture.icon} size={22} color={colors.primary} />
          </View>
          <AppText variant="caption" center color={colors.textMuted} numberOfLines={2}>
            {t(gesture.title)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stage 4 — gesture hints
// ---------------------------------------------------------------------------

function GestureStep({
  t,
  colors,
  direction,
  index,
}: {
  t: (key: TranslationKey) => string;
  colors: ReturnType<typeof useTheme>['colors'];
  direction: ReturnType<typeof useT>['direction'];
  index: number;
}) {
  const step = GESTURES[index];
  if (!step) return null;

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <MaterialCommunityIcons name={step.icon} size={32} color={colors.onPrimary} />
      </View>
      <AppText variant="caption" center color={colors.primary} style={{ marginTop: spacing.md, fontWeight: '700' }}>
        {`${t('onboarding.gestures.step')} ${index + 1} / ${GESTURES.length}`}
      </AppText>
      <AppText variant="title" center style={{ fontWeight: '700', marginTop: spacing.xs }}>
        {t(step.title)}
      </AppText>
      <AppText variant="body" center color={colors.textMuted} style={{ marginTop: spacing.sm, maxWidth: 460 }}>
        {t(step.body)}
      </AppText>

      <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
        <GestureDemo id={step.id} colors={colors} direction={direction} t={t} />
      </View>
    </View>
  );
}

function GestureDemo({
  id,
  colors,
  direction,
  t,
}: {
  id: (typeof GESTURES)[number]['id'];
  colors: ReturnType<typeof useTheme>['colors'];
  direction: ReturnType<typeof useT>['direction'];
  t: (key: TranslationKey) => string;
}) {
  if (id === 'swipeLanguage') {
    return (
      <View style={{ flexDirection: direction.row, alignItems: 'center', gap: spacing.lg }}>
        <View
          style={{
            flexDirection: direction.row,
            alignItems: 'center',
            gap: spacing.xs,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}>
          <AppText variant="label" style={{ fontWeight: '700' }}>
            {t('common.arShort')}
          </AppText>
          <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textMuted} />
        </View>
        <View style={{ flexDirection: direction.row, alignItems: 'center', gap: spacing.xs }}>
          <AppText variant="label" color={colors.primary} style={{ fontWeight: '700' }}>
            EN
          </AppText>
          <MaterialCommunityIcons name="arrow-right" size={16} color={colors.primary} />
        </View>
      </View>
    );
  }

  if (id === 'railTap') {
    return (
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 52,
            height: 180,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            justifyContent: 'space-around',
            paddingVertical: spacing.md,
          }}>
          {[0, 1, 2, 3, 4].map((dot) => (
            <View
              key={dot}
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                alignSelf: 'center',
                backgroundColor: dot === 2 ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        width: 220,
        height: 120,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        flexDirection: direction.row,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
      }}>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted, width: '60%' }} />
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, width: '90%' }} />
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, width: '75%' }} />
      </View>
      <MaterialCommunityIcons name="fullscreen" size={28} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
