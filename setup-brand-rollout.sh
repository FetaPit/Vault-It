#!/usr/bin/env bash
# Vault·It brand rollout: one-command setup.
# Run from the ROOT of your local clone of github.com/FetaPit/Vault-It:
#   bash setup-brand-rollout.sh /path/to/vault-it-cutover.zip
# It never touches release/pioneer-v2 (production). It creates branch brand-rollout from Pioneer_v3.
set -euo pipefail

ZIP="${1:-}"
[ -f "$ZIP" ] || { echo "Usage: bash setup-brand-rollout.sh /path/to/vault-it-cutover.zip"; exit 1; }
[ -f wrangler.jsonc ] || [ -d src/hb3d ] || { echo "Run this from the root of the Vault-It repo."; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "You have uncommitted changes. Commit or stash them first."; exit 1; }

echo "1/6 Fetching latest"
git fetch origin

echo "2/6 Switching to Pioneer_v3 and creating brand-rollout"
git checkout Pioneer_v3
git pull --ff-only origin Pioneer_v3
git checkout -b brand-rollout

echo "3/6 Copying the brand package"
TMP="$(mktemp -d)"
unzip -q -o "$ZIP" -d "$TMP"
rm -rf brand
cp -R "$TMP"/vault-it-cutover/brand ./brand
cp "$TMP"/vault-it-cutover/START_HERE.md ./brand/START_HERE.md

echo "4/6 Appending the brand rules to CLAUDE.md (once)"
if ! grep -q "^## Brand rollout" CLAUDE.md; then
  printf "\n" >> CLAUDE.md
  sed '1,/^$/d' brand/CLAUDE_ADDENDUM.md >> CLAUDE.md
fi

echo "5/6 Committing"
git add brand CLAUDE.md
git commit -m "Add brand package and rollout rules"

echo "6/6 Pushing the branch (Cloudflare will build a preview)"
git push -u origin brand-rollout

echo
echo "Done. Branch: brand-rollout (production release/pioneer-v2 is untouched)."
echo "Next: open Claude Code in this repo and paste the first message from brand/START_HERE.md"
