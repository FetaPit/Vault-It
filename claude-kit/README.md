# claude-kit

Token-saving defaults for every Claude Code project, plus settings for the Claude app. One install, applies everywhere, safe to re-run, removable.

## What it sets (user level, `~/.claude/`)

| Setting | Effect |
| --- | --- |
| `model: opusplan` | Opus in plan mode, Sonnet for the edits |
| `effortLevel: medium` | No more xhigh on renames. `/effort high` for one session when needed |
| `scout`, `grunt` agents (Haiku, low effort) | Searches and mechanical edits at Haiku prices |
| `architect` agent (Opus, high effort) | Deep explains and refactor plans, read-only |
| Session-start map | Big files (over 800 lines) listed with line-numbered sections, so Claude reads ranges, not whole files. Silent in small repos |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=60` | Auto-compacts at 60% instead of near full |
| `BASH_MAX_OUTPUT_LENGTH=15000` | Caps command output fed back to Claude (default 30k) |
| Status line | `Sonnet 5.5 · ctx 34% /compact soon · 5h 22% · wk 41%` |
| `/caveman`, `/handoff` | Terse replies; save a state note and start fresh |
| CLAUDE.md block | Six lines of token rules, added between markers. The rest of your file is untouched |

Your existing hooks, permissions, agents and skills with the same names are kept. If you already have a status line, it stays. `settings.json` is backed up before every change.

## Install

**Your Mac or PC (once):**
```
curl -fsSL https://raw.githubusercontent.com/FetaPit/Vault-It/Pioneer_v3/claude-kit/install.sh | bash
```
Restart Claude Code. Re-run the same line to update. Remove with `bash ~/.claude/kit/install.sh --uninstall` (puts your old model and effort back).

**Cloud sessions (claude.ai/code, phone):** cloud containers start fresh each time, so add the same line to each environment's setup script (Live Design, Net Worth Tracker, Default Cloud Environment): environment menu in the session title bar, Edit, Setup script.

The kit lives in `claude-kit/` on `Pioneer_v3`, so this address stays the same. Changes to the kit reach you the next time the line runs.

## Claude app (claude.ai, phone, desktop)

The app has no config file, so these are pasted once.

**Settings, Profile, personal preferences** (add under what is already there):
> Short answers, outcome first, no preamble or recap. Don't use extended thinking or Research unless I ask or the task needs it. If a chat drifts to a new topic, tell me to start a new one and give me a 10-line summary to paste in.

**Per chat:** Sonnet by default, Opus for research and planning, Haiku for quick rewrites. Put stable context (brand rules, handovers, tone) in a Project instead of re-pasting it. Edit your last message rather than sending a correction.

## Engineering notes
- **Context size is the big lever.** Every turn re-sends the whole conversation. Prompt caching makes repeat reads cheaper but they still count, and the cache drops after a few idle minutes. Small context beats clever prompts.
- **Switch models at the start of a session, not midway.** A switch drops the prompt cache, so the next turn pays full price for the whole history. `opusplan` switches only at plan boundaries.
- **Caveman prompts save less than you'd think on input.** Your prompt is tiny next to the context. The real win is on output: replies cost about five times more per token than input, which is why `/caveman` targets Claude's replies.
- **Haiku agents need precise briefs.** Give `grunt` the exact change. Anything with judgement goes to the main session.
- Uses Claude Code settings that exist as of October 2026 (`opusplan`, `effortLevel`, agent `effort`, status line `context_window` and `rate_limits` fields). If a future version renames one, the rest still works.
