# Monetisation: the decisions for Pete (30 Oct 2026)

Short version: **charge after a free trial, don't run a permanent free tier, and make "Simplified vs Advanced" a view everyone can switch, not a price tier.** Testers stay free for the beta. Prices stay as decided on 29 Oct (£5.99 a month, £49.99 a year, Founding Member £149 once, 100 places). Evidence with sources: `docs/research/freemium_vs_paid.md`; prices and market: `docs/OFFER_AND_PRICING.md`.

Nothing changes in the app until you answer the four questions at the end.

## 1. Where the app is now

- **Free tier as coded**: 3 assets, 2 liabilities, 1 debt (`FREE_LIMITS`). Pro-gated: the house build itself (free users see a 4% build, deposits still save), Entrepreneur tab, Achievements (blurred), Net worth history, own 3D design and AI model generation, export and projections (Settings copy). Metals, cash flow and the 3D net worth are not gated.
- **The pop-up** (`#pro-offer-modal`) shows Free / Pro / Founder. Its Free column lists "House builder, Entrepreneur, NW History, 3D Vault" as free, which contradicts the gates above. Stripe: the monthly link is live; the annual and Founding links are blank, so those buttons say the plan opens shortly.
- **Paid status** is set on the device (`vi_pioneer` / `is_pioneer`), so it is self-declared until the Stripe webhook goes live (built 31 Oct, section 11).
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
2. **Trial length**: 30 days (recommended), or 14? Evidence in `docs/research/trial_length.md`: longer trials win on both conversion and renewal in the app data, most of all on annual plans; 7-day trials only win for products whose value shows in one session, and a budget needs a payday and a round of bills to show its value (YNAB runs 34 days for that reason). The risk with 30 days is people putting it off, so week-one activation nudges and a day-23 reminder go with it.
3. **Simplified by default for new accounts**, Advanced for existing ones? And is the tab split in section 3 right?
4. **Testers**: free until beta ends, then 30 days' notice before their trial clock starts? Or Founding offer first, then the clock?

Once answered I will: rewrite the pop-up and Settings copy to match (queued), build the Simplified/Advanced switch, add the trial clock and read-only state, and write the tester welcome message around it.

## 7. Decided by Pete (31 Oct 2026)

