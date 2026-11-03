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

## Round 2 (Pedro, 3 Nov)

Judged against the Apex sheet and the approved mock-up `tokens-r2.png`. Shots: `shots/qc/r2-dash_*`, `shots/qc/r2-tab_*`. Overall it reads like the mock-up: clipped card, stacked edge, stripes, halftone, tick-dial medallion with a brand icon, tier colours kept, thin grid strip, tokens floating over beams and shadows, pad under the stage to work on.

### FIX (blocking)

1. Type floor on the card text. The SVG viewBox is 118 wide, so a card drawn at 100 px scales by 0.847 and the font sizes in `.wt-*` shrink with it. Measured in the browser (rendered px): side name 8.9 at width 100 (and the `textLength` squeeze on names over 11 characters narrows the glyphs further, e.g. THREE IN A ROW, MONTHLY SNAPSHOT, FIRST £1,000), 10.0 on the rank card at 112; stage number or XP label (`wt-tl`) 9.0 at 76 and 9.5 at 80, so the phone stage panel card fails; ladder numbers (`wt-num`) 9.7 at 44. Decision 4 is right on the "100 px and up" idea but the arithmetic ignores the 0.847 scale. Smallest fix, `wrTok` (index.html ~23372): side name only at `px>=118` (and size the rank card at 120), `wt-tl` only at `px>=89`, ladder tokens at 48 px (10.6) instead of 44. Names already sit under the badge cards, so nothing is lost.
2. Phone stage panel header: the "Next up" tag wraps to two lines ("Next / up", box broken) at 390 in both themes (`r2-dash_dark_390.png`). Add `white-space:nowrap` to the tag span at index.html ~25390, or let the header wrap before the tag.
3. Phone rail: the glowing pad under the centred stage crosses the FOUNDATION label (`r2-dash_dark_390.png`, label at y about 831; fine at 1100). The centre coin is scaled up by `fireCarousel`, which scales the pad with it. Smallest fix: keep the pad out of the scaled group or move the phase labels 4 px lower (`H-9` to `H-5`, ~25207).

### Verdicts

- Rail and ground: PASS at 1100, FIX 3 on phone. The ground is thin (56 of 280), grid readable, tokens clearly lifted, dotted tethers for locked ones.
- Card art and states: PASS apart from FIX 1. Chips (tick, dashed wait, padlock, skip) read at 50 px.
- Stage panel: FIX 1 and 2 (phone only).
- Rank card: PASS at 1100 (LV, big 7, SHIELD, step bars); 10.0 px side name covered by FIX 1.
- Ladder: PASS after FIX 1 (numbers).
- Side quests: PASS; squeezed names covered by FIX 1.
- Badge tokens: PASS layout, locked cards clear; side names covered by FIX 1.
- Overview card: not shot this round; the 48 px rank token and 8 badge tokens are generated by the same function, so FIX 1 applies at 48 (wt-num 10.6 is fine there).
- Daylight: PASS. Decision 1 accepted: dark cards on a pale page read as objects, like a coin. Beam, shadow and grid are visible on the light floor; chips and text follow the theme.
- Phone: FIX 2 and 3. The faded neighbour captions on the carousel measure 2.8:1 (Daylight) and 3.0:1 (Night), by design (edge fade); at 1100 they are 5.8 to 5.9:1.
- Decisions 2 and 3 (separate non-scrolling grid with sliding verticals; one-path medallion and two-layer edge, no filters): accepted.

### NITs

1. Medallion icon at 50 px is about 14 px across: readable, but the tick dial is lost. Fine.
2. The beam starts under the name caption, so caption text sits on the beam top. Acceptable.
3. Locked side names (grey on near-black) are very faint; consider `--lock` at 0.8 opacity.
4. Skipped state and the Overview card still lack a shot (see round 1 NIT 1).
