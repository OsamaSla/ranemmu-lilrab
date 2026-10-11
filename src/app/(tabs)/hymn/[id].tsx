/**
 * قارئ الترنيمة — the hymn reader.
 *
 * The hymn text owns the screen: every tool (favourite, share, search,
 * fullscreen, text settings, info, translation switch, jump-to-number,
 * previous/next, stanza jumps) hides behind one tiny floating button that
 * opens an overlay panel, so nothing steals width from the text on mobile.
 * A second tiny button jumps straight to the refrain — handy in a live
 * assembly when the refrain sits far above the current stanza. Stanza chips
 * in the panel jump to any stanza without scrolling. Fullscreen uses the
 * same floating buttons over its pure-black reading surface.
 *
 * Opening a hymn records it in the recents list. Navigating here from the
 * library may carry `?verse=<n>` to land on a specific stanza.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Animated, Modal, Pressable, ScrollView, Share, Text as RNText, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { HymnInfoSheet } from '../../../components/HymnInfoSheet';
import { HymnRow } from '../../../components/HymnRow';
import { IconButton } from '../../../components/IconButton';
import { ReaderSettingsModal } from '../../../components/ReaderSettingsModal';
import { SegmentedControl, type SegmentOption } from '../../../components/SegmentedControl';
import { getCorpus, getHymn, getNeighbours, getSummaries } from '../../../data/loader';
import { normalize } from '../../../data/normalize';
import { findSimilar } from '../../../data/search';
import { useT } from '../../../hooks/useT';
import { useTheme } from '../../../hooks/useTheme';
import { useLibrary } from '../../../store/library';
import { useOverrides } from '../../../store/overrides';
import { useSettings } from '../../../store/settings';
import { fontFamilyFor, READER_MAX_WIDTH } from '../../../theme/fonts';
import { palette, radius, spacing } from '../../../theme/tokens';

/** Diameter of the tiny floating buttons — the only chrome sharing the screen. */
const FAB_SIZE = 44;

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
  const { colors, fontFamily } = useTheme();
  const insets = useSafeAreaInsets();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoHymn, setInfoHymn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // Every tool hides behind one tiny floating button; the panel below is
  // the only place they appear, as an overlay that never reflows the text.
  const [toolsOpen, setToolsOpen] = useState(false);

  const readerSize = useSettings((s) => s.readerSize);
  const increaseReaderSize = useSettings((s) => s.increaseReaderSize);
  const decreaseReaderSize = useSettings((s) => s.decreaseReaderSize);
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

  // Jump bar: a hymn number goes straight there, anything else opens the
  // library with the text prefilled as its search filter.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  const summaries = useMemo(() => getSummaries(hymn?.book ?? 'main'), [corpusVersion, hymn?.book]);
  const [jump, setJump] = useState('');
  const submitJump = () => {
    const q = jump.trim();
    if (!q) return;
    const digits = normalize(q).text;
    if (/^\d+$/.test(digits)) {
      const target = summaries.find((s) => s.number === Number(digits));
      setJump('');
      if (target) {
        router.replace(`/hymn/${target.id}`);
        return;
      }
    } else {
      setJump('');
    }
    router.push({ pathname: '/library', params: { q } });
  };

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

  const verseOffsets = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    verseOffsets.current.clear();
  }, [id]);

  const scrollToVerse = (verseIndex: number) => {
    const y = verseOffsets.current.get(verseIndex);
    if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.lg), animated: true });
  };

  const onVerseLayout = (verseIndex: number) => (event: LayoutChangeEvent) => {
    verseOffsets.current.set(verseIndex, event.nativeEvent.layout.y);
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

  /**
   * One small circular icon for the tools panel rows. Everything lives on
   * this bordered disc so the panel reads as a single toolbar.
   */
  const panelIcon = (props: {
    name: ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    onPress: () => void;
    color?: string;
  }) => (
    <IconButton
      name={props.name}
      label={props.label}
      onPress={props.onPress}
      color={props.color ?? colors.text}
      style={{
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    />
  );

  /**
   * Tiny floating button overlaid on the text — tools opener and refrain
   * shortcut. Absolute, translucent, one per corner at most.
   */
  const fabButton = (props: {
    name: ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    onPress: () => void;
    dark?: boolean;
    position: ({ bottom: number } | { top: number }) & ({ left: number } | { right: number });
  }) => (
    <IconButton
      name={props.name}
      label={props.label}
      onPress={props.onPress}
      size={22}
      color={props.dark ? palette.readerText : colors.text}
      style={{
        position: 'absolute',
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        backgroundColor: props.dark ? 'rgba(255,255,255,0.16)' : colors.surface,
        borderWidth: 1,
        borderColor: props.dark ? 'rgba(255,255,255,0.3)' : colors.border,
        opacity: 0.92,
        ...props.position,
      }}
    />
  );

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

  // Assembly-friendly jumps: the refrain's stanza index (if any) and a
  // chip per stanza. Closing the panel first keeps the scroll smooth.
  const chorusIndex = hymn.verses.findIndex((v) => v.chorus);
  const goToVerse = (verseIndex: number) => {
    setToolsOpen(false);
    setTimeout(() => scrollToVerse(verseIndex), 60);
  };

  /**
   * Every tool in one overlay panel, shared by normal and fullscreen modes:
   * back · favourite · share · library search · home · fullscreen toggle ·
   * font size · text settings · info · translation switch · jump-to-number ·
   * previous/next · stanza chips. Nothing here reflows the hymn text.
   */
  const toolsPanel = (
    <Modal
      visible={toolsOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setToolsOpen(false)}
      statusBarTranslucent>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        onPress={() => setToolsOpen(false)}
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={() => {
            /* Swallow: keeps the panel open while it's being interacted with. */
          }}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.lg,
            maxHeight: '80%',
          }}>
          <View
            style={{
              flexDirection: direction.row,
              alignItems: 'center',
              marginBottom: spacing.md,
            }}>
            <AppText variant="heading" style={{ flex: 1, fontWeight: '700' }}>
              {t('reader.tools')}
            </AppText>
            <IconButton name="close" label={t('common.close')} onPress={() => setToolsOpen(false)} />
          </View>

          <View
            style={{
              flexDirection: direction.row,
              flexWrap: 'wrap',
              gap: spacing.md,
              marginBottom: spacing.md,
            }}>
            {panelIcon({
              name: direction.isRTL ? 'chevron-right' : 'chevron-left',
              label: t('common.back'),
              onPress: () => {
                setToolsOpen(false);
                router.back();
              },
            })}
            {panelIcon({
              name: isFavorite ? 'star' : 'star-outline',
              label: t('favorites.title'),
              onPress: () => toggleFavorite(hymn.id),
              color: isFavorite ? colors.favorite : colors.text,
            })}
            {panelIcon({ name: 'share-variant', label: t('reader.share'), onPress: shareHymn })}
            {panelIcon({
              name: 'magnify',
              label: t('search.placeholder'),
              onPress: () => {
                setToolsOpen(false);
                router.push('/library');
              },
            })}
            {panelIcon({
              name: 'home',
              label: t('tabs.home'),
              onPress: () => {
                setToolsOpen(false);
                router.push('/(tabs)');
              },
            })}
            {panelIcon({
              name: fullscreen ? 'fullscreen-exit' : 'fullscreen',
              label: fullscreen ? t('reader.exitFullscreen') : t('reader.fullscreen'),
              onPress: () => {
                setToolsOpen(false);
                if (fullscreen) exitFullscreen();
                else setFullscreen(true);
              },
            })}
            {panelIcon({
              name: 'minus',
              label: t('reader.decreaseFont'),
              onPress: decreaseReaderSize,
            })}
            {panelIcon({
              name: 'plus',
              label: t('reader.increaseFont'),
              onPress: increaseReaderSize,
            })}
            {panelIcon({
              name: 'cog-outline',
              label: t('reader.settings'),
              onPress: () => {
                setToolsOpen(false);
                setSettingsOpen(true);
              },
            })}
            {hymn.meter
              ? panelIcon({
                  name: 'information-outline',
                  label: t('reader.info'),
                  onPress: () => {
                    setToolsOpen(false);
                    setInfoHymn(true);
                  },
                })
              : null}
          </View>

          {hasEn || hasDe ? (
            <View style={{ marginBottom: spacing.md }}>
              <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>
                {t('reader.translation')}
              </AppText>
              <SegmentedControl value={parallel} onChange={chooseParallel} options={translationOptions} />
            </View>
          ) : null}

          <View
            style={{
              flexDirection: direction.row,
              alignItems: 'center',
              marginBottom: spacing.md,
            }}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
            <TextInput
              value={jump}
              onChangeText={setJump}
              onSubmitEditing={() => {
                submitJump();
                setToolsOpen(false);
              }}
              returnKeyType="search"
              placeholder={t('reader.jumpPlaceholder')}
              placeholderTextColor={colors.textMuted}
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
            <Pressable
              onPress={() => {
                submitJump();
                setToolsOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('reader.jump')}
              android_ripple={{ color: colors.border }}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radius.pill,
                backgroundColor: colors.primary,
                opacity: pressed ? 0.75 : 1,
              })}>
              <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
                {t('reader.jump')}
              </AppText>
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: direction.row,
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}>
            <NavCircle
              name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
              label={t('reader.previous')}
              enabled={Boolean(neighbours.previous)}
              onPress={() => {
                setToolsOpen(false);
                if (neighbours.previous) router.replace(`/hymn/${neighbours.previous.id}`);
              }}
            />
            <AppText variant="caption" color={colors.textMuted}>
              {hymn.number}
            </AppText>
            <NavCircle
              name={direction.isRTL ? 'chevron-left' : 'chevron-right'}
              label={t('reader.next')}
              enabled={Boolean(neighbours.next)}
              onPress={() => {
                setToolsOpen(false);
                if (neighbours.next) router.replace(`/hymn/${neighbours.next.id}`);
              }}
            />
          </View>

          <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>
            {t('reader.stanzas')}
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: direction.row, gap: spacing.sm }}>
              {hymn.verses.map((verseBlock, verseIndex) => (
                <Pressable
                  key={`${verseIndex}-${verseBlock.label}`}
                  onPress={() => goToVerse(verseIndex)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    verseBlock.chorus ? (hymn.chorus ?? t('reader.refrain')) : `${t('reader.verseOf')} ${verseBlock.label}`
                  }
                  android_ripple={{ color: colors.border }}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.pill,
                    backgroundColor: verseBlock.chorus ? colors.accent : colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: verseBlock.chorus ? colors.accent : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <AppText
                    variant="label"
                    color={verseBlock.chorus ? colors.onPrimary : colors.text}
                    style={{ fontWeight: '700' }}>
                    {verseBlock.chorus ? (hymn.chorus ?? t('reader.refrain')) : verseBlock.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (fullscreen) {
    return (
      <Animated.View style={{ flex: 1, backgroundColor: palette.readerBg, opacity: fadeAnim }}>
        {fabButton({
          name: direction.isRTL ? 'chevron-right' : 'chevron-left',
          label: t('common.back'),
          onPress: () => router.back(),
          dark: true,
          position: {
            top: insets.top + spacing.sm,
            ...(direction.isRTL ? { right: spacing.sm } : { left: spacing.sm }),
          },
        })}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: insets.bottom + spacing.xxl + FAB_SIZE,
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
          {hymn.meter ? (
            <AppText
              variant="caption"
              center
              style={{ color: palette.readerText, opacity: 0.7, marginBottom: spacing.lg }}>
              {t('info.meter')}: {hymn.meter}
            </AppText>
          ) : null}
          {versesView}
        </ScrollView>
        {fabButton({
          name: 'dots-horizontal',
          label: t('reader.tools'),
          onPress: () => setToolsOpen(true),
          dark: true,
          position: {
            bottom: insets.bottom + spacing.lg,
            ...(direction.isRTL ? { left: spacing.lg } : { right: spacing.lg }),
          },
        })}
        {chorusIndex !== -1
          ? fabButton({
              name: 'repeat',
              label: t('reader.refrain'),
              onPress: () => scrollToVerse(chorusIndex),
              dark: true,
              position: {
                bottom: insets.bottom + spacing.lg,
                ...(direction.isRTL ? { right: spacing.lg } : { left: spacing.lg }),
              },
            })
          : null}
        {toolsPanel}
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Slim header: navigation + title only — every tool moved to the panel. */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.md,
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
        <View style={{ flexDirection: direction.row, alignItems: 'center' }}>
          <IconButton
            name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
            label={t('common.back')}
            color={colors.onPrimary}
            onPress={() => router.back()}
          />
          <View style={{ flex: 1, paddingHorizontal: spacing.sm }}>
            <AppText
              variant="heading"
              numberOfLines={1}
              color={colors.onPrimary}
              style={{ fontWeight: '700' }}>
              {t('common.hymnNumber')} {hymn.number}
            </AppText>
            <AppText variant="caption" numberOfLines={1} color={colors.onPrimary} style={{ opacity: 0.85 }}>
              {transTitle ? `${hymn.title} / ${transTitle}` : hymn.title}
            </AppText>
            {/* Metre under the title when the book provides one. */}
            {hymn.meter ? (
              <AppText variant="caption" numberOfLines={1} color={colors.onPrimary} style={{ opacity: 0.7 }}>
                {t('info.meter')}: {hymn.meter}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>

      {/* Verses own the full width now — no side rail on mobile. */}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          flexGrow: 1,
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl + FAB_SIZE,
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

      {fabButton({
        name: 'dots-horizontal',
        label: t('reader.tools'),
        onPress: () => setToolsOpen(true),
        position: {
          bottom: insets.bottom + spacing.lg,
          ...(direction.isRTL ? { left: spacing.lg } : { right: spacing.lg }),
        },
      })}
      {chorusIndex !== -1
        ? fabButton({
            name: 'repeat',
            label: t('reader.refrain'),
            onPress: () => scrollToVerse(chorusIndex),
            position: {
              bottom: insets.bottom + spacing.lg,
              ...(direction.isRTL ? { right: spacing.lg } : { left: spacing.lg }),
            },
          })
        : null}
      {toolsPanel}

      <ReaderSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HymnInfoSheet hymn={infoHymn ? hymn : null} onClose={() => setInfoHymn(false)} />
    </View>
  );
}

function NavCircle({
  name,
  label,
  enabled,
  onPress,
}: {
  name: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      android_ripple={{ color: colors.border }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: enabled ? colors.primary : colors.surfaceMuted,
        borderWidth: 1,
        borderColor: enabled ? colors.primary : colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: !enabled ? 0.4 : pressed ? 0.75 : 1,
      })}>
      <MaterialCommunityIcons name={name} size={26} color={enabled ? colors.onPrimary : colors.textMuted} />
    </Pressable>
  );
}
