# Global pricing comparables: net-worth / budgeting / personal-finance apps

Prepared 2026-10-27 for the Vault·It sign-up funnel. Topic: global pricing comparables. Read-only research; nothing in the repo was touched.

## 0. How to read this report

**Retrieval date.** Every page below was retrieved on **2026-10-27** unless a different date is written next to it. Where I cite a dated third-party article, the article date is given and it is labelled "third-party".

**Access limits (affects verification).**
- Direct `WebFetch` and `curl` to vendor sites failed in this sandbox (DNS failure and a 403 from the egress proxy). I did not try to route around that.
- All pages were therefore read through the Exa tools (`web_fetch_exa`, `web_search_exa`). They return the vendor page text as crawled. Several vendor pricing pages render prices client-side, so the number was sometimes visible only in a search highlight of the same vendor page, or in the vendor's own help article or FAQ. Where that happened I say so.

**Verified flag.** `verified = true` means the price came from a vendor-owned page I opened (pricing page, help centre, official blog, official App Store listing). `verified = false` means it is only from third parties, the sources conflict, or the vendor snapshot looks stale. Third-party review sites sometimes copy each other, so I never counted them as a second source for a number that matters. Two vendor-owned surfaces count as a cross-check.

**Currency.** Prices are in each vendor's native currency. Almost no US vendor shows a GBP price. Where I give GBP it is an **indicative conversion** at the Bank of England daily spot rate for 26 Oct 2026 (US$1 = £0.7492, £1 = €1.1940, so €1 = £0.8375), see section 6. Conversions are estimates, not prices anyone will be charged. US prices exclude sales tax; UK consumer prices (Sharesight UK, Emma) include VAT.

**Window.** "Last 24 months" means 2024-10-27 to 2026-10-27.

---

## 1. Master table (one row per product)

"NW" = net-worth tracking. "Sync" = automatic bank/broker feed (Plaid, MX, Open Banking and similar) versus manual or file import. Annual figures are what the vendor charges per year. "Eff./mo" is annual divided by 12 (my arithmetic).

| App | Region | Plans (native currency) | Eff./mo (annual) | Free tier / trial | NW included | Sync model | Positioning |
|---|---|---|---|---|---|---|---|
| **Monarch Money** | US + Canada | Core: $14.99/mo or $99.99/yr. Plus (launched 2026-04-20): $199/yr, annual only | Core $8.33; Plus $16.58 (at $199) | No free tier. 7-day trial. Money-back guarantee | Yes, Core | Synced (aggregators); US/CA | "All-in-one, collaborative" household finance; Plus = forecasting, business tracking, investment analysis, a will |
| **Copilot Money** | US only | One plan: $13/mo or $95/yr | $7.92 | No free tier. 1-month trial | Yes, the one plan | Synced; 16,000+ US institutions | Design-led, AI "money assistant"; iPhone/iPad/Mac/web, no Android |
| **YNAB** | US/CA/UK/EU banks; USD pricing | $14.99/mo or $109/yr | $9.08 | 34-day trial, no card; 365-day student trial | Yes (net worth report in the subscription) | Optional Direct Import (MX, Plaid; UK via Plaid) or file import/manual | Zero-based "YNAB Method" budgeting; share with up to 5 others |
| **Quicken Simplifi** | US + Canada | $6.99/mo equivalent list, billed annually = $83.88/yr. Promo to new subscribers $3.99/mo = $47.88 first year. No monthly billing | List $6.99; promo $3.99 | No free tier, **no free trial**; 30-day money-back | Yes | Synced (14k+ institutions); manual possible | Cheapest mainstream synced app on promo; Quicken brand |
| **Kubera** | Global (multi-currency, many aggregators) | Essentials $250/yr; Black $2,500/yr (a "Gold" $10,000/yr tier reported by one third party only). No monthly | Essentials $20.83 | No free tier. 14-day trial (official: free; third parties: $1 fee) | Yes, core product | Aggregators plus manual plus tickers | "Balance sheet" for complex/HNW wealth; flat fee not 1% AUM |
| **Empower (Personal Dashboard)** | US only | Free. Advisory fees from 0.50% (Premier Managed) / 0.89% AUM (Personal Strategy, $100k min) | $0 | Free forever | Yes, free | Synced US institutions only; manual accounts allowed | Free dashboard is the lead-gen for advisory services |
| **Lunch Money** | International (about 40% of users non-US); USD, EUR, CAD pricing | $10/mo or $100/yr ("set your own price" on annual, see section 8) | $8.33 | 30-day trial, no card; **price locked for life** | Yes (net worth tracker, any manual asset) | Plaid (US, CA, 17 EU countries) plus manual, CSV, API; UK banks only via third-party tools | Indie, "financially intentional", power-user budgeting |
| **PocketSmith** | Global; bills UK users in GBP | Free; Foundation 9.99/mo billed annually (14.95 billed monthly); Flourish 16.66 (24.95); Fortune 26.66 (39.95). Shown in USD on the vendor page today; UK users are billed the same numbers in GBP | 9.99 / 16.66 / 26.66 | Free plan (2 accounts, manual imports, 6-month projection) | Yes (listed under "all plans") | Bank feeds on paid plans only; free = manual import | Cash-flow forecasting calendar, multi-currency |
| **Boldin (ex-NewRetirement)** | US taxpayers | Basic free; PlannerPlus **$168/yr** from 2026-10-15 (was $144); no monthly; Advisors $3,200 one-off | $14.00 | Basic free forever; 14-day PlannerPlus trial | PlannerPlus only ("real time net worth analysis") | Account linking (PlannerPlus) plus manual inputs | DIY retirement planner (Roth, tax, Monte Carlo) |
| **Tiller** | US + Canada | **$99/yr** from 2026-08-01 (was $79). No monthly | $8.25 | 30-day free trial, plus 30-day refund | Yes (net worth template) | Yodlee + Plaid feeding Google Sheets/Excel | "Your financial life in a spreadsheet you own" |
| **Ghostfolio** | Global (Swiss company); USD | Open Source free (self-host); Basic free (cloud); Premium **USD 48/yr** | $4.00 | Free tiers; no trial needed | Yes (net worth dashboard) | **No bank sync**: manual, CSV, API | Open-source wealth/portfolio tracker |
| **Wealthfolio** | Global (Canadian company); USD | App **free**. Connect (optional): Basic $2.99/mo or $29/yr; Essentials $7.99 or $79; Duo $12.99 or $129; Plus $24.99 or $249 ("coming soon") | Connect Basic $2.42 | Free app, no account | Yes, in the free app | **Local-first manual/CSV**; Connect adds SnapTrade broker sync plus encrypted device sync | Private, open-source investing and net worth app |
| **Sharesight** | NZ-based; UK plans in GBP incl. VAT | UK: Free; Starter £6/mo; Standard £14/mo (£18.67 if billed monthly); Premium £21/mo (all billed annually). US: $7 / $18 / $23.25 | £6 / £14 / £21 | Free plan (1 portfolio, 10 holdings); 7-day trial on paid | Portfolio tracker, not a net-worth app | Broker/trade-email imports, no bank feeds | Dividend/tax-reporting portfolio tracker |
| **Rocket Money** | US only | Free; Premium "pay what you think is fair", typically $7-$14/mo; Premium+ $15/mo fixed. Bill-negotiation success fee 35-60% of first-year savings | n/a (monthly only) | Free plan; 7-day Premium trial | **Premium and up only** (not in free) | Synced (Plaid), US banks | Subscription cancelling and bill negotiation |
| **Origin** | US | $12.99/mo or $99/yr; current promo "$1 for a year" / "$9 for one year" shown | $8.25 | 7-day trial (suspended during promo) | Yes | Synced | Budget + investing + CFP access |
| **Finary** | EU-led, global; EUR | Free; Lite €54.99/yr; Plus €149.99/yr (€24.99/mo); Pro €349.99/yr | Plus €12.50 | Free tier; 14-day trial | Core product (plan-level gating not verified) | Synced (20,000 institutions) plus manual | Wealth tracker with fee scanner and diversification score |
| **Fina Money** | US/CA | Free; Premium $8.25/mo billed yearly or $12/mo; Business $20 or $25 | $8.25 | Free plan (up to 2 bank connections) | Yes | Synced (Plaid, MoneyKit) plus manual, Google Sheets | "Notion for personal finance" |
| **Emma** | UK (also CA, US pricing) | Basic free; Plus £4.99/mo or £41.99/yr; Pro £9.99 or £83.99; Ultimate £14.99 or £124.99 | £3.50 / £7.00 / £10.42 | Free Basic; 7-day trial | **Pro and Ultimate only** | UK Open Banking | UK budgeting app that also sells investing and savings |
| **Moneyhub (UK)** | UK | £1.49/mo or £14.99/yr via app stores (£0.99 / £9.99 direct) | £1.25 | 6 months free to new users | Yes | UK Open Banking | **Consumer app closed 2026-07-31** |
| **ProjectionLab** | Global; USD | Basic free; Premium $129/yr (annual only); Pro $549/yr. Lifetime ($1,199) and monthly Premium reported retired | $10.75 | Free Basic (no saving); 7-day trial | Projects net worth; not a tracker | **No sync by design** (manual; plugins) | FIRE / retirement planner |
| **Banktivity** | Mac/iOS; USD | Bronze $6.99, Silver $8.99, Gold $10.99 per month, billed annually | $6.99-$10.99 | 30-day trial, first-time customers | Yes | Bank sync included; import | Native Apple finance suite |
| **Moneydance** | Mac/Win/Linux | $65 one-time (price from a non-vendor-domain page); optional sync about $40/yr | n/a | Free capped trial; 90-day refund | Yes | Manual/import; optional Plaid add-on | Buy-once desktop ledger |

