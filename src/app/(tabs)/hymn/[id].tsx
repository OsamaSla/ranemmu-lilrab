/**
 * قارئ الترنيمة — the hymn reader.
 *
 * Layout mirrors the reference app: a vertical icon rail on the physical left
 * edge (star · search · home · fullscreen · settings · info), stanza cards
 * with Arabic-Indic labels and an indented chorus, and circular previous/next
 * controls at the bottom. Fullscreen switches to the pure-black reading
 * surface regardless of the app theme and survives rotation, since the app
 * allows both orientations.
 *
 * Opening a hymn records it in the recents list. Navigating here from search
 * may carry `?verse=<n>` to land on a specific stanza.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, Share, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { HymnInfoSheet } from '../../../components/HymnInfoSheet';
import { HymnRow } from '../../../components/HymnRow';
import { IconButton } from '../../../components/IconButton';
import { ReaderSettingsModal } from '../../../components/ReaderSettingsModal';
import { getCorpus, getHymn, getNeighbours, getSummaries } from '../../../data/loader';
import { toArabicDigits } from '../../../data/normalize';
import { findSimilar } from '../../../data/search';
import { useT } from '../../../hooks/useT';
import { useTheme } from '../../../hooks/useTheme';
import { useLibrary } from '../../../store/library';
import { useSettings } from '../../../store/settings';
import { fontFamilyFor, READER_MAX_WIDTH } from '../../../theme/fonts';
import { palette, radius, spacing } from '../../../theme/tokens';

const RAIL_WIDTH = 56;

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
  const neighbours = useMemo(() => (id ? getNeighbours(id) : {}), [id]);
  const similar = useMemo(
    () =>
      hymn
        ? findSimilar(
            hymn,
            getCorpus().map((h) => ({
              id: h.id,
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

  useEffect(() => {
    if (hymn) touchRecent(hymn.id);
  }, [hymn, touchRecent]);

  const scrollRef = useRef<ScrollView>(null);
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
      '',
      ...hymn.verses.flatMap((v) => [`${v.label}`, ...v.lines, '']),
      `— ${t('appName')}`,
    ].join('\n');

    Share.share({ message: body }).catch(() => {
      /* Dismissed share sheet is not an error worth surfacing. */
    });
  };

  const readerFont = fontFamilyFor(fontId, false);
  const readerFontBold = fontFamilyFor(fontId, true);

  const railButton = (props: {
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
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: RAIL_WIDTH / 2,
        marginBottom: spacing.sm,
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
            {verseBlock.chorus && hymn.chorus ? hymn.chorus : `(${verseBlock.label})`}
          </AppText>
          {verseBlock.lines.map((line, lineIndex) => (
            <View key={lineIndex} style={{ marginBottom: lineIndex < verseBlock.lines.length - 1 ? spacing.xs : 0 }}>
              {stanzaText(line)}
            </View>
          ))}
        </View>
      ))}
    </>
  );

  if (fullscreen) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.readerBg }}>
        <View
          style={{
            paddingTop: insets.top + spacing.sm,
            paddingHorizontal: spacing.sm,
            flexDirection: direction.row,
            justifyContent: 'flex-start',
          }}>
          <IconButton
            name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
            label={t('common.back')}
            color={palette.readerText}
            onPress={() => setFullscreen(false)}
          />
        </View>
        <ScrollView
          ref={scrollRef}
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
            {hymn.number}. {hymn.title}
          </AppText>
          {versesView}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.sm,
          backgroundColor: colors.primaryDeep,
        }}>
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
              {t('common.hymnNumber')} {toArabicDigits(hymn.number)}
            </AppText>
            <AppText variant="caption" numberOfLines={1} color={colors.onPrimary} style={{ opacity: 0.85 }}>
              {hymn.title}
            </AppText>
          </View>
          <IconButton
            name={isFavorite ? 'star' : 'star-outline'}
            label={t('favorites.title')}
            color={isFavorite ? colors.favorite : colors.onPrimary}
            onPress={() => toggleFavorite(hymn.id)}
          />
          <IconButton
            name="share-variant"
            label={t('reader.share')}
            color={colors.onPrimary}
            onPress={shareHymn}
          />
        </View>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Icon rail, pinned to the physical left edge per the reference design. */}
        <View
          style={{
            width: RAIL_WIDTH,
            paddingTop: spacing.lg,
            alignItems: 'center',
          }}>
          {railButton({
            name: isFavorite ? 'star' : 'star-outline',
            label: t('favorites.title'),
            onPress: () => toggleFavorite(hymn.id),
            color: isFavorite ? colors.favorite : colors.text,
          })}
          {railButton({ name: 'magnify', label: t('search.placeholder'), onPress: () => router.push('/search') })}
          {railButton({ name: 'home', label: t('tabs.home'), onPress: () => router.push('/(tabs)') })}
          {railButton({
            name: 'fullscreen',
            label: t('reader.fullscreen'),
            onPress: () => setFullscreen(true),
          })}
          {railButton({ name: 'cog-outline', label: t('reader.settings'), onPress: () => setSettingsOpen(true) })}
          {railButton({ name: 'information-outline', label: t('reader.info'), onPress: () => setInfoHymn(true) })}
        </View>

        {/* Verses */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            flexGrow: 1,
            padding: spacing.lg,
            paddingBottom: spacing.xl,
            paddingStart: spacing.sm,
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
      </View>

      {/* Previous / next */}
      <View
        style={{
          flexDirection: direction.row,
          justifyContent: 'space-between',
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.sm,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
        <NavCircle
          name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
          label={t('reader.previous')}
          enabled={Boolean(neighbours.previous)}
          onPress={() => neighbours.previous && router.replace(`/hymn/${neighbours.previous.id}`)}
        />
        <AppText variant="caption" color={colors.textMuted} style={{ alignSelf: 'center' }}>
          {toArabicDigits(hymn.number)}
        </AppText>
        <NavCircle
          name={direction.isRTL ? 'chevron-left' : 'chevron-right'}
          label={t('reader.next')}
          enabled={Boolean(neighbours.next)}
          onPress={() => neighbours.next && router.replace(`/hymn/${neighbours.next.id}`)}
        />
      </View>

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
