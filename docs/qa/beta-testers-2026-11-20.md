# Beta tester journeys, 20 Nov 2026

FAIL at e5d6937 (candidate for "Release e5d6937"), 1 failing check of 92: the new-device tester (lee). Run: `node tests/journey_beta_testers.js` against the local build (Supabase and the profile row are mocked, so no real account and nothing in production was touched). Stand-in accounts only. The row each tester gets is the one the owner chose on 19 Nov: Pioneer, yearly, beta, no end date (`is_pioneer`, `tier=pioneer`, `billing=year`, `plan=yearly`, `paid_until` empty, `is_beta`). Screenshots: `shots/beta-testers/<persona>-*.png` (not committed).

Every tester: opens at the sign-in card, PIN pad straight away (no e-mail code), app opens with no card wall, plan read as "on", no second welcome, name, savings and debts intact, Pioneer mirrored on the device, Pro open, Settings says "You are on Pioneer (yearly)", beta prices right (Vaulter £3.99 a month / £39.99 a year, Pioneer £5.99 a month / £49.99 a year, Lifetime £99, beta ends 31 December 2026), theme kept, no sideways scroll, no page errors.

## iris: iPhone Safari 390 px, repeat visit with a PIN, Night
PASS (17 checks). Signed in, reloaded for the second visit: £6,400 saved, one debt, 3D net worth £5,000 matches the tiles.
Would trip: the Back Vault-It plan cards are hidden on a phone (nav.css:84), so a phone tester never sees the beta prices in the app except in Settings (text only, no cards).

## asha: Android Chrome, installed app, Night
PASS (17 checks). Standalone display mode emulated; sign-in, reload, data and plan as above.
Still needs a human: the real install prompt, opening the installed app offline, and sync after swiping it away.

## dan: desktop 1100 px, Daylight
PASS (18 checks). Back Vault-It opens the plan cards with beta prices (Vaulter £3.99/mo, Pioneer £49.99/yr, Lifetime £99).
Would trip:
- The Back Vault-It button stays in the top bar for an account already on Pioneer and its cards say "START 30 DAYS FREE" and "Your card is taken now". A tester who clicks one is being sold a plan they already have. (`dan-back-vault-it.png`)
- That crowdfund modal shows three cards (Vaulter monthly, Pioneer yearly, Lifetime) while the card wall shows five plans with a Yearly / Monthly switch, and the Vaulter feature lists differ between the two.

## mo: lots of saved data, 390 px, Night
PASS (18 checks). Six debts (£31.8k), £41,250 saved, 24 house builder deposits all intact; debt tab, 3D net worth £9,500 correct.
Would trip: Settings says "You are on Pioneer (yearly). Thank you for backing Vault-It." A tester on a hand-set Pioneer has not paid, so "yearly" and "thank you for backing" can read as if they were charged. (`mo-settings-plan.png`)

## lee: new device, the cloud copy restores, 390 px, Night
FAIL (16 ok, 1 FAIL): `FAIL: lee: the Net worth in 3D matches the saved data, not £0 (Own £0 · Owe £0 · Net worth £0)`.
First load after PIN sign-in on a device with no data: the tiles show the restored figures (net worth £8.7k) but "Net worth in 3D" stays at Own £0 · Owe £0 · Net worth £0 ("Out of the red £0") for at least 7 seconds. It corrects itself after switching tab or reloading. Seen on a stand-in account with the Supabase mock, so confirm on a real second device before treating it as live. Needs its own queue item (`ship-item`); not fixed here. (`lee-dashboard.png`)

## control: signed in, no plan, 390 px, Night
PASS (5 checks). The card wall shows with the beta prices (Vaulter £39.99 a year, Pioneer £49.99, Lifetime £99 once).
Would trip: an "+20 XP · Site Cleared & Surveyed" toast sits on top of the Pioneer card on the wall, covering its name and part of the price. (`control-wall.png`)

## Still needs a human (a real device can show it, this run cannot)
- A real PIN and e-mail code, and a real tester's account after the release SQL (this run never saw the live profile rows).
- Install prompt on iOS and Android, offline open of the installed app, sync timing between two real devices.
- The live build: wait for `e5d6937` on app.vault-it.co (`version.json`), then run `VI_APP=https://app.vault-it.co` only with the owner's yes, since that would touch production sign-in.
