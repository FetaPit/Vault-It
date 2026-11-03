# Wealth Roadmap: creative review (Pedro, 3 Nov 2026)

Evidence: shots/qc/wr-dash_*, wr-full_*, wr-tab_* (Night and Daylight, 390 and 1100), plus a 2x crop of the rail. `test_wealth_roadmap` and `test_roadmap` pass (no sideways scroll, no text under 10.5 px at 390, no page errors).

## Verdicts

| Area | Verdict |
|---|---|
| Rail tokens and states | PASS (NIT 1, 2) |
| Stage panel steps | PASS |
| Rank card and reward | FIX 1 |
| Next steps | PASS |
| Side quests | PASS (NIT 3) |
| Ladder | PASS (NIT 4) |
| Badge tokens | PASS (NIT 5) |
| Daylight | PASS |
| Phone | PASS |

## FIX (blocking)

1. Days of use can be farmed with two devices. `checkStreak()` (index.html ~27706) compares against `localStorage vi_last_visit`, which is per device, then does `days + 1`. The phone and the laptop each add one on the same calendar day, so "30 different days" can be reached in about 15. Smallest fix: keep `achState.wr.last` (YYYY-MM-DD, synced with the rest of `wr`) and only add a day when it differs from today. Keep the `Math.max(..., streak)` line out, or it can jump the count.

## Departures judged

1. Dark slate rim with tier edges: accepted. Lit and unlit studs read clearly at 52 px and 64 px (crop checked). Measured contrast of tier colour on the rim, Night: lock 5.1, teal 7.2, purple 4.7, brass 7.0. Daylight (rim is light slate #C6CFCA): lock 6.4, teal 5.4, purple 5.4, brass 5.4, amber 5.4, green chip 5.4. All clear 3:1.
2. Coin spin plus static halo, no pulse: accepted. No new endless animation, reduced motion untouched.
3. Ribbon on the rank token only, HTML text in cells: accepted, better for the type floor.
4. Free month on app-open days, habits on the House Builder streak (3, 6, 12): accepted, subject to FIX 1.
5. One-time toast, no banner: accepted.
6. Pro question moot: accepted.

## Measured and clean

- No em dash in any user-facing string (one in an HTML comment at the roadmap card, harmless). No "lost", "failed", "epic", "legendary" in new copy.
- Ids: one gradient per tier (`wtg-*`), no per-token ids. Tokens inline their polygons rather than `<use>`: heavier than the brief, fine at 30 tokens.
- FCA line present at the foot of the tab and under the dashboard card.
- Level 7 of 20 with 1,210 XP in the seed; reward bars read 7 of 8 and 1 of 30 days.

## NITs (can wait)

1. Skipped state could not be shown in a shot (`fireSkip` on later stages did not redraw them). Only the legend glyph is verified. Add a skipped token to `test_wealth_roadmap` or a shot next round.
2. Starter tier studs (grey on slate) are the weakest lit and unlit pair, 5.1:1 at Night. Fine, but the least obvious.
3. "Three in a row" (`repeat`) and "Budget kept" (`flow`) are two near identical looping arrow glyphs at 44 px. Give one a different shape.
4. Ladder on phone lists all five ranks open, about 1,000 px tall. The brief asked for an accordion with the current rank open.
5. Earned Starter badge cells and locked ones are both grey, separated only by the padlock and the "Earned" line. Consider a small tick chip on earned cells.
6. The first-open toast ("Your level now counts roadmap steps...") also fires for a brand new user who earns XP in their first session. Gate it on an existing `achState.xp > 0` from before this release.
7. Badge named "£75,000 Strong" next to a tier called Strong reads oddly. Existing name, left alone.
