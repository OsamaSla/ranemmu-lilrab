/**
 * قارئ الترنيمة — the hymn reader.
 *
 * The hymn text owns the screen: frequent tools (search, favourite,
 * fullscreen, previous/next and language chips) live in one slim compact
 * icon row in the header — search sits outside the 3-dots menu for one-tap
 * reach. Less frequent actions (info, text settings, share, add to setlist
 * and, for editors, "edit hymn") live in the overflow menu. The bottom tab
 * bar never hides and no tall sheet covers the text. Home is intentionally
 * absent here — the tab bar already provides it. Font size lives inside the
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Platform, ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, Directions, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { HymnInfoSheet } from '../../../components/HymnInfoSheet';
import { LineFixSheet, type FixSavedPayload, type FixTarget } from '../../../components/LineFixSheet';
import { ReaderSettingsModal } from '../../../components/ReaderSettingsModal';
import { SetlistCategoryPicker } from '../../../components/SetlistCategoryPicker';
import { HymnRow } from '../../../components/HymnRow';
import { IconButton } from '../../../components/IconButton';
import { ReaderSearchOverlay } from '../../../components/ReaderSearchOverlay';
import type { SegmentOption } from '../../../components/SegmentedControl';
import { Toast } from '../../../components/Toast';
import { ReaderHeader } from '../../../components/reader/ReaderHeader';
import { ReaderMenu, type ReaderMenuItem } from '../../../components/reader/ReaderMenu';
import { TOOLBAR_HEIGHT } from '../../../components/reader/ReaderToolbar';
import { StanzaRail } from '../../../components/reader/StanzaRail';
import { TranslationNotice } from '../../../components/reader/TranslationNotice';
import { VerseBlock } from '../../../components/reader/VerseBlock';
import type { ReaderLang } from '../../../components/reader/readerText';
import { ensureHymn, getHymn, getLinks, getNeighbours, getSummaries, isHymnPending } from '../../../data/loader';
import { formatScriptureLine } from '../../../data/scriptures';
import { encodeSetIds, parseSetIds, setNeighbours } from '../../../data/setlist';
import { findSimilar } from '../../../data/search';
import { bookLabelKey, translate } from '../../../i18n';
import { useT } from '../../../hooks/useT';
import { useTheme } from '../../../hooks/useTheme';
import { useVerseScroll } from '../../../hooks/useVerseScroll';
import { useCorpusVersion } from '../../../store/corpus';
import { useLibrary } from '../../../store/library';
import { useSetlist } from '../../../store/setlist';
import { useSettings } from '../../../store/settings';
import { useGoBack } from '../../../hooks/useGoBack';
import { useCanEdit } from '../../../hooks/useCanEdit';
import { fontFamilyFor, READER_MAX_WIDTH } from '../../../theme/fonts';
import { notify } from '../../../utils/confirm';
import { palette, spacing } from '../../../theme/tokens';

// Canonical origin — the same one «مشاركة التطبيق» and the setlist share use,
// so a copied hymn link points at the original site on both hosts.
const APP_SITE_URL = 'https://ranemmu-lilrab.web.app/';

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
  const { id, verse, ids: idsParam } = useLocalSearchParams<{ id: string; verse?: string; ids?: string }>();
  const { t, direction } = useT();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const goBack = useGoBack();
  // Editing is admin-only: the long-press below only exists for editors, the
  // same gate the admin editor and the settings sheet's edit button use.
  const canEdit = useCanEdit();
  const { height: windowHeight } = useWindowDimensions();
  useKeepAwake('reader');

  const [searchOpen, setSearchOpen] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [setlistToast, setSetlistToast] = useState<string | null>(null);
  const dismissSetlistToast = useCallback(() => setSetlistToast(null), []);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoHymn, setInfoHymn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);  // Line being corrected in the quick-fix sheet, and the confirmation toast
  // that follows a save. Both are tagged with the hymn they belong to and read
  // through a guard: the screen component survives next/prev navigation, so an
  // untagged sheet would reopen on the new hymn (render-time reset, the same
  // pattern as the translation view below).
  const [fixState, setFixState] = useState<{
    hymnId: string | undefined;
    target: FixTarget | null;
    toast: { message: string; actionLabel?: string; onAction?: () => void } | null;
  }>({ hymnId: id, target: null, toast: null });
  const fixTarget = fixState.hymnId === id ? fixState.target : null;
  const toast = fixState.hymnId === id ? fixState.toast : null;
  const dismissToast = useCallback(
    () => setFixState((state) => ({ ...state, toast: null })),
    [],
  );

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
  // Re-reads the merged corpus on chunk load, override write or cloud patch.
  const corpusVersion = useCorpusVersion();
  // A shared setlist rides in the `ids` query param. When the hymn belongs to
  // that set, prev/next walk the set order instead of the printed book order;
  // a single-hymn link (or a jump from search) simply has no set here.
  const addToSetlist = useSetlist((s) => s.add);
  const setIds = useMemo(() => parseSetIds(idsParam), [idsParam]);
  const inSet = setIds.length > 0;
  const corpusNeighbours = useMemo(() => {
    void corpusVersion;
    return id ? getNeighbours(id) : {};
  }, [id, corpusVersion]);
  const setNav = useMemo(() => {
    void corpusVersion;
    return id ? setNeighbours(setIds, id) : { index: -1, total: 0 };
  }, [setIds, id, corpusVersion]);
  const neighbours =
    inSet && setNav.index >= 0
      ? { previous: setNav.previous, next: setNav.next }
      : corpusNeighbours;

  /** Prev/next keep the setlist context on the URL so the sequence survives. */
  const goToHymn = useCallback(
    (targetId: string) => {
      const query = inSet ? `?ids=${encodeSetIds(setIds)}` : '';
      router.replace(`/hymn/${targetId}${query}`);
    },
    [inSet, setIds, router],
  );

  const similar = useMemo(
    () =>
      hymn
        ? findSimilar(
            hymn,
            getSummaries().filter((h) => (h.book ?? 'main') === (hymn.book ?? 'main')),
            5,
          )
        : [],
    [hymn],
  );
  // The same hymn as printed by another book (61 hymns appear in two books or
  // more). Its siblings are a link, not a similarity: the text is identical, so
  // the reader only needs to point at them.
  const linked = useMemo(() => {
    void corpusVersion; // carries admin renames and tombstoned copies.
    return id ? getLinks(id) : [];
  }, [id, corpusVersion]);

  // Web keyboard shortcuts for the reader.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (neighbours.previous) goToHymn(neighbours.previous.id);
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (neighbours.next) goToHymn(neighbours.next.id);
          break;
        case '/':
          event.preventDefault();
          setSearchOpen(true);
          break;
        case 'Escape':
          if (searchOpen) setSearchOpen(false);
          else if (overflowOpen) setOverflowOpen(false);
          else if (fullscreen) setFullscreen(false);
          else if (settingsOpen) setSettingsOpen(false);
          else if (infoHymn) setInfoHymn(false);
          break;
        case '+':
        case '=':
          event.preventDefault();
          useSettings.getState().increaseReaderSize();
          break;
        case '-':
          event.preventDefault();
          useSettings.getState().decreaseReaderSize();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          if (fullscreen) setFullscreen(false);
          else setFullscreen(true);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [neighbours.previous, neighbours.next, goToHymn, searchOpen, overflowOpen, fullscreen, settingsOpen, infoHymn]);

  // The hymn body lives in a lazily imported chunk: show a loading shell
  // until it lands, then bump state so getHymn() sees the new chunk. This
  // shell is also what the pre-rendered page contains, and the client renders
  // the app from scratch (no hydration), so the two never have to agree.
  const pendingChunk = id !== undefined && isHymnPending(id);
  useEffect(() => {
    if (!id) return;
    void ensureHymn(id).catch(() => {
      /* Falls through to the not-found state below. */
    });
  }, [id]);

  // Per-hymn translation view. Arabic is always the master text; a
  // translation renders line-by-line beside it and never replaces it.
  // The toggle only exists when this hymn actually carries a translation.
  // The view resets to Arabic when navigating (render-time reset, no effect).
  const [view, setView] = useState<{ id: string | string[] | undefined; lang: ReaderLang }>({
    id,
    lang: 'ar',
  });
  if (view.id !== id) setView({ id, lang: 'ar' });
  const parallel = view.id === id ? view.lang : 'ar';
  const chooseParallel = (lang: ReaderLang) => setView({ id, lang });

  const hasEn = Boolean(hymn?.title_en ?? hymn?.verses_en);
  const hasDe = Boolean(hymn?.title_de ?? hymn?.verses_de);
  const hasHe = Boolean(hymn?.title_he ?? hymn?.verses_he);
  // One lookup object per language keeps the three parallel fields in step;
  // Arabic has no translation record and yields undefined.
  const translation =
    parallel === 'en'
      ? { verses: hymn?.verses_en, title: hymn?.title_en, chorus: hymn?.chorus_en }
      : parallel === 'de'
        ? { verses: hymn?.verses_de, title: hymn?.title_de, chorus: hymn?.chorus_de }
        : parallel === 'he'
          ? { verses: hymn?.verses_he, title: hymn?.title_he, chorus: hymn?.chorus_he }
          : undefined;
  const transVerses = translation?.verses;
  const transTitle = translation?.title;
  // Books 2 and 3 flag refrains but carry no chorus label fields. Supply the
  // word in the *viewed* language (not the UI language) so the red heading reads
  // `القرار · Refrain` / `القرار · Kehrvers` / `القرار · פְּזָמוֹן` exactly as it
  // does in Book 1, whose chorus_en/de/he carry the same words. Arabic-only
  // reading keeps the printed Arabic label on its own.
  const transChorus =
    translation?.chorus ??
    (parallel === 'ar'
      ? undefined
      : parallel === 'he'
        ? 'פְּזָמוֹן'
        : translate(parallel, 'reader.refrain'));
  // Where the hymn's subject is founded in scripture, printed once above the
  // first stanza. It belongs to the hymn, not the interface language, so it is
  // always Arabic and never translated. Empty when no reference is known.
  const scriptureLine = formatScriptureLine(hymn?.scriptures);

  const translationOptions: SegmentOption<ReaderLang>[] = [
    { value: 'ar', label: 'العربية' },
    ...(hasEn ? [{ value: 'en', label: 'English' } as const] : []),
    ...(hasDe ? [{ value: 'de', label: 'Deutsch' } as const] : []),
    ...(hasHe ? [{ value: 'he', label: 'עברית' } as const] : []),
  ];

  useEffect(() => {
    if (hymn) touchRecent(hymn.id);
  }, [hymn, touchRecent]);

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

  // Stanza-rail measurement and scroll tracking live in one hook, shared by
  // the rail, the verse blocks and the quick-fix sheet.
  const {
    scrollRef,
    activeVerseIndex,
    onReaderScroll,
    scrollToVerse,
    onVerseLayout,
    onLineLayout,
    stanzaOffset,
    lineOffsets,
    scrollY,
  } = useVerseScroll(id, hymn, verse);

  /**
   * Opens the quick fix on one line. The line is brought into the upper part
   * of the screen first: the sheet and the keyboard cover the bottom half, and
   * a correction made without seeing the surrounding stanza is how wrong words
   * get pasted over right ones.
   */
  const openLineFix = (verseIndex: number, lineIndex: number, stanzaLabel: string) => {
    if (!canEdit) return;
    const stanzaY = stanzaOffset(verseIndex);
    const lineY = lineOffsets.current.get(`${id}:${verseIndex}:${lineIndex}`);
    if (stanzaY !== undefined && lineY !== undefined) {
      // + padding: the line is measured inside the stanza's padded box.
      const absolute = stanzaY + lineY + spacing.md;
      const onScreen = absolute - scrollY.current;
      if (onScreen < 0 || onScreen > windowHeight * 0.3) {
        scrollRef.current?.scrollTo({
          y: Math.max(0, absolute - windowHeight * 0.2),
          animated: true,
        });
      }
    }
    setFixState({ hymnId: id, target: { verseIndex, lineIndex, stanzaLabel }, toast: null });
  };

  /**
   * Closes the sheet immediately (the local save has already happened) and
   * reports the cloud result when it lands. Undo re-applies the arrays
   * captured before the write; it is deliberately one tap, because a typo
   * pasted during singing must be reversible without opening anything.
   */
  const onFixSaved = ({ undo, sync }: FixSavedPayload) => {
    const runUndo = () => {
      undo();
      setFixState((state) => ({ ...state, toast: null }));
    };
    setFixState({
      hymnId: id,
      target: null,
      toast: {
        message: t('reader.fixSaved'),
        actionLabel: t('reader.fixUndo'),
        onAction: runUndo,
      },
    });
    void sync.then((state) => {
      const key =
        state === 'uploaded'
          ? 'reader.fixSavedCloud'
          : state === 'local'
            ? 'reader.fixSavedLocal'
            : state === 'noauth'
              ? 'reader.fixSyncNoAuth'
              : 'reader.fixSyncFailed';
      setFixState((current) =>
        current.toast ? { ...current, toast: { ...current.toast, message: t(key) } } : current,
      );
    });
  };

  if (!hymn) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top }}>
        <View style={{ flexDirection: direction.row, paddingHorizontal: spacing.sm }}>
          <IconButton
            name={direction.isRTL ? 'chevron-right' : 'chevron-left'}
            label={t('common.back')}
            onPress={goBack}
          />
        </View>
        {pendingChunk ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
            <AppText variant="body" color={colors.textMuted} center>
              {t('common.loading')}
            </AppText>
          </View>
        ) : (
          <EmptyState icon="book-remove-outline" title={t('common.notFound')} />
        )}
      </View>
    );
  }

  const shareHymn = () => {
    // A direct link alongside the text, matching «مشاركة التطبيق»: recipients
    // can open the hymn in the app instead of reading a pasted wall of text.
    const hymnUrl = `${APP_SITE_URL}hymn/${hymn.id}`;
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
      hymnUrl,
      `— ${t('appName')}`,
    ].join('\n');

    // On web without a native share sheet, copy just the link — the same
    // behaviour as the app share in the More menu.
    const tryClipboard = async () => {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(hymnUrl);
          setShareToast(true);
          return;
        } catch {
          /* Fall through to notify. */
        }
      }
      notify(t('more.title'), body);
    };

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.share) {
      void tryClipboard();
      return;
    }
    Share.share({ message: body, url: hymnUrl }).catch(() => {
      void tryClipboard();
    });
  };

  const swipeLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      if (neighbours.next) goToHymn(neighbours.next.id);
    });
  const swipeRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      if (neighbours.previous) goToHymn(neighbours.previous.id);
    });
  const swipeGesture = Gesture.Race(swipeLeft, swipeRight);

  const readerFont = fontFamilyFor(fontId, false);
  const readerFontBold = fontFamilyFor(fontId, true);

  /**
   * Compact icon button for the header toolbar. Transparent background,
   * 40px touch target by default, coloured icon. The prev/next pair uses a
   * narrower 34px box so the whole row fits small phones without scrolling —
   * hitSlop still keeps the effective touch area above 48px.
   */
  const versesView = (
    <>
      {/* Where the hymn is founded in scripture: one small centred line above
          the first stanza, in Arabic whatever the UI language. Deliberately
          not tappable — the app bundles no Bible text, so the reference is a
          pointer for the reader, not a link. Hidden when nothing is known. */}
      {scriptureLine ? (
        <View
          style={{
            flexDirection: direction.row,
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            marginBottom: spacing.md,
            paddingHorizontal: spacing.sm,
          }}>
          <MaterialCommunityIcons
            name="book-cross"
            size={13}
            color={fullscreen ? palette.readerText : colors.textMuted}
            style={{ opacity: fullscreen ? 0.7 : 0.85 }}
          />
          <AppText
            numberOfLines={2}
            accessibilityLabel={scriptureLine}
            style={{
              flexShrink: 1,
              fontSize: 12,
              lineHeight: 18,
              writingDirection: 'rtl',
              textAlign: 'center',
              color: fullscreen ? palette.readerText : colors.textMuted,
              opacity: fullscreen ? 0.8 : 0.9,
            }}>
            {scriptureLine}
          </AppText>
        </View>
      ) : null}
      {hymn.verses.map((verseBlock, verseIndex) => (
        <VerseBlock
          key={verseIndex}
          verseBlock={verseBlock}
          verseIndex={verseIndex}
          chorusWord={hymn.chorus}
          transChorus={transChorus}
          transLines={transVerses?.[verseIndex]?.lines}
          parallel={parallel}
          readerSize={readerSize}
          readerFont={readerFont}
          readerFontBold={readerFontBold}
          fullscreen={fullscreen}
          isDark={isDark}
          canEdit={canEdit}
          onVerseLayout={onVerseLayout}
          onLineLayout={onLineLayout}
          onLongPressLine={openLineFix}
        />
      ))}
      {/* A disclaimer belongs after the text, not before it: on a phone it
          otherwise pushes the first stanza down. It stays with the translation
          rather than in the info sheet, so readers still see the caveat. */}
      <TranslationNotice
        parallel={parallel}
        status={hymn.translationStatus}
        fullscreen={fullscreen}
      />
    </>
  );

  // Stanza jumps live in the slim side rail beside the text, not in the
  // panel. The refrain needs no extra button: it has its own highlighted
  // dot in that rail.

  const fixOverlays = (
    <>
      {toast ? (
        <Toast
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onDismiss={dismissToast}
          bottom={insets.bottom + spacing.lg}
        />
      ) : null}
      {fixTarget ? (
        <LineFixSheet
          hymn={hymn}
          target={fixTarget}
          preferredLang={parallel === 'ar' ? null : parallel}
          readerSize={readerSize}
          fontId={fontId}
          onClose={() => setFixState((state) => ({ ...state, target: null }))}
          onSaved={onFixSaved}
        />
      ) : null}
    </>
  );

  const toolbarProps = {
    dark: fullscreen,
    number: hymn.number,
    neighbours,
    inSet,
    setIndex: setNav.index,
    setTotal: setNav.total,
    onGoTo: goToHymn,
    fullscreen,
    onFullscreen: () => {
      if (fullscreen) exitFullscreen();
      else setFullscreen(true);
    },
    isFavorite,
    onToggleFavorite: () => toggleFavorite(hymn.id),
    onSearch: () => setSearchOpen(true),
    onOverflow: () => setOverflowOpen(true),
  };

  const menuItems: ReaderMenuItem[] = [
    { icon: 'information-outline' as const, label: t('reader.info'), onPress: () => { setOverflowOpen(false); setInfoHymn(true); } },
    { icon: 'cog-outline' as const, label: t('reader.settings'), onPress: () => { setOverflowOpen(false); setSettingsOpen(true); } },
    { icon: 'share-variant' as const, label: t('reader.share'), onPress: () => { setOverflowOpen(false); shareHymn(); } },
    { icon: 'playlist-plus' as const, label: t('setlist.addCurrent'), onPress: () => {
        setOverflowOpen(false);
        setCategoryPickerOpen(true);
      } },
    ...(canEdit
      ? [{ icon: 'pencil-outline' as const, label: t('admin.editHymn'), onPress: () => {
          setOverflowOpen(false);
          router.push({ pathname: '/admin-edit', params: { id: hymn.id } });
        } }]
      : []),
  ];

  // The picker resolves the category first; adding is a second, explicit tap
  // so a hymn never lands in an unintended group.
  const onPickCategory = (categoryId: string) => {
    setSetlistToast(
      addToSetlist(hymn.id, categoryId) ? t('setlist.added') : t('setlist.alreadyAdded'),
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: fullscreen ? palette.readerBg : colors.canvas,
        opacity: fullscreen ? fadeAnim : 1,
      }}>
      <ReaderHeader
        fullscreen={fullscreen}
        onBack={goBack}
        topInset={insets.top}
        toolbarProps={toolbarProps}
      />

      <View style={{ flex: 1, flexDirection: 'row', direction: 'ltr' }}>
        <StanzaRail
          dark={fullscreen}
          verses={hymn.verses}
          linked={linked}
          chorusWord={hymn.chorus}
          transChorus={transChorus}
          activeVerseIndex={activeVerseIndex}
          onVerseSelect={scrollToVerse}
          readerFont={readerFont}
          readerFontBold={readerFontBold}
          translationOptions={translationOptions}
          parallel={parallel}
          onChooseLang={chooseParallel}
        />
        {/* RNGH defaults to `touch-action: none` on web, which also stopped the
            wrapped scroller from taking touch pans — on a phone the stanza dots
            were the only way down a long hymn. `pan-y` hands vertical pans back
            to the browser and leaves horizontal ones for the fling. */}
        <GestureDetector gesture={swipeGesture} touchAction="pan-y">
        <ScrollView
          key={hymn.id}
          ref={scrollRef}
          onScroll={onReaderScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          contentContainerStyle={
            fullscreen
              ? {
                  paddingHorizontal: spacing.xl,
                  paddingBottom: insets.bottom + spacing.xxl,
                  maxWidth: READER_MAX_WIDTH,
                  width: '100%',
                  alignSelf: 'center',
                }
              : {
                  flexGrow: 1,
                  padding: spacing.lg,
                  paddingBottom: insets.bottom + spacing.xxl,
                  maxWidth: READER_MAX_WIDTH,
                  width: '100%',
                  alignSelf: 'center',
                }
          }>
          {versesView}
          {!fullscreen && linked.length > 0 ? (
            <Card style={{ marginTop: spacing.md, padding: spacing.md }}>
              <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                {t('reader.alsoIn')}
              </AppText>
              {linked.map((sibling) => (
                <HymnRow
                  key={sibling.id}
                  hymn={sibling}
                  showStar={false}
                  subtitle={t(bookLabelKey(sibling.book))}
                  onPress={() => router.push(`/hymn/${sibling.id}`)}
                />
              ))}
            </Card>
          ) : null}
          {!fullscreen && similar.length > 0 ? (
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
        </GestureDetector>
      </View>

      {searchOpen ? (
        <ReaderSearchOverlay
          onClose={() => setSearchOpen(false)}
          onSelect={(nextId) => {
            setSearchOpen(false);
            router.push(`/hymn/${nextId}`);
          }}
          currentBook={hymn.book ?? 'main'}
        />
      ) : null}
      <HymnInfoSheet hymn={infoHymn ? hymn : null} onClose={() => setInfoHymn(false)} />
      <ReaderSettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        hymn={hymn}
      />
      <ReaderMenu
        visible={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        items={menuItems}
        top={insets.top + TOOLBAR_HEIGHT + spacing.sm}
      />
      <SetlistCategoryPicker
        visible={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        onPick={onPickCategory}
      />
{fixOverlays}
      {shareToast ? (
        <Toast
          message={t('reader.copied')}
          onDismiss={() => setShareToast(false)}
          bottom={insets.bottom + spacing.lg}
        />
      ) : null}
      {setlistToast ? (
        <Toast
          message={setlistToast}
          onDismiss={dismissSetlistToast}
          bottom={insets.bottom + spacing.lg}
        />
      ) : null}
    </Animated.View>
    </GestureHandlerRootView>
  );
}
