/**
 * Admin hymn editor (text-level only).
 *
 * Structural edits (add/delete/reorder stanzas) are PC-only by design: the
 * EN/DE sheets must mirror the Arabic stanza-for-stanza, and the importer
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
import { getHymn, ensureHymn, isHymnPending } from '../../data/loader';
import { syncHymnToCloud } from '../../data/liveSync';
import { isValidMediaUrl } from '../../data/media';
import type { TopicId } from '../../data/topics';
import { useT } from '../../hooks/useT';
import { useCanEdit } from '../../hooks/useCanEdit';
import { useTheme } from '../../hooks/useTheme';
import { useOverrides } from '../../store/overrides';
import { radius, spacing } from '../../theme/tokens';

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
    verified: false,
    primaryTopic: '' as TopicId | '',
    topics: [] as TopicId[],
    lines: [] as string[][],
    title_en: '',
    chorus_en: '',
    linesEn: [] as string[][],
    title_de: '',
    chorus_de: '',
    linesDe: [] as string[][],
  };
  const toForm = (key: typeof id, h: typeof hymn) =>
    h
      ? {
          key,
          // Which hymn record the form was filled from. Empty until the
          // lazily imported chunk lands, which is what triggers the reset.
          sourceId: h.id,
          verified: h.translationStatus === 'VERIFIED',
          title: h.title,
          author: h.author ?? '',
          authorOriginal: h.authorOriginal ?? '',
          meter: h.meter ?? '',
          chorus: h.chorus ?? '',
          mediaUrl: h.mediaUrl ?? '',
          primaryTopic: h.primaryTopic ?? ('' as TopicId | ''),
          topics: [...(h.topics ?? [])],
          lines: h.verses.map((v) => [...v.lines]),
          title_en: h.title_en ?? '',
          chorus_en: h.chorus_en ?? '',
          linesEn: h.verses_en ? h.verses_en.map((v) => [...v.lines]) : [],
          title_de: h.title_de ?? '',
          chorus_de: h.chorus_de ?? '',
          linesDe: h.verses_de ? h.verses_de.map((v) => [...v.lines]) : [],
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
    Record<'ar' | 'en' | 'de', boolean>
  > | null>(null);
  // The hymn body is imported on demand; bump this once it lands so the form
  // (and the not-found fallback) re-reads getHymn().
  const [, setChunkVersion] = useState(0);
  const pendingChunk = typeof id === 'string' && isHymnPending(id);
  useEffect(() => {
    if (!canEdit || typeof id !== 'string') return;
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
  }, [canEdit, id]);

  if (form.key !== id || form.sourceId !== (hymn?.id ?? '')) {
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

  const fieldStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    color: colors.text,
    fontFamily,
    fontSize: 16,
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

  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
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

  const setTranslatedLine = (lang: 'en' | 'de', verseIndex: number, lineIndex: number, value: string) => {
    setDirty(true);
    const mapLines = (all: string[][]) =>
      all.map((ls, vi) => (vi === verseIndex ? ls.map((l, li) => (li === lineIndex ? value : l)) : ls));
    if (lang === 'en') setForm((f) => ({ ...f, linesEn: mapLines(f.linesEn) }));
    else setForm((f) => ({ ...f, linesDe: mapLines(f.linesDe) }));
  };

  const hasEn = Boolean(hymn?.verses_en ?? hymn?.title_en);
  const hasDe = Boolean(hymn?.verses_de ?? hymn?.title_de);

  // Language filter for the verse editor. `showLang` follows the default until
  // the user pins a choice; a language the hymn does not carry stays hidden.
  const showLang = (key: 'ar' | 'en' | 'de'): boolean => {
    if (key === 'en' && !hasEn) return false;
    if (key === 'de' && !hasDe) return false;
    if (langChoice) return Boolean(langChoice[key]);
    if (key === 'ar') return true;
    if (key === 'en') return lang !== 'de';
    return lang === 'de';
  };

  const toggleLang = (key: 'ar' | 'en' | 'de') => {
    const next = { ar: showLang('ar'), en: showLang('en'), de: showLang('de') };
    next[key] = !next[key];
    // Never hide all three: a bare line number would not say which language the
    // row below it belongs to.
    if (!next.ar && !next.en && !next.de) next.ar = true;
    setLangChoice(next);
  };

  const save = () => {
    if (!hymn) return;
    if (!form.title.trim() || form.lines.some((ls) => ls.some((l) => !l.trim()))) {
      setMsg(t('admin.errBlank'));
      return;
    }
    const mediaTrimmed = form.mediaUrl.trim();
    if (mediaTrimmed && !isValidMediaUrl(mediaTrimmed)) {
      setMsg(t('admin.errUrl'));
      return;
    }
    if (form.lines.length !== hymn.verses.length || form.lines.some((ls, i) => ls.length !== hymn.verses[i].lines.length)) {
      setMsg(t('admin.errCount'));
      return;
    }
    // Translations keep their own stanza/line shape; blanks are rejected
    // with the same message as the Arabic lines.
    if (hasEn && hymn.verses_en) {
      const sourceEn = hymn.verses_en;
      if (
        form.linesEn.length !== sourceEn.length ||
        form.linesEn.some((ls, i) => ls.length !== sourceEn[i].lines.length) ||
        form.linesEn.some((ls) => ls.some((l) => !l.trim()))
      ) {
        setMsg(t('admin.errBlank'));
        return;
      }
    }
    if (hasDe && hymn.verses_de) {
      const sourceDe = hymn.verses_de;
      if (
        form.linesDe.length !== sourceDe.length ||
        form.linesDe.some((ls, i) => ls.length !== sourceDe[i].lines.length) ||
        form.linesDe.some((ls) => ls.some((l) => !l.trim()))
      ) {
        setMsg(t('admin.errBlank'));
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
      if (changed(hymn[key], nextText[key])) patch[key] = nextText[key];
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
    const verses = hymn.verses.map((verse, i) => ({
      ...verse,
      lines: form.lines[i].map((l) => l.trim()),
    }));
    if (changed(hymn.verses.map((v) => v.lines), verses.map((v) => v.lines))) {
      patch.verses = verses;
    }
    if (hasEn) {
      if (changed(hymn.title_en, form.title_en.trim())) patch.title_en = form.title_en.trim();
      if (changed(hymn.chorus_en, form.chorus_en.trim())) patch.chorus_en = form.chorus_en.trim();
      if (hymn.verses_en) {
        const versesEn = hymn.verses_en.map((verse, i) => ({
          ...verse,
          lines: form.linesEn[i].map((l) => l.trim()),
        }));
        if (changed(hymn.verses_en.map((v) => v.lines), versesEn.map((v) => v.lines))) {
          patch.verses_en = versesEn;
        }
      }
    }
    if (hasDe) {
      if (changed(hymn.title_de, form.title_de.trim())) patch.title_de = form.title_de.trim();
      if (changed(hymn.chorus_de, form.chorus_de.trim())) patch.chorus_de = form.chorus_de.trim();
      if (hymn.verses_de) {
        const versesDe = hymn.verses_de.map((verse, i) => ({
          ...verse,
          lines: form.linesDe[i].map((l) => l.trim()),
        }));
        if (changed(hymn.verses_de.map((v) => v.lines), versesDe.map((v) => v.lines))) {
          patch.verses_de = versesDe;
        }
      }
    }

    if (Object.keys(patch).length === 0) {
      // Nothing changed: writing an empty override would upload a no-op
      // document and keep masking fresher cloud values on this device.
      setMsg(t('admin.saved'));
      setSavedOnce(true);
      setDirty(false);
      return;
    }
    setOverride(hymn.id, patch);
    // Best-effort live upload: silent when offline, unconfigured or signed
    // out — the local save above is the source of truth either way.
    void syncHymnToCloud(hymn.id, patch);
    setMsg(t('admin.saved'));
    setSavedOnce(true);
    setDirty(false);
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
          <TextInput value={form.chorus} onChangeText={(v) => set({ chorus: v })} style={fieldStyle} />
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
              <AppText variant="label" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
                {t('admin.chorusEn')}
              </AppText>
              <TextInput
                value={form.chorus_en}
                onChangeText={(v) => set({ chorus_en: v })}
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
              <AppText variant="label" color={colors.textMuted} style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
                {t('admin.chorusDe')}
              </AppText>
              <TextInput
                value={form.chorus_de}
                onChangeText={(v) => set({ chorus_de: v })}
                style={[fieldStyle, { writingDirection: 'ltr', textAlign: 'left' }]}
              />
            </>
          ) : null}
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

        {hymn.verses.map((verse, i) => (
          <Card key={`${i}-${verse.label}`} style={{ marginBottom: spacing.md, padding: spacing.md }}>
            <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
              ({verse.label}){verse.chorus ? ` · ${hymn.chorus ?? ''}` : ''}
            </AppText>
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
                      accessibilityLabel={`${t('admin.verses')} ${verse.label} · ${j + 1}`}
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
