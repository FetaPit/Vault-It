# Vault-It price points and pricing model (13 Nov 2026)

Owner's ask, 13 Nov 2026: "let us work out our price point and pricing model, looking at competitors and tried and tested successful pricing structures for subscriptions and years options billed up front".

**Status: recommendation only.** Nothing here is decided. Pete sets every figure. No Stripe change, no app code and no edit to `docs/OFFER_AND_PRICING.md` until he does.

Builds on the 27 Oct research (`docs/research/pricing_uk_eu.md`, `pricing_global.md`, `cost_to_serve.md`, `lifetime_crowdfunding.md`, `trial_length.md`, `rules_uk_law.md`) rather than repeating it. New sources below were read on 13 Nov 2026. Figures marked *estimate* are arithmetic or judgement, not facts.

---

## 1. Recommendation

### 1.1 The model in one breath

Two tiers, each monthly or yearly paid up front, with a 30-day trial. **Vaulter** is the standard plan. **Pioneer** is the Pro plan at roughly 1.7 times Vaulter. The yearly price is about 30% below 12 monthly payments, which is the UK leaders' norm. **Your partner joins free on any paid plan**, because couples saving for a home together are the core customer. **Household** is a separate licence that one member buys and shares by invite with up to 8 people. **Founding Member** is a capped one-payment licence. The beta prices are the "first movers' price": they end on a published date, and anyone who subscribes before then keeps their price for as long as they stay subscribed.

### 1.2 Price table (recommended, not decided)

| Plan | Beta price (first movers, kept while subscribed) | After the beta | Yearly saving against 12 monthly payments | What changes against today |
|---|---|---|---|---|
| **Vaulter monthly** | £3.99 a month | £5.99 a month | | No change |
| **Vaulter yearly** | **£39.99 a year** (£3.33 a month) | **£49.99 a year** (£4.17 a month) | Beta 16%, after 30% | New plan. £39.99 is the owner's "limited time" figure |
| **Pioneer (Pro) monthly** | **£5.99 a month** | **£9.99 a month** | | New plan |
| **Pioneer (Pro) yearly** | £49.99 a year (£4.17 a month) | **£79.99 a year** (£6.67 a month) | Beta 30%, after 33% | Beta unchanged. After the beta rises from £59.99 |
| **Partner** | Free on any paid plan, one partner | Free | | New |
| **Household** (up to 8 people, Pioneer for all, one member buys and invites) | Not on sale until built (coming soon) | **£14.99 a month or £119.99 a year** | 33% | Replaces the 7 Nov £19.99 / £199.99 |
| **Founding Member** (one payment, 100 places, Pioneer for the life of the service) | £99 once | **£199 once** | | Beta unchanged. After the beta rises from £149 |

Checks (*estimate*, arithmetic): every yearly price is below 12 monthly payments at the same stage (£39.99 < £47.88; £49.99 < £71.88; £49.99 < £71.88; £79.99 < £119.88). Every price clears the cost floors in `cost_to_serve.md` §0 (monthly £4.99, yearly £49.99 while not VAT-registered), provided the AI reader keeps its monthly allowance. Founding Member £199 is 2.5 times the £79.99 Pioneer year, at the bottom of the 2.5 to 3.6 times band in `lifetime_crowdfunding.md` §5.

### 1.3 Why these numbers, in short

- **Vaulter £5.99 / £49.99** sits at the top of the UK entry band (£3.99 to £5.99) and level with Snoop Plus (£5.99 / £47.99), the closest UK app that includes net worth. 30% off yearly matches Emma (30%) and Snoop (33%), the UK leaders.
- **Pioneer £9.99 / £79.99** is level with Emma Pro (£9.99 / £83.99), the UK tier that adds net worth and more. A Pro tier at about 1.7 times standard is inside the 2 to 10 times ladder seen elsewhere and at its cautious end. It now carries the Entrepreneur tab, house builder level 3 and "Your own design", so £59.99 a year (only £10 above Vaulter) would undersell it.
- **Partner free** follows Monarch (unlimited collaborators at no extra cost), YNAB (up to 6 people on one subscription) and Lunch Money (collaborators need no subscription). Each extra person costs Vault-It about £0.02 a month to serve (*estimate*, `cost_to_serve.md` §0). A partner who joins free is also the cheapest new user Vault-It will ever get.
- **Household £14.99 / £119.99** is 1.5 times Pioneer. Spotify UK charges 1.38 times an individual plan for two people and 1.69 times for up to six. The owner's £19.99 is 2 times Pioneer, and its £199.99 a year is only 17% off 12 monthly payments.
- **Founding Member £99 / £199**: £99 was already offered to testers and stays. £199 after the beta keeps the multiple honest if Pioneer's year goes to £79.99. If Pioneer stays at £59.99, keep £149.

