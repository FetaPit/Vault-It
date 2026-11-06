# Pitch Deck v2: owner's meeting notes and the v1.1 research brief

Companion to `docs/briefs/PITCH_DECK_V2.md`. That brief said: "Still to come from the owner: transcriptions of handwritten meeting notes" and "the 4 Nov research brief ... was written in a cloud session scratchpad (`v11/research-brief.md`) and is not in git. Recover it from that session if possible." Both are recovered below, from the cloud session that did the 4 Nov work (session_01KoffvxLm1GgeEZRb7F22M7).

## 1. Owner's handwritten meeting notes

**Meeting:** Zoom call with Dr Slava Baranovskiy (Eligent), 4 Nov 2026.
**Source:** the owner photographed 4 pages of his own handwritten notes and uploaded them in this session the same evening (4 Nov 2026, about 20:07 UK time), captioned "Notes to incorporate into v1.1 of pitch deck".
**How this was read:** Claude read the 4 photos directly and transcribed them below in the same session. This is a reading of handwriting, not OCR text extraction — items marked `?` were uncertain readings at the time and were never confirmed by the owner. Treat `?` the way the request's "mark anything you can't read as [illegible]" asks: as not a fact, not a Vault-It number.

Word for word, as transcribed:

- £250k seed. 35% R&D?, then maintenance, marketing. "10K cofounder"?
- Breakeven point under 18 months. ROI. Investment level. Forecast 2027. Staff spreadsheet. Focus on financials.
- What for: roadmap tied to finance.
- Route to market: LinkedIn audience 80% B2B / 20% B2C?; brand deals; affiliates; pipeline to subscribers; founder-trust outreach; "how would I reach out to brands".
- White label product: "Help to Buy?/Hold Bank?" (unclear) pipeline.
- Audience: neurodivergent people who struggle to save; target audience; relationship.
- Study: University of Lincoln pilot, "250 to 750 academic" (participants?).
- Scale: how scalable, distribution, team change, cofounder.
- To do: send Plaza Futura to Steve; plan to reach investors for Dr Slava.

No other handwritten-note photos were uploaded in this session. The "Eligent live pitch prep" queue item that mentioned "stand by for me to upload written notes" (4 Nov) refers to this same batch of 4 photos, not a separate upload.

## 2. The 4 Nov research brief, as it stands

Written 4 Nov 2026 by a research subagent in this session, from the transcription above, Business Plan v2, the repo's `docs/research/*` and `docs/OFFER_AND_PRICING.md`, and cited external benchmarks. Nothing in the app repo was changed to produce it. Reproduced in full, unedited, below.

---

# Vault-It deck v1.1: research brief for the four gaps

Prepared 4 Nov 2026 for the Eligent event on Sat 7 Nov. Read-only research: nothing in the repo was changed.

**How figures are tagged**
- **[PETE]**: from Pete's own documents, with file and exact number.
- **[DERIVED]**: plain arithmetic on Pete's own numbers. Shown so he can check it; not a new forecast.
- **[BENCHMARK]**: external figure, with publisher, date and URL. A guide rail only, never a Vault-It number.
- **[NEEDS PETE]**: a decision or number only Pete can supply.

