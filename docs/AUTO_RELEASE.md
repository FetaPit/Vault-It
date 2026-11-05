# Automatic release (owner approved, 5 Nov 2026: "do it")

Moves production (`release/pioneer-v2`, which Cloudflare deploys to every user) to a READY commit with no command run by the owner. Built as `.github/workflows/auto-release.yml` plus two scripts in `scripts/`, each tested on its own.

## How to release
1. The candidate commit has CI green (all four jobs) and Pedro has passed it.
2. Tag that exact commit and push the tag:
   `git tag ready/2026-11-05-a1b2c3d <full-sha>` then `git push origin ready/2026-11-05-a1b2c3d`
   (or run the workflow by hand: Actions, Auto release, Run workflow, paste the full SHA).
3. Nothing else. The run backs production up, moves it, waits for Cloudflare, checks the live site, and opens an issue if anything fails.

## Gates (any failure stops it; nothing is forced)
- The value is a full 40-character commit SHA.
- The commit is on an `origin/candidate/*` branch.
- It is a plain fast-forward of production (production is an ancestor), so nothing live is lost.
- No change under `supabase/` (migrations and functions need the owner) and none under `.github/workflows/` (a token cannot push those).
- The latest run of each of the four CI jobs on that exact commit succeeded. It waits up to 40 minutes for a run in progress; a failed shard that was re-run and passed counts as passed.
- Production is re-checked as unmoved right before the push.

## After the push
- A backup branch `backup/release-pioneer-v2-<stamp>` holds the previous production.
- It polls `app.vault-it.co/version.json` until it shows the SHA (up to 20 minutes), then checks the app, `vault-it.co` and `vault-it.co/pitch-Eligent` answer 200.
- On any failure it opens an issue with the run link. It never rolls back by itself: a rollback is a force push and stays the owner's call.

## Controls
- **Pause:** set the repository variable `AUTO_RELEASE_PAUSED` to `true` (Settings, Secrets and variables, Variables). Every run then skips.
- **Token:** the built-in token is used. If `release/pioneer-v2` turns out to be protected and the push is refused, add the secret `RELEASE_PUSH_TOKEN` (a fine-grained token, Contents: read and write on this repo) and it is used instead.

## Known limits
- The first release that contains these files has to be pushed by hand (the gate blocks workflow-file changes). After that, every release is hands-off.
- A push made with the built-in token does not start other workflows, so the Supabase function deploy never runs from it. That is why server-side changes are blocked here.
- The tag must sit on a commit CI actually ran on. CI skips docs-only pushes, so tag the last commit that changed code.
