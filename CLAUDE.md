# Vault·It: notes for Claude

Kept short on purpose. This file loads on every turn.

## Big files: never read whole
- `index.html` (10k lines), `Vault-It_v0.3_Alpha.html` (9k, legacy build, ignore unless asked) and `vault-it-brand-book.html` (2k) are huge.
- A section map with line numbers is added at session start. If it is missing, run `bash tools/codemap.sh`.
- Find the spot with the map or Grep, then Read with `offset`/`limit`. Never Read these without a range.

## Keep output small
- Trim command output: `| tail -40`, `| grep`, `--quiet`. If `rtk` is installed, prefix noisy commands with it (`rtk git log`, `rtk npm test`).
- Replies: outcome first, a few lines. Show line refs or a short diff, not whole files. Do not repeat the plan back.

## Who does what
- Plan mode runs on Opus, everything else on Sonnet (`opusplan`). Use plan mode for research, plans and big refactors.
- `scout` agent (Haiku): find code and return line ranges. Use it for wide searches.
- `grunt` agent (Haiku): mechanical edits like renames, token swaps, find and replace.
- `architect` agent (Opus): explain a subsystem or plan a deep refactor. Read-only.

## Repo rules
- Brand rollout rules: `CLAUDE_ADDENDUM.md`. Brief: `vault-it-brand-handover.md` (use the map to jump to a section).
- British English, sentence case, no em dashes.
