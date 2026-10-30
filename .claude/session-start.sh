#!/usr/bin/env bash
# Runs at session start and after /clear. Stdout goes into Claude's context,
# so keep it small: the project map plus any handoff note from /handoff.
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

echo "# Project map (line numbers). Read big files by range only."
bash tools/codemap.sh 2>/dev/null || echo "(codemap failed; run bash tools/codemap.sh)"

note="$HOME/.claude/handoffs/$(pwd | tr / -).md"
if [ -s "$note" ]; then
  echo
  echo "# Handoff from last session ($note)"
  cat "$note"
fi
