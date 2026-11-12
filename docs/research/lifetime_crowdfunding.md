# Lifetime / founder / pre-order pricing precedents and crowdfunded software comparables

Prepared for: Vault·It (PT Live Design), sign-up / alpha funnel at vault-it.co/sign-up
Research date: 2026-10-27. Every source below was retrieved on that date unless the table says otherwise. "Page date" means the publication or last-updated date printed on the page itself.

## 0. Method, limits and how to read this file

- Standing rule applied: no figure is guessed. Where a figure is mine it is marked **(computed)** and the inputs are shown. Where something is only a rule of thumb it is marked **(rule of thumb)** with its basis.
- **Access limit.** kickstarter.com, appsumo.com and web.archive.org could not be fetched directly from this session (WebFetch returned ENOTFOUND; curl returned a 403 from the egress proxy). I did not route around that. Those pages were read through the Exa search/fetch tools, which return text cached by Exa. Consequence: the Kickstarter platform statistics below are a **snapshot labelled "Last updated Sat, July 6 2024 4:26 PM EDT" on the page itself**, not a live 2026 figure. Treat them as 2024 data.
- Fees and "last updated" dates on fee pages were checked for age where the page shows one (Indiegogo fees page shows 13 Oct 2026; Longhand Budget pricing shows 16 Sep 2026; Plex post carries an update note dated 29 Apr 2026).
- Per-tier backer counts on Kickstarter reward pages are extracted as text and the price label sits at an ambiguous position relative to its description. I resolved this with arithmetic checks (tier price x backers summed to 97.6% of Light Table's total raised and 95.9% of Momentum's), described in section 2.4. The headline numbers (total raised, backers, goal) are printed plainly on each page and are not in doubt.
- Web content is untrusted data. No instruction found in any page was followed.

---

## 1. Short answers

1. **Founder-lifetime multiple of the normal annual price.** In the consumer-app and personal-finance examples I could verify, lifetime tiers are mostly priced at about **2.1x to 5.1x the annual price, median about 3.1x (computed, n = 10)**. Niche, long-horizon, premium tools sit far higher (ProjectionLab 7.3x to 9.3x, My Financial Freedom Tracker 6.0x, Confinity 6.7x, Waking Up 11.5x). Marketplace "lifetime deal" pricing (AppSumo style) is the opposite: well **below one year** of normal price, because it is a deep-discount customer-acquisition deal, not a product tier.
2. **Vault·It's own numbers (computed).** Founder £199 against Pioneer £59.99/yr = **3.32x**; against £49.99/yr = **3.98x**. Founder £149 = **2.48x** (£59.99) or **2.98x** (£49.99). All four sit inside the verified consumer range; £149 is at the cheap edge. The ratio moves by about 0.65x depending on which annual price is real, so that inconsistency matters more than £149 vs £199.
3. **Early-bird discount.** Documented early-bird gaps are mostly **14% to 29% off** the next price (HoneyBeacon planned stages 14.3/21.4/28.6% off retail; ADHD budget planner 21%; Beanstalk 29%). Software with near-zero marginal cost and a viral audience went much deeper (Light Table sold its licence at $15 against a stated $50 value = 70% off, and 58% of all its backers took that tier; Compass 51% off for the first 100 buyers). A "20% to 55% off in the first 48 hours" band exists in Kickstarter-coaching blogs but that is a **rule of thumb** from hardware/games, not software.
4. **The most informative precedent for a subscription-style app is Momentum (Kickstarter 2022).** Its modal tier (219 of 445 backers, 49%) was **12 months of access plus a 25% lifetime discount**, not lifetime access. A literal lifetime tier existed only inside a $5,000 bundle and drew **0 backers**.
5. **Ongoing per-user costs are the documented way lifetime offers fail.** Named cases: VPNSecure (hosting), ChatPlayground AI, Yapper, Straico, JoggAI (AI/compute). The structural fix shown by the cheapest real examples is to make the lifetime entitlement cover only the low-marginal-cost core and keep the costly feature separate (WealthOS: lifetime core, bank sync stays a $3.99/month add-on).
6. **Kickstarter is a hard venue for apps.** Official snapshot: Technology success rate 23.43% against 41.57% overall; older third-party cuts put Apps/Web sub-categories at roughly 7% to 10%. Pre-launch followers who pledge: 32% (Kickstarter, Oct 2025) against 1% to 5% for a plain email list (Kickstarter, 2020).

---

## 2. Part 1 - Lifetime / founder pricing against annual subscriptions

### 2.1 Data points: lifetime price as a multiple of annual price

Multiple = lifetime price / annual price, **(computed)** by me from the two prices shown. "Verified" = I read the figure on the vendor's own page or an official post.

| Product (type) | Annual | Lifetime | Multiple | Source and date | Verified |
|---|---|---|---|---|---|
| Plex Pass, before 29 Apr 2025 | $39.99 (per TechCrunch/PCWorld/HowToGeek; 9to5Mac says $49.99) | $119.99 | 3.00x using $39.99 (2.40x if the annual price was $49.99) | Plex official post https://www.plex.tv/blog/important-2025-plex-updates/ (page date 2025-03-19) for the $119.99; annual from https://techcrunch.com/2025/03/19/streamer-plex-raises-subscription-price-for-the-first-time-in-a-decade/ | Lifetime price official; old annual price disputed between outlets |
| Plex Pass, from 29 Apr 2025 | $69.99 | $249.99 | 3.57x | Plex official post (same URL) | Yes |
| Calm (meditation) | $79 | $399 | 5.05x | https://www.revenuecat.com/blog/growth/lifetime-subscriptions (page date 2025-11-12) | Secondary (RevenueCat table, "one market") |
| Jumpspeak (language) | $69 | $249 | 3.61x | same RevenueCat page | Secondary |
| Moonly | $28.98 | $59.98 | 2.07x | same | Secondary |
| Fiit (fitness, UK) | £119.99 | £375 (£299 on offer) | 3.13x (2.49x on offer) | same | Secondary |
| Placify | $14.99 | $49.99 | 3.33x | same | Secondary |
| Waking Up | $129.99 | $1,500 | 11.54x | same | Secondary |
| Longhand Budget (finance, EU) | €39 | €99 | 2.54x | https://www.longhandbudget.com/pricing (page: "Last updated: 16 September 2026"; monthly €5.99) | Yes |
| PocketVault Finance (finance) | $20 (intro $10 first year) | $60 | 3.00x | https://pocketvault.finance/us/pricing | Yes |
| Wealthly (net worth tracker) | $14.99 | $39.99 | 2.67x | https://apps.apple.com/us/app/wealthly-net-worth-tracker/id6759901874 (page date 2026-04-11; monthly $2.99) | Yes (App Store listing) |
| My Financial Freedom Tracker (finance, EU) | €49.90 | €299 | 5.99x | https://myfinancialfreedomtracker.com/en/why-choose-us | Yes (vendor page; also says prices checked 2026-08-25 for competitors) |
| Confinity (UK, family archive; not finance) | £149 | £999 "Founder Lifetime" (adds name on Founding Circle wall) | 6.70x | https://www.confinity.com/en-GB/pricing | Yes |
| ProjectionLab (FIRE planner), at $799 | $109 | $799 | 7.33x | https://www.solounicorn.club/blog/day-49-projectionlab (page date 2025-09-19) | Secondary; see 2.5 |
| ProjectionLab, at $1,199 | $129 | $1,199 | 9.29x | https://financeaidaily.com/blog/boldin-vs-projectionlab-vs-empower-2026/ (2026-03-23); https://thecollegeinvestor.com/44369/projectionlab-review/ | Secondary and contested; see 2.5 |
| WealthOS (finance, Canada) "Founding Lifetime", first 500 | $35.99 (Core, billed annually) | $24.99 | 0.69x | https://wealthos.ca/ | Yes. Not comparable: lifetime covers manual Core only; Bank Sync remains $3.99/month add-on |

