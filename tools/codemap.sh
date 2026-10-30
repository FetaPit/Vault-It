#!/usr/bin/env bash
# Compact project map for Claude: file sizes plus line-numbered section titles
# for the big single-file builds. Lets Claude jump to a line range instead of
# reading 10k-line files whole.
# Usage: bash tools/codemap.sh             (default big files)
#        bash tools/codemap.sh index.html  (one file)
set -euo pipefail
cd "$(dirname "$0")/.."
PY=""; for c in python3 python "py -3"; do $c -c "import sys" >/dev/null 2>&1 && { PY=$c; break; }; done

echo "## Files (lines)"
git ls-files | grep -vE '\.(svg|png|jpg|ico|json)$' | while read -r f; do
  printf '%7s  %s\n' "$(wc -l < "$f")" "$f"
done | sort -rn | head -25

files=("$@")
if [ ${#files[@]} -eq 0 ]; then
  files=(index.html vault-it-3d-engine.js vault-it-brand-handover.md)
fi

for f in "${files[@]}"; do
  [ -f "$f" ] || continue
  echo
  echo "## $f"
  case "$f" in
    *.md) grep -nE '^#{1,2} ' "$f" || true ;;
    *)
      # Section banners: a rule line of ═ then a title line, or "══ TITLE ══" inline.
      [ -n "$PY" ] && $PY - "$f" <<'PYEOF'
import re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
lines = open(sys.argv[1], encoding="utf-8").read().split("\n")
def strip(t):
    return re.sub(r"^[\s/*<>!#-]+|[\s/*<>!#-]+$", "", t.replace("═", ""))
i = 0
while i < len(lines):
    if "═══" in lines[i]:
        t = strip(lines[i])
        if t:
            print(f"{i+1}: {t[:90]}")
        elif i + 1 < len(lines) and strip(lines[i + 1]):
            print(f"{i+2}: {strip(lines[i + 1])[:90]}")
            j = i + 1
            while j < len(lines) and "═══" not in lines[j] and j - i < 8:
                j += 1
            i = j  # skip the closing rule
    i += 1
PYEOF
      # No banners (e.g. the 3D engine)? Fall back to top-level functions and classes.
      if ! grep -q '═══' "$f"; then
        grep -nE '^(export )?(async )?(function|class) [A-Za-z_$]+' "$f" \
          | sed -E 's/\s*[({].*$//' | head -60 || true
      fi
      grep -nE 'id="tab-[a-z]+"' "$f" | sed -E 's/^([0-9]+):.*id="(tab-[a-z]+)".*/\1: [panel] \2/' || true
      ;;
  esac
done
