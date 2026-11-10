---
name: release
description: Release a tested brand-rollout (or Pioneer_v3) commit to production, the Vault-It way. CI green on the exact commit, the owner's phone sign-off, backup branch, server steps in the right order, then the owner's merge, and a live check that app.vault-it.co serves that commit. Run only when the owner asks for a release.
argument-hint: "[commit or branch to release, default origin/brand-rollout]"
disable-model-invocation: true
---

Release candidate: ${ARGUMENTS:-origin/brand-rollout}

Run on the laptop (Git Bash) or a cloud session. Either way the last step, moving `release/pioneer-v2`, is the owner's: Cloudflare deploys whatever lands there, to every user. Stop and report at the first failed gate; never work around one.

## Gates (all must pass, in order)
1. **Queue.** Run `queue-keeper` with "release <candidate>". The release is a queue item: mark it `[~] (laptop)` or `[~] (cloud)` and push the claim.
2. **Exact commit.** `git fetch origin`, resolve the candidate to a SHA (`git rev-parse <candidate>`). Everything below refers to that SHA only. It must contain `origin/release/pioneer-v2` (`git merge-base --is-ancestor origin/release/pioneer-v2 <sha>`), or the release is not a fast-forward: stop.
3. **What ships.** `git log --oneline origin/release/pioneer-v2..<sha>` and `git diff --stat origin/release/pioneer-v2 <sha>`. Summarise in plain words for the owner: features, fixes, and anything touching payments, sign-in, saved data or privacy copy.
4. **CI green on that SHA.** GitHub Actions `ci.yml` (server job and three browser shards) for exactly this commit: `mcp__github__actions_list` in a cloud session, `gh run list --commit <sha>` on the laptop if `gh` is installed, otherwise the commit's checks on github.com. Pending means wait; red means stop and read only the failing job's log. Flaky passes on re-run are allowed and named.
5. **Owner's phone sign-off on this build.** The owner checked it with `npm run dev:phone` (or a preview link) and said "signed off" for this SHA or a commit whose diff to it is docs or tests only. Record it in the queue line. No sign-off, no release.
6. **Server steps.** `git diff --name-only origin/release/pioneer-v2 <sha> -- supabase/`. For each new migration or changed function: is it already applied or deployed (Supabase connector: `list_migrations`, `list_edge_functions`)? Anything missing needs the owner's explicit yes, and goes in this order: migrations, then functions and their secrets, then the app. If the app would call a function that is not live, say what the tester sees until it is.
7. **Privacy and hosts.** `bash scripts/run-tests.sh test_beta_client test_signup_page` on the SHA (they guard the privacy notice, outside hosts and prices). They are in CI too; re-run them if step 4 was a re-run.

## Ship
8. **Backup.** `git branch backup/release-pioneer-v2-$(date +%Y%m%d-%H%M) origin/release/pioneer-v2 && git push origin <that branch>`.
9. **The owner moves production.** Either a pull request from a frozen branch (`git branch release-<date> <sha>`, push, open the pull request into `release/pioneer-v2`) that the owner merges in the GitHub app, or, on the laptop, give the owner the one command to run themselves: `git push origin <sha>:release/pioneer-v2`. Do not push it yourself.
10. **Live check** (Cloudflare Workers Builds takes a few minutes): `curl -s https://app.vault-it.co/version.json` shows the released SHA; `https://app.vault-it.co/` and `https://vault-it.co/` answer 200. Ask the owner to open the app once on the phone (the service worker swaps to the new version on the next visit).
11. **Close.** Move the queue item to Done with the SHA, the backup branch and what was deployed server side. Tell the owner in five lines: what shipped, what proves it, server steps done or pending, how to roll back, what to watch (feedback digest, console errors, Daylight readability).

## Roll back (owner only)
Production goes back to the backup branch: the owner pushes `backup/release-pioneer-v2-<stamp>` to `release/pioneer-v2` (a force push, so only the owner, only when asked), or reverts the release commits on a branch and releases that. Feature flags (`?x=old`, Settings switches) turn off the new 3D views without a release. Migrations are not rolled back without a written plan.
