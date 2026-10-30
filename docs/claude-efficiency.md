# Using Claude without burning the weekly limit

Opus is the architect, Sonnet the contractor, Haiku the labourer. Don't pay the architect to swing a hammer.

## Claude Code (set up in this repo)

| What | How it saves | Where |
| --- | --- | --- |
| `opusplan` model | Opus only in plan mode (shift+tab twice). Sonnet does the edits. | `.claude/settings.json` |
| Effort `medium` | Stops xhigh creeping in on small jobs. Bump for one session with `/effort high`. | `.claude/settings.json` |
| Haiku agents | `scout` finds code, `grunt` does renames and find and replace. `architect` (Opus) only for deep reads and plans. | `.claude/agents/` |
| Project map at start | Claude jumps to line ranges in the 10k-line `index.html` instead of reading it whole. Replaces codesight. | `tools/codemap.sh`, SessionStart hook |
| Big-file rules | Never read the big HTML files without a range. | `CLAUDE.md` |
| Auto-compact at 60% | Compacts before the history gets expensive. | `env` in settings |
| Output cap 15k chars | Long command output gets cut, not fed back whole. | `env` in settings |
| Status line | Shows model, context % and plan usage. Says "/compact soon" at 35% and "now" at 50%. | `.claude/statusline.sh` |
| `/caveman` | Terse replies for lookups and reviews. `/caveman off` to stop. | `.claude/skills/caveman` |
| `/handoff` | Saves a 25-line note, then `/clear` or new session. The note loads on its own. | `.claude/skills/handoff` |

### Daily habits
- New task, new session. Don't drag React debugging into a Postgres question.
- `/compact` after an exploration phase, or when the status line says so.
- `/model opus` only for research and planning, then back.
- Caveman prompts for trivial stuff ("check auth middleware. expired token handling. correct?"). Full sentences for anything touching production.
- Optional: install RTK on your Mac (`brew install rtk`, then `rtk init -g`) to compress shell output. CLAUDE.md already tells Claude to use it if present.

## Claude app (claude.ai, phone, desktop)
- Pick the model per chat. Sonnet by default. Opus for research and planning. Haiku for quick rewrites and summaries.
- Turn off extended thinking and Research for simple asks. They cost the most.
- One topic per chat. When a chat gets long, ask "summarise this for a fresh chat in 15 lines", then paste that into a new one.
- Put stable context (brand rules, handover, tone) in a Project's knowledge and instructions. Stop re-pasting it.
- Edit your last message instead of sending a correction. Corrections add turns the model re-reads every time.
- Paste the section, not the whole file.

## Not worth it
Tokeniser hacks, prompt-shortening agents, switching providers mid-task.
