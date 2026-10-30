# Monetisation: the decisions for Pete (30 Oct 2026)

Short version: **charge after a free trial, don't run a permanent free tier, and make "Simplified vs Advanced" a view everyone can switch, not a price tier.** Testers stay free for the beta. Prices stay as decided on 29 Oct (£5.99 a month, £49.99 a year, Founding Member £149 once, 100 places). Evidence with sources: `docs/research/freemium_vs_paid.md`; prices and market: `docs/OFFER_AND_PRICING.md`.

Nothing changes in the app until you answer the four questions at the end.

## 1. Where the app is now

- **Free tier as coded**: 3 assets, 2 liabilities, 1 debt (`FREE_LIMITS`). Pro-gated: the house build itself (free users see a 4% build, deposits still save), Entrepreneur tab, Achievements (blurred), Net worth history, own 3D design and AI model generation, export and projections (Settings copy). Metals, cash flow and the 3D net worth are not gated.
- **The pop-up** (`#pro-offer-modal`) shows Free / Pro / Founder. Its Free column lists "House builder, Entrepreneur, NW History, 3D Vault" as free, which contradicts the gates above. Stripe: the monthly link is live; the annual and Founding links are blank, so those buttons say the plan opens shortly.
- **Paid status** is set on the device (`vi_pioneer` / `is_pioneer`), so it is self-declared until a Stripe webhook exists.
- **Cost**: about £0.005 a month per typical user; fixed costs about £37.50 a month before VAT once on Supabase Pro, Workers Paid and Resend Pro. The AI screenshot reader is the only cost that grows (capped monthly: free 3, Pioneer 30, Founder 10).

## 2. Freemium or not

What the evidence says (details in the research note):

- Free users convert at a median of **2.1%** by day 35; a hard paywall converts **10.7%**, and even the weakest hard-paywall apps (4.2%) beat the freemium median. Once someone pays, one-year retention is the same either way (28% vs 27%).
- RevenueCat's advice to bootstrapped teams without analytics is to keep the paywall. Freemium is "a product strategy, not a pricing strategy": one app gained 75% lifetime value from it, another lost half its conversions in two weeks.
- Every free finance app that closed (Mint, Money Dashboard, Moneyhub) was free and ad, referral or data funded. The ones growing (Monarch 20x after Mint closed, Copilot 100k subscribers) are paid only and sell trust: no ads, no data selling. That is Vault-It's pitch too.
- A three to four week trial converts best of everything measured (42.5% trial-to-paid for 17 to 32 day trials; Western Europe median 29.7%).

**Recommendation: trial, then paid. No permanent free tier.**

- Everyone gets **30 days of the full app, no card**. After that: Pioneer (£5.99 / £49.99) or Founding Member (£149 once).
- The trial ends into a **read-only vault**, not a locked door: all data stays on the device and in the cloud, every tab still opens, the numbers still show. Only adding and editing stop. This honours "never clear data on a user's device" and keeps the app honest.
- **Testers**: free for the whole beta, as promised on the sign-up page, and first look at the Founding offer. A `beta` flag on the profile, not the trial clock.
- Why not freemium: it halves the chance of ever charging, needs funnel analytics we have chosen not to collect, and the free tier as coded already sends mixed signals (the house that builds, our one real hook, is the thing free users cannot see). Devaluing is the lesser risk; the bigger one is spending the beta tuning a free tier instead of the product.

**If you want a free tier anyway (option B)**: make Simplified mode the free product and Advanced the paid one, with the house builder fully visible in both (never gate the hook). Expect roughly 2 in 100 free users to pay. The pop-up and limits would follow the Simplified list below.

## 3. Simplified vs Advanced: a view, not a tier

The tester feedback was about too much on screen, not about price. So: a **Simplified / Advanced switch in Settings and in the welcome flow** (new accounts start Simplified), remembered per account and synced. Nothing is removed from the data; Advanced just shows more.

| Tab | Simplified shows | Advanced adds |
|---|---|---|
| Overview | Net worth number and graph, the three KPIs, next milestone | 3D net worth blocks, journey map, net worth history, full KPI grid |
| Budget | Income, spending by bucket, what's left | Sankey flow and the per-line spending analysis |
| House builder | Level 1 bricks, deposit target, Lay the bricks, milestones | Level 2 mortgage what-ifs and calculator, Level 3 upgrade, own 3D design, AI model |
| Debt tracker | Creditors list, payoff plan, one chart | Debtors sub-tab, histogram, donut, tree map, loan tiles |
| Assets and liabilities | Cash and liabilities sub-tabs | Stocks, crypto, metals and other sub-tabs; live prices; AI screenshot reader |
| Achievements | Hidden | Shown |
| Entrepreneur | Hidden | Shown |
| Connections | Hidden (moves to Settings anyway, queued) | Shown in Settings |

Five tabs in Simplified, the full set in Advanced. This is the same list I would use for option B's free tier, so the decision on 2 does not change the build.

## 4. What sits outside Pro altogether

Pro (Pioneer or Founding) is the whole app. These stay outside every plan, paid for separately or by the user's own key, because their cost is open-ended:

- AI screenshot reads above the monthly allowance (optional top-up packs).
- AI 3D house generation: user's own Meshy key only.
- Premium data feeds if we ever add them.
- Bank sync: not planned; it is the cost that sank the free apps.

Say so next to the Founding price, as agreed on 29 Oct.

## 5. Prices: no change, two notes

- £5.99 a month and £49.99 a year sit at the top of the UK entry band (Snoop Plus is £5.99 / £47.99 and includes net worth). Founding £149 is 3x annual, inside the evidenced lifetime band.
- Create the £49.99 and £149 Payment Links before the trial clock goes live, or the end-of-trial screen has nothing to sell. The £149 link needs Stripe's payment limit set to 100.
- VAT: revisit the annual price (£59.99) at registration.

## 6. Your four decisions

1. **Model**: trial then paid (recommended), or option B (Simplified free, Advanced paid)?
2. **Trial length**: 30 days (recommended), or 14?
3. **Simplified by default for new accounts**, Advanced for existing ones? And is the tab split in section 3 right?
4. **Testers**: free until beta ends, then 30 days' notice before their trial clock starts? Or Founding offer first, then the clock?

Once answered I will: rewrite the pop-up and Settings copy to match (queued), build the Simplified/Advanced switch, add the trial clock and read-only state, and write the tester welcome message around it.
