# Vault·It: creative direction for the tester release

From the executive creative director, fintech brand. This sits on top of `vault-it-brand-handover.md` and the brand book. Where they disagree, this file wins. Open questions are at the end; anything marked **(pending)** waits for the owner's answer.

## The idea

**Money you can see, orbit and build.** Every pound saved lays a brick. Every pound owed sits below the ground. The person should feel progress before they read a number.

This is the last build before testers. It has to feel finished, calm and trustworthy, with one moment of delight per action. It must never feel like a game that hides the maths.

## Five rules for every screen

1. **One hero per screen.** Show one 3D scene and one number that matters. Everything else supports it.
2. **Group what moves together.** If changing one control changes another figure, they live in the same card. Nothing is removed, only regrouped.
3. **Every action answers three ways within 250 ms:** something moves, a number changes, a short line confirms.
4. **Honest maths, visible.** Every figure comes from the user's own inputs and can be expanded to "Show working". Never a made-up number. Never advice: "Illustrative only. Not regulated by the FCA. Not financial advice."
5. **Calm by default.** Neon is a hairline, never a floodlight. Pulses are felt, not seen at first glance. `prefers-reduced-motion` turns them off.

## 1. Navigation

- **Eight tabs:** Overview, Budget, House builder, Assets and liabilities, Debt tracker, Entrepreneur, Achievements, Connections. **Network is hidden for now.** Its code stays so it can return.
- **Active tab: a thin neon outline in that tab's colour.** One pixel, rounded, soft glow in Night and a crisp line in Daylight. Only the selected tab is outlined.
- **House builder is never highlighted unless selected.** Today it has a permanent gold underline. Remove it and show its importance with the USP badge only.
- **Phone and tablet: icons only, compact mode on by default.** Each icon has an accessible name and a long-press or hover label. A setting switches to **wide mode** (icon plus label), remembered per device.
- **Desktop:** wide mode by default, compact available.
- **Night and Daylight toggle** in the header, always visible. On the first visit it follows the device, then remembers the choice. It never switches by time of day.

## 2. Overview: the dashboard

The home screen answers one question: **am I getting out of the red?**

- **Hero: net worth in 3D.** The tracker from the brand book (section 6.12) is the first thing on screen. It has a **Graph | 3D blocks** toggle in the top corner, with range (All, 1Y, 6M, 3M) and series (Net worth, Debt, Income, Forecast) beside it. Both views use the same numbers, and the tag totals always match. The view last chosen is remembered. Default view: **(pending, Q2)**.
- Above the plane, what you own (£1,000 blocks, £100 cubes, nine cubes merge into a block). Below it, what you owe, in red. The gold zero plane reads NET WORTH, IN THE RED or OUT OF THE RED.
- **Under the hero, one stat strip:** net worth, total debt, monthly surplus, deposit progress. Each figure links to its tab.
- **One "own and owe" card** replaces the three summary cards (assets, liabilities, debt).
- **Goals and Snapshots** share one card as tabs.
- **One "next best step" line,** worked out from their own numbers. For example: "Debt-free in 14 months at your current plan." It is never advice.

## 3. House builder

### Look and motion: the brand book is the target

The brand book's 3D house beats the current one. Match it exactly:

