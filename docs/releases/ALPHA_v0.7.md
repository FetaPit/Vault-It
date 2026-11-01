# Alpha rollout v0.7

The release going to testers on Mon 2 Nov 2026: production branch `release/pioneer-v2`, pull request FetaPit/Vault-It#3 (the owner merges it from the GitHub app). Built from `brand-rollout`. Collated 1 Nov 2026, 16:45, from every Vault-It session since 30 Oct. The live list of blockers is in `docs/QUEUE.md` on `brand-rollout` (so it shows in Venture Control); this file is the history and the map.

## Blockers (all must be done before the merge)

| # | Blocker | Who | State, 1 Nov 16:45 |
|---|---------|-----|--------------------|
| 1 | Feedback button covers the Net worth in 3D view at 1100 px (`test_signoff_a` fails, CI run 41326238697 on 7e0212a). Side issue: `test_sync` "NOT SYNCED: vi-fb-visits" under load | Feedback button session | Done, 1e686be (1 Nov 16:50), CI to confirm |
| 2 | Remove the celebrity names (Gary Stevenson in a CSS comment; Buffett, Munger, Stevenson, Squibb advisor cards in `Vault-It_v0.3_Alpha.html`). Branch `claude/social-media-strategy-launch-fwdvvq`, `test_honest_pricing` | Marketing session | Done, e3e5647 (1 Nov 16:42) |
| 3 | CI green on the exact release commit (last full result: red on 7e0212a; later runs cancelled or still running) | Ops session | Done, CI green on 0909a7e (run 41328370081) |
| 4 | Owner's phone sign-off on that commit: faster house builder, old builder gone, seven phone fixes, Feedback button, Help centre (tour once after the welcome, Settings replay, FAQs, help chat) | Owner | Waiting on 1 to 3 |
| 5 | Release steps (`/release`): backup branch, fast-forward `release-mvp-20261031` to the signed-off commit, rewrite the PR #3 description (it still lists only the 31 Oct changes), owner merges, live version check, tag `v0.7.0-alpha` | Ops session, then owner | Not started |

### Owner checks on release day (not code, but testers hit them)

- Sign-up box on vault-it.co: does the Cloudflare "are you human" box tick on the phone now that vault-it.co and www are allowed? If not, the no-stuck fallback becomes blocker 6 (needs the owner's yes for the server change).
- Sign-up copy: check nothing still says "free while in beta" (prices are £5.99 a month, £49.99 a year, Founding £149 for 100).

### Already done and going out in v0.7

- House builder speed, 451d6be (30 fps at rest, page no longer freezes)
- Old house builder deleted, Level 2 full colour bricks, Level 3 locked under Pro, 2e088fc
- Seven phone sign-off fixes, 8137c73 to e9b0b15
- Feedback button and specific questions, 4fbd68d and d851346 (server live since 31 Oct)
- Help centre, 47ceb8e and 2a19d70 (server: `help-ask` v1 and `tester-feedback` v3 deployed 1 Nov)
- Ledger gaps, footer disclaimer, icons, bank logos, Budget 3D tree map gaps
- Added by the owner, 1 Nov 17:25: branded emails (9c8005e, f5cc583), pending Pedro's final sign-off. Their function deploys follow after the site is live, each with the owner's yes
- Likely in: the landing no-stuck fallback (client side only)
- The candidate moves past 0909a7e for these, so CI and the phone sign-off run again on the new commit
- Nothing in Supabase, secrets or migrations changes with the merge

### Not in v0.7 (decided, or later)

- PostHog in the live app: after alpha testing (owner, 1 Nov). The Supabase usage log and Stripe cover the alpha
- Letters of intent, creator shortlist, business plan follow-ups; weekly newsletter and welcome e-mail (new, own session)
- Brand rename (UKIPO VAULTIT mark held by Vaultit AB): blocks public launch, socials and incorporating, not the private tester release
- Making the repo private: do it after the merge and check the next Cloudflare build still runs (it also takes fetapit.github.io offline)

## Sessions that fed this release

| Session | What it did | Status |
|---------|-------------|--------|
| Ops: security review, efficiency rules, QC setup, session coordination | Release coordinator, CI watch, briefs to fix sessions, `/release` skill | Running, owns the release |
| Build: Feedback button under the desktop menu | e86fa6c, now fixing the `test_signoff_a` regression | Working on blocker 1 |
| Marketing: social channels + pre-launch strategy | Celebrity-names fix, brand rename research, Venture Control rule | Running, owns blocker 2 |
| Onboarding tour, FAQ, and support chatbot | Help centre, merged at f0dbb32 | Done |
| Build: House builder speed (release blocker) | 451d6be, 2e088fc | Done |
| Build: phone sign-off visual fixes | Seven fixes A to D | Done (archived) |
| Build: footer disclaimer + ledger fixes | 0eecbac, 956f078 | Done (archived) |
| Build: brand rollout, Round 3, MVP release, Budget 3D + icons | First release build, PR #3 at 1cced67 | Idle, handed to Ops |
| Ops: landing page Cloudflare check (laptop) | Turnstile hostnames fixed | Owner to confirm on phone |
| Setup: treg; creative director + landing redesign | Research, plan v2, team map | Not release work |
| Ops: Alpha rollout v0.7 (this session) | This roll-up, blocker list in the queue | Running |

## Timeline

- 30 Oct: `brand-rollout` branch and audit; Round 3; token-saving kit.
- 31 Oct pm: owner says "release when ready". PR #3 opened at 1cced67. Tester feedback built and its server parts deployed.
- 31 Oct 21:30: owner asks to rebuild the release from `brand-rollout` so the Feedback button goes out with it.
- 31 Oct 21:50: owner holds the release until House builder speed and Phone sign-off fixes are done.
- 1 Nov: both done; old house builder deleted; Help centre added to the release ("Add to mvp list"); Feedback button blocker found by CI and fixed (e86fa6c), which then broke `test_signoff_a` (in progress); celebrity names found and fixed on a side branch.
- 2 Nov: CI green, phone sign-off, merge PR #3 as v0.7.

## Release-night notes (1 Nov, evening)

- Candidate 67bb51e green; owner held it after the preview (19 edits, `docs/briefs/V07_PREVIEW_EDITS.md` on brand-rollout).
- Streams started on the owner's "Go" (19:40): A house builder engine (Fable, session_01KoffvynkETPQC1hZdf8um5, branch v07/house-builder); B quick fixes and flow labels (Sonnet, session_01KoffvwxP6sZqoPLryChbVP, branch v07/quick-fixes). Merge B then A into candidate/v0.7, CI, one preview.
- When merging the streams, also cherry-pick 4439545 (waitlist-join: no-token rate_hit error now counts as limited, fails closed; QC PASS) onto candidate/v0.7 so step 6 deploys waitlist-join from the same code. No migration in that change; migration 013 (welcome) still needs the owner's yes.
- Weekly note settled (owner via Venture Control): welcome copy now says "When there is news I will send a short note" (f927469, on brand-rollout after 4439545). Deploy waitlist-join from f927469 or later; cherry-pick both 4439545 and f927469 onto candidate/v0.7.