**Pete's documents used**
- **BP v2**: *Vault·It Business Plan v2*, 1 Nov 2026 (https://claude.ai/artifact/3FL65npH4T8Mgs8qa4FKkC), sections 4, 6, 9 and 10, plus the Critique tab. This is the current plan.
- **BP v1**: *Vault-It-Business-Plan v.1* (Google Drive, Aug 2026).
- **Model v1**: *Vault-iT Financial Model* (Google Sheet, 13 Aug 2026).
- **Repo docs**: `docs/OFFER_AND_PRICING.md`, `docs/research/cost_to_serve.md`, `docs/research/benchmarks.md`, `docs/research/freemium_vs_paid.md`, `docs/research/trial_length.md`.
- **Deck and script**: the deck slides (`deck2/project/slides/*.html`) and `script.md`.

> **Do not reuse Model v1 or BP v1 numbers on a slide.** They predate the live pricing: £8 a month, costs held flat at £12,178, a 3-month break-even on 21 payers and 20% annual churn. BP v2 replaced them and says so ("v1's figure of 21 paying users covered only hosting and tools").

---

## A. What Slava found missing (ranked)

Slava named four gaps, route to market first. Ranked here by how far the current deck is from answering each one.

1. **Financial forecast: the deck has none.**
   - No slide shows revenue, costs, burn, runway or break-even.
   - BP v2 has a 3-year table, but it is built on a lean plan with no raise: £20k now, angels in late 2027.
   - That table conflicts with what Pete's notes now say: £250k seed, break-even inside 18 months, a 2027 forecast and a staff spreadsheet.
   - The Drive model (v1) is stale and contradicts BP v2.
2. **The ask: no amount, no split, and the timing contradicts itself.**
   - Slide 14 says "a SEIS pre-seed round, sized after the Founding pre-sale".
   - The script says "angels for a pre-seed round once the pre-sale closes".
   - BP v2 says Stage B is £150k to £250k in late 2027, only after the gates are met.
   - Pete's notes say £250k seed, with "35% R&D?" and then maintenance and marketing.
   - Nothing ties the money to milestones. Slava's words: "roadmap tied to finance".
3. **B2B licensing and white-label costs: the slide has no prices, no costs and no route.**
   - Slide 10 explains the value well but never shows the price guide. BP v2 §4 has one: pilot £2,500 to £5,000; Partner Edition £10k to £25k set-up plus £1 to £3 per active user a month.
   - Missing: what it costs Vault-It to deliver white label (multi-tenant theming, partner dashboard, SSO, security certification, pen test, DPIA), the sales cycle and who buys first.
   - The deck's proof point is overstated. Slide 9 notes say "Moneyhub's white-label deal with Paragon". In fact Paragon's Spring app uses Moneyhub for open banking connections and payments (AIS/PIS, June 2025). It is not a white-labelled consumer money app (Moneyhub press release, 10 Jun 2025).
4. **Route to market: tactics are listed, the economics are not.**
   - The slide 11 notes hold the targets: 3,000 waitlist, 4% trial to paid, 30% week-4 retention.
   - Missing: the funnel maths (cost per sign-up and per payer), how B2C feeds B2B, and the channels Pete raised with Slava (LinkedIn audience, brand deals, affiliates, founder-trust outreach).

**Secondary gaps** from Pete's notes, to touch on without new slides:
- **Team and scalability:** solo founder; "cofounder" and "team change".
- **Neurodivergent audience:** the relationship with them and how the product serves them.
- **University of Lincoln study:** size and funding route.

**Inconsistencies to fix before Saturday**
- **Founding price:** £199 on slides 9 and 11 ("100 × £199 is £19,900"). The live Stripe link and BP v2 say **£149**, capped at 100, so £14,900 at the cap (OFFER_AND_PRICING.md, "Stripe as set up on 31 Oct").
- **Traction:** slide 12 says 26 vaults saved and 442 tester events. BP v2 says four friendly testers and no paying users. Both may be true, but say which is which.
- **First hire:** slide 13 says a technical lead. BP v2 Year 1 has only a 12-hours-a-week contractor (£5,000). A £250k raise changes this, so the team slide must match the use-of-funds slide.

---

## B. Proposed slides

Five new or rebuilt slides fit the 5-minute slot if slides 7 (evidence) and 12 (traction) are merged into one. Order: Model, **B2B route**, **White-label costs**, **Route to market**, Traction, Team, **Forecast**, **Ask**.

### B1. Route to market (rebuild slide 11)

**Title:** One hook, two funnels: people find their date, institutions pay to reach them.

**Points**
1. **Consumer funnel.** Free keys-date calculator and ISA switch planner, then email, then a 30-day no-card trial, then Pioneer. The date always shows before sign-up. [PETE: BP v2 §4, §6]
2. **Organic first, paid later.** Paid ads wait until the calculator converts.
   - Benchmark arithmetic: one confirmed email from UK Meta ads costs about £16 to £31 [BENCHMARK, `benchmarks.md` §8.1].
   - Ads therefore buy learning, not growth. [PETE: OFFER_AND_PRICING.md §4]
3. **Channels with a cost each:**
   - Short video: 3 clips a week, about 3 hours.
   - Micro-creators from January 2027, flat fee, #ad.
   - Town SEO pages.
   - Referral waitlist.
   - Press.
   - LinkedIn build-in-public, 2 posts a week. [PETE: BP v2 §6 table]
4. **Founder-trust B2B outreach.** LinkedIn plus a dated LOI plan, 9 to 20 Nov:
   - Lincoln Money Man, Nottingham BS, CreditLadder, Leeds BS, Skipton BS, Newbury BS and Mojo.
   - Money and Mental Health Policy Institute, StepChange and the University of Lincoln.
   - Source: [PETE: QUEUE.md "Letters of intent" item]
5. **Affiliates and brand deals:** in or out?
   - BP v2 §4 says partner-brand rewards are "a retention perk… not a revenue line".
   - Pete's notes list brand deals and affiliates as routes.
   - [NEEDS PETE: revenue line, perk only, or a channel where Vault-It pays affiliates]

**Figures and sources**

| Figure | Value | Source |
|---|---|---|
| 8-week targets | 3,000 waitlist; 100 Founding Members; 3 partner conversations | [PETE: BP v2 §6] |
| Conversion targets | 4% trial to paid; 30% week-4 retention; 0.2 shares per user | [PETE: BP v2 §6] |
| Year-end sign-ups | 5,000 / 25,000 / 70,000 | [PETE: BP v2 §9] |
| Marketing spend | £4,500 / £12,000 / £40,000 | [PETE: BP v2 §9] |
| Cost per confirmed email, UK Meta ads | £16 to £31 base case (range £10 to £82) | [BENCHMARK: `benchmarks.md` §8.1, built from Superads CPC, Unbounce, double opt-in data, retrieved 27 Oct 2026] |
| Freemium download to paid, day 35 | median 2.1% (hard paywall 10.7%) | [BENCHMARK: RevenueCat, State of Subscription Apps 2026, https://www.revenuecat.com/blog/growth/hard-paywall-vs-freemium, 29 Apr 2026] |
| Trial to paid, Western Europe | median 29.7%; trials of 17 to 32 days convert 42.5% | [BENCHMARK: RevenueCat 2026, in `benchmarks.md` (d)] |
| Finance app cost per install, Europe | $4.75 in 2025 (global $1.13) | [BENCHMARK: Adjust data via Promodo, *Fintech Marketing Benchmarks 2026*, https://www.promodo.com/blog/fintech-marketing-benchmarks, 21 Oct 2026] |
| Fintech installs that register within a week | about 1 in 5 | [BENCHMARK: CleverTap via Promodo, as above] |
| Apple Search Ads, Finance cost per acquisition | $13.28 (2025) | [BENCHMARK: SplitMetrics via Spreadcast, https://spreadcast.app/resources/cost-per-install-benchmarks, May 2026] |
| Web-to-app share of owned-media conversions, W. Europe finance | 41.8% (supports the web-first PWA route) | [BENCHMARK: AppsFlyer *State of Finance for Marketers: Europe 2026*, via Finextra, https://www.finextra.com/pressarticle/110014/, 3 Jun 2026] |
| Net revenue kept on web billing | 94.5% of £5.99 through Stripe, not VAT-registered; app stores take 15% (Small Business Program) or 30% | [PETE: `cost_to_serve.md` §4c]; [BENCHMARK: Apple, https://developer.apple.com/app-store/small-business-program/] |
| Affiliate CPA, UK money apps | Snoop $7 per bank account connected; GoHenry £5 per activated account; Wombat £30 per first deposit; Tide £50; MoneySuperMarket Money £1 standard | [BENCHMARK: 3dot14 network listing, https://3dot14.co/offers/snoop-affiliate-program; financeAds, https://www.financeads.com/programs/gohenry_uk/ and /wombat_uk/; myroomismyoffice.com, 18 Jan 2026; Awin, https://ui.awin.com/merchant-profile-terms/61791] |
| UK micro-creator fees (10k to 50k followers) | TikTok about £100 to £300 a video (London rates); wider guides say £150 to £1,300; usage rights add 20% to 50% | [BENCHMARK: londonlife.org, 2 Jun 2026; SocialBrandMatch micro-influencer guide 2026. Vendor guides, low quality] |
| Waitlist to paid (software) | 5% to 25%; under 10% after 3 months on the list | [BENCHMARK, weak: Lenny's Newsletter 2022, in `benchmarks.md` (d)] |
| LinkedIn audience size and the 80/20 B2B/B2C split | | [NEEDS PETE: follower count, and whether 80% B2B describes the audience or the revenue mix] |

**Honest read**
- BP v2's 4% of sign-ups becoming payers sits inside the benchmark band: freemium 2.1%, trial median 29.7% of trial starters.
- David's critique still stands: "present the 2% case as the base for lenders" (BP v2 Critique tab).

### B2. B2B licensing: price list and route to the first licence (rebuild slide 10)

**Title:** Institutions pay to reach tomorrow's mortgage customers early.

**Points**
1. **Four offers, each with a price** [PETE: BP v2 §4]:
   - Paid pilot: £2,500 to £5,000 for 90 days.
   - Partner Edition (white label): £10k to £25k set-up, then £1 to £3 per active user a month.
   - Impact licence for debt charities: free or at cost.
   - Sponsored Free tier: brands or lenders pay to unlock Pioneer for their customers.
2. **The prices sit inside the market.**
   - A UK white-label money engine lists set-up from £15k and from £2.50 per active user a month, with an annual minimum.
   - Branded budgeting tools for housing associations and debt agencies sell at £2,100 to £20,100 a licence a year.
   - Employer financial-wellbeing apps charge £0.50 to £6 per employee a month.
   - Sources are in the table below.
3. **Route: pilot first, licence second.** Lead with a 90-day paid pilot with one success measure, for example 500 customers with a saved date [PETE: BP v2 §6]. Banks run innovation pilots of 8 to 12 weeks with lighter due diligence. Full supplier onboarding can take 12 to 18 months [BENCHMARK below].
4. **Design to stay "low-risk".**
   - Vault-It needs no bank data and no integration: users type their own numbers.
   - That makes a pilot a non-material third-party arrangement under PRA SS2/21, which qualifies for the fast proof-of-concept routes. Barclays aims for 5 days; HSBC onboards to proof of concept in 10 working days.
   - Any data sharing with a partner is consent-based and revocable [PETE: slide 10 notes].
5. **Who first.**
   - Smaller building societies and brokers on the LOI list.
   - Debt charities as an impact licence, for credibility.
   - Later: innovation programmes. Lloyds Launch 2026 ran a "Homes" challenge on the journey to home ownership; it closed 30 Sep 2026, so watch for 2027. Also the FinTech North Innovation Challenge, NBS Ventures (Nationwide, invests seed to Series B) and Barclays Eagle Labs Lincoln.

**Figures and sources**

| Figure | Value | Source |
|---|---|---|
| Vault-It B2B price guide | pilot £2,500 to £5,000 per 90 days; Partner Edition £10k to £25k set-up plus £1 to £3 per active user a month | [PETE: BP v2 §4 table] |
| B2B revenue in plan | Y1 £2,500 (1 pilot); Y2 £26,000 (2 pilots plus 1 Partner Edition at £15,000 set-up plus usage); Y3 £100,000 (3 Partner Editions) | [PETE: BP v2 §9] |
| White-label money engine (UK, published) | set-up from £15k; from £2.50 per active user a month; annual platform minimum; revenue share possible | [BENCHMARK: Pluto, https://pluto.coach/white-label, read 4 Nov 2026] |
| White-label PFM (US vendors such as MX and Bud) | $2 to $8 per user a month; credit unions pay $2 to $5 per active member; sales cycle 3 to 9 months | [BENCHMARK, weak: RaftLabs blog, https://www.raftlabs.com/blog/cost-to-build-app-like-mint, 20 Jul 2026] |
| Branded budgeting tool for housing associations, councils and debt agencies | £2,100 to £20,100 a licence a year | [BENCHMARK: entitledto Budgeting Tool, G-Cloud 14, https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/947696212902128] |
| Neurodivergent support app, public-sector licence | £1,550 per user licence a year | [BENCHMARK: Brain in Hand, G-Cloud 14, https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/639892420724906] |
| Employer financial-wellbeing apps | £0.50 to £2.50 (Munny); £0.50 to £1 (FinWELL); £2 to £3 (Scenarios); £6 (Moneyed), all per employee a month | [BENCHMARK: munnygroup.com/subscriptions; finwell.uk/packagedetails.html; scenarios.uk/employers; moneyed.co.uk/pricing, read 4 Nov 2026] |
| Mortgage broker tools, per adviser | £25 to £65 + VAT a month (Mortgage Brain); £95 a seat (Advizo); Score (formerly Acre, bought by ClearScore in 2026) charges per completed case | [BENCHMARK: trustpms.com Mortgage Brain page; advizo.co.uk; mozzle.co/mortgage-broker-tools (secondary)] |
| Bank onboarding of fintechs | 12 to 18 months at one leading UK bank before a platform fix | [BENCHMARK: NayaOne case study, https://nayaone.com/case-study/leading-uk-bank-slashed-fintech-onboarding-time/, Feb 2024] |
| Innovation-lab pilots and onboarding | pilots 8 to 12 weeks with lighter security checks; full vendor onboarding 8 to 12 weeks, after a sales cycle of 6 to 12 months | [BENCHMARK: GreySpark Partners, *Injecting Innovation*, Apr 2025, https://www.greyspark.com/wp-content/uploads/2025/04/GSP-Article-Injecting-Innovation-final.pdf] |
| Fast proof-of-concept routes | Barclays: about 5 days for low-value, low-risk PoCs. HSBC: PoC onboarding in 10 working days. TSB: staff pilot, then small customer pilot, then rollout (Fintech Pledge signatories) | [BENCHMARK: home.barclays fintech-friendly onboarding; about.hsbc.co.uk/hsbc-uk/working-with-fintechs; tsb.co.uk fintech-pledge] |
| Sales cycle, finance buyers | average 161 days; deals of $10k to $50k average 128 days | [BENCHMARK: Outreach data via Maestro Group, https://maestrogroup.co/sales-cycle/, Jan 2025] |
| Rules a bank or building society must apply to Vault-It | PRA SS2/21: firms must assess materiality and risk of **all** third-party arrangements, not only outsourcing. Expects access and audit rights, sharing of pen-test results, exit plans. Applies to banks and building societies (current version effective 31 Dec 2024). FCA SYSC 8 covers outsourcing of critical or important functions | [BENCHMARK: Bank of England, https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/outsourcing-and-third-party-risk-management-ss; Slaughter and May summary, May 2021; FCA Handbook SYSC 8, https://www.handbook.fca.org.uk/handbook/SYSC/8/] |
| Consumer Duty angle for the pitch | firms must evidence good outcomes on consumer understanding and consumer support. A tool that shows the customer's whole position helps them evidence this. The FCA "targeted support" regime (live 6 Apr 2026) covers pensions and investments only, so do not claim it for housing or debt | [BENCHMARK: FCA PS22/9, https://www.fca.org.uk/publications/policy-statements/ps22-9-new-consumer-duty; FCA PS25/22, https://www.fca.org.uk/publications/policy-statements/ps25-22-consumer-pensions-investment-decisions-rules-targeted-support] |
| Programmes to approach | Barclays Eagle Labs has a Lincoln lab; its Sales Growth Programme closes 20 Nov 2026. Lloyds Launch (Homes challenge; 2026 closed 30 Sep). NatWest Fintech Programme (needs product-market fit and revenue, so later). FinTech North Innovation Challenge. NBS Ventures (hello@nbsventures.co.uk). Leeds LFIX (£6.5m, launched Oct 2026) | [BENCHMARK: labs.uk.barclays programmes and locations pages; lloydsbankinggroup.com Launch 2026; natwest.com fintech-innovation; fintechnorth.uk, 26 Feb 2026; nationwide.co.uk/ventures; news.leeds.gov.uk, 20 Oct 2026] |
| Number of partner active users per licence | | [NEEDS PETE: no basis yet. Ask each LOI target how many customers a pilot could reach] |
| Sponsored Free tier price | | [NEEDS PETE] |

**Wording fix for slide 9 notes**
- Instead of "Moneyhub's white-label deal with Paragon proves…", say: "Paragon built its Spring savings app on Moneyhub's platform (2025); Moneyhub's own consumer app closed in July 2026 as it focused on B2B."
- The closure is from `OFFER_AND_PRICING.md` §2.
- Note also that ClearScore bought the broker platform Acre in 2026. ClearScore is moving into the mortgage journey, as a possible partner, rival or acquirer.

### B3. What white label costs to deliver (new slide, or the lower half of B2)

**Title:** What a Partner Edition costs us to deliver, and when we spend it.

**Points**
1. **Running cost is near zero.**
   - About £0.005 per user a month in infrastructure; about £0.021 with typical AI use.
   - Fixed costs about £37.50 a month (£45 with non-reclaimable VAT).
   - Source: [PETE: `cost_to_serve.md` §0, §4]
2. **The real cost is trust.** Banks expect certification, a pen test and audit rights before go-live. BP v2 §7 already gates it: Cyber Essentials first, then SOC 2 Type 1 or ISO 27001 when an institution asks, and a pen test before any bank sync.
3. **Build items:**
   - Partner theming (logo, colours, domain).
   - A partner admin and reporting dashboard (aggregate only).
   - SSO.
   - Consent-based shared view for charities.
   - Tenant data isolation.
   - Partner contract pack: DPA, DPIA and exit plan.
4. **Paid for by the set-up fee.** One Partner Edition set-up at £15k [PETE: BP v2 §9] roughly covers a multi-tenant pen test plus Cyber Essentials Plus (benchmarks below). It does not also cover ISO 27001.

**Figures and sources**

| Item | Market cost | Source |
|---|---|---|
| Cyber Essentials (micro, 0 to 9 staff) | £320 + VAT a year | [BENCHMARK: IASME FAQ, https://iasme.co.uk/cyber-essentials/frequently-asked-questions/] |
| Cyber Essentials Plus (micro) | from about £1,400 + VAT; one certification body publishes £1,475 | [BENCHMARK: Government Commercial Agency guidance, 30 May 2025, gca.gov.uk; Solusec pricing 2026] |
| Pen test, small single-product SaaS | £3,750 to £6,250 (3 to 5 days, about £1,200 a CREST day) | [BENCHMARK: Precursor Security, precursorsecurity.com SaaS pen testing page, 2026] |
| Pen test, multi-tenant app and API | £15,400 to £29,400 (14 to 21 days at £1,100 to £1,400 a day) | [BENCHMARK: EJN Labs, https://ejnlabs.com/penetration-testing-cost-saas-companies/, 2026] |
| ISO 27001, year one, up to 10 staff | £11,300 to £31,500 ex VAT (audit £3,500 to £6,000, plus software or consultant, plus pen test), plus 150 to 300 hours of team time | [BENCHMARK: Kantis, https://www.getkantis.com/blog/iso-27001-cost, 2026] |
| ISO 27001, accredited, small business | roughly £5,000 to £10,000 year one; surveillance audits £1,500 to £3,000 a year | [BENCHMARK: Expertsure, 10 Aug 2026; Precursor ISO cost page] |
| Developer to build partner features | median UK contract full-stack engineer £525 a day (£500 outside London) | [BENCHMARK: IT Jobs Watch, https://www.itjobswatch.co.uk/contracts/uk/full%20stack%20engineer.do, 6 months to 2 Nov 2026] |
| Security and compliance budget in plan | £3,500 / £4,000 / £10,000 a year | [PETE: BP v2 §9] |
| DPIA, data processing agreement, legal review of partner contract | | [NEEDS PETE: get one fixed quote; BP v2 §7 already lists a lawyer review of privacy and terms] |
| Days to build theming, dashboard, SSO and consent sharing | | [NEEDS PETE: his own estimate, or a contractor's at about £500 a day] |
| Cyber or professional indemnity insurance that banks require | | [NEEDS PETE: get a quote; not researched] |

**Flag:** BP v2's £10,000 for security in Year 3 is below the benchmark cost of ISO 27001 plus a multi-tenant pen test (about £27k to £61k combined in year one). Either raise the line, or have Partner Edition set-up fees fund it.

### B4. Financial forecast (new slide; Slava's "Forecast 2027")

**Title:** 2027 to 2029: two engines, one break-even month.

**What investors expect on one slide**
- 3-year revenue by stream.
- Users (sign-ups, payers, partner users).
- Costs by line, net burn and cash balance.
- Runway in months, and the break-even month.
- Clearly marked assumptions.

Pre-seed guidance asks for bottom-up projections over the next 18 to 24 months, with burn, runway and spending by category [BENCHMARK: DocSend pre-seed deck guide, https://www.docsend.com/blog/what-to-include-when-building-your-pre-seed-pitch-deck/, 24 Feb 2026].

**What Pete already has** (BP v2 §9; Year 1 starts December 2026, so Y1 is roughly 2027) [PETE]

| | Y1 | Y2 | Y3 |
|---|---|---|---|
| Sign-ups (year end) | 5,000 | 25,000 | 70,000 |
| Paying users (year end) | 200 | 1,000 | 2,500 |
| Founding Members | 60 (£8,940) | 0 | 0 |
| Consumer revenue | £14,400 | £33,000 | £96,000 |
| B2B revenue | £2,500 | £26,000 | £100,000 |
| **Total revenue** | **£16,900** | **£59,000** | **£196,000** |
| Costs | £17,500 | £59,000 | £190,000 |
| Net | -£600 | £0 | £6,000 |

**The problem to solve before Saturday**
- That table is the lean plan, with no £250k in it. It breaks even in Year 2 because costs stay small.
- If £250k is raised and spent on hires, costs rise and break-even moves.
- **[DERIVED]** At BP v2's Year 3 cost base (£190k a year, about £15.8k a month), £250k is about **16 months** of costs before revenue. Spent evenly over 18 months it is about **£13.9k a month**.
- **[DERIVED]** Covering £13.9k a month from consumers alone needs about **3,030 payers** at BP v2's £55 a year. That is more than Year 3's 2,500.
- So "break-even under 18 months" holds only if (a) the hires are phased, or (b) B2B licences land on BP v2's timeline or sooner.
- Show both lines and let investors see the choice:
  - Lean break-even month (no raise).
  - "Default alive" month (with raise).

**Forecast template** (every driver is Pete's number or NEEDS PETE)

| Driver | Value to use | Source / guide rail |
|---|---|---|
| Start month | Dec 2026 | [PETE: BP v2 §9] |
| New sign-ups per month, 2027 | [NEEDS PETE] (BP v2 implies 5,000 by Y1 end) | guide: 8-week target 3,000 waitlist [PETE: BP v2 §6] |
| Sign-up to payer | 4% base; 2% downside case | [PETE: BP v2 §9 and Critique]; [BENCHMARK: RevenueCat freemium 2.1%] |
| Average revenue per payer | about £55 a year (mix of £5.99/mo, £49.99/yr and Household) | [PETE: BP v2 §9] |
| Payer churn | [NEEDS PETE] | guide: one-year retention of annual subscribers about 27% to 28% (RevenueCat 2026, secondary, `freemium_vs_paid.md`). Model v1's 20% annual churn looks far too optimistic against this |
| Founding Members | 60 × £149 base; cap 100 (£14,900) | [PETE: BP v2 §10; Stripe link] |
| Payment costs | about 5% of revenue | [PETE: BP v2 §9]; Stripe nets 94.5% on £5.99 [PETE: `cost_to_serve.md`] |
| Pilots | Y1 1 × £2,500; Y2 2 × £2,500 to £5,000 | [PETE: BP v2 §9] |
| Partner Editions | Y2 1, Y3 3; set-up £15,000; usage £1 to £3 per active user a month | [PETE: BP v2 §4, §9] |
| Active users per partner | [NEEDS PETE] | no basis yet; ask LOI targets |
| Sponsored tier, affiliate, brand-deal income | [NEEDS PETE: include or exclude] | BP v2 excludes them; mortgage referral needs an Introducer Appointed Representative arrangement first [PETE: BP v2 §4] |
| Infrastructure | £37.50 to £45 a month fixed, plus about £0.005 to £0.021 per user a month | [PETE: `cost_to_serve.md` §4] |
| Staff (the "staff spreadsheet") | [NEEDS PETE: roles, start months, salary or day rate] | BP v2 lines: contractor £5k (Y1), part-time developer £20k (Y2), engineer £55k (Y3), partnerships lead £45k (Y3 from mid-year), founder drawings £0 / £12k / £30k [PETE]; guide: contract full-stack engineer £525 a day [BENCHMARK: IT Jobs Watch] |
| Marketing | £4,500 / £12,000 / £40,000, or [NEEDS PETE] if the raise changes it | [PETE: BP v2 §9] |
| Security and compliance | £3,500 / £4,000 / £10,000, then add ISO 27001 and pen test if B2B needs them | [PETE: BP v2 §9]; see B3 benchmarks |
| Opening cash | £250k raise plus pre-sale, less money spent before close | [NEEDS PETE: raise close month] |
| **Outputs** | revenue by stream; total cost; net burn; cash balance; runway months; break-even month (lean and with raise) | |

**Optional market line** for a pounds figure: **[DERIVED]** 1.1m Lifetime ISA savers × £55 a year ≈ £60m of consumer spend a year, before B2B. David suggested this in the BP v2 Critique tab, using the HMRC figure in BP v2 §2.

### B5. The ask and use of funds (rebuild slide 14)

**Title:** £250k SEIS to [two or three dated milestones].

**Points**
1. **One amount, one instrument, one close date.** "Raising £250,000 under SEIS. [x] committed. Closing [month]." [NEEDS PETE]
2. **Three to five spending buckets, each tied to a milestone**, not percentages alone. Investors expect 18 to 24 months of runway to the next round's proof points [BENCHMARK below].
3. **The milestones the money buys** come from Pete's own gates [PETE: BP v2 §10, §11]:
   - Vault It Ltd, IP assigned, SEIS advance assurance.
   - At least one paid pilot.
   - Week-4 retention at or above 30% for three months.
   - Phase 1 end: 1,000 paying users.
   - Phase 2 (seed) entry: £500k annual recurring revenue and three paying institutions.
   - Pick the ones £250k can credibly reach.
4. **Why SEIS matters to the room.** Investors get 50% income tax relief, and Vault-It must spend the money within 3 years. Keep any "ROI" talk to the scheme's reliefs and the milestones, not return promises (see the compliance note below).

**Draft use-of-funds template (£250,000)**

| Bucket | £ | % | What it buys (milestone) | Status |
|---|---|---|---|---|
| R&D / product (Pete's note: "35% R&D?") | £87,500 [DERIVED: 35% of £250k] | 35% | e.g. technical lead or engineer for about 18 months, Partner Edition build, ISA planner | [NEEDS PETE: confirm 35% means R&D] |
| Maintenance / security / compliance | [NEEDS PETE] | | Cyber Essentials Plus, pen test, ISO 27001 if B2B needs it (see B3), legal | |
| Marketing / growth | [NEEDS PETE] | | creators, video, SEO pages, press; target payers | |
| Partnerships / B2B sales | [NEEDS PETE] | | partnerships lead or founder time; 3 paying institutions | |
| Cofounder ("10K cofounder"?) | [NEEDS PETE] | | | reading unclear |
| Contingency | [NEEDS PETE] | 5% to 20% | slower partner cycles | guide: 5% to 10% (Adlega 2026); 20% (Fundraising101 2026) |
| **Total** | **£250,000** | **100%** | runway [NEEDS PETE] months | |

**Benchmarks for the ask**

| Figure | Value | Source |
|---|---|---|
| SEIS company limit | £250,000 in total, **including any de minimis state aid received in the 3 years up to the investment**. Gross assets no more than £350,000; fewer than 25 full-time-equivalent staff; trade under 3 years old; no prior EIS or VCT money; money spent within 3 years; no controlling parent company | [BENCHMARK: GOV.UK, https://www.gov.uk/guidance/venture-capital-schemes-apply-to-use-the-seed-enterprise-investment-scheme] |
| SEIS investor side | up to £200,000 a year per investor; 50% income tax relief | [BENCHMARK: British Business Bank, https://www.british-business-bank.co.uk/business-guidance/guidance-articles/finance/what-is-the-seed-enterprise-investment-scheme-seis, Dec 2023; HMRC SEIS reliefs] |
| Excluded trades | "financing services" and other financial activities are excluded, so get **advance assurance** that Vault-It is software. Watch the risk if referral commission is added later | [BENCHMARK: British Business Bank, as above] |
| Budget 28 Oct 2026 | from 6 Apr 2027, SEIS and EIS shares can be issued on the same day; other technical fixes | [BENCHMARK: HMRC, https://www.gov.uk/government/publications/changes-to-the-seed-enterprise-investment-scheme-enterprise-investment-scheme-and-venture-capital-trusts/changes-to-venture-capital-schemes, 28 Oct 2026] |
| EIS (for a top-up above £250k) | company limits £10m a year, £24m lifetime from 6 Apr 2026; investor relief 30% | [BENCHMARK: GOV.UK Budget 2025 TIIN, https://www.gov.uk/government/publications/enterprise-investment-scheme-eis-and-venture-capital-trusts-vct-changes/..., 26 Nov 2025; HMRC VCM1010] |
| Advance assurance | 85% of SeedLegals rounds had or planned SEIS/EIS advance assurance | [BENCHMARK: SeedLegals Termometer, https://seedlegals.com/termometer/] |
| UK seed round size | median £0.6m in 2025 (mean £3.2m, skewed); seed deals down 27%; 14.4 months between rounds | [BENCHMARK: British Business Bank *Small Business Equity Tracker 2026*, via Idea London, https://idea-london.co.uk/uk-pre-seed-funding-data/] |
| What UK start-ups actually raise | median total raised £250k; 51% raised £250k or less (the SEIS limit) | [BENCHMARK: SGI Consultants *UK Pre-Seed Funding Index 2023-25* (Companies House filings), Oct 2026] |
| Pre-seed equity sold | 10% to 20% typical (SeedLegals); about 16% average in 2025 (Beauhurst, via Solid Bond) | [BENCHMARK: seedlegals.com/resources/pre-seed-funding; solidbond.com, 12 Oct 2026] |
| Valuations | median seed pre-money £2.04m in 2025 (Beauhurst); first-round mean £2.89m (SeedLegals) | [BENCHMARK: Beauhurst *The Deal 2026*; SeedLegals Termometer] |
| Pete's own valuation view | £250k to £750k pre-money today; £1m to £1.5m after the gates | [PETE: BP v2 §10] |
| Equity sold for £250k | **[DERIVED]** at £750k pre: 25%; at £1m: 20%; at £1.5m: 14.3%; at £2.04m: 10.9% | arithmetic |
| Runway framing | 18 to 24 months to the next milestone; fundraising takes 3 to 6 months, so start the next raise with 9 to 12 months left | [BENCHMARK: DocSend, Feb 2026; Fundraising101 Academy, 31 Mar 2026] |
| Seed to Series A gap | median 1.9 years (Q4 2025, US Carta data) | [BENCHMARK: Peter Walker, Carta, LinkedIn post, 26 Feb 2026] |

**Compliance note**
- A deck pitched to investors at an event is a financial promotion (s21 FSMA).
- Check with Eligent which exemption the event relies on, for example statements by certified high-net-worth or sophisticated investors.
- Keep return language out of anything public. `rules_uk_law.md` §3 and `OFFER_AND_PRICING.md` §4 already say "never call it an investment" for the Founding offer; that applies doubly here.

**SEIS traps to name in the notes**
- Grants taken before the round (for example a local de minimis grant) reduce the £250k.
- Vault It Ltd must not sit under a holding company [PETE: BP v2 §7].

### B6. Optional: roadmap tied to finance (Slava: "what for: roadmap tied to finance")

**Title:** A timeline with three gates.

**Gates** [PETE: BP v2 §10, §11; slide 12 "next 6 weeks"]:
- **Now to Q1 2027:** Ltd, IP, SEIS advance assurance; ISA planner; Founding pre-sale; first LOI by 30 Nov.
- **Then:** first paid pilot; 30% week-4 retention.
- **Then:** 1,000 payers; first Partner Edition; 3 institutions.

**Spend:** show the use-of-funds buckets switching on at each gate. [NEEDS PETE: dates]

**Team change and cofounder:** a "who joins when" line on the same timeline. Key-person risk is the risk BP v2 ranks highest alongside willingness to pay (§12).

**University of Lincoln study**
- The realistic route is a **Knowledge Transfer Partnership**: Innovate UK funds up to 67% for SMEs; a typical KTP package is about £80k to £100k a year; 24 months preferred. Round 3 2026-27 closed 14 Oct 2026.
- Sources: [BENCHMARK: UKRI grant rates, https://www.ukri.org/councils/innovate-uk/guidance-for-applicants/costs-we-fund/costs-guidance-for-knowledge-transfer-partnerships/grant-rates/; UKRI "What a KTP project costs"; IFS competition 2514]
- The "250 to 750" in Pete's notes: [NEEDS PETE: participants, or £?].
- Any grant counted as de minimis aid eats into the SEIS £250k.

---

## C. Questions Pete must answer to finish v1.1

Answer by letter. One line each is enough.

1. **Raise timing.**
   - (a) £250k SEIS opens now, closing by [month] 2027.
   - (b) Keep BP v2: £20k non-dilutive now, £150k to £250k SEIS after the gates in late 2027.
   - (c) Pre-sale plus Start Up Loan now, and SEIS £250k from [month].
2. **Valuation on the slide.**
   - (a) State a pre-money: £750k / £1m / £1.5m.
   - (b) Say "equity terms on request".
   - (c) Use an advance subscription agreement with a cap.
3. **Use of funds.**
   - Is "35%" in your notes R&D/product? (yes / no: it means ___)
   - Then give rough % for: maintenance and security / marketing / partnerships hire / cofounder / contingency.
4. **"10K cofounder" means:**
   - (a) £10k budget to recruit or pay a cofounder.
   - (b) 10% equity set aside for a cofounder.
   - (c) something else: ___
5. **Staff spreadsheet.**
   - Which roles, from which month, at what cost? (technical lead FT / contractor days; partnerships lead; founder drawings £0 / £12k / £30k)
6. **Break-even claim.**
   - (a) Lean break-even (BP v2: Year 2).
   - (b) Break-even with the £250k spent.
   - (c) Show both.
   - Your "under 18 months" works with the raise only if hires are phased or B2B lands early.
7. **B2B numbers for the slide.**
   - Pilot £2,500 or £5,000?
   - Partner Edition set-up £15k?
   - Usage £1, £2 or £3 per active user?
   - Sponsored tier price?
8. **Affiliates and brand deals:**
   - (a) revenue line (give a £ per user or per deal);
   - (b) perk only, as BP v2 says;
   - (c) a channel we pay for.
9. **White-label delivery.**
   - Build estimate in days for theming, dashboard, SSO and consent sharing.
   - Who builds it: (a) you, (b) a contractor.
   - When does certification start: (a) Cyber Essentials now, (b) CE+ at the first pilot, (c) ISO 27001 at the first Partner Edition?
10. **Notes to decode.**
    - "Help to Buy? / Hold Bank?" is: (a) Hodge Bank, (b) Help to Buy ISA, (c) other: ___
    - "250 to 750 academic" is: (a) study participants, (b) £, (c) other.
    - LinkedIn: how many followers, and does "80% B2B / 20% B2C" describe your audience or the revenue mix?
11. **Fix on the deck.**
    - Founding £149 (live Stripe) replaces £199 on slides 9 and 11? (yes / no)
    - Traction: keep "26 vaults, 442 events" and add "4 testers, 0 paid"? (yes / no)
12. **Event compliance.** Has Eligent confirmed the audience is certified or sophisticated investors (financial promotion exemption)? (yes / no / will ask)

**Found while searching**
- The *Plaza Futura* whitepaper Pete wants to send to Steve is in his Drive: "Take a look at my Canva design!.pdf", file id 1Bc_3vEBzaNrqaVPaJ5Zsg1pfMmjItBJU.
- Barclays Eagle Labs has a **Lincoln** lab. Its Sales Growth Programme closes **20 Nov 2026**.

---

## D. Sources

**Pete's documents**
- BP v2, Vault·It Business Plan v2, 1 Nov 2026: https://claude.ai/artifact/3FL65npH4T8Mgs8qa4FKkC (Business plan and Critique tabs).
- BP v1, Vault-It-Business-Plan v.1, Google Drive id 1gClZhH3OYQ-Oinu6JJtYFgbxbfORVn4ePB8xruGJudM (superseded).
- Vault-iT Financial Model, Google Drive id 1jKHHdRzPbGEbtjnTJR1fvLUNbi_ltkUuc44jcXAGkpw (superseded).
- Repo: `docs/OFFER_AND_PRICING.md`; `docs/research/cost_to_serve.md`, `benchmarks.md`, `freemium_vs_paid.md`, `trial_length.md`, `rules_uk_law.md`; `docs/QUEUE.md` (LOI plan).
- Deck slides 1 to 15 and `script.md` (scratchpad `deck2/`).

**Funding and tax**
- GOV.UK, Apply to use SEIS: https://www.gov.uk/guidance/venture-capital-schemes-apply-to-use-the-seed-enterprise-investment-scheme
- GOV.UK, Increasing the limits of SEIS (2023): https://www.gov.uk/government/publications/venture-capital-schemes-expansion-of-the-seed-enterprise-investment-scheme-seis/increasing-the-limits-of-the-seed-enterprise-investment-scheme
- British Business Bank, What is SEIS: https://www.british-business-bank.co.uk/business-guidance/guidance-articles/finance/what-is-the-seed-enterprise-investment-scheme-seis
- HMRC, Changes to SEIS, EIS and VCT (28 Oct 2026): https://www.gov.uk/government/publications/changes-to-the-seed-enterprise-investment-scheme-enterprise-investment-scheme-and-venture-capital-trusts/changes-to-venture-capital-schemes
- GOV.UK, EIS/VCT limit increase (26 Nov 2025): https://www.gov.uk/government/publications/enterprise-investment-scheme-eis-and-venture-capital-trusts-vct-changes/venture-capital-trusts-enterprise-investment-scheme-investment-limit-increase-and-restructure
- HMRC VCM1010: https://www.gov.uk/hmrc-internal-manuals/venture-capital-schemes-manual/vcm1010
- EY Autumn Budget 2026 alert: https://www.ey.com/content/dam/ey-unified-site/ey-com/en-uk/campaigns/budget/documents/autumn-budget-alert-2026.pdf
- British Business Bank, Small Business Equity Tracker 2025: https://www.british-business-bank.co.uk/sites/g/files/sovrnj166/files/2025-06/small-business-equity-tracker-report-2025.pdf
- British Business Bank, Equity Tracker 2026 factsheet: https://www.british-business-bank.co.uk/about/research-and-publications/small-business-equity-tracker-2026/factsheet
- Idea London, UK pre-seed funding data: https://idea-london.co.uk/uk-pre-seed-funding-data/
- SGI Consultants, UK Pre-Seed Funding Index 2023-25 (Oct 2026): https://startgrowimprove.com/wp-content/uploads/2026/10/SGI_UK_PreSeed_Funding_Index_2023-25_Presentation.pdf
- Beauhurst, The Deal 2026: https://beauhurst-assets.fly.storage.tigris.dev/blog-files/Beauhurst-Insights-The-Deal-2026.pdf
- SeedLegals, Pre-seed funding: https://seedlegals.com/resources/pre-seed-funding/
- SeedLegals, Termometer: https://seedlegals.com/termometer/
- Solid Bond, Equity at pre-seed (12 Oct 2026): https://www.solidbond.com/resources/how-much-equity-to-give-away-at-pre-seed
- DocSend, Pre-seed deck guide (24 Feb 2026): https://www.docsend.com/blog/what-to-include-when-building-your-pre-seed-pitch-deck/
- Adlega, Use of funds slide (18 Jun 2026): https://adlega.com/blog/use-of-funds/
- Fundraising101 Academy, Milestones over runway (31 Mar 2026): https://fundraising101.academy/resources/use-of-funds-is-not-a-strategy-milestones-are/
- Carta, Time between rounds (Peter Walker, 26 Feb 2026): https://www.linkedin.com/posts/peterjameswalker_optimism-the-time-between-startup-rounds-activity-7432831848738738176-rai6
- UKRI, KTP grant rates: https://www.ukri.org/councils/innovate-uk/guidance-for-applicants/costs-we-fund/costs-guidance-for-knowledge-transfer-partnerships/grant-rates/
- UKRI, What a KTP project costs: https://www.ukri.org/councils/innovate-uk/guidance-for-applicants/guidance-for-specific-funds/knowledge-transfer-partnership-guidance/what-a-ktp-project-costs/

**B2B pricing and delivery**
- Moneyhub, Paragon Spring press release (10 Jun 2025): https://moneyhub.com/press-releases/paragon-bank-launches-spring-a-pioneering-savings-app-powered-by-moneyhub/
- FinTech Futures, Moneyhub and Paragon (10 Jun 2025): https://www.fintechfutures.com/open-banking/moneyhub-powers-open-banking-for-paragon-bank-s-spring-savings-app
- Pluto, white label: https://pluto.coach/white-label
- RaftLabs, Cost to build a PFM app (20 Jul 2026): https://www.raftlabs.com/blog/cost-to-build-app-like-mint
- G-Cloud 14, entitledto Budgeting Tool: https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/947696212902128
- G-Cloud 14, Brain in Hand: https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/639892420724906
- G-Cloud 14, employee engagement platform: https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/207135073178725
- Munny Group: https://www.munnygroup.com/subscriptions
- FinWELL: https://www.finwell.uk/packagedetails.html
- Scenarios: https://scenarios.uk/employers
- Moneyed: https://moneyed.co.uk/pricing
- Mozzle (broker tools; Acre to Score): https://www.mozzle.co/mortgage-broker-tools
- TradePick: https://www.tradepick.co.uk/guides/best-crm-mortgage-brokers-uk
- Advizo: https://advizo.co.uk/blog/best-mortgage-broker-crm-uk-comparison/
- Trust PMS, Mortgage Brain pricing: https://www.trustpms.com/Bolt-ons/Sourcing-Software/Mortgage-Brain
- IASME, Cyber Essentials FAQ: https://iasme.co.uk/cyber-essentials/frequently-asked-questions/
- Government Commercial Agency, Cyber Essentials guidance (30 May 2025): https://www.gca.gov.uk/news/cyber-essentials-certification-guidance-for-small-and-medium-sized-enterprises-supplier-specifics
- Solusec, Cyber Essentials cost: https://solusec.co.uk/how-much-does-cyber-essentials-cost/
- Precursor Security, SaaS pen testing: https://www.precursorsecurity.com/services/offensive-security/saas-penetration-testing
- EJN Labs, pen test cost for SaaS: https://ejnlabs.com/penetration-testing-cost-saas-companies/
- Kantis, ISO 27001 cost UK: https://www.getkantis.com/blog/iso-27001-cost
- Expertsure, ISO 27001 cost UK (10 Aug 2026): https://www.expertsure.com/uk/iso-certification/iso-27001-certification-cost/
- IT Jobs Watch, full-stack engineer contract rates: https://www.itjobswatch.co.uk/contracts/uk/full%20stack%20engineer.do

**Route to B2B**
- Bank of England, PRA SS2/21: https://www.bankofengland.co.uk/prudential-regulation/publication/2021/march/outsourcing-and-third-party-risk-management-ss
- Slaughter and May on SS2/21 (May 2021): https://www.slaughterandmay.com/insights/importedcontent/outsourcing-and-third-party-risk-management-the-pra-s-stance-on-risk-and-controls/
- FCA Handbook, SYSC 8: https://www.handbook.fca.org.uk/handbook/SYSC/8/
- FCA, PS22/9 Consumer Duty: https://www.fca.org.uk/publications/policy-statements/ps22-9-new-consumer-duty
- FCA, PS25/22 targeted support: https://www.fca.org.uk/publications/policy-statements/ps25-22-consumer-pensions-investment-decisions-rules-targeted-support
- NayaOne case study: https://nayaone.com/case-study/leading-uk-bank-slashed-fintech-onboarding-time/
- GreySpark, Injecting Innovation (Apr 2025): https://www.greyspark.com/wp-content/uploads/2025/04/GSP-Article-Injecting-Innovation-final.pdf
- Pinsent Masons, bank-fintech barriers (Aug 2022): https://www.pinsentmasons.com/out-law/analysis/solutions-to-barriers-to-bank-fintech-collaboration
- Barclays, fintech-friendly onboarding: https://home.barclays/who-we-are/our-suppliers/fintech-friendly-onboarding-/
- HSBC UK, working with fintechs: https://www.about.hsbc.co.uk/hsbc-uk/working-with-fintechs
- TSB, Fintech Pledge: https://www.tsb.co.uk/help-and-support/fintech-pledge.html
- Maestro Group, sales cycle (Jan 2025): https://maestrogroup.co/sales-cycle/
- Lloyds Banking Group, Launch 2026: https://www.lloydsbankinggroup.com/who-we-are/working-with-suppliers/collaborating-with-fintechs/launch-innovation-programme.html
- NatWest, Fintech Programme: https://www.natwest.com/business/enterprise/fintech-innovation.html
- FinTech North, Innovation Challenge (26 Feb 2026): https://www.fintechnorth.uk/natwest-confirmed-as-challenge-sponsors-of-the-north-of-england-fintech-innovation-challenge/
- Nationwide, NBS Ventures: https://www.nationwide.co.uk/ventures
- Leeds City Council, LFIX (20 Oct 2026): https://news.leeds.gov.uk/news/northern-square-mile-board-launches-with-new-financial-innovation-programme
- Barclays Eagle Labs, programmes: https://labs.uk.barclays/what-we-offer/our-programmes/
- Barclays Eagle Labs, locations: https://labs.uk.barclays/locations/

**Route to market (B2C)**
- RevenueCat, hard paywall vs freemium (29 Apr 2026): https://www.revenuecat.com/blog/growth/hard-paywall-vs-freemium
- RevenueCat, trial length: https://www.revenuecat.com/blog/growth/free-trial-length
- Promodo, Fintech Marketing Benchmarks 2026 (21 Oct 2026): https://www.promodo.com/blog/fintech-marketing-benchmarks
- Finextra / AppsFlyer, UK finance apps (3 Jun 2026): https://www.finextra.com/pressarticle/110014/uk-finance-apps-face-widening-retention-gap-as-neobanks-dominate-acquisition
- Spreadcast, CPI benchmarks (May 2026): https://spreadcast.app/resources/cost-per-install-benchmarks
- Apple, App Store Small Business Program: https://developer.apple.com/app-store/small-business-program/
- 3dot14, Snoop affiliate listing: https://3dot14.co/offers/snoop-affiliate-program
- financeAds, GoHenry: https://www.financeads.com/programs/gohenry_uk/
- financeAds, Wombat: https://www.financeads.com/programs/wombat_uk/
- financeAds, Countingup: https://www.financeads.com/programs/counting_up_uk/
- Awin, MoneySuperMarket Money terms: https://ui.awin.com/merchant-profile-terms/61791
- myroomismyoffice.com, UK finance affiliate programmes (18 Jan 2026): https://myroomismyoffice.com/best-affiliate-programs-for-uk-finance-creators/
- SocialBrandMatch, micro-influencer pricing UK 2026: https://socialbrandmatch.com/blog/micro-influencer-pricing-guide-uk
- London Life, creator rates (2 Jun 2026): https://londonlife.org/how-to-collaborate-with-london-creators-rates-briefs-best-practices

**Source quality**
- Vendor blogs (RaftLabs, SocialBrandMatch, London Life, pen-test and ISO vendors) are pricing guides, not surveys. Use them only as ranges.
- Affiliate rates are network listings and can change.
- No public pricing was found for Bud, Meniga, Personetics, ClearScore or Experian white label, or for debt-charity case software. All are quote-only.

---

## 3. Owner decisions or answers on the deck since 4 Nov

None found in this session. After the notes were uploaded (4 Nov, about 20:07) and the research brief was written, this session's deck-related work moved on to the presenter view, the digital business card and the printed cards — not to answering the 12 questions in section C above or confirming any of the research brief's `[NEEDS PETE]` items. The pricing-related facts already confirmed and live (Founding Membership £149/100 places, full yearly £59.99) are in `docs/OFFER_AND_PRICING.md` and already reflected in the v1 deck per `docs/briefs/PITCH_DECK_V2.md`.

The 12 questions in section C, and every `[NEEDS PETE]` line in the brief above, are still open and still need the owner's word before v2 can state a raise amount, a use-of-funds split, or a break-even claim with confidence.
