# Trial length: 7 days against 30 (read 31 Oct 2026)

Feeds decision 2 in `docs/MONETISATION_DECISION.md`. Figures marked primary were read on the source page; secondary ones come from search summaries and should be checked before they go anywhere public.

## What the app data says (RevenueCat, 17,000+ apps, 28 Sep 2026, primary)

Source: https://www.revenuecat.com/blog/growth/free-trial-length. Trials are bucketed, so "7 days" sits in the 5 to 9 day group and "30 days" in the 17 to 32 day group. These are trials with a card on file that convert unless cancelled.

| Plan | Trial 4 days or less | 5 to 9 days (a 7-day trial) | 10 to 16 days | 17 to 32 days (a 30-day trial) |
|---|---|---|---|---|
| Monthly: trial to paid | 39.6% | 45.9% | 46.6% | 43.7% |
| Monthly: first renewal of those who paid | 54.2% | 62.8% | 72.0% | **77.5%** |
| Monthly: trial users who paid and renewed | 18.5% | n/a | 30.6% | levels off |
| Annual: trial to paid | 24.0% | n/a | n/a | **44.6%** |
| Annual: first renewal of those who paid | 18.3% | 25.3% | 36.4% | **47.5%** |
| Annual: trial users who paid and renewed | 3.5% | n/a | n/a | **18.5%** |
| No trial at all: first renewal | monthly 49.5%, annual 26.6% | | | |

- Longer trials are associated with more people paying **and** more of them renewing, on both the monthly and the annual plan. RevenueCat's own caveat: this is correlation, and someone still in a trial on day 25 was always more likely to pay than someone who left on day two.
- Short trials have a cancel spike on day 0 to 1: 84% of 3-day trial cancellations and 64% of 7-day cancellations happen then, against about 31% for 30-day trials (State of Subscription Apps 2026, quoted in https://www.revenuecat.com/blog/growth/7-day-trial-subscription-app, primary).
- Trials of 17 to 32 days convert at a median of 42.5% against 25.5% for 4 days or less (same report; already in `benchmarks.md`).
- Category pattern: on monthly plans conversion often peaks in the 10 to 16 day group and dips in the 17 to 32 day group, while renewal keeps rising. For AI apps the longest trials add nothing over 10 to 16 days.
- RevenueCat's worked example for budgeting: YNAB runs a 34-day trial because budgeting needs a full cycle (a payday, bills going out, real behaviour over time). The same article reports a wellness app's A/B test where 14 days beat 7 on trial starts but lost on conversion: people delayed instead of activating.

## What the controlled experiments say (SaaS, not apps)

- Yoganarasimhan, Barzegary and Pani (337,724 users, one SaaS product): 7-day trials beat 30-day trials by 5.6% on conversion, 6.4% on retention and 7.9% on revenue; 14 days was not significantly different from 30. Reported in the RevenueCat article above and in the PMC paper below; figures are secondary (the paper itself was not opened).
- Zhang and Duan, randomised field experiment, 680,588 users, image-editing SaaS, 2023 to 2024, https://pmc.ncbi.nlm.nih.gov/articles/PMC12217587/ (primary): a 7-day trial against a 3-day one raised trial adoption by 11.1% and later conversion by 42.4%, with no change in immediate conversion. Longer trials help when value takes learning to see; they cannibalise when value is obvious in one session.

Both experiments are products where the value shows in a session or two (editing, design). Both authors and RevenueCat say the same thing: the right length is the time it takes the user to see the value, not a default.

## Vault-It

1. **The value takes a pay cycle to show.** A budget needs a payday and the bills after it; a house build needs a few deposits to feel it rise; the net worth graph needs two or three points. That is YNAB's reasoning for 34 days, and the opposite of the one-session products where 7 days won.
2. **No card up front changes the funnel.** The app's trial is planned without a card, so the card-on-file conversion rates above do not transfer directly, and the day-0 cancel spike does not exist. Conversion will be lower than the table; the retention of those who pay is the number to watch.
3. **The annual plan is the one we want people on** (£49.99, 30% off monthly). Annual is where the longest trials win on both conversion (44.6% against 24.0%) and first renewal (47.5% against 18.3%).
4. **Procrastination is the risk of 30 days.** The wellness A/B lost because people delayed. The fix is not a shorter trial but activation nudges in week one (first deposit laid, first debt added, first budget line) and a reminder a week before the trial ends.

**Read:** 30 days, with week-one activation nudges and a day-23 reminder. 14 days is the fallback if the first cohorts show people stop using it after week two. 7 days is wrong for a budgeting app: nobody gets paid twice in a week.
