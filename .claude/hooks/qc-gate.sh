#!/bin/bash
# PreToolUse gate on Bash: a `git commit` that includes app code needs a rollout-qc PASS for exactly the staged change.
# App code = index.html, landing.html, recover.html, sw.js, manifest, src/, site/, worker/, supabase/.
# Visual surfaces (landing.html, site/, src/hb3d/, brand/, marketing/) also need a creative-director PASS (shots/qc/CD_PASS).
# Docs, tests, tools and queue-only commits pass straight through. Exit 2 blocks the call and shows the reason to Claude.
input=$(cat)
# Windows often has no python3 (or only the Store stub): try python and py -3, else read the raw JSON so the gate never fails open
PY=""; for c in python3 python "py -3"; do $c -c "import json" >/dev/null 2>&1 && { PY=$c; break; }; done
if [ -n "$PY" ]; then
  cmd=$(printf '%s' "$input" | $PY -c 'import json,sys
try: print(json.load(sys.stdin).get("tool_input",{}).get("command",""))
except Exception: print("")' 2>/dev/null)
else cmd=$(printf '%s' "$input" | sed 's/\\"/"/g'); fi
printf '%s' "$cmd" | grep -qE '(^|[;&| "])git( -C [^ ]+)? commit\b' || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
staged=$(git diff --cached --name-only 2>/dev/null)
want=$(git diff --cached --binary | sha256sum | cut -d' ' -f1)
# Creative gate: visual surfaces also need a creative-director PASS for exactly the staged change.
# The owner can waive it for one commit; the main session then writes CD_OVERRIDE=owner before git commit and says so in the commit body.
vis=$(printf '%s\n' "$staged" | grep -E '^(landing\.html|site/|src/hb3d/|brand/|marketing/)')
if [ -n "$vis" ] && ! printf '%s' "$cmd" | grep -q 'CD_OVERRIDE=owner'; then
  if [ "$want" != "$(cat shots/qc/CD_PASS 2>/dev/null)" ]; then
    echo "Creative gate: the staged visual change ($(echo "$vis" | wc -l) file(s)) has no creative-director PASS, or it changed after review. Run the creative-director agent in REVIEW mode on the staged change (ship-item step 4), then commit." >&2
    exit 2
  fi
fi
app=$(printf '%s\n' "$staged" | grep -E '^(index\.html|landing\.html|recover\.html|sw\.js|manifest\.webmanifest|src/|site/|worker/|supabase/)')
[ -z "$app" ] && exit 0
if printf '%s' "$cmd" | grep -qE ' (-a|--all|-am)\b'; then
  echo "QC gate: commit without -a. Stage the files, run rollout-qc on the staged change, then commit." >&2; exit 2
fi
have=$(cat shots/qc/QC_PASS 2>/dev/null)
if [ "$want" != "$have" ]; then
  echo "QC gate: the staged app change ($(echo "$app" | wc -l) file(s)) has no rollout-qc PASS, or it changed after QC. Run the ship-item skill step 4 (rollout-qc agent) on the staged change, then commit." >&2
  exit 2
fi
exit 0
