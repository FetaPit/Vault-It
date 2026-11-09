# v0.95 scope: everything not rolled into v0.9.4

Collated 9 Nov 2026 (owner: "ensure that all of the outstanding edits that weren't rolled into 0.94 version are pulled into 0.95. List them in bullet points, suggest more"). Sources: `docs/QUEUE.md` on brand-rollout, the COO's branch audit against `release/pioneer-v2` b8847c8, the Executive Assistant's non-build list, and this session's build notes. Draft until the owner adds his edits and says go.

Production = `release/pioneer-v2` b8847c8. Every `v091r2/*`, `v092/*` and `v09x/*` branch is live (0 ahead or patch-equivalent). V07 E1 to E19, V091 R1 to R27 shipped, except E18 (dropped) and E34 (parked).

## A. Built, not yet live (merge in this order)

1. **Deposit pot in onboarding + ground-up brick animation + sample-leak fix.** `ccr-06395da7-wmldol` c6178e3 (81ad5e0, d2a368a), built on b8847c8. Tests `test_v095_onboarding_pot`, `test_v095_demo_signup`. Fixes a live data leak: first.
2. **House builds brick by brick behind sign-in and onboarding** (v0.9.4 item 0). `v094/house-intro` a708f12. Contains the sign-in still (f4ae79e) and the 3D hover house (2ae43b5), so the two `v092/signin-house*` lines are superseded. Base is 58 commits behind release: merge release in first; one conflict hunk (auth CSS ~10725, Google button vs house CSS, keep both); then `node tools/build_hb3d.js`. Needs the owner's yes on the 3D sign-in house.
3. **Pitch deck v4 + preview-host route.** `ccr-dd35c170-c52giu` b74a02b (site/pitch-eligent, worker). Live /pitch-Eligent is v3. Only if the owner wants it live.
4. **Entrepreneur 1: business current and savings accounts.** Marked done but NOT live: d2fc3f2 is on brand-rollout only, built on old code. Cherry-pick conflicts in two cash-table hunks (index.html ~23230, ~23447 vs `caTableHtml`). Port, don't merge. Last, because it touches the Assets cash table, 3D net worth and sidebar.

## B. Open app edits

House Builder and deposit
- One deposit figure (owner, 1 Nov): roadmap, keys date, Overview deposit cards and help chat follow `state.depositPct`, not `journeyState.profile.depositTargetPct` (7 reads left in index.html, ~28031, ~28562 to 28596). Money logic.
- Home type changes the sign-in and onboarding house (owner, 8 Nov). After house-intro.

