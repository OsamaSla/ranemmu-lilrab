/**
 * TutorialVideoCard — video help for non-technical users.
 *
 * Two modes, chosen automatically:
 * - MP4_URL set → tap-to-load inline `expo-video` player (no autoplay,
 *   saves mobile data), native controls + fullscreen.
 * - YouTube URL only → big button opens it in the system browser / app.
 * - Neither set → card shows the text guide with a "soon" hint, never broken.
 *
 * Mounted at the top of the Help tab. RTL-aware, themed, accessible.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { TUTORIAL_MP4_URL, TUTORIAL_YOUTUBE_URL } from '../data/tutorials';
import { useT } from '../hooks/useT';
import { useTheme } from '../hooks/useTheme';
import { radius, spacing } from '../theme/tokens';
import { AppText } from './AppText';
import { Card } from './Card';

export function TutorialVideoCard() {
  const { t, direction } = useT();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);

  const hasInline = TUTORIAL_MP4_URL.trim().length > 0 && !failed;
  const hasYoutube = TUTORIAL_YOUTUBE_URL.trim().length > 0;

  // Created lazily-loaded: null source buffers nothing until the user taps
  // play, which matters on metered connections.
  const player = useVideoPlayer(hasInline ? TUTORIAL_MP4_URL : null, (p) => {
    p.loop = false;
  });

  const openYoutube = async () => {
    if (!hasYoutube) return;
    try {
      await WebBrowser.openBrowserAsync(TUTORIAL_YOUTUBE_URL);
    } catch {
      // In-app browser unavailable (rare) — fall back to the OS handler
      // so the YouTube app / external browser opens instead.
      Linking.openURL(TUTORIAL_YOUTUBE_URL).catch(() => {});
    }
  };

  const handlePlay = () => {
    if (!hasInline) {
      openYoutube();
      return;
    }
    setExpanded(true);
    try {
      player.play();
    } catch {
      setFailed(true);
    }
  };

  return (
    <Card style={{ padding: spacing.lg, marginBottom: spacing.md }}>
      <View style={{ flexDirection: direction.row, alignItems: 'center' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MaterialCommunityIcons name="play-circle-outline" size={24} color={colors.onPrimary} />
        </View>
        <View style={{ flex: 1, paddingHorizontal: spacing.md }}>
          <AppText variant="body" style={{ fontWeight: '700' }}>
            {t('help.video.title')}
          </AppText>
          <AppText variant="label" color={colors.textMuted} style={{ marginTop: 2 }}>
            {t('help.video.body')}
          </AppText>
        </View>
      </View>

      {expanded && hasInline ? (
        <View style={{ marginTop: spacing.md }}>
          <VideoView
            player={player}
            style={{
              width: '100%',
              height: 210,
              borderRadius: radius.md,
              backgroundColor: '#000',
            }}
            contentFit="contain"
            nativeControls
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture
          />
          <Pressable
            onPress={() => {
              player.pause();
              setExpanded(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={{ marginTop: spacing.sm, alignSelf: 'center', padding: spacing.xs }}>
            <AppText variant="label" color={colors.primary} style={{ fontWeight: '700' }}>
              {t('common.close')}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: direction.row, gap: spacing.sm, marginTop: spacing.md }}>
          <Pressable
            onPress={handlePlay}
            accessibilityRole="button"
            accessibilityLabel={t('help.video.play')}
            android_ripple={{ color: colors.border }}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: direction.row,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              paddingVertical: 12,
              opacity: pressed ? 0.8 : 1,
            })}>
            <MaterialCommunityIcons
              name={hasInline || hasYoutube ? 'play' : 'clock-outline'}
              size={20}
              color={colors.onPrimary}
            />
            <AppText
              variant="body"
              color={colors.onPrimary}
              style={{ fontWeight: '700', marginHorizontal: spacing.xs }}>
              {!hasInline && !hasYoutube ? t('help.video.soon') : t('help.video.play')}
            </AppText>
          </Pressable>

          {hasInline && hasYoutube ? (
            <Pressable
              onPress={openYoutube}
              accessibilityRole="button"
              accessibilityLabel={t('help.video.youtube')}
              android_ripple={{ color: colors.border }}
              style={({ pressed }) => ({
                flexDirection: direction.row,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingVertical: 12,
                paddingHorizontal: spacing.md,
                opacity: pressed ? 0.7 : 1,
              })}>
              <MaterialCommunityIcons name="youtube" size={20} color={colors.primary} />
              <AppText variant="label" style={{ fontWeight: '700', marginHorizontal: 4 }}>
                {t('help.video.youtube')}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      )}
    </Card>
  );
}
