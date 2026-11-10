# Funnel benchmarks for the Vault·It sign-up / pre-sale page (sourced numbers only)

Research date: **2026-10-27**. Every figure below was read on 2026-10-27 from the URL next to it, unless marked otherwise.
Method note: `WebFetch` could not reach most hosts from this session (DNS blocked, e.g. unbounce.com), so pages were read with the Exa fetch/search tool, which returns the live page text. Meta's own pages (facebook.com/business) could not be opened at all; Meta figures are therefore marked **secondary / not verified at source**.

Rules followed: no figure from memory; numbers with different definitions are **not averaged**; every estimate or scenario is labelled as such with its inputs.

---

## 0. The short version

| Stage | Best available benchmark (definition) | Source quality |
|---|---|---|
| Ad click (UK, Meta, all industries) | median CPC ≈ **£1.18** (range £1.02–£1.49 by month, Jul 2025–Jul 2026) | Vendor dataset, $3B spend, all click types — medium |
| Ad click (US, Meta, Finance & Insurance, traffic objective) | median CPC **$0.86** (2026 edition), $1.22 (2025 edition) | Vendor customer data, US only — medium |
| Landing page visit → conversion (finance) | median **8.3%**; Facebook-sourced **10.1%**; *investing* sub-category **3.9%** | Unbounce, 41k pages, Jul 2023–Jul 2024 — good, but "conversion" includes clicks, not only forms |
| Waitlist page visit → sign-up | overall median **7.8%**; *fintech* median **5.2%** | Waitlister tool, sample size not published — weak |
| Sign-up → confirmed (double opt-in) | **73%** (35,000+ DOI processes, 2024) vs **46.4%** median per waitlist (128 waitlists) | Two vendors, different definitions — medium/weak |
| Email list → Kickstarter backer | **1–5%** "good yield" | Kickstarter's own guidance — guidance, not measured data |
| Kickstarter pre-launch follower → backer | **32%** on average (17% for post-launch followers) | Kickstarter, Oct 2025 — good (platform's own data, method not shown) |
| Waitlist → paid (software) | **5–25%**, ~20% if released within a month, <10% after 3 months | Lenny's Newsletter, 2022, informal founder poll — weak |
| Day-35 download → paid (subscription apps) | median **2.1%** freemium vs **10.7%** hard paywall; Western Europe all-app median **2.0%** | RevenueCat, 115k apps, 2025 data — good |

**Headline implication (scenario arithmetic, section 8):** on the sourced rates, a confirmed email bought with UK Meta ads costs roughly **£14–£82** (base case ≈ £16–£31), and Kickstarter's 1–5% email→backer yield turns that into roughly **£320–£3,100 of ad spend per backer** — far more than a £49.99–£199 pledge. Paid ads can buy *testers and learning*, but the evidence does not support ads alone funding a first Kickstarter/pre-sale. The campaign has to be carried by a warm list and Kickstarter followers.

---

## (a) Landing-page / pre-launch / waitlist conversion rates

### a1. Unbounce Conversion Benchmark Report (2024 edition, the current one)
- Methodology: data **23 Jul 2023 – 23 Jul 2024**; **464M+ unique visitors, 57M conversions, 41,000+ landing pages**. Industries assigned by machine learning; industries/sub-categories with <400 pages excluded; pages with <50 visitors **or no conversions** excluded. Some figures are medians, some averages — the report says to check each. — https://unbounce.com/conversion-benchmark-report/methodology/ (retrieved 2026-10-27)
- Definition caveat: Unbounce counts *click* conversions as well as *form* conversions ("mixed" pages contain both). So these are not pure email-sign-up rates. — https://unbounce.com/conversion-benchmark-report/ (retrieved 2026-10-27)
- Excluding zero-conversion pages biases medians **upward** versus a brand-new page.

| Metric (Unbounce 2024) | Value | Median or average | URL |
|---|---|---|---|
| All industries | 6.6% | median | https://unbounce.com/conversion-benchmark-report/ |
| Industry medians range | 3.8% (SaaS) – 12.3% (events & entertainment) | median | same |
| "Good" = 75th percentile floor | 11.4% – 40.8% depending on industry | percentile | https://unbounce.com/landing-pages/whats-a-good-conversion-rate/ (updated 25 Jul 2025) |
| **Finance & insurance** | **8.3%** | median | https://unbounce.com/conversion-benchmark-report/finance-insurance-conversion-rate/ |
| Finance top performers | 26.1%+ | stated as "top performing" | https://unbounce.com/landing-pages/whats-a-good-conversion-rate/ |
| Insurance / credit & lending / **investing** | 18.2% / 8.8% / **3.9%** (investing top performers up to 20.6%) | median | finance page above |
| Finance by channel: paid search / paid social / email | 10.1% / 9.3% / 7.9% | median | finance page |
| Finance paid social by source: Instagram / TikTok / **Facebook** | 15.5% / 10.8% / **10.1%** | median | finance page |
| **Finance mobile vs desktop** | **11.5% vs 9.0%** ("mobile converts 27.8% better"; elsewhere "desktop converts 22% less") | **average** | finance page |
| All industries mobile vs desktop | desktop converts 8% better; 83% of visits were mobile | average | main report page |
| All-industry channel averages: email / paid social / paid search | 19.3% / 12% / 10.9% | **average** (not comparable with the 6.6% median) | main report page |
| Finance readability | 5th–7th grade copy 18.1% vs college-level 7.1% (professional-level 14.4%) | median | finance page |
| Finance word count sweet spot | 195–715 words ≈ 8.3% | median | finance page |

Internal inconsistency to note: the finance page compares mobile 11.5% with an "all-industries median of 11.2%" and desktop 9% with "12.1%" — these device figures are averages, and they are much higher than the 6.6% all-industry median, so the device numbers and the headline medians are **different statistics and must not be mixed**. A third-party site (adbenchly.com) quotes finance as 8.4% "Q4 2024"; Unbounce's own finance page says 8.3% — use 8.3%.

Unbounce also re-labels the same dataset "Q4 2024" in a 2025 post (https://unbounce.com/average-conversion-rates-landing-pages/, updated 4 Mar 2025); the methodology page gives Jul 2023–Jul 2024. Same dataset, inconsistent labelling.

### a2. Waitlist-specific (weak evidence)
- **Waitlister** "conversion rate checker": overall median **7.8%**, top 25% 18.0%, top 10% 29.0%; **Fintech median 5.2%** (top 25% 13.8%, top 10% 20.5%); Mobile Apps median 8.0%. Described only as "aggregated data from thousands of waitlists"; no sample size, period or definition of a visit. — https://waitlister.me/tools/conversion-rate-checker (retrieved 2026-10-27). **Weak: vendor tool, method unpublished.**
- **LaunchList** (701 waitlists, Jan 2023–Sep 2026, measured 2026-10-15) explicitly **does not** benchmark visitor→sign-up because visits were not recorded. — https://getlaunchlist.com/tools/waitlist-benchmark (retrieved 2026-10-27). Its statement is useful in itself: most "waitlist conversion" figures online have no visit denominator.
- Other waitlist claims seen (waitset.com "median 12.3%", waitlister guide "average 15.11%", remery.ai "25–40%", wait.dev "500+ launches") give no verifiable method — **not used**.

### a3. Email capture forms on existing sites (different definition — popups on e-commerce sites, not paid-traffic landing pages)
- Omnisend, **1.24B popup displays, 2025**: average popup conversion **2.1%**; mobile-designed popups 2.2% vs desktop-only 1.4%. — https://www.omnisend.com/blog/email-popup-statistics/ (retrieved 2026-10-27)
- Claspo, 779M+ impressions over three years: average sign-up form 3.53%. — https://claspo.io/blog/email-opt-in-examples/ (retrieved 2026-10-27)
These measure displays on sites visitors came to for another reason; they are **not** comparable with a dedicated ad-to-landing-page funnel and are shown only for context.

### a4. Form completion once started (Zuko)
- Zuko, Jan 2022–Apr 2025, 739 forms, 93M form views: view-to-completion 34.6%, starter-to-completion 51.7%; **financial services** view-to-completion 35.7%, starter-to-completion 58.4%. — https://www.zuko.io/form-statistics (retrieved 2026-10-27)
- Device (all forms, starter-to-completion): desktop 54.48%, mobile 47.53%; financial services desktop 60.75% vs mobile 53.71% (27.1M sessions); **registration** forms 60.7% overall (desktop 63.0%, mobile 57.2%). — https://www.zuko.io/benchmarking/industry-benchmarking and https://www.zuko.io/benchmarking/form-type-benchmarking (retrieved 2026-10-27)
Definition: these are rates among people who **see/start a form**, mostly multi-field application forms — not page-visit conversion.

Evidence strength (a): Unbounce is the only large, documented, recent landing-page dataset with a finance cut. No source publishes a UK-only or a "personal-finance app waitlist" median.

---

## (b) Meta (Facebook/Instagram) ad benchmarks

### b1. WordStream by LocaliQ — Facebook Ads Benchmarks 2026 (US only)
- Sample: traffic objective **1,377 US campaigns**, leads objective **452 US campaigns**, **1 Apr 2025 – 30 Jun 2026**; "averages" are medians; USD. Minimum 11 (traffic) / 4 (leads) campaigns per category. — https://www.wordstream.com/blog/facebook-ads-benchmarks-2026 (via search extract, retrieved 2026-10-27); PDF https://www.wordstream.com/wp-content/uploads/2026/09/ws-guide-facebook-ads-benchmarks-2026.pdf states 1,892 campaigns — **the PDF and the blog disagree (1,892 vs 1,377+452=1,829)**.
- Figures (read from https://localiq.com/blog/facebook-advertising-benchmarks/, last updated 23 Sep 2026, retrieved 2026-10-27):

| Metric | All industries | Finance & Insurance |
|---|---|---|
| Traffic CTR | 1.93% | **1.46%** (among the lowest) |
| Traffic CPC | $0.60 | **$0.86** (highest) |
| Leads CTR | 2.70% | not published |
| Leads CPC | $1.80 | not published |
| Leads conversion rate (click → lead) | 8.54% | not published |
| Leads cost per lead | $27.39 | not published |

- Previous edition (2025): 554 traffic + 726 leads US campaigns, 1 Apr 2024 – 30 Jun 2025; Finance & Insurance traffic CPC **$1.22**, CTR **0.98%**; leads CPL $27.66, leads CVR 7.72%. — https://www.wordstream.com/blog/facebook-ads-benchmarks-2025 (retrieved 2026-10-27). The two editions overlap by three months, and the sample shifted a lot, so year-on-year changes are not reliable.
- Caveats: US accounts only; WordStream's own customers; finance leads data not published in either edition; tiny per-category samples.

### b2. UK-specific Meta costs
- **Superads** (dataset "over $3B" Facebook spend from thousands of accounts using Superads; medians; window shown as Oct 2025 – Sep 2026 in the header but the text describes Jul 2025 – Jul 2026 — inconsistent):
  - UK CPC, all industries: median averaged **~£1.18**; low **£1.02** (Oct 2025), high **£1.49** (Dec 2025); ~13% above Superads' global baseline. — https://www.superads.ai/facebook-ads-costs/cpc-cost-per-click/united-kingdom (retrieved 2026-10-27)
  - UK CPM, all industries: averaged ~17.38 (low 13.20 Oct 2025, high 26.48 Dec 2025); **currency not stated on the page** (the CPC page uses £). — https://www.superads.ai/facebook-ads-costs/cpm-cost-per-mille/united-kingdom (retrieved 2026-10-27)
  - Superads' CPC FAQ notes "Clicks" (all clicks) differs from link clicks; the page does not say which it uses. If it is all clicks, cost per **link** click to a landing page will be higher. **Not verified which.**
- **Lebesgue** (e-commerce medians, published 27 Jul 2026, sample not stated): UK Facebook CPM **$11.81** vs US $16.08. — https://lebesgue.io/facebook-ads/facebook-cpm-by-country (retrieved 2026-10-27)
- AdAmigo UK CPM $10.31 / CPC $1.95 are self-described **"projections for 2026 based on industry benchmarks and late 2025 data"** — estimates, not measurements; not used. — https://www.adamigo.ai/blog/meta-ads-cpm-cpc-benchmarks-by-country-2026
- metaads.uk and adlibrary.com UK tables: no verifiable methodology ("synthesised"); **not used**.
- **No source found with a UK or European finance-specific Meta CPC or cost per lead.** Varos, Triple Whale and Bïrch/Revealbot publish mostly e-commerce (purchase/ROAS) benchmarks; none was found with a UK finance lead-gen cut (gap).

### b3. Lead forms (instant forms) vs landing pages
| Source | Sample | Result | Strength |
|---|---|---|---|
| Meta Lead Generation Guide (Nov 2023), via secondary sites | 15 "three-cell" tests, Nov 2022–Feb 2023, advertiser-reported, 86% confidence | instant forms **20% lower cost per qualified lead** than website forms | **Not verified at source** (facebook.com not reachable). Quoted by https://www.variafy.com/guides/facebook-lead-form and https://webleveling.com/blog/facebook-lead-ads-vs-website-form/ (both retrieved 2026-10-27) |
| Meta healthcare lead guide (copy on scribd) | meta-analysis of 22 A/B tests, Jan 2023–Apr 2024 | running instant + website forms together vs website alone: **60% lower CPL, 125% more leads** | Secondary copy of a Meta PDF: https://www.scribd.com/document/913284387/4-5846116789607471811 (retrieved 2026-10-27). It compares *both* vs *website only*, not form vs page |
| Meta, via zuops.com | analysis of 2B+ submissions 2022–2023 (not a controlled test) | ≤3 questions: 26% lower CPL; email-only: 26% lower CPL than email+phone | **Not verified at source** — https://zuops.com/facebook-lead-quality |
| Jon Loomer (2024) | one advertiser, ~$1,700, 630 leads | instant form **$2.04/lead** vs website **$3.77/lead**; "quality" (clicked an email link) 29.1% vs 29.0%; deliverable emails 83.7% vs 92.4% | Single account — https://www.jonloomer.com/testing-quality-leads/ (retrieved 2026-10-27) |
| WordStream (Feb 2019, updated 2025) | 3,000+ campaigns, ~$9.5M, 60 days | lead ads click→lead 12.54% vs landing pages 10.47%; but in WordStream's own CRM, landing-page leads were more often qualified | **Old (2019)** — https://www.wordstream.com/blog/ws/2019/02/14/facebook-lead-ads-vs-landing-pages |

Takeaway: instant forms reliably give more, cheaper leads; quality evidence is mixed and mostly vendor-reported. For Vault·It, an instant-form email lands in Meta's system, not on vault-it.co, which also matters for consent records and double opt-in (see section c).

---

## (c) Double opt-in (DOI) confirmation rates and list quality

| Source | Sample / period | Confirmation rate (definition) | URL (retrieved 2026-10-27) |
|---|---|---|---|
| Dialog-Mail (Austrian ESP) study | **35,000+ DOI processes, 2024** | **73%** of submitted forms became confirmed (77% opened the DOI email; 94% of openers clicked). Range across customers: lost 5% to 69% | https://www.dialog-mail.com/email-blog/2025/20250428_studie-doi-verlustrate.php (28 Apr 2025, German) |
| LaunchList | **128 waitlists** with confirmation on, Jan 2023–Sep 2026, measured 2026-10-15 | median **46.4%** per waitlist (P25 15.2%, P75 60.7%, P90 75.3%); lists of 1,000+: median 29.6% | https://getlaunchlist.com/tools/waitlist-benchmark |
| Mailchimp (2011) | 30,000 users with ≥10 campaigns | DOI lists: +72.2% unique opens, +114% clicks, −48.3% hard bounces, −7% unsubscribes vs single opt-in (no confirmation rate given) | https://web.archive.org/web/20150502064827/https:/blog.mailchimp.com/double-opt-in-vs-single-opt-in-stats/ — **15 years old** |
| Jon Loomer (2024) | one test | Meta instant-form leads 83.7% deliverable vs 92.4% from the website form | https://www.jonloomer.com/testing-quality-leads/ |

- The two recent sources measure different things: Dialog-Mail pools all DOI processes (a big sender dominates), LaunchList gives the median *list*. They disagree a lot (73% vs 46.4%); report both, do not average.
- Commonly repeated figures I could **not** verify at source: "Mailchimp found confirmations dropped to 37% in 2017" (Indie Hackers post), "Litmus: DOI failure rate 27%" (Spotler blog), emailcalculator "60–75%" (no method). Not used.
- List-quality evidence for DOI is old (Mailchimp 2011) or single-account; the direction (fewer bounces, more engagement per subscriber, fewer total subscribers) is consistent but its size today is unverified.
- Legal note (not researched here; see the rules research file): whether DOI is required is a legal question for the other report; this section only covers the measured trade-off.

---

## (d) Waitlist → paying and early-access → paid

- **Lenny's Newsletter (1 Mar 2022)**, informal survey of founders (no sample size): waitlist → free sign-up 25–85%, ~50% if people are let in within a month, <20% after 3 months; waitlist → **paid account 5–25%, ~20% if within a month, <10% after 3 months**; physical products <5%. — https://www.lennysnewsletter.com/p/what-is-good-waitlist-conversion (retrieved 2026-10-27). **Weak (anecdotal, 2022) but the most-cited source; time-on-list is the main driver.**
- Anecdotes from the same thread (Linear 30–50% in first months, 10% after 12 months; Dropbox Paper <5% after 3–6 months) — https://topofthelyne.substack.com/p/waitlists-have-a-shelf-life-why-doesnt (retrieved 2026-10-27). Anecdotal.
- **RevenueCat State of Subscription Apps 2026** (115,000+ apps, $16B revenue, metrics target 2025; RevenueCat customers) — https://www.revenuecat.com/state-of-subscription-apps/ (retrieved 2026-10-27):
  - Day-35 download → paid: **hard paywall median 10.7% vs freemium 2.1%**.
  - D35 download → paid by developer HQ: North America 2.6%, **Western Europe 2.0%** (median).
  - Trial → paid by user geography: Western Europe median **29.7%**; North America 34.2%.
  - Trials of 17–32 days convert 42.5% vs 25.5% for ≤4 days (median).
  - Category note: RevenueCat buckets **Finance inside "Utilities"**, so there is no finance-only number.
  - Definition: these are *app install* funnels, not waitlist funnels; Vault·It is a PWA with a free tier (freemium), so 2.1% is the closer analogue for "free user → paid".
- No source found that measures *waitlist → paid* for a UK or finance consumer app (gap).

---

## (e) Kickstarter

- **Pre-launch followers:** "On average, **32%** of pre-launch followers pledge once the campaign goes live, compared with **17%** of post-launch followers." — Kickstarter, *The Anatomy of a Great Kickstarter Pre-Launch Page*, 29 Oct 2025, https://updates.kickstarter.com/the-anatomy-of-a-great-kickstarter-prelaunch-page/ (retrieved 2026-10-27). Method and sample not given; it is an all-category average (comics and games dominate Kickstarter by project count).
- **Email lists:** "a good yield is between **one and five percent** — for every 100 people on your email list, between one and five may actually pledge." — Kickstarter, *How to Launch a Product on Kickstarter: Building Your Community*, https://www.kickstarter.com/articles/how-to-launch-a-product-on-kickstarter-building-your-community (undated, retrieved 2026-10-27). This is guidance, not measured data.
- **Share of support from Kickstarter itself (the rest is the creator's own audience):** "Design and Technology projects on Kickstarter typically receive around **20 – 30 percent** of their support from backers who discover them on Kickstarter's homepage, algorithmic project collections, newsletters, and search"; "most campaigns drive the majority of their pledges through their own outreach." — same article. Kickstarter does **not** publish the share of final funding that comes from pre-launch followers specifically (gap). By implication, roughly 70–80% of support for Design/Tech comes from the creator's own outreach (which includes, but is not only, followers) — **inference, labelled**.
- **Momentum thresholds:**
  - Kickstarter stats page: "**79%** of projects that raised more than **20%** of their goal were successfully funded"; 9% never received a pledge. Page footer: "Last updated: Sat, July 6 2024" — the page appears frozen at that date. — https://www.kickstarter.com/help/stats/ (retrieved 2026-10-27)
  - Kickstarter (7 Oct 2022): "if their campaign reaches **20% of funding in the first 24 hours** it is live, they have a **80% chance** of success." — https://updates.kickstarter.com/building-a-more-diverse-creative/ (retrieved 2026-10-27)
  - Day-one share of total: a Kickstarter staff figure of 29% is quoted only second-hand (newsletter, see lifetime_crowdfunding.md); independent trackers report ~27% on day 1 (16,000 campaigns, https://grumpyspider.com/will-your-campaign-fund/, 2021) and ~30% for one publisher's campaigns (https://www.enworld.org/threads/lets-look-at-some-kickstarter-data.696190/, 2023). **Not Kickstarter-verified.**
- **Success rates (stats page, Jul 2024 snapshot):** all projects **41.57%**; **Technology 23.43%** (54,698 launched). Same URL. Third-party scraped quarterly reports showing ~100% tech "success" only count projects that finished and appear to exclude many failures — not comparable.
- Kickstarter's handbook does **not** state a required number of followers or emails; it tells creators to work out backers needed = goal ÷ pledge and plan to reach that "magic number". — https://www.kickstarter.com/articles/how-to-launch-a-product-on-kickstarter-building-your-community and https://www.kickstarter.com/help/handbook/promotion (retrieved 2026-10-27)
- Third-party claims, unverified/vendor: BackerKit "20–25% of followers pledge" (undated); Prelaunch.marketing agency "followers convert 10–50%, cost $1–$6 per follower" (2024, sells this service); PledgeBird "ad/giveaway followers 2–5%" (no source). **Not used for scenarios except as flagged sensitivity.**

---

## (f) Page speed and conversion on mobile (original sources checked)

| Claim as usually quoted | What the original actually says | Source |
|---|---|---|
| "0.1s faster = 8% more conversions" | Deloitte Digital for Google, **37 brands**, **30M sessions**, **4 weeks**, mobile sites, retail/travel/luxury/**lead generation**, mainly Europe & US. For a 0.1s improvement: **retail conversions +8.4%**, **travel +10.1%**; for **lead generation only bounce on information pages improved 8.3%** and page views +7% — **no lead-gen conversion lift is reported**. It is an observed correlation ("natural" speed changes), not an experiment. | https://www.deloitte.com/ie/en/services/consulting/research/milliseconds-make-millions.html (24 Mar 2020) and PDF https://www.thinkwithgoogle.com/_qs/documents/9382/Milliseconds_Make_Millions_report.pdf (retrieved 2026-10-27) |
| "53% of mobile visitors leave if a page takes >3s" | Google/DoubleClick *The Need for Mobile Speed*, Sept 2016; Google footnotes give the basis as "aggregated, anonymised Google Analytics data from a sample of mWeb sites opted into sharing benchmark data, **n=3.7K, Global, March 2016**" (other write-ups say 10,000+ domains). Abandonment, not conversion; 3G-era. | https://www.thinkwithgoogle.com/_qs/documents/3702/9e6a3_DoubleClick_Mobile_Web_Speed_Toolkit_10_17_2016.pdf ; https://www.thinkwithgoogle.com/_qs/documents/4288/How_to_make_every_mobile_moment_a_brand_builder-EN_5gNmezO.pdf ; https://blog.amp.dev/2016/09/08/new-study-speedmatters-for-mobile-user-engagement-and-revenue/ (retrieved 2026-10-27) |
| "1s→3s load raises bounce 32%" | "Google/SOASTA research 2017": probability of bounce **+32% (1→3s), +90% (1→5s), +106% (1→6s), +123% (1→10s)**. Bounce, not conversion; method not published in the chart. | Reproduced in the Milliseconds Make Millions PDF (above) |
| "100ms delay costs 7% of conversions" | Akamai/SOASTA *State of Online Retail Performance*, Spring 2017, ~10 billion visits to top **retailers**, one month: 100ms slower → conversion **−2.4% desktop, −7.1% mobile, −3.8% tablet**; peak mobile conversion at **2.7s** load. "Up to 7%" is the mobile figure only, retail only. | https://www.akamai.com/newsroom/press-release/akamai-releases-spring-2017-state-of-online-retail-performance-report (18 Apr 2017); report PDF copy https://www.igds.org/fileadmin/uploads/igds/Documents/Research_Reports/2017/akamai-state-of-online-retail-performance-spring-2017.pdf (retrieved 2026-10-27) |

Assessment: all the famous speed numbers are **2016–2020, retail/travel, correlational**, none is about paid-social traffic to a lead-gen page. Their direction (slower = more bounce, especially on mobile) is consistent across sources; their **size should not be applied to Vault·It's page**. A paid Meta click opens in the in-app browser on mobile, so the mobile figures are the relevant direction.

---

## (g) Form field count vs conversion

| Source | Sample | 1 field | 2 fields | 3 fields | Notes |
|---|---|---|---|---|---|
| NP Digital (Neil Patel), Dec 2024 | 404 landing pages with form conversions | **18.2%** | **13.0%** | **11.5%** | 4: 9.9%, 5: 8.1%, 9+: 4.2% — https://neilpatel.com/marketing-stats/conversion-rate-by-form-fields/ |
| Sleeknote, May 2025 | 329M+ popup impressions | **4.41%** | **2.90%** | **1.83%** | 4: 2.27%, 5: 3.26% (rebound) — https://sleeknote.com/blog/input-fields |
| Omnisend, 2025 | 1.24B popup displays | **2.1%** | **2.2%** | **2.1%** | 4: 1.5%, 5+: 1.4% — https://www.omnisend.com/blog/email-popup-statistics/ |
| HubSpot (Dan Zarrella) | 40,000+ customer landing pages, **old (c. 2010; page re-dated 2025)** | declining "slightly, but not as steeply as I expected" | | | textareas and dropdowns hurt most — https://blog.hubspot.com/blog/tabid/6307/bid/6746/which-types-of-form-fields-lower-landing-page-conversions.aspx |
| Meta (secondary, not verified) | 2B+ instant-form submissions 2022–23 | email-only: 26% lower CPL than email+phone | | ≤3 questions: 26% lower CPL | https://zuops.com/facebook-lead-quality |

All retrieved 2026-10-27. The sources **disagree** on the 1→2 field step: NP Digital and Sleeknote show a large drop (−29% and −34% relative), Omnisend shows none. They agree that 4+ fields lose conversions, and that phone numbers and free-text boxes cost the most. Different bases (landing pages vs popups) — do not combine.

---

## 8. Scenarios for a first pre-sale / Kickstarter (arithmetic on sourced rates — **not predictions**)

### 8.1 Cost to acquire one confirmed email from UK Meta ads (scenario)
Formula: cost per confirmed email = CPC ÷ landing-page conversion ÷ DOI confirmation rate.
Inputs (all sourced above): UK CPC £1.02 / £1.18 / £1.49 (Superads monthly low / average / December peak); page conversion 10.1% (Unbounce finance, Facebook traffic), 8.3% (Unbounce finance median), 5.2% (Waitlister fintech median), 3.9% (Unbounce investing); confirmation 100% (single opt-in), 73% (Dialog-Mail), 46.4% (LaunchList median).
Assumption flagged: Superads CPC may count all clicks, not link clicks (would make costs higher); Unbounce excludes zero-conversion pages (would make conversion lower for a new page).

| CPC | Page conversion | Single opt-in | DOI 73% | DOI 46.4% |
|---|---|---|---|---|
| £1.02 | 10.1% | £10.10 | £13.83 | £21.77 |
| £1.18 | 10.1% | £11.68 | **£16.00** | £25.18 |
| £1.18 | 8.3% | £14.22 | £19.48 | £30.64 |
| £1.18 | 5.2% | £22.69 | **£31.09** | £48.91 |
| £1.18 | 3.9% | £30.26 | £41.45 | £65.21 |
| £1.49 | 3.9% | £38.21 | £52.34 | £82.34 |

Cross-check (different definition, US): WordStream 2026 all-industry Meta **leads-objective** median CPL **$27.39** — the same order of magnitude as the middle of this table.

### 8.2 List size needed (scenario)
Backers needed = goal ÷ average pledge. Pledge levels are **scenario inputs taken from Vault·It's own plan prices** (Pioneer annual £49.99–£59.99 ≈ £50; Founding Member £149–£199 ≈ £150) — not a forecast of the average pledge. Goals are illustrative.

| Goal | Avg pledge | Backers | Emails @ 5% (KS "good" top) | Emails @ 1% | KS pre-launch followers @ 32% | Followers @ 17% (post-launch rate, cautious) |
|---|---|---|---|---|---|---|
| £5,000 | £50 | 100 | 2,000 | 10,000 | 313 | 588 |
| £5,000 | £150 | 33 | 667 | 3,333 | 104 | 196 |
| £10,000 | £50 | 200 | 4,000 | 20,000 | 625 | 1,176 |
| £10,000 | £150 | 67 | 1,333 | 6,667 | 208 | 392 |
| £25,000 | £50 | 500 | 10,000 | 50,000 | 1,563 | 2,941 |
| £25,000 | £150 | 167 | 3,333 | 16,667 | 521 | 980 |

(Rounded up to whole people.)

Momentum check (Kickstarter data): to reach 20% of the goal in the first 24 hours (80% success association), a £10,000/£50 campaign needs ~40 backers on day one.

### 8.3 Ad budget implied (scenario)
- Ad spend per *backer* if paid emails yield at Kickstarter's 1–5% email rate: £16.00 ÷ 5% = **£320**; £16.00 ÷ 1% = **£1,600**; £31.09 ÷ 1% = **£3,109**. Every case is above the £49.99–£199 pledge levels, so on this evidence **paid-acquired email subscribers do not pay for themselves through pledges**.
- Buying the whole "5% yield" list for £10,000 at a £150 pledge: 1,333 confirmed emails × £16.00 = **£21,333** of ads (base case), i.e. about twice the goal. At a £50 pledge: 4,000 × £16.00 = **£64,000**.
- Only if ad-sourced subscribers converted like Kickstarter pre-launch followers (32%) would the base case approach break-even: £16.00 ÷ 32% = **£50 per backer**. There is **no evidence** that ad-acquired followers convert at 32% (Kickstarter's figure is an all-project average dominated by warm audiences; a vendor claims ad/giveaway followers convert at 2–5% — unverified).

### 8.4 What the evidence supports (conclusions, not forecasts)
1. **Minimum list for a small first pre-sale:** for a £5,000–£10,000 goal at founding-member pricing (£150 pledge), the sourced rates point to roughly **700–1,400 confirmed, engaged emails at the 5% yield** (or 3,300–6,700 at 1%), **or ~100–210 Kickstarter pre-launch followers at 32%**. At £50 pledges multiply by three. A list below ~700 confirmed emails cannot reach even £5,000 at £150 pledges on Kickstarter's own top-of-range yield.
2. **Ad budget role:** a test budget sized to *learn* is supported (e.g. **£300–£500 buys ~250–420 clicks at £1.18 and, at 8.3%, ~21–35 sign-ups** — enough to read a click-through rate and a rough page conversion, not enough for a significant A/B test). A budget sized to *fund* the campaign through ads is not supported by the evidence.
3. **Page design implications:** keep the form to **email only** (strongest agreement across sources at 1 field; 4+ fields consistently worse); write at a plain reading level (Unbounce finance: 5th–7th grade pages 18.1% vs college-level 7.1%, correlational); optimise for **mobile in-app browsers** (83% of Unbounce visits were mobile; finance converts better on mobile); keep the page fast (direction supported, size of effect not transferable).
4. **Double opt-in costs 27–54% of sign-ups** on the two recent datasets; budget for that loss when counting the list, and count only confirmed addresses against the targets above.
5. **Time on list matters:** Lenny's (weak) data suggests paid conversion halves after ~3 months on a waitlist; plan the pre-sale within weeks of the sign-up push, not months.

---

## Gaps (could not verify)
- No UK or European **finance-specific** Meta CPC, CPM or cost-per-lead benchmark with a published method.
- Meta's own figures (20% lower cost per qualified lead; 60% lower CPL; 26% field-count effect) could not be opened at facebook.com; only secondary copies were read.
- Superads does not say whether CPC is per link click or all clicks, and its CPM page gives no currency; its date window is stated inconsistently.
- No large dataset for **waitlist page visit → sign-up** with a published method (Waitlister gives no sample; LaunchList does not measure it).
- No source for **waitlist → paid** in UK/finance consumer apps; Lenny's 2022 numbers are informal.
- Kickstarter does not publish the share of final funding from pre-launch followers, nor a recommended follower/email count; its stats page has not updated since 6 Jul 2024; the 29% day-one figure is second-hand only.
- Kickstarter's 32% and 1–5% figures have no published method or category breakdown (Technology / apps not separated).
- Varos and Triple Whale benchmarks are e-commerce (ROAS/purchase) and were not found with a lead-gen or UK finance cut; Instapage and Leadpages publish no current dataset found.
- Speed studies are 2016–2020 and retail/travel; no study of paid-social → lead-gen page speed was found.
- WordStream 2026 PDF says 1,892 campaigns, the blog says 1,377 + 452 = 1,829.
