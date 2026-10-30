# Working with Claude Code on Vault·It for less

Set up in `.claude/` and `CLAUDE.md`. Works in cloud sessions and on a laptop clone.

## What happens on its own
- **Sonnet does the work, Opus plans.** Press Shift+Tab twice for plan mode (Opus). Approve the plan and Sonnet makes the edits.
- **Medium effort** by default. `/effort high` for one hard session; it resets next time.
- **A map of `index.html`** (25k lines) loads at session start, so Claude reads the lines it needs, not the whole file. The generated 3D engine block is left out and points to `src/hb3d/`.
- **Auto-compact at 60%** and command output capped at 15k characters.
- **Status line** shows model, context used and plan limits, and says "/compact soon" at 35%.

## What you type
| Want | Type |
| --- | --- |
| Find something | `use scout to find where the deposit target is set` |
| A simple, exact edit | `use grunt to rename depositTarget to depositGoal in index.html` |
| Understand a part before changing it | `use architect to explain how cloud sync works` |
| Plan a feature | Shift+Tab twice, then describe it |
| Quick questions | `/caveman`, then short prompts. `/caveman off` to stop |
| Context getting big | `/compact` |
| Switching task | `/handoff next: fix the debt tracker`, then a new session |

## Habits
- One task per session. Pick the model at the start, not halfway (a switch re-reads the whole history at full price).
- Short prompts for lookups. Full sentences for anything touching payments, Supabase, prices or saved data.
- Run single tests by name while working; the full suite before a release.
