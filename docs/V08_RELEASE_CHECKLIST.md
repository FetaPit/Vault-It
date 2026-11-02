# Vault·It v0.8 — merge order and release checklist

Draft from session summaries, 2 Nov 2026. I couldn't see GitHub, so every SHA and merge state below is unverified. David to confirm.

## Merge order (into `candidate/v0.8`)

F2 changes layout everything else sits on, so it goes first.

| # | Branch | Head | Why this slot | Check before merge |
|---|--------|------|---------------|--------------------|
| 1 | `v08/type-scale` (F2) | `394e1df` | Shared layout change. Fixes the 3D zoom buttons sitting under Feedback. | CI green. Before/after sheets look right. |
| 2 | `v08/chrome` (E2) | `dfb652e` | Test-only footer flake fix. F2 also edits that test, so expect a small conflict. Summary says it's already on candidate, so check first. | Footer test passes 3 of 3 stress runs. |
| 3 | `v08/forecast-rates` (C2) | `2bf8669` | Held "after F2". | Forecast note is 5 lines at 390px. Tests and QC pass. |
| 4 | `v08/cards` (D2) | `dbc1a25` | Already merged with candidate, so it should be a no-op or fast-forward. | Stale 🔑 gone (`908b2b8`). |
| 5 | `v07/final-fixes` (B2) | `c017efc` | Badge and ghost pills. Pedro approved. Doesn't touch F2 areas. | Badge reads clearly at 390 in both themes. |
| — | `v07/engine` | — | David said no more pushes. Confirm it's already in. | — |

After each merge: run the suite and fix on the candidate branch before the next one.

## Checklist

**Before testing**
- [ ] F2 CI green
- [ ] Merges 1 to 5 done, in order
- [ ] Full suite on merged `candidate/v0.8`
- [ ] Phone check at 390px: Overview, House, Cash flow, Budget, Forecast, Feedback button
- [ ] Desktop check at 690px and 1100px (Feedback vs 3D controls)
- [ ] Night and Daylight themes

**Brand and copy**
- [ ] Pedro's notes in `docs/briefs/V08_PEDRO_REVIEWS.md` (`0bd9848`) all closed
- [ ] One batched Pedro pass on the merged candidate, not per branch

**Decision needed**
- [ ] PostHog: ship in 0.8 or park for 0.9. Needs your explicit yes/no. If yes: consent gate, `eu.i.posthog.com`, privacy notice naming PostHog, IP anonymisation confirmed. Work is on `ops-posthog-utm`.

**Release commit**
- [ ] Footer version: "Vault·It v0.6 Alpha · Released 28 May 2026" to v0.8 and the release date (`index.html` line ~10218)
- [ ] Tag `v0.8`
- [ ] Push per David's release process (`release/pioneer-v2` is the deploy branch)
- [ ] Smoke test the live app after deploy

**After**
- [ ] Archive the finished v0.8 sessions
- [ ] Note what slowed this round for 0.9

## Process changes for 0.9
- Merge shared-layout changes first, then branch the rest from them.
- Sonnet for test-only and copy fixes. Fresh session per item.
- Batch Pedro's review once per candidate.