Onboarding and sign-in
- v0.9.4 item 1: onboarding answers replace the sample; skipped questions never fall back to sample numbers; keep the "clear demo data" chip. Sign-in paths covered by d2a368a; finish-onboarding path and skipped-question fallback still to check.
- v0.9.4 item 4: skipped "what kind of home" shows "set later" plus a goal prompt. Pedro's spec not committed yet.
- v0.9.4 item 2: Guide sits off screen in Daylight.
- Onboarding stores a LISA as `lisa_cash`; no cash vs stocks and shares choice on the pot screen (this session's note).
- Journey Map wizard still asks the LISA and house price questions a second time (this session's note).
- Cloud unreachable at sign-in: a returning user briefly sees the welcome screens until the restored page hydrates (this session's note).

Overview, Roadmap, Budget
- v0.9.4 item 5: label income as take-home pay; label the pension line on the roadmap.
- Onboarding income becomes the Budget's starting figure, then the user splits it by source and adds expenses (owner, 8 Nov). Two readings, see D.

Assets and 3D
- Apply icon pack v2 across the app (owner: "Next: apply to the app"; E8, E33b, Pedro Settings #1 with 46 emoji). Pack lives in `brand/` only.
- Extended model library E34: parked by the owner (0588c51, 89 of 100, is live; the Sketchfab fetcher would add outside hosts).

Entrepreneur
- Entrepreneur 2 contract cards, 3 income inside Entrepreneur, 4 Your Team, 5 UK reminders (`docs/ENTREPRENEUR_MODE.md` §9). Budget untouched.

Chrome, theme, type
- Oxanium heading font and tagline colours in app, site and pitch (owner, 6 Nov, URGENT; laptop). `brand/oxanium-tagline` is not on origin and no Oxanium is in the repo: the laptop must push it first.
- Night AA leftovers: sidebar and Settings, mid-fade blocks, Metals sub text 3.9:1, VAULT-IT toggle 4.24:1. Re-run `docs/creative/night-aa/audit.js`.
- Tester banner and Feedback pill overlap "Lay the bricks" at 1100 px (this session's note).

Settings and account
- v0.9.4 item 3: "My account" area with email and billing. Release has no manage or cancel subscription link (Settings review #8).
- Pedro Settings 6 (profile form in one card), 7 (one XP call-out), 14 (sidebar colour on icons only), 15 (scrim at 1100 px, trial toast overlap). Held until "after Saturday".
- `submitWaitlist()` orphan (index.html 28996). Owner's call.

Landing and marketing pages
- Substack links in the landing footer and Substack in the privacy notice: after the owner creates the account.
- `ccr-66eddb5a` demo-eligent: superseded by demo-a (live). Drop.

Tooling and tests
- tools/shot.js GPU compositing (v0.7.1), before shooting house-intro.
- House Builder motion evidence frame set (Pedro).
- hb-speed-retry: not to be merged (CoS). hb-pack-probe: delete. stress-doctor agent exists only on the laptop.
- PostHog: parked until the alpha ends. Index split: waiting on the owner's go.

Stale lines to close in the queue (already live): Google sign-in (ffe057d), welcome type heading swap (2c374c6), theme toggle R27, sidebar summary colours, Wealth Roadmap badges (v0.9.1), inventory viewport stress test, founder e-mail GIF route.

## C. Suggestions

- Stripe customer-portal "Manage or cancel" link in My account (UK subscription rules; paying users since 5 Nov).
- Remove `submitWaitlist()` and its `#waitlist-modal` lookup.
- Guard test: no sample key survives finishing onboarding (closes the other half of the d2a368a leak).
- One deposit helper plus a test that nothing reads `depositTargetPct` outside it.
- One reduced-motion test covering every new animation (house intro, ground-up bricks, coins).
- Re-run the Night AA audit at 390 and 1100 px, both themes, to close the leftovers.
- Fix shot.js before house-intro shots, so Daylight shots are not misleading.
- Bring brand-rollout back in line with release after v0.95 and keep app code off it (Entrepreneur 1 broke the queue-only rule).
- Clean the affected testers' cloud rows (ht3, pos_ov1, pos_al1, pos_ach1) once the owner says yes, then release the fix.
- Pot screen: a LISA cash vs stocks and shares choice, or default to the type the user picks later in House Builder.
- Journey Map wizard: skip questions onboarding already answered.

## D. Owner decisions before the round starts

1. 3D sign-in house with hover (inside house-intro): yes, or the still only?
2. Onboarding income into Budget: (a) a new split-by-source step in Budget, or (b) only pre-fill the existing income line?
3. Entrepreneur 2 to 5 in v0.95, or next round?
4. Port Entrepreneur 1 into v0.95 (marked done, not live)?
5. Pitch v4 to replace the live v3?
6. Index split before or after the v0.95 branches?
7. Remove `submitWaitlist()`?
8. Clean the affected testers' Supabase rows: yes, and before or after the fix release?
9. Laptop to push `brand/oxanium-tagline`?
10. E34, PostHog, joint bills stay parked: confirm.

## E. Non-build, owner (Executive Assistant's list)

- Release-day phone check: Turnstile box ticks on vault-it.co and the form still joins if the check is blocked.
- Paste the six Supabase auth templates, turn on Resend SMTP, confirm OTP expiry 3600 s.
- Phone test of vault-it.co/sign-up (confirmation e-mail, confirm page, "Remove me").
- Brand build on a real phone (lite fallback speed, feedback feel).
- Set FROM_EMAIL; upgrade Resend before ads.
- Business plan still shows £7.99 / £69.99 / £199; decided prices are £5.99 / £49.99 / £149.
- Substack: create the account; custom domain needs a yes.
- Plaza Futura PDF to Steve on LinkedIn.
- Brand rename undecided; no social or brand-name posts until then.
- Make the GitHub repo private, then check the Cloudflare build.
