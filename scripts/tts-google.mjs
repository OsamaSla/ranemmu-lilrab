#!/usr/bin/env node
/**
 * Converts a narration text file to speech using Google Cloud Text-to-Speech.
 *
 * Usage:
 *   set GOOGLE_TTS_API_KEY=...   (API key with Cloud Text-to-Speech enabled)
 *   node scripts/tts-google.mjs <input.txt> <output.mp3> [lang] [voice]
 *
 * Defaults: lang=ar-XA, voice=ar-XA-Wavenet-A
 *
 * The input file may contain the whole narration; it is sent as one request.
 * For long texts, split into chunks (Google limit ~5000 chars per request).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) {
  console.error('usage: node scripts/tts-google.mjs <input.txt> <output.mp3> [lang] [voice]');
  process.exit(1);
}
const lang = process.argv[4] ?? 'ar-XA';
const voice = process.argv[5] ?? 'ar-XA-Wavenet-A';
const apiKey = process.env.GOOGLE_TTS_API_KEY;
if (!apiKey) {
  console.error('Missing env GOOGLE_TTS_API_KEY');
  process.exit(1);
}

const text = readFileSync(resolve(input), 'utf8').trim();
if (!text) {
  console.error('Input text is empty');
  process.exit(1);
}

const body = {
  input: { text },
  voice: { languageCode: lang, name: voice },
  audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: 0.0 },
};

const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
if (!res.ok) {
  console.error('TTS failed:', res.status, await res.text());
  process.exit(1);
}
const json = await res.json();
const audio = Buffer.from(json.audioContent, 'base64');
writeFileSync(resolve(output), audio);
console.log(`Wrote ${audio.length} bytes -> ${output}`);