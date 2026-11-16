/**
 * تصحيح سطر — line-level correction sheet opened from the reader.
 *
 * The admin editor is the right place for structural work, but finding one
 * wrong word in it costs a navigation and a long scroll through the whole
 * hymn. This sheet is the opposite: the reader holds a line, the sheet opens
 * on that exact line, and a save writes that line in place. The reader never
 * navigates and never moves, which is what makes it usable while leading
 * singing.
 *
 * Editing scope is deliberately one Arabic line plus its translation in one
 * language at a time. Drafts for every available language are kept while the
 * sheet is open, so switching chips cannot lose an edit; only the languages
 * whose text actually changed are written.
 *
 * The patch is rebuilt from the *current* record (never from a form seeded
 * earlier), and stanza labels and refrain flags are copied verbatim, so a
 * correction cannot renumber a stanza or re-flag a refrain.
 */
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { IconButton } from './IconButton';
import { isFirebaseConfigured } from '../data/firebaseConfig';
import type { Hymn } from '../data/types';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { useOverrides } from '../store/overrides';
import { fontFamilyFor, HEBREW_FONT_FAMILY } from '../theme/fonts';
import { radius, spacing } from '../theme/tokens';

/** Languages a hymn can carry a line-by-line translation in. */
const LANGS = ['en', 'de', 'he'] as const;
export type FixLang = (typeof LANGS)[number];

const TRANS_KEYS = { en: 'verses_en', de: 'verses_de', he: 'verses_he' } as const;

/** Full names for screen readers; the chip itself shows the short code. */
const LANG_NAMES: Record<FixLang, string> = { en: 'English', de: 'Deutsch', he: 'עברית' };
const LANG_SHORT_KEYS = {
  en: 'common.enShort',
  de: 'common.deShort',
  he: 'common.heShort',
} as const;

/** Where in the hymn the correction goes, plus the heading already shown. */
export interface FixTarget {
  verseIndex: number;
  lineIndex: number;
  /** Printed heading of the stanza: its number, or the refrain word. */
  stanzaLabel: string;
}

/** Outcome of the best-effort upload, mapped to a reader message by the caller. */
export type FixSyncState = 'uploaded' | 'local' | 'failed' | 'noauth';

export interface FixSavedPayload {
  /** Restores the arrays captured before the write (shown as تراجع). */
  undo: () => void;
  sync: Promise<FixSyncState>;
}

interface LineFixSheetProps {
  hymn: Hymn;
  target: FixTarget;
  /** Language the reader is currently showing beside the Arabic, if any. */
  preferredLang: FixLang | null;
  /** Reader font size and family, so the fields match the text being fixed. */
  readerSize: number;
  fontId: string;
  onClose: () => void;
  onSaved: (payload: FixSavedPayload) => void;
}

type Drafts = { ar: string } & Partial<Record<FixLang, string>>;

/** A hymn line is one line: a newline pasted into it would break the stanza grid. */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ');

