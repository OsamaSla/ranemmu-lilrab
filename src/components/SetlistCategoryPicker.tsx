/**
 * Picks the category a hymn goes into (or the category being edited).
 *
 * The setlist is a set of user-named groups — a place, an occasion, a feast —
 * each holding its own ordered hymn row. This sheet is the one place that asks
 * the question, so the reader's «إضافة إلى قائمة العبادة» and the setlist
 * screen's category switcher behave identically. A new name is created and
 * selected in one tap; there is no mode where a hymn sits outside a category.
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { useSetlist } from '../store/setlist';
import { noFocusRing, radius, spacing } from '../theme/tokens';

export function SetlistCategoryPicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (categoryId: string) => void;
}) {
  const { t, direction } = useT();
  const { colors } = useTheme();
  const categories = useSetlist((s) => s.categories);
  const addCategory = useSetlist((s) => s.addCategory);
  const [name, setName] = useState('');

  // No reset effect: every close path (pick / cancel / backdrop / hardware
  // back) clears the field, so the next opening always starts empty without
  // calling setState from an effect body.

  const pick = (id: string) => {
    onPick(id);
    setName('');
    onClose();
  };

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    pick(addCategory(trimmed));
  };

  const cancel = () => {
    setName('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={cancel}>
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          onPress={cancel}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,26,20,0.55)' }} />
        <View style={{ backgroundColor: colors.canvas, borderRadius: radius.lg, padding: spacing.md, maxHeight: '80%' }}>
          <View style={{ flexDirection: direction.row, alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <AppText variant="label" style={{ fontWeight: '700' }}>
              {t('setlist.chooseCategory')}
            </AppText>
            <Pressable onPress={cancel} accessibilityRole="button" accessibilityLabel={t('common.cancel')} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 260 }}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => pick(category.id)}
                accessibilityRole="button"
                accessibilityLabel={category.name}
                android_ripple={{ color: colors.border }}
                style={({ pressed }) => ({
                  flexDirection: direction.row,
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.sm,
                  opacity: pressed ? 0.6 : 1,
                })}>
                <MaterialCommunityIcons name="folder-outline" size={20} color={colors.primary} />
                <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
                  {category.name}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} useAppFont={false}>
                  {category.ids.length}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.md }}>
            <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.xs }}>
              {t('setlist.newCategory')}
            </AppText>
            <View style={{ flexDirection: direction.row, gap: spacing.sm, alignItems: 'center' }}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('setlist.categoryName')}
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={create}
                accessibilityLabel={t('setlist.categoryName')}
                style={[
                  {
                    flex: 1,
                    minHeight: 44,
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceMuted,
                    color: colors.text,
                    fontSize: 15,
                  },
                  noFocusRing,
                ]}
              />
              <Pressable
                onPress={create}
                disabled={!name.trim()}
                accessibilityRole="button"
                accessibilityLabel={t('setlist.create')}
                style={({ pressed }) => ({
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.pill,
                  backgroundColor: colors.primary,
                  opacity: !name.trim() ? 0.5 : pressed ? 0.7 : 1,
                })}>
                <AppText variant="label" color={colors.onPrimary} style={{ fontWeight: '700' }}>
                  {t('setlist.create')}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