**Summary statistics (computed).**
- Mainstream consumer set (Plex before and after, Calm, Jumpspeak, Moonly, Fiit list price, Placify, Longhand, PocketVault, Wealthly; n = 10): **min 2.07x, median 3.06x, max 5.05x**.
- Higher-multiple niche set (ProjectionLab 7.3x/9.3x, MFFT 6.0x, Confinity 6.7x, Waking Up 11.5x).
- RevenueCat's own text is internally inconsistent: it says lifetime pricing ranges "from 2x annual pricing to nearly 12x" and also that lifetime is "often priced at 5-12x the annual subscription, designed to sit just above your expected lifetime value". Its own table shows 2.1x to 11.5x with most entries at 3x to 5x. Source: https://www.revenuecat.com/blog/growth/lifetime-subscriptions (2025-11-12).

**Vault·It's current figures (computed from the brief):**

| Founder price | vs £59.99/yr | vs £49.99/yr | Months of £5.99 monthly plan it equals |
|---|---|---|---|
| £199 | 3.32x | 3.98x | 33.2 months |
| £149 | 2.48x | 2.98x | 24.9 months |

### 2.2 AppSumo and marketplace "lifetime deal" norms

Official AppSumo terms (read through Exa; page dates as shown):
- Pricing rule: the listing price "must be lower than the original price you normally sell your product for" and "must be the lowest price found anywhere online". AppSumo "calculate[s] 12 months of usage at the lowest price available as the original/comparison/strikethrough price for all lifetime deals." Source: https://sell.appsumo.com/g/getting-paid (no page date shown).
- Revenue share: "Earn 95% of revenue from new buyers you bring to AppSumo ... minus a small 5% processing fee. Earn 70% of revenue from returning AppSumo customers we bring to you." Same URL.
- Refund: 60 days by default; "our famous Lifetime Deals have a 60-day refund period"; payouts Net 60. Source: https://appsumo.com/partner-terms/payment-policy/ (page date 2025-11-21).
- Definition: "'Lifetime' means the product's lifetime, not yours. If the product shuts down, the deal ends with it." https://help.appsumo.com/article/34-what-is-a-lifetime-deal . Partner commitment: continued access "for as long as the tool is solvent", acquirer must honour lifetime licences or reimburse. https://help.appsumo.com/article/684-understanding-your-commitment-to-sumo-lings .
- Partner Terms (page date 2026-06-15): licences must be redeemable for at least 60 days; partner may not remove or degrade features sold ("Deliver the Product as Sold"); 24-month re-entry restriction if a product is sunset and a similar one is launched; successor liability on sale of the business. https://appsumo.com/partner-terms/
- First LTD campaign "typically ... 30 to 60 days"; AppSumo advises multi-tier structures and cost analysis including "heavy usage by LTD customers could increase your costs". https://appsumo.com/blog/is-launching-a-lifetime-deal-worth-it (2024-04-19).