export function LineFixSheet({
  hymn,
  target,
  preferredLang,
  readerSize,
  fontId,
  onClose,
  onSaved,
}: LineFixSheetProps) {
  const { t, direction } = useT();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const setOverride = useOverrides((s) => s.setOverride);

  const sourceAr = hymn.verses[target.verseIndex]?.lines[target.lineIndex] ?? '';
  const sourceLine = (lang: FixLang) =>
    hymn[TRANS_KEYS[lang]]?.[target.verseIndex]?.lines[target.lineIndex] ?? '';
  const available = LANGS.filter(
    (lang) => hymn[TRANS_KEYS[lang]]?.[target.verseIndex]?.lines[target.lineIndex] !== undefined,
  );

  const [drafts, setDrafts] = useState<Drafts>(() => {
    const seed: Drafts = { ar: sourceAr };
    for (const lang of available) {
      const line = hymn[TRANS_KEYS[lang]]?.[target.verseIndex]?.lines[target.lineIndex];
      if (line !== undefined) seed[lang] = line;
    }
    return seed;
  });
  const [active, setActive] = useState<FixLang | null>(() =>
    preferredLang && available.includes(preferredLang) ? preferredLang : (available[0] ?? null),
  );
  const [error, setError] = useState('');

  const arChanged = drafts.ar.trim() !== sourceAr.trim();
  const changedLangs = available.filter((lang) => (drafts[lang] ?? '').trim() !== sourceLine(lang).trim());
  const dirty = arChanged || changedLangs.length > 0;

  const updateAr = (value: string) => {
    setDrafts((d) => ({ ...d, ar: oneLine(value) }));
    setError('');
  };
  const updateTranslated = (value: string) => {
    if (!active) return;
    setDrafts((d) => ({ ...d, [active]: oneLine(value) }));
    setError('');
  };

  const readerFont = fontFamilyFor(fontId, false);
  const arabicSize = Math.min(Math.max(readerSize, 18), 26);
  const translationSize = Math.max(16, Math.round(arabicSize * 0.85));

  const save = () => {
    const arNext = drafts.ar.trim();
    if (!arNext) {
      setError(`${t('reader.fixEmpty')} — ${t('common.arShort')}`);
      return;
    }
    const patch: Partial<Hymn> = {};
    if (arChanged) {
      patch.verses = hymn.verses.map((verse, verseIndex) =>
        verseIndex === target.verseIndex
          ? {
              ...verse,
              lines: verse.lines.map((line, lineIndex) =>
                lineIndex === target.lineIndex ? arNext : line,
              ),
            }
          : verse,
      );
    }
    for (const lang of changedLangs) {
      const next = (drafts[lang] ?? '').trim();
      if (!next) {
        setError(`${t('reader.fixEmpty')} — ${LANG_NAMES[lang]}`);
        return;
      }
      const key = TRANS_KEYS[lang];
      const source = hymn[key];
      if (!source) continue;
      patch[key] = source.map((verse, verseIndex) =>
        verseIndex === target.verseIndex
          ? {
              ...verse,
              lines: verse.lines.map((line, lineIndex) =>
                lineIndex === target.lineIndex ? next : line,
              ),
            }
          : verse,
      );
    }
    // Capture only the arrays being replaced. An `undefined` key in the undo
    // patch would erase the field instead of restoring it.
    const before: Partial<Hymn> = {};
    if (patch.verses) before.verses = hymn.verses;
    if (patch.verses_en) before.verses_en = hymn.verses_en;
    if (patch.verses_de) before.verses_de = hymn.verses_de;
    if (patch.verses_he) before.verses_he = hymn.verses_he;

    setOverride(hymn.id, patch);
    // Local save is the source of truth in a live setting; the upload is
    // reported afterwards, never awaited before closing the sheet.
    const sync = (async (): Promise<FixSyncState> => {
      const { syncHymnToCloud } = await import('../data/liveSync');
      const uploaded = await syncHymnToCloud(hymn.id, patch);
      if (!isFirebaseConfigured) return 'local';
      if (uploaded) return 'uploaded';
      const { getFirebaseAuth } = await import('../data/firebase');
      return getFirebaseAuth()?.currentUser ? 'failed' : 'noauth';
    })();
    onSaved({
      undo: () => {
        setOverride(hymn.id, before);
        void import('../data/liveSync').then(({ syncHymnToCloud }) => syncHymnToCloud(hymn.id, before));
      },
      sync,
    });
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        {/* Tap above the sheet to dismiss; the sheet swallows the rest. */}
        <Pressable onPress={onClose} style={{ flex: 1 }} />
        <View
          onTouchStart={(event) => event.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 640,
            alignSelf: 'center',
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing.lg,
            paddingBottom: insets.bottom + spacing.lg,
          }}>
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              marginBottom: spacing.sm,
            }}
          />
          <View
            style={{
              flexDirection: direction.row,
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.xs,
            }}>
            <AppText variant="label" style={{ fontWeight: '700' }}>
              {t('reader.fixTitle')}
            </AppText>
            <IconButton
              name="close"
              label={t('common.close')}
              size={20}
              style={{ width: 36, height: 36, borderRadius: 18 }}
              onPress={onClose}
            />
          </View>
          <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
            {t('reader.fixStanza')} {target.stanzaLabel} · {t('reader.fixLine')}{' '}
            {target.lineIndex + 1}
          </AppText>

          <TextInput
            value={drafts.ar}
            onChangeText={updateAr}
            multiline
            autoFocus
            accessibilityLabel={`${t('common.arShort')} — ${t('reader.fixLine')} ${target.lineIndex + 1}`}
            placeholderTextColor={colors.textMuted}
            textAlignVertical="top"
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceMuted,
              color: colors.text,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              minHeight: Math.round(arabicSize * 2.4),
              fontFamily: readerFont,
              fontSize: arabicSize,
              lineHeight: Math.round(arabicSize * 1.7),
              textAlign: 'right',
              writingDirection: 'rtl',
            }}
          />

          {available.length > 0 && active ? (
            <>
              <View
                style={{
                  flexDirection: direction.row,
                  alignItems: 'center',
                  gap: spacing.sm,
                  marginTop: spacing.md,
                }}>
                <AppText variant="caption" color={colors.textMuted}>
                  {t('reader.translation')}
                </AppText>
                {available.map((lang) => {
                  const selected = lang === active;
                  return (
                    <Pressable
                      key={lang}
                      onPress={() => setActive(lang)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      accessibilityLabel={LANG_NAMES[lang]}
                      hitSlop={4}
                      android_ripple={{ color: colors.border }}
                      style={({ pressed }) => ({
                        minWidth: 52,
                        minHeight: 36,
                        paddingHorizontal: spacing.sm,
                        borderRadius: radius.pill,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: selected ? 'transparent' : colors.border,
                        backgroundColor: selected ? colors.primary : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                      })}>
                      <AppText
                        variant="label"
                        numberOfLines={1}
                        color={selected ? colors.onPrimary : colors.text}
                        style={{ fontWeight: '700' }}>
                        {t(LANG_SHORT_KEYS[lang])}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={drafts[active] ?? ''}
                onChangeText={updateTranslated}
                multiline
                accessibilityLabel={`${LANG_NAMES[active]} — ${t('reader.fixLine')} ${target.lineIndex + 1}`}
                placeholderTextColor={colors.textMuted}
                textAlignVertical="top"
                style={{
                  marginTop: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  backgroundColor: colors.surfaceMuted,
                  color: colors.text,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  minHeight: active === 'he' ? 52 : 44,
                  ...(active === 'he'
                    ? {
                        // The bundled Hebrew face carries the pointed glyphs, so
                        // Hebrew edits type in it (not the Arabic family) and get
                        // the taller leading the niqqud needs.
                        fontFamily: HEBREW_FONT_FAMILY,
                        fontSize: translationSize + 2,
                        lineHeight: Math.round((translationSize + 2) * 1.7),
                        textAlign: 'right' as const,
                        writingDirection: 'rtl' as const,
                      }
                    : {
                        fontFamily: readerFont,
                        fontSize: translationSize,
                        lineHeight: Math.round(translationSize * 1.6),
                        textAlign: 'left' as const,
                        writingDirection: 'ltr' as const,
                      }),
                }}
              />
            </>
          ) : null}

          {error ? (
            <AppText variant="caption" color={colors.danger} style={{ marginTop: spacing.sm }}>
              {error}
            </AppText>
          ) : null}

          <View style={{ flexDirection: direction.row, gap: spacing.sm, marginTop: spacing.md }}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              android_ripple={{ color: colors.border }}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              })}>
              <AppText variant="label" style={{ fontWeight: '700' }}>
                {t('common.cancel')}
              </AppText>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={!dirty}
              accessibilityRole="button"
              accessibilityLabel={t('reader.fixSave')}
              accessibilityState={{ disabled: !dirty }}
              android_ripple={{ color: colors.border }}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.pill,
                backgroundColor: colors.primary,
                opacity: !dirty ? 0.4 : pressed ? 0.75 : 1,
              })}>
              <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
                {t('reader.fixSave')}
              </AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
