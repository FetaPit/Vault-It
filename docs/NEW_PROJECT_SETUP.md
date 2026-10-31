# Starting a new PT Live Design project: laptop and cloud in tandem

A reusable recipe for any new project, based on how Vault-It runs. Copy this file into the new repo and tick it off.

The idea in one line: **GitHub is the only shared truth, `docs/QUEUE.md` is the shared task board, cloud sessions build, the laptop stages and releases.**

## 1. The two layers

| Layer | What it is | Where it lives | How it reaches a machine |
| --- | --- | --- | --- |
| **claude-kit** (personal, every project) | Model and effort defaults (`opusplan`, medium), `scout` / `grunt` / `architect` agents, big-file map at session start, status line, `/caveman`, `/handoff`, token rules, session title pattern | `claude-kit/` in the Vault-It repo, branch `Pioneer_v3`; installs into `~/.claude/` | Laptop: `bash claude-kit/install.sh` from a checkout. Cloud: the environment's setup script (section 3) |
| **Project layer** (one per repo) | Queue hooks, `queue-keeper`, the item loop (`ship-item`, `rollout-qc`, `qc-gate.sh`), `/release`, project `CLAUDE.md`, CI | `.claude/`, `docs/`, `.github/workflows/` in the project's own repo | `git pull` (laptop) or the fresh clone (cloud). Restart Claude Code after a pull that changes `.claude/` |

The project layer wins inside its repo: an agent in `.claude/agents/` overrides the kit's agent of the same name.

## 2. Who does what

