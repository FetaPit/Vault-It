# House builder Level 2: making it a lifetime habit (Octalysis)

Owner's ask (30 Oct 2026): once a user has saved the deposit, bought, and moved to Level 2 (the mortgage), they should see every payment going in brick by brick, and keep coming back for the 25 years of the mortgage. Use Yu-kai Chou's Octalysis framework.

This builds on the agreed Level 2 rule (`brand/AUDIT_AND_PLAN.md` section 3): the Level 2 house is what is left to pay (price minus deposit goal); every pound of capital repaid lays bricks at `l2Base × 0.77 / bricksTotal`.

## The core idea: take your house back from the bank

On the day of purchase the whole Level 2 house appears as a **translucent hologram: the bank's share**. Every payment turns bricks **solid: your share**. The picture is the balance sheet: solid = equity, hologram = mortgage left.

- The **capital** part of each payment turns bricks solid. The **interest** part does not lay bricks; it shows as a quiet line ("£512 interest this month: the bank's fee"). This is honest and it is the strongest pull towards overpaying, with no nagging.
- The split comes from the user's own deal (rate, balance, term, fix) through the existing mortgage engine. Nothing is guessed; every figure has "Show working".
- With bank linking (see `docs/INTEGRATIONS_SETUP.md`) the monthly mortgage payment is detected and the bricks lay themselves. Without it, one tap: "I paid this month".

## The 8 core drives, applied

Octalysis groups 8 drives. 1 to 3 are "White Hat" (feel good, sustainable); 6 to 8 are "Black Hat" (urgency, used lightly or they cause burnout and resentment). 2, 4 and 6 are extrinsic (left brain); 3, 5 and 7 are intrinsic (right brain). For a money app we lead with White Hat and use Black Hat only where the urgency is real.

| Drive | What it means | In Level 2 |
| --- | --- | --- |
| 1. Epic Meaning and Calling | Being part of something bigger | "Taking your home back from the bank, brick by brick." The mortgage-free date and the deeds as the end of the story. Optional "why": a line or photo of who the home is for |
| 2. Development and Accomplishment | Progress, skill, mastery | Level 2 milestones (10, 25, 50, 75, 100% of the house left to pay, now yours) as named stages: foundations yours, ground floor yours, roof yours, keys and deeds. Badges for 12 payments in a row, first overpayment, £1k, £5k, £10k interest saved. Rows and brick counts always visible |
| 3. Empowerment of Creativity and Feedback | Trying things, seeing the result | The overpayment simulator: drag £50 to £500 a month and watch the house build faster, the mortgage-free date move and interest saved count up, all from their own deal. Remortgage planner at fix end |
| 4. Ownership and Possession | Making it yours | Customise the house as rows become yours: door colour, garden, lights, car on the drive, a name plate. A photo of the real house as a plaque. Optional brick inscriptions: a note on the month's brick ("Maya born") |
| 5. Social Influence and Relatedness | Others, together | Household mode: two people's payments in two colours on the same house. A share card with % owned and bricks, no money amounts unless chosen. Later and opt-in: a street of founders' houses |
| 6. Scarcity and Impatience | Wanting what is limited or not yet here | Only real limits: "£2,140 of this year's penalty-free overpayment left" (most lenders allow 10% a year), the fix-end countdown and the remortgage window. Next customisation unlocks at row n |
| 7. Unpredictability and Curiosity | Not knowing what comes next | Rooms are revealed inside as each floor becomes yours. Seasonal touches (lights in December, the first payment's anniversary). A surprise cosmetic at each milestone, never money |
| 8. Loss and Avoidance | Avoiding losing something | Light touch only. The interest line, honestly shown. "When your fix ends, the standard rate would cost £x more a month": a real cost with a real action (plan the remortgage). A payment streak with a grace month, never guilt copy |

## The four phases of the journey

1. **Discovery** (landing page, the Level 1 house): "Watch your mortgage turn into your home."
2. **Onboarding (the purchase day):** "House purchased" moment (keys, the house flips to the Level 2 hologram), mortgage entered in about 60 seconds (lender, balance, rate, fix end, term). The deposit finished Level 1; Level 2 starts from what is left: "Level 2 is the £80,000 left to pay. Your extra £2,000 already built 2.5% of it." (example figures from the owner's rule)
3. **Scaffolding (the monthly loop, 25 years long):**
   - **Payday build:** on the day the mortgage leaves the account (or the day they choose), a short ceremony: bricks turn solid one after another, gold flash, "+£430 of your home: +124 bricks. Interest £512."
   - **Monthly recap:** % owned, bricks this year, interest saved, mortgage-free date.
   - **Spare money nudge** from the Budget (unassigned plus savings and investments, owner's rule): three what-ifs and the trade-off line.
   - **Milestones and unlocks** every few months so there is always a next thing within reach.
4. **Endgame (mortgage-free and after):** the deeds ceremony, the house in full gold trim. Level 3 (upgrade planner, already built), a new goal (pension, next home, help a child onto the ladder), and the house kept as a lifetime trophy.

## Guard rails (money app, owner's rules)

- Every number from their own inputs, with "Show working". "Illustrative only. Not regulated by the FCA. Not financial advice."
- Overpaying is never pushed. Every suggestion carries: "Money overpaid is not invested or saved. Check your lender's overpayment limit (often 10% a year) and any early repayment charges."
- No made-up scarcity, no fake timers, no guilt or shaming copy, no losing progress for a missed month (a grace month and "life happens" copy).
- Rewards are cosmetic and emotional, never money or financial products.
- Reduced motion turns the ceremonies into a single fade.

## How we will know it works

- Share of Level 2 users who log or auto-detect a payment each month (target: most of them).
- 3, 6 and 12-month return rate after purchase.
- Share who try the overpayment simulator, and who set up an overpayment.
- Median sessions per month after purchase.

## Where it fits in the plan

- **Level 2 fix phase** (next after groupings): the rule, reset and undo purchase, the mortgage cockpit, payday build (manual tap), the bank-versus-you hologram, overpayment what-ifs, milestones.
- **3D house phase:** the brick ceremonies, room reveals, customisation and seasonal touches on all six models.
- **After bank linking is live:** auto-detected payments, household mode, share card.

Sources: [Octalysis summary (Drimify)](https://drimify.com/en/resources/yukai-chou-8-drives-octalysis-model), [Octalysis Framework (University of Zurich)](https://www.gbl.uzh.ch/quartz/definitions/Octalysis-Framework), [Yu-kai Chou, Octalysis](https://yukaichou.com/gamification-examples/octalysis-gamification-framework/).
