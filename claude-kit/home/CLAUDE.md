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

## Windows laptops (all projects)
- When you ask the owner to run anything, say exactly where, every time: the app (Claude Code chat on the phone or laptop, or a claude.ai page), Claude Code in Git Bash on the laptop (type it to Claude, or as a `!` command), plain Git Bash, PowerShell, or a browser. Give the folder too (for Vault-It: `~/Projects/Vault-It` in Git Bash) and one command per line, ready to paste. Default to Git Bash for repo commands (owner, 1 Nov 2026).
- Run Claude Code from Git Bash; hook scripts are bash. Never pipe a download into a shell (`curl ... | bash`): install from a checked-out copy instead.
<!-- claude-kit:end -->