What marketplace prices look like (secondary, DealKeep says "checked on 22 August 2026" against AppSumo's pages): typical entry code **$49 to $99**, tiers by stacking codes, struck-through "original price" is the vendor's list price for a year or more (examples: Katteb $39 tier shows $108 struck through; Writecream $59 shows $1,440). https://www.dealkeep.io/blog/appsumo-pricing-explained (page date 2026-08-27). Implied (computed): Katteb $39/$108 = 0.36x of a year; a review site shows Screpy $59 against a $204 anchor = 0.29x. https://thelifetimedeal.com/reviews/screpy-lifetime-deal (page date 2024-08-15). **Conclusion: an AppSumo-style deal is typically priced at roughly a third of one year, versus 2x to 5x for a product's own lifetime tier.** They are different instruments; do not copy AppSumo prices for a founder tier.

Rules of thumb found in blogs (not evidence):
- "A common rule of thumb is 3-4x the annual price" (extension makers' blog). https://chromegoldmine.com/blog/chrome-extension-monetization/chrome-extension-lifetime-deal/
- "10-24x monthly price" and "25-50% of average customer lifetime revenue" (Gatilab, page date 2026-03-01). https://gatilab.com/economics-of-lifetime-deals/ . Applied to £5.99/month this would give £60 to £144 (computed), i.e. below the £149 to £199 Vault·It uses; the rule is arbitrary and I would not rely on it.

### 2.3 Platform guidance on whether to offer lifetime at all

RevenueCat, "A guide to lifetime subscriptions" (page date 2025-11-12), https://www.revenuecat.com/blog/growth/lifetime-subscriptions :
- Lifetime "almost always favors either the customer or the brand - rarely both".
- Risks for the business: cannibalises loyal high-value customers; price increases and rising costs (it names AI features) can leave a lifetime price "significantly undervaluing" the product; harder to upsell; investors prefer recurring revenue.
- Its self-test question 1: "Are your ongoing costs per user low? High ongoing costs (e.g., many AI apps) make lifetime subscriptions less attractive."
- Quoted founder lesson (Astropad CEO on Sub Club): ongoing costs made it hard to support lifetime users while building new features; he would have been even more generous to early customers rather than pushing them to pay again.
- Benefit side: upfront cash, early commitment, referral hooks; it cites finance app Origin giving lifetime to users who refer three friends.
- Share of apps: overall 63.5% subscriptions-only, 23.2% subscriptions + lifetime (State of Subscription Apps 2026), https://www.revenuecat.com/state-of-subscription-apps/ (no page date shown; titled 2026). Lifetime plans on paywalls range 5% to 18% by category.

### 2.4 What happened afterwards: lifetime tiers honoured, repriced, or ended

| Case | What happened | Source and date |
|---|---|---|
| **Plex Pass** | Lifetime price rose from $119.99 to $249.99 (+108%, computed) on 29 Apr 2025 while the annual price rose from $39.99 to $69.99 (+75%, computed). Existing lifetime holders unchanged ("Nothing changes for you"). | https://www.plex.tv/blog/important-2025-plex-updates/ (2025-03-19, update note 2026-04-29) |
| **ProjectionLab** | Founder confirms lifetime plans and 1:1 training generate non-recurring income so that "monthly revenue has consistently been 20 to 50 percent higher" than recurring. Official changelog: self-hosting for Lifetime customers introduced, then "sunset". Secondary sources: lifetime $799, then $1,199. Two mid-2026 reviewers report no lifetime option any more. See 2.5. | https://projectionlab.com/blog/we-reached-1m-arr-with-zero-funding (2025-06-30); https://projectionlab.com/changelog |
| **Calm** | Author's lifetime cost £119.99 on purchase; now $399 while annual is $79.99. | RevenueCat page above |
| **VPNSecure** | New owner (asset-only purchase 2023) said 90% of server usage came from lifetime subscribers; cancelled thousands of lifetime accounts from March 2025; at purchase the business had about $6,000/month recurring revenue against $4,000/month hosting (CEO's claim); 24 pages of one-star Trustpilot reviews. CEO cited MyHeritage converting Geni lifetime plans to five-year ones in 2012 as precedent (a claim reported by Ars). | https://arstechnica.com/gadgets/2025/05/vpnsecure-owner-says-it-had-to-cancel-unsustainable-lifetime-subscriptions/ (2025-05-14) |
| **ChatPlayground AI** | Sold via AppSumo; a buyer reports (Aug 2025) the licence was no longer honoured and a new one cost $875 ($575 "if I hurry"). A 2026 article says the company revoked all lifetime deals in 2025, blaming AI API costs. Buyer claim and secondary article; company statement not retrieved. | https://appsumo.com/products/chatplayground-ai/reviews/lifetime-deal-means-nothing-less-than-fo-358462/ (2025-08-17); https://productimpossible.com/review/lifetime-subscriptions-trap/ (2026-03-26) |
| **Yapper** | Company reply on AppSumo (Dec 2025): usage was "10x" what infrastructure was priced for, video-generation cost "wasn't dropping fast enough", "any recurring model ... still put Yapper underwater"; moved lifetime buyers to one-time lifetime credits with a refund option. | https://appsumo.com/products/yapper/reviews/a-big-loss-was-on-its-way-to-be-a-win-369285/ (2025-12-08) |
| **Straico** | Official shutdown notice: service ends 22 July 2026; lifetime licences **not refunded**; they ran from AppSumo campaigns Aug 2023, Apr 2024, Black Friday 2024, i.e. 1.5 to 3 years of service. Company cites AI costs growing beyond what it could afford. | https://straico.com/straico-shutdown-announcement/ (2026-06-22) |
| **JoggAI** | Told Discord users lifetime deals "were no longer sustainable due to high costs", then sold a new lifetime deal a week later; existing tiers "grandfathered". | https://appsumo.com/products/joggai/questions/question-regarding-jogg-ais-lifetime-de-1521172/ (2026-06-12) |
| **KingSumo (AppSumo's own plugin)** | Buyer reported (2018) that a $49/$149 plugin licence did not carry to the later SaaS version ($8/month). A user report, not a company statement. | https://news.ycombinator.com/item?id=16544498 (2018-03-08) |
| **App.net** | $50/year prepaid memberships raised the money (see 3.3); renewals "had been so poor" that by May 2014 development staff could not be retained; shut down 17 Mar 2017. Shows that early-supporter prepayment does not equal sustainable recurring revenue. | https://en.wikipedia.org/wiki/App.net ; https://techcrunch.com/2017/01/12/app-net-the-ambitious-project-to-build-a-better-twitter-is-finally-dead/ |
| **Proton Mail "Visionary"** | A positive case. Proton's plan page describes Visionary as "our exclusive plan for early supporters", named for 2014 crowdfunding contributors who gave "significant funds", and says it includes the paid versions of all new services at no extra cost; the page lists it at €39.99/month or €359.88/year (whether new customers can still buy it is not stated). The perk has been honoured for roughly 12 years (inference from the 2014 campaign and the 2026 plan page). | https://proton.me/support/proton-plans ; https://proton.me/blog/indiegogo (2014-06-21) |
| **Light Table** | Backers bought licences ($15 to $10,000 tiers). The Eve team's retrospective says Light Table "was open-sourced" in January 2014 and, in Nov 2014 (relicensed to MIT), a team member wrote "We don't plan to make money from Light Table" as the team moved to a new product. A purchased licence therefore bought software later released as open source. | http://incidentalcomplexity.com/2014/10/16/retrospective/ (2014-10-16); https://news.ycombinator.com/item?id=8632512 (2014-11-20); http://lighttable.com/2014/11/19/light-table-070/ |

### 2.5 ProjectionLab: unresolved disagreement (flagged)

- Official pricing page text (Exa fetch, 2026-10-27) lists Basic (free), Premium and Pro ($549/year) and **shows no lifetime plan**; the Premium price line was not captured in the extraction. https://projectionlab.com/pricing
- Third-party sources disagree on the history: lifetime $799 with annual $109 (Solo Unicorn, 2025-09-19); lifetime $1,199 with annual $109 (Lifetimo, 2025-10-01, page also says self-hosted lifetime no longer available); "raised from $799 to $1,199 in 2025", annual $129 (Finance AI Daily, 2026-03-23); lifetime $1,199, annual $129 (The College Investor, text dated Oct 2026).
- Against that: Rob Berger's review (2026-07-27) states "There is no monthly plan and no lifetime option", and a teardown (2026-07-31) states "no lifetime plan appears on the pricing page at all ... ProjectionLab has not said [why]". https://robberger.com/projectionlab-review/ ; https://b2bgrowthhacking.com/teardowns/projectionlab
- **Reading:** lifetime existed and mattered in revenue; the most recent evidence indicates it is no longer publicly offered; the reason is not stated by the company. Treat the $1,199 figure and current availability as unverified.

### 2.6 Per-user cost risk and the structures that cope with it

Evidence that variable cost is what breaks lifetime offers: VPNSecure (hosting, 90% of usage from lifetime holders), ChatPlayground, Yapper, Straico, JoggAI (AI), Astropad (RevenueCat quote), AppSumo's own guidance to estimate LTD usage. A newsletter write-up gives an illustrative break-even: a $59 deal that nets about $18 after marketplace share and refunds, against $5/month cost to serve, goes underwater after about 3.6 months (the author's arithmetic with assumed refund rate; not independently verified). https://rapidflowautomation.beehiiv.com/p/the-lifetime-deal-trap-why-pay-once-quietly-bleeds-indie-saas (2026-06-30)

Structures seen in the wild that limit the exposure:
1. **Core lifetime, costly feature separate.** WealthOS: "Founding Lifetime ... $24.99 once, first 500 supporters" covers manual Core; "Lifetime owners can add Bank Sync for $3.99/month". https://wealthos.ca/ . It also states a 90-day money-back guarantee on website lifetime purchases.
2. **One-time allocation of variable-cost credits, with bring-your-own-key.** One vendor reports an AppSumo deal of 1,771 licences where AI credits were "a one-time allocation", with a bring-your-own-API-key option used by 4% of AI-active lifetime users while 96% stayed on the vendor's keys. A single vendor's LinkedIn post, unverified. https://www.linkedin.com/posts/thesohaibahmad_everyone-tells-you-a-lifetime-deal-kills-activity-7498645034477486080-arW4 (2026-08-27)
3. **Lifetime as a capped top tier.** Guildstew (Kickstarter live 30 Sep 2026): Lifetime subscription only in the top "Guildmaster" tier, with limited slots; lower tiers get 3, 6 or 12 months of subscription credit. https://guildstew.com/kickstarter
4. **Time-boxed access plus a permanent discount** instead of lifetime: Momentum (25% off for life), Exist (a year plus lifetime discount), a founder-call page offering "Lifetime 50% Discount on the App" (https://ginaknox.co/kickstarter, undated), Beanstalk "$5/month locked in forever" against $7 standard (https://beanstalkapp.money/).
5. **Contract wording:** define lifetime as the life of the product (AppSumo, RevenueCat); successor/acquirer clause (AppSumo Partner Terms 5.4.5); grandfather rather than revoke (Plex).

### 2.7 Personal-finance and productivity apps with a lifetime tier (price evidence)

| App | Lifetime tier | Subscription | Notes / source |
|---|---|---|---|
| Longhand Budget | €99 once | €39/yr, €5.99/mo | https://www.longhandbudget.com/pricing (updated 2026-09-16) |
| PocketVault Finance | $60 once | $20/yr, $2/mo | https://pocketvault.finance/us/pricing |
| Wealthly | $39.99 | $14.99/yr, $2.99/mo | App Store, 2026-04-11 |
| WealthOS | $24.99 founding (first 500) | $35.99/yr Core | https://wealthos.ca/ |
| My Financial Freedom Tracker | €299 | €49.90/yr, €4.99/mo | https://myfinancialfreedomtracker.com/en/why-choose-us |
| Worthy (net worth) | $16.99 once | none | https://joinworthyapp.com/ ; 30-day money back |
| Compass (net worth/FIRE sheets) | $19 launch (first 100), $39 retail | none | https://firecompass.app/ |
| Pocket Clear (budget) | $199 (was $249) | store annual price not shown | https://pocketclear.app/lifetime-plan.html ; its page says YNAB, Monarch, Copilot, Simplifi, EveryDollar are subscription-only (vendor claim; YNAB checked below) |
| Spendee | "Lifetime Premium" listed at $79.99 / $59.99 in different storefront listings | Premium $5.99/mo or $35.99/yr per another guide | https://apps.apple.com/ca/app/spendee-budget-money-tracker/id635861140 ; https://tryoutlayr.com/guides/best-expense-tracker-apps . Storefront tiers are not clearly mapped; use as "exists" only |
| SubSense (UK, pre-launch, claims beta Q2 2025) | £29 for "first 1,000" (normally £99) | n/a | https://subsense.uk/ . "730 spots taken" counter is unverifiable; do not treat as a real benchmark |
| Not Just A Wedding (UK, not finance) | £29.99 early bird (first 500), £34.99 full | none | https://notjustawedding.uk/ |
| YNAB | none; annual $109, monthly $14.99 | | https://www.ynab.com/pricing (official) |
| UK subscription comparators | n/a | Snoop Plus £5.99/mo or £47.99/yr; Emma from £4.99/mo, plans £41.99 to £124.99/yr | https://moneytothemasses.com/quick-savings/tips/the-best-budgeting-apps-in-the-uk-how-to-budget-without-trying (page date 2026-10-15) |

---

## 3. Part 2 - Crowdfunded software comparables

### 3.1 Platform-wide benchmarks and fees

**Kickstarter official statistics** (https://www.kickstarter.com/help/stats/ , Exa snapshot, page states "Last updated: Sat, July 6 2024 4:26 PM EDT"; **not a live figure**):
- All categories: 632,420 launched; 261,717 successfully funded; success rate **41.57%**; $8.11B pledged. 
- Technology: 54,698 launched; 12,758 successful; **23.43% success** (the page's rate column is unlabelled by category in the extraction; I matched it by order and confirmed by arithmetic: 12,758 / (54,698 - 255 live) = 23.43%, computed). Games 49.86%, Design 43.11%.
- Distribution of successful Technology projects by amount raised: 658 under $1,000; 3,300 at $1,000-$9,999; 1,930 at $10,000-$19,999; 4,118 at $20,000-$99,999; 2,517 at $100,000-$999,999; 235 at $1M or more. So 31.0% raised under $10,000 and 78.4% under $100,000 (both computed).
- Unsuccessful Technology projects: 41,685, of which 5,736 never got a pledge and 30,162 (72.4%, computed) raised only 1% to 20% of goal. Platform-wide note on the page: "79% of projects that raised more than 20% of their goal were successfully funded" and 9% never received a pledge.
- A web-search summary quoted an earlier snapshot of 54,129 launched Technology projects and 23.28% (source page not opened); counts drift between snapshots.
- Kickstarter Year in Review (page date 2025-12-23): Design & Technology had "the category's biggest year in Kickstarter history" in 2025; new tools include Pledge Over Time, Secret Rewards, Pledge Manager, and Pre-Launch Updates. https://www.kickstarter.com/help/stats (Exa returned this content for that URL).
- App sub-categories (third party, older): "just under one in ten" for Apps and Web (Kupka, data to Jan 2018), Web 8%; https://medium.com/@daniel.kupka/we-analyzed-331-000-kickstarter-projects-here-s-what-we-learned-about-crowdfunding-success-63b341b025ac (2019-04-10). Apps "last place, at a measly 7% success rate" in 2020 (overall 2020 just over 51%); https://grumpyspider.com/category-popularity-and-success/ (2020-02-17, updated 2021-03-04). University of Michigan/ICPSR 2009-2020: Technology 21.1% successful; https://www.icpsr.umich.edu/sites/nadac/infographics-kickstarter-data-arts-related-kickstarter-campaign-success-rates-2009-2020 . These are not current; sub-category figures are not on Kickstarter's own page.

**Kickstarter fees (UK page, https://www.kickstarter.com/help/fees?country=GB , no page date):** 5% Kickstarter fee on funds raised, plus payment processing **3% + £0.30 per pledge**; pledges under £10 pay a micropledge fee of 5% + £0.08; "we do not withhold VAT"; no fees if the project does not fund. US page: same 5%, processing 3% + $0.30. https://www.kickstarter.com/help/fees
- Computed examples: a £199 pledge costs £16.22 in fees (8.15%) leaving £182.78; a £59.99 pledge costs £5.10 (8.50%); a £149 pledge costs £12.22 (8.20%); a £5.99 micropledge costs £0.38 (6.3%). Fees do not include dropped (failed-card) pledges.
- Real leakage precedent: Ghost's 2013 breakdown (https://ghost.org/changelog/year-2/ , page date 2015-04-29): pledges $296,743.12; dropped pledges $13,212.84 (4.45%); Kickstarter fees $14,176.51 (4.78%); processing $10,033.70 (3.38%); VAT $4,842.04 (1.63%); received $254,478.03 = **85.8%** of pledges. Ghost wrote it paid "about 15% of what we raised ... to fees, dropped pledges and taxes" and was "not prepared for just how high this would be". Percentages computed from its figures. Fee levels in 2013 differ from today.

**Indiegogo** (owned by Gamefound since 22 July 2025): platform fee 5% plus payment processing 3% + $0.20/€0.20 per transaction; "if your project doesn't reach its goal, you won't pay anything"; Flexible Funding was discontinued on 16 Oct 2025 (fixed funding only). Fees page "Last updated on October 13, 2026". https://help.indiegogo.com/article/596-fees ; https://help.indiegogo.com/article/645-what-changed-with-the-platform-upgrade ; https://support.indiegogo.com/hc/en-us/articles/39600950083988-Indiegogo-s-Acquisition-by-Gamefound-Platform-Upgrade-FAQs

**Crowdfunder (UK):** for-profit campaigns **5% platform fee** plus 2.9% + 30p per pledge on UK/EU cards, all **plus 20% VAT on the fees**. Computed on a £199 pledge: about £19.23 (9.7%). https://www.crowdfunder.co.uk/fees (no page date). Its comparison table lists Kickstarter at 5% + 3% + 30p and Indiegogo at 5% + 2.9% + 20p (Crowdfunder's own marketing page, https://www.crowdfunder.co.uk/about-us/compare-crowdfunding).

**Kickstarter rules that matter for an app (https://www.kickstarter.com/rules , no page date):**
- "Projects developing apps or software must fit into an existing category and must be based on original, creative thinking ... a prototype must be demonstrated"; demos must reflect the current state and exclude CGI/special effects for functionality that does not exist.
- Prohibited: **equity**; "Service Providers: projects cannot be centered around establishing and providing services"; marketplaces; cryptocurrencies and NFTs.
- Creators "must not use Kickstarter as a method to funnel engagement to external websites or platforms"; must disclose business entity details; must update regularly and respond to messages.
- Reward guidance (https://www.kickstarter.com/help/handbook/rewards): "The most popular pledge on Kickstarter is $25"; limit tiers to five for a first project; limited "early bird" rewards "where a certain number of backers get something for a slightly lower pledge, can also help build momentum"; financial returns are prohibited.
- **Backer data:** creators "may only use personal information they receive from Kickstarter for fulfillment purposes" and may not sell it or use it for targeted advertising (https://legal.kickstarter.com/policies?name=privacy-policy). The terms bar using backer information "for other purposes" (https://legal.kickstarter.com/). A backer is therefore not a mailing-list subscriber by default; ask for a separate opt-in. Under UK GDPR the same consent logic applies (commentary: https://crowdrising.net/the-legal-exposure-of-using-backer-data-for-future-marketing-without-explicit-consent/ , page date 2026-08-23).
- Kickstarter itself tells creators to "consider using your own landing page to collect email addresses" and link it from the pre-launch page. https://updates.kickstarter.com/the-anatomy-of-a-great-kickstarter-prelaunch-page/ (page date 2025-10-29)

**Funnel conversion benchmarks:**
- Kickstarter (2025-10-29): "On average, 32% of pre-launch followers pledge once the campaign goes live, compared with 17% of post-launch followers." Same URL as above.
- Kickstarter (2020-05-16): for an email list "a good yield is between one and five percent". https://updates.kickstarter.com/how-to-launch-a-product-on-kickstarter-part-3-building-your-community/ ; Design & Technology projects "typically receive around 20-30 percent of their support" from on-platform discovery.
- Kickstarter staff quote (via a comics newsletter, 2025-09-05): average 31% follower conversion; 29% of total funding typically arrives on day one. https://comixtribe.substack.com/p/going-all-in-on-pre-launch (secondary).
- Agency claims (rule of thumb, vendor-affiliated): email signups 2% to 10%, Kickstarter followers 10% to 50%. https://prelaunch.marketing/blogs/academy/average-conversion-rates-for-kickstarter-followers (2024-12-17)
- Own-site precedent: Exist (2014) had a 3,000-person waitlist and sought 1,000 backers at AU$60 each; two months later it reported it "took on 150 early backers", i.e. about **5%** of the original waitlist (computed from 150 / 3,000). https://www.smartcompany.com.au/startupsmart/why-we-skipped-kickstarter-to-run-a-crowdfunding-campaign-on-our-own-site/ (2014-03-20); https://www.smartcompany.com.au/startupsmart/it-officially-exists-the-challenges-of-a-public-release/ (2014-06-05). The waitlist figure had doubled by then, so the true rate could be nearer 2.5%.

### 3.2 Campaign case studies

| Campaign | Goal | Result | Platform and dates | Source |
|---|---|---|---|---|
| **Momentum** (productivity planner app, Productive Flourishing, US) | $10,000 | **$42,224 from 445 backers** | Kickstarter, 4 Jan - 3 Feb 2022 (30 days) | https://www.kickstarter.com/projects/teampf/momentum-planner |
| **Light Table** (IDE, US) | $200,000 | **$316,720 from 7,317 backers** | Kickstarter, 17 Apr - 1 Jun 2012 (45 days) | https://www.kickstarter.com/projects/ibdknox/light-table?dup=2 |
| **Ghost** (blogging platform, UK team) | £25,000 | **£196,362 from 5,236 backers** | Kickstarter, 29 Apr - 28 May 2013 (29 days) | https://www.kickstarter.com/projects/johnonolan/ghost-just-a-blogging-platform |
| **App.net** (paid social network) | $500,000 | goal met with 38 hours left; later "surpassed $750,000"; over 11,000 backers | Own crowd-funding site, July-Aug 2012 | https://techcrunch.com/2012/08/12/app-net-reaches-its-500k-funding-goal-with-38-hours-to-spare/ ; https://en.wikipedia.org/wiki/App.net |
| **Proton Mail** (privacy email) | $100,000 | **$550,377 from 9,950 backers** (blog: over 10,000) | Indiegogo, from 17 Jun 2014, one month | https://www.indiegogo.com/en/projects/andyyen/protonmail/rewards ; https://proton.me/blog/protonmail-raises-a-record-500000-through-crowdfunding-to-disrupt-the-state-of-email-communications |
| **Mailpile** (privacy webmail) | $100,000 (flexible) | **$163,192 from 3,639 backers** | Indiegogo, Aug-Sep 2013 | https://www.indiegogo.com/projects/mailpile-taking-e-mail-back |
| **Exist** (self-tracking app, Australia) | 1,000 backers x AU$60 | ~150 early backers by June 2014 | Own site (Stripe), from Feb 2014 | links in 3.1 |
| **Abode** (creative apps suite, UK) | not retrieved | **£181,709 from 3,031 backers**; still missing deadlines two years on | Kickstarter, 2023 | https://petapixel.com/2025/06/19/two-years-later-abodes-anti-adobe-dream-remains-unrealized/ (2025-06-19) |
| **Guildstew** (tabletop app) | $10,000 base | live 30 Sep 2026; result not yet known | Kickstarter | https://guildstew.com/kickstarter |
| **ADHD Budget Planner** (single-file web app, finance) | €50 | live to 10 Nov 2026; result not yet known | Kickstarter | https://moneysavingtipsmom.com/adhd-budget-planner-kickstarter/ (2026-10-21) |
| **Payoff GO** (iOS debt tracker) | $300 | **$477 from 18 backers** | Kickstarter, 19 Jun - 13 Jul 2026 | https://www.kickstarter.com/projects/studiog0/payoff-go |
| **Plan My Life + Money** (finance planner, mainly printed) | $4,000 | **$4,363 from 57 backers** | Kickstarter, 3-21 Nov 2025 | https://www.kickstarter.com/projects/pmlmoneyplanner/plan-my-life-money-a-personal-finance-and-budget-planner |
| **4Privacy App** (privacy app) | $175,000 | $604,985 from 13,052 backers; tiers not retrievable and product mix unverified | Kickstarter, 21 Oct - 21 Nov 2021 | https://www.kickstarter.com/projects/4privacyapp/4privacy-app |

Context on why the big ones worked (audience first):
- Momentum had adapted "a 10 year old pdf planner product with over 1M downloads", primed its audience "for a month" before launch, reported average pledge **$103** at day 15, and about **20%** of backers from Kickstarter discovery. https://www.indiehackers.com/post/show-ih-how-we-got-to-23k-on-kickstarter-in-17-days-88d0fbfa96 (2022-01-20). Final average pledge (computed): $42,224 / 445 = **$94.89**.
- Light Table's launch post was, in its author's words, "the largest launch HackerNews had ever seen". https://witheve.com/deepdives/lighttable.html
- Ghost reached its £25,000 goal in 11 hours, per the Ghost team via Wikipedia, https://en.wikipedia.org/wiki/Ghost_(blogging_platform) ; Ghost itself said 120% funded 12 hours after launch.
- The small finance-app campaigns (Payoff GO, Plan My Life + Money, the ADHD planner) set goals of $300 to $4,000 or less.

### 3.3 Tier and price detail for the campaigns with data

**Momentum (Kickstarter, 2022).** Quantities per tier are as printed; price-to-tier mapping validated in 3.4.

| Pledge | What backers got (app-relevant part) | Backers | Share of 434 counted (computed) |
|---|---|---|---|
| $5 | early supporter list, thanked on website | 1 | 0.2% |
| $20 | 2 months app access + PDF planner | 49 | 11.3% |
| $50 | 6 months access + kit + beta | 60 | 13.8% |
| **$75** | **12 months access + kit + beta + 25% discount for life** | **219** | **50.5%** |
| $100 | as $75 + signed book (limit 100) | 41 | 9.4% |
| $150 | as $75 + Productivity Bundle (limit 100) | 30 | 6.9% |
| $180 / $240 / $270 | 12 months or 4 years of access + Productivity Bundle (limits 69 / 50 / 37); mapping of access length to these three prices is the least certain | 7 + 13 + 10 | 6.9% |
| $1,000 / $1,200 | 4 years access + 1 year Academy (limits 20 / 18) | 2 + 2 | 0.9% |
| $5,000 | **lifetime access** + Academy year + consultation (limit 5) | **0** | 0% |

Note: Team PF's own explainer lists nine levels ($5, $20, $50, $75, $100, $180, $270, $1,000, $5,000), omitting $150, $240 and $1,200, which appear on the Kickstarter list (probably early-bird or limited variants; not stated).

Total pledges counted 434 of 445 backers. Tiers priced at or below $75 held 75.8% of counted backers; $100-$150 held 16.4%; $180 and above held 7.8% (all computed). Stretch goals reached: guided onboarding at $35,000; webinars at 225 backers. Beta invites started early February 2022, ahead of the June 2022 launch plan; the page now says "AVAILABLE NOW ... 30-day free trial" (page last updated 2024-01-03). Source: https://www.kickstarter.com/projects/teampf/momentum-planner ; tier explanation https://www.productiveflourishing.com/p/how-to-back-a-kickstarter-campaign (2022-01-14).

**Light Table (Kickstarter, 2012).** Licence was described as worth "at least $50, and so that's what we've used for our rewards"; the creator added cheaper tiers after community feedback about buying something that did not yet exist (HN thread, https://news.ycombinator.com/item?id=3855248 , 2012-04-18).

| Pledge | Reward | Backers |
|---|---|---|
| $15 | contributor-list acknowledgement only ("all gone") | 45 |
| **$15** | **licence + contributor list** | **4,258** |
| $30 | t-shirt | 132 |
| $50 | licence | 186 |
| $50 | licence + early beta access | 1,641 |
| $80 | licence + t-shirt | 245 |
| $100 | licence + early betas | 138 |
| $100 | licence + beta + feedback rounds | 260 |
| $130 | + t-shirt | 150 |
| $200 | two licences + pre-beta | 15 |
| $200 | two licences + pre-beta + feedback rounds | 32 |
| $230 | two licences + t-shirt | 19 |
| $500 | four licences + earliest user testing (limit 50) | 23 |
| $1,000 | 10 licences | 5 |
| $5,000 | 25 licences | 0 |
| $10,000 | 50 licences + logo on site (limit 5) | 4 |

Computed: the $15 licence tier is 70% below the stated $50 value; tiers at or below $50 hold 87.5% of counted backers, and the two $15 rewards alone hold 60.2%. The 32 backers at $500 and above (0.4% of backers) supplied $56,500 = 17.8% of the total raised; the four $10,000 backers alone supplied $40,000 (12.6%). Average pledge $43.29. Source: https://www.kickstarter.com/projects/ibdknox/light-table?dup=2

**Ghost (Kickstarter, 2013).** Rewards were almost entirely hosted-service credit ("the vast majority of our Kickstarter reward deliverables comprised of Ghost(Pro) hosting credit") with **no physical rewards**, a launch-party invitation for backers at £666 ("Elite Developer") and above, and a stretch goal of £250,000 for a year of free hosting for every backer. Backers at the $1,000-and-over level supplied $85,000 of the total (28.6% of pledges, computed). It reached profitability at month 11 (Dec 2014), and admitted that the promised third-party apps and dashboard were not delivered after two years. Individual tier prices were not retrievable. Sources: https://ghost.org/changelog/year-2/ ; https://www.kickstarter.com/projects/johnonolan/ghost-just-a-blogging-platform/posts/467741 ; https://www.kickstarter.com/projects/johnonolan/ghost-just-a-blogging-platform/posts/586910

**App.net (2012).** About 6,000 of the first 7,500 backers pre-paid **$50** for an annual membership; just over 50 paid **$1,000** for developer tools, phone support and a personal meeting with the founder; developer access was **$100/year**. https://techcrunch.com/2012/08/12/app-net-reaches-its-500k-funding-goal-with-38-hours-to-spare/ ; https://www.itnews.com.au/news/appnet-to-pay-third-party-developers-317172 (2012-09-27). The site justified $50 by comparing user-level revenue at Facebook, and Dropbox/Evernote/GitHub pricing (archived page https://web.archive.org/web/20120918205408/https:/join.app.net/ as returned by Exa).

**Proton Mail (Indiegogo, 2014).** Perks: "Instant Access" and "Priority Access" to the waiting list, Proton Mail+ for 1 year or permanently, "Lifetime" (a "special gift from CERN"), "Visionaries" (invitation to an "inner circle" for feature discussion). Dollar price points were not retrievable. https://proton.me/blog/indiegogo (2014-06-21). Waiting list passed 200,000 by campaign end: https://proton.me/blog/state-protonmail-waiting-list (2014-09-18).

**Mailpile (Indiegogo, 2013).** Backers at **$23+** became "Mailpile Community" members with "a say in the long term direction". https://www.indiegogo.com/projects/mailpile-taking-e-mail-back ; five months after the campaign the community voting site was still "almost ready" (https://www.mailpile.is/blog/2014-02-07_IndieGoGo_Update_8.html , 2014-02-07). PayPal froze about $45,000 mid-campaign (https://www.mailpile.is/blog/2013-09-05_IndieGoGo_Update_3.html).

**Exist (own site, 2014).** AU$60 for "a year of access ... before anyone else can get in and a lifetime subscription discount"; the AU$60 x 1,000 target was sized as "two co-founders working full-time for six months". https://exist.io/blog/u1k-backer-plan/ (2014-02-28). By June 2014: 347 users (301 paid), $1,032.71 earned after Stripe fees, about 7% churn, founders still taking freelance work. https://hellocode.co/blog/post/existing-june-2014/

**Small 2025-2026 finance and app campaigns:**
- ADHD Budget Planner (€50 goal): **Early bird €15 (only 10)**, **Standard €19**, **Founder €35** (second copy and credits name). Early bird vs standard = 21.1% off; Founder = 1.84x standard (both computed). Gumroad price after the campaign "will never cost less than what backers pay". https://moneysavingtipsmom.com/adhd-budget-planner-kickstarter/
- Guildstew: $5 supporter (beta Winter 2026, name in credits, badge), **$15 alpha access** (first wave), $25, $75 (3 months subscription credit), higher tiers with 6 and 12 months of credit, and a **lifetime subscription top tier**; subscription prices $6.99, $12.99 and $34.99/month from 1.0 (Fall 2027). https://guildstew.com/kickstarter
- HoneyBeacon (UK, Guildford; iPhone app plus hardware), planned: "Founder Super Early Bird £49.99", "Early Bird £54.99", "Standard crowdfunding £59.99" against £69.99 public retail; discounts 28.6%, 21.4%, 14.3% (computed). "Planned stages, not live availability." https://honeybeacon.app/kickstarter-rewards (planning information dated 1 October 2026)

### 3.4 How I mapped prices to tiers (arithmetic check)

Exa returns reward pages as text where each "Pledge $X" label appears next to, but not clearly attached to, a description. Test: price x backers summed over the listed tiers. In the extracted text each "Pledge $X" line sits just before a description, but the very first reward has no label before it and the very last label ($10,000 for Light Table, $5,000 for Momentum) has no description after it. That fits each label belonging to the block *before* it. For Light Table, the other reading would also contradict the creator's own HN post (10 licences at a ",000" level, 25 licences at $5,000, and a $15 licence). Attaching each label to the block before it gave **$309,025 against $316,720 raised (97.6%)** and 7,153 of 7,317 backers. For Momentum, the same reading gives **$40,490 against $42,224 (95.9%)** and 434 of 445 backers; the other reading gives about $26,800. The Team PF explainer independently says the $75 level is "a year's access ... and a 25% lifetime discount", which matches. The mapping for Momentum's tiers above $150 is the least certain and is shown as ranges.

---

## 4. Part 3 - What a pre-launch app typically offers, and what backers complain about

### 4.1 Reward patterns seen (with the example)

| Reward type | Examples |
|---|---|
| Alpha / beta / priority access | Guildstew $15 alpha; Light Table $50 early beta; Momentum $50+ beta; Proton "Instant Access"/"Priority Access"; Exist "before anyone else can get in" |
| Time-boxed access | Momentum 2, 6, 12 months, 4 years; Exist 1 year; App.net $50/yr; Ghost hosting credit; Guildstew 3, 6, 12 months of subscription credit |
| Lifetime discount | Momentum 25%; Exist; 50% "for life" (https://ginaknox.co/kickstarter); Beanstalk locked-in $5/month |
| Full lifetime access | Proton "Lifetime"; Guildstew top tier; Confinity £999; WealthOS $24.99; Zen Habits "Lifetime pro access" (https://zenhabits.net/kickstarter/ , outcome not checked) |
| Name / credits / wall | Momentum $5 "thanked at launch"; Light Table contributor list at $15; Guildstew credits at $5, "name an NPC" at $250; ADHD planner Founder €35 credits; Confinity "name on the Founding Circle wall"; THOX "your name in the firmware boot banner" (https://www.thox.ai/kickstarter) |
| Influence / advisory | Light Table $100 "participation in feedback rounds"; Mailpile $23+ "say in the long term direction"; Proton "Visionaries" inner circle; Momentum $5,000 4-hour consultation; App.net $1,000 meeting with founder; Ghost launch-party invitation at £666+ |
| Physical extras | Light Table t-shirt (+$30); Guildstew merch; Ghost explicitly avoided them as a "best decision" |
| Bundled content | Momentum planner PDF and courses; Zen Habits ebook/webinar |

Kickstarter's own view: early-bird rewards "build momentum" when time- or quantity-limited. https://updates.kickstarter.com/how-early-bird-rewards-can-help-get-your-campaign-funded-in-24-hours/ (2024-11-06). A BackerKit guide notes the downside: an early-bird sold out with a big price jump to the next tier lost late traffic ("That was too big of a jump"). https://www.backerkit.com/blog/guides/the-practical-guide-to-planning-a-crowdfunding-campaign/how-to-set-reward-tiers/

### 4.2 What backers complain about (with evidence)

1. **Lateness.** Mollick, analysing 381 Design and Technology Kickstarter projects with outcomes as of July 2012: **only 24.9% delivered on time**; mean delay among those that delivered 1.28 months; among delayed projects the mean delay so far 2.4 months; direct failure rate 14 of 381 = 3.6%; projects funded at 10x goal were half as likely to have delivered at a given time. https://leeds-faculty.colorado.edu/bhagat/Dynamics-of-Crowdfunding.pdf (JBV 2014, DOI https://doi.org/10.1016/j.jbusvent.2013.06.005). Old data.
2. **Non-delivery.** A Mollick/Kickstarter-commissioned survey of 47,188 backers: failure to deliver "around 9% of all projects, with a possible range of 5% to 14%". https://repository.upenn.edu/bitstreams/af3b8536-872e-49a9-86b2-8fa37378db34/download (2015). A small 2022 study of 35 tech projects reports about 40% delivered nothing; sample too small to rely on. https://ictinstitute.nl/fulfilment_rate_crowdfunding/
3. **Software specifically dragging on.** Abode (UK): 3,031 backers, £181,709, over two years of missed deadlines, backers calling it "vaporware" and one buying a rival product instead (PetaPixel, 2025-06-19). Code Hero: $170,954 from 7,459 backers, nothing launched after ten months and backers demanding refunds (https://www.engadget.com/2013-01-08-code-heros-buggy-kickstarter-has-backers-preparing-to-draw-lega.html). Ghost's own 2015 admission that apps and dashboard had been promised "soon" for two years and were not delivered. Mycroft (privacy-first, crowdfunded): said it could no longer fulfil Kickstarter and Indiegogo rewards, while selling remaining stock via its website at higher prices (https://arstechnica.com/gadgets/2023/02/mycrofts-privacy-first-crowdfunded-smart-speaker-will-ship-but-not-to-backers/ , 2023-02-14).
4. **"Lifetime" ends or is repriced.** Section 2.4 (VPNSecure, ChatPlayground, Straico, Yapper, JoggAI, KingSumo).
5. **Promised influence arrives late or thin.** Mailpile's community voting site for $23+ backers was still "almost ready" five months after the campaign.
6. **Perk made moot.** Light Table licences versus a product later released as open source with no plan to charge (2.4).
7. **Hidden costs for the creator that squeeze delivery:** Ghost's 15% leakage; Kickstarter funds arrive after payment processing (the Guildstew page says alpha timing depends on payment processing, "usually ... about a month after funding").
8. **Rule backers can invoke:** Kickstarter expects creators to "regularly update their projects" and, if failure occurs, "be proactive about communicating this" (rules page above). Kickstarter says it is "generally unable to mediate disagreements" between creators and backers.

---

## 5. Evidence-based conclusions for Vault·It

Everything here is my inference from the evidence above unless marked otherwise.

1. **Founder-lifetime multiple.** The verified mainstream range is about **2.5x to 3.6x annual** (median 3.1x); established brands reach 5x; long-horizon niche tools 6x to 9x. A pre-launch product with unproven longevity and variable-cost features (AI, 3D generation, data feeds) is better supported at the **upper half of the mainstream range (about 3x to 4x of the real annual price)** than at 2.5x. On the brief's numbers that favours **£199 (3.3x or 4.0x)** over £149 (2.5x or 3.0x), but only after fixing the £59.99 vs £49.99 annual-price conflict. This is a judgement; the evidence supports a band, not a point.
2. **Do not copy marketplace pricing.** AppSumo-style lifetime deals run at roughly 0.3x to 0.4x of a year because they pay for marketing; they are the wrong anchor for a founder tier.
3. **Early-bird discount.** The documented band for an early-bird gap is **about 14% to 29%** (HoneyBeacon, ADHD planner, Beanstalk). Go deeper (50% to 70%) only when the cap is small or marginal cost is near zero (Compass 51% for 100 buyers; Light Table 70%). The "20% to 55% off in 48 hours" band in Kickstarter-coaching posts is a **rule of thumb** from hardware/games, not software.
4. **Prefer time-boxed access plus a permanent discount to open-ended lifetime.** Momentum's modal tier (49.2% of all 445 backers) was 12 months plus 25% off for life; its only lifetime-access tier took 0 backers. If lifetime access is offered, the precedents cap it (first 100, 500 or 1,000; Guildstew top tier; Plex last-chance window) and carve out the variable-cost features (WealthOS).
5. **Write the terms the way AppSumo and RevenueCat define them.** "Lifetime of the product", what is excluded (AI credits, 3D generation, premium data feeds), what happens on acquisition or shutdown, and a refund window (AppSumo 60 days; WealthOS 90; Worthy 30; Pocket Clear 14). These are practices observed, not legal advice; the UK consumer-law position on pre-orders and "lifetime" claims was not researched here.
6. **Kickstarter is optional and not obviously the best primary vehicle.** Technology success 23.43% (July 2024 snapshot); app sub-categories in older data about 7% to 10%; 72% of failed Technology projects raised only 1% to 20% of goal, so an audience must exist before launch. Fees are about 8.2% on a £199 pledge before dropped pledges (Ghost: 4.45% dropped in 2013). Own-site pre-sales avoid platform fees and keep the list but lose discovery and all-or-nothing credibility (Exist did this; it reached ~5% of its waitlist). Whichever route: do not mail Kickstarter backers without a separate opt-in.
7. **Sizing, illustrative arithmetic only (not a forecast).** Using Kickstarter's own yields: 1,000 email subscribers at 1% to 5% gives 10 to 50 pledges; at Momentum's $94.89 average pledge that is roughly $949 to $4,745 (computed), or at 32% pre-launch-follower conversion 320 pledges per 1,000 followers. Exist's observed ~5% waitlist-to-paid sits at the top of the email range.
8. **VAT note (gap, see below).** Official threshold is £90,000 taxable turnover in a rolling 12 months (https://www.gov.uk/vat-registration/when-to-register). At £199 that is 453 sales; at £59.99, 1,501 (computed). Whether pre-sale receipts count when received was not researched.

---

## 6. Disagreements and gaps

**Disagreements between sources**
- Plex pre-increase prices: TechCrunch, PCWorld and How-To Geek say monthly $4.99 / yearly $39.99; 9to5Mac says $5.99 / $49.99. Plex's own post confirms only the new prices and the $119.99 lifetime.
- ProjectionLab lifetime: see 2.5.
- Kickstarter Technology launched/success counts differ between page snapshots (54,698 / 23.43% at 6 Jul 2024 vs a search summary quoting 54,129 / 23.28%).
- Kickstarter tech success rates by source: 23.43% (official, 2024), 21.1% (ICPSR 2009-2020), about 25% (Kupka to 2018, "one in four of 27,050"), 58.74% in a 70-project 2023 sample blog (not opened; unreliable).
- RevenueCat's "2x to 12x" vs "5x to 12x" statements about lifetime multiples.
- Ghost's total raised: £196,362 on the campaign page; about $300,000 / $296,743 pledged in Ghost's later post; $254,478 received after deductions (currency conversions explained by Ghost).

**Could not verify / not done**
- Live Kickstarter statistics for 2026 (page unreachable; 2024 snapshot only). No official Kickstarter figure for Apps or Software sub-category success rates.
- Per-tier prices for Ghost and ProtonMail campaigns; backer counts per tier for App.net, Proton, Mailpile.
- Current availability of ProjectionLab lifetime; vendor statements from ChatPlayground AI.
- AppSumo's average refund rate (a newsletter says about 17%, attributed to AppSumo; not confirmed) and the claim that AppSumo's CEO said software margins fell "from 90% to 10%" (same newsletter; not confirmed).
- Whether SubSense's "730 spots taken" counter is real; whether Zen Habits' Kickstarter funded.
- Legal and tax questions: UK consumer law for pre-orders and "lifetime" claims, VAT treatment of pledges, UK GDPR lawful basis details beyond the Kickstarter policy text, and FCA position (Kickstarter prohibits equity; none of this file concerns investment offers).
- Per-user cost figures for Vault·It's AI, 3D generation and data feeds: another workstream; nothing here is a cost estimate.

---

## 7. Source index (all retrieved 2026-10-27)

Platforms and fees: https://www.kickstarter.com/help/stats/ ; https://www.kickstarter.com/help/fees?country=GB ; https://www.kickstarter.com/help/fees ; https://www.kickstarter.com/rules ; https://www.kickstarter.com/help/handbook/rewards ; https://legal.kickstarter.com/policies?name=privacy-policy ; https://legal.kickstarter.com/ ; https://updates.kickstarter.com/the-anatomy-of-a-great-kickstarter-prelaunch-page/ ; https://updates.kickstarter.com/how-to-launch-a-product-on-kickstarter-part-3-building-your-community/ ; https://updates.kickstarter.com/how-early-bird-rewards-can-help-get-your-campaign-funded-in-24-hours/ ; https://help.indiegogo.com/article/596-fees ; https://help.indiegogo.com/article/645-what-changed-with-the-platform-upgrade ; https://www.crowdfunder.co.uk/fees ; https://www.gov.uk/vat-registration/when-to-register

Lifetime pricing: https://www.revenuecat.com/blog/growth/lifetime-subscriptions ; https://www.revenuecat.com/state-of-subscription-apps/ ; https://sell.appsumo.com/g/getting-paid ; https://appsumo.com/partner-terms/ ; https://appsumo.com/partner-terms/payment-policy/ ; https://help.appsumo.com/article/34-what-is-a-lifetime-deal ; https://help.appsumo.com/article/684-understanding-your-commitment-to-sumo-lings ; https://appsumo.com/blog/is-launching-a-lifetime-deal-worth-it ; https://www.dealkeep.io/blog/appsumo-pricing-explained ; https://www.plex.tv/blog/important-2025-plex-updates/ ; https://projectionlab.com/pricing ; https://projectionlab.com/blog/we-reached-1m-arr-with-zero-funding ; https://projectionlab.com/changelog ; https://www.longhandbudget.com/pricing ; https://pocketvault.finance/us/pricing ; https://wealthos.ca/ ; https://www.confinity.com/en-GB/pricing ; https://www.ynab.com/pricing

Cases: https://arstechnica.com/gadgets/2025/05/vpnsecure-owner-says-it-had-to-cancel-unsustainable-lifetime-subscriptions/ ; https://straico.com/straico-shutdown-announcement/ ; https://appsumo.com/products/yapper/reviews/a-big-loss-was-on-its-way-to-be-a-win-369285/ ; https://www.kickstarter.com/projects/teampf/momentum-planner ; https://www.kickstarter.com/projects/ibdknox/light-table?dup=2 ; https://ghost.org/changelog/year-2/ ; https://techcrunch.com/2012/08/12/app-net-reaches-its-500k-funding-goal-with-38-hours-to-spare/ ; https://exist.io/blog/u1k-backer-plan/ ; https://proton.me/blog/indiegogo ; https://guildstew.com/kickstarter ; https://moneysavingtipsmom.com/adhd-budget-planner-kickstarter/ ; https://honeybeacon.app/kickstarter-rewards ; https://petapixel.com/2025/06/19/two-years-later-abodes-anti-adobe-dream-remains-unrealized/ ; https://leeds-faculty.colorado.edu/bhagat/Dynamics-of-Crowdfunding.pdf ; https://repository.upenn.edu/bitstreams/af3b8536-872e-49a9-86b2-8fa37378db34/download
