#!/usr/bin/env node
/**
 * Extracts key frames from a video for narration writing.
 *
 * Usage:
 *   node scripts/extract-frames.mjs <video.mp4> [outDir] [intervalSeconds]
 *
 * Example:
 *   node scripts/extract-frames.mjs "C:/videos/tutorial.mp4" tutorial/frames 5
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const video = process.argv[2];
if (!video) {
  console.error('usage: node scripts/extract-frames.mjs <video.mp4> [outDir] [intervalSeconds]');
  process.exit(1);
}
const outDir = resolve(process.argv[3] ?? 'tutorial/frames');
const interval = process.argv[4] ?? '5';

mkdirSync(outDir, { recursive: true });

const args = [
  '-y',
  '-i', video,
  '-vf', `fps=1/${interval},scale=1280:-1`,
  '-q:v', '3',
  `${outDir}/frame_%04d.jpg`,
];

const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (r.status !== 0) {
  console.error('ffmpeg failed');
  process.exit(r.status ?? 1);
}
console.log(`Frames extracted to ${outDir} (one every ${interval}s).`);
console.log('Write your narration in tutorial/narration.txt, one paragraph per scene.');