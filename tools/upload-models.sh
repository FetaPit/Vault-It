#!/usr/bin/env bash
# Upload models/ to Cloudflare R2 (bucket ptlive-assets, served at https://assets.ptlive.design/vault-it/models/).
# Needs: npx wrangler logged in (wrangler login) and R2 enabled on the account.
#   bash tools/upload-models.sh [bucket] [prefix]
set -euo pipefail
cd "$(dirname "$0")/../models"
BUCKET="${1:-ptlive-assets}"
PREFIX="${2:-vault-it/models}"
IMMUTABLE="public, max-age=31536000, immutable"   # filenames are content-hashed, safe to cache forever

put() { npx --yes wrangler r2 object put "$BUCKET/$PREFIX/$1" --file "$1" --content-type "$2" --cache-control "$3" --remote >/dev/null && echo "up  $1"; }

for f in glb/*.glb;    do [ -e "$f" ] && put "$f" model/gltf-binary "$IMMUTABLE"; done
for f in thumb/*.webp; do [ -e "$f" ] && put "$f" image/webp "$IMMUTABLE"; done
# catalogue last, so it never points at files that have not landed; short cache so updates show up quickly
put catalog.json application/json "public, max-age=300"
put CREDITS.md text/markdown "public, max-age=3600"
echo "Done. https://assets.ptlive.design/$PREFIX/catalog.json"
