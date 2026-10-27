#!/usr/bin/env node
/**
 * Merges a narration audio track into a video, replacing the original audio.
 *
 * Usage:
 *   node scripts/merge-video.mjs <video.mp4> <audio.mp3> <output.mp4>
 */
import { spawnSync } from 'node:child_process';

const [video, audio, output] = process.argv.slice(2);
if (!video || !audio || !output) {
  console.error('usage: node scripts/merge-video.mjs <video.mp4> <audio.mp3> <output.mp4>');
  process.exit(1);
}

const args = [
  '-y',
  '-i', video,
  '-i', audio,
  '-c:v', 'copy',
  '-c:a', 'aac',
  '-b:a', '128k',
  '-map', '0:v:0',
  '-map', '1:a:0',
  '-shortest',
  output,
];

const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (r.status !== 0) {
  console.error('ffmpeg merge failed');
  process.exit(r.status ?? 1);
}
console.log(`Merged -> ${output}`);