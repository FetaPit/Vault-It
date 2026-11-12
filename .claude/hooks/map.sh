#!/usr/bin/env bash
# Session start (startup and /clear): a line-numbered map of the big files so
# Claude reads ranges instead of whole files, plus any /handoff note.
# Stdout goes into Claude's context, so keep it small.
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
PY=""; for c in python3 python "py -3"; do $c -c "import sys" >/dev/null 2>&1 && { PY=$c; break; }; done

if [ -f src/app/manifest.json ] && command -v node >/dev/null 2>&1; then
  # index.html is build output (docs/APP_SOURCE.md): map the parts instead, and never edit or Read index.html itself.
  echo "# index.html is built from src/app: edit the parts, run node tools/build_app.js, commit both. Grep src/app, not index.html."
  echo "# The 3D engine part (src/app/hb3d/engine.generated.html) is generated: edit src/hb3d/*, then node tools/build_hb3d.js."
  node tools/build_app.js --map 2>/dev/null
  if [ -n "$PY" ]; then
    big=$(for f in $(find src/app -name '*.*' ! -name 'engine.generated.html' ! -name 'manifest.json'); do [ "$(wc -l < "$f")" -gt 800 ] && echo "$f"; done)
    [ -n "$big" ] && CODEMAP_MAX_ENTRIES=60 $PY tools/codemap.py . $big src/hb3d/kit.js 2>/dev/null
  fi
fi

root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
note="$HOME/.claude/handoffs/$(printf %s "$root" | tr '/\\: ' '----').md"
if [ -s "$note" ]; then
  echo
  echo "# Handoff from last session ($note)"
  cat "$note"
fi
exit 0