Manual/no-sync apps (the closest to Vault·It) are in section 5 with their own table.

---

## 2. Per-app detail with sources

All retrievals 2026-10-27.

### 2.1 Monarch Money
- **Core:** $99.99/yr or $14.99/mo. Source (vendor FAQ on pricing page): https://www.monarch.com/pricing. Cross-check (vendor help centre, billing steps "Monthly ($14.99 / month) ... Annual ($99.99 / year)", page updated 2026-10-14): https://help.monarch.com/hc/en-us/articles/44815447567636-Updating-Your-Subscription. **Verified.**
- **Trial:** "Your first week is on us" (7 days) with a money-back guarantee: https://www.monarch.com/pricing and https://help.monarch.com/hc/en-us/articles/19985735202068-Monarch-FAQs. Third parties report a payment method is required for the trial (finpresso.com, 2026-10-11, third-party).
- **Net worth:** the Plus help page says Core already contains "your budget, Cash Flow, Goals, Net Worth, and connected accounts": https://help.monarch.com/hc/en-us/articles/48349699981972-Monarch-Plus-Tier (updated 2026-08-31).
- **Plus tier:** launched 2026-04-20. Press release 2026-04-21 said **$299/yr** for new members (https://www.prnewswire.com/news-releases/monarch-launches-premium-tier-monarch-plus-302748653.html). Monarch's own blog now says **$199/yr**, 7-day trial, free will worth $299 for a limited time: https://www.monarch.com/blog/monarch-plus. A Monarch staff post (Reddit mirror, 2026-04-24, third-party copy) says the price was cut from $299 to $199 within days, existing members get $149 in year one, and "We haven't raised prices on the core subscription in 4 years". Third-party review sites report the pricing card shows $199.99/yr (financeradar.com, 2026-09-24). Plus is annual-only, desktop-first, and not sold via app stores. **Verified for $199; cents unresolved.**
- **Region:** the Plus help page states Plus is available to Canadian members; Monarch is North America only (see also knowyourdosh.com, 2025-11-12, third-party).
- **Positioning (vendor):** "home base for money clarity ... never any ads, we never sell your financial data"; argues paying beats free because free apps sell data.
- **Free tier removed:** summer 2023 (modestmoney.com, 2024-03-15, third-party; outside the 24-month window).

### 2.2 Copilot Money
- **Plans:** $13/mo, $95/yr, one product, "No tiers, no add-ons, no AI credits" (vendor home page, annual toggle shows $7.92/mo billed $95 yearly): https://www.copilot.money/ and https://www.copilot.money/?amp=. Vendor comparison page: "$95/year ... $13/month ... 30 day free trial": https://www.copilot.money/26/comparison/ynab. Official Apple App Store listing in-app purchases: Yearly $95.00, Monthly $13.00: https://apps.apple.com/us/app/copilot-track-budget-money/id1447330651. **Verified (two vendor-owned surfaces).** The live /pricing page text I could fetch did not print the numbers.
- **Trial:** 1-month free trial, "Not free. Copilot Money is a paid subscription (with a free trial). There's no permanent free tier": https://www.copilot.money/faq. Third parties say a card is required.
- **Net worth:** "Know your net worth, every day" on the home page; included in the one plan.
- **Sync / region:** connects to 16,000+ US institutions; "Copilot Money works with US-based accounts only": https://www.copilot.money/faq.
- **Price history:** I found no verified dated price change in the last 24 months. 9to5Mac (2025-06-26, third-party) already quoted $13/$95; an older third-party item (WRDW, 2024-03-25) quoted "$92 annually" (minor conflict). A tracker site (costbench.com) shows plan renames only and flags its own results as unreliable.

### 2.3 YNAB
- **Plans:** $14.99/mo or $109/yr ($9.08/mo equivalent, "$70 Savings!"), 34 days free, no card; 365-day free trial for college students; share with up to six people on one subscription: https://www.ynab.com/pricing. **Verified.**
- **Priced in USD** regardless of country ("exchange rates are not reflected").
- **Net worth:** "Spending and net worth reports" on the features page: https://www.ynab.com/features.
- **Sync:** Direct Import is optional via MX and Plaid; UK banks supported through Plaid since 2025-02-05 and Apple Wallet Open Banking in the UK since 2025-07-29; file-based import otherwise: https://support.ynab.com/en_us/how-direct-import-works-H1IGYLgnxl, https://www.ynab.com/whats-new/more-banks-europe-edition, https://www.ynab.com/whats-new/connect-to-your-accounts-through-apple-wallet-in-the-uk.
- **Price history:** $98.99/$14.99 from 2021-12-01; $109 annual from 2024-08-01 (YNAB pricing banner July 2024, reported by Vox 2024-08-08 and fundkeep.app). That is about 26 months ago, so just **outside** the 24-month window. Monthly unchanged at $14.99 since December 2021.

### 2.4 Quicken Simplifi
- **Plans:** official page shows "$3.99 [struck through $6.99] /month, billed annually": https://www.quicken.com/products/simplifi/ and https://www.quicken.com/products/pricing-comparison/. So first-year promo about $47.88 and list $83.88/yr. No monthly plan. Footnote: memberships renew at current retail price ("renews at the then-current rates", https://www.quicken.com/support/quicken-subscription-membership-faqs/). **Verified.** The $47.88 and $83.88 annual totals are my arithmetic from the displayed monthly figures; third parties (fincomparelab.com, qifqbo.com) state the same totals.
- **No free trial:** "While we do not offer a free trial, we do offer a 30-day money-back guarantee": https://support.simplifi.quicken.com/en/articles/3363727-quicken-simplifi-subscription-questions (updated 2026-09-22). One third party claims a 7-day trial; the vendor help page contradicts it.
- **Net worth:** "Net worth over time" is listed under "What's included in every plan": pricing-comparison page above.
- **Region:** US and Canada (refund form is for US or Canada customers; fincomparelab.com says US/Canada only).
- **Price history (in window):** list price was $5.99/mo ($71.88/yr) per Business Insider (2025-05-09) and PriceTimeline (2025-06-03), both third-party; the vendor now shows $6.99. So the list rose about 16.7% at an undated point between mid-2025 and May 2026 (fincomparelab.com already quotes $6.99 on 2026-05-14). Earlier history from pricechangenews.com (2024-10-10, third-party): about $36/yr in 2020 rising to $71.88 in 2024.

### 2.5 Kubera
- **Plans:** Essentials **$250/yr**; Black **$2,500/yr**; no monthly price listed. Vendor sources: https://www.kubera.com/ ("$250 a year, not 1% of your wealth"), https://help.kubera.com/article/129-what-is-kubera-black (updated 2026-10-26), https://www.kubera.com/wealth-tracker. **Verified.**
- **Trial:** vendor pages say "first 14 days are free"/"fourteen-day trial". Third parties (usenino 2026-09-25; wellkeptwallet 2024; daytradereview) say the trial costs $1 non-refundable. **Conflict unresolved.**
- **Gold tier:** wealthypot.com (checked 2026-10-19, third-party) reports a "Gold" tier at $10,000/yr. I could not see it on a vendor page. **Unverified.**
- **Sync:** read-only feeds from many aggregators (Plaid, Finicity, MX, Yodlee, Akoya, SnapTrade, Lean, Akahu, Salt Edge) plus manual entry and tickers (wealthypot.com, third-party summary of Kubera's docs). Vendor home page: "Thousands of banks and brokerages worldwide ... manually track ... using tickers".
- **Price history:** archived pages cited by wealthypot.com: Personal $150/yr (2024-03-01); Essentials $249 and Black $2,499 (2025-04-30); $250 / $2,500 (2026-06-10). A $150 to $249 rise (+66%) therefore happened between March 2024 and April 2025; the exact date is unknown, so it may or may not fall in the 24-month window. The later step to $250 is rounding.

### 2.6 Empower (free Personal Dashboard)
- **Free:** "Your award-winning dashboard and features will remain free": https://www.empower.com/empower-personal-wealth-transition; net worth tool "free Dashboard": https://www.empower.com/net-worth; "Empower Personal Dashboard is free. There is no paid version" (NerdWallet, 2025-04-24, third-party).
- **How it makes money (vendor):** Personal Strategy fees **starting at 0.89% of assets, $100k minimum**; Empower Premier Managed Account from **0.50%**, no minimum; brokerage with 1,000 free trades a year: https://www.empower.com/products-solutions/investment-accounts. Users with $100k+ may be contacted about becoming a client (stockanalysis.com, 2024-11-21, third-party).
- **Region:** "we currently only support U.S. based financial institutions (currency in USD)"; a US phone number is required; manual accounts can be added: https://support-personalwealth.empower.com/hc/en-us/articles/201169680-Can-I-link-an-international-account-in-Empower-Personal-Dashboard (updated 2024-11-06). A competitor blog (kubera.com, August 2026) says the standalone Dashboard app merged into the main Empower app in late 2025. That is a competitor's claim, unverified.

### 2.7 Lunch Money
- **Plans:** Monthly **$10**; Annual **$100** with "Set your own price!" (slider); 30-day trial, no card; "Your price is locked in for life"; coupon codes discontinued; prices also in CAD and EUR (no GBP): https://lunchmoney.app/pricing. **Verified.**
- **History (founder blog, 2024-07-16):** launched Aug 2019 at $3/mo or $29/yr; raised by $1 per major feature to $8/mo in March 2020; $10/mo or $100/yr from January 2021; in **summer 2023** introduced pay-what-you-want annual "from $40 up to $150" and says revenue "nearly doubled" a year later: https://lunchmoney.app/blog/we-lowered-our-pricing. The current page shows only the $100 default; third parties disagree on the minimum ($40 in the 2024 blog, $60 in familymoneyadventure.com 2025-12-30). Treat the floor as unverified.
- **Net worth / sync:** net worth = assets minus liabilities from monthly snapshots (https://support.lunchmoney.app/home/net-worth). Plaid sync for US, Canada and 17 European countries (not the UK); manual accounts, CSV/PDF import and a developer API for the rest; "Almost 40% of our users are international": https://support.lunchmoney.app/guides/automatic-imports (updated 2026-08-10). UK banks only via third-party tools (Lunch Flow, Synci).

### 2.8 PocketSmith
- **Plans (vendor plans page, as served today in USD):** Foundation $9.99/mo billed annually ($14.95 billed monthly), Flourish $16.66 ($24.95), Fortune $26.66 ($39.95); Free = 2 accounts, 2 dashboards, 12 budgets, manual imports, 6-month projection: https://www.pocketsmith.com/pricing/ and https://my.pocketsmith.com/plans. **Verified (USD).**
- **GBP:** the same page with currency set to GBP (ozbargain.com mirror) shows identical numbers in £, and CrestCast (2026-09-16, third-party) says UK users are billed in GBP: £9.99 / £16.66 / £26.66 on annual billing, £14.95 / £24.95 / £39.95 monthly. Billing currency is fixed by the country chosen at sign-up.
- **Net worth:** "Keep track of your net worth by seeing all your assets and debts" is listed under features included in all plans.
- **Price history:** plans were restructured in 2023 (vendor learn centre: https://learn.pocketsmith.com/ ... subscribing-via-the-app-store-vs-directly-with-pocketsmith); the vendor's product-history page says the price in July 2023 equalled the 2011 price. A tracker (pricetrack.dev) claims a +50% rise on 2026-08-04, but the vendor page captured on 2026-10-27 and CrestCast's 2026-09-16 capture both show the lower annual-billing numbers, so I treat that claim as a scraper error. **No verified change in window.**

### 2.9 Boldin (formerly NewRetirement)
- **Plans:** Basic free; PlannerPlus **$168/yr** ($14/mo billed annually); Boldin Advisors flat fee $3,200 for a plan checkup, ongoing advice from $1,200/yr: https://www.boldin.com/retirement/pricing, vendor help https://help.boldin.com/en/articles/17273227-how-much-does-boldin-cost ("PlannerPlus is $168 per year ... try free for 14 days"). **Verified.**
- **Price rise (vendor):** new subscriptions move from **$144 ($12/mo billed annually) to $168 ($14/mo)** on **2026-10-15**; existing subscribers keep their renewal price "currently": https://www.boldin.com/retirement/plannerplus-price-increase-october-2026/ (posted 2026-10-01), LinkedIn post 2026-10-06. Stated reason: sustained investment in tax planning, investments and retirement-income features. An earlier $120 to $144 rise in July 2025 is reported only via reader comments (hudsonweekly.com, 2026-10-23, third-party), so unverified.
- **Net worth:** "Real time net worth analysis" is a PlannerPlus feature (feature table on pricing page); Basic does not have it. No monthly plan (robberger.com, 2026-09-26, third-party). US taxpayers only.

### 2.10 Tiller
- **Plan:** one plan, **$99/yr**, 30-day free trial, card charged at the end, "another 30 days backed by a full refund": https://www.tillerhq.com/pricing/ and https://tiller.com/pricing/. **Verified.**
- **Price rise (vendor):** "For the first time in six years, we're increasing our annual fee to $99, effective August 1, 2026" (from $79). August renewals pay $99; June/July renewals keep the current rate; trials unaffected until next year. Reasons given: costs since 2020, Plaid added as a second data partner, better categorisation, redesigned console: https://community.tiller.com/t/update-to-tillers-annual-price-starting-in-august-2026/34853 (posted 2026-06-17, author "peter" on Tiller's official forum).
- **Sync:** Yodlee plus Plaid daily feeds into Google Sheets or Excel templates (budget, net worth, debt, savings). No monthly plan.

### 2.11 Ghostfolio
- **Plans:** Open Source (self-hosted) free; Basic (managed cloud) free; Premium **USD 48 per year**: https://ghostfol.io/en/pricing and https://ghostfol.io/en/faq. **Verified.**
- **Net worth / sync:** "open source wealth management application for individuals to keep track of their net worth" (FAQ). No bank/broker auto-sync; transactions go in by hand, CSV or API (portfolioglance.com review, third-party). Revenue from Premium pays hosting and data providers; the project does not sell data.

### 2.12 Wealthfolio
- **App:** free, open source, "no account required", manual accounts and CSV, net worth, spending and planning in the free app: https://wealthfolio.app/.
- **Connect (optional paid layer):** Basic $2.99/mo or $29/yr (encrypted device sync); Essentials $7.99 or $79 (up to 5 broker connections via SnapTrade); Duo $12.99 or $129 (2 people, 12 connections); Plus $24.99 or $249 (AI/news tier, listed as coming soon); "2 months free" on yearly: https://wealthfolio.app/connect/. Prices in USD; subscriptions renew at the then-current price and the vendor promises "reasonable advance notice of material price increases": https://wealthfolio.app/connect/legal/terms-of-use/ (dated 2026-10-06). **Verified.**

### 2.13 Sharesight
- **UK plans (GBP, VAT included):** Free (1 portfolio, 10 holdings); Starter **£6/mo** billed annually (1 portfolio, 30 holdings); Standard **£14/mo** annual or £18.67 monthly (4 portfolios, unlimited holdings); Premium **£21/mo** annual (10 portfolios): https://www.sharesight.com/uk/pricing/. FAQ: "save approximately 25% by choosing annual billing." **Verified.**
- **US plans (USD):** Starter $7/mo ($9.33 monthly), Standard $18 ($24), Premium $23.25: https://www.sharesight.com/pricing/.
- **Trial:** an older UK landing page says paid plans include a 7-day free trial and shows previous plan names and prices (Starter £5.36, Investor £12.51, Expert £18.76 per month billed annually; £8 / £18.67 / £28 monthly): https://www.sharesight.com/uk/thedividendexperiment/. The change to £6 / £14 / £21 (about +12%) and the rename Investor to Standard, Expert to Premium (2025 per stockrover.com, third-party) cannot be dated precisely.
- **Not a net-worth app:** it is a portfolio performance/tax reporting tool; it has cash accounts and unlisted holdings but no budgeting or bank feeds.
- **History:** price rises April 2022 (CEO letter quoted by captainfi.com) and the CGT report was removed from the free plan in April 2023 (ozbargain forum); both outside the window.

### 2.14 Rocket Money
- **Plans:** Free; Premium is "pay what you think is fair", **typically $7 to $14 per month** (subject to change), 7-day trial; Premium+ **$15/month** fixed; bill negotiation costs 35-60% of first-year savings on Free/Premium and nothing extra on Premium+: https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost (2026-01-19), https://help.rocketmoney.com/en/articles/2217739-how-much-does-rocket-money-cost (2026-10-23). **Verified.**
- **Net worth:** Free = no net worth tracking; Premium and Premium+ = net worth tracking (feature table on the learn page above).
- **Sync / region:** Plaid, US banks only (wealthypot.com, 2026-10-18, third-party).
- **Change in window:** typical Premium range reported as $6-$12 (Business Insider 2025-05-21, third-party) versus **$7-$14** on the vendor page in January 2026; Premium+ and the "Rowan" AI assistant launched 2026-08-25 (everyticker.com, 2026-08-26, third-party; vendor upgrade guide dated 2026-09-22).

### 2.15 Other net-worth / budgeting apps found
- **Origin (US):** $12.99/mo or $99/yr (35% saving stated); 7-day trial but "currently unavailable due to the $1 for a year promotion" (vendor support, updated 2026-10-13): https://support.useorigin.com/hc/en-us/articles/21022711456141-How-much-does-Origin-cost and https://useoriginsupport.zendesk.com/hc/en-us/articles/27510286380685-What-is-the-difference-between-an-annual-and-monthly-plan. The sign-up page says "$9 for one year, renews at $99": https://app.useorigin.com/sign-up/dtc. Promo wording conflicts ($1 versus $9). Net worth tracking is a headline feature.
- **Finary (EU):** Plus **€149.99/yr** (or €24.99/mo, help article says annual costs half the monthly), Lite €54.99/yr, Pro €349.99/yr, free tier "€0 forever", 14-day trial; the vendor pricing snapshot still shows a Black Friday 2025 banner (€99.99 Plus / €299.99 Pro with code), so the snapshot is stale: https://finary.com/en/pricing, https://help.finary.com/en/articles/6525572-subscribe-to-finary (2025-02-03), App Store listing https://apps.apple.com/de/app/finary-budget-money-tracker/id1569413444. **Not fully verified as current.**
- **Fina Money:** Free (up to 2 bank connections, Google Sheets, manual entry); Premium $8.25/mo billed yearly or $12/mo; Business $20 or $25: https://www.fina.money/pricing (search highlight) and toplistly.com (third-party). Business monthly price third-party only.
- **Emma (UK):** Basic free; Plus £4.99/mo or £41.99/yr; Pro £9.99 or £83.99; Ultimate £14.99 or £124.99; "30% off" annual; **net worth only on Pro and Ultimate**; CSV import/export only on Pro+; Open Banking: https://emma-app.com/plans/compare-emma-plans, https://help.emma-app.com/en/article/how-much-does-emma-plusproultimate-cost-1ywhulq/ (updated 2026-09-15), https://help.emma-app.com/en/article/what-are-the-features-of-emma-plus-pro-and-ultimate-678fjp/ (updated 2026-05-05). **Verified.** Which? (updated 2026-10-06, third-party) notes monthly budgets, category tracking and trends "have since been moved to Emma subscriptions" from the free version (undated).
- **Moneyhub (UK):** £1.49/mo or £14.99/yr (£0.99 / £9.99 when paid direct), 6 months free for new users (moneytothemasses.com 2024-12-03, wiseabout.money 2023, third-party). The company stopped new sign-ups in Feb 2025 (fintechfutures.com 2025-02-14) and **the consumer app closed on 31 July 2026**; users were offered a move to WPS LifeStage (one-month trial): https://moneyhubhelp.zendesk.com/hc/en-gb/articles/48275693667217-Moneyhub-App-Closure-and-Your-Account-Options (updated 2026-10-15). An earlier press report (thesun.co.uk, 2025-03-09) said 14 Aug 2026; the vendor's later article says 31 July. Price figures are **third-party only**.
- **ProjectionLab:** Basic free (plans not saved); Premium **$129/yr**; Pro $549/yr; 7-day trial; no account linking by design; tax presets for the UK and others. Vendor pricing page confirms Basic/Premium/Pro cards and Pro $549 (Premium price not printed in the crawl): https://projectionlab.com/pricing. $129 and the Premium rise from $109 come from thecollegeinvestor.com, firenum.com and stockmarketstack.com (third-party). **Lifetime ($1,199) and monthly Premium: sources conflict** (stockmarketstack says retired; the vendor page now shows only Basic/Premium/Pro cards). Self-hosting discontinued March 2025 (stockmarketstack). **Premium price unverified on a vendor page.**
- **Banktivity (Apple only):** Bronze $6.99, Silver $8.99, Gold $10.99 per month billed annually, 30-day trial: https://www.banktivity.com/content/plans/plans.php (verified). MacRumors 2026-10-27 advertises 30% off first year (third-party affiliate).
- **Moneydance:** $65 one-time, free next major upgrade, 90-day refund, optional Plaid sync about $40/yr (the page I read is on a non-vendor domain, moneydance.co.com; qifqbo.com, 2026-08-24, says the vendor loads $65 into its Buy button). **Unverified on a vendor page.**

---

## 3. Price rises, tier changes and removals in the last 24 months (2024-10-27 to 2026-10-27)

| App | What changed | Date | Stated reason | Source type |
|---|---|---|---|---|
| Tiller | $79 to $99/yr (+25%) | Effective 2026-08-01 | Costs up since 2020; Plaid added as second data partner; better categorisation | Vendor forum post |
| Boldin PlannerPlus | $144 to $168/yr (+16.7%) for new subscribers; existing keep rate "currently" | 2026-10-15 | Continued investment in tax, investment and retirement-income tools | Vendor blog + LinkedIn |
| Boldin PlannerPlus | $120 to $144/yr (+20%) | July 2025 | Not stated | Third-party (reader comments) only, unverified |
| Quicken Simplifi | List $5.99 to $6.99/mo (+16.7%); promo stays $3.99 | Undated, between 2025-06 and 2026-05 | Not stated | Vendor page now; earlier list from third-party (Business Insider 2025-05-09, PriceTimeline 2025-06-03) |
| Monarch | New **Plus** tier at $299, cut to $199/yr within days; Core unchanged at $99.99 / $14.99 | 2026-04-20 launch | Monarch staff: two tiers let it invest "without raising prices on everyone"; Core not raised "in 4 years" | Vendor blog; staff quote via Reddit mirror (third-party copy) |
| Rocket Money | Premium typical range $6-12 to $7-14; **Premium+ $15** added | Range: between 2025-05 and 2026-01; Premium+: 2026-08/09 | Not stated; Premium+ adds AI assistant and fee-free negotiation | Vendor help + third-party for older range |
| Kubera | $150 (Personal) to $249 (Essentials) +66%; Black $2,499; later $250 / $2,500 | Between 2024-03 and 2025-04, undated | Not stated | Third-party (archive pages quoted by wealthypot.com) |
| Kubera | "Gold" $10,000/yr tier | Appears 2026-10-19 | Not stated | Third-party only, unverified |
| ProjectionLab | Premium $109 to $129 (+18%); monthly and Lifetime plans reported retired | 2025-26, undated | Not stated | Third-party, conflicting |
| Sharesight UK | Plan names changed (Investor/Expert to Standard/Premium); prices about +12% vs an older capture | 2025, undated | Not stated | Vendor pages (old vs new) + third-party for the rename |
| Wealthfolio | Paid **Connect** layer added (core app stays free) | Undated | Funds sync/backup convenience | Vendor |
| Moneyhub | Stopped new sign-ups Feb 2025; app closed 2026-07-31 | 2025-02 to 2026-07 | Pivot to B2B | Vendor help + trade press |
| Emma | Budgeting and trends moved from free to paid | Undated | Not stated | Third-party (Which?) |
| PocketSmith | No verified change (a tracker's +50% claim contradicts the vendor page) | n/a | n/a | n/a |
| Copilot | No verified change found ($13/$95 quoted since at least 2025-06) | n/a | n/a | n/a |
| YNAB | $99 to $109/yr | 2024-08-01 (about 26 months ago, just outside the window) | Not stated | Vendor banner via Vox, fundkeep.app |
| Lunch Money | Lowered annual price floor (pay-what-you-want) | Summer 2023 (outside) | "Accessibility over maximising profit" | Vendor blog |
| Monarch free membership | Removed | Summer 2023 (outside) | n/a | Third-party |

**Removal of free tiers inside the window:** I found no verified instance among the apps that still have a free plan (Empower, Ghostfolio, Wealthfolio, Boldin Basic, PocketSmith Free, Sharesight Free, Fina Free, Emma Basic). The closest are Emma moving budgeting features behind paid plans (undated) and Moneyhub withdrawing from the consumer market. Mint's shutdown (March 2024) is also outside the window.

---

## 4. Patterns I can support from the rows above

All arithmetic is mine from the vendor figures in sections 1-2.

1. **Typical monthly price band.** For month-to-month billing on US-style synced budgeting/net-worth apps the cluster is **$10-$15/month**: Lunch Money $10, Origin $12.99, Fina Premium $12, Copilot $13, Monarch $14.99, YNAB $14.99, Rocket Money Premium+ $15 (Premium $7-$14 sliding). PocketSmith's entry paid plan is £14.95 monthly. Cheap outliers are Simplifi (annual only, $3.99 promo / $6.99 list per month), Ghostfolio ($4), Wealthfolio Connect Basic ($2.99), Emma Plus (£4.99).
2. **Typical annual price.** Six mainstream synced apps sit within **$95-$109 per year** (Copilot $95, Origin $99, Tiller $99, Monarch $99.99, Lunch Money $100, YNAB $109; median $99.50, about $8.25/month). Top-of-range single-product planners and wealth tools: Boldin $168, Monarch Plus $199, Kubera $250. Entry/open-source: Ghostfolio $48, Wealthfolio Connect $29-$79, Simplifi $47.88 promo / $83.88 list.
3. **Typical annual discount versus monthly billing.** For the 12 vendors in the set that publish both a monthly and an annual price (Endute 31% and CrestCast 17% also publish both but are UK minnows and left out of the median) the per-vendor median is about **32%** (range about 17% to 50%): Finary 50%, Monarch 44%, Origin 37%, YNAB 39%, Copilot 39%, PocketSmith 33%, Fina 31%, Emma about 30%, Sharesight 25%, Wealthfolio about 17-19%, Lunch Money 17%, Arden 17%. Large US apps cluster at 39-44%; smaller apps use "two months free" (about 17%). Many apps publish only an annual price (Simplifi, Boldin, Tiller, Kubera, Ghostfolio, ProjectionLab, Sharesight's free-to-paid ladder is annual-first).
4. **Lifetime plans.** Of the 18 mainstream subscription products reviewed in sections 1-2 (Monarch, Copilot, YNAB, Simplifi, Kubera, Empower, Lunch Money, PocketSmith, Boldin, Tiller, Ghostfolio, Wealthfolio, Sharesight, Rocket Money, Origin, Finary, Fina, Emma), **none lists a lifetime licence** on its vendor pages. Lunch Money's "price locked for life" is a price guarantee, not a licence. ProjectionLab sold a $1,199 lifetime plan and sources conflict on whether it still does. By contrast, every small manual/offline indie app I found uses a one-time or lifetime price (10 of 10, see section 5), but that sample was found by searching for them and is not representative.
5. **Free tier and trial.** Permanent free tiers: Empower, Ghostfolio, Wealthfolio, Boldin Basic, PocketSmith, Sharesight, Fina, Emma, Finary, ProjectionLab Basic. Paid-only products with a trial: Monarch (7 days), Copilot (1 month), YNAB (34 days, no card), Lunch Money (30 days, no card), Tiller (30 days + 30-day refund), Kubera (14 days), Origin (7 days, suspended during promo), Rocket Money Premium (7 days). Simplifi has **no trial**, only a 30-day refund. Among the 12 mainstream products with a trial period (those above plus Boldin 14 days, Emma 7, Finary 14, Sharesight 7), 7 days is the most common (5 of 12), then 30+ days (4 of 12: Copilot, YNAB, Lunch Money, Tiller), then 14 days (3 of 12). Only YNAB and Lunch Money say no card is needed.
6. **Net worth is bundled, not gated, in most paid plans.** Included in the base plan at Monarch, Copilot, YNAB, Simplifi, Lunch Money, Tiller, Kubera, PocketSmith and the free tiers of Empower, Ghostfolio and Wealthfolio. Gated to a higher tier at Boldin (PlannerPlus), Rocket Money (Premium), Emma (Pro).
7. **Headline prices are often promotional.** First-year or sale pricing is advertised by Simplifi (43% off list), Origin ($1 or $9 first year), Banktivity (30% off, third-party), Monarch (WELCOME code 30% off year one, third-party), Finary (Black Friday). Compare list prices.
8. **Top-tier ladders.** Where a ladder exists the top tier is roughly 2x to 10x the entry tier (Monarch Plus about 2x Core; PocketSmith Fortune 2.7x Foundation; Kubera Black 10x Essentials; Wealthfolio Plus 8.6x Basic).
9. **Geography.** Monarch, Copilot, Simplifi, Rocket Money, Boldin, Tiller and Empower are North America (mostly US) only. UK-capable: YNAB, PocketSmith, Kubera, Sharesight (UK edition), Emma, Ghostfolio, Wealthfolio, Lunch Money (manual/CSV only for UK). None of the US apps shows a GBP price.

---

## 5. Manual-entry / no-sync apps versus synced apps

**Why sync costs money.** Plaid's own billing docs state that the Transactions, Investments and Liabilities products use a **monthly subscription fee per connected account (Item)**, charged for as long as the connection exists even if no calls are made: https://plaid.com/docs/account/billing/. Rates are negotiated and not published; a figure I saw quoted (about $0.30 per account per month, 2020 forum post) is anecdotal and I do not rely on it. Vendors say the same in their own words:
- Mozaic Finance: "Plaid and SnapTrade bill us for every account you keep connected, every month, whether you open Mozaic or not" (https://mozaicfinance.com/pricing).
- Endute: "Bank connections cost real money per call, and the only honest way to pay for them is a subscription" (https://endute.com/pricing).
- Arden: "Plaid bank sync costs us a per-account monthly fee" (https://ardenmoney.com/pricing/).
- Monarch's pricing page says free services "can't dedicate the same amount of resources" to data connectivity and quality, which is its argument for charging (https://www.monarch.com/pricing). That is a positioning claim, not a cost disclosure.

**How manual or no-sync products price.**

| Product | Manual / local price | Synced equivalent (same vendor or peer) | Source (retrieved 2026-10-27) |
|---|---|---|---|
| Arden (same vendor, both tiers) | **Privacy: $5/mo or $50/yr** (manual and CSV/XLSX/OFX only) | Plus: $12/mo or $120/yr (adds Plaid) | https://ardenmoney.com/pricing/ ("current as of May 2026"). Manual tier is **42% of the synced price** |
| Mozaic Finance (CA) | Free: manual accounts, CSV, budgets, net worth | Premium $99 CAD/yr or $12.99 CAD/mo for sync + AI categorisation | https://mozaicfinance.com/pricing |
| Wealthfolio | Free app (manual + CSV) | Connect $29-$129/yr (sync/brokers) | https://wealthfolio.app/connect/ |
| Moneydance | $65 once (unverified source) | Sync add-on about $40/yr | moneydance.co.com (non-vendor domain) + qifqbo.com |
| Ghostfolio | Free / $48 Premium | n/a (no sync) | https://ghostfol.io/en/pricing |
| Fina | Free (manual, up to 2 bank links) | $8.25/mo for unlimited bank connections | https://www.fina.money/pricing |
| PocketSmith | Free manual-import plan | $9.99-$26.66/mo billed annually | https://www.pocketsmith.com/pricing/ |
| ProjectionLab | **Manual by design: $129/yr** | Synced rivals Monarch $99.99, Tiller $99 | thecollegeinvestor.com etc. (third-party) |
| Worthy (iOS/Android) | **$16.99 once**; free up to 5 assets | n/a | https://joinworthyapp.com/ |
| Worthtally | Free; Pro $9.99/yr or **$29.99 once** | n/a | https://trueframedigital.app/worthtally/ |
| PrivateWorth (web) | Free; Pro **$29 once** | n/a | https://www.privateworth.app/ |
| Netwhat (UK-friendly, GBP/USD/EUR) | Free, no limits; Pro **$12.99 one-off** (launch price, was $20) | n/a | https://netwhat.app/ |
| Coffer (iOS) | Free; **$29.99 / $49.99 once** | n/a | https://getcoffer.app/ |
| Lume (Mac/iPhone) | **$9.99 launch, then $19.99 once** | n/a | https://lume-app.dev/ |
| Networthy (iOS) | Free (2 assets); lifetime premium one-off (price not shown in the crawl) | n/a | https://apps.apple.com/us/app/networthy-net-worth-tracker/id6757678571 |
| WorthOS | Free; $39 Starter Kit one-time | n/a | https://worthos.corycopeland.dev/ |
| CrestCast (UK household forecast, "No bank login") | **£7.99/mo or £79.99/yr** (about 17% annual saving), 30 days free no card | n/a | https://crestcast.co.uk/ |
| Endute (UK; synced) | £5.83/mo billed £69.99 annually (31% off monthly), 37-day trial | n/a | https://endute.com/pricing |
| My Financial Freedom Tracker (EU web, manual-first) | €4.99/mo, €49.90/yr or €299 lifetime | n/a | myfinancialfreedomtracker.com (author's own blog, 2026-06-12) |

**What the table supports.**
- Where a vendor sells the same product with and without sync, manual or local tiers are priced at **0% to about 50%** of the synced tier (Arden 42%, Wealthfolio and Mozaic free versus $29-$129, Fina free).
- Small private/offline apps that need no recurring data costs overwhelmingly use **one-time pricing of roughly $10-$65** (Worthy $16.99, Lume $19.99, Worthtally $29.99, PrivateWorth $29, Coffer $29.99-$49.99, Moneydance $65).
- The exceptions are **planning and forecasting tools**, which are manual but priced as high as synced apps because buyers pay for the model, not the feed: ProjectionLab $129/yr, Boldin $168/yr, CrestCast £79.99/yr, Monarch Plus $199/yr. So no-sync does not by itself imply a low price; the pattern is "tracking = cheap or one-off, planning = $80-$200/yr".
- A manual app that wants a recurring fee competes at the Arden / CrestCast level (about $50-$100 a year), which is at or below synced-app prices ($95-$109).

---

## 6. Indicative GBP equivalents (estimates)

Basis: Bank of England daily spot rates for 26 Oct 2026 (https://www.bankofengland.co.uk/boeapps/database/Rates.asp, retrieved 2026-10-27): US$1 = £0.7492; £1 = €1.1940. The BoE states these are not official rates. Cross-check: exchangerates.org.uk shows £1 = US$1.3345 and €1.1944 for the same date. These are my conversions of USD/EUR list prices, **not prices charged**; a UK buyer would see local VAT/app-store pricing instead.

| Product | Native price | ~GBP |
|---|---|---|
| Copilot annual / monthly | $95 / $13 | £71.17 / £9.74 |
| Tiller annual | $99 | £74.17 |
| Origin annual | $99 | £74.17 |
| Monarch Core annual / monthly | $99.99 / $14.99 | £74.91 / £11.23 |
| Lunch Money annual / monthly | $100 / $10 | £74.92 / £7.49 |
| YNAB annual / monthly | $109 / $14.99 | £81.66 / £11.23 |
| Simplifi list / promo year one | $83.88 / $47.88 | £62.84 / £35.87 |
| Ghostfolio Premium | $48 | £35.96 |
| Wealthfolio Connect Basic / Essentials / Duo (annual) | $29 / $79 / $129 | £21.73 / £59.19 / £96.65 |
| ProjectionLab Premium (unverified) | $129 | £96.65 |
| Boldin PlannerPlus | $168 | £125.87 |
| Monarch Plus | $199 | £149.09 |
| Kubera Essentials / Black | $250 / $2,500 | £187.30 / £1,873.00 |
| Finary Plus / Lite (annual) | €149.99 / €54.99 | £125.62 / £46.06 |
| Rocket Money Premium (range) / Premium+ | $7-$14 / $15 per month | £5.24-£10.49 / £11.24 per month |
| Moneydance one-time (unverified) | $65 | £48.70 |
| Worthy / Netwhat Pro / Worthtally / PrivateWorth (one-off) | $16.99 / $12.99 / $29.99 / $29 | £12.73 / £9.73 / £22.47 / £21.73 |
| Arden Privacy / Plus (annual) | $50 / $120 | £37.46 / £89.90 |

Native GBP prices (no conversion): Sharesight UK £6 / £14 / £21 a month billed annually; Emma Plus £41.99, Pro £83.99, Ultimate £124.99 a year; PocketSmith £9.99 / £16.66 / £26.66 a month billed annually (£14.95 / £24.95 / £39.95 monthly); CrestCast £7.99 a month or £79.99 a year; Endute £69.99 a year; Moneyhub (closed) £14.99 a year.

---

## 7. Where Vault·It's current plans sit (arithmetic only)

Vault·It's own figures come from the task brief (Pioneer £5.99/mo or £59.99/yr, app copy £49.99/yr; Founder lifetime £199 on the landing page versus £149 in the app). This section is arithmetic, not a recommendation.

- £5.99/mo = about US$8.00 and £59.99/yr = about US$80.07 at the 26 Oct 2026 rate; £49.99/yr = about US$66.72. For comparison the synced mainstream cluster is $95-$109 (about £71-£82) and the cheapest mainstream synced list price is Simplifi at $83.88 (about £62.84).
- The implied annual saving is 16.5% at £59.99 and 30.5% at £49.99 versus 12 monthly payments of £5.99 (£71.88). The per-vendor median in the comparables is about 32%; Lunch Money (17%) is the low end among the mainstream apps, Monarch (44%) the high end.
- A lifetime price of £199 equals about 3.3 years of Pioneer at £59.99 (4.0 years at £49.99); £149 equals about 2.5 years (3.0 years). £199 is about US$266, slightly above one year of Kubera Essentials (US$250/yr, the highest-priced single-tier consumer subscription in the set), and well above the one-off prices of manual/offline apps ($10-$65). Among mainstream subscription products, none was found with a lifetime licence.
- Direct UK manual competitors on price: CrestCast £79.99/yr, Netwhat free / $12.99 one-off, Endute £69.99/yr (synced), PocketSmith £9.99 a month on annual billing for the entry paid plan.

---

## 8. Disagreements and open items

1. **Monarch Plus price:** $299 (press release 2026-04-21) versus $199 (Monarch blog and staff post within days) versus $199.99 (third-party reading of the pricing card). Use $199 from the vendor blog; the live card was not visible in my crawl.
2. **Kubera trial:** "14 days free" on vendor pages versus "$1 non-refundable" in third-party reviews. Kubera "Gold $10,000" appears on one third-party page only.
3. **Lunch Money annual floor:** $40 (vendor blog 2024) versus $60 (third-party 2025) versus "set your own price" starting at $100 on the current page.
4. **ProjectionLab:** Premium $129 only third-party; Lifetime $1,199 and monthly Premium are described as retired by one source and as current by another; the vendor pricing page shows only Basic, Premium and Pro.
5. **Moneyhub closure date:** 14 Aug 2026 (earlier press) versus 31 Jul 2026 (vendor, October 2026 article). Prices are third-party only.
6. **Simplifi trial:** vendor help says none; one third-party says 7 days.
7. **Origin promo:** "$1 for a year" (support page) versus "$9 for one year" (sign-up page).
8. **PocketSmith:** a price-tracker site's claimed +50% rise on 2026-08-04 is contradicted by the vendor pricing page captured 2026-10-27. Treated as an error.
9. **Finary:** vendor pricing snapshot is stale (Black Friday 2025 banner). Base prices are consistent across the help article, the App Store listing and the snapshot.
10. **Copilot:** the live /pricing page text did not print numbers in the crawl; prices rest on two other vendor-owned surfaces. One 2024 third-party article says "$92 annually".

## 9. Gaps (not verified, so not stated as fact)

- Plaid's per-connection rates are not public; I give no cost-per-user figure.
- No GBP price exists for Monarch, Copilot, YNAB, Kubera, Lunch Money (EUR/CAD only), Tiller, Boldin, Rocket Money, Origin; GBP above is converted.
- Not covered in depth: Stockopedia-style UK portfolio trackers, Getquin/Parqet/Snowball, Cleo/Snoop/Plum, Quicken Classic, Actual Budget, Firefly III, GnuCash (free), Portfolio Performance (free desktop; mobile premium reported at $25/yr by one third-party only).
- Unit economics or margin data for any competitor were not found.
- Renewal-price behaviour for existing customers is vendor-specific and mostly undocumented (Lunch Money locks for life; Boldin "currently" grandfathers; Quicken renews at current retail; Tiller applies the new price at the next renewal).
- Not verified: Boldin's July 2025 price change, Kubera's exact rise date, Sharesight's price-change date, Emma's removal of free budgeting features.
- Prices were retrieved on one date (2026-10-27). Several vendors (Origin, Banktivity, Monarch, Finary) run time-limited promotions that may already have changed.
