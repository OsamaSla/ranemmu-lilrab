#!/usr/bin/env bash
# Drive the remaining Hebrew Book 3 sessions one at a time.
# Each session runs as a fresh, isolated `opencode run` so it starts with a
# clean context and exits when done; nothing is carried between sessions.
set -euo pipefail

# Always work from the repo root, regardless of where the script is invoked.
cd "$(dirname "$0")"

PLAN_FILE="content/hebrew/book3/PLAN.md"

if [[ ! -f "$PLAN_FILE" ]]; then
  echo "ERROR: plan file not found: $PLAN_FILE" >&2
  exit 1
fi

if ! command -v opencode >/dev/null 2>&1; then
  echo "ERROR: opencode CLI not found on PATH." >&2
  exit 1
fi

# The global config's default model (anthropic/claude-3-7-sonnet) no longer
# exists, the `opencode/*` models reject headless credentials on this machine,
# and google/gemini-2.5-flash exhausted its free-tier daily quota mid-S4.
# Pin a model verified to work with `opencode run`; override with
# OPENCODE_PLAN_MODEL if the account/credentials change.
MODEL="${OPENCODE_PLAN_MODEL:-alibaba/qwen3.5-flash}"

# A session counts as complete only when the status cell of its §3 table row
# says `complete`, `done`, or `[x]`. Anything else (pending, in-progress, …)
# is still outstanding.
row_is_complete() {
  printf '%s\n' "$1" | grep -qiE '\|[[:space:]]*(complete|done|\[x\])[[:space:]]*\|[[:space:]]*$'
}

# Current number of Book 3 hymns with Hebrew payloads, from the progress tool.
book3_done() {
  node scripts/hebrew-progress.mjs | awk '$1 == "book3" { print $3 }'
}

# Last hymn number of a session's range (b30350 -> 350).
session_end() {
  local range n
  range=$(printf '%s\n' "$1" | awk -F'|' '{gsub(/^[[:space:]]+|[[:space:]]+$/, "", $5); print $5}')
  n=$(printf '%s\n' "$range" | grep -oE '[0-9]+$')
  echo $(( 10#$n % 1000 ))
}

mapfile -t rows < <(grep -E '^\|[[:space:]]*S[0-9]+[[:space:]]*\|' "$PLAN_FILE")

sessions=()
session_rows=()
for row in "${rows[@]}"; do
  if row_is_complete "$row"; then
    continue
  fi
  session=$(printf '%s\n' "$row" | awk -F'|' '{gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2); print $2}')
  if [[ -n "$session" ]]; then
    sessions+=("$session")
    session_rows+=("$row")
  fi
done

if (( ${#sessions[@]} == 0 )); then
  echo "All sessions in $PLAN_FILE are complete. Nothing to do."
  exit 0
fi

echo "Uncompleted sessions: ${sessions[*]}"

# The list is a fixed snapshot: a child marking its row complete cannot change
# what this run will execute next.
for i in "${!sessions[@]}"; do
  session="${sessions[$i]}"
  row="${session_rows[$i]}"
  before=$(book3_done)
  end=$(session_end "$row")
  required=$(( end - before ))
  if (( required <= 0 )); then
    echo "ERROR: $session's range ends at $end but progress is already $before — plan/state inconsistent. Stopping." >&2
    exit 1
  fi

  echo "============================================================"
  echo "Starting $session — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "  progress $before -> $end (expect +$required hymns)"
  echo "============================================================"

  # Non-zero exit from any session stops the whole run immediately.
  prompt="Read content/hebrew/book3/PLAN.md, STATE.md and content/hebrew/glossary.md, then execute ONLY Session $session (all of its remaining batches) end to end. This is an unattended headless run: the question tool is denied, so never stop to ask — decide from those files and continue. Author the Hebrew yourself (no generator, no placeholders), run every gate, commit the work, and only then mark the session complete in the plan file by setting its status cell to 'complete'. Verify with node scripts/hebrew-progress.mjs before marking."
  if ! opencode run -m "$MODEL" "$prompt"; then
    echo "ERROR: Session $session failed. Stopping; remaining sessions not started." >&2
    exit 1
  fi

  # A marker alone is not enough: the corpus must actually have advanced.
  # A stalled child that marked itself complete without doing the work is the
  # exact failure this guards against.
  after=$(book3_done)
  row=$(grep -E "^\|[[:space:]]*${session}[[:space:]]*\|" "$PLAN_FILE" || true)
  if [[ -z "$row" ]] || ! row_is_complete "$row"; then
    echo "ERROR: Session $session returned success but was not marked complete in $PLAN_FILE. Stopping." >&2
    exit 1
  fi
  if (( after - before < required )); then
    echo "ERROR: Session $session was marked complete but progress only went $before -> $after (expected at least $end). Stopping." >&2
    exit 1
  fi
  echo "$session complete — progress $before -> $after."
done

echo "All remaining sessions completed."
