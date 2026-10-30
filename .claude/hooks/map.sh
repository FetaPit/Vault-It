#!/usr/bin/env bash
# Session start (startup and /clear): a line-numbered map of the big files so
# Claude reads ranges instead of whole files, plus any /handoff note.
# Stdout goes into Claude's context, so keep it small.
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
PY=""; for c in python3 python "py -3"; do $c -c "import sys" >/dev/null 2>&1 && { PY=$c; break; }; done

if [ -n "$PY" ] && [ -f index.html ]; then
  # The embedded 3D engine is build output: point at its sources and leave it off the map.
  s=$(grep -n '<<HB3D_ENGINE' index.html | head -1 | cut -d: -f1)
  e=$(grep -n 'HB3D_ENGINE>>' index.html | head -1 | cut -d: -f1)
  CODEMAP_MAX_ENTRIES=150 $PY tools/codemap.py . index.html src/hb3d/kit.js 2>/dev/null \
    | awk -F: -v s="${s:-0}" -v e="${e:-0}" '
        /^## index.html/ { inidx = 1; print; if (s) print s "-" e ": generated 3D engine. Edit src/hb3d/*, then node tools/build_hb3d.js"; next }
        /^## /           { inidx = 0 }
        !(inidx && $1 + 0 >= s && $1 + 0 <= e)'
fi

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
note="$HOME/.claude/handoffs/$(printf %s "$root" | tr '/\\: ' '----').md"
if [ -s "$note" ]; then
  echo
  echo "# Handoff from last session ($note)"
  cat "$note"
fi
exit 0