- **Opening build.** On first view the house builds from the empty plot to the saved percentage: site boundary, foundations, then bricks course by course, with timbers, tiles, glazing and lights at their stages.
- **Laying bricks on every deposit.** Each new brick drops in, flashes gold and settles to teal, one after another along the course. The last brick stays ringed and numbered (BRICK #5,078). The stage border flashes gold and "+£50 · +39 bricks" floats up. A deposit worth less than one brick says "0.4 of a brick".
- **Environment.** Ground grid fading to the edges, ground glow, dashed site boundary, ring ping every 2.8 s, sweep band rising through the model, and scanlines in Night or a blueprint grid in Daylight. The house drifts in a slow auto orbit that stops on touch.
- **The gold slice and tag:** ROW n / 154 and x.x% OF DEPOSIT. The row, brick count and percentage always agree.
- **Brick value** comes from their own price and deposit: `depositTarget × 0.77 / bricksTotal`. It is shown beside the inputs ("each brick = £1.28").
- How this reaches all six house types **(pending, Q1)**.

### One "Your house plan" card

Type, price, deposit %, floor (flats only), the amount to add, and the brick value, together. Changing any of them re-lays the house straight away.

### Levels

**Level 1: First deposit (hologram).** Progress = saved ÷ deposit goal. At 100% the user confirms **House purchased**.

**Level 2: Delete the mortgage (full colour).** What is left to pay is the whole Level 2 house.

- Example: £100,000 house, 20% goal = £20,000, so £80,000 is left. That £80,000 is 100% of the Level 2 house.
- Money above the goal carries over: £2,000 extra builds 2,000 ÷ 80,000 = 2.5% of it, in full colour.
- After purchase, each mortgage payment or overpayment lays Level 2 bricks at `£80,000 × 0.77 / bricksTotal` each.

**Level 2 cockpit.** The mortgage engine already exists; wire it in and make it clear.

- **Their deal:** rate, type (fixed, tracker, variable, offset), fix length and the rate after it, term, repayment or interest-only, start date, fees, current balance and value.
- **Outputs:** payoff date, total interest, equity now and in 1, 5 and 10 years. Each has "Show working".

**Overpayment suggestions, from the Budget.**

- Read what is left after the Budget is complete: the unassigned amount plus what goes to savings and investments.
- Offer three what-ifs (a quarter, half and all of the spare, rounded to £10) plus a custom amount.
- Each one reads: "£200 a month over: +n bricks a month · mortgage-free x years y months sooner · £z less interest", all calculated from their deal.
- Always show the trade-off line: "Money overpaid is not invested or saved. Check your lender's overpayment limit (often 10% a year) and any early repayment charges."

**Reset, done properly.**

- **Reset house builder** returns to a clean Level 1: deposits, purchase, mortgage, valuation and upgrade plan are all cleared after a clear confirm, with a backup kept on the device.
- **Undo purchase** goes back to Level 1 but keeps the deposits.
- If deposits are removed so savings fall below the goal, the app goes back to Level 1 on its own.

### The other cards, grouped (approved)

- **Progress:** bar, bricks, tiles, remaining and the milestone strip.
- **History:** streak, log and reset.
- **Your own design:** upload and AI, collapsed by default.

## 4. The other tabs, grouped (approved)

- **Debt:** one stat strip; histogram and breakdown as one chart with a toggle; strategy and interest cost together.
- **Assets:** metal holdings with the live price beside each.

## 5. Brand system (from the handover, unchanged)

- **Tokens, Night and Daylight.** Daylight is a designed mode: paper ground, ink text, white panels with corner brackets, and blueprint 3D.
- **Fonts:** Syne, DM Sans and Share Tech Mono only. Icons come from the sprite with a 1.1 hairline. The colour code applies: gold means now, brass means achievement, teal means built or owned, red means owed, green means cleared.
- **Wordmark:** Vault·It with the brick separator. Tagline: **Get out of the red and into your home.**

## 6. Done means

- The QA list in handover section 9 passes in Night and Daylight at 390, 768 and 1100 px.
- Nothing scrolls sideways at 320 px.
- With WebGL off, a flat fallback still shows the house and the chart.
- No new outside hosts.
- Level 2 tests pass:
  - £2,000 over the goal on £100,000 at 20% = 2.5%.
  - A reset returns to Level 1.
  - A payment after purchase moves the house.
  - The overpayment what-ifs match the engine to within £1.
- Saved data from today's app loads untouched.

## Open questions (owner)

1. **House types and the new 3D house.** The brand engine draws one house (one shape, 154 courses). The app has six types: terraced, semi, detached, manor, flat and apartment, with floor choice for flats. Options:
   - **a. (recommended)** Bring the brand look and every animation (brick drop, gold flash, last brick ring, slice and tag, pulse, grid, ping, sweep, Daylight blueprint) onto all six of the app's to-scale models. One look everywhere and no type is lost.
   - **b.** Use the brand house for terraced, semi and detached, and keep the current models for manor, flat and apartment. Faster, but two looks.
   - **c.** Use the brand house for every type. Flats and the manor would look like a house.
2. **First view on Overview:** 3D blocks or Graph? Recommended: **3D blocks** on first open, then whatever they last chose.
3. **Compact mode:** icons-only menu only, or tighter spacing across the whole app too? Recommended: **both**, with wide mode restoring labels and roomier cards.
4. **For testers:** should the new 3D house and net worth scene be **on by default** (old version reachable in Settings for a week), or stay behind the test switch until you have checked them on your phone? Recommended: **on by default for testers**, once you have signed it off on your phone.
