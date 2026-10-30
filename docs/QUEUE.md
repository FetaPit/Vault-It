# Work queue (the owner's order)

The single list of instructed work. Every session reads it at start and before each task (`.claude/hooks/queue.sh` prints the open items; the `queue-keeper` agent checks a proposed task against it). Rules:

- Every new request from the owner is added here in the same turn it is made, with the date, before any work starts on it.
- Items are done top to bottom. A newer request does not jump an older one unless the owner says so (then note "owner reordered, date").
- `[ ]` open, `[~]` in progress, `[x]` done (move to Done with the commit). Owner decisions wait under "Waiting on the owner"; they never block the next item.
- A release is a task like any other: add it, then run it; it does not clear the queue.

## Open

- [ ] Subscription pop-up: adjust to the monetisation model once the owner decides (owner's ask, 30 Oct; blocked on the outline above)
- [ ] Net worth 3D viewer (owner, 30 Oct 22:03, queued): stack every credit card in one column, one on top of the other, each keeping its own card colour; a loan is a different kind of debt and gets its own column beside the credit cards (same rule for other debt types); and the dashboard viewport must zoom in and out and orbit, not just turn
- [ ] Mobile navigation (owner, 30 Oct 22:03, queued): on phones the tab icons move to a bar fixed at the bottom of the screen, always visible; and the Integrations tab leaves the menu bar in every view and lives in Settings in the sidebar instead

## Waiting on the owner

- Deploy the branded e-mails: `send-auth-email`, `waitlist-join`, `waitlist-welcome` (templates committed; previews in the session reply). Needs an explicit yes, then `supabase functions deploy <name> --no-verify-jwt` or the Supabase connector
- Monetisation (decision doc `docs/MONETISATION_DECISION.md`, evidence `docs/research/freemium_vs_paid.md`): four answers needed. 1 model: trial then paid (recommended) or Simplified free / Advanced paid; 2 trial length 30 or 14 days; 3 Simplified by default for new accounts and the tab split in section 3; 4 testers: free until beta ends then 30 days' notice, or Founding offer first. Then: pop-up and Settings copy, Simplified/Advanced switch, trial clock with read-only vault, tester welcome message
- Custom welcome message for testers: the wording from the owner (a draft is in the session reply); then wire it to the first run for beta accounts
- Metals price feed (`api.metals.live`): the sandbox cannot reach it (host not in the session's allowed network domains). Check it from a browser, or allow the host in the environment's network settings and ask again
- Brand build on a real phone: speed of the lite fallback and how the 6.8 feedback feels (Settings > House builder > Brand build, or ?house=new)
- Classic switches (house builder, net worth) stay in Settings until the owner has tested the new views on their phone (owner, 30 Oct); remove them only when the owner says so
- Phone test of vault-it.co/sign-up: confirmation e-mail, confirm page, "Remove me" link
- `FROM_EMAIL` sender name in Supabase secrets; add vault-it.co to the Turnstile widget's allowed sites; upgrade Resend before ads
- Night mode: 68 small WCAG AA failures (faded items, white on teal buttons): design call
- Live market value steps 2 and 3 (Land Registry house price index; eBay estimate): yes or no (`docs/LIVE_MARKET_VALUE.md`)
- Poly Pizza: commercial plan and an edge function for live search, or self-host a small CC0 set (`docs/WEALTH_INVENTORY_3D_OPTIONS.md`)

## Done (30 Oct 2026)

- [x] Brand book applied to the e-mail comms: sign-in code, beta list confirm and welcome e-mails share one inline brand shell (Night palette, wordmark with the brick hyphen, tagline, FCA line and trader address in the footer); welcome subject loses its em dash; plain-text footers carry the FCA line (this commit; deploy waits on the owner)
- [x] QA defect 1 (30 Oct): the "light band with invisible text" under the house viewer was the fixed app footer, not the viewer caption; its type was 5.5 px. Footer type now floors at 10 px (FCA line 11 px), wraps to two rows on phones (copyright text hidden there, the logo still names PT Live Design), page and toast clear its height (this commit)
- [x] Copy pass: em dashes reworded across the app (`fa1e069`, 515 to 221; the rest are code comments); `tests/test_copy.js` keeps them out of user-facing text
- [x] QA list (handover section 9) in both themes at 390 and 1100 px, plus 320/360/390/412 scroll probe: `docs/qa/QA_30OCT.md`; two defects noted (Daylight statusline strip, 3D cash stage first frame)
- [x] Level 2 Octalysis slice: purchase-day mortgage entry (lender, balance, rate, fix end, term) feeding the calculator and the panel; three what-ifs from the Budget with the trade-off line (`42471f4`, `tests/test_hb_l2_entry.js`). Still to come later: mortgage cockpit, payday build, bank-versus-you hologram, milestone stages
- [x] Brand build follow-ups: 6.8 feedback (pop-ups, stage flash, milestone toasts after interaction) and the night window glow (`647fae1`; the real-device speed check waits on the owner)
- [x] House builder viewport: the classic hologram viewer is the default again, the brand build stays behind the Settings switch, its fly-in stops at 1.3x (`a4abee3`); not yet released
- [x] Release to production: landing / sign-up brand pass with the brand book hero and the net worth speed run (`release/pioneer-v2` → `5e2f78f`, backup `backup/release-pioneer-v2-20261030-2142`; app files unchanged since `0f527f7`)
- [x] Landing hero revision: the brand book hero copied as is (levels, partially built house, deposit controls, lay buttons, stats, milestone pills), capital Red, pulsing teal "home.", brick counter removed, net worth 3D speed run added; the form moved below the demos with the sticky header button jumping to it (`tests/test_signup_page.js`)
- [x] Landing / sign-up page brand pass: tokens, wordmark and mark, tagline, the brand book's 3D house built to the finished home (pulse, ring, scanlines), Night/Daylight toggle, follow-on pages rethemed (`e7542ff`; `tests/test_signup_page.js`)
- [x] Release to production for the owner's install test (`release/pioneer-v2` → `0f527f7`, backup `backup/release-pioneer-v2-20261030-2037`): installable app and offline shell, One B, 3D views on by default, brand build, Level 2 rule, live value step 1, partial-state fix, chart redraw fix
- [x] Cross-device readiness for the owner's test (31 Oct): real service worker and manifest (installable, shell opens offline), One B tester agent, `tests/journey_one_b.js`, `tests/test_sw.js`, `docs/qa/TEST_DAY.md` (`04e58dd`); One B's first report in `docs/qa/`
- [x] A saved state missing a metal blanked total assets, net worth, the KPIs and the 3D tag to £0: metals are now filled in at load (`tests/test_partial_state.js`)
- [x] Owner's answers: both 3D views on by default (classic in Settings for a week; remove the switches after 6 Nov), camera closer on phones in the brand build, ring ping from 5%, net worth card with 3D as the main view and the chart as the backup
- [x] No animation seen on the owner's phone: the slow-device lite switch tripped during warm-up (now judged after 3 s, keeps the pulse and ring), `?house=new` now sticks on the device; "Lay the bricks" moved under the viewport (`tests/test_hb_brand.js`, `test_groupings`)
- [x] Brand book build animation and look on all six house models, behind `?house=new` (`ac6aab0`, `850d989`, merged `8951112`; scanlines added after)
- [x] Net worth in 3D on the Overview (£1,000 blocks, £100 cubes, debts in lender colours) with a 3D blocks | Graph toggle on the main chart, behind `?nw=new` (`509844c`, merged `3d94b78`)
- [x] Release to production: brand phases 1 to 8, Daylight AA, item 3D viewer, Debtors, physical cash, 3D cash and metals; migration 009 and `waitlist-join` live (`8492fbc`)
- [x] FCA line on the sign-up pages (`753cccd`)
- [x] Live market value step 1: metal by weight and purity, link to a holding (`ab7cb41`)
- [x] House builder stuck in Level 2: reset and "Not bought yet" return to Level 1 (`e8b71a9`); Level 2 owner's rule (`66eaaa2`)
