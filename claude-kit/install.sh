#!/usr/bin/env bash
# claude-kit installer: token-saving defaults for Claude Code, for every project.
#
#   Install or update:  curl -fsSL https://raw.githubusercontent.com/FetaPit/Vault-It/<ref>/claude-kit/install.sh | bash
#   From a checkout:    bash claude-kit/install.sh
#   Uninstall:          bash ~/.claude/kit/install.sh --uninstall
#
# Safe to re-run. Backs up ~/.claude/settings.json first, merges instead of
# overwriting, and never replaces an agent, skill or CLAUDE.md section it did
# not install. Needs bash and Python 3. On Windows, run it in Git Bash.
set -euo pipefail

REF="${CLAUDE_KIT_REF:-Pioneer_v3}"
REPO="FetaPit/Vault-It"
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
KIT="$CLAUDE_DIR/kit"
MARK="<!-- claude-kit -->"
MODE="${1:-install}"

# python3 on Mac/Linux, python or py on Windows (skips the Microsoft Store stub).
PY=""; for c in python3 python "py -3"; do $c -c "import sys" >/dev/null 2>&1 && { PY=$c; break; }; done
[ -n "$PY" ] || { echo "claude-kit needs Python 3 (Windows: winget install -e --id Python.Python.3.13)" >&2; exit 1; }
mkdir -p "$CLAUDE_DIR"

# Find the kit files: next to this script, or download them.
src=""
self="${BASH_SOURCE[0]:-}"
if [ -n "$self" ] && [ -d "$(dirname "$self")/home" ]; then
  src="$(cd "$(dirname "$self")" && pwd)"
elif [ "$MODE" != "--uninstall" ]; then
  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$REF" | tar -xz -C "$tmp"
  src=$(find "$tmp" -maxdepth 2 -type d -name claude-kit | head -1)
  [ -d "$src/home" ] || { echo "claude-kit: download failed" >&2; exit 1; }
fi

# Copy a file unless a non-kit file with the same name is already there.
place() {
  local from="$1" to="$2"
  if [ -f "$to" ] && ! grep -qF "$MARK" "$to"; then
    echo "  skip $to (yours, not the kit's)"
    return
  fi
  mkdir -p "$(dirname "$to")"
  cp "$from" "$to"
}

# Settings merge / unmerge. Previous model and effort are saved for uninstall.
settings() {
  $PY - "$CLAUDE_DIR/settings.json" "$KIT/prev.json" "$1" <<'PY'
import json, os, shutil, sys, time
path, prev_path, mode = sys.argv[1:4]
cfg = {}
if os.path.exists(path):
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    shutil.copy(path, f"{path}.bak-{time.strftime('%Y%m%d-%H%M%S')}")

HOOK = "$HOME/.claude/kit/session-start.sh"
STATUS = "bash \"$HOME/.claude/kit/statusline.sh\""
ENV = {"CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "60", "BASH_MAX_OUTPUT_LENGTH": "15000"}
WANT = {"model": "opusplan", "effortLevel": "medium"}

def ours(entry):
    return any("kit/session-start.sh" in h.get("command", "") for h in entry.get("hooks", []))

starts = cfg.setdefault("hooks", {}).setdefault("SessionStart", [])
if mode == "install":
    if not os.path.exists(prev_path):
        with open(prev_path, "w", encoding="utf-8") as f:
            json.dump({k: cfg.get(k) for k in WANT}, f)
    cfg.update(WANT)
    cfg.setdefault("env", {}).update(ENV)
    if "statusLine" not in cfg:
        cfg["statusLine"] = {"type": "command", "command": STATUS}
    if not any(ours(e) for e in starts):
        starts.append({"matcher": "startup|clear",
                       "hooks": [{"type": "command", "command": f"bash \"{HOOK}\"", "timeout": 20}]})
else:
    prev = json.load(open(prev_path, encoding="utf-8")) if os.path.exists(prev_path) else {}
    for k in WANT:
        if prev.get(k) is None:
            cfg.pop(k, None)
        else:
            cfg[k] = prev[k]
    for k in ENV:
        cfg.get("env", {}).pop(k, None)
    if cfg.get("statusLine", {}).get("command") == STATUS:
        cfg.pop("statusLine")
    starts[:] = [e for e in starts if not ours(e)]
for key in ("env",):
    if cfg.get(key) == {}:
        cfg.pop(key)
if not starts:
    cfg["hooks"].pop("SessionStart")
if not cfg["hooks"]:
    cfg.pop("hooks")
with open(path, "w", encoding="utf-8") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")
PY
}

# Add or remove the kit's block in the user CLAUDE.md, leaving the rest alone.
claude_md() {
  $PY - "$CLAUDE_DIR/CLAUDE.md" "${1:-}" <<'PY'
import os, re, sys
path, block_file = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
text = re.sub(r"\n*<!-- claude-kit:start -->.*?<!-- claude-kit:end -->\n?", "\n", text, flags=re.S).strip()
if block_file:
    text = (text + "\n\n" if text else "") + open(block_file, encoding="utf-8").read().strip()
open(path, "w", encoding="utf-8").write(text + "\n" if text else "")
PY
}

if [ "$MODE" = "--uninstall" ]; then
  settings uninstall
  claude_md ""
  for f in "$CLAUDE_DIR"/agents/{scout,grunt,architect}.md "$CLAUDE_DIR"/skills/{caveman,handoff}/SKILL.md; do
    [ -f "$f" ] && grep -qF "$MARK" "$f" && rm "$f"
  done
  rmdir "$CLAUDE_DIR"/skills/{caveman,handoff} 2>/dev/null || true
  rm -rf "$KIT"
  echo "claude-kit removed. Settings backup is next to settings.json."
  exit 0
fi

echo "Installing claude-kit into $CLAUDE_DIR"
mkdir -p "$KIT"
cp "$src"/home/kit/* "$KIT"/
cp "$src/install.sh" "$KIT/install.sh"
chmod +x "$KIT"/*.sh "$KIT"/*.py
for a in "$src"/home/agents/*.md; do place "$a" "$CLAUDE_DIR/agents/$(basename "$a")"; done
for s in "$src"/home/skills/*/SKILL.md; do
  place "$s" "$CLAUDE_DIR/skills/$(basename "$(dirname "$s")")/SKILL.md"
done
claude_md "$src/home/CLAUDE.md"
settings install
echo "Done: opusplan, medium effort, Haiku scout/grunt, Opus architect, /caveman, /handoff,"
echo "      big-file map at session start, auto-compact at 60%, status line. Restart Claude Code."
