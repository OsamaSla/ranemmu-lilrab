/**
 * Admin hymn editor (text-level only).
 *
 * Structural edits (add/delete/reorder stanzas) are PC-only by design: the
 * EN/DE sheets must mirror the Arabic stanza-for-stanza, and the importer
 * rejects anything else. Saving therefore requires identical stanza and
 * line counts to the bundled record.
 */
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { getHymn } from '../../data/loader';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useOverrides } from '../../store/overrides';
import { radius, spacing } from '../../theme/tokens';

export default function AdminEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();

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
          title: h.title,
          author: h.author ?? '',
          authorOriginal: h.authorOriginal ?? '',
          meter: h.meter ?? '',
          chorus: h.chorus ?? '',
          lines: h.verses.map((v) => [...v.lines]),
          title_en: h.title_en ?? '',
          chorus_en: h.chorus_en ?? '',
          linesEn: h.verses_en ? h.verses_en.map((v) => [...v.lines]) : [],
          title_de: h.title_de ?? '',
          chorus_de: h.chorus_de ?? '',
          linesDe: h.verses_de ? h.verses_de.map((v) => [...v.lines]) : [],
        }
      : { key, ...blank };
  // Lazy init so the first open already shows the hymn's current words
  // (previously the form stayed blank until switching to another hymn).
  const [form, setForm] = useState(() => toForm(id, hymn));
  if (form.key !== id) {
    setForm(toForm(id, hymn));
    setSavedOnce(false);
  }
  const [msg, setMsg] = useState('');
  // Tracks a successful save so the publish guidance below only appears
  // once there is actually something to publish (not on validation errors).
  const [savedOnce, setSavedOnce] = useState(false);

  if (!hymn) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <AppBar title={t('admin.editHymn')} />
        <EmptyState icon="book-remove-outline" title={t('admin.notFound')} />
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

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const setLine = (verseIndex: number, lineIndex: number, value: string) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((ls, vi) => (vi === verseIndex ? ls.map((l, li) => (li === lineIndex ? value : l)) : ls)),
    }));
  };

  const setTranslatedLine = (lang: 'en' | 'de', verseIndex: number, lineIndex: number, value: string) => {
    const mapLines = (all: string[][]) =>
      all.map((ls, vi) => (vi === verseIndex ? ls.map((l, li) => (li === lineIndex ? value : l)) : ls));
    if (lang === 'en') setForm((f) => ({ ...f, linesEn: mapLines(f.linesEn) }));
    else setForm((f) => ({ ...f, linesDe: mapLines(f.linesDe) }));
  };

  const hasEn = Boolean(hymn?.verses_en ?? hymn?.title_en);
  const hasDe = Boolean(hymn?.verses_de ?? hymn?.title_de);

  const save = () => {
    if (!hymn) return;
    if (!form.title.trim() || form.lines.some((ls) => ls.some((l) => !l.trim()))) {
      setMsg(t('admin.errBlank'));
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
    setOverride(hymn.id, {
      title: form.title.trim(),
      author: form.author.trim(),
      authorOriginal: form.authorOriginal.trim(),
      meter: form.meter.trim(),
      chorus: form.chorus.trim(),
      verses: hymn.verses.map((verse, i) => ({ ...verse, lines: form.lines[i].map((l) => l.trim()) })),
      ...(hasEn
        ? {
            title_en: form.title_en.trim(),
            chorus_en: form.chorus_en.trim(),
            ...(hymn.verses_en
              ? {
                  verses_en: hymn.verses_en.map((verse, i) => ({
                    ...verse,
                    lines: form.linesEn[i].map((l) => l.trim()),
                  })),
                }
              : {}),
          }
        : {}),
      ...(hasDe
        ? {
            title_de: form.title_de.trim(),
            chorus_de: form.chorus_de.trim(),
            ...(hymn.verses_de
              ? {
                  verses_de: hymn.verses_de.map((verse, i) => ({
                    ...verse,
                    lines: form.linesDe[i].map((l) => l.trim()),
                  })),
                }
              : {}),
          }
        : {}),
    });
    setMsg(t('admin.saved'));
    setSavedOnce(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={`${t('common.hymnNumber')} ${hymn.number}`} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
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

        {hymn.verses.map((verse, i) => (
          <Card key={`${i}-${verse.label}`} style={{ marginBottom: spacing.md, padding: spacing.md }}>
            <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
              ({verse.label}){verse.chorus ? ` · ${hymn.chorus ?? ''}` : ''}
            </AppText>
            {form.lines[i]?.map((line, j) => (
              <TextInput
                key={j}
                value={line}
                onChangeText={(v) => setLine(i, j, v)}
                multiline
                style={[fieldStyle, { marginBottom: spacing.sm, minHeight: 64, textAlignVertical: 'top' }]}
              />
            ))}
            {hasEn && hymn.verses_en?.[i] ? (
              <>
                <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>
                  {t('admin.translationEn')}
                </AppText>
                {form.linesEn[i]?.map((line, j) => (
                  <TextInput
                    key={j}
                    value={line}
                    onChangeText={(v) => setTranslatedLine('en', i, j, v)}
                    multiline
                    style={[
                      fieldStyle,
                      { marginBottom: spacing.sm, minHeight: 64, textAlignVertical: 'top', writingDirection: 'ltr', textAlign: 'left' },
                    ]}
                  />
                ))}
              </>
            ) : null}
            {hasDe && hymn.verses_de?.[i] ? (
              <>
                <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>
                  {t('admin.translationDe')}
                </AppText>
                {form.linesDe[i]?.map((line, j) => (
                  <TextInput
                    key={j}
                    value={line}
                    onChangeText={(v) => setTranslatedLine('de', i, j, v)}
                    multiline
                    style={[
                      fieldStyle,
                      { marginBottom: spacing.sm, minHeight: 64, textAlignVertical: 'top', writingDirection: 'ltr', textAlign: 'left' },
                    ]}
                  />
                ))}
              </>
            ) : null}
          </Card>
        ))}

        <Pressable
          onPress={save}
          accessibilityRole="button"
          accessibilityLabel={t('admin.save')}
          android_ripple={{ color: colors.border }}
          style={({ pressed }) => ({
            paddingVertical: spacing.md,
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
            alignItems: 'center',
            opacity: pressed ? 0.75 : 1,
          })}>
          <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
            {t('admin.save')}
          </AppText>
        </Pressable>

        {msg ? (
          <AppText variant="body" center color={colors.primary} style={{ fontWeight: '700', marginTop: spacing.md }}>
            {msg}
          </AppText>
        ) : null}

        {savedOnce ? (
          <Card style={{ marginTop: spacing.md, padding: spacing.md }}>
            <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
              {t('admin.publishSteps')}
            </AppText>
            <Pressable
              onPress={() => router.push('/admin')}
              accessibilityRole="button"
              accessibilityLabel={t('admin.export')}
              android_ripple={{ color: colors.border }}
              style={({ pressed }) => ({
                paddingVertical: spacing.sm,
                borderRadius: radius.pill,
                backgroundColor: colors.accent,
                alignItems: 'center',
                opacity: pressed ? 0.75 : 1,
              })}>
              <AppText variant="label" color={colors.text} style={{ fontWeight: '700' }}>
                {t('admin.export')}
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
    </View>
  );
}
