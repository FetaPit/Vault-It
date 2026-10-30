#!/bin/bash
# Run the Vault-It test suite.
#
#   scripts/run-tests.sh [all|server|browser|<test name>...]
#
#   server   node-only tests: edge-function logic, SQL migrations on a local Postgres, 3D kit scale
#   browser  Playwright tests (need Chromium), the page crawl and the XSS checks
#   all      both (default)
#   <name>   one or more tests by file name, e.g. test_roadmap test_pin_server
#
# Environment:  JOBS=2 (parallel tests)   SHARD=1/3 (run every 3rd browser test, offset 1)   LOG_DIR=/tmp/vaultit-test-logs
#
# A test passes when it exits 0 and prints no FAIL line (several tests print "FAILURES n" yet exit 0, so the exit code alone is not enough).
# Anything that fails is re-run once on its own: timing-sensitive tests (test_sync, test_cut, test_hb3d_app) can fail when
# many browsers run at once. A pass on the re-run is reported as FLAKY and does not fail the run.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
JOBS="${JOBS:-2}"
LOG_DIR="${LOG_DIR:-${TMPDIR:-/tmp}/vaultit-test-logs}"
mkdir -p "$LOG_DIR"

# the tests open file:///home/user/Vault-It/index.html: make that path exist when the repo lives elsewhere (CI, other machines)
if [ "$ROOT" != "/home/user/Vault-It" ] && [ ! -e /home/user/Vault-It/index.html ]; then
  (mkdir -p /home/user 2>/dev/null && ln -sfn "$ROOT" /home/user/Vault-It) 2>/dev/null \
    || (sudo mkdir -p /home/user && sudo ln -sfn "$ROOT" /home/user/Vault-It) 2>/dev/null \
    || { echo "Cannot make /home/user/Vault-It point at $ROOT — the tests expect the repo there." >&2; exit 2; }
fi
if [ "$(cd /home/user/Vault-It 2>/dev/null && pwd -P)" != "$(pwd -P)" ]; then echo "Note: the tests open /home/user/Vault-It/index.html, which is $(cd /home/user/Vault-It && pwd -P), not this checkout ($(pwd -P))." >&2; fi
# Playwright may be installed globally (Claude Code cloud sessions) rather than in node_modules
if [ -z "${NODE_PATH:-}" ] && [ -d /usr/local/lib/node_modules_global/playwright ]; then export NODE_PATH=/usr/local/lib/node_modules_global; fi

mkdir -p "$ROOT/shots/hb3d"   # screenshots are build output (not committed)
all_tests() { ls tests/test_*.js tests/test_*.mjs tests/crawl.js tests/xss.js tests/xss_attr.js tests/xss2.js 2>/dev/null; }
is_browser() { grep -qE "require\(['\"]playwright['\"]\)|from ['\"]playwright['\"]" "$1"; }

pick() {   # $1 = server|browser|all
  local f
  for f in $(all_tests); do
    case "$1" in
      all) echo "$f" ;;
      server) is_browser "$f" || echo "$f" ;;
      browser) is_browser "$f" && echo "$f" ;;
    esac
  done
}

MODE="${1:-all}"; shift || true
case "$MODE" in
  all|server|browser) TESTS="$(pick "$MODE")" ;;
  list) pick all; exit 0 ;;
  *) TESTS=""; for n in "$MODE" "$@"; do n="${n%.js}"; n="${n%.mjs}"; found=""; for ext in js mjs; do [ -f "tests/$n.$ext" ] && { TESTS="$TESTS tests/$n.$ext"; found=1; }; done; [ -z "$found" ] && { echo "No such test: $n (try: bash scripts/run-tests.sh list)" >&2; exit 2; }; done ;;
esac

if [ -n "${SHARD:-}" ]; then   # e.g. 2/3 → every third test starting at the 2nd
  idx="${SHARD%/*}"; of="${SHARD#*/}"; i=0; picked=""
  for t in $TESTS; do i=$((i+1)); [ $(( (i-1) % of + 1 )) -eq "$idx" ] && picked="$picked $t"; done
  TESTS="$picked"
fi
[ -z "${TESTS// /}" ] && { echo "No tests selected."; exit 2; }

run_one() {   # prints "name PASS|FAIL reason"
  local t="$1" n; n="$(basename "$t")"; n="${n%.*}"
  local log="$LOG_DIR/$n.log" rc
  timeout "${TEST_TIMEOUT:-900}" node "$t" > "$log" 2>&1; rc=$?
  if [ $rc -ne 0 ]; then echo "$n FAIL exit=$rc"; return; fi
  if grep -qE "^FAIL|FAILURES|[0-9]+ FAILED|problems=[1-9]|XSS executed: [1-9]|injected <img> elements in DOM: [1-9]|^errors \[[^]]" "$log"; then
    echo "$n FAIL $(grep -m1 -E '^FAIL|FAILURES|[0-9]+ FAILED|problems=[1-9]|XSS executed: [1-9]|^errors \[[^]]' "$log" | cut -c1-110)"; return
  fi
  echo "$n PASS"
}
export -f run_one; export LOG_DIR

echo "Running $(echo $TESTS | wc -w) test file(s), $JOBS at a time (logs in $LOG_DIR)"
RESULTS="$(echo $TESTS | tr ' ' '\n' | xargs -P "$JOBS" -I{} bash -c 'run_one {}' | sort)"

FINAL_FAIL=0; FLAKY=""
while read -r name status rest; do
  [ -z "$name" ] && continue
  if [ "$status" = "PASS" ]; then echo "  ok     $name"; continue; fi
  cp "$LOG_DIR/$name.log" "$LOG_DIR/$name.attempt1.log" 2>/dev/null
  echo "  FAIL   $name — $rest   (re-running alone…)"
  grep -E "^FAIL" "$LOG_DIR/$name.attempt1.log" | head -3 | cut -c1-200 | sed 's/^/         first attempt: /'
  t="$(ls tests/$name.js tests/$name.mjs 2>/dev/null | head -1)"
  again="$(run_one "$t")"
  if [ "${again#* }" = "PASS" ]; then echo "  FLAKY  $name — passed on its own"; FLAKY="$FLAKY $name"
  else
    echo "  FAILED $name — ${again#* FAIL }  (log: $LOG_DIR/$name.log)"; FINAL_FAIL=$((FINAL_FAIL+1))
    echo "  ----- last lines of $name.log -----"; grep -E "^FAIL|^ok|Error|error" "$LOG_DIR/$name.log" | tail -${FAIL_LINES:-25} | cut -c1-220 | sed 's/^/  | /'; echo "  -----"
  fi
done <<< "$RESULTS"

echo
[ -n "$FLAKY" ] && echo "Flaky under load (passed on re-run):$FLAKY"
if [ $FINAL_FAIL -gt 0 ]; then echo "$FINAL_FAIL test file(s) FAILED"; exit 1; fi
echo "ALL PASSED"