### 1.4 Rules that make the model honest (UK law, not choices)

1. **The beta price needs a fixed, published end date**, and the price must really rise on that date. Do not move the date or run a "substantially similar" offer straight after. Falsely saying a price is for a limited time is a banned practice under the DMCC Act (Sch. 20 para 7) and a criminal offence.
2. **Show the yearly total first**: "£49.99 a year, billed once (works out at £4.17 a month)". A monthly figure for a plan billed yearly must not lead.
3. **"Save 30%" only where true** at that moment and against the monthly price of the same stage. At beta prices Vaulter yearly saves 16%, not 30%.
4. **No "was" prices, no countdowns, no "only X left"** unless the count is real (the Founding Member cap is enforced by Stripe, so "places left" may be shown if read live from Stripe).
5. **From 1 January 2027 (draft rules)**: cancelling online must be possible as easily as joining (an e-mail address alone is not enough), a reminder must go out before the trial ends and before each yearly renewal, and a 14-day cooling-off applies after the trial and after each yearly renewal. The card wall currently cancels by e-mail only, so a self-serve cancel (Stripe customer portal) is needed before then.

---

## 2. Evidence

### 2.1 UK and EU personal finance apps

Figures read 27 Oct 2026 unless marked 13 Nov; full sources in `pricing_uk_eu.md` §2 and `pricing_global.md` §1 to 2.

