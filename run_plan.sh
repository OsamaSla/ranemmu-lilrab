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

# A session counts as complete only when the status cell of its §3 table row
# says `complete`, `done`, or `[x]`. Anything else (pending, in-progress, …)
# is still outstanding.
row_is_complete() {
  printf '%s\n' "$1" | grep -qiE '\|[[:space:]]*(complete|done|\[x\])[[:space:]]*\|[[:space:]]*$'
}

mapfile -t rows < <(grep -E '^\|[[:space:]]*S[0-9]+[[:space:]]*\|' "$PLAN_FILE")

sessions=()
for row in "${rows[@]}"; do
  if row_is_complete "$row"; then
    continue
  fi
  session=$(printf '%s\n' "$row" | awk -F'|' '{gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2); print $2}')
  [[ -n "$session" ]] && sessions+=("$session")
done

if (( ${#sessions[@]} == 0 )); then
  echo "All sessions in $PLAN_FILE are complete. Nothing to do."
  exit 0
fi

echo "Uncompleted sessions: ${sessions[*]}"

# The list is a fixed snapshot: a child marking its row complete cannot change
# what this run will execute next.
for session in "${sessions[@]}"; do
  echo "============================================================"
  echo "Starting $session — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "============================================================"

  # Non-zero exit from any session stops the whole run immediately.
  if ! opencode run "Read the plan file (content/hebrew/book3/PLAN.md) and execute ONLY Session $session, then mark it complete in the plan file by setting its status cell to 'complete'."; then
    echo "ERROR: Session $session failed. Stopping; remaining sessions not started." >&2
    exit 1
  fi

  # Also stop if the child exited 0 but forgot to mark the row complete.
  row=$(grep -E "^\|[[:space:]]*${session}[[:space:]]*\|" "$PLAN_FILE" || true)
  if [[ -z "$row" ]] || ! row_is_complete "$row"; then
    echo "ERROR: Session $session returned success but was not marked complete in $PLAN_FILE. Stopping." >&2
    exit 1
  fi
  echo "$session marked complete."
done

echo "All remaining sessions completed."
