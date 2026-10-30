# Freemium or paid: what the evidence says (read 30 Oct 2026)

Companion to `docs/MONETISATION_DECISION.md`. Each figure says whether it was read on the source page itself ("primary") or only in a search summary of it ("secondary"). The sandbox cannot open every site, so secondary figures should be checked before they go in anything public.

## Conversion: free users rarely pay, trial users often do

| Figure | Value | Source | Status |
|---|---|---|---|
| Download to paid by day 35, hard paywall | median **10.7%**; the floor for hard paywalls is 4.2% | RevenueCat, *State of Subscription Apps 2026* (115,000+ apps, $16B revenue), quoted in https://www.revenuecat.com/blog/growth/hard-paywall-vs-freemium (29 Apr 2026) | primary |
| Download to paid by day 35, freemium | median **2.1%** | same | primary |
| Revenue per install by day 60 | hard paywall $3.09 vs freemium $0.38 (about 8x) | same report, search summary | secondary |
| One-year retention of annual subscribers | freemium 28% vs hard paywall 27%: once someone pays, the model they came through stops mattering | same report, search summary | secondary |
| Trial to paid, Western Europe | median **29.7%**; trials of 17 to 32 days convert 42.5% vs 25.5% for trials of 4 days or less | RevenueCat 2026, already in `benchmarks.md` | primary (27 Oct) |
| Finance apps, day-30 retention | about 9% iOS, 5% Android (AppsFlyer Q4 2025 data in the Liftoff/AppsFlyer 2026 finance benchmark); Adjust's all-category day 30 is about 7% | search summaries only; the Liftoff page could not be opened | secondary |

RevenueCat's own advice in that article: stay with a hard paywall if you are bootstrapped, need cash flow, or do not have the analytics to test feature gating; consider freemium once retention is strong and you have runway to absorb a conversion dip. Growth advisor Phil Carter's two freemium conversions in 2025 went one each way: +75% lifetime value for one app, a 50% drop in subscriber conversion for the other, pulled after two weeks. "Freemium isn't a pricing strategy; it's a product strategy."

## What happened to the free finance apps

- **Mint (US, free, ad and referral funded)**: Intuit closed it in early 2024 after years of neglect. **Monarch (paid only, about $100 a year)** grew its subscriber base **20 times** in the year after the closure was announced and raised $75m at an $850m valuation in May 2025. Its founder, an early Mint product manager, says they charge so they never need card-issuer advertising or to sell data. Source: https://www.nbcchicago.com/news/business/money-report/personal-finance-app-monarch-raises-75-million-despite-nuclear-winter-for-fintech-startups/3752672/ (23 May 2025), primary.
- **Copilot (US, paid only)** passed 100,000 paying subscribers in March 2024 (search summary, secondary).
- **UK**: Money Dashboard (free) closed 31 Oct 2023, "could not find a sustainable business model"; Moneyhub's consumer app closed 31 Jul 2026. Survivors sell a paid tier: Emma Plus/Pro/Ultimate, Snoop Plus, Plum Plus/Boost/Max. Details and sources in `pricing_uk_eu.md`.
- **Willingness to pay in the UK**: Monzo, 1.6m subscribers = 16% of monthly active users (FY2026 report); Emma's CEO says about half its users pay (self-reported). Both in `pricing_uk_eu.md`. A user on Emma's forum mentions a 17% Pro subscription rate; unverified.

## What it means for Vault-It

1. Every free finance app above that died was free *and* carried bank-sync or data costs, and lived on ads or referrals. Vault-It has no bank sync and costs about £0.005 a month per typical user (`cost_to_serve.md`), so a free tier is cheap to run. The risk is not cost; it is that free users almost never convert (2.1%) and the app has no analytics to tune a freemium funnel with (the privacy stance rules out pixels).
2. The paid-only survivors grew by being the trustworthy option after a free one closed. Vault-It's "no bank login, no data selling" position is the same story.
3. Retention after payment is the same whichever door people came through, so the choice is about conversion and simplicity, not loyalty.
4. A free trial of three to four weeks converts best of all the options measured, and needs no card up front.
