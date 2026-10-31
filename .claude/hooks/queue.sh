#!/bin/bash
# Prints the open work queue (docs/QUEUE.md) so no instructed task is skipped. Runs at session start and on every
# prompt (short form). Reads only; never fails the session.
Q="${CLAUDE_PROJECT_DIR:-$(pwd)}/docs/QUEUE.md"
[ -f "$Q" ] || exit 0
MODE="${1:-start}"
open=$(awk '/^## Open/{f=1;next} /^## /{f=0} f && /^- \[[ ~]\]/' "$Q")
n=$(printf '%s\n' "$open" | grep -c '^- ' || true)
[ "$n" -gt 0 ] || { echo "Queue (docs/QUEUE.md): nothing open."; exit 0; }
if [ "$MODE" = "prompt" ]; then
  echo "Queue check (docs/QUEUE.md, $n open, owner's order; a new ask goes on the list this turn, after the open items unless the owner reorders):"
  # Titles only on every prompt (full text is in the file and printed at session start)
  printf '%s\n' "$open" | head -3 | sed 's/ (instructed.*//; s/^/  /' | cut -c1-160
  [ "$n" -gt 3 ] && echo "  ... and $((n-3)) more"
else
  echo "WORK QUEUE (docs/QUEUE.md): $n open item(s), in the owner's order. Do them top to bottom; add every new request to the file before starting it."
  printf '%s\n' "$open" | sed 's/^/  /'
fi
exit 0
