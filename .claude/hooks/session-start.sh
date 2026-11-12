#!/bin/bash
# Claude Code cloud sessions: make the test suite runnable straight away (esbuild + a local Postgres for the server and
# migration tests, the repo path the tests expect, Playwright from the image). Runs synchronously so tests never race the install.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
npm install --no-audit --no-fund --loglevel=error

# the tests open file:///home/user/Vault-It/index.html
if [ ! -e /home/user/Vault-It/index.html ]; then
  mkdir -p /home/user && ln -sfn "$PWD" /home/user/Vault-It
fi

# Playwright (and its Chromium) come with the cloud image; do not download another copy
if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -d /usr/local/lib/node_modules_global/playwright ]; then
  echo 'export NODE_PATH=/usr/local/lib/node_modules_global' >> "$CLAUDE_ENV_FILE"
fi
