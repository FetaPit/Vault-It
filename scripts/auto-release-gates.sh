#!/usr/bin/env bash
# Git-side gates for the automatic release. Pure git, no network beyond `git fetch`.
# Usage: scripts/auto-release-gates.sh <full-sha> [production-branch]
# Exit 0 = safe to fast-forward production to <sha>. Exit 3 = already live (nothing to do).
# Any other exit = stop; the message says why. Never forces anything.
set -euo pipefail
SHA="${1:?usage: auto-release-gates.sh <full-sha> [production-branch]}"
PROD="${2:-release/pioneer-v2}"

fail() { echo "GATE FAILED: $*" >&2; exit 1; }

[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || fail "not a full 40-character commit SHA: $SHA"
git cat-file -e "$SHA^{commit}" 2>/dev/null || fail "commit $SHA is not in this clone (run git fetch origin first)"
git rev-parse --verify -q "origin/$PROD" >/dev/null || fail "origin/$PROD not found"
PROD_SHA="$(git rev-parse "origin/$PROD")"

# Already live.
if [ "$PROD_SHA" = "$SHA" ]; then echo "already live: $SHA"; exit 3; fi

# 1. Must sit on a candidate branch (a frozen, CI-checked line), never on a stray branch.
if ! git branch -r --contains "$SHA" | grep -qE '^\s*origin/candidate/'; then
  fail "$SHA is not on any origin/candidate/* branch"
fi

# 2. Must be a plain fast-forward of production, so nothing live is lost and no force is needed.
if ! git merge-base --is-ancestor "origin/$PROD" "$SHA"; then
  fail "$SHA does not contain production ($PROD_SHA): merge production into the candidate first"
fi

# 3. Owner-only changes never ship automatically.
SERVER="$(git diff --name-only "origin/$PROD" "$SHA" -- supabase/ || true)"
[ -z "$SERVER" ] || fail "server-side files changed (migrations or functions need the owner): $(echo "$SERVER" | head -5 | tr '\n' ' ')"
FLOW="$(git diff --name-only "origin/$PROD" "$SHA" -- .github/workflows/ || true)"
[ -z "$FLOW" ] || fail "workflow files changed (a token cannot push these, and they need the owner): $(echo "$FLOW" | head -5 | tr '\n' ' ')"

echo "gates passed: $SHA is a fast-forward of $PROD ($PROD_SHA), $(git rev-list --count "origin/$PROD..$SHA") commits"
