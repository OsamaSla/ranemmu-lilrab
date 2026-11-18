/**
 * Admin hymn editor (text-level only).
 *
 * Structural edits (add/delete/reorder stanzas) are PC-only by design: the
 * EN/DE/HE sheets must mirror the Arabic stanza-for-stanza, and the importer
 * rejects anything else. Saving therefore requires identical stanza and
 * line counts to the bundled record.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { TextButton } from '../../components/TextButton';
import { TopicPicker } from '../../components/TopicPicker';
import { getHymn, ensureHymn, getLinks, isHymnPending } from '../../data/loader';
import { getFirebaseAuth } from '../../data/firebase';
import { isFirebaseConfigured } from '../../data/firebaseConfig';
import { syncHymnToCloud } from '../../data/liveSync';
import { isValidMediaUrl } from '../../data/media';
import { formatScriptureLine, parseScriptureText, refToString } from '../../data/scriptures';
import type { ScriptureRef } from '../../data/types';
import type { TopicId } from '../../data/topics';
import { useT } from '../../hooks/useT';
import { useCanEdit } from '../../hooks/useCanEdit';
import { useTheme } from '../../hooks/useTheme';
import { bookLabelKey } from '../../i18n';
import { useCorpusVersion } from '../../store/corpus';
import { useOverrides } from '../../store/overrides';
import { radius, spacing } from '../../theme/tokens';
import { HEBREW_FONT_FAMILY } from '../../theme/fonts';

/**
 * Printed word for a refrain stanza. The hymn-level `chorus` field carries the
 * label a book actually prints (اللازمة / القرار …); Arabic hymns without one
 * fall back to the standard القرار. Stored as Arabic regardless of UI language
 * so the data stays consistent when an admin edits in English or German.
 */
const REFRAIN_LABEL = 'القرار';
const refrainWord = (chorus: string) => chorus.trim() || REFRAIN_LABEL;

