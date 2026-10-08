/**
 * Merges converter-format batch .txt files into one cumulative staging file.
 *
 * Run: node scripts/merge-staging.mjs <out.txt> <in1.txt> [in2.txt ...]
 *   e.g. node scripts/merge-staging.mjs content/staging-011-100.txt \
 *          content/pilot/input-pilot.txt content/batches/021-030/input-batch-021-030.txt ...
 *
 * Blocks are split on blank lines; each block's hymn number comes from its
 * header line ("N | title | ..."). Duplicate numbers keep the FIRST occurrence
 * and are reported — resolve by editing the batch file and re-merging.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [outPath, ...inputs] = process.argv.slice(2);
if (!outPath || inputs.length === 0) {
  console.error('Usage: node scripts/merge-staging.mjs <out.txt> <in1.txt> [in2.txt ...]');
  process.exit(1);
}

const seen = new Map(); // number -> { file }
const order = [];
for (const file of inputs) {
  const text = readFileSync(file, 'utf8');
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  for (const block of blocks) {
    const header = block.split('\n')[0];
    const m = /^\s*(\d+)\s*\|/.exec(header);
    if (!m) {
      console.warn(`skip block with bad header in ${file}: ${header.slice(0, 50)}`);
      continue;
    }
    const num = Number(m[1]);
    if (seen.has(num)) {
      console.warn(`duplicate hymn ${num}: keeping ${seen.get(num)} version, ignoring ${file} version`);
      continue;
    }
    seen.set(num, file);
    order.push({ num, block });
  }
}

order.sort((a, b) => a.num - b.num);
writeFileSync(outPath, order.map((o) => o.block).join('\n\n') + '\n', 'utf8');
const nums = order.map((o) => o.num);
const missing = [];
for (let n = nums[0]; n <= nums[nums.length - 1]; n += 1) {
  if (!seen.has(n)) missing.push(n);
}
console.log(`Merged ${order.length} hymns (#${nums[0]}-#${nums[nums.length - 1]}) -> ${outPath}`);
if (missing.length) console.log(`Missing in range: ${missing.join(', ')} (fill from printed hymnal)`);