| | Cloud sessions (phone app, claude.ai/code) | Laptop (Claude Code in **Git Bash**, one working copy under `Projects\`) | GitHub Actions |
| --- | --- | --- | --- |
| Best at | Building one queue item each, tests, QC, research. Linux, so tests run as CI runs them | Serving a build to the phone, releases, browser logins (Supabase, Cloudflare, Stripe), real Windows browsers | Full test suite on every push |
| Never | Push the production branch, serve a build to the phone | Run the full suite (leave that to CI); run Claude Code from PowerShell (the hooks are bash) | Deploy |
| Model | Picked when the session is created: Sonnet to build, Opus to plan, for hard bugs and money logic. Never switch midway | `opusplan`: Opus in plan mode, Sonnet for edits | |
| Handoff | Queue progress line ("Next: ...") and commit body. Its `/handoff` note dies with the container | Same. Its `/handoff` note stays on the laptop only | |

**Remote Control links them.** Share the project folder (desktop app: Settings, Claude Code, Remote Control; or `claude remote-control` in the folder). A phone or cloud session can then ask to run something on the laptop; you approve each request, and the laptop must be on with Claude running. Share the repo folder only, never the home folder.

## 3. Set-up checklist (once per project)

**GitHub**
- [ ] Create the repo with a production branch (deploys) and a working branch (sessions build here). Protect the production branch.
- [ ] Add CI (`.github/workflows/ci.yml`) that runs the test script on every push and pull request. It deploys nothing.

**Laptop (Git Bash)**
- [ ] One-off git settings, if not already set: `git config --global pull.rebase true`, `rebase.autoStash true`, `core.autocrlf true`, plus `user.name` and `user.email`.
- [ ] Clone into `C:\Users\Asus ZenBook Duo\Projects\<Project>`. One working copy only.
- [ ] Kit up to date: in a Vault-It checkout, `git pull && bash claude-kit/install.sh`, then restart Claude Code.
- [ ] Laptop-only permissions and paths go in `.claude/settings.local.json` (git-ignored), never in the shared `.claude/settings.json`.
- [ ] Add the folder to Remote Control if phone or cloud sessions will need the laptop.

**Cloud**
- [ ] Create a cloud environment for the project (environment menu in the session title bar). Set its network access to the hosts the project needs.
- [ ] Setup script, kit line (installs from a clone, never `curl | bash`):
  ```
  rm -rf /tmp/claude-kit-src && git clone -q --depth 1 -b Pioneer_v3 https://github.com/FetaPit/Vault-It /tmp/claude-kit-src && bash /tmp/claude-kit-src/claude-kit/install.sh
  ```
- [ ] Project start-up (dependencies, test browser) goes in the repo's own `.claude/hooks/session-start.sh`, not the environment script, so laptop and cloud share it.

**Claude app**
- [ ] Turn off connectors and plugins a coding session does not use (they cost 10k to 15k tokens per request). Keep only what the project needs, for example GitHub plus its hosting and database.

## 4. The project layer: what to copy from Vault-It

| Copy | From Vault-It | Adapt |
| --- | --- | --- |
| Queue | `docs/QUEUE.md` (headings only: Open, Waiting on the owner, Done), `.claude/hooks/queue.sh`, `.claude/agents/queue-keeper.md` | Nothing; the hook reads `docs/QUEUE.md` in whatever repo it runs in |
| Clash rules | `docs/MULTI_SESSION.md` | Paths, branch names, what the cloud sandbox cannot reach |
| Item loop | `.claude/skills/ship-item/`, `.claude/agents/rollout-qc.md`, `.claude/hooks/qc-gate.sh`, `tools/shot.js` | Which folders count as app code, the screenshot sizes and themes, the project's test names |
| Release | `.claude/skills/release/` | Production branch, deploy target, live check URL |
| Hooks wiring | `.claude/settings.json` `hooks` block (SessionStart: `session-start.sh`, `map.sh`, `queue.sh start`; UserPromptSubmit: `queue.sh prompt`; PreToolUse Bash: `qc-gate.sh`) | Drop `map.sh` if no file is over about 800 lines |
| Token rules | `docs/CLAUDE_EFFICIENCY.md` | File names in section 2 |
| Test runner | `scripts/run-tests.sh` pattern (named tests, `FAIL` lines count, one re-run reported as FLAKY) | The project's own tests |

Leave behind everything Vault-It only: the brand rollout, Supabase rules, the 3D engine, Stripe prices.

**Project `CLAUDE.md`** (keep it short; Vault-It's is the model):
- Where things are (one line per folder).
- Branches: which one sessions build on, which one is production, no pull requests unless asked.
- How to run tests, and what counts as a pass.
- Secrets: never committed; where they live.
- Your standing rules for this project.
- Work queue rules (copy the "Work queue" block from Vault-It's `CLAUDE.md`).

## 5. The loop

```
 Ask (phone) ──► Queue ──► Claim ──► Build (cloud) ──► QC ──► Rebase + push ──► CI green ──► Phone check (laptop) ──► Release (laptop) ──► Live check
```

1. **Ask.** Say it in plain words in any session. Claude adds it to `docs/QUEUE.md` that turn, before any work.
2. **Claim.** The session taking it marks `[~] (cloud)` or `[~] (laptop)`, commits the queue line alone and pushes straight away. Rejected push and the item is now someone else's: take the next one.
3. **Build.** Fresh session, one item, its own branch off the working branch: `/ship-item <item>` (intent card from your words, failing test first, named tests, screenshots).
4. **QC.** `rollout-qc` gives an independent PASS; the commit gate blocks app code without it.
5. **Integrate.** `git fetch`, `git rebase origin/<working branch>`, re-run the item's tests, push. Never force-push a shared branch.
6. **Full suite.** CI on the exact commit.
7. **Phone check.** On the laptop, serve the build and open the printed address on your phone (Vault-It: `npm run dev:phone`). You say "signed off".
8. **Release.** `/release` from the laptop: backup branch first, then the production branch moves (or a pull request you merge in the GitHub app).
9. **Feedback** becomes new queue items. Back to step 1.

## 6. Rules that stop clashes

1. Claim before you build; one item, one session, one branch.
2. Two sessions on one file only when they touch clearly separate parts; otherwise one after the other.
3. Queue conflicts keep both sides: never drop another session's lines.
4. Items are done top to bottom. A newer ask jumps the queue only when you say so; the item then notes "owner reordered".
5. Releases only from the laptop.
6. Handoffs travel through git (queue progress line, commit body), not `/handoff` notes.
7. Name every session `<Project> · <Build|Ops|Setup|Research|Marketing>: <purpose>`.

## 7. Keeping the kit current

- Installs pull the kit from `Pioneer_v3` on the Vault-It repo. A kit change made on another branch reaches machines only once it is on `Pioneer_v3`. Check from a Vault-It checkout: `git fetch origin Pioneer_v3 && git diff --stat origin/Pioneer_v3 HEAD -- claude-kit`.
- After a kit change: laptop re-runs `bash claude-kit/install.sh`; cloud environments pick it up on the next new session.
