#!/bin/bash
# PreToolUse gate on Bash: a `git commit` that includes app code needs a rollout-qc PASS for exactly the staged change.
# App code = index.html, landing.html, recover.html, sw.js, manifest, src/, site/, worker/, supabase/.
# Docs, tests, tools and queue-only commits pass straight through. Exit 2 blocks the call and shows the reason to Claude.
input=$(cat)
cmd=$(printf '%s' "$input" | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("tool_input",{}).get("command",""))
except Exception: print("")' 2>/dev/null)
printf '%s' "$cmd" | grep -qE '(^|[;&| ])git( -C [^ ]+)? commit\b' || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
app=$(git diff --cached --name-only 2>/dev/null | grep -E '^(index\.html|landing\.html|recover\.html|sw\.js|manifest\.webmanifest|src/|site/|worker/|supabase/)')
[ -z "$app" ] && exit 0
if printf '%s' "$cmd" | grep -qE ' (-a|--all|-am)\b'; then
  echo "QC gate: commit without -a. Stage the files, run rollout-qc on the staged change, then commit." >&2; exit 2
fi
want=$(git diff --cached --binary | sha256sum | cut -d' ' -f1)
have=$(cat shots/qc/QC_PASS 2>/dev/null)
if [ "$want" != "$have" ]; then
  echo "QC gate: the staged app change ($(echo "$app" | wc -l) file(s)) has no rollout-qc PASS, or it changed after QC. Run the ship-item skill step 4 (rollout-qc agent) on the staged change, then commit." >&2
  exit 2
fi
exit 0
