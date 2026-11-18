# Book 1 Hebrew — subagent rotation driver

Goal: translate all **1,047** hymns of Book 1 (`main`) into fully-pointed liturgical
Hebrew. Corpus: `content/main.json` + `content/main-1001-1047.json` — 19,685 verse
lines, **694** hymns with a `chorus` field, labels `1`…`13` (Western digits), some
hymns up to 65 lines long.

This file supersedes `PROJECT_NOTES.md` §16 for the Book 1 loop. Read order for
the orchestrator: this file → `STATE.md` → `content/hebrew/glossary.md` (once per
run). Do not read all of `PROJECT_NOTES.md`.

## Why subagents, not a shell driver
The installed CLI is OpenCode `1.18.34`. Verified 2026-11-17:
- `opencode run -m opencode/hy4-flash-free` (and `glm-5.3-flash-free`, with and
  without `OPENCODE_API_KEY`) → **Invalid credential**. Free `opencode/*` models
  work only inside the interactive harness, not in headless `opencode run`.
- `opencode run -m ollama/qwen3.5:4b` → **Provider not found: ollama** (no local
  discovery in this CLI version), although the harness exposes `ollama/*` models
  to subagents.
- `deepseek/*` and `openrouter/*` do run headless but return **Insufficient
  Balance / credits** until funded.

Therefore the driver is the **parent session orchestrating fresh-context
subagents**, one batch at a time. Keep this session open; no new sessions by
hand. A standalone script cannot rotate the free models.

## Model rotation order
Tried in this order; on a quota/limit error the orchestrator marks that model
exhausted **for the current local day**, advances to the next, and retries the
same batch:

1. `opencode/deepseek-v4.1-flash-free`
2. `opencode/hy4-flash-free`
3. `opencode/glm-5.3-flash-free`
4. `opencode/mimo-v2.6-flash-free`
5. `opencode/longcat-2.5-free`
6. `opencode/iceman-free`
7. `opencode/flint-40b-free`
8. `opencode/nemotron-3.5-lightning-free`
9. `ollama/qwen2.5:14b` (local, no quota; available to subagents)
10. `ollama/qwen3.5:4b` (local, no quota, weaker)
11. `deepseek/deepseek-flash` (paid — only after the $2 top-up)
12. `opencode/qwen3.8-flash` (paid via Console credits)

Order is recorded in `STATE.md` as `active_index` plus a per-day `exhausted`
list. Reset the exhausted list at the next local day boundary.

**Quality rule:** the first model that clears a batch's gates with no regeneration
becomes the primary for the run. Weaker models are fallbacks only. A final
consistency pass is required if more than one model produced payloads.

## Batch policy
`node scripts/book1/next-batch.mjs` prints `FROM TO HYMNS LINES` for the next
batch. It takes the first untranslated hymns, up to **140 verse lines** and at
most **15 hymns**. Book 3's 15-hymn batches were ~140 lines; Book 1 needs the
line cap because single hymns reach 65 lines. Override with `BATCH_LINES` /
`BATCH_HYMNS` env vars.

One batch = one commit. Never re-author a committed payload.

## Per-batch child prompt
Use this exact shape, substituting the range from `next-batch.mjs`:

```
Read content/hebrew/main/PLAN.md, content/hebrew/main/STATE.md and
content/hebrew/glossary.md, then translate ONLY hymns h<FROM>-h<TO> end to end:
node scripts/hebrew-digest.mjs main <FROM> <TO> --pack
author content/.cache/hebrew/main-<FROM>-<TO>.he.txt (Arabic replaced by Hebrew)
node scripts/hebrew-pack.mjs <that file> --book main
npm run hebrew:apply && npm run hebrew:check
node scripts/hebrew-meter.mjs --book main --from <FROM> --to <TO> --flags-only
npm run hebrew:align && npm run build:corpus
git add content/hebrew/main content/main.json assets/hymns
git commit -m "feat(hebrew): Book 1 batch h<FROM>-h<TO>"
This is unattended: never ask a question. Decide from those files and continue.
Author the Hebrew yourself (no generator, no placeholders). Run every gate and
fix real faults only. Do NOT edit STATE.md or PLAN.md — the parent owns them.
End with one line: DONE <FROM>-<TO> / BLOCKED <reason>.
```

## Chorus rule (final Book 1 convention — owner decision 2026-11-18)
694 hymns have a top-level `chorus` field (a label, e.g. `القرار`) and one or more
verses with `chorus: true`. The digest emits a blank `C:` line for these. Fill it
with the **fixed pointed Hebrew word `פְּזָמוֹן`** — the Hebrew name of the refrain,
NOT the hymn's refrain text. The refrain text itself stays in `verses_he` in the
chorus-tagged stanza; the Arabic label is data in `verses_he`. `hebrew-apply`
requires `chorus_he` to be pointed Hebrew. This overrides the older Book 2
convention where `chorus_he` repeated the refrain text; all 694 Book 1 payloads
were converted by `scripts/book1/set-chorus-label.mjs` (commit after `dec4c89c`).

## Gates (all must pass before a batch counts)
- `hebrew-pack` dry-run, then write — refutes foreign characters, missing lines,
  unpointed lines.
- `hebrew:apply` / `hebrew:check` — no drift.
- `hebrew-meter --book main --from … --to … --flags-only` — review flags; fix
  only missing/extra words or lines that lost the Arabic. Print shapes and
  relative length stay and are recorded in `STATE.md`.
- `hebrew:align` — stanza-for-stanza match.
- `build:corpus` — regenerates `assets/hymns` (must be staged with the payloads;
  the CI diff gate checks this).
- `check:hymns`, `typecheck` — per session close.
- `git diff --exit-code -- assets/hymns src/data/generated-chunks.ts` — 0.

## Orchestrator loop (parent)
1. `node scripts/book1/next-batch.mjs` → range.
2. Read `STATE.md` → active model index, today's exhausted list.
3. Spawn one subagent with the prompt above and the active model.
4. When it finishes, verify: `hebrew:progress` advanced by the expected hymn
   count, payload files exist, a new commit is present. If progress advanced but
   no commit, commit the known paths yourself.
5. On a quota/limit response from the child: mark the model exhausted for today,
   advance `active_index`, and re-spawn the **same range** with the next model.
   On any other failure: stop — do not cascade bad commits.
6. Update `STATE.md` with the finished range, model used, flag notes, and new
   progress. Then go to step 1.
7. When `next-batch.mjs` prints `COMPLETE`: run the final gates, do one
   consistency pass if models were mixed, and push **once** (only when the user
   authorizes it).

## Definition of done
- 1,047/1,047 payloads; `hebrew:check` clean.
- `hebrew:align` ✓ 1,822 translated hymns (375 taranim + 402 book3 + 1047 main).
- `check:hymns` 1,824 pass / 100 % vocalised; `typecheck` clean.
- Meter flags reviewed; deliberate cases recorded in `STATE.md`.
- `PROJECT_NOTES.md` §16 states the final count; Book 1 is the last book.
