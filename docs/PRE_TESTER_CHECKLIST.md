# Before testers: what is left (30 Oct 2026)

Branch `brand-rollout`. Done and pushed: colour code, Daylight polish, logo and tagline, the item 3D viewer (wealth inventory and liabilities), and the card groupings. Released 30 Oct 2026 (see `docs/CUTOVER.md`). Backup of the previous release: `backup/release-pioneer-v2-20261030-1600`.

## Pete's answers (30 Oct)

- Phone build: Cloudflare preview. Link: **https://brand-rollout-vault-it.ptlived.workers.dev** (updates on every push to `brand-rollout`; never live). Sign-in is blocked on preview links by design, so it opens with the demo data.
- Phases 5 to 8 and the 3D viewer: happy. Green tint: fine as is.
- E-mails: redeployed with "Vault-It" (`send-auth-email` v10, `waitlist-welcome` v2). Check the sender name in the `FROM_EMAIL` / `WELCOME_FROM` secrets.
- Total assets: teal (done). Yahoo for the free beta: fine.
- Poly Pizza: loads from the preview. 3D from photos: works. Image search was broken (LoremFlickr only returns one default photo since Flickr blocked it): replaced with Openverse.
- Daylight was too bright: now off-white paper with a faint teal grid.
- New feature asked for: link an asset to its live market value. Proposal: `docs/LIVE_MARKET_VALUE.md`.
- Still open: photo-to-3D provider (5), brass uses and "money owed to you" (7).

## For Pete to decide (original list)

1. **A phone build to test on.** Either switch on Cloudflare non-production builds for `brand-rollout` (a preview link, nothing goes live), or run `npm run build:site` then `npx wrangler dev` on a computer and open it on the phone over Wi-Fi. Which one?
2. **Sign off phases 5 to 8 and the 3D viewer** on the phone, in Night and Daylight.
3. **Poly Pizza test.** On the phone build, open the app with `?modeltest=1`, add a wealth item (for example "Gibson Les Paul"), tap **3D**, pick a library model. Tell me if it loads.
   - It loads: sign up for Poly Pizza's commercial plan and say yes to an edge function for live search (key `POLYPIZZA_API_KEY` in Supabase secrets).
   - It's refused: we host a small set of CC0 models ourselves instead.
4. **Green tint on models:** 16% now. Stronger, weaker or fine?
5. **Photo to 3D provider:** Tripo, Meshy or Hyper3D (`docs/INTEGRATIONS_SETUP.md`). Needs a key and a privacy notice line.
6. **Sign-in and beta emails still say "Vault·It"** in four edge functions (`send-auth-email`, `waitlist-join`, `waitlist-welcome`, `stock-quotes`). Changing them means redeploying functions: your yes needed.
7. **Open questions** in `brand/AUDIT_AND_PLAN.md`: brass uses, total assets green or teal, and the "money owed to you" proposal.
8. **Yahoo share prices** are fine for a free beta, not once you charge. Confirm testers are free.

## For me to build (in your order)

1. Level 2 fix plus the first slice of the Octalysis plan (`docs/HOUSE_BUILDER_LEVEL2_GAMIFICATION.md`): extra over the deposit builds Level 2, payments keep building, reset and undo purchase, real mortgage entry, overpayment what-ifs.
2. 3D house brand look on all six models, behind `?house=new`.
3. Net worth in 3D on the Overview, behind `?nw=new`.
4. Sign-up page brand pass and a working offline cache.
5. Copy pass: 515 em dashes left in `index.html`, 15 in `landing.html`.
6. Full test suite and the QA list.

## Release steps (only when you say)

1. Merge `brand-rollout` into `Pioneer_v3`; full suite green.
2. Your phone sign-off on the tested commit.
3. Backup branch `backup/release-pioneer-v2-YYYYMMDD-HHMM`, then fast-forward `release/pioneer-v2`.
4. New 3D on by default for testers only after your sign-off (old builder kept in Settings for a week).

## Quick bug test for the phone (10 minutes)

- Switch Night and Daylight on every tab: all text and typed numbers readable, nothing scrolls sideways.
- House: change type, price and deposit %; add savings; check the log, streak and reset; open "Your own design".
- Overview: tap Assets, Liabilities and Debt headings in "Own and owe"; switch Goals and Snapshots.
- Debt: Histogram and Breakdown; Avalanche and Snowball (the interest box should change).
- Assets, Metals: edit holdings and price, the value updates.
- Wealth inventory and Liabilities: tap **3D**, upload a .glb, rotate, pinch, reset, remove.
- Tell me the phone, browser and what you tapped for anything odd.
