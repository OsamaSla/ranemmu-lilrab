#!/usr/bin/env node
/**
 * Imports the hymn spreadsheet and refreshes the static PC preview.
 *
 * Run with: npm run add-batch [-- some-other.xlsx]
 *
 * All hymns live in ONE file, content/hymns-imported.xlsx - just keep
 * appending new hymns at the bottom (numbers continue the sequence and must
 * never repeat). An explicit file argument overrides the default.
 *
 * Chain (stops on the first failure, so a broken batch never reaches
 * the preview — no Metro/dev server needed, the static export is enough):
 *   1. node scripts/import-sheet.mjs [file]  (no file = newest .xlsx)
 *   2. node scripts/check-hymns.mjs
 *   3. node scripts/build-corpus.mjs
 *   4. npx expo export --platform web
 *
 * The already-running `serve` on :8081 picks the new dist/ up from disk,
 * so afterwards just reload http://localhost:8081/library in the browser.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(ROOT, 'content');
// Local Expo CLI (shell-free: .cmd shims cannot run without a shell).
const EXPO_CLI = join(ROOT, 'node_modules', 'expo', 'bin', 'cli');

function run(label, cmd, args) {
  console.log(`\n### ${label}\n$ ${cmd} ${args.join(' ')}`);
  // No shell anywhere: plain executables only (node + the local CLI file).
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: false });
  if (res.status !== 0) {
    console.error(`\nFAILED: ${label} (exit ${res.status}) — preview left untouched.`);
    process.exit(res.status ?? 1);
  }
}

function corpusSize() {
  let total = 0;
  let max = 0;
  for (const f of readdirSync(CONTENT_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = JSON.parse(readFileSync(join(CONTENT_DIR, f), 'utf8'));
      const list = Array.isArray(raw) ? raw : (raw.hymns ?? []);
      total += list.length;
      for (const h of list) {
        if (Number.isInteger(h?.number) && h.number > max) max = h.number;
      }
    } catch {
      /* check-hymns reports unreadable files; ignore here */
    }
  }
  return { total, max };
}

async function main() {
  const file = process.argv[2] ?? join('content', 'hymns-imported.xlsx');
  run('import', 'node', ['scripts/import-sheet.mjs', file]);
  run('check', 'node', ['scripts/check-hymns.mjs']);
  run('build', 'node', ['scripts/build-corpus.mjs']);
  run('export web', 'node', [EXPO_CLI, 'export', '--platform', 'web']);
  run('pages fallback', 'node', ['scripts/pages-fallback.mjs']);

  const { total, max } = corpusSize();
  console.log(`\ndone: corpus holds ${total} hymn(s) (up to #${max})`);
  console.log('reload http://localhost:8081/library to view them');
}

const invoked = process.argv[1] && basename(process.argv[1]) === 'add-batch.mjs';
if (invoked) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
