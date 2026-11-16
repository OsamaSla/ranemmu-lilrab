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
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, Share, Text as RNText, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';import { Gesture, GestureDetector, Directions, GestureHandlerRootView } from 'react-native-gesture-handler';import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { HymnInfoSheet } from '../../../components/HymnInfoSheet';
import { LineFixSheet, type FixSavedPayload, type FixTarget } from '../../../components/LineFixSheet';
import { ReaderSettingsModal } from '../../../components/ReaderSettingsModal';
import { HymnRow } from '../../../components/HymnRow';
import { IconButton } from '../../../components/IconButton';
import { ReaderSearchOverlay } from '../../../components/ReaderSearchOverlay';
import type { SegmentOption } from '../../../components/SegmentedControl';
import { Toast } from '../../../components/Toast';
import { ensureHymn, getHymn, getLinks, getNeighbours, getSummaries, isHymnPending } from '../../../data/loader';
import { formatScriptureLine } from '../../../data/scriptures';
import { allTopicsOf } from '../../../data/topics';
import { findSimilar } from '../../../data/search';
import { bookLabelKey } from '../../../i18n';
import { useT } from '../../../hooks/useT';
import { useTheme } from '../../../hooks/useTheme';
import { useLibrary } from '../../../store/library';
import { useOverrides } from '../../../store/overrides';
import { useRemote } from '../../../store/remote';
import { useSettings } from '../../../store/settings';
import { useGoBack } from '../../../hooks/useGoBack';
import { useCanEdit } from '../../../hooks/useCanEdit';
import { fontFamilyFor, READER_MAX_WIDTH } from '../../../theme/fonts';
import { notify } from '../../../utils/confirm';
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
 * Languages the reader can show beside the Arabic text. `he` is
 * hand-authored liturgical Hebrew: it is right-to-left and carries niqqud,
 * so it is rendered differently from the Latin translations.
 */
type ReaderLang = 'ar' | 'en' | 'de' | 'he';

/**
 * AI-translation disclaimer, always in the language being viewed (not the
 * UI language): English readers get the English note, German readers the
 * German one, Hebrew readers the Hebrew one. Arabic needs none — it is the
 * original text.
 *
 * Hebrew has no per-language status (`translationStatus` is one flag for the
 * whole record and is set by the EN/DE review), so its note is not gated on
 * that flag: it always shows, and no badge accompanies it.
 */
const TRANSLATION_NOTES = {
  en: 'This English translation was made by AI and is not 100% reliable — it only gives the main idea of the hymn.',
  de: 'Diese deutsche Übersetzung wurde von einer KI erstellt und ist nicht zu 100 % zuverlässig — sie gibt nur die Hauptidee des Liedes wieder.',
  he: 'התרגום העברי הזה נעשה על ידי בינה מלאכותית ואינו אמין ב־100% — הוא נותן רק את הרעיון המרכזי של המזמור.',
} as const;

/**
 * Review badge shown above a translation, always in the viewed language.
 * Arabic needs neither — it is the original text.
 */
const TRANSLATION_STATUS_LABEL = {
  AI_DRAFT: { en: 'AI draft', de: 'KI-Entwurf' },
  VERIFIED: { en: 'Verified', de: 'Geprüft' },
} as const;

/**
 * Language-chip colours: one saturated fill and one pale tint per language,
 * so the chips stay distinguishable in both themes. Hebrew gets indigo — it
 * must not reuse Arabic gold or the EN blue.
 */
const CHIP_COLORS: Record<ReaderLang, { fill: string; tint: string }> = {
  ar: { fill: '#C5A03D', tint: '#FFF8E1' },
  en: { fill: '#1565C0', tint: '#E3F2FD' },
  de: { fill: '#2E7D32', tint: '#E8F5E9' },
  he: { fill: '#5E35B1', tint: '#EDE7F6' },
};

/** Printed word for a refrain when neither the hymn nor its label carries one. */
const REFRAIN_FALLBACK = 'القرار';

/** A label that is nothing but a stanza number ("1", "١", "12"). */
const NUMBER_LABEL = /^[0-9\u0660-\u0669]+$/;

/**
 * Heading printed above a refrain stanza. The hymn's `chorus` field is the
 * canonical word and its translation may be shown beside it. Hymns saved by
 * older versions of the admin editor still carry the stanza number in
 * `label` (a refrain flagged "1" rendered as "(1)", looking like stanza 1),
 * so a bare number is never shown for a refrain.
 */
function refrainHeading(
  chorus: string | undefined,
  translated: string | undefined,
  label: string | undefined,
): string {
  if (chorus?.trim() && translated?.trim() && translated !== chorus) {
    return `${chorus} · ${translated}`;
  }
  if (chorus?.trim()) return chorus;
  if (translated?.trim()) return translated;
  const printed = label?.trim();
  if (printed && !NUMBER_LABEL.test(printed)) return printed;
  return REFRAIN_FALLBACK;
}

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
  // Re-reads the merged corpus whenever an admin override lands.
  const corpusVersion = useOverrides((s) => s.updatedAt);
  // Re-renders when cloud edits stream in (getHymn above re-merges).
  const remoteVersion = useRemote((s) => s.updatedAt);
  // corpusVersion only retriggers these after admin edits land.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const neighbours = useMemo(() => (id ? getNeighbours(id) : {}), [id, corpusVersion, remoteVersion]);
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
  const linked = useMemo(
    () => (id ? getLinks(id) : []),
    // corpusVersion/remoteVersion carry admin renames and tombstoned copies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, corpusVersion, remoteVersion],
  );

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
          if (neighbours.previous) router.replace(`/hymn/${neighbours.previous.id}`);
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (neighbours.next) router.replace(`/hymn/${neighbours.next.id}`);
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
  }, [neighbours.previous, neighbours.next, searchOpen, overflowOpen, fullscreen, settingsOpen, infoHymn, router]);

  // The hymn body lives in a lazily imported chunk: show a loading shell
  // until it lands, then bump state so getHymn() sees the new chunk. This
  // shell is also what the pre-rendered page contains, and the client renders
  // the app from scratch (no hydration), so the two never have to agree.
  const pendingChunk = id !== undefined && isHymnPending(id);
  const [, setChunkVersion] = useState(0);
  useEffect(() => {
    if (!id) return;
    let active = true;
    ensureHymn(id)
      .then(() => {
        if (active) setChunkVersion((n) => n + 1);
      })
      .catch(() => {
        /* Falls through to the not-found state below. */
      });
    return () => {
      active = false;
    };
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
  const transChorus = translation?.chorus;
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

  /**
   * Line offsets for the quick fix (per hymn, stanza and line). Kept separate
   * from the rail's store: it is only read when a line is held, so an
   * approximate measurement is harmless and it must not disturb the rail's
   * reset-on-first-layout contract.
   */
  const lineOffsets = useRef(new Map<string, number>());
  /** Last scroll offset, so a held line can be judged against the viewport. */
  const scrollY = useRef(0);

  const [activeVerseIndex, setActiveVerseIndex] = useState<number | null>(null);

  // A new hymn starts with no active verse. The screen component survives a
  // next/prev navigation (only the inner ScrollView is keyed by hymn id), so
  // without this the rail would keep the previous hymn's dot highlighted
  // until the first scroll event recomputed it.
  useEffect(() => {
    // Reset the rail highlight for the new hymn (component instance is reused).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveVerseIndex(null);
  }, [id]);

  // Stanza-rail tracking. This used to call `scrollRef.current.addListener`,
  // a native-only API: on react-native-web the ref has no addListener, so the
  // reader threw "e.addListener is not a function" and unmounted to a blank
  // page. A plain onScroll prop works on native and web alike.
  const onReaderScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const yOffset = event.nativeEvent.contentOffset.y;
      scrollY.current = yOffset;
      if (!hymn) return;
      const store = verseOffsets.current;
      if (store.hymnId !== id) return;
      let closestIndex = 0;
      let minDiff = Infinity;

      hymn.verses.forEach((_, index) => {
        const offset = store.offsets.get(index);
        if (offset !== undefined) {
          const diff = Math.abs(offset - yOffset);
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = index;
          }
        }
      });

      if (minDiff < 100) {
        setActiveVerseIndex((current) => (current === closestIndex ? current : closestIndex));
      }
    },
    [hymn, id],
  );

  const scrollToVerse = (verseIndex: number) => {
    const store = verseOffsets.current;
    if (store.hymnId !== id) return;
    const y = store.offsets.get(verseIndex);
    if (y !== undefined) {
      setActiveVerseIndex(verseIndex);
      scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.lg), animated: true });
    }
  };

  const onVerseLayout = (verseIndex: number) => (event: LayoutChangeEvent) => {
    const store = verseOffsets.current;
    if (store.hymnId !== id) {
      store.hymnId = id ?? '';
      store.offsets = new Map();
    }
    store.offsets.set(verseIndex, event.nativeEvent.layout.y);
  };

  const onLineLayout = (verseIndex: number, lineIndex: number) => (event: LayoutChangeEvent) => {
    lineOffsets.current.set(`${id}:${verseIndex}:${lineIndex}`, event.nativeEvent.layout.y);
  };

  /**
   * Opens the quick fix on one line. The line is brought into the upper part
   * of the screen first: the sheet and the keyboard cover the bottom half, and
   * a correction made without seeing the surrounding stanza is how wrong words
   * get pasted over right ones.
   */
  const openLineFix = (verseIndex: number, lineIndex: number, stanzaLabel: string) => {
    if (!canEdit) return;
    const store = verseOffsets.current;
    const stanzaY = store.hymnId === id ? store.offsets.get(verseIndex) : undefined;
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

    const tryClipboard = async () => {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(body);
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
    Share.share({ message: body }).catch(() => {
      void tryClipboard();
    });
  };

  const swipeLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      if (neighbours.next) router.replace(`/hymn/${neighbours.next.id}`);
    });
  const swipeRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      if (neighbours.previous) router.replace(`/hymn/${neighbours.previous.id}`);
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
  const headerIcon = (props: {
    name: ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    onPress: () => void;
    color?: string;
    dark?: boolean;
    disabled?: boolean;
    box?: number;
  }) => {
    const box = props.box ?? 34;
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
          // A tapped icon must not keep a browser focus ring behind a sheet.
          outlineStyle: 'solid',
          outlineWidth: 0,
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
    return (
      <View
        style={{
          flexDirection: direction.row,
          alignItems: 'center',
          gap: 4,
          paddingRight: 9,
          paddingLeft: 8,
        }}>
        {translationOptions.map((option) => {
          const selected = option.value === parallel;
          const short =
            option.value === 'ar'
              ? t('common.arShort')
              : option.value === 'en'
                ? t('common.enShort')
                : option.value === 'de'
                  ? t('common.deShort')
                  : t('common.heShort');
          const chip = CHIP_COLORS[option.value];
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
                backgroundColor: selected ? chip.fill : chip.tint,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}>
              <AppText
                variant="label"
                numberOfLines={1}
                style={{
                  fontWeight: selected ? '700' : '500',
                  fontSize: 18,
                  lineHeight: 21,
                  fontFamily: 'Amiri',
                  color: selected ? (option.value === 'ar' ? '#1A1A1A' : '#FFFFFF') : '#1A1A1A',
                  textAlign: 'right',
                  direction: 'rtl',
                }}>
                {short}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    );
  };

  /**
   * Icon toolbar: previous · next · fullscreen · search · share · favorite.
   * Right-aligned, horizontally scrollable if needed.
   */
  const iconToolbar = (dark: boolean) => {
    const ink = dark ? palette.readerText : colors.onPrimary;
    const goPrev = () => {
      if (neighbours.previous) router.replace(`/hymn/${neighbours.previous.id}`);
    };
    const goNext = () => {
      if (neighbours.next) router.replace(`/hymn/${neighbours.next.id}`);
    };
    return (
      <View
        style={{
          flexDirection: direction.row,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          minHeight: TOOLBAR_HEIGHT,
          flex: 1,
        }}>
        {headerIcon({
          name: direction.isRTL ? 'chevron-right' : 'chevron-left',
          label: t('reader.previous'),
          disabled: !neighbours.previous,
          onPress: goPrev,
          dark,
          box: 36,
        })}
        {headerIcon({
          name: direction.isRTL ? 'chevron-left' : 'chevron-right',
          label: t('reader.next'),
          disabled: !neighbours.next,
          onPress: goNext,
          dark,
          box: 36,
        })}
        {headerIcon({
          name: fullscreen ? 'fullscreen-exit' : 'fullscreen',
          label: fullscreen ? t('reader.exitFullscreen') : t('reader.fullscreen'),
          onPress: () => {
            if (fullscreen) exitFullscreen();
            else setFullscreen(true);
          },
          dark,
          box: 36,
        })}
        {headerIcon({
          name: isFavorite ? 'star' : 'star-outline',
          label: t('favorites.title'),
          onPress: () => toggleFavorite(hymn.id),
          color: isFavorite ? colors.favorite : ink,
          dark,
          box: 36,
        })}
        {headerIcon({
          name: 'dots-vertical',
          label: t('reader.more'),
          onPress: () => setOverflowOpen(true),
          dark,
          box: 36,
        })}
      </View>
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

  /**
   * One translated line under its Arabic original. en/de use the reader's
   * Arabic font — they are Latin text inside an Arabic-typeset app. Hebrew
   * must not: none of the six bundled families carry Hebrew glyphs, so the
   * platform font is the only one with both the letters and the niqqud mark
   * positioning. Hebrew also reads right-to-left and needs extra leading so
   * the points above and below the letters are not clipped.
   */
  const translationText = (body: string) =>
    parallel === 'he' ? (
      <RNText
        style={{
          fontSize: Math.round(readerSize * 0.9),
          lineHeight: Math.round(readerSize * 1.9),
          color: fullscreen ? palette.readerText : colors.textMuted,
          writingDirection: 'rtl',
          textAlign: 'right',
          opacity: fullscreen ? 0.8 : 1,
        }}>
        {body}
      </RNText>
    ) : (
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
      {/* The AI badge only applies to the machine-made en/de drafts: its text
          comes from `translationStatus`, which is one flag for the whole
          record, so printing it over the Hebrew would claim a review the
          Hebrew never had. Hebrew gets the disclaimer alone. */}
      {parallel === 'en' || parallel === 'de' ? (
        <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
          <View
            style={{
              flexDirection: direction.row,
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor:
                (hymn.translationStatus ?? 'AI_DRAFT') === 'VERIFIED'
                  ? colors.primary
                  : colors.textMuted,
              backgroundColor:
                (hymn.translationStatus ?? 'AI_DRAFT') === 'VERIFIED'
                  ? colors.primary
                  : 'transparent',
            }}>
            <MaterialCommunityIcons
              name={
                (hymn.translationStatus ?? 'AI_DRAFT') === 'VERIFIED'
                  ? 'check-circle'
                  : 'robot-outline'
              }
              size={16}
              color={
                (hymn.translationStatus ?? 'AI_DRAFT') === 'VERIFIED'
                  ? colors.onPrimary
                  : colors.textMuted
              }
            />
            <AppText
              variant="caption"
              color={
                (hymn.translationStatus ?? 'AI_DRAFT') === 'VERIFIED'
                  ? colors.onPrimary
                  : colors.textMuted
              }
              style={{ fontWeight: '700' }}>
              {TRANSLATION_STATUS_LABEL[hymn.translationStatus ?? 'AI_DRAFT'][parallel]}
            </AppText>
          </View>
          {(hymn.translationStatus ?? 'AI_DRAFT') === 'AI_DRAFT' ? (
            <AppText
              variant="caption"
              center
              color={fullscreen ? palette.readerText : colors.textMuted}
              style={{ opacity: fullscreen ? 0.75 : 1, marginTop: spacing.xs }}>
              {TRANSLATION_NOTES[parallel]}
            </AppText>
          ) : null}
        </View>
      ) : parallel === 'he' ? (
        /* Hebrew disclaimer, in Hebrew and set right-to-left: the note mixes
           Hebrew with "AI" and "100%", and without an RTL base direction the
           numbers and the dash land on the wrong side of the sentence. */
        <AppText
          variant="caption"
          center
          color={fullscreen ? palette.readerText : colors.textMuted}
          style={{
            opacity: fullscreen ? 0.75 : 1,
            marginBottom: spacing.md,
            paddingHorizontal: spacing.md,
            writingDirection: 'rtl',
            textAlign: 'center',
            lineHeight: 20,
          }}>
          {TRANSLATION_NOTES.he}
        </AppText>
      ) : null}
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
      {hymn.verses.map((verseBlock, verseIndex) => {
        const onDark = fullscreen || isDark;
        const headingSize = Math.round(readerSize * (verseBlock.chorus ? 0.9 : 0.7));
        // The sheet names the stanza the same way the reader does, so the
        // position line reads "المقطع القرار · السطر ٢" for a refrain.
        const stanzaLabel = verseBlock.chorus
          ? refrainHeading(hymn.chorus, transChorus, verseBlock.label)
          : verseBlock.label;
        const heading = verseBlock.chorus ? stanzaLabel : `(${stanzaLabel})`;
        return (
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
              color={
                verseBlock.chorus
                  ? onDark
                    ? palette.refrainReader
                    : palette.refrain
                  : fullscreen
                    ? palette.readerText
                    : colors.primary
              }
              style={{
                fontFamily: readerFontBold,
                // The family alone selects the bold face but leaves the weight at
                // 400, which web renders as regular; theme/fonts.ts requires both,
                // so the refrain is set heavier than the stanza numbers.
                fontWeight: verseBlock.chorus ? '700' : undefined,
                fontSize: headingSize,
                // Scale leading with the font so diacritics are never clipped,
                // whether the heading is a stanza number or a refrain.
                lineHeight: Math.round(headingSize * (verseBlock.chorus ? 1.4 : 1.5)),
                marginBottom: spacing.xs,
                opacity: fullscreen ? 0.85 : 1,
                ...(verseBlock.chorus
                  ? {
                      letterSpacing: 0.5,
                      // A flat red reads as an error colour; the same hue at low
                      // alpha around the glyphs is what makes it look glossy.
                      textShadowColor: onDark ? palette.refrainReaderGlow : palette.refrainGlow,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 12,
                    }
                  : null),
              }}>
              {heading}
            </AppText>
            {verseBlock.lines.map((line, lineIndex) => {
              const translated = transVerses?.[verseIndex]?.lines[lineIndex];
              const marginBottom =
                lineIndex < verseBlock.lines.length - 1 ? spacing.sm : 0;
              const body = (
                <>
                  {stanzaText(line)}
                  {translated ? (
                    <View style={{ marginTop: 2 }}>{translationText(translated)}</View>
                  ) : null}
                </>
              );
              // Readers get plain text. Editors get a hold-to-fix target on
              // each line; a normal tap and a scroll still do nothing, so the
              // reading experience is unchanged.
              return canEdit ? (
                <Pressable
                  key={lineIndex}
                  onLongPress={() => openLineFix(verseIndex, lineIndex, stanzaLabel)}
                  delayLongPress={350}
                  onLayout={onLineLayout(verseIndex, lineIndex)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('reader.fixTitle')} — ${t('reader.verseOf')} ${stanzaLabel} · ${t('reader.fixLine')} ${lineIndex + 1}`}
                  accessibilityHint={t('reader.fixHint')}
                  android_ripple={{ color: colors.border }}
                  style={({ pressed }) => ({
                    marginBottom,
                    borderRadius: radius.sm,
                    backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
                    // Web: a long press on text opens the browser's own
                    // selection callout and swallows the gesture.
                    userSelect: 'none',
                  })}>
                  {body}
                </Pressable>
              ) : (
                <View key={lineIndex} style={{ marginBottom }}>
                  {body}
                </View>
              );
            })}
          </View>
        );
      })}
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
    // A one-stanza hymn has nothing to jump to, but the rail still carries the
    // "also in" badges, so it is only hidden when there is neither.
    if (hymn.verses.length < 2 && linked.length === 0) return null;
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
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
            gap: spacing.sm,
          }}>
          {hymn.verses.map((verseBlock, verseIndex) => {
            const isChorus = verseBlock.chorus;
            const isActive = !isChorus && activeVerseIndex === verseIndex;
            const label = isChorus
              ? refrainHeading(hymn.chorus, transChorus, verseBlock.label)
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
                    : isActive
                      ? colors.accent
                      : dark
                        ? 'rgba(255,255,255,0.14)'
                        : colors.surfaceMuted,
                  borderWidth: isActive || isChorus
                    ? 2
                    : 1,
                  borderColor: isChorus
                    ? colors.accent
                    : isActive
                      ? colors.accent
                      : dark
                        ? 'rgba(255,255,255,0.3)'
                        : colors.border,
                  shadowColor: isActive || isChorus ? colors.accent : undefined,
                  shadowOffset: isActive || isChorus ? { width: 0, height: 0 } : undefined,
                  shadowOpacity: isActive || isChorus ? 0.4 : 0,
                  shadowRadius: isActive || isChorus ? 8 : 0,
                  elevation: isActive || isChorus ? 4 : 0,
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
                      color: isActive || isChorus
                        ? colors.onPrimary
                        : dark ? palette.readerText : colors.text,
                      lineHeight: 16,
                    }}>
                    {verseBlock.label}
                  </AppText>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* The same hymn as printed by another book. It sits at the foot of the
            rail — the empty stretch below the stanza dots — rather than in the
            header, so the "where am I" column also answers "where else is it".
            Outside the ScrollView so it stays reachable when the hymn has more
            stanzas than the screen fits. Tapping opens that copy. */}
        {linked.length > 0 ? (
          <View
            accessibilityRole="menu"
            accessibilityLabel={t('reader.alsoIn')}
            style={{
              alignItems: 'center',
              gap: 6,
              paddingTop: spacing.sm,
              // The tab bar overlays the bottom of the screen (same reason the
              // text scroller ends with xxl), so the badge must clear it, not
              // just the home-indicator inset.
              paddingBottom: insets.bottom + spacing.xxl,
              borderTopWidth: 1,
              borderTopColor: dark ? 'rgba(255,255,255,0.22)' : colors.border,
            }}>
            <AppText
              useAppFont={false}
              style={{
                fontFamily: readerFont,
                fontSize: 9,
                lineHeight: 12,
                textAlign: 'center',
                color: dark ? palette.readerText : colors.textMuted,
                opacity: 0.75,
              }}>
              {t('reader.alsoInShort')}
            </AppText>
            {linked.map((sibling) => (
              <Pressable
                key={sibling.id}
                onPress={() => router.push(`/hymn/${sibling.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${t(bookLabelKey(sibling.book))} ${sibling.number}`}
                hitSlop={HIT_SLOP}
                android_ripple={{ color: colors.border }}
                style={({ pressed }) => ({
                  width: RAIL_DOT,
                  alignItems: 'center',
                  paddingVertical: 5,
                  paddingHorizontal: 1,
                  borderRadius: 10,
                  gap: 1,
                  backgroundColor: dark ? 'rgba(255,255,255,0.12)' : colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: dark ? 'rgba(255,255,255,0.3)' : colors.border,
                  opacity: pressed ? 0.6 : 1,
                })}>
                <MaterialCommunityIcons
                  name="book-open-variant"
                  size={13}
                  color={dark ? palette.readerText : colors.textMuted}
                />
                <AppText
                  useAppFont={false}
                  numberOfLines={2}
                  style={{
                    fontFamily: readerFont,
                    fontSize: 9,
                    lineHeight: 11,
                    textAlign: 'center',
                    color: dark ? palette.readerText : colors.textMuted,
                  }}>
                  {t(bookLabelKey(sibling.book))}
                </AppText>
                <AppText
                  useAppFont={false}
                  style={{
                    fontFamily: readerFontBold,
                    fontSize: 12,
                    lineHeight: 14,
                    fontWeight: '700',
                    color: dark ? palette.readerText : colors.text,
                  }}>
                  {sibling.number}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  /**
   * Quick fix + its confirmation toast. Shared by the reading and fullscreen
   * branches: holding a line must work in whichever mode the app is actually
   * being used in during an assembly.
   */
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: fullscreen ? palette.readerBg : colors.canvas,
        opacity: fullscreen ? fadeAnim : 1,
      }}>
      {fullscreen ? (
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
            onPress: goBack,
            dark: true,
          })}
          <View style={{ flex: 1, paddingHorizontal: spacing.xs }}>
            <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'center' }}>
              <AppText
                variant="heading"
                numberOfLines={1}
                color={palette.readerText}
                style={{ fontWeight: '700', marginEnd: spacing.md, flexShrink: 1 }}>
                {t('common.hymnNumber')} {hymn.number}
              </AppText>
              {languageChips(true)}
            </View>
            <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
              {iconToolbar(true)}
            </View>
          </View>
        </View>
      ) : (
        <View
          style={{
            paddingTop: insets.top + spacing.sm,
            paddingBottom: spacing.sm,
            paddingHorizontal: spacing.sm,
            backgroundColor: colors.primaryDeep,
          }}>
          {hymn.author || hymn.authorOriginal ? (
            <AppText
              variant="caption"
              numberOfLines={1}
              color={colors.onPrimary}
              style={{ opacity: 0.75, fontSize: 11, textAlign: direction.textAlign, paddingHorizontal: spacing.sm }}>
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
              onPress={goBack}
            />
            <View style={{ flex: 1, paddingHorizontal: spacing.xs }}>
              <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'center' }}>
                <AppText
                  variant="heading"
                  numberOfLines={1}
                  color={colors.onPrimary}
                  style={{ fontWeight: '700', marginEnd: spacing.md, flexShrink: 1 }}>
                  {t('common.hymnNumber')} {hymn.number}
                </AppText>
                {languageChips(false)}
              </View>
              <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                {iconToolbar(false)}
              </View>
              {allTopicsOf(hymn).length > 0 ? (
                <Pressable
                  onPress={() => {
                    const target = hymn.primaryTopic ?? allTopicsOf(hymn)[0];
                    if (target) router.push(`/library?topic=${target}`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('info.topics')}
                  android_ripple={{ color: 'rgba(255,255,255,0.3)' }}>
                  <AppText
                    variant="caption"
                    numberOfLines={1}
                    color={colors.onPrimary}
                    style={{ opacity: 0.85, textAlign: 'right', direction: 'rtl' }}>
                    {t('info.topics')}:{' '}
                    {allTopicsOf(hymn)
                      .map((id) => t(`topic.${id}` as const))
                      .join(' · ')}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      )}

      <View style={{ flex: 1, flexDirection: 'row', direction: 'ltr' }}>
        <GestureDetector gesture={swipeGesture}>
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
        {stanzaRail(fullscreen)}
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
      <Modal
        visible={overflowOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOverflowOpen(false)}>
        <Pressable
          onPress={() => setOverflowOpen(false)}
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-start', alignItems: direction.isRTL ? 'flex-start' : 'flex-end', paddingTop: insets.top + TOOLBAR_HEIGHT + spacing.sm, paddingHorizontal: spacing.sm }}>
          <View
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              minWidth: 200,
              overflow: 'hidden',
            }}>
            {[
              { icon: 'magnify', label: t('search.placeholder'), onPress: () => { setOverflowOpen(false); setSearchOpen(true); } },
              { icon: 'information-outline', label: t('reader.info'), onPress: () => { setOverflowOpen(false); setInfoHymn(true); } },
              { icon: 'cog-outline', label: t('reader.settings'), onPress: () => { setOverflowOpen(false); setSettingsOpen(true); } },
              { icon: 'share-variant', label: t('reader.share'), onPress: () => { setOverflowOpen(false); shareHymn(); } },
            ].map((item, idx) => (
              <Pressable
                key={item.icon}
                onPress={item.onPress}
                android_ripple={{ color: colors.border }}
                style={({ pressed }) => ({
                  flexDirection: direction.row,
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  borderTopWidth: idx === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={colors.text} />
                <AppText variant="body" style={{ fontWeight: '500' }}>
                  {item.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
{fixOverlays}
      {shareToast ? (
        <Toast
          message={t('reader.copied')}
          onDismiss={() => setShareToast(false)}
          bottom={insets.bottom + spacing.lg}
        />
      ) : null}
    </Animated.View>
    </GestureHandlerRootView>
  );
}