| App | Monthly | Yearly (paid up front) | Yearly discount | Trial, card | Partner or family | Lifetime | Source |
|---|---|---|---|---|---|---|---|
| Emma Plus / Pro / Ultimate | £4.99 / £9.99 / £14.99 | £41.99 / £83.99 / £124.99 | 30%, shown as "30% OFF" | 7 days | Ultimate only: up to 4 extra members at £5.99 a month each (13 Nov) | None | [plans](https://emma-app.com/plans/compare-emma-plans), [prices](https://help.emma-app.com/en/article/how-much-does-emma-plusproultimate-cost-1ywhulq/), [extra members](https://help.emma-app.com/en/article/extra-members-bepcnu) |
| Snoop Plus | £5.99 | £47.99 | 33% | 7 days, one per user | None: one person per account; partners each run their own (13 Nov) | None | [Snoop Plus](https://snoop.app/plus/), [cost](https://snoopadmin.zendesk.com/hc/en-gb/articles/4584733957661-How-much-does-it-cost), [shared accounts](https://space.snoop.app/t/shared-snoop-accounts/1595) |
| Plum Plus / Boost / Max | £3.99 / £7.99 / £14.99 | £39 / £75 / £135 | 19% to 25% | First month free | Not found | None | [comparison](https://help.withplum.com/en/articles/11721138-new-subscriptions-comparison-table) |
| Moneybox | No app subscription; £1 a month on investing accounts | | | | | None | [fees](https://www.moneyboxapp.com/faqs/category/investments/investing-basics/what-are-the-fees-for-investment-accounts) |
| Cleo Pro (UK) | £12.99 | Monthly only | | Free app, 14-day refund | Not found | None | [Cleo Pro](https://web.meetcleo.com/faqs/en/articles/15377584-what-is-cleo-pro) |
| Monarch Core | $14.99 | $99.99 (pricing page shows a $69.99 first-year offer, 13 Nov) | 44% | 7 days; card reported required (third party) | Unlimited collaborators, no extra cost (13 Nov) | None | [pricing](https://www.monarch.com/pricing), [couples](https://www.monarch.com/for-couples) |
| YNAB | $14.99 | $109 | 39% | 34 days, no card | Up to 6 people on one subscription (YNAB Together, 13 Nov) | None | [pricing](https://www.ynab.com/pricing), [YNAB Together](https://www.ynab.com/introducing-ynab-together-for-your-shared-financial-journey/) |
| Copilot | $13 | $95 | 39% | 1 month; card reported required | Single user per account per 2026 reviews; shared budgets an open request (13 Nov) | None | [home](https://www.copilot.money/), [FAQ](https://www.copilot.money/faq), [feature request](https://feedback.copilot.money/feature-requests/p/couplefamily-support-shared-budgets) |
| Lunch Money | $10 | $100, or pay what you want $40 to $150 | 17% | 30 days, no card | Collaborators need no subscription (13 Nov) | No, but "price locked in for life" | [pricing](https://lunchmoney.app/pricing), [collaborators](https://support.lunchmoney.app/settings/collaborators) |
| Rocket Money Premium | Pay what you think is fair, typically $7 to $14; Premium+ $15 | Monthly only | | 7 days | Not found | None | [cost](https://help.rocketmoney.com/en/articles/2217739-how-much-does-rocket-money-cost) |
| PocketSmith Foundation | $14.95 | $9.99 a month billed yearly ($119.88) | 33% | Free plan | Not found | None | [plans](https://my.pocketsmith.com/plans) |
| Wallet (BudgetBakers) | £5.49 | In-app | | 14 days | Not found | "Lifetime Premium £24.99" (UK App Store) | [App Store](https://apps.apple.com/gb/app/wallet-budget-money-manager/id1032467659) |
| CrestCast (UK, no bank login) | £7.99 | £79.99 | 17% | 30 days, no card | Not found | None | [home](https://crestcast.co.uk/) |

What it shows:
- **UK bands**: entry £3.99 to £5.99 a month; net-worth or "Pro" tiers £9.99 to £14.99. Vault-It's after-beta ladder (£5.99 / £9.99) sits inside both bands.
- **Yearly discount**: UK leaders 30% to 33%; smaller UK apps 16% to 25%; large US apps 39% to 44%. Across 12 global vendors the median is about 32% (`pricing_global.md` §4).
- **Trials**: 7 days is commonest; budgeting apps that need a pay cycle use 30 to 34 days (YNAB, Lunch Money, CrestCast, Copilot). Vault-It's 30 days fits (`trial_length.md`).
- **Lifetime**: none of the leaders sell one. It is a founder and early-supporter device, not a standing plan.
- **Manual entry, no bank sync**: tracking-only apps price low or one-off, but planning tools (CrestCast £79.99, ProjectionLab $129) price like synced apps, because buyers pay for the plan, not the feed (`pricing_global.md` §5). Vault-It's house builder and roadmap put it with the planning tools.

### 2.2 Household and partner patterns

| Pattern | Who | How it works | Source (read 13 Nov 2026) |
|---|---|---|---|
| Partner or group included free | Monarch, YNAB, Lunch Money | One subscription; invite by e-mail; each person has their own login; YNAB lets the owner choose which budgets each member sees | [Monarch pricing](https://www.monarch.com/pricing), [YNAB Together](https://www.ynab.com/introducing-ynab-together-for-your-shared-financial-journey/), [Lunch Money](https://support.lunchmoney.app/settings/collaborators) |
| Paid seats on the top tier | Emma Ultimate | Up to 4 extra members at £5.99 a month each, bought by the subscriber, invitee must be on the free plan | [Emma extra members](https://help.emma-app.com/en/article/extra-members-bepcnu) |
| Duo and family licence one person buys | Spotify UK | Individual £12.99; Duo £17.99 (1.38 times) for a couple at one address; Family £21.99 (1.69 times) for up to 6 at one address; the plan manager pays and invites | [Spotify Premium UK](https://www.spotify.com/uk/premium/) |
| One person per account | Snoop, Copilot | Each partner subscribes on their own | Snoop and Copilot links above |

What it shows: in money apps the norm is **sharing included**, not a separate paid licence. A paid family licence is a consumer-subscription norm (Spotify) priced at 1.4 to 1.7 times one person, and bought by one member who invites the rest. That is the shape recommended for Household, with the partner case carved out free because it is Vault-It's main use (two people saving one deposit).

### 2.3 Structures that convert: standard plus Pro, yearly paid up front

- **Yearly converts and renews better after a long trial.** RevenueCat (17,000+ apps): annual plans with a 17 to 32 day trial converted 44.6% of trials against 24.0% for 4 days or less, and 47.5% renewed against 18.3% ([RevenueCat, 28 Sep 2026](https://www.revenuecat.com/blog/growth/free-trial-length), read 31 Oct, `trial_length.md`).
- **A yearly subscriber who leaves rarely returns.** Only about 5% of cancelled annual subscribers reactivate, and 35% of annual cancellations happen in month one ([RevenueCat State of Subscription Apps 2026, part 2](https://www.revenuecat.com/sosa-2026-insights-part-2); [summary](https://ppc.land/95-of-annual-app-subscribers-who-cancel-never-return-revenuecat-finds/)). So the first month of a yearly plan, and the reminder before renewal, matter more than discount win-backs.
- **Two-tier ladders**: Emma Plus to Pro is 2 times; Plum Plus to Boost 2 times; Monarch Core to Plus about 2 times (`pricing_global.md` §4). Vault-It's 1.7 times is at the cautious end, which suits a beta.
- **Price locks are a known retention tool**: Lunch Money promises "your price is locked in for life" ([pricing](https://lunchmoney.app/pricing)). Vault-It's first movers' price is the same idea and is already promised to testers (terms section 6 on `feat/card-wall`).
- **How yearly is shown**: big US apps lead with the per-month equivalent ("$7.92/mo billed $95 yearly", Copilot); UK leaders show "30% OFF" (Emma). UK rules (below) require the total to be clear, so lead with the yearly total and give the per-month figure second.

### 2.4 Limited-time prices done honestly (UK)

- **Banned outright**: "Falsely stating that a product will only be available ... on particular terms for a limited time, in order to elicit an immediate decision" (DMCC Act 2024 Sch. 20 para 7, in force 6 Apr 2025; [Sch. 20](https://www.legislation.gov.uk/ukpga/2024/13/schedule/20), `rules_uk_law.md` §1.1). CMA fines up to 10% of turnover.
- **Trading Standards pricing guide** (CTSI, updated for the DMCC Act; [Business Companion](https://www.businesscompanion.info/en/guidance-for-traders-on-pricing-practices), read 13 Nov 2026):
  - An introductory or after-promotion price "is likely to be considered unfair if the price of the product is not, in fact, increased at the end of the promotional period" (§17.2).
  - Where an offer really is time-limited, "the date on which the offer ends is very likely to be material information" and should be clear (§19).
  - Changing a published end date "is likely to be scrutinised carefully"; avoid it unless something unforeseeable happens (§19).
  - Subscriptions: the full financial commitment must be clear from the outset; for a free or heavily discounted start, later payments and duration must be stated clearly and prominently (§24).
- **ASA on subscription prices**: show the price for each billing period and the commitment; a conditional headline price must disclose the condition up front, not only in checkout ([ASA prices guidance](https://www.asa.org.uk/advice-online/prices-general.html); [Domestika ruling](https://www.asa.org.uk/rulings/domestika-inc-g25-1309531-domestika-inc.html); [Team RH Fitness ruling](https://www.asa.org.uk/rulings/team-rh-fitness-ltd.html), read 13 Nov 2026).
- **Reference prices**: the CMA withdrew its mattress-sector reference pricing guidance after the High Court case with Emma Sleep (a mattress firm, not the Emma app); "was" prices are now judged case by case ([HSF Kramer note](https://www.hsfkramer.com/notes/ip/2024-10/CMA-takes-court-action-against-Emma-Group-for-misleading-consumers)). Vault-It's rule of no "was" prices avoids the question.

So "£39.99 for a limited time" is lawful if: the end date is published next to it, the price really becomes £49.99 on that date, and the date is not quietly extended. Tying it to the beta close date does all three.

### 2.5 The new UK subscription rules (DMCC Act Part 4 Ch. 2)

Draft Consumer Subscription Contracts (Cancellation and Information) Regulations 2026, laid 19 Oct 2026, due to apply to contracts made **on or after 1 January 2027**; still drafts until both Houses approve ([CMS, 23 Oct 2026](https://cms.law/en/gbr/legal-updates/uk-subscription-contracts-the-government-publishes-the-missing-detail); [TLT](https://www.tlt.com/insights-and-events/insight/dmcc-act-subscription-contracts-regime-brought-forward-by-the-pm-what-do-businesses-need-to-know); [Lewis Silkin, 21 Oct 2026](https://www.lewissilkin.com/insights/2026/10/21/uk-government-publishes-draft-guidance-and-regulations-for-new-subscription-contr-102o624); read 13 Nov 2026).

- **Pre-contract information**: key information given together and apart from other text, not hidden behind a link.
- **Reminders**: before a free trial or discounted period ends; where one discounted price covers several payments, before the first payment at the higher price; about every 6 months on monthly plans; two reminders before renewal of a 12-month plan (TLT, Bratby). Reminders must be on a durable medium and clearly marked; a push notification is unlikely to count (CMS).
- **Cooling-off**: 14 days at the start, after a trial or discounted period ends, and after each renewal onto a 12-month term; refund within 14 days, less a proportionate amount for what was used, but only if the cooling-off information was given (CMS).
- **Leaving**: at any time, straightforward, online if the person joined online; "offering only an email address is not enough" per the draft guidance (CMS summary). End-of-contract notice within 24 hours of an online exit.
- **First movers' price and the beta discount**: a beta price that is kept while subscribed is not a discounted period that ends, so it needs no "price goes up" reminder (*inference*, not stated in the sources). If any discount does step up later, a reminder is due before the first higher payment.

---

## 3. The owner's decisions (recommended option first)

1. **Vaulter prices.** (a) £3.99 a month or £39.99 a year in the beta; £5.99 or £49.99 after. (b) Beta yearly £34.99 instead, so the beta yearly saving is 27% rather than 16%.
2. **Pioneer (Pro) prices.** (a) £5.99 a month or £49.99 a year in the beta; £9.99 or £79.99 after. (b) Keep the £59.99 year the app already shows after the beta, with £7.99 a month.
3. **Household and partners.** (a) One partner joins free on any paid plan; Household is a licence one member buys for up to 8 people with Pioneer for all, £14.99 a month or £119.99 a year, not sold until built. (b) Keep the 7 Nov plan: £19.99 or £199.99, no free partner. (c) Everyone pays their own plan and profiles link free.
4. **The £39.99 limited-time price.** (a) It is the Vaulter yearly beta price and ends on the beta close date. (b) A Pioneer yearly launch offer with its own fixed end date.
5. **Founding Member.** (a) £99 for testers (unchanged), £199 after the beta, 100 places, Pioneer features. (b) Keep £149 after the beta (right if decision 2 is b).
6. **Beta close date.** (a) Publish one fixed date now, shown next to every beta price; first movers keep their price after it. (b) Close "when ready" and give 30 days' notice (weaker: the "limited time" wording then needs care).
7. **Trial and cancelling.** (a) Keep 30 days with the card taken up front; before 1 Jan 2027 switch on self-serve cancelling (Stripe customer portal) and send a reminder e-mail before day 31 and before each yearly renewal. (b) Keep cancel by e-mail until the rules are made final.

After the owner decides: update `docs/OFFER_AND_PRICING.md` in his words, then Stripe products, prices and links (his yes on exact names and descriptions first), then the plan cards (card wall session).

## 4. Gaps

- Competitor figures marked 27 Oct were not re-read today; spot checks on 13 Nov found Monarch running a first-year offer and Emma's per-member price unchanged.
- No UK survey measures willingness to pay for a manual-entry home-deposit app (`pricing_uk_eu.md` §8). Prices should be checked against the first paying cohorts.
- The subscription rules are drafts; the final regulations and guidance may change detail.
- Copilot's partner sharing: sources conflict; treated as single-user.
- VAT: once registered (threshold £90,000), the same shelf prices keep about 80p in the pound instead of 97p (`cost_to_serve.md` §4c, *estimate*).
