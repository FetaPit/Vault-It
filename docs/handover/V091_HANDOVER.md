# Handover: start of the v0.9.1 round (3 Nov 2026)

Read this, then `CLAUDE.md`, `docs/QUEUE.md`, `docs/AGENT_ROSTER.md`. Nothing else until the owner's edit list arrives.

## State
- **Live:** v0.8 + v0.9 at `app.vault-it.co`, commit `5e8b5a5` (`version.json` checked 3 Nov). CI green on that commit.
- **Backup:** `backup/release-pioneer-v2-20261103-0203`. **Frozen release branch:** `release-20261103`.
- **Working branch for 0.9.1:** branch off `brand-rollout`; name chunks `v09x/<chunk>`.
- **Server:** migration 013 applied; `waitlist-join`, `waitlist-welcome`, `send-auth-email`, `tester-feedback`, `feedback-digest` redeployed from the CLI.

## Still open for the owner (not code)
1. Open the live app once on the phone and check the v0.9 changes (dashboard colours, 3D Cash Flow tile, Budget flow zoom, grouped holdings and tree map, Assets nav, Liabilities expand).
2. Paste the six email templates from `supabase/auth-templates/` into the Supabase dashboard.
3. Confirm the new Stripe links are live: yearly tester £39.99, Founding Member £99.
4. Not reproduced: the Precious Metals freeze and the tile rotation complaint. Ask for device and metals held if it returns.

## Waiting for input
The owner's **v0.9.1 edit list** (not yet given). Also candidates: Pedro's two cosmetic nits deferred to 0.8.1 (`docs/review/v08-type-scale/README.md`), PostHog (parked, needs consent-first setup), the Chief of Staff connectors (Slack, meeting capture, Notion command centre).

## Known gaps for 0.9.1 (found by Pedro's test run, verified)
- Sidebar summary (`index.html` around line 14889-14893): Total assets and Monthly surplus are still teal. Should be green and blue, net worth teal, red when negative, Night and Daylight.
- Open question for the owner: is "location icon" the one removed from the House Builder viewport, or also the pin on "Show it on the house" (`hbJumpToRow`)? The viewport button is gone; the text button remains.

## Agent test run (3 Nov)
Pedro turned the v0.9 dictation into a correct brief and found the sidebar miss. David split the same round into six chunks with branches, models, tests and merge order, and noticed the round was already marked done. Both passed. David over-specified Opus for the dashboard chunk; use Sonnet unless the 3D engine changes.

## Roles and models
See `docs/AGENT_ROSTER.md`. Start the main session as the Chief of Staff (`/chief-of-staff`). Sonnet builds, Opus plans, the 3D engine, money logic and hard bugs. Never switch model mid-session.

## Lessons from the v0.9 round (do these first next time)
1. **Check the owner's standing rules before building:** the v0.8 type floor (chart labels at 10.5 px or more, 1:1 in the scroller) clashed with "scale the flow down". Ask one batched question early.
2. **Removing or moving a feature breaks old tests.** Grep `tests/` for the element ids and counts before pushing (`hud-row`, `vi-pin`, button counts, `cf-sankey`). CI took three rounds this time.
3. **Run the full browser suite in CI on the exact commit before declaring done.** Local named tests are not enough. Shards can show known flaky tests (`test_hb_speed`, `test_nw3d` reload check, `test_sync`, `test_cut`); a re-run pass is fine.
4. **Collapsed or hidden UI hides test targets.** Tests must open groups before clicking inside.
5. **The headless 3D intro waits for the stage to be in the middle of the screen.** Scroll it into view before a screenshot.
6. **Don't trust a subagent's claim without a check:** one reported a missing privacy-notice host that was already named. Verify against the file.
7. **Supabase connector confirmations time out on the phone.** Apply migrations from a session where the owner can approve, or in the SQL editor. Deploy functions with the CLI (`npx supabase functions deploy <name> --project-ref legpubblzgknxdtvsant --no-verify-jwt`), one at a time, answering Yes to each prompt. The auto-deploy GitHub Action fails (token) and does not include `tester-feedback` or `feedback-digest`.

## Where things run
- Cloud sessions: build, test, QC. Laptop Git Bash in `~/Projects/Vault-It`: releases and `npm run dev:phone`. Supabase login is saved on the laptop.
- Release order: CI green on the exact commit, owner's phone sign-off, backup branch, migrations, owner pushes `origin/<frozen-branch>:release/pioneer-v2`, live `version.json` check, functions, owner checks the phone.

## Starter prompt for the new session
> Chief of Staff, v0.9.1 round for Vault-It. Read `docs/handover/V091_HANDOVER.md`, `docs/AGENT_ROSTER.md` and `docs/QUEUE.md`. I will dictate the edits. Queue them in my words, have Pedro write the brief, have David split it into chunks with models and tests, and ask me one batched question on anything that clashes with the standing rules. No code until I approve the plan.