1. **Trial then paid.** 30 days of the full app, no card, then a prompt to choose a paid tier. Testers get the same prompt once their 30 days are over (the sign-up page's "free while it's in beta" line and the tester guide need to match this before it goes live).
2. **30 days**, with week-one activation nudges and a day-23 reminder.
3. **Simplified by default** for new accounts, Advanced for existing ones; tab split as section 3.
4. **Release** the current state first; the trial clock, pop-up and mode switch follow as queued work.

Welcome message for testers, agreed: "Welcome to the Vault-It beta. It's free while we test. Type your numbers in, made-up ones are fine, and watch your deposit build your house. Anything confusing or broken, tell me. Your feedback decides what gets built next. Pete" (the first sentence changes to the 30-day wording once the trial clock is live).

## 8. Feature questionnaire, answered by Pete (31 Oct 2026)

Model: **tiers plus a view switch.** The tier (Vaulter or Pioneer) decides what you can use; Simplified / Advanced is a separate view anyone can switch, and new accounts start Simplified. Everyone gets 30 days of the full app first (section 7).

**Names.** First tier **Vaulter**. Paid tier **Pioneer**, £5.99 a month or £49.99 a year. **Founding Member** £149 once, 100 places, testers first.

**Monthly against yearly: yearly gets extras.** Yearly-only perks: own 3D design and AI house model, early access to new features with roadmap voting, and the extra house types (manor, detached and the premium models). Everything else in Pioneer is the same on both.

| Feature | Vaulter (first tier) | Pioneer |
|---|---|---|
| Overview KPIs, net worth in 3D with the graph toggle, goals and snapshots, roadmap, cash flow, own and owe | Yes | Yes |
| Net worth history (wizard, monthly points, restore) | No | Yes |
| Budget: income, buckets, savings and investments, Sankey, per-line analysis | Yes, all | Yes |
| House builder Level 1: pick a house, deposit target, lay bricks, full build | Yes | Yes |
| House builder Level 2 (mortgage) and Level 3 (upgrade) | No | Yes |
| Own 3D design, AI house model | No | Yearly only |
| Extra house types (manor, detached, premium models) | No | Yearly only |
| Assets and liabilities: every sub-tab, no item caps | Yes | Yes |
| Live prices (crypto, metals, stocks) | Yes | Yes |
| AI screenshot reader | 3 a month | 30 a month (Founding 10) |
| Debt tracker: list, payoff order and date, charts, debtors, no debt cap | Yes | Yes |
| Achievements | Yes | Yes |
| Entrepreneur | No | Yes |
| Download my data | Yes | Yes |
| Projections and forecast, version history and restore, Connections | No | Yes |

The old caps (3 assets, 2 liabilities, 1 debt) go. The house build is never behind the paywall.

**Simplified view (the default), tile by tile.** Advanced shows everything the tier allows.

- Overview: all five KPIs in one row (two rows on phones); the net worth in 3D card with the graph toggle; the financial freedom roadmap; an achievements card (badges and streak) instead of a tab. Goals and snapshots, cash flow and own and owe wait for Advanced.
- Budget: every section, each collapsed by default, with the Sankey at the top and a flow animation (reduced motion respected).
- House builder: the viewport with Add to your savings, and Your house plan. The level panel (progress, bricks, XP, streak, milestones) and History wait for Advanced.
- Assets and liabilities: every sub-tab.
- Debt tracker: everything (KPIs, your plan, debt cards with Pay, charts and debtors).
- Achievements: a card on the Overview in Simplified; the tab appears in Advanced.
- Entrepreneur: Advanced and Pioneer only.

**Build order from this.** 1 trial clock and end-of-trial prompt; 2 pop-up and Settings copy with Vaulter / Pioneer monthly / Pioneer yearly / Founding Member columns and the yearly extras named; 3 the gates above replace the old caps; 4 Simplified / Advanced switch with the tile list above; 5 the achievements card on the Overview; 6 the tester welcome message.

## 9. Decided by Pete (31 Oct 2026, afternoon)

- **Vaulter is the read-only state after the 30 days**, not a free tier and not a cheaper paid tier: everything built stays visible, the cloud copy and Download my data keep working, adding and editing wait for a plan. The pop-up shows it as the £0 column.
- **Beta testers pay £2 a month and £28 a year less**: Pioneer £3.99 a month or £21.99 a year, shown with the full price struck through. Founding Member stays £149. While the app is in beta every account counts as a tester (`VI_BETA_OPEN`); the secure paid gateway (queued) adds a real tester flag on the profile.
- **Stripe (live account PT Live Design), created 31 Oct through the Stripe connector**: see the table in `docs/OFFER_AND_PRICING.md`. The old £59.99 yearly link is switched off; the monthly link now returns buyers to the app with `?upgraded=1` (it pointed at `?paid=1`, which the app never read).
- **Secure paid gateway: yes.** Paid status will be set by a Stripe webhook into `profiles` through a new edge function, with the client's write access to `is_pioneer` revoked. Until then the device flag stands. Queued after the open items.

## 10. Decided by Pete (31 Oct 2026, afternoon, second round)

- **An ended (read-only) account sees everything.** Net worth history, house Levels 2 and 3, Entrepreneur, projections, version history and Connections all stay visible after the 30 days; only editing stops. So there are no Pioneer-only locks on features: the real gates are the paid-only design tools and the AI reader allowance.
- **House types: all six preset models (terraced, semi, detached, manor, flat, apartment) for everyone**, trial and Vaulter included. **Uploading your own 3D design or generating one with AI needs a paid plan** (Pioneer monthly, Pioneer yearly or Founding Member), including during the trial. Those two buttons only appear in Advanced mode.
- Earlier buyers with no plan recorded count as paid. The yearly extras that remain are early access and roadmap voting.
- **House builder look: the screen recording is the target.** The brand build switches ON by default (the classic viewer stays as the Settings switch); the remaining gaps (control buttons in a row at the top right, caption text) are fixed in the house style item.
- **Secure paid gateway:** every address confirmed on the waitlist is a beta tester; Pete reconciles paid profiles against Stripe before any self-declared row is cleared.

## 11. Secure paid gateway (built 31 Oct 2026; live the same day on Pete's yes)

- **Server side:** migration 011 adds `plan`, `paid_at`, `paid_until`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_synced_at` and `is_beta` to `profiles`, with a trigger that keeps the browser from changing any of them (or `is_pioneer` / `is_founder`). The `stripe-webhook` function verifies Stripe's signature and applies each event once through `stripe_apply`; out-of-order and old-subscription events are skipped; a founder stays paid for good. `is_beta` is set for every address confirmed on the waitlist, now and when an address confirms later.
- **App side:** once the server has the new columns, the profile is the only source of paid status. The device mirrors it both ways, the Stripe return URL only starts a "confirming your payment" wait, "Verify your purchase" asks the server, and paid status is no longer synced through the vault. On an older server the app behaves as before, so it can be released before or after the migration.
- **Earlier buyers:** Stripe had no completed checkouts on 31 Oct 2026, so there are no earlier payers to reconcile; any paid flag on a device today is self-declared and is cleared by the profile once the gateway is live.
- **Live (31 Oct 2026, Pete: "yes and release when ready"):** migration 011 applied (4 profiles, none marked paid, so nothing to reconcile), `stripe-webhook` deployed (no JWT check; the Stripe signature is the check), Stripe endpoint `we_1UWd6t9mgKf6Hntyhibk3fEK` created for the five events. **Pete set the secret the same day** (checked: an unsigned request now gets 400). For a rotation later: put the endpoint's signing secret into Supabase as `STRIPE_WEBHOOK_SECRET` (Stripe Dashboard → Developers → Webhooks → the endpoint → Reveal signing secret; Supabase → Edge Functions → Secrets). Until then the function answers 500 and Stripe keeps retrying for up to three days, so no payment is lost.
- Still client-side only: the paid-only design tools (upload / generate a 3D house). The AI reader allowance is enforced on the server from `is_pioneer` / `is_founder`, which are now trustworthy.

## 12. Decided by Pete (31 Oct 2026, late afternoon)

- **Tester prices:** free for the 30 days in exchange for detailed feedback, then £3.99 a month, **£39.99 a year** (replaces £21.99) or **Founding Member £99** (replaces £149 for testers). Full prices unchanged. Every tester price shows the full price struck through (pop-up, campaign page, Settings).
- The £21.99 link is switched off in Stripe; the webhook knows the new links and prices.
