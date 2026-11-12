# Vault-It dev workflow (tester release)

One loop, the same for every change. GitHub holds the code, `docs/QUEUE.md` holds the work, and each step has one place it runs.

```
 Owner asks ──► Queue ──► Build (cloud, Sonnet) ──► QC ──► brand-rollout ──► CI ──► Phone check (laptop) ──► /release ──► Live check ──► Feedback
   (phone)      claim      /ship-item               rollout-qc   rebase+push     full suite   npm run dev:phone     owner merges   version.json     digest -> Queue
```

| Step | Where | Tool | Gate |
| --- | --- | --- | --- |
| 1. Ask | Phone, any session | Plain words; Claude adds it to `docs/QUEUE.md` the same turn | In the queue before any work |
| 2. Claim | The session taking it | `[~] (cloud)` or `[~] (laptop)`, pushed straight away | No two sessions on one item |
| 3. Build | Fresh cloud session, Sonnet (Opus for 3D engine, money logic, hard bugs) | `/ship-item <item>`: intent card, failing test first, named tests, `node tools/shot.js` | Tests pass, shots clean |
| 4. QC | Same session | `rollout-qc` agent (fresh eyes, read-only) | PASS; `qc-gate.sh` blocks app commits without it |
| 5. Integrate | Same session | Fetch, rebase on `origin/brand-rollout`, re-run the item's tests, push | No force-push; queue conflicts keep both sides |
| 6. Full suite | GitHub Actions | `ci.yml` on every push | Green on the exact commit |
| 7. Phone check | Laptop, Git Bash, `Projects\Vault-It` | `npm run dev:phone`, open the printed `https://` address on the phone | Owner says "signed off" |
| 8. Release | Laptop or cloud, owner's merge | `/release` | Every gate in the skill |
| 9. Watch | Owner's inbox and the queue | Feedback digest (daily) and themed report (weekly) become queue items | Back to step 1 |

## Who does what
- **Owner:** asks, decides, signs off on the phone, merges the release, says yes to anything that touches Supabase, secrets or money.
- **Cloud sessions:** build, test, QC, research. One item each, named `Vault-It · <type>: <purpose>`. This Ops session plans and coordinates; it does not build app features.
- **Laptop (Claude Code in Git Bash, `claude-kit` installed):** phone staging, releases, anything the cloud sandbox cannot reach. Windows cannot be attached to a cloud session, so laptop work runs in a laptop session (start it from the desktop app, or from the phone with Remote Control on).

## Keeping it cheap and safe
- Token rules: `docs/CLAUDE_EFFICIENCY.md`. Clash rules: `docs/MULTI_SESSION.md`. Release gates: `.claude/skills/release/SKILL.md`. Item loop: `.claude/skills/ship-item/SKILL.md`.
- A session that has grown past about 150k tokens of context hands off (queue progress line, commit body) and a fresh one carries on.
- The laptop's user-level kit updates from the repo: `bash claude-kit/install.sh` in `Projects\Vault-It` after a pull.
