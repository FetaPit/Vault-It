#!/usr/bin/env bash
# claude-kit SessionStart hook (startup and /clear). Stdout goes into Claude's
# context, so it stays small: a map of big files plus any /handoff note.
dir="${CLAUDE_PROJECT_DIR:-$PWD}"
root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null || echo "$dir")

# A project with its own map hook (e.g. Vault-It) prints its own map.
PY=""; for c in python3 python "py -3"; do $c -c "import sys" >/dev/null 2>&1 && { PY=$c; break; }; done
if [ ! -f "$root/.claude/session-start.sh" ] && [ -n "$PY" ]; then
  $PY "$HOME/.claude/kit/codemap.py" "$root" 2>/dev/null | head -150
fi

note="$HOME/.claude/handoffs/$(printf %s "$root" | tr '/\\: ' '----').md"
if [ -s "$note" ]; then
  echo
  echo "# Handoff from last session ($note)"
  cat "$note"
fi
exit 0
