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
  const blank = { title: '', author: '', authorOriginal: '', meter: '', chorus: '', lines: [] as string[][] };
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
        }
      : { key, ...blank };
  // Lazy init so the first open already shows the hymn's current words
  // (previously the form stayed blank until switching to another hymn).
  const [form, setForm] = useState(() => toForm(id, hymn));
  if (form.key !== id) {
    setForm(toForm(id, hymn));
  }
  const [msg, setMsg] = useState('');

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
    setOverride(hymn.id, {
      title: form.title.trim(),
      author: form.author.trim(),
      authorOriginal: form.authorOriginal.trim(),
      meter: form.meter.trim(),
      chorus: form.chorus.trim(),
      verses: hymn.verses.map((verse, i) => ({ ...verse, lines: form.lines[i].map((l) => l.trim()) })),
    });
    setMsg(t('admin.saved'));
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
