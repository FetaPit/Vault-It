#!/usr/bin/env bash
# Status line: model, context used, plan limits, and a nudge to /compact.
# Example: Sonnet 5.5 · ctx 34% · 5h 22% · wk 41%
PY=""; for c in python3 python "py -3"; do $c -c "import sys" >/dev/null 2>&1 && { PY=$c; break; }; done
[ -n "$PY" ] || { echo "statusline needs Python 3"; exit 0; }
$PY -c '
import json, sys
sys.stdout.reconfigure(encoding="utf-8")
d = json.load(sys.stdin)
model = (d.get("model") or {}).get("display_name", "?")
ctx = (d.get("context_window") or {}).get("used_percentage")
rl = d.get("rate_limits") or {}
parts = [model]
if ctx is not None:
    ctx = round(ctx)
    tag = "  /compact now" if ctx >= 50 else ("  /compact soon" if ctx >= 35 else "")
    parts.append(f"ctx {ctx}%{tag}")
for key, label in (("five_hour", "5h"), ("seven_day", "wk")):
    pct = (rl.get(key) or {}).get("used_percentage")
    if pct is not None:
        parts.append(f"{label} {round(pct)}%")
print(" · ".join(parts))
'
