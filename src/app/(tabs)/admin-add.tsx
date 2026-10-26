/**
 * Admin hymn creator.
 *
 * On the client we write a partial `Hymn` into the overrides store (instant
 * in UI) and upload it to Firestore best-effort, where it joins the library
 * on every device via the remote overlay.
 */
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBar } from '../../components/AppBar';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';
import { TopicPicker } from '../../components/TopicPicker';
import { getSummaries } from '../../data/loader';
import { syncHymnToCloud } from '../../data/liveSync';
import { isValidMediaUrl } from '../../data/media';
import type { TopicId } from '../../data/topics';
import { useT } from '../../hooks/useT';
import { useTheme } from '../../hooks/useTheme';
import { useOverrides } from '../../store/overrides';
import { useRemote } from '../../store/remote';
import { useSettings } from '../../store/settings';
import { radius, spacing } from '../../theme/tokens';

interface HymnForm {
  number: number;
  title: string;
  author: string;
  authorOriginal: string;
  meter: string;
  chorus: string;
  mediaUrl: string;
  primaryTopic: TopicId | '';
  topics: TopicId[];
  lines: string[][];
}

function findNextAvailableNumber(summaries: { number: number }[]): number {
  const used = new Set(summaries.map((s) => s.number));
  let n = 1;
  while (used.has(n)) n += 1;
  return n;
}

export default function AdminAddScreen() {
  const router = useRouter();
  const { t, direction } = useT();
  const { colors, fontFamily } = useTheme();

  const setOverride = useOverrides((s) => s.setOverride);
  // Re-reads the list when cloud hymns stream in (number-taken check below).
  useRemote((s) => s.updatedAt);
  const book = useSettings((s) => s.book);
  const summaries = getSummaries();

  const toForm = (number: number): HymnForm => ({
    number,
    title: '',
    author: '',
    authorOriginal: '',
    meter: '',
    chorus: '',
    mediaUrl: '',
    primaryTopic: '',
    topics: [],
    lines: [[]],
  });
  const [form, setForm] = useState<HymnForm>(() => toForm(findNextAvailableNumber(summaries)));
  const [msg, setMsg] = useState('');

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
  } as const;

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const toggleSecondary = (id: TopicId) =>
    setForm((f) => ({
      ...f,
      topics: f.topics.includes(id) ? f.topics.filter((x) => x !== id) : [...f.topics, id],
    }));

  const setLine = (lineIndex: number, value: string) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((ls, li) => (li === lineIndex ? [value] : ls)),
    }));
  };

  const save = () => {
    if (!form.number || form.number < 1 || !form.title.trim()) {
      setMsg(t('admin.errBlank'));
      return;
    }
    if (form.number < 1) {
      setMsg(t('admin.errNumber'));
      return;
    }
    if (form.lines.length !== 1 || form.lines.some((ls) => ls.length !== 1)) {
      setMsg(t('admin.errCount'));
      return;
    }
    if (summaries.find((s) => s.number === form.number)) {
      setMsg(t('admin.errExists'));
      return;
    }
    const mediaTrimmed = form.mediaUrl.trim();
    if (mediaTrimmed && !isValidMediaUrl(mediaTrimmed)) {
      setMsg(t('admin.errUrl'));
      return;
    }
    const patch = {
      number: form.number,
      title: form.title.trim(),
      author: form.author.trim(),
      authorOriginal: form.authorOriginal.trim(),
      meter: form.meter.trim(),
      chorus: form.chorus.trim(),
      ...(mediaTrimmed ? { mediaUrl: mediaTrimmed } : {}),
      book,
      ...(form.primaryTopic ? { primaryTopic: form.primaryTopic } : {}),
      topics: form.topics.filter((x) => x !== form.primaryTopic),
      verses: [{
        label: String(form.number),
        lines: [form.lines[0][0].trim()],
        chorus: false,
      }],
    };
    setOverride(String(form.number), patch);
    void syncHymnToCloud(String(form.number), patch);
    setMsg(t('admin.saved'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <AppBar title={t('admin.addHymn')} showBack />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}>
        <Card style={{ marginBottom: spacing.md, padding: spacing.md }}>
          <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
            {t('admin.hymnNumber')}
          </AppText>
          <TextInput
            value={form.number ? String(form.number) : ''}
            onChangeText={(v) => set({ number: Number(v) || 0 })}
            onSubmitEditing={save}
            returnKeyType="go"
            keyboardType="number-pad"
            placeholder="706"
            placeholderTextColor={colors.textMuted}
            style={fieldStyle}
          />
          <Pressable
            onPress={() => set({ number: findNextAvailableNumber(summaries) })}
            accessibilityRole="button"
            accessibilityLabel={t('admin.findNextNumber')}
            android_ripple={{ color: colors.border }}
            style={({ pressed }) => ({
              marginTop: spacing.sm,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: radius.pill,
              backgroundColor: colors.accent,
              alignItems: 'center',
              opacity: pressed ? 0.75 : 1,
            })}>
            <AppText variant="label" color={colors.text} style={{ fontWeight: '700' }}>
              {t('admin.findNextNumber')}
            </AppText>
          </Pressable>
          <AppText variant="body" style={{ fontWeight: '700', marginTop: spacing.sm, marginBottom: spacing.sm }}>
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
        </Card>

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

        {form.lines.map((_, i) => (
          <Card key={i} style={{ marginBottom: spacing.md, padding: spacing.md }}>
            <AppText variant="body" style={{ fontWeight: '700', marginBottom: spacing.sm }}>
              ({String(form.number)})
            </AppText>
            <TextInput
              value={form.lines[i]?.[0] || ''}
              onChangeText={(v) => setLine(i, v)}
              multiline
              style={[fieldStyle, { marginBottom: spacing.sm, minHeight: 64, textAlignVertical: 'top' }]}
              placeholder={t('admin.stanzaLine')}
            />
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
          onPress={() => router.push('/(tabs)/admin')}
          style={{ alignItems: 'center', marginTop: spacing.md }}>
          <AppText variant="label" color={colors.textMuted}>
            {t('admin.backToAdmin')}
          </AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
}