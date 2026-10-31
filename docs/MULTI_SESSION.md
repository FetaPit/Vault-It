# Laptop, phone and cloud: working together without clashes

The owner runs Claude in three places: the Claude app on the phone (cloud sessions like this one), Claude Code in Git Bash on the Asus laptop, and sometimes several cloud sessions at once. GitHub is the only shared truth. `docs/QUEUE.md` is the shared task board and the handoff between machines.

## Who does what

| Where | Best at | Never |
| --- | --- | --- |
| Cloud sessions (phone, claude.ai/code) | Building queue items, tests, QC, research. Linux matches CI; the test suite runs as written | Push to `release/pioneer-v2` (blocked), reach `api.metals.live` or `*.workers.dev`, serve a build to the phone |
| Laptop, Claude Code in **Git Bash** | Releases (the only place that pushes `release/pioneer-v2`), phone staging (`npm run dev:phone`: builds, prints the `https://` address for the phone, runs `wrangler dev --ip 0.0.0.0 --local-upstream localhost --local-protocol https`; accept the certificate warning once), hosts the sandbox blocks, real Windows browsers, Supabase and Cloudflare logins in a browser | Run the full test suite (78 tests open `file:///home/user/Vault-It/index.html`, the cloud path; CI and cloud run them) |
| Laptop, PowerShell | Windows jobs outside the repo | Run Claude Code on this repo: the hooks are bash scripts and Claude Code on Windows uses Git Bash for its own commands anyway |
| GitHub Actions (CI) | The full suite on every push, three browser shards | Deploys nothing |

## Linking them: Remote Control

To let a phone or cloud session use the laptop (start `wrangler dev` for a phone check, run a release push), the laptop shares the Vault-It folder. Either:
- the Claude desktop app: Settings, Claude Code, Remote Control, add the Vault-It folder; or
- in Git Bash, in the Vault-It folder: `claude remote-control`.

A session then asks for the folder and the owner approves each time. The laptop must be on with Claude running. Share the repo folder only, never the home folder.

## Rules that stop clashes

1. **Claim before you build.** Mark the item `[~]` with where it runs, for example `[~] (laptop)` or `[~] (cloud)`. Commit the queue line alone (`Queue: claim <item>`), fetch, rebase and push it to `brand-rollout` straight away. If the push is rejected and the item is now claimed by someone else, take the next item.
2. **One item, one session, one branch.** A session works on its own branch off `brand-rollout`. It joins `brand-rollout` by `git fetch`, `git rebase origin/brand-rollout`, re-running the item's tests, then push. Never force-push a shared branch.
3. **Queue conflicts:** keep both sides. Take the newer file and re-add your own lines, never drop another session's items or progress.
4. **The same file in two sessions** (`index.html` above all): only when the items touch clearly separate parts. Otherwise run them one after another.
5. **Releases only from the laptop**, as the release item in the queue says: full suite green on the exact commit (CI), backup branch, fast-forward `release/pioneer-v2`, or a pull request the owner merges in the GitHub app.
6. **Handoffs travel through git.** Laptop `/handoff` notes stay on the laptop and cloud ones vanish with the container. The queue progress line ("Next: ...") and the commit body are what the other machine reads.
7. **Local-only settings** go in `.claude/settings.local.json` (git-ignored): laptop permissions and paths never enter the shared `.claude/settings.json`.

## Laptop set-up (once, in Git Bash)

One working copy only: `C:\Users\Asus ZenBook Duo\Projects\Vault-It` (checked 31 Oct). The old `C:\Users\Asus ZenBook Duo\Vault-It` (on `main`, with unused Vercel skills in `.agents/`) and `Documents\PT Live Design\Vault-It` (brand files, not a git repo) stay off the Remote Control list.


```
git config --global pull.rebase true
git config --global rebase.autoStash true
git config --global core.autocrlf true      # Git for Windows default: LF in the repo, CRLF on disk
cd "/c/Users/Asus ZenBook Duo/Projects/Vault-It" && git fetch && git switch brand-rollout && git pull   # the one working copy on the laptop
bash claude-kit/install.sh   # updates the user-level kit from this checkout (auto mode blocks curl | bash, rightly)
```

Agents: the laptop's user-level `scout`, `grunt` and `architect` (from `claude-kit`) and the repo's own (`.claude/agents/`) share names and content; the repo's copy wins inside this project, and adds `queue-keeper`, `one-b` and `rollout-qc`. The `ship-item` skill and the commit gate come with the repo, so a laptop session gets them after `git pull` and a restart. The gate falls back to reading the raw command when Windows has no Python.

Before the first laptop session, check: `claude --version` in Git Bash, `bash .claude/hooks/queue.sh` prints the queue, and `printf '{"tool_input":{"command":"git status"}}' | bash .claude/hooks/qc-gate.sh; echo $?` prints 0.
