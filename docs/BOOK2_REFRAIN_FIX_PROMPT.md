# Prompt for a fresh session — fix Book 2 (ترنيمات روحية) refrains

Copy this whole file into a new session as the first message.

---

You are continuing work on `ranemmu-lilrab`. Read `PROJECT_NOTES.md` §8/§9 and
§15, then `content/hebrew/glossary.md`, then this file. Do not read all of
`PROJECT_NOTES.md` at once if context is tight.

## Goal
The owner says that in a previous session they supplied a **list of Book 2
hymns with a refrain, and where the refrain belongs (stanza 1 or stanza 2)**,
based on the Android app «ترنيمات روحية». That list was never persisted in this
repo and is gone with the old session. The owner's example: **hymn 132** must
have its refrain as/near the first stanza. Nothing across the 375 hymns should
be guessed — the owner does not want to re-check the whole book by hand.

## Current verified state (do not re-derive unless the data changed)
- `content/taranim.json`: 375 hymns; **30** have a flagged refrain stanza
  (`chorus: true`): 315, 318, 323, 326, 332, 333, 334, 337, 338, 342, 343,
  344, 350, 351, 353, 357, 358, 359, 360, 362, 363, 364, 366, 368, 369, 370,
  371, 372, 373, 374. Those were done by `532d6eea` and must not be touched.
- Of those, **318, 362, 364** deliberately keep the refrain at stanza index 0;
  the rest use `move` (order `1, القرار, 2, 3…`).
- Every stanza labelled `القرار`/`قرار` in the current corpus is already
  flagged; there are **0 unflagged refrain-labelled stanzas** and **0 unflagged
  repeated stanzas**.
- `tr0132` currently has **no** `chorus` field and **no** flagged stanza (4
  plain stanzas, labels 1–4). Confirm with the owner which stanza is the
  refrain and whether it stays first (`keep`) or moves below stanza 2 (`move`).
- Book 2 has no `chorus_en` / `chorus_de` / `chorus_he` fields. The reader now
  falls back to `t('reader.refrain')` for such books, so once a stanza is
  flagged its red heading will read `القرار · Refrain` / `Kehrvers`.

## First action — talk to the owner
Ask them to re-paste the list (number + `1`/`2` target from the Android app).
Do **not** start editing until you have it. If they can only give part of it,
apply only that part and record clearly what remains.

## Then apply
1. Translate each target into a spec for `scripts/refrain-batch.mjs`:
   - refrain stays first → `NNN:keep`
   - refrain below stanza 2 → `NNN:move`
   Example: `node scripts/refrain-batch.mjs 132:keep 140:move …`
   The script refuses any hymn that already has a refrain, so exclude the 30
   listed above. It reorders and relabels `verses`, `verses_en`, `verses_de`.
2. **Important gap:** `scripts/refrain-batch.mjs` does **not** touch
   `verses_he`, but all 375 Book 2 hymns have Hebrew payloads in
   `content/hebrew/taranim/NNNN.json`. Add `'verses_he'` to its `LANGS` array
   (after verifying each target payload has the same stanza count), or write a
   one-off script that reorders/relabels `verses_he` identically. Otherwise
   `hebrew:align` will fail and the Hebrew lines will follow the wrong stanza.
3. Stanza labels and refrain flags are data copied from the Arabic at merge
   time; never retype them by hand in the Hebrew payloads beyond reordering.

## Gates — all must pass
```
npm run hebrew:check
npm run hebrew:align          # must stay ✓ 1824 translated hymns
npm run check:hymns           # 1824, 100 % vocalised
npm run build:corpus
npm run typecheck
git diff --exit-code -- assets/hymns src/data/generated-chunks.ts
```
Rebuild the corpus after the data edit — the app reads `assets/hymns`, not
`content/taranim.json`.

## Commit and notes
Stage `content/taranim.json`, `content/hebrew/taranim/`, `assets/hymns`, and
the script change if any; commit per batch. Record the recovered list, the
`keep`/`move` decisions, and before/after stanza order in
`content/hebrew/taranim/STATE.md` and `PROJECT_NOTES.md` §8/§9 so it is never
lost again. **Do not push** without explicit owner authorization.

## Definition of done
- Every hymn from the owner's list has `chorus: true` on the correct stanza,
  with labels `القرار` / `1, 2, 3…` and EN/DE/HE grids reordered to match.
- The 30 previously-fixed hymns are untouched.
- All gates above are green; the diff gate is clean with rebuilt assets staged.
