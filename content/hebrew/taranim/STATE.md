# Book 2 (taranim) refrains — live state

Last updated: 2026-11-18 · **123 / 375 hymns have a flagged refrain stanza**

## Source of truth — recovered 2026-11-18

The owner's original list was supplied again as `C:\Users\osama\Desktop\1.xlsx`
(`Sheet1`, columns `Hymn | refrain | place`, 123 data rows, all `refrain = 1`).
It is copied **verbatim** below so it can never be lost with a session again.

Mapping (owner's instruction, confirmed against the 30 earlier fixes):

- `place = 2` → **move** — the refrain is printed as stanza 1 and is moved
  below the old stanza 2. Final order: `1, القرار, 2, 3 …` (refrain at index 1).
- `place = 1` → **keep** — the refrain stays at index 0. Final order:
  `القرار, 1, 2, 3 …`.

The Excel's `place` values for the 30 previously-fixed hymns matched their
existing order exactly (318, 362, 364 = 1; the other 27 = 2), which validates
the mapping before any edit.

### Verbatim Excel dump (`Hymn refrain place`)

```
14 1 2
19 1 2
27 1 2
31 1 2
32 1 2
37 1 2
45 1 2
54 1 2
64 1 2
77 1 2
86 1 2
101 1 2
108 1 2
109 1 2
110 1 2
116 1 2
124 1 2
125 1 2
126 1 2
132 1 2
133 1 2
135 1 2
156 1 2
157 1 2
158 1 2
162 1 2
168 1 2
177 1 2
178 1 2
179 1 2
180 1 2
183 1 2
189 1 2
190 1 2
192 1 2
193 1 2
196 1 2
197 1 2
202 1 2
203 1 2
207 1 2
211 1 2
212 1 2
214 1 2
215 1 2
216 1 2
218 1 2
219 1 2
220 1 2
222 1 2
223 1 2
225 1 2
227 1 2
228 1 2
229 1 2
231 1 2
232 1 2
234 1 2
243 1 2
244 1 2
247 1 2
248 1 1
249 1 2
250 1 2
251 1 2
252 1 2
255 1 2
258 1 2
259 1 2
260 1 2
263 1 2
275 1 2
276 1 2
281 1 2
282 1 2
285 1 2
286 1 2
291 1 2
295 1 2
297 1 2
298 1 2
299 1 2
300 1 2
301 1 2
302 1 2
304 1 2
305 1 2
306 1 2
307 1 2
310 1 2
313 1 2
314 1 2
315 1 2
318 1 1
323 1 2
326 1 2
329 1 2
332 1 2
333 1 2
334 1 2
337 1 2
338 1 2
342 1 2
343 1 2
344 1 2
350 1 2
351 1 2
353 1 2
357 1 2
358 1 2
359 1 2
360 1 2
362 1 1
363 1 2
364 1 1
366 1 2
368 1 2
369 1 2
370 1 2
371 1 2
372 1 2
373 1 2
374 1 2
```

## Applied 2026-11-18 (93 new hymns)

These were **not** previously flagged. Applied in four local commits from
`e01fb65c`, in Excel order:

| commit | range | hymns | keep | move |
| --- | --- | --- | --- | --- |
| `c8b62434` | h0014–h0156 | 23 | — | 23 |
| `53b9cc90` | h0157–h0216 | 23 | — | 23 |
| `f4c86032` | h0218–h0259 | 23 | 248 | 22 |
| `76066bbb` | h0260–h0329 | 24 | — | 24 |

`h0248` is the only new `keep` (its refrain already prints as stanza 1).

## Left untouched — the 30 earlier fixes (`532d6eea`)

315, 318, 323, 326, 332, 333, 334, 337, 338, 342, 343, 344, 350, 351, 353,
357, 358, 359, 360, 362, 363, 364, 366, 368, 369, 370, 371, 372, 373, 374.
Verified byte-for-byte unchanged: only 93 payload files differ from `e01fb65c`.
Their Excel `place` values already matched their existing stanza order.

## Tooling

- `scripts/refrain-batch.mjs` — `LANGS` now includes `verses_he`, so the corpus
  stanza grid (AR/EN/DE/HE) is reordered and relabelled together.
- `scripts/book2/sync-hebrew-payloads.mjs` (new) — copies the corrected
  `verses_he` from `content/taranim.json` into `content/hebrew/taranim/NNNN.json`.
  Required because `hebrew-apply.mjs` `inspect()` validates payload labels
  against the Arabic; a stale payload fails the drift gate and mispairs lines.
  Usage: `node scripts/book2/sync-hebrew-payloads.mjs 14 19 132 …`

## Gates (2026-11-18, at `76066bbb`)

- `hebrew:check` ✓ no drift · `hebrew:align` ✓ 1824 translated hymns
- `check:hymns` 1824 hymns / 30,898 lines / 100 % vocalised
- `build:corpus` 1824 hymns / 19 chunks / search index 3.87 MB
- `typecheck` exit 0 · `git diff --exit-code -- assets/hymns src/data/generated-chunks.ts` clean
- Cross-check against the Excel: 123 rows, 0 mismatches, 123 flagged hymns in
  `content/taranim.json` (30 + 93), none outside the list.
- Reader (2026-11-18, `6a5ffa74`): with a translation view selected, the red
  refrain heading now reads `القرار · Refrain` / `القرار · Kehrvers` /
  `القرار · פְּזָמוֹן` for these hymns, matching Book 1. Verified in the browser
  on tr0132 (EN/DE/HE) and b30002 (EN); Book 1 h0014 unchanged.

**Do not push** without explicit owner authorization.