export default function AdminEditScreen() {
  const router = useRouter();
  const { id, lang } = useLocalSearchParams<{ id: string; lang?: string }>();
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();
  // Same gate as the Admin screen and the reader's edit button: this route is
  // reachable by URL, so hiding the button is not enough.
  const canEdit = useCanEdit();

  const setOverride = useOverrides((s) => s.setOverride);

  const hymn = typeof id === 'string' ? getHymn(id) : undefined;

  // Whole form in one object so switching hymns resets cleanly
  // (render-time reset, same pattern as the reader's translation view).
  // Translation sections mirror the Arabic stanza-for-stanza and only exist
  // when the hymn already carries that language.
  const blank = {
    title: '',
    author: '',
    authorOriginal: '',
    meter: '',
    chorus: '',
    mediaUrl: '',
    // Free-text scripture field: parsed by `parseScriptureText` on save and
    // rendered back as the Arabic display line, so the stored array and the
    // field always say the same thing.
    scripturesText: '',
    verified: false,
    primaryTopic: '' as TopicId | '',
    topics: [] as TopicId[],
    lines: [] as string[][],
    labels: [] as string[],
    chorusFlags: [] as boolean[],
    title_en: '',
    chorus_en: '',
    linesEn: [] as string[][],
    title_de: '',
    chorus_de: '',
    linesDe: [] as string[][],
    title_he: '',
    chorus_he: '',
    linesHe: [] as string[][],
    sourceStamp: '',
  };
  /**
   * Signature of the record the form was seeded from. A form that is no longer
   * in sync with the record (cloud edit landed, another device changed a
   * field) must be re-seeded before it can be saved, otherwise a stale field
   * silently writes an older value back — observed on 2026-10-27, when an
   * editor left open across a cloud edit re-published the previous YouTube
   * link over the newer one.
   */
  const signatureOf = (h: NonNullable<typeof hymn>): string =>
    JSON.stringify([
      h.translationStatus,
      h.title,
      h.author,
      h.authorOriginal,
      h.meter,
      h.chorus,
      h.mediaUrl,
      h.primaryTopic,
      h.topics,
      h.verses.map((v) => [v.label, v.chorus, v.lines]),
      h.scriptures,
      h.title_en,
      h.chorus_en,
      h.verses_en?.map((v) => v.lines),
      h.title_de,
      h.chorus_de,
      h.verses_de?.map((v) => v.lines),
      h.title_he,
      h.chorus_he,
      h.verses_he?.map((v) => v.lines),
    ]);
  const toForm = (key: typeof id, h: typeof hymn) =>
    h
      ? {
          key,
          // Which hymn record the form was filled from. Empty until the
          // lazily imported chunk lands, which is what triggers the reset.
          sourceId: h.id,
          sourceStamp: signatureOf(h),
          verified: h.translationStatus === 'VERIFIED',
          title: h.title,
          author: h.author ?? '',
          authorOriginal: h.authorOriginal ?? '',
          meter: h.meter ?? '',
          chorus: h.chorus ?? '',
          mediaUrl: h.mediaUrl ?? '',
          scripturesText: formatScriptureLine(h.scriptures, ' · '),
          primaryTopic: h.primaryTopic ?? ('' as TopicId | ''),
          topics: [...(h.topics ?? [])],
          lines: h.verses.map((v) => [...v.lines]),
          labels: h.verses.map((v) => (v.chorus ? refrainWord(h.chorus ?? '') : v.label)),
          chorusFlags: h.verses.map((v) => Boolean(v.chorus)),
          title_en: h.title_en ?? '',
          chorus_en: h.chorus_en ?? '',
          linesEn: h.verses_en ? h.verses_en.map((v) => [...v.lines]) : [],
          title_de: h.title_de ?? '',
          chorus_de: h.chorus_de ?? '',
          linesDe: h.verses_de ? h.verses_de.map((v) => [...v.lines]) : [],
          title_he: h.title_he ?? '',
          chorus_he: h.chorus_he ?? '',
          linesHe: h.verses_he ? h.verses_he.map((v) => [...v.lines]) : [],
        }
      : { key, sourceId: '', ...blank };
  // Lazy init so the first open already shows the hymn's current words
  // (previously the form stayed blank until switching to another hymn).
  const [form, setForm] = useState(() => toForm(id, hymn));
  const [msg, setMsg] = useState('');
  // Tracks a successful save so the publish guidance below only appears
  // once there is actually something to publish (not on validation errors).
  // Declared before the reset below: calling a later setter during render
  // would throw (TDZ) and crash the app when switching hymns.
  const [savedOnce, setSavedOnce] = useState(false);
  const [expandedBasic, setExpandedBasic] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState(true);
  const [expandedVerses, setExpandedVerses] = useState(true);
  // Set by every edit, cleared by save: the sticky bar shows it so a long hymn
  // does not lose an unsaved change behind a scroll.
  const [dirty, setDirty] = useState(false);
  // Which languages the verse editor shows. `null` means "follow the default":
  // Arabic plus the language you arrived from (`?lang=de` from the review
  // queue). Any tap pins the user's own choice for the rest of the session.
  const [langChoice, setLangChoice] = useState<Partial<
    Record<'ar' | 'en' | 'de' | 'he', boolean>
  > | null>(null);
  // The hymn body is imported on demand; the chunk load bumps the corpus
  // version, so subscribing re-reads getHymn() (and the not-found fallback).
  useCorpusVersion();
  const pendingChunk = typeof id === 'string' && isHymnPending(id);
  useEffect(() => {
    if (!canEdit || typeof id !== 'string') return;
    void ensureHymn(id).catch(() => {
      /* Falls through to the not-found state below. */
    });
  }, [canEdit, id]);

  // Re-seed when the hymn changes under a *clean* form: an edit in progress
  // (dirty) is never thrown away, but a form the user has not touched must
  // reflect the newest record instead of writing stale values back.
  const recordStamp = hymn ? signatureOf(hymn) : '';
  if (
    form.key !== id ||
    form.sourceId !== (hymn?.id ?? '') ||
    (!dirty && form.sourceStamp !== recordStamp)
  ) {
    setForm(toForm(id, hymn));
    setSavedOnce(false);
    setDirty(false);
  }

  if (!canEdit) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <AppBar title={t('admin.editHymn')} showBack />
        <EmptyState icon="lock-outline" title={t('admin.lockedTitle')} hint={t('admin.lockedHint')} />
        <View style={{ flexDirection: direction.row, justifyContent: 'center' }}>
          <TextButton label={t('admin.backToAdmin')} onPress={() => router.push('/admin')} />
        </View>
      </View>
    );
  }

  if (!hymn) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <AppBar title={t('admin.editHymn')} showBack />
        {pendingChunk ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
            <AppText variant="body" color={colors.textMuted} center>
              {t('common.loading')}
            </AppText>
          </View>
        ) : (
          <EmptyState icon="book-remove-outline" title={t('admin.notFound')} />
        )}
      </View>
    );
  }

  /**
   * Box shared by every field on this screen. The Arabic/Latin fields add the
   * app font on top; the Hebrew ones deliberately do not (see below).
   */
  const fieldBox = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    color: colors.text,
    fontSize: 16,
  } as const;

  const fieldStyle = {
    ...fieldBox,
    fontFamily,
    textAlign: direction.textAlign,
    writingDirection: direction.dir,
  } as const;

  // A verse line is a line, not a paragraph: no 64px box. Translations get a
  // slim accent rail and a language badge instead of a heavy frame, so an
  // Arabic line and its translation read as one unit.
  const lineField = { minHeight: 44, textAlignVertical: 'top' } as const;
  const translationField = {
    minHeight: 40,
    fontSize: 14,
    writingDirection: 'ltr',
    textAlign: 'left',
    borderWidth: 0,
    borderStartWidth: 2,
    borderStartColor: colors.accent,
    backgroundColor: colors.surfaceMuted,
  } as const;

  /**
   * Hebrew text inside the editor. It is set in the bundled Hebrew liturgical
   * face (`NotoSansHebrew`), the only registered font that carries Hebrew
   * glyphs *and* the GPOS niqqud mark positioning; the Arabic families do not,
   * so inheriting the Arabic `fontFamily` would render tofu. Direction and
   * alignment are per field because the app itself is RTL Arabic. The line box
   * is taller than the Latin one: the points above and below the letters are
   * clipped by a 40px field.
   */
  const hebrewText = {
    fontFamily: HEBREW_FONT_FAMILY,
    writingDirection: 'rtl',
    textAlign: 'right',
  } as const;
  const hebrewField = {
    ...fieldBox,
    ...hebrewText,
    lineHeight: 26,
    textAlignVertical: 'center',
  } as const;
  const hebrewLineField = {
    ...hebrewField,
    borderWidth: 0,
    borderStartWidth: 2,
    borderStartColor: colors.accent,
    textAlignVertical: 'top',
  } as const;

  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  /** Short preview of a saved field, used to prove what was written. */
  const describe = (value: unknown): string => {
    if (value === '' || value === null || value === undefined) return '(—)';
    if (Array.isArray(value)) return `[${value.length}]`;
    const text = String(value);
    return text.length > 48 ? `${text.slice(0, 48)}…` : text;
  };

  const toggleSecondary = (id: TopicId) => {
    setForm((f) => ({
      ...f,
      topics: f.topics.includes(id) ? f.topics.filter((x) => x !== id) : [...f.topics, id],
    }));
    setDirty(true);
  };

  const setLine = (verseIndex: number, lineIndex: number, value: string) => {
    setDirty(true);
    setForm((f) => ({
      ...f,
      lines: f.lines.map((ls, vi) => (vi === verseIndex ? ls.map((l, li) => (li === lineIndex ? value : l)) : ls)),
    }));
  };

  const setTranslatedLine = (
    lang: 'en' | 'de' | 'he',
    verseIndex: number,
    lineIndex: number,
    value: string,
  ) => {
    setDirty(true);
    const mapLines = (all: string[][]) =>
      all.map((ls, vi) => (vi === verseIndex ? ls.map((l, li) => (li === lineIndex ? value : l)) : ls));
    if (lang === 'en') setForm((f) => ({ ...f, linesEn: mapLines(f.linesEn) }));
    else if (lang === 'de') setForm((f) => ({ ...f, linesDe: mapLines(f.linesDe) }));
    else setForm((f) => ({ ...f, linesHe: mapLines(f.linesHe) }));
  };

  /**
   * Stanzas are numbered 1, 2, 3…; a refrain is not a stanza number but the
   * printed word, so it consumes no number and keeps the following stanza's
   * count intact.
   */
  const renumberLabels = (flags: boolean[], refrain: string): string[] => {
    const out: string[] = [];
    let counter = 0;
    for (const isChorus of flags) {
      if (isChorus) {
        out.push(refrain);
      } else {
        counter += 1;
        out.push(String(counter));
      }
    }
    return out;
  };

  const moveStanza = (from: number, to: number) => {
    if (to < 0 || to >= form.lines.length) return;
    setDirty(true);
    setForm((f) => {
      const reorder = <T,>(arr: T[]): T[] => {
        const next = [...arr];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        return next;
      };
      const nextChorus = reorder(f.chorusFlags);
      return {
        ...f,
        lines: reorder(f.lines),
        labels: renumberLabels(nextChorus, refrainWord(f.chorus)),
        chorusFlags: nextChorus,
        linesEn: f.linesEn.length ? reorder(f.linesEn) : f.linesEn,
        linesDe: f.linesDe.length ? reorder(f.linesDe) : f.linesDe,
        linesHe: f.linesHe.length ? reorder(f.linesHe) : f.linesHe,
      };
    });
  };

  const toggleRefrain = (index: number) => {
    setDirty(true);
    setForm((f) => {
      const nextChorus = f.chorusFlags.map((flag, i) => (i === index ? !flag : flag));
      return {
        ...f,
        chorusFlags: nextChorus,
        labels: renumberLabels(nextChorus, refrainWord(f.chorus)),
      };
    });
  };

  /**
   * The chorus field is the word printed for every refrain stanza, so editing
   * it relabels already-flagged rows without touching stanza numbering.
   */
  const setChorus = (value: string) => {
    setDirty(true);
    setForm((f) => ({
      ...f,
      chorus: value,
      labels: f.chorusFlags.some(Boolean)
        ? renumberLabels(f.chorusFlags, refrainWord(value))
        : f.labels,
    }));
  };

  const hasEn = Boolean(hymn?.verses_en ?? hymn?.title_en);
  const hasDe = Boolean(hymn?.verses_de ?? hymn?.title_de);
  const hasHe = Boolean(hymn?.verses_he ?? hymn?.title_he);
  // The same hymn as printed by another book. Editing one copy does not change
  // the others (they have their own stanza grid), so say so before the admin
  // retypes anything.
  const linked = hymn ? getLinks(hymn.id) : [];

  /**
   * The scripture field is free text, parsed here so the admin sees exactly
   * what the reader will print (or the parser's complaint) while typing. The
   * parser is the same one that runs on save, so the preview can never drift
   * from the stored value.
   */
  const scripturePreview = (() => {
    const text = form.scripturesText.trim();
    if (!text) return { line: '', error: '' };
    try {
      return { line: formatScriptureLine(parseScriptureText(text)), error: '' };
    } catch (error) {
      return { line: '', error: (error as Error).message };
    }
  })();

  // Language filter for the verse editor. `showLang` follows the default until
  // the user pins a choice; a language the hymn does not carry stays hidden.
  // Hebrew follows the same rule as English: it is on unless the editor was
  // opened from the German queue, which wants Arabic and German side by side.
  const showLang = (key: 'ar' | 'en' | 'de' | 'he'): boolean => {
    if (key === 'en' && !hasEn) return false;
    if (key === 'de' && !hasDe) return false;
    if (key === 'he' && !hasHe) return false;
    if (langChoice) return Boolean(langChoice[key]);
    if (key === 'ar') return true;
    if (key === 'de') return lang === 'de';
    return lang !== 'de';
  };

  const toggleLang = (key: 'ar' | 'en' | 'de' | 'he') => {
    const next = {
      ar: showLang('ar'),
      en: showLang('en'),
      de: showLang('de'),
      he: showLang('he'),
    };
    next[key] = !next[key];
    // Never hide every language: a bare line number would not say which
    // language the row below it belongs to.
    if (!next.ar && !next.en && !next.de && !next.he) next.ar = true;
    setLangChoice(next);
  };

  /**
   * First blank line the form would write. Stanzas may be reordered, so a source
   * blank is matched by stanza shape (line count), not by position: the stanza
   * that moved still carries its own gap and must not be mistaken for a line the
   * editor emptied. Only a blank no same-shaped source stanza had is an error.
   */
  const firstBlank = (lines: string[][], source: string[][] | undefined) => {
    for (let i = 0; i < lines.length; i += 1) {
      const width = lines[i].length;
      for (let j = 0; j < width; j += 1) {
        if (lines[i][j]?.trim()) continue;
        const known = source?.some((ls) => ls.length === width && !(ls[j] ?? '').trim());
        if (!known) return { verse: i + 1, line: j + 1 };
      }
    }
    return null;
  };
  /** Where a blank sits, so the error names the exact field instead of all of them. */
  const blankWhere = (lang: string, hit: { verse: number; line: number }) =>
    `${lang} · ${t('admin.verses')} ${hit.verse} · ${t('admin.stanzaLine')} ${hit.line}`;
  /**
   * True while the form still holds the source's stanza/line shape. Moving a
   * stanza up/down is a supported edit, so this compares the sorted line counts
   * instead of index by index — a per-index check read every move as "the record
   * changed" and blocked the save.
   */
  const sameShape = (lines: string[][], source: { lines: string[] }[]) => {
    if (lines.length !== source.length) return false;
    const formCounts = lines.map((ls) => ls.length).sort((a, b) => a - b);
    const sourceCounts = source.map((v) => v.lines.length).sort((a, b) => a - b);
    return formCounts.every((n, i) => n === sourceCounts[i]);
  };

  /** Equality that ignores the empty-string-vs-missing difference. */
  const sameText = (before: string | undefined, after: string) => (before ?? '').trim() === after;
  /** Equality that treats a missing chorus flag like `false`. */
  const sameVerses = (before: NonNullable<typeof hymn>['verses'] | undefined, after: { label?: string; lines: string[]; chorus?: boolean }[]) =>
    JSON.stringify((before ?? []).map((v) => [v.label, v.lines, Boolean(v.chorus)])) ===
    JSON.stringify(after.map((v) => [v.label, v.lines, Boolean(v.chorus)]));

  const save = () => {
    if (!hymn) return;
    if (!form.title.trim() && hymn.title.trim()) {
      setMsg(`${t('admin.errBlank')} — ${t('admin.hymnTitle')}`);
      return;
    }
    const arBlank = firstBlank(form.lines, hymn.verses.map((v) => v.lines));
    if (arBlank) {
      setMsg(`${t('admin.errBlank')} — ${blankWhere(t('admin.langAr'), arBlank)}`);
      return;
    }
    const mediaTrimmed = form.mediaUrl.trim();
    if (mediaTrimmed && !isValidMediaUrl(mediaTrimmed)) {
      setMsg(t('admin.errUrl'));
      return;
    }
    // Scriptures are parsed before anything else is written: a bad reference
    // must stop the save with the parser's own words, not reach the app and
    // crash the reader's formatter.
    let scriptureRefs: ScriptureRef[] = [];
    try {
      scriptureRefs = parseScriptureText(form.scripturesText);
    } catch (error) {
      setMsg(`${t('admin.errScripture')} — ${(error as Error).message}`);
      return;
    }
    if (form.lines.length !== hymn.verses.length) {
      setMsg(t('admin.errCount'));
      return;
    }
    const originalCounts = hymn.verses.map((v) => v.lines.length).slice().sort((a, b) => a - b);
    const currentCounts = form.lines.map((ls) => ls.length).slice().sort((a, b) => a - b);
    if (originalCounts.some((c, i) => c !== currentCounts[i])) {
      setMsg(t('admin.errCount'));
      return;
    }
    // Translations mirror the Arabic shape in the source; a mismatch here means
    // the record changed under a dirty form, so the only safe move is to reload
    // rather than write the translations back in the wrong shape.
    if (hasEn && hymn.verses_en) {
      if (!sameShape(form.linesEn, hymn.verses_en)) {
        setMsg(t('admin.errShape'));
        return;
      }
      const enBlank = firstBlank(form.linesEn, hymn.verses_en.map((v) => v.lines));
      if (enBlank) {
        setMsg(`${t('admin.errBlank')} — ${blankWhere('EN', enBlank)}`);
        return;
      }
    }
    if (hasDe && hymn.verses_de) {
      if (!sameShape(form.linesDe, hymn.verses_de)) {
        setMsg(t('admin.errShape'));
        return;
      }
      const deBlank = firstBlank(form.linesDe, hymn.verses_de.map((v) => v.lines));
      if (deBlank) {
        setMsg(`${t('admin.errBlank')} — ${blankWhere('DE', deBlank)}`);
        return;
      }
    }
    // Hebrew ships pointed, so an empty line is always a mistake and never an
    // untranslated gap the way an EN/DE draft can be.
    if (hasHe && hymn.verses_he) {
      if (!sameShape(form.linesHe, hymn.verses_he)) {
        setMsg(t('admin.errShape'));
        return;
      }
      const heBlank = firstBlank(form.linesHe, hymn.verses_he.map((v) => v.lines));
      if (heBlank) {
        setMsg(`${t('admin.errBlank')} — ${blankWhere('HE', heBlank)}`);
        return;
      }
    }
    // Send only the fields that actually changed. A full patch carries the
    // current value of untouched fields too — including blank ones such as an
    // empty mediaUrl — and a local override outranks cloud data on this device,
    // so it would mask a link another device adds later (observed: a YouTube
    // URL landed in Firestore but stayed empty on the second device).
    const patch: Partial<NonNullable<typeof hymn>> = {};
    const changed = (before: unknown, after: unknown) =>
      JSON.stringify(before) !== JSON.stringify(after);
    const nextText = {
      title: form.title.trim(),
      author: form.author.trim(),
      authorOriginal: form.authorOriginal.trim(),
      meter: form.meter.trim(),
      chorus: form.chorus.trim(),
      mediaUrl: mediaTrimmed,
    };
    for (const key of Object.keys(nextText) as (keyof typeof nextText)[]) {
      if (!sameText(hymn[key], nextText[key])) patch[key] = nextText[key];
    }
    const status = form.verified ? ('VERIFIED' as const) : ('AI_DRAFT' as const);
    if (changed(hymn.translationStatus ?? 'AI_DRAFT', status)) patch.translationStatus = status;
    // Clearing the primary is not expressible through the overlay merge
    // (`??` falls back to the bundled value), so "no topic" keeps the
    // existing one — setting and retagging always work.
    if (form.primaryTopic && changed(hymn.primaryTopic, form.primaryTopic)) {
      patch.primaryTopic = form.primaryTopic as TopicId;
    }
    const topics = form.topics.filter((x) => x !== form.primaryTopic);
    if (changed(hymn.topics ?? [], topics)) patch.topics = topics;
    // Compare canonical keys, not the full objects: the `review` flag is
    // bookkeeping that a save of unchanged text must not silently erase.
    const refKeys = (refs: ScriptureRef[] | undefined) => (refs ?? []).map(refToString);
    if (changed(refKeys(hymn.scriptures), refKeys(scriptureRefs))) {
      patch.scriptures = scriptureRefs;
    }
    const verses = form.lines.map((ls, i) => ({
      label: form.labels[i] ?? hymn.verses[i]?.label ?? String(i + 1),
      lines: ls.map((l) => l.trim()),
      chorus: form.chorusFlags[i] ? true : undefined,
    }));
    if (!sameVerses(hymn.verses, verses)) {
      patch.verses = verses;
    }
    if (hasEn) {
      if (!sameText(hymn.title_en, form.title_en.trim())) patch.title_en = form.title_en.trim();
      // sameText, not JSON equality: a field that is absent in the record
      // (`undefined`) and an empty input (`''`) are the same "nothing here",
      // and JSON.stringify made them different — every save then wrote an empty
      // chorus back over the record.
      if (!sameText(hymn.chorus_en, form.chorus_en.trim())) patch.chorus_en = form.chorus_en.trim();
      if (hymn.verses_en) {
        const versesEn = form.linesEn.map((ls, i) => ({
          label: form.labels[i] ?? hymn.verses_en?.[i]?.label ?? String(i + 1),
          lines: ls.map((l) => l.trim()),
          chorus: form.chorusFlags[i] ? true : undefined,
        }));
        if (!sameVerses(hymn.verses_en, versesEn)) {
          patch.verses_en = versesEn;
        }
      }
    }
    if (hasDe) {
      if (!sameText(hymn.title_de, form.title_de.trim())) patch.title_de = form.title_de.trim();
      if (!sameText(hymn.chorus_de, form.chorus_de.trim())) patch.chorus_de = form.chorus_de.trim();
      if (hymn.verses_de) {
        const versesDe = form.linesDe.map((ls, i) => ({
          label: form.labels[i] ?? hymn.verses_de?.[i]?.label ?? String(i + 1),
          lines: ls.map((l) => l.trim()),
          chorus: form.chorusFlags[i] ? true : undefined,
        }));
        if (!sameVerses(hymn.verses_de, versesDe)) {
          patch.verses_de = versesDe;
        }
      }
    }
    if (hasHe) {
      if (!sameText(hymn.title_he, form.title_he.trim())) patch.title_he = form.title_he.trim();
      if (!sameText(hymn.chorus_he, form.chorus_he.trim())) patch.chorus_he = form.chorus_he.trim();
      if (hymn.verses_he) {
        const versesHe = form.linesHe.map((ls, i) => ({
          label: form.labels[i] ?? hymn.verses_he?.[i]?.label ?? String(i + 1),
          lines: ls.map((l) => l.trim()),
          chorus: form.chorusFlags[i] ? true : undefined,
        }));
        if (!sameVerses(hymn.verses_he, versesHe)) {
          patch.verses_he = versesHe;
        }
      }
    }

    if (Object.keys(patch).length === 0) {
      // Nothing changed: writing an empty override would upload a no-op
      // document and keep masking fresher cloud values on this device.
      setMsg(t('admin.savedNoFields'));
      setSavedOnce(true);
      setDirty(false);
      return;
    }
    // Spell out what was actually written. "تم الحفظ" alone cannot be
    // distinguished from a paste that never landed, and that ambiguity cost
    // real time: a link field that looked filled was saved with the previous
    // value and then "published" unchanged.
    const summary = Object.entries(patch)
      .map(([field, value]) => `${field}=${describe(value)}`)
      .join(' · ');
    setOverride(hymn.id, patch);
    setMsg(`${t('admin.savedFields')} ${summary}`);
    setSavedOnce(true);
    setDirty(false);
    // Best-effort live upload: the local save above is the source of truth, so
    // a failure must not block the editor — but it must be *visible*. Silence
    // here is what made "I saved it" and "the cloud has nothing" look the same.
    void syncHymnToCloud(hymn.id, patch).then((synced) => {
      if (!isFirebaseConfigured) return;
      setMsg(
        synced
          ? `${t('admin.savedFields')} ${summary} — ${t('admin.uploaded')}`
          : t(getFirebaseAuth()?.currentUser ? 'admin.syncFailed' : 'admin.syncNoAuth'),
      );
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={`${t('common.hymnNumber')} ${hymn.number}`} showBack />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Pressable onPress={() => setExpandedBasic(!expandedBasic)} style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, paddingHorizontal: spacing.xs }}>
          <AppText variant="label" color={colors.textMuted} style={{ fontWeight: '700' }}>{t('admin.hymnTitle')} · {expandedBasic ? '−' : '+'}</AppText>
          <MaterialCommunityIcons name={expandedBasic ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>
        {expandedBasic ? (
        <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
          <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>
            {t('admin.hymnTitle')}
          </AppText>
          <TextInput value={form.title} onChangeText={(v) => set({ title: v })} style={fieldStyle} />
          <AppText variant="label" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
            {t('admin.author')}
          </AppText>
          <TextInput value={form.author} onChangeText={(v) => set({ author: v })} style={fieldStyle} />
          <AppText variant="label" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
            {t('admin.authorOriginal')}
          </AppText>
          <TextInput value={form.authorOriginal} onChangeText={(v) => set({ authorOriginal: v })} style={[fieldStyle, { writingDirection: 'ltr', textAlign: 'left' }]} />
          <AppText variant="label" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
            {t('info.meter')}
          </AppText>
          <TextInput value={form.meter} onChangeText={(v) => set({ meter: v })} style={fieldStyle} />
          <AppText variant="label" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
            {t('admin.chorus')}
          </AppText>
          <TextInput value={form.chorus} onChangeText={setChorus} style={fieldStyle} />
          <AppText variant="label" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
            {t('admin.mediaUrl')}
          </AppText>
          <TextInput
            value={form.mediaUrl}
            onChangeText={(v) => set({ mediaUrl: v })}
            style={[fieldStyle, { writingDirection: 'ltr', textAlign: 'left' }]}
            keyboardType="url"
            autoCapitalize="none"
            placeholder="https://"
            placeholderTextColor={colors.textMuted}
          />
          <AppText variant="label" color={colors.textMuted} style={{ marginTop: 4 }}>
            {t('admin.mediaUrlHint')}
          </AppText>
          <AppText variant="label" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
            {t('admin.scriptures')}
          </AppText>
          <TextInput
            value={form.scripturesText}
            onChangeText={(v) => set({ scripturesText: v })}
            style={fieldStyle}
            placeholder={t('admin.scripturesHint')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
          />
          {scripturePreview.error ? (
            <AppText variant="label" color={colors.danger} style={{ marginTop: 4 }}>
              {scripturePreview.error}
            </AppText>
          ) : scripturePreview.line ? (
            <AppText variant="label" color={colors.textMuted} style={{ marginTop: 4 }}>
              {scripturePreview.line}
            </AppText>
          ) : (
            <AppText variant="label" color={colors.textMuted} style={{ marginTop: 4 }}>
              {t('admin.scripturesHint')}
            </AppText>
          )}
          {/* chorus_en / chorus_de / chorus_he stay in the form and the save
              patch (the reader reads them for the multilingual refrain heading),
              but they are labels rather than editable translation work, so the
              editor deliberately shows only the translated titles here. */}
          {hasEn ? (
            <>
              <AppText variant="label" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
                {t('admin.titleEn')}
              </AppText>
              <TextInput
                value={form.title_en}
                onChangeText={(v) => set({ title_en: v })}
                style={[fieldStyle, { writingDirection: 'ltr', textAlign: 'left' }]}
              />
            </>
          ) : null}
          {hasDe ? (
            <>
              <AppText variant="label" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
                {t('admin.titleDe')}
              </AppText>
              <TextInput
                value={form.title_de}
                onChangeText={(v) => set({ title_de: v })}
                style={[fieldStyle, { writingDirection: 'ltr', textAlign: 'left' }]}
              />
            </>
          ) : null}
          {hasHe ? (
            <>
              <AppText variant="label" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
                {t('admin.titleHe')}
              </AppText>
              <TextInput
                value={form.title_he}
                onChangeText={(v) => set({ title_he: v })}
                style={hebrewField}
              />
            </>
          ) : null}
        </Card>
        ) : null}

        {linked.length > 0 ? (
          <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
            <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>
              {t('reader.alsoIn')}
            </AppText>
            {linked.map((sibling) => (
              <Pressable
                key={sibling.id}
                onPress={() => router.push({ pathname: '/admin-edit', params: { id: sibling.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${t(bookLabelKey(sibling.book))} ${sibling.number}`}
                android_ripple={{ color: colors.border }}
                style={({ pressed }) => ({
                  flexDirection: direction.row,
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.xs,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <AppText variant="label" color={colors.primary} style={{ fontWeight: '700' }}>
                  {t(bookLabelKey(sibling.book))} {sibling.number}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} numberOfLines={1} style={{ flex: 1 }}>
                  {sibling.title}
                  {sibling.hasHe ? ' · HE' : ''}
                </AppText>
              </Pressable>
            ))}
          </Card>
        ) : null}

        <Pressable onPress={() => setExpandedTopics(!expandedTopics)} style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, paddingHorizontal: spacing.xs }}>
          <AppText variant="label" color={colors.textMuted} style={{ fontWeight: '700' }}>{t('admin.topics')} · {expandedTopics ? '−' : '+'}</AppText>
          <MaterialCommunityIcons name={expandedTopics ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>
        {expandedTopics ? (
        <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
          <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
            {t('admin.topics')}
          </AppText>
          <TopicPicker
            primary={form.primaryTopic}
            secondary={form.topics}
            onPrimary={(id) => set({ primaryTopic: id })}
            onToggleSecondary={toggleSecondary}
          />
        </Card>
        ) : null}

        <Pressable onPress={() => setExpandedVerses(!expandedVerses)} style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, paddingHorizontal: spacing.xs }}>
          <AppText variant="label" color={colors.textMuted} style={{ fontWeight: '700' }}>{t('admin.verses')} · {expandedVerses ? '−' : '+'}</AppText>
          <MaterialCommunityIcons name={expandedVerses ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>
        {expandedVerses ? (
        <View>
          <View style={{ flexDirection: direction.row, flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
            {([
              { key: 'ar' as const, label: t('admin.langAr') },
              ...(hasEn ? [{ key: 'en' as const, label: t('common.enShort') }] : []),
              ...(hasDe ? [{ key: 'de' as const, label: t('common.deShort') }] : []),
              ...(hasHe ? [{ key: 'he' as const, label: t('common.heShort') }] : []),
            ]).map((option) => {
              const selected = showLang(option.key);
              return (
                <Pressable
                  key={option.key}
                  onPress={() => toggleLang(option.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => ({
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary : 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  })}>
                  <AppText
                    variant="caption"
                    color={selected ? colors.onPrimary : colors.text}
                    style={{ fontWeight: '700' }}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

        {form.lines.map((_, i) => (
          <Card key={`${i}-${form.labels[i]}`} style={{ marginBottom: spacing.md, padding: spacing.md }}>
            <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
              <AppText variant="body" style={{ fontWeight: '700' }}>
                ({form.labels[i]})
              </AppText>
              <View style={{ flexDirection: direction.row, alignItems: 'center', gap: spacing.xs }}>
                <Pressable
                  onPress={() => moveStanza(i, i - 1)}
                  disabled={i === 0}
                  accessibilityRole="button"
                  accessibilityLabel={t('admin.moveStanzaUp')}
                  style={({ pressed }) => ({
                    padding: spacing.xs,
                    opacity: i === 0 ? 0.35 : pressed ? 0.6 : 1,
                  })}>
                  <MaterialCommunityIcons name={direction.isRTL ? 'chevron-down' : 'chevron-up'} size={20} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => moveStanza(i, i + 1)}
                  disabled={i === form.lines.length - 1}
                  accessibilityRole="button"
                  accessibilityLabel={t('admin.moveStanzaDown')}
                  style={({ pressed }) => ({
                    padding: spacing.xs,
                    opacity: i === form.lines.length - 1 ? 0.35 : pressed ? 0.6 : 1,
                  })}>
                  <MaterialCommunityIcons name={direction.isRTL ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => toggleRefrain(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: form.chorusFlags[i] }}
                  accessibilityLabel={form.chorusFlags[i] ? t('admin.convertToStanza') : t('admin.convertToRefrain')}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: form.chorusFlags[i] ? colors.primary : colors.border,
                    backgroundColor: form.chorusFlags[i] ? colors.primary : 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  })}>
                  <AppText
                    variant="caption"
                    color={form.chorusFlags[i] ? colors.onPrimary : colors.text}
                    style={{ fontWeight: '700' }}>
                    {form.chorusFlags[i] ? t('admin.refrain') : t('admin.stanza')}
                  </AppText>
                </Pressable>
              </View>
            </View>
            {/* One row per verse line: Arabic on top, its translations right
                under it — the same pairing the reader shows. */}
            {form.lines[i]?.map((line, j) => (
              <View
                key={j}
                style={{ flexDirection: direction.row, alignItems: 'flex-start', marginBottom: spacing.md }}>
                <AppText
                  variant="caption"
                  color={colors.textMuted}
                  style={{ width: 20, paddingTop: spacing.md, fontWeight: '700' }}>
                  {j + 1}
                </AppText>
                <View style={{ flex: 1 }}>
                  {showLang('ar') ? (
                    <TextInput
                      value={line}
                      onChangeText={(v) => setLine(i, j, v)}
                      multiline
                      accessibilityLabel={`${t('admin.verses')} ${form.labels[i]} · ${j + 1}`}
                      style={[fieldStyle, lineField]}
                    />
                  ) : null}
                  {showLang('en') && form.linesEn[i] ? (
                    <View
                      style={{ flexDirection: direction.row, alignItems: 'flex-start', marginTop: spacing.xs }}>
                      <AppText
                        variant="caption"
                        color={colors.textMuted}
                        style={{ width: 26, paddingTop: spacing.sm, fontWeight: '700' }}>
                        {t('common.enShort')}
                      </AppText>
                      <TextInput
                        value={form.linesEn[i][j] ?? ''}
                        onChangeText={(v) => setTranslatedLine('en', i, j, v)}
                        multiline
                        style={[fieldStyle, translationField, { flex: 1 }]}
                      />
                    </View>
                  ) : null}
                  {showLang('de') && form.linesDe[i] ? (
                    <View
                      style={{ flexDirection: direction.row, alignItems: 'flex-start', marginTop: spacing.xs }}>
                      <AppText
                        variant="caption"
                        color={colors.textMuted}
                        style={{ width: 26, paddingTop: spacing.sm, fontWeight: '700' }}>
                        {t('common.deShort')}
                      </AppText>
                      <TextInput
                        value={form.linesDe[i][j] ?? ''}
                        onChangeText={(v) => setTranslatedLine('de', i, j, v)}
                        multiline
                        style={[fieldStyle, translationField, { flex: 1 }]}
                      />
                    </View>
                  ) : null}
                  {showLang('he') && form.linesHe[i] ? (
                    <View
                      style={{ flexDirection: direction.row, alignItems: 'flex-start', marginTop: spacing.xs }}>
                      <AppText
                        variant="caption"
                        color={colors.textMuted}
                        style={{ width: 26, paddingTop: spacing.sm, fontWeight: '700' }}>
                        {t('common.heShort')}
                      </AppText>
                      <TextInput
                        value={form.linesHe[i][j] ?? ''}
                        onChangeText={(v) => setTranslatedLine('he', i, j, v)}
                        multiline
                        style={[hebrewLineField, { flex: 1 }]}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        ))}

        </View>
        ) : null}

        {msg ? (
          <AppText variant="body" center color={colors.primary} style={{ fontWeight: '700', marginTop: spacing.md }}>
            {msg}
          </AppText>
        ) : null}

        {savedOnce ? (
          <Card style={{ marginTop: spacing.md, padding: spacing.md }}>
            <Pressable
              onPress={() => router.push('/admin')}
              accessibilityRole="button"
              accessibilityLabel={t('admin.title')}
              android_ripple={{ color: colors.border }}
              style={({ pressed }) => ({
                paddingVertical: spacing.sm,
                borderRadius: radius.pill,
                backgroundColor: colors.accent,
                alignItems: 'center',
                opacity: pressed ? 0.75 : 1,
              })}>
              <AppText variant="label" color={colors.text} style={{ fontWeight: '700' }}>
                {t('admin.title')}
              </AppText>
            </Pressable>
          </Card>
        ) : null}

        <Pressable
          onPress={() => router.push(`/hymn/${hymn.id}`)}
          style={{ alignItems: 'center', marginTop: spacing.md }}>
          <AppText variant="label" color={colors.textMuted}>
            {t('admin.open')} · {hymn.number}
          </AppText>
        </Pressable>
      </ScrollView>

      {/* Sticky bar: on a 20-line hymn the save button used to sit at the very
          bottom, so saving meant scrolling past everything you just typed. */}
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          // No safe-area inset here: the tab bar below this screen already
          // covers it, so adding it again would leave a gap on notched phones.
          paddingBottom: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        }}>
        {dirty ? (
          <AppText
            variant="caption"
            center
            color={colors.favorite}
            style={{ marginBottom: spacing.xs, fontWeight: '700' }}>
            {t('admin.unsaved')}
          </AppText>
        ) : null}
        <View style={{ flexDirection: direction.row, alignItems: 'center', gap: spacing.sm }}>
          <Pressable
            onPress={() => set({ verified: !form.verified })}
            accessibilityRole="switch"
            accessibilityState={{ checked: form.verified }}
            android_ripple={{ color: colors.border }}
            style={({ pressed }) => ({
              flexDirection: direction.row,
              alignItems: 'center',
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: form.verified ? colors.primary : colors.border,
              backgroundColor: form.verified ? colors.primary : 'transparent',
              opacity: pressed ? 0.75 : 1,
            })}>
            <MaterialCommunityIcons
              name={form.verified ? 'check-circle' : 'check-circle-outline'}
              size={18}
              color={form.verified ? colors.onPrimary : colors.textMuted}
            />
            <AppText
              variant="caption"
              color={form.verified ? colors.onPrimary : colors.text}
              style={{ fontWeight: '700' }}>
              {form.verified ? t('admin.verified') : t('admin.markVerified')}
            </AppText>
          </Pressable>

          <Pressable
            onPress={save}
            accessibilityRole="button"
            accessibilityLabel={t('admin.save')}
            android_ripple={{ color: colors.border }}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: colors.primary,
              alignItems: 'center',
              opacity: pressed ? 0.75 : 1,
            })}>
            <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
              {t('admin.save')}
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
