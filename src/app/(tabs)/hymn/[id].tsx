/**
 * قارئ الترنيمة — the hymn reader.
 *
 * The hymn text owns the screen: frequent tools (favourite, share, search,
 * fullscreen, text settings, info, language chips, previous/next) live in
 * one slim compact icon row inside the header, so the bottom tab bar never
 * hides and no tall sheet covers the text. Home is intentionally absent
 * here — the tab bar already provides it. Font size lives inside the
 * text-settings sheet.
 * Stanza jumps ("انتقال إلى مقطع") live in a slim vertical rail docked on the physical
 * right side of the text: it reserves its own narrow column in the layout,
 * so it never overlaps the hymn text, and its dots sit inset from the
 * screen edge with an extended tap area so they stay usable on
 * small phones — the refrain has its own highlighted dot there.
 * Fullscreen uses the same compact toolbar over its pure-black surface.
 *
 * Opening a hymn records it in the recents list. Navigating here from the
 * library may carry `?verse=<n>` to land on a specific stanza.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Animated, Pressable, ScrollView, Share, Text as RNText, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { HymnInfoSheet } from '../../../components/HymnInfoSheet';
import { HymnRow } from '../../../components/HymnRow';
import { IconButton } from '../../../components/IconButton';
import { MeterText } from '../../../components/MeterText';
import { ReaderSettingsModal } from '../../../components/ReaderSettingsModal';
import type { SegmentOption } from '../../../components/SegmentedControl';
import { getCorpus, getHymn, getNeighbours, getSummaries } from '../../../data/loader';
import { displayMeter } from '../../../data/meterFamilies';
import { findSimilar } from '../../../data/search';
import { useT } from '../../../hooks/useT';
import { useTheme } from '../../../hooks/useTheme';
import { useLibrary } from '../../../store/library';
import { useOverrides } from '../../../store/overrides';
import { useSettings } from '../../../store/settings';
import { fontFamilyFor, READER_MAX_WIDTH, type as typeScale } from '../../../theme/fonts';
import { palette, radius, spacing, HIT_SLOP } from '../../../theme/tokens';

/** Height of the slim compact toolbar row inside the header. */
const TOOLBAR_HEIGHT = 48;

/**
 * Width of the slim stanza-jump rail docked on the physical right side of
 * the text, and the diameter of one jump dot. The rail reserves its own
 * column in the layout (it never overlays the text) and stays narrow enough
 * for small phones. The dots sit on an 8px+ gutter off the screen edge —
 * targets flush against the edge are hard to hit with a thumb and fight
 * edge-swipe gestures — and hitSlop extends the tap area on native
 * (react-native-web ignores hitSlop, hence the genuinely larger dots).
 */
const RAIL_WIDTH = 52;
const RAIL_DOT = 36;

/**
 * Lets `expo export` and web deep links resolve every hymn statically.
 * Native dev and production builds resolve the param at runtime and ignore this.
 */
export function generateStaticParams(): { id: string }[] {
  return getSummaries().map((summary) => ({ id: summary.id }));
}

