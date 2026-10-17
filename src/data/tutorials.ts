/**
 * Video tutorial configuration.
 *
 * Best-experience default: only a YouTube link is required. Inline playback
 * via `expo-video` activates automatically once `MP4_URL` is set to a direct
 * .mp4 / .m3u8 file, so the owner can start with YouTube and upgrade later
 * without code changes.
 *
 * How to use:
 * 1. Upload the tutorial to YouTube (unlisted is fine) and paste the URL below.
 * 2. Optional: upload a direct MP4 to any CDN and paste it as MP4_URL for
 *    in-app playback with fullscreen + native controls.
 */
export const TUTORIAL_YOUTUBE_URL: string = '';

/** Direct video file for in-app playback. Leave empty to use YouTube only.
 *  Filled by scripts/tutorial/publish_video.mjs after Firebase Storage upload.
 */
export const TUTORIAL_MP4_URL: string = '';
