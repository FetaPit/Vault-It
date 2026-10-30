# Work queue (the owner's order)

The single list of instructed work. Every session reads it at start and before each task (`.claude/hooks/queue.sh` prints the open items; the `queue-keeper` agent checks a proposed task against it). Rules:

- Every new request from the owner is added here in the same turn it is made, with the date, before any work starts on it.
- Items are done top to bottom. A newer request does not jump an older one unless the owner says so (then note "owner reordered, date").
- `[ ]` open, `[~]` in progress, `[x]` done (move to Done with the commit). Owner decisions wait under "Waiting on the owner"; they never block the next item.
- A release is a task like any other: add it, then run it; it does not clear the queue.

## Open

- [ ] House builder brand build follow-ups (from the 30 Oct review): section 6.8 feedback ("+£5 · +4 bricks" pop-ups, stage flash, milestone toasts), the camera framing the house closer on phones, a radial window glow at night, and a real-device speed check of the lite fallback
- [ ] Owner's phone check of both, then switch the new 3D on by default (old builder reachable from Settings for a week) (audit plan phase 12)
- [ ] Level 2 Octalysis slice still open: real mortgage entry at purchase, overpayment what-ifs in the Level 2 panel (`docs/HOUSE_BUILDER_LEVEL2_GAMIFICATION.md`; the build rule, payments, reset and undo were done 30 Oct)
- [ ] Sign-up page brand pass and a service worker that registers (today's is a `blob:` URL browsers refuse), cache version bump (audit plan phase 13)
- [ ] Copy pass: em dashes in `index.html` (about 500) and `landing.html` (15), reworded not blind-replaced
- [ ] Full suite plus the QA list (handover section 9) in both themes at 390 and 1100 px, then release when the owner asks
- [ ] Check the metals price feed (`api.metals.live`) from the preview; replace it if dead (needed by linked metal items)

## Waiting on the owner

- Phone test of vault-it.co/sign-up: confirmation e-mail, confirm page, "Remove me" link
- `FROM_EMAIL` sender name in Supabase secrets; add vault-it.co to the Turnstile widget's allowed sites; upgrade Resend before ads
- Night mode: 68 small WCAG AA failures (faded items, white on teal buttons): design call
- Live market value steps 2 and 3 (Land Registry house price index; eBay estimate): yes or no (`docs/LIVE_MARKET_VALUE.md`)
- Poly Pizza: commercial plan and an edge function for live search, or self-host a small CC0 set (`docs/WEALTH_INVENTORY_3D_OPTIONS.md`)

## Done (30 Oct 2026)

- [x] No animation seen on the owner's phone: the slow-device lite switch tripped during warm-up (now judged after 3 s, keeps the pulse and ring), `?house=new` now sticks on the device; "Lay the bricks" moved under the viewport (`tests/test_hb_brand.js`, `test_groupings`)
- [x] Brand book build animation and look on all six house models, behind `?house=new` (`ac6aab0`, `850d989`, merged `8951112`; scanlines added after)
- [x] Net worth in 3D on the Overview (£1,000 blocks, £100 cubes, debts in lender colours) with a 3D blocks | Graph toggle on the main chart, behind `?nw=new` (`509844c`, merged `3d94b78`)
- [x] Release to production: brand phases 1 to 8, Daylight AA, item 3D viewer, Debtors, physical cash, 3D cash and metals; migration 009 and `waitlist-join` live (`8492fbc`)
- [x] FCA line on the sign-up pages (`753cccd`)
- [x] Live market value step 1: metal by weight and purity, link to a holding (`ab7cb41`)
- [x] House builder stuck in Level 2: reset and "Not bought yet" return to Level 1 (`e8b71a9`); Level 2 owner's rule (`66eaaa2`)
