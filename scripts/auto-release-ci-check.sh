#!/usr/bin/env bash
# Reads GitHub check-runs JSON for one commit on stdin; exits 0 only when every required CI job
# has its LATEST run finished with success. Exit 2 = still running or missing (caller may wait).
# Exit 1 = a required job failed. A re-run that passes replaces the earlier failure.
set -euo pipefail
REQUIRED='["Server logic + migrations","Browser tests (1/3)","Browser tests (2/3)","Browser tests (3/3)"]'
jq -r --argjson req "$REQUIRED" '
  .check_runs as $runs
  | [ $req[] as $n
      | ($runs | map(select(.name == $n)) | sort_by(.started_at) | last) as $r
      | { name: $n, state: (if $r == null then "missing"
                            elif $r.status != "completed" then "running"
                            else $r.conclusion end) } ]
  | (map(.state) | unique) as $s
  | (map("\(.name): \(.state)") | join("; ")) as $line
  | if ($s == ["success"]) then "OK " + $line
    elif ($s | any(. == "failure" or . == "cancelled" or . == "timed_out" or . == "action_required")) then "FAIL " + $line
    else "WAIT " + $line end' | {
  read -r verdict rest
  echo "$verdict $rest"
  case "$verdict" in OK) exit 0;; FAIL) exit 1;; *) exit 2;; esac
}