export default function ReaderScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id, verse } = useLocalSearchParams<{ id: string; verse?: string }>();
  const { t, direction } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoHymn, setInfoHymn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const readerSize = useSettings((s) => s.readerSize);
  const fontId = useSettings((s) => s.fontFamily);
  const touchRecent = useLibrary((s) => s.touchRecent);
  const toggleFavorite = useLibrary((s) => s.toggleFavorite);
  const isFavorite = useLibrary((s) => s.favorites.includes(id ?? ''));

  // Fullscreen owns the whole display, so the tab bar goes away with the
  // rest of the chrome. The cleanup restores it even when leaving mid-read.
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: {
        display: fullscreen ? 'none' : 'flex',
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
      },
    });
    return () => {
      navigation.setOptions({
        tabBarStyle: {
          display: 'flex',
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      });
    };
  }, [fullscreen, navigation, colors.surface, colors.border]);

  const hymn = id ? getHymn(id) : undefined;
  // Re-reads the merged corpus whenever an admin override lands.
  const corpusVersion = useOverrides((s) => s.updatedAt);
  // corpusVersion only retriggers these after admin edits land.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const neighbours = useMemo(() => (id ? getNeighbours(id) : {}), [id, corpusVersion]);
  const similar = useMemo(
    () =>
      hymn
        ? findSimilar(
            hymn,
            getCorpus()
              .filter((h) => (h.book ?? 'main') === (hymn.book ?? 'main'))
              .map((h) => ({
                id: h.id,
                book: h.book ?? 'main',
                number: h.number,
                title: h.title,
                meter: h.meter,
                hasChorus: h.verses.some((v) => v.chorus),
              })),
            5,
          )
        : [],
    [hymn],
  );

  // Per-hymn translation view. Arabic is always the master text; a
  // translation renders line-by-line beside it and never replaces it.
  // The toggle only exists when this hymn actually carries a translation.
  // The view resets to Arabic when navigating (render-time reset, no effect).
  const [view, setView] = useState<{ id: string | string[] | undefined; lang: 'ar' | 'en' | 'de' }>({
    id,
    lang: 'ar',
  });
  if (view.id !== id) setView({ id, lang: 'ar' });
  const parallel = view.id === id ? view.lang : 'ar';
  const chooseParallel = (lang: 'ar' | 'en' | 'de') => setView({ id, lang });

  const hasEn = Boolean(hymn?.title_en ?? hymn?.verses_en);
  const hasDe = Boolean(hymn?.title_de ?? hymn?.verses_de);
  const transVerses =
    parallel === 'en' ? hymn?.verses_en : parallel === 'de' ? hymn?.verses_de : undefined;
  const transTitle =
    parallel === 'en' ? hymn?.title_en : parallel === 'de' ? hymn?.title_de : undefined;
  const transChorus =
    parallel === 'en' ? hymn?.chorus_en : parallel === 'de' ? hymn?.chorus_de : undefined;

  const translationOptions: SegmentOption<'ar' | 'en' | 'de'>[] = [
    { value: 'ar', label: 'العربية' },
    ...(hasEn ? [{ value: 'en', label: 'English' } as const] : []),
    ...(hasDe ? [{ value: 'de', label: 'Deutsch' } as const] : []),
  ];

  useEffect(() => {
    if (hymn) touchRecent(hymn.id);
  }, [hymn, touchRecent]);

  const scrollRef = useRef<ScrollView>(null);
  // 150ms fade for entering/exiting fullscreen (spec: all transitions <200ms).
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!fullscreen) return;
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, fullscreen]);

  const exitFullscreen = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setFullscreen(false));
  };

  // Scroll targets for the stanza rail. The store is tagged with the hymn
  // it was measured for: the first onLayout of a new hymn resets it, so
  // stale offsets from the previous hymn can never leak in. (A previous
  // clear()-in-effect raced onLayout — after next/prev navigation the map
  // was wiped and reused views don't always re-fire onLayout, leaving
  // dots that do nothing when tapped.)
  const verseOffsets = useRef<{ hymnId: string; offsets: Map<number, number> }>({
    hymnId: '',
    offsets: new Map(),
  });

  const scrollToVerse = (verseIndex: number) => {
    const store = verseOffsets.current;
    if (store.hymnId !== id) return;
    const y = store.offsets.get(verseIndex);
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.lg), animated: true });
  };

  const onVerseLayout = (verseIndex: number) => (event: LayoutChangeEvent) => {
    const store = verseOffsets.current;
    if (store.hymnId !== id) {
      store.hymnId = id ?? '';
      store.offsets = new Map();
    }
    store.offsets.set(verseIndex, event.nativeEvent.layout.y);
  };

  useEffect(() => {
    if (verse === undefined || hymn === undefined) return;
    const target = Number.parseInt(verse, 10);
    if (Number.isNaN(target)) return;
    const timer = setTimeout(() => scrollToVerse(target), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verse, hymn?.id]);

  if (!hymn) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top }}>
        <View style={{ flexDirection: direction.row, paddingHorizontal: spacing.sm }}>
          <IconButton
            name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
            label={t('common.back')}
            onPress={() => router.back()}
          />
        </View>
        <EmptyState icon="book-remove-outline" title={t('common.notFound')} />
      </View>
    );
  }

  const shareHymn = () => {
    const body = [
      `${hymn.number}. ${hymn.title}`,
      ...(transTitle ? [`${hymn.number}. ${transTitle}`] : []),
      '',
      ...hymn.verses.flatMap((v, verseIndex) => [
        `${v.label}`,
        ...v.lines.flatMap((line, lineIndex) => {
          const translated = transVerses?.[verseIndex]?.lines[lineIndex];
          return translated ? [line, translated] : [line];
        }),
        '',
      ]),
      `— ${t('appName')}`,
    ].join('\n');

    Share.share({ message: body }).catch(() => {
      /* Dismissed share sheet is not an error worth surfacing. */
    });
  };

  const readerFont = fontFamilyFor(fontId, false);
  const readerFontBold = fontFamilyFor(fontId, true);

  // Hymn page shows the short family form (٥, not 55.55.55.55) whenever the
  // hymn's cell is transcribed; otherwise the exact metre.
  const shownMeter = displayMeter(hymn.id, hymn.meter);

  /**
   * Compact icon button for the header toolbar. Transparent background,
   * 40px touch target by default, coloured icon. The prev/next pair uses a
   * narrower 34px box so the whole row fits small phones without scrolling —
   * hitSlop still keeps the effective touch area above 48px.
   */
  const headerIcon = (props: {
    name: ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    onPress: () => void;
    color?: string;
    dark?: boolean;
    disabled?: boolean;
    box?: number;
  }) => {
    const box = props.box ?? 40;
    return (
      <IconButton
        name={props.name}
        label={props.label}
        onPress={props.onPress}
        disabled={props.disabled}
        size={22}
        color={props.color ?? (props.dark ? palette.readerText : colors.onPrimary)}
        style={{
          width: box,
          height: 40,
          borderRadius: box / 2,
          backgroundColor: 'transparent',
          borderWidth: 0,
          opacity: props.disabled ? 0.35 : 1,
        }}
      />
    );
  };

  /**
   * Language selector chips: short labels (AR/EN/DE), pill style.
   * Selected chip gets filled background; others are outlined.
   */
  const languageChips = (dark: boolean) => {
    if (translationOptions.length <= 1) return null;
    const ink = dark ? palette.readerText : colors.onPrimary;
    const selectedInk = dark ? '#000000' : colors.primaryDeep;
    return (
      <View
        style={{
          flexDirection: direction.row,
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: spacing.sm,
        }}>
        {translationOptions.map((option) => {
          const selected = option.value === parallel;
          const short = option.value === 'ar' ? t('common.arShort') : option.value === 'en' ? t('common.enShort') : t('common.deShort');
          return (
            <Pressable
              key={option.value}
              onPress={() => chooseParallel(option.value)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              hitSlop={6}
              android_ripple={{ color: dark ? 'rgba(255,255,255,0.3)' : colors.border }}
              style={({ pressed }) => ({
                minHeight: 32,
                minWidth: 40,
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: selected ? 'transparent' : dark ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.55)',
                backgroundColor: selected ? ink : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}>
              <AppText
                variant="label"
                numberOfLines={1}
                color={selected ? selectedInk : ink}
                style={{ fontWeight: selected ? '700' : '500', fontSize: 11, lineHeight: 16 }}>
                {short}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    );
  };

  /**
   * Icon toolbar: previous · next · settings · fullscreen · search · share · favorite.
   * Right-aligned, horizontally scrollable if needed.
   */
  const iconToolbar = (dark: boolean) => {
    const ink = dark ? palette.readerText : colors.onPrimary;
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: direction.row,
          alignItems: 'center',
          paddingHorizontal: spacing.sm,
          gap: 2,
          minHeight: TOOLBAR_HEIGHT,
        }}
        style={{ flex: 1 }}>
        <View style={{ flexDirection: direction.row, alignItems: 'center', gap: 0 }}>
          {headerIcon({
            name: direction.isRTL ? 'chevron-right' : 'chevron-left',
            label: t('reader.previous'),
            disabled: !neighbours.previous,
            onPress: () => {
              if (neighbours.previous) router.replace(`/hymn/${neighbours.previous.id}`);
            },
            dark,
            box: 34,
          })}
          {headerIcon({
            name: direction.isRTL ? 'chevron-left' : 'chevron-right',
            label: t('reader.next'),
            disabled: !neighbours.next,
            onPress: () => {
              if (neighbours.next) router.replace(`/hymn/${neighbours.next.id}`);
            },
            dark,
            box: 34,
          })}
        </View>
        {headerIcon({
          name: 'cog-outline',
          label: t('reader.settings'),
          onPress: () => setSettingsOpen(true),
          dark,
        })}
        {headerIcon({
          name: fullscreen ? 'fullscreen-exit' : 'fullscreen',
          label: fullscreen ? t('reader.exitFullscreen') : t('reader.fullscreen'),
          onPress: () => {
            if (fullscreen) exitFullscreen();
            else setFullscreen(true);
          },
          dark,
        })}
        {headerIcon({
          name: 'magnify',
          label: t('search.placeholder'),
          onPress: () => router.push('/library'),
          dark,
        })}
        {headerIcon({ name: 'share-variant', label: t('reader.share'), onPress: shareHymn, dark })}
        {headerIcon({
          name: isFavorite ? 'star' : 'star-outline',
          label: t('favorites.title'),
          onPress: () => toggleFavorite(hymn.id),
          color: isFavorite ? colors.favorite : ink,
          dark,
        })}
      </ScrollView>
    );
  };

  const stanzaText = (body: string) => (
    <AppText
      variant="body"
      center
      useAppFont={false}
      style={{
        fontFamily: readerFont,
        fontSize: readerSize,
        lineHeight: Math.round(readerSize * 2),
        color: fullscreen ? palette.readerText : colors.text,
      }}>
      {body}
    </AppText>
  );

  const translationText = (body: string) => (
    <RNText
      style={{
        fontFamily: readerFont,
        fontSize: Math.round(readerSize * 0.85),
        lineHeight: Math.round(readerSize * 1.6),
        color: fullscreen ? palette.readerText : colors.textMuted,
        writingDirection: 'ltr',
        textAlign: 'left',
        opacity: fullscreen ? 0.8 : 1,
      }}>
      {body}
    </RNText>
  );

  const versesView = (
    <>
      {transVerses ? (
        <AppText
          variant="caption"
          center
          color={fullscreen ? palette.readerText : colors.textMuted}
          style={{ opacity: fullscreen ? 0.75 : 1, marginBottom: spacing.md }}>
          {t('reader.translationNote')}
        </AppText>
      ) : null}
      {hymn.verses.map((verseBlock, verseIndex) => (
        <View
          key={`${verseIndex}-${verseBlock.label}`}
          onLayout={onVerseLayout(verseIndex)}
          style={{
            backgroundColor: fullscreen ? 'transparent' : colors.surface,
            borderRadius: radius.lg,
            borderWidth: fullscreen ? 0 : 1,
            borderColor: fullscreen ? 'transparent' : colors.border,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            marginBottom: spacing.md,
            marginStart: verseBlock.chorus ? spacing.xl : 0,
            borderStartWidth: verseBlock.chorus ? 3 : 0,
            borderStartColor: verseBlock.chorus ? colors.accent : 'transparent',
          }}>
          <AppText
            variant="label"
            center
            useAppFont={false}
            color={fullscreen ? palette.readerText : colors.primary}
            style={{
              fontFamily: readerFontBold,
              fontSize: Math.round(readerSize * 0.7),
              marginBottom: spacing.xs,
              opacity: fullscreen ? 0.85 : 1,
            }}>
            {verseBlock.chorus && (hymn.chorus ?? transChorus)
              ? (transChorus && transChorus !== hymn.chorus
                ? `${hymn.chorus} · ${transChorus}`
                : (hymn.chorus ?? transChorus))
              : `(${verseBlock.label})`}
          </AppText>
          {verseBlock.lines.map((line, lineIndex) => {
            const translated = transVerses?.[verseIndex]?.lines[lineIndex];
            return (
              <View
                key={lineIndex}
                style={{ marginBottom: lineIndex < verseBlock.lines.length - 1 ? spacing.sm : 0 }}>
                {stanzaText(line)}
                {translated ? <View style={{ marginTop: 2 }}>{translationText(translated)}</View> : null}
              </View>
            );
          })}
        </View>
      ))}
    </>
  );

  // Stanza jumps live in the slim side rail beside the text, not in the
  // panel. The refrain needs no extra button: it has its own highlighted
  // dot in that rail.

  /**
   * Slim vertical stanza rail ("انتقال إلى مقطع") docked on the physical
   * right side of the hymn text. It is an in-flow column with its own
   * reserved width, so it can never cover the text. Dots are inset from the
   * screen edge by at least spacing.sm (plus the notch safe-area) and use
   * HIT_SLOP on native, so they stay tappable on small phones. Hidden for
   * single-stanza hymns.
   */
  const stanzaRail = (dark: boolean) => {
    if (hymn.verses.length < 2) return null;
    return (
      <View
        accessibilityRole="menu"
        accessibilityLabel={t('reader.stanzas')}
        style={{
          width: RAIL_WIDTH,
          paddingStart: spacing.sm,
          paddingEnd: Math.max(insets.right, spacing.sm),
          borderLeftWidth: 1,
          borderLeftColor: dark ? 'rgba(255,255,255,0.22)' : colors.border,
          backgroundColor: 'transparent',
        }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.lg,
            gap: spacing.sm,
          }}>
          {hymn.verses.map((verseBlock, verseIndex) => {
            const isChorus = verseBlock.chorus;
            const label = isChorus
              ? (hymn.chorus ?? t('reader.refrain'))
              : `${t('reader.verseOf')} ${verseBlock.label}`;
            return (
              <Pressable
                key={`${verseIndex}-${verseBlock.label}`}
                onPress={() => scrollToVerse(verseIndex)}
                accessibilityRole="button"
                accessibilityLabel={label}
                hitSlop={HIT_SLOP}
                android_ripple={{ color: colors.border }}
                style={({ pressed }) => ({
                  width: RAIL_DOT,
                  height: RAIL_DOT,
                  borderRadius: RAIL_DOT / 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isChorus
                    ? colors.accent
                    : dark
                      ? 'rgba(255,255,255,0.14)'
                      : colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: isChorus
                    ? colors.accent
                    : dark
                      ? 'rgba(255,255,255,0.3)'
                      : colors.border,
                  opacity: pressed ? 0.6 : 1,
                })}>
                {isChorus ? (
                  <MaterialCommunityIcons
                    name="repeat"
                    size={16}
                    color={colors.onPrimary}
                  />
                ) : (
                  <AppText
                    variant="label"
                    useAppFont={false}
                    style={{
                      fontFamily: readerFontBold,
                      fontSize: 12,
                      fontWeight: '700',
                      color: dark ? palette.readerText : colors.text,
                      lineHeight: 16,
                    }}>
                    {verseBlock.label}
                  </AppText>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  

  if (fullscreen) {
    return (
      <Animated.View style={{ flex: 1, backgroundColor: palette.readerBg, opacity: fadeAnim }}>
        <View
          style={{
            paddingTop: insets.top + spacing.sm,
            flexDirection: direction.row,
            alignItems: 'center',
            paddingHorizontal: spacing.sm,
          }}>
          {headerIcon({
            name: direction.isRTL ? 'chevron-right' : 'chevron-left',
            label: t('common.back'),
            onPress: () => router.back(),
            dark: true,
          })}
          <View style={{ flex: 1, paddingHorizontal: spacing.sm }}>
            <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'flex-start' }}>
              <AppText
                variant="heading"
                numberOfLines={1}
                color={palette.readerText}
                style={{ fontWeight: '700', marginEnd: spacing.md }}>
                {t('common.hymnNumber')} {hymn.number}
              </AppText>
              {languageChips(true)}
            </View>
            <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'flex-start', marginTop: 2 }}>
              {iconToolbar(true)}
            </View>
          </View>
        </View>
        {/* Body row: text scrolls on the left, stanza rail docks on the
            physical right in its own column — never over the text. */}
        <View style={{ flex: 1, flexDirection: 'row', direction: 'ltr' }}>
          {/* Keyed by hymn: next/prev remounts, so every verse re-measures
              for the rail and the new hymn opens at the top. */}
          <ScrollView
            key={`fs-${hymn.id}`}
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: spacing.xl,
              paddingBottom: insets.bottom + spacing.xxl,
              maxWidth: READER_MAX_WIDTH,
              width: '100%',
              alignSelf: 'center',
            }}>
            <AppText
              variant="title"
              center
              useAppFont={false}
              style={{
                fontFamily: readerFontBold,
                fontSize: Math.round(readerSize * 1.1),
                color: palette.readerText,
                marginVertical: spacing.lg,
              }}>
              {hymn.number}. {transTitle ? `${hymn.title} / ${transTitle}` : hymn.title}
            </AppText>
            {shownMeter ? (
              <AppText
                variant="caption"
                center
                style={{ color: palette.readerText, opacity: 0.7, marginBottom: spacing.lg }}>
                {t('info.meter')}: <MeterText meter={shownMeter} fontSize={typeScale.caption} color={palette.readerText} align="center" />
              </AppText>
            ) : null}
            {versesView}
          </ScrollView>
          {stanzaRail(true)}
        </View>
        <ReaderSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <HymnInfoSheet hymn={infoHymn ? hymn : null} onClose={() => setInfoHymn(false)} />
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Header: back button (left), title + language chips (center/right), icon toolbar (right) */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.sm,
          backgroundColor: colors.primaryDeep,
        }}>
        {/* Author credit, top corner — only when known. */}
        {hymn.author || hymn.authorOriginal ? (
          <AppText
            variant="caption"
            numberOfLines={1}
            color={colors.onPrimary}
            style={{ opacity: 0.75, fontSize: 11, textAlign: 'left', paddingHorizontal: spacing.sm }}>
            {hymn.author ?? ''}
            {hymn.author && hymn.authorOriginal ? ' · ' : ''}
            {hymn.authorOriginal ?? ''}
          </AppText>
        ) : null}
        <View style={{ flexDirection: direction.row, alignItems: 'flex-start' }}>
          <IconButton
            name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
            label={t('common.back')}
            color={colors.onPrimary}
            onPress={() => router.back()}
          />
          <View style={{ flex: 1, paddingHorizontal: spacing.sm }}>
            <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'flex-start' }}>
              <AppText
                variant="heading"
                numberOfLines={1}
                color={colors.onPrimary}
                style={{ fontWeight: '700', marginEnd: spacing.md }}>
                {t('common.hymnNumber')} {hymn.number}
              </AppText>
              {languageChips(false)}
            </View>
            <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'flex-start', marginTop: 2 }}>
              {iconToolbar(false)}
            </View>
            {/* Metre under the title when the book provides one. */}
            {shownMeter ? (
              <AppText variant="caption" numberOfLines={1} color={colors.onPrimary} style={{ opacity: 0.7, textAlign: 'right', direction: 'rtl' }}>
                {t('info.meter')}: <MeterText meter={shownMeter} fontSize={typeScale.caption} color={colors.onPrimary} />
              </AppText>
            ) : null}
          </View>
        </View>
      </View>

      {/* Body row: text keeps flex:1 on the left, the slim stanza rail
          docks on the physical right in its own column — never over text. */}

      <View style={{ flex: 1, flexDirection: 'row', direction: 'ltr' }}>
        {/* Keyed by hymn: next/prev remounts, so every verse re-measures
            for the rail and the new hymn opens at the top. */}
        <ScrollView
          key={hymn.id}
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.xxl,
            maxWidth: READER_MAX_WIDTH,
            width: '100%',
            alignSelf: 'center',
          }}>
          {versesView}

          {similar.length > 0 ? (
            <Card style={{ marginTop: spacing.md, padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                {t('reader.similar')}
              </AppText>
              {similar.map((s) => (
                <HymnRow key={s.id} hymn={s} showStar={false} onPress={() => router.push(`/hymn/${s.id}`)} />
              ))}
            </Card>
          ) : null}
        </ScrollView>
        {stanzaRail(false)}
      </View>

      <ReaderSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HymnInfoSheet hymn={infoHymn ? hymn : null} onClose={() => setInfoHymn(false)} />
    </View>
  );
}
