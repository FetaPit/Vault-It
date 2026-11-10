# Working with Claude on Vault-It for less

Rules for every Claude session on this repo (cloud or laptop), and the owner's side of the same deal. The aim is fewer tokens for the same product: no test, screenshot, check or rule below is skipped to save tokens. `CLAUDE.md` carries the short form; this file is the full version.

Why it matters: every turn re-sends the whole conversation. A session sitting at 150k tokens of context pays about three times as much per step as one at 50k, so the biggest savings come from keeping sessions small and focused, not from shorter replies.

## 1. The big levers, in order

1. **Right model for the session.** Cloud sessions run the model picked when the session is created; the `opusplan` setting in `.claude/settings.json` only applies to the CLI on a laptop. Start build sessions on Sonnet. Use Opus for planning, the 3D engine, money logic and hard bugs. In the CLI, `/model opusplan` at the start gives Opus in plan mode and Sonnet for edits. Never switch model halfway: the switch re-reads the whole history at the new price.
2. **One item per fresh session, started from a written brief.** Give the session the queue item number and its brief (`docs/ROUND3_BRIEF.md` is the pattern), not a re-telling. Finish with `/handoff` and start the next item fresh. A finished item never stays in context while the next one is built.
3. **Independent items run in parallel sessions,** each on its own branch off `brand-rollout`, each starting small. Only for items that touch different parts of `index.html` (for example the ledger and the footer); merge one at a time and re-run the named tests after each merge.
4. **Switch off connectors and plugins a coding session does not use** (owner, in claude.ai settings; they are synced from the account, not set in this repo). Every request carries their tool and skill names, about 10k to 15k tokens, and many fail to connect from the sandbox anyway. Keep: GitHub, Supabase, Cloudflare, Stripe, Exa. Off for coding: marketing, small-business, product-management, data, design, content-studio, Canva, Figma, Kit, Notion, Sanity, Sentry, Atlassian, Crypto.com, PostHog, Gmail, Calendar, Drive. Turn them back on for a marketing or admin session.
5. **CI runs the full suite, the session runs the named tests.** While building, run only the tests for what changed (`bash scripts/run-tests.sh test_x test_y`). For the full suite, push the branch and read the result with `mcp__github__actions_list` and `mcp__github__get_job_logs` (already allowed in settings), opening only the failing job's log. A release still needs the full suite green on the exact commit being released, plus the owner's phone check.
6. **Screenshots: crop, and send rather than view.** Shoot the element that changed (`locator.screenshot()`), not the full page, at the required 390 and 1100 px in Night and Daylight. Every image Claude opens costs about 1,000 to 1,600 tokens and stays in context, so open only the ones needed to judge the change; send the full set to the owner with `SendUserFile`.

## 2. Reading code

- `index.html` is about 25k lines. Use the session-start map, then `Grep`, then `Read` with `offset`/`limit` (200 lines or fewer). Never read it, `Vault-It_v0.3_Alpha.html` or `brand/vault-it-brand-book.html` whole.
- Don't re-read a file you have just edited; the edit tool reports failure.
- Wide searches go to `scout` (Haiku) and come back as file and line ranges. Exact mechanical edits go to `grunt` (Haiku). `architect` (Opus) only for real design work.
- The block between `<<HB3D_ENGINE` and `HB3D_ENGINE>>` is generated: grep `src/hb3d/*` instead.

## 3. Command output

- Trim everything: `| tail -40`, `| grep`, `cut -c1-200`, `git log --oneline -5`, `--quiet`. Output is capped at 15k characters, but most commands need under 2k.
- Test logs stay in `/tmp/vaultit-test-logs`; read only the lines of a failing test (`grep -E "^FAIL|Error" log | tail -20`).
- `rtk` is not installed in the cloud image; use it on a laptop if present.

## 4. Conversation

- In cloud sessions `/handoff` notes live in the container's home folder and are lost when it is reclaimed. The queue item's progress line ("Next: ...") and the commit body are the handoff that survives.

- Replies: outcome first, short, line references rather than code dumps.
- Batch the owner's decisions into one `AskUserQuestion` early in the item, not one question per turn later.
- Owner: point at queue items by number ("Round 3 item 8") and paste screenshots only when they show something the text cannot.
- `/compact` when the status line says 35%; auto-compact runs at 60%. `/caveman` for quick lookups.
- Effort stays medium. `/effort high` only for 3D engine work, money maths or a bug that has resisted one attempt.

## 5. Not traded for tokens

Every change keeps its tests (new behaviour gets a test that fails on the old code), the Night and Daylight shots at 390 and 1100 px, `tests/test_beta_client.js` for outside hosts, the queue discipline, the backup branch before a release, and the owner's standing rules in `CLAUDE.md`. If a saving would skip one of these, don't take it.

## 6. Bigger options (need the owner's yes)

- **Split `index.html` into source parts** (`src/app/*.css`, `*.js`, `*.html`) that `tools/build_site.js` stitches back into the same single file. Reads, greps and diffs get much smaller and parallel sessions conflict less. It is a large refactor: do it between rounds, with the full suite and a visual pass before and after, and keep the shipped file byte-for-byte equivalent at first.
- ~~A `ship-item` project skill~~: built 31 Oct (`.claude/skills/ship-item/`, `.claude/agents/rollout-qc.md`, `.claude/hooks/qc-gate.sh`, `tools/shot.js`).

## Quick reference

| Want | Type |
| --- | --- |
| Find something | `use scout to find where the deposit target is set` |
| A simple, exact edit | `use grunt to rename depositTarget to depositGoal in index.html` |
| Understand a part before changing it | `use architect to explain how cloud sync works` |
| Plan a feature (CLI) | Shift+Tab twice, then describe it |
| Quick questions | `/caveman`, then short prompts. `/caveman off` to stop |
| Context getting big | `/compact` |
| Build or finish a queue item | `/ship-item Round 3 item 8` |
| Switching task | `/handoff next: Round 3 item 20`, then a new session |
