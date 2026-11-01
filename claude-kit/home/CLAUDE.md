<!-- claude-kit:start -->
## Token budget (all projects)
- Big files: use the session-start map or Grep, then Read with `offset`/`limit`. Never Read a file over about 800 lines whole.
- Trim command output (`| tail -40`, `| grep`, `--quiet`). If `rtk` is installed, prefix noisy commands with it.
- Replies: outcome first, short. Line refs or short diffs, not whole files. Don't restate the plan.
- Delegate: `scout` (Haiku) for wide searches, `grunt` (Haiku) for exact mechanical edits, `architect` (Opus) only for deep explains and plans.
- Plan mode runs on Opus, everything else on Sonnet. Use plan mode for research, plans and big refactors.
- When the task changes, suggest `/handoff` and a fresh session. After an exploration phase, suggest `/compact`.

## Session titles (all projects)
- Once a session's purpose is clear and the automatic title doesn't say it, rename the session (cloud: `set_session_title`; CLI: `/rename`). Pattern: `<Project> · <Build|Ops|Setup|Research|Marketing>: <purpose>`, for example `Vault-It · Build: footer disclaimer + ledger fixes`. Rename again when the purpose changes. Name child sessions you create the same way.

## Venture Control (all projects)
- Venture Control (https://claude.ai/artifact/5VZKvxcHLo8v4ZFjCQnhvm) is the owner's one task board for PT Live Design. Every task the owner gives, and every finding that adds, blocks or finishes one, reaches it in the same turn, from every session.
- It reads each project's `docs/QUEUE.md` live from GitHub (Vault-It: branch `brand-rollout`). Add or update the line there, commit the queue lines alone (`Queue: …`), then fetch, rebase and push to that branch. Never push app code this way.
- Build and non-build work alike (legal, marketing, admin, finance); add the Venture Control task code when there is one. Keep the format: `## Open`, `- [ ]` / `- [~]`, `## Waiting on the owner`, `## Done`.
- A project with no watched queue file: create `docs/QUEUE.md` in that format and ask the owner to add the repo on the page. Republish the page itself only to change its plan or timeline, through a one-time `SEED.updates` entry so saved state is kept.

## Windows laptops (all projects)
- When you ask the owner to run anything, say exactly where, every time: the app (Claude Code chat on the phone or laptop, or a claude.ai page), Claude Code in Git Bash on the laptop (type it to Claude, or as a `!` command), plain Git Bash, PowerShell, or a browser. Give the folder too (for Vault-It: `~/Projects/Vault-It` in Git Bash) and one command per line, ready to paste. Default to Git Bash for repo commands (owner, 1 Nov 2026).
- Run Claude Code from Git Bash; hook scripts are bash. Never pipe a download into a shell (`curl ... | bash`): install from a checked-out copy instead.
<!-- claude-kit:end -->
