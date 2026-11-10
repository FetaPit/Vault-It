# UK law and regulatory rules for the vault-it.co/sign-up page

Research date: **2026-10-27**. Every source below was opened on that date (via the Exa fetch/search tools; direct `WebFetch` to legislation.gov.uk / gov.uk was blocked by the session network, so pages were read through Exa, which returned the live text, including legislation.gov.uk's "up to date with all changes known to be in force on or before 25/27 October 2026" banners).

This is research, not legal advice. Where I could not open a primary source, it is marked **UNVERIFIED** or listed under *Gaps*. Estimates and rules of thumb are labelled as such.

---

## 0. Headline conclusions

1. **The current landing page already carries several elements that are unlawful per se ("banned in all circumstances") if they are not literally true**: the "33 / 21 Pioneer Spots Remaining" counter (with a hard-coded "21" fallback), the "Only 33 spots — first come, first served" Founding-Member line, and three named testimonials (Sarah M., James T., Priya K.). DMCCA 2024 Sch. 20 paras 7, 13 and 20 and CAP 3.30, 3.31, 3.44–3.47 apply. False limited-time claims (para 7) are also a **criminal offence**; fake reviews (para 13) are civil but carry CMA fines up to the higher of **£300,000 or 10% of global turnover**.
2. **A manual-entry tracker is outside the FCA perimeter** (not an account information service; no s21 financial promotion because it is not an invitation to engage in investment activity). The risk is the *copy and features*, not the product category: personalised steers on which debt to repay or how much to cut spending can be **debt counselling (RAO art. 39E)**; naming a particular mortgage/lender can be **advising on regulated mortgage contracts (art. 53A)**; referral links to lenders/brokers can be credit broking. A disclaimer does not cure advice that is in substance advice (PERG 17.5: "relevant whether the adviser makes it clear that it does not give advice", but the test is what an impartial observer would conclude).
3. **Mailing list**: you need **opt-in consent** for marketing email (PECR reg. 22(2)). A waitlist sign-up that asks only to be told when a spot opens is a *solicited* message for that one purpose; newsletters, offers and founder pre-sale pitches need explicit, separate, unticked consent. The products-and-services soft opt-in is not safe for a cold, ad-driven waitlist (see §4.3 for the ICO's nuance on free trials). Since **5 Feb 2026** PECR fines are up to **£17.5m or 4% of global turnover** (DUAA 2025).
4. **Founder "lifetime" pre-sales**: the 14-day cancellation right applies (CCRs 2013 reg. 29–30, 36/37); failing to give the cancellation information extends it to up to **12 months** (reg. 31). "Lifetime" must be defined beside the claim (whose lifetime, what happens if the service closes). Do not present the statutory 14-day right as a perk (Sch. 20 para 11 / CAP 3.12).
5. **Prices**: consumer prices must be VAT-inclusive totals (DMCCA s230(4), CAP 3.18). Below the **£90,000** VAT threshold Pete need not charge UK VAT, but selling digital services to **EU** consumers triggers EU VAT obligations (gov.uk). **ICO fee: £52** (tier 1), **£47 by direct debit**.
6. **New from 1 Jan 2027 (draft, subject to Parliament)**: the DMCCA subscription-contracts regime will apply to Pioneer monthly/annual plans entered into from that date.

---

## 1. Digital Markets, Competition and Consumers Act 2024 (unfair commercial practices)

**In force:** Part 4 Ch. 1 (ss. 225–237 and Sch. 20) in force **6 April 2025** (S.I. 2025/272). Sources: Sch. 20 (https://www.legislation.gov.uk/ukpga/2024/13/schedule/20, retrieved 2026-10-27, banner "up to date with all changes known to be in force on or before 27 October 2026"); CMA207 (https://www.gov.uk/government/publications/unfair-commercial-practices-cma207, last updated **18 Nov 2025**, retrieved 2026-10-27).

### 1.1 Banned practices that matter for the sign-up page (Sch. 20, verbatim extracts)

| Para | Text (abridged verbatim) | Applies to Vault·It? |
|---|---|---|
| 5 | Invitation to purchase at a specified price when the trader has reasonable grounds to believe it cannot supply "in reasonable quantities, for a reasonable period of time", without disclosing that. | Yes if a Founder price is advertised widely (social ads) but only 33 are available and that limit is hidden. Disclose the cap. |
| **7** | "Falsely stating that a product will only be available for a limited time, or that it will only be available on particular terms for a limited time, in order to elicit an immediate decision…" | **Yes** — countdowns, "price goes up Friday", "alpha pricing ends soon". CMA207 example: a countdown that restarts is banned; a true end date that is honoured, with no "substantially similar offer" within a short period, "is unlikely to be problematic". **Criminal offence** (CMA207 fn 39). |
| 11 | "Presenting rights given to consumers by law as a distinctive feature of the trader's offer." | **Yes** — don't sell "14-day money-back" as a perk; it is the statutory cancellation right (CMA207 example uses exactly this). |
| 12 | Paid editorial content not disclosed. | Yes for influencer/creator posts used to recruit testers: label "#ad". |
| **13** | (1) submitting/commissioning a fake consumer review or one that conceals it was incentivised; (2) publishing reviews/review info in a misleading way (e.g. hiding negatives, giving positives more prominence, omitting that the reviewer was commissioned); (3) publishing reviews without reasonable and proportionate steps to prevent/remove fake ones. "Fake" = "purports to be, but is not, based on a person's genuine experience". "Commissioning" includes "incentivising by any means". | **Yes** — testimonials on the page are "consumer reviews". Any tester who got a free/discounted lifetime licence is *incentivised*: disclose it next to the quote. Civil (not criminal) per CMA207 fn 39. |
| **20** | "Providing… materially inaccurate information about market conditions or about the availability of the product with the intention of inducing the consumer to acquire the product under conditions that are less favourable than normal market conditions." | **Yes** — a spots counter that is not tied to real, finite paid places. |
| 23 | Describing a product as "free" if the consumer has to pay anything other than unavoidable response/delivery cost. | Yes — "Free plan", "free lifetime licence for alpha testers" must be genuinely free. |
| 28 | Persistent and unwanted solicitations. | Yes for email cadence to people who didn't ask. |
| 32 | Telling a consumer the trader's job/livelihood is at risk if they don't buy. | Yes — avoid "help a solo founder survive" style appeals *phrased as* job-at-risk. (General founder story is fine.) |

### 1.2 General prohibitions (apply even when no banned practice fits)
- **s.226 misleading actions** — false or misleading information, or an "overall presentation" likely to deceive, "even if the information it contains is true" (s.226(3)). https://www.legislation.gov.uk/ukpga/2024/13/section/226 (retrieved 2026-10-27).
- **s.227 misleading omissions** — omitting material information, or giving it "in a way that is unclear or untimely" or that the consumer "is unlikely to see". https://www.legislation.gov.uk/ukpga/2024/13/section/227
- **s.229 professional diligence**. https://www.legislation.gov.uk/ukpga/2024/13/section/229
- **s.230 invitation to purchase (drip pricing)** — an invitation to purchase must give main characteristics, the **total price** ("includes any fees, taxes, charges or other payments that the consumer will necessarily incur", s.230(4)), the **trader's identity, trading name, business address and business email** (s.230(2)(d)–(e)), and the **existence of a right to cancel** (s.230(2)(h)). https://www.legislation.gov.uk/ukpga/2024/13/section/230 (banner: up to date to 25 Oct 2026).
- Aggressive practices (pressure, undue influence, exploiting vulnerability) — CMA207 ch. 7; CMA207 treats consumers' "circumstances" (e.g. indebtedness) as a vulnerability factor. Vault·It's audience (people in debt) is a foreseeable vulnerable group → higher bar on urgency/pressure copy.

### 1.3 CMA enforcement and fines
- CMA can decide infringements itself and fine **up to 10% of global turnover or £300,000, whichever is greater**; breach of directions up to 5% / £150,000 plus daily penalties up to 5% of daily turnover / £15,000. Source: "How the CMA uses its direct consumer enforcement powers" (https://www.gov.uk/government/publications/how-the-cma-uses-its-direct-consumer-enforcement-powers/how-the-cma-uses-its-direct-consumer-enforcement-powers, published 28 Aug 2025, retrieved 2026-10-27). Cross-checked with CMA58 consumer protection enforcement guidance (courts: "up to £300,000 or, if higher, 10% of turnover", s.158 DMCC Act) and CMA207 fn 39.
- Banned practices other than paras 12, 13 and 30 are **criminal offences** (fine and/or up to **2 years' imprisonment** on indictment) — CMA207 fn 39 and §10.6.
- Trading Standards can also enforce through the courts (CMA58 §5.3).

### 1.4 CMA guidance relevant to the page
- **CMA208 Fake reviews** (4 Apr 2025): https://www.gov.uk/government/publications/fake-reviews-cma208 and short guide https://www.gov.uk/government/publications/fake-reviews/short-guide-for-businesses-publishing-consumer-reviews-and-complying-with-consumer-protection-law (retrieved 2026-10-27). Every trader publishing reviews "should publish policies which clearly prohibit fake reviews", state its approach to incentivised reviews, do a risk assessment, and have processes to detect, investigate and remove banned content — proportionate to size.
- **CMA209 Price transparency** (18 Nov 2025, updated 7 Jan 2026): https://www.gov.uk/government/publications/price-transparency-cma209 ; summary https://www.gov.uk/government/publications/price-transparency-cma209/providing-clear-and-accurate-information-about-prices-summary (retrieved 2026-10-27). Total prices up front; mandatory charges incl. VAT inside the headline price; "It's illegal to hide additional fees… (drip pricing)".
- **CMA open letter on urgency and price-reduction claims** (published 28/29 Mar 2023; still cross-referenced by CMA207 fn 41): https://www.gov.uk/government/publications/using-urgency-and-price-reduction-claims-online and PDF https://assets.publishing.service.gov.uk/media/64232b153d885d000cdadd30/OCA_business_open_letter_FINAL.pdf (retrieved 2026-10-27). Covers countdown clocks, checkout timers, "Only 5 left" scarcity claims, popularity claims and "was/now" prices; misleading where untrue, where they restart, or where a substantially similar offer follows. Combining several urgency claims raises the likelihood of harm.

### 1.5 What the page must do (DMCCA)
- **Scarcity counter**: only show a number if it is computed live from a real, finite, *paid* allocation (e.g. "Founding Member places sold: 12 of 33"), the cap is published and enforced (no 34th sale at that price), and the counter **fails closed** (hide it, never show a hard-coded number) when the data can't be loaded. Never derive "spots" from free waitlist sign-ups if the spots are paid places, and vice versa.
- **Deadlines**: only state an end date that is real and honoured; don't run a "substantially similar" offer straight after. If there is no deadline, say "Founder pricing is available until the 33 places are taken" and nothing about time.
- **Testimonials**: only real testers' words, with their documented permission; mark "Alpha tester — received a free/discounted licence" where incentivised; don't cherry-pick (para 13(5)(i)); publish a short review policy.
- **Identity block** on any page with a price: "Vault·It is a trading name of Pete Thickett (sole trader, trading as PT Live Design), [business/service address], hello@vault-it.co".

---

## 2. CAP Code (ASA) — non-broadcast, Section 03 and Section 14

Source: CAP Code Section 03 Misleading advertising, https://www.asa.org.uk/type/non_broadcast/code_section/03.html (retrieved 2026-10-27; current numbering, which cites the DMCC Act 2024 in its background note). Section 14, https://www.asa.org.uk/type/non_broadcast/code_section/14.html (retrieved 2026-10-27). Rules marked * reflect practices banned in all circumstances.

| Topic | Rule (current numbering) | Requirement | Applies / what to do |
|---|---|---|---|
| Substantiation | **3.7** | "marketers must hold documentary evidence to prove claims that consumers are likely to regard as objective". | Every factual claim: "encrypted at rest", "works offline", "UK built", user counts, "save 2 months". |
| Qualifications | 3.9, 3.10 | Qualifications must not contradict the claim and must be clear. | "Own your home outright" can't be rescued by a footnote. |
| Exaggeration | 3.11 | Must not exaggerate capability. | Outcome claims (see below). |
| Prices | **3.17–3.22** | Prices must not mislead; must include non-optional taxes (3.18); "from"/"up to" must not exaggerate (3.22). | Show £ incl. VAT (or "no VAT charged" if unregistered — prices are then the total). |
| Free | **3.23*–3.26** | "free" only if nothing but unavoidable response cost; make the commitment clear (3.24); "free trial" not for money-back offers (3.26). | Free plan / free tester licence OK if genuinely free; state limits ("up to 3 debts"). |
| Availability | **3.27–3.31** | Reasonable estimate of demand (3.27); disclose if supply at price won't meet demand (3.28*); must not falsely state limited time (3.30*); must not give materially inaccurate availability information (3.31*). | Scarcity counter and "33 spots". |
| Comparisons | Principle + **3.32–3.39** | "The ASA will consider unqualified superlative claims as comparative claims against all competing products… Superiority claims must be supported by evidence unless… obvious puffery." Price comparisons must make the basis clear (3.38) and not claim a false saving (3.39). | "The only app that…", "unlike anything in fintech", "best rate forever", "save 2 months". |
| Reviews/testimonials | **3.44*–3.50** | No fake reviews (3.44*); make clear where reviews were incentivised (3.45*); no misleading selection/prominence (3.46*); **hold documentary evidence that a testimonial is genuine and hold contact details** for the giver (3.47); must relate to the product (3.48); factual claims in testimonials must not mislead (3.49); **no testimonial without permission** (3.50). | Current three testimonials. |
| Trust marks | 3.52* | No unauthorised trust/quality marks or claimed endorsements. | No "as featured in", regulator logos, "FCA" styling. |
| Guarantees | 3.55–3.57 | "guarantee" must not confuse consumer rights; money-back guarantees must be honoured promptly. | Don't call the 14-day legal right a "guarantee". |
| Financial products | **14.1–14.5** | Section 14 applies to financial marketing not regulated by the FCA and to debt advice ads: easy to understand; don't exploit "inexperience or credulity" (14.1); basis of any forecast/projection must be "apparent immediately" (14.3); investment value can fall (14.4); past performance not a guide (14.5). | The page shows projections (debt-free date, deposit timeline, house build %): label them "illustration based on the figures you enter". If stocks/metals tracking is shown with values, avoid implying returns. |

**Outcome claims** ("From debt to owning your home outright", "Paid off my credit card…"): these are objective-sounding claims about results. Under 3.7/3.11 Vault·It would need evidence that the app causes the result; it can't. Wording that describes the *tool* rather than promising the *outcome* is defensible, e.g. "Map and track your path from debt to owning your home outright" / "See every step from your first debt payment to the day the house is yours". Testimonial claims of results must be true for that tester and typical-ness must not be implied (3.49, plus DMCCA s.226).

**ASA case pointer (verified):** ASA ruling on Paul Coleman (A21-1100727) — "100% Lifetime Money-Back Guarantee" upheld as misleading (https://www.asa.org.uk/rulings/paul-coleman-a21-1100727-paul-coleman.html, retrieved 2026-10-27). Shows ASA reads "lifetime" promises literally and requires them to be honoured. ASA Optilase ruling (22 Jun 2022) — conditions attached to a "Lifetime" guarantee must be prominent, not in a click-to-open box (https://www.asa.org.uk/rulings/optilase--uk--limited-a22-1141182-optilase--uk--limited.html).

---

## 3. FCA perimeter — is Vault·It regulated, and what wording keeps it out

### 3.1 Financial promotion (FSMA s.21)
s.21(1): a person must not, in the course of business, communicate "an invitation or inducement to engage in investment activity" (or claims-management activity) unless authorised or approved. "Engaging in investment activity" = entering into an agreement constituting a *controlled activity* or exercising rights in a *controlled investment* (s.21(8)). https://www.legislation.gov.uk/ukpga/2000/8/section/21 (retrieved 2026-10-27, banner up to date to 25 Oct 2026).
- **A subscription to a budgeting/net-worth tracker is not a controlled investment or controlled activity**, so marketing it is not a financial promotion. (Inference from the s.21 text; the FPO's list of controlled investments was not re-opened — see Gaps.)
- It would become one if the page/app **invites people to buy, sell or hold particular investments** (e.g. "buy gold now", "move your ISA to X", affiliate links to an investment platform with a nudge), or promotes credit/mortgages (consumer credit and regulated mortgage contracts are in the financial-promotion regime per CAP Section 14 background, which cites FSMA s.21 and the FPO 2005).
- **Do not use the word "invest" for buying a Vault·It plan** ("Invest once. Own it forever", "Invest in yourself — £49.99/yr" appear in `index.html` ~lines 9867, 9883, 10018). It is not unlawful by itself, but in a finance app it risks implying an investment return and creates confusion (CAP 3.1 / DMCCA s.226). Also "Own it forever" is inaccurate — the buyer gets a licence/service access, not ownership.

### 3.2 Regulated activities that the copy or features could stray into
- **Debt counselling (RAO art. 39E)**: "Giving advice to a borrower about the liquidation of a debt due under a credit agreement". https://www.legislation.gov.uk/uksi/2001/544/article/39E. FCA PERG 17 (https://handbook.fca.org.uk/handbook/perg17 , PERG 17.5 last updated 01/04/2014, PERG 17.7 last updated 02/06/2023; retrieved 2026-10-27):
  - Advice must relate to a particular debt and debtor; "General advice open to everyone on a website is unlikely to be debt counselling" (Q4.1) — so **the marketing page itself is low risk**; the **in-app roadmap** is where the risk sits.
  - "Information… balanced and neutral… is not advice" (Q5.3); but information becomes advice if selected or accompanied by value judgement.
  - **Example 15**: a budget planner that "just puts into a convenient form information that the consumer has himself supplied" is not debt counselling. **Example 16**: advising the debtor "to reduce discretionary spending to a set amount each month to enable him to pay off a certain amount of a large credit card bill" **is** debt counselling. **Example 14**: recommending which debt to prioritise is likely debt counselling.
  - Q5.5 decision trees: neutral, factual scripted questioning presenting all options is not advice; scripted Q&A that identifies a particular course of action "is likely to be debt counselling".
  - Q5.7: interactive software counts the same as a human adviser.
- **Advising on regulated mortgage contracts (RAO art. 53A)** — PERG 4.6 (https://handbook.fca.org.uk/handbook/perg4/perg4s6, last updated 31/01/2020, retrieved 2026-10-27): only advice on a *particular* mortgage/lender is regulated; "I would always recommend buying a house… as opposed to renting" and "take out a mortgage" are generic (unregulated). Note: unlike debt counselling, art. 53A advice "will still be covered… even though it may not be given to… a particular borrower (for example… on a website)" — so the **marketing page must not recommend particular mortgage products or lenders**.
- **Account information services (PSRs 2017)** — PERG 15 Q25A (https://handbook.fca.org.uk/handbook/perg15/perg15s3, retrieved 2026-10-27): "Whether a service is an account information service depends on whether there has been access to payment accounts." Manual entry = no AIS. **If Vault·It ever adds bank-linking (open banking), it needs an authorised/registered AISP (or to act as an agent of one).** The FCA consumer page lists "budgeting apps" among AISPs (https://www.fca.org.uk/consumers/account-information-payment-initiation-services).
- **Targeted support** (new RAO art. 55A, in force **6 Apr 2026**, S.I. 2026/74; FCA PS25/22, final rules 26 Feb 2026 — https://www.fca.org.uk/publications/policy-statements/ps25-22-consumer-pensions-investment-decisions-rules-targeted-support, retrieved 2026-10-27): covers group-based recommendations on pensions/retail investments and needs FCA permission. It is **not** a route for an unauthorised app; avoid "suggestions tailored to people like you" for investments.
- **Credit broking / referral**: introducing users to lenders/brokers for a fee is a regulated activity (RAO art. 36A) — **UNVERIFIED in this session** (article not re-opened); treat any lender/broker affiliate link as needing advice before launch. PERG 17.7 example 12–13 (referrals to debt firms) is verified.
- **Crowdfunding / pre-sales**: FCA "Understanding crowdfunding" (https://www.fca.org.uk/investsmart/understanding-crowdfunding, page dated 26 May 2026, retrieved 2026-10-27) — FCA regulates loan-based and investment-based crowdfunding; donation-based and **rewards-based/pre-payment crowdfunding are not regulated by the FCA** (payment services may be). Cross-check: FCA PS19/14 §1.6 fn 1 ("We do not regulate other forms of crowdfunding, such as reward or donations based…"). **So founder pre-sales are fine as long as they are product pre-payments — never offer equity, revenue share, "returns", or interest to founding members** (that would be an investment and a financial promotion).

### 3.3 Is a disclaimer enough?
No. PERG 17.5 Q5.3 says a no-advice statement is *relevant* to a factual enquiry, but the overall test is whether "an impartial observer… would conclude that advice had been given". A disclaimer supports, but cannot override, content that steers. Use both: neutral product design + clear statement.

**Recommended disclaimer (footer + near any projection):**
> "Vault·It is a tracking and planning tool. It does not give financial, debt, mortgage or investment advice, and it is not authorised or regulated by the Financial Conduct Authority. Figures and timelines are illustrations based on the numbers you enter. For free, impartial debt advice contact MoneyHelper (moneyhelper.org.uk) or a regulated adviser."

Notes: the current footer says "Not regulated by the FCA. Not financial advice." — acceptable but should be fuller. Signposting to MoneyHelper is a good-practice suggestion (my recommendation, not a verified legal requirement; URL not opened this session). Don't use FCA logos or "FCA-ready" style claims (CAP 3.52).

---

## 4. Mailing list — UK GDPR, PECR, DUAA 2025

### 4.1 PECR reg. 22 (current text)
https://www.legislation.gov.uk/uksi/2003/2426/regulation/22 (retrieved 2026-10-27; "no known outstanding effects"; amended 5.2.2026 by DUAA s.114 to add the charity soft opt-in).
- reg. 22(2): no unsolicited direct-marketing email to individual subscribers unless the recipient "has previously notified the sender that he consents for the time being".
- reg. 22(3) products-and-services soft opt-in: details obtained "in the course of the sale or negotiations for the sale", marketing of "similar products and services only", and a simple free refusal offered at collection and in every message.
- reg. 22(3A): charity soft opt-in — **not available to Vault·It** (not a charity).
- reg. 23 (https://www.legislation.gov.uk/uksi/2003/2426/regulation/23): don't conceal sender identity; provide a valid address to opt out.

### 4.2 ICO guidance (current)
- "How do we comply with the PECR electronic mail marketing rules?" https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/how-do-we-comply-with-the-pecr-electronic-mail-marketing-rules/ (retrieved 2026-10-27; updated for the two soft opt-ins):
  - **Solicited** messages (the person "specifically asked you to send that message") need neither consent nor soft opt-in.
  - Consent must be freely given, specific, informed (name the organisation), unambiguous, by clear affirmative action; **no pre-ticked boxes**; separate from T&Cs.
  - Soft opt-in: "negotiations for the sale" means actively expressing interest in buying — "This includes signing up to a free trial of your product or service, requesting a quote or asking for more details about what you offer."
  - Opt-out in every message, simple and free (e.g. a clear unsubscribe link).
  - **'Refer a friend'**: "You must not rely on the soft opt-ins for 'refer a friend' schemes. You must obtain valid consent. This is unlikely to be possible in practice…". You are responsible if you instigate (pre-populated emails, active encouragement).
- ICO consent records: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/consent/how-should-we-obtain-record-and-manage-consent/ (retrieved 2026-10-27). Must show **who** consented, **when** (timestamp), **what they were told** (master copy/version of the form and privacy notice in use), **how** (data submitted + timestamp linked to form version), and **whether/when withdrawn**. ICO marks "time and date linked to an IP address, with a web link to your current data-capture form" as *bad practice* — store the version, not a link. Consider refreshing consent "every two years" if in doubt.

### 4.3 Does the soft opt-in cover a waitlist? (analysis)
- The ICO treats a **free-trial sign-up** as "negotiations for a sale". A waitlist for a not-yet-available, partly-paid product is arguably similar, *but* (a) ad-driven waitlist sign-ups for "news" are closer to "logs into a website to browse" / general enquiry, (b) a tester sign-up is not a purchase enquiry, and (c) the soft opt-in only covers *similar products and services*, not e.g. partner offers or a fundraising/investment ask. **Conclusion: do not rely on the soft opt-in for the sign-up page; take explicit consent.** (This is my reading of the ICO text, not an ICO statement about waitlists — see Gaps.)
- The current landing copy ("we won't send marketing unless you opt in") offers **no opt-in control** — so today the list only supports the solicited "your spot is ready" email, not updates/newsletters.

### 4.4 Signing someone else up / unverified addresses
- Consent must come from the subscriber; you must be able to show *that person* consented (UK GDPR Art. 7(1), quoted on the ICO consent page). An address typed in by someone else gives you no consent from its owner, and mailing it is an unsolicited marketing email. ICO: consent is not transferable; refer-a-friend can't produce valid consent.
- **Double opt-in (confirmation email with a link)** is **not a legal requirement** stated in PECR or in the ICO pages opened. It is a **best practice** (rule of thumb, basis: it is the most practical way to evidence that the mailbox owner consented, as Art. 7(1) and the ICO record-keeping guidance require, and it blocks bots/typos). Recommend: store sign-up as "pending", send one transactional confirmation (no marketing in it), mark "confirmed" on click, purge unconfirmed after a short period (e.g. 30 days — business choice).

### 4.5 DUAA 2025 changes (in force)
- ICO statement 5 Feb 2026: most DUAA data-protection provisions commenced **5 Feb 2026**; complaints-procedure duty **19 Jun 2026**; ICO can now fine **up to £17.5m or 4% of global turnover under PECR**. https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/02/statement-on-the-commencement-of-the-data-use-and-access-act-duaa/ (retrieved 2026-10-27). Cross-check: S.I. 2026/82 explanatory note (DUAA s.115 PECR enforcement changes; conduct from 5 Feb 2026 is under the new regime) https://www.legislation.gov.uk/uksi/2026/82/note/made ; ICO blog 23 Jun 2026 (ICO "developing separate guidance to cover these higher fines").
- **Complaints procedure**: since 19 Jun 2026 controllers must have a data-protection complaints procedure (ICO statement + S.I. 2026/82 reg. 3/7). The privacy notice linked from the sign-up page should say how to complain to Vault·It first.
- **Cookies/pixels**: new PECR Sch. A1 (inserted 5 Feb 2026) — exceptions for strictly necessary storage, **statistical analytics** (if info is not shared except to help improve the service, clear info is given and a simple free objection is offered) and appearance preferences. https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1 (retrieved 2026-10-27). **Inference:** advertising pixels from social-ad platforms (used to measure ad conversions) share data for advertising, so they fall outside the statistical exception and **still need prior consent**. Turnstile/security cookies fall under "strictly necessary… to prevent or detect fraud" (para 4(2)(c)).

### 4.6 Mechanism the sign-up form must use
1. Email field + (optional) first name. Turnstile.
2. **Unticked** checkbox, separate from anything else: "☐ Email me Vault·It news, launch updates and founder offers. Unsubscribe any time." (separate box if you also want to send tester research invites, or SMS — consent is per channel.)
3. Line under the button: "We'll email you to confirm your address and, when your place opens, your invite. [Privacy notice] explains how we use your data and how to complain."
4. Double opt-in confirmation email (transactional).
5. Store per sign-up: email, timestamp (UTC), form version ID, exact consent wording shown, privacy-notice version, checkbox state(s), source (UTM / ad campaign), confirmation timestamp, IP/user-agent hash (optional, for fraud), unsubscribe timestamp.
6. Every marketing email: sender identity ("Vault·It, PT Live Design"), physical/postal contact address, one-click unsubscribe; honour opt-outs promptly. (Gmail/Yahoo bulk-sender one-click unsubscribe rules: out of scope for this file.)
7. No "invite a friend by entering their email" field; a share link the user posts themselves is fine.

---

## 5. Consumer Contracts Regulations 2013 — founder lifetime pre-sales

Sources (all retrieved 2026-10-27): reg. 30 https://www.legislation.gov.uk/uksi/2013/3134/regulation/30 ; reg. 31 …/regulation/31 ; reg. 34 …/regulation/34 ; reg. 36 …/regulation/36 ; reg. 37 …/regulation/37.

- **Cancellation period**: for a service contract or digital content not on a tangible medium, it ends "14 days after the day on which the contract is entered into" (reg. 30(2)) — i.e. from payment/acceptance, **not** from launch. Hosted web-app access is most naturally a **service** (CRA/CCRs classification of SaaS is a judgment call — see Gaps); downloadable content would be digital content.
- **Service started inside the 14 days** (reg. 36): may only start on the consumer's **express request**; if they then cancel they pay a proportionate amount "in proportion to what has been supplied, in comparison with the full coverage of the contract" (reg. 36(4)) — for a "lifetime" deal the proportion is not sensibly calculable, so in practice **refund in full**. They pay nothing if the right-to-cancel information wasn't given (reg. 36(6)).
- **Digital content** (reg. 37): right is lost only if supply began after express consent **and** acknowledgement that the right will be lost.
- **No cancellation info given** → period extends to up to **12 months** after it would have ended (reg. 31).
- **Refund** within 14 days of being told, same payment method, no fee (reg. 34(4), (6)–(8)).
- **DMCCA s.230(2)(h)**: the invitation to purchase must state the existence of the right to cancel.
- **Do not frame it as a perk** (Sch. 20 para 11; CAP 3.12): say "You have 14 days to change your mind (your legal right) — and we'll extend that to [N] days" only if you genuinely give more than the law.

### 5.1 What "lifetime" means — and how to word it
- No statute defines "lifetime" for a service, and I found **no CMA or ASA guidance specific to "lifetime" subscriptions/deals** (Gaps). The applicable tests are: CAP 3.1/3.9 and DMCCA s.226 (would the average consumer read it as the buyer's lifetime?), CAP 3.55–3.57 (guarantee-like promises must be honoured; ASA Paul Coleman ruling reads "lifetime" promises literally), and the **CRA 2015 Sch. 2 "grey list"** for the terms behind it: para 7 (trader may dissolve the contract at its discretion or keep sums paid for services not yet supplied), para 8 (terminate an indefinite contract without reasonable notice), para 11 and 13 (alter terms/characteristics without valid reason), para 15 (increase price without a right to cancel). https://www.legislation.gov.uk/ukpga/2015/15/schedule/2 (retrieved 2026-10-27; up to date to 27 Oct 2026).
- **Recommended wording beside the price** (my drafting, based on the above):
  > "**Founding Member — £[X] once.** Pioneer features for the life of the Vault·It service, on one account, with no renewal fee. 'Lifetime' means for as long as Vault·It operates the app — not your lifetime. If we ever close the service we'll give you at least [90] days' notice and a full data export. [If closing within [N] years of your purchase, we'll refund [pro-rata/in full]] — full terms."
  The bracketed refund promise is a *business decision*, not a legal requirement, but some commitment of this kind materially reduces Sch. 2 para 7 risk.
- Don't promise "every future feature forever" unless true; define what's included ("all Pioneer-plan features, including future Pioneer features"). Reconcile **£199 (landing) vs £149 (app)** before any sale; a "was £199, now £149" story would be a price-comparison claim needing a genuine established £199 price (CAP 3.39; CMA open letter Example on launch prices).
- "Lock in this rate forever" (Pioneer, landing) and "Alpha pricing locked in for life" (app): these are contractual promises — the T&Cs must actually prevent price rises for those subscribers, otherwise misleading (s.226) and a para 15 grey-list issue.

### 5.2 DMCCA subscription-contracts regime (coming)
- Draft **Consumer Subscription Contracts (Cancellation and Information) Regulations 2026**, laid **19 Oct 2026**, affirmative procedure, coming into force **1 Jan 2027**; rules apply to subscription contracts entered into on or after commencement. https://www.legislation.gov.uk/ukdsi/2026/9780348287912 ; DBT draft guidance https://www.gov.uk/government/publications/subscription-contracts (published 19 Oct 2026) (both retrieved 2026-10-27). Cross-checked with Gowling WLG (21 Oct 2026) and TLT (11 Aug 2026), which report the date was brought forward from spring 2027. **Status: draft, not yet approved by Parliament.**
- Definition (DMCCA s.254, prospective): automatically recurring/continuing supply with automatic liability for each period — **Pioneer £5.99/mo and annual plans will be in scope**; a one-off Founder payment with no recurring liability is likely not (inference from s.254(2)–(3)). https://www.legislation.gov.uk/ukpga/2024/13/section/254

---

## 6. VAT and the ICO fee

### 6.1 VAT
- **Registration threshold: £90,000** taxable turnover over the last 12 months (or expected in the next 30 days); deregistration £88,000. gov.uk "When to register" https://www.gov.uk/vat-registration/when-to-register and "VAT thresholds" https://www.gov.uk/how-vat-works/vat-thresholds (retrieved 2026-10-27). Cross-check: S.I. 2024/307 (in force 1 Apr 2024) and a 25 Oct 2026 secondary source noting no change in the Nov 2025 Budget. **Watch: Autumn Budget is reported for 28 Oct 2026** (secondary source goodvat.com; not verified on gov.uk) — re-check the threshold after it.
- **Advertised consumer prices must be the total including any VAT**: DMCCA s.230(4) ("fees, taxes, charges"), CAP 3.18 ("Quoted prices must include non-optional taxes"; VAT-exclusive prices only where all addressees can recover VAT), CMA209 ("tax, like VAT" is a mandatory charge), E-Commerce Regs 2002 reg. 6(2) (prices must "indicate whether they are inclusive of tax") https://www.legislation.gov.uk/uksi/2002/2013/regulation/6. If not VAT-registered, the price shown *is* the total; state "No VAT is charged" or "Price includes any applicable taxes" (wording suggestion).
- **Selling to EU consumers**: digital services to consumers are taxed where the consumer is; a UK business "must either register for the Non-Union VAT MOSS scheme in an EU member state [or] register for VAT in each EU member state" — gov.uk https://www.gov.uk/guidance/the-vat-rules-if-you-supply-digital-services-to-private-consumers (last updated 28 Mar 2022, retrieved 2026-10-27; the page's "MOSS" naming is dated — the EU scheme is now called non-Union OSS, as Stripe's page uses). The gov.uk page states **no threshold** for this; whether any EU threshold applies to non-EU sellers is **UNVERIFIED** here. Practical options: restrict paid plans to UK customers at launch, or use a merchant-of-record, or register for non-Union OSS.
- **Stripe Tax** (https://stripe.com/gb/tax/pricing, retrieved 2026-10-27): **Tax Basic 0.5% per transaction** (Billing/Checkout/Payment Links) or **40p per transaction** via payment APIs, only where you're registered to collect; **Tax Complete from £70/month** (1-year contract; 2 registrations, 200 transactions/month). Stripe Tax calculates/collects; it does **not** make Pete VAT-registered — registration is still his obligation (Complete can file for EU non-Union OSS).

### 6.2 ICO data-protection fee
- Data Protection (Charges and Information) Regulations 2018 reg. 3 (amended 17 Feb 2025 by S.I. 2025/63): **Tier 1 (micro: turnover ≤ £632,000 or ≤ 10 staff) £52; Tier 2 £78; Tier 3 £3,763; £5 off by direct debit**. https://www.legislation.gov.uk/uksi/2018/480/regulation/3 ; cross-checked with ICO "Guide to the data protection fee" https://ico.org.uk/for-organisations/data-protection-fee/data-protection-fee/ and gov.uk "Pay the data protection fee" (both retrieved 2026-10-27).
- Pete as a sole trader running a mailing list and an app holding personal data is a controller and is **tier 1: £52/yr (£47 by direct debit)** unless exempt; the public register shows the name and address — gov.uk suggests a PO box if he works from home.

---

## 7. Other identity/disclosure duties for the page
- E-Commerce Regs 2002 reg. 6(1): name, **geographic address**, email; VAT number if registered — "easily, directly and permanently accessible". (link above)
- Companies Act 2006 Pt 41 (business names): s.1202 requires name/address disclosure on business letters, orders, invoices and on request for a person trading under a business name (https://www.legislation.gov.uk/ukpga/2006/46/section/1202). Footer: "Vault·It is a trading name of Pete Thickett, trading as PT Live Design, [address]."

---

## 8. High-risk elements inferred from the CONTEXT and the current pages

Checked in `/home/user/Vault-It/landing.html` and `/home/user/Vault-It/index.html` (read-only).

| # | Element (where) | Rule(s) | Risk | Fix |
|---|---|---|---|---|
| 1 | "33 Pioneer Spots Remaining" eyebrow + "spotsLeft" counter, computed as `33 - waitlist_count` and **falling back to a hard-coded "21 pioneer spots remaining"** when the RPC fails (landing.html ~l.334, 946–967) | DMCCA Sch.20 paras 7, 20; s.226; CAP 3.27, 3.30*, 3.31* | **Very high** — a number not tied to real availability; free waitlist rows used as "spots"; hard-coded fallback is a false statement whenever shown | Remove fallback; only show a live count of *sold* founder places against a published, enforced cap; hide on error |
| 2 | Three testimonials "Sarah M., Manchester / James T., Bristol / Priya K., London" under "From our pioneers" (l.629–650) | Sch.20 para 13; CAP 3.44*–3.50 | **Very high** unless each is a real tester with documented consent, contact details and genuine experience | Remove until real; when real, add "Alpha tester · free licence" incentive labels, permission records, review policy |
| 3 | "Paid off my credit card watching the bar fill up" testimonial | CAP 3.49, 3.7; s.226 | High — factual outcome claim in a testimonial | Only if true for that person and evidenced |
| 4 | "Founding Member £199 once… Limited to 33 spots — claim yours before they're gone" / "Only 33 spots — first come, first served" (l.695–707) vs **£149** in app (index.html ~l.9873, 10007) | s.226, s.230; CAP 3.17, 3.28*, 3.39 | High — inconsistent prices; "before they're gone" pressure | One price everywhere; cap genuinely enforced; no "was" price unless established |
| 5 | Pioneer annual **£59.99** (landing, app l.10888) vs **£49.99** (app l.9857, 9997); "save 2 months" (£5.99×12 = £71.88; £71.88 − £59.99 = £11.89 < 2×£5.99 = £11.98) | CAP 3.17, 3.39; CMA209 | Medium — inconsistent price; saving overstated by 9p | Fix price; say "save £11.89 a year" or "about 2 months" |
| 6 | "Lifetime access", "Everything in Pioneer, forever", "Invest once. Own it forever", "Alpha pricing locked in for life", "Lock in this rate forever" | s.226; CAP 3.1, 3.9; CRA Sch.2 paras 7, 8, 11, 15 | High | Define "lifetime" beside the claim (§5.1); drop "invest"/"own"; make T&Cs honour the lock-in |
| 7 | "Alpha testers get a free lifetime Pro licence on beta release" / "heavily discounted lifetime licence" (index.html ~l.9703, 9716) | Sch.20 para 23; CAP 3.23–3.24; para 13 (incentivised reviews) | Medium — any tester review becomes incentivised; "free" must be truly free | Disclose incentive on reviews; state conditions |
| 8 | "Add your number" (phone/SMS collection, index.html ~l.9716) | PECR reg. 22 (SMS is electronic mail) | Medium | Separate SMS consent box; only text with consent |
| 9 | Hero "From debt to owning your *home outright*" and "collect wins until you own your home outright" | CAP 3.7, 3.11, 14.1; s.226 | Medium — outcome promise to an indebted audience | Reframe as a tool: "Map and track your path…" |
| 10 | "unlike anything I've seen in fintech" and any "the only app that…" | CAP comparisons principle, 3.7 | Medium | Evidence or drop; puffery only if clearly not literal |
| 11 | "Encrypted in transit & at rest", "Works offline", "0 credit card required" trust badges | CAP 3.7; owner rule (privacy/security copy must match code) | Medium | Hold evidence; check against code/BETA_RUNBOOK |
| 12 | Waitlist form: email only, no opt-in box, copy says "we won't send marketing unless you opt in"; mailto removal; inserts straight into `waitlist` with no confirmation (l.733–747, 921–944) | PECR reg. 22; UK GDPR Art. 7(1); ICO consent records | High for any newsletter/updates; no evidence of consent; anyone can add anyone's address | Add unticked opt-in, double opt-in, consent log, one-click unsubscribe |
| 13 | Founder purchase via `mailto:` / Stripe links with no pre-contract info on cancellation, identity, address | CCRs 2013 regs 30–31, 36; DMCCA s.230(2)(d),(e),(h) | High once money is taken — cancellation right can extend to 12 months | Checkout page with trader identity, total price, 14-day right, express-request tick if access starts immediately |
| 14 | Social-ad / creator recruitment of testers | Sch.20 para 12; CAP Section 02 (recognition of ads — not opened) | Medium | "#ad" on paid/gifted posts |
| 15 | Ad pixels on the sign-up page for social-ad attribution | PECR reg. 6 + Sch. A1 | Medium | Consent banner before loading pixels |
| 16 | Roadmap/budget features that tell a user which debt to pay first or how much to cut | RAO art. 39E; PERG 17.7 examples 14, 16 | Medium (app, not page) | Present options neutrally ("Avalanche or snowball — you choose"); no personalised recommendation |
| 17 | Any founding-member "share", revenue share, or "returns" pitch during fundraising | FSMA s.21; FCA crowdfunding page | High if introduced | Keep pre-sales strictly as product pre-payments |
| 18 | Debt-focused audience | CMA207 §2.23–2.25 (vulnerable consumers) | Context multiplier | No countdowns, no fear copy, easy cancel/refund |

---

## 9. Gaps (could not verify in this session)
- Direct `WebFetch` to legislation.gov.uk and gov.uk was blocked by the session network; all were read via Exa. Exa returns the live page, but I could not see HTTP retrieval headers.
- No CMA or ASA guidance or ruling **specific to "lifetime" software/service deals** was found; the §5.1 wording is drafting based on general rules.
- No ICO statement specifically on whether a **product waitlist** counts as "negotiations for a sale" for the soft opt-in; §4.3 is my analysis.
- No ICO text stating **double opt-in** is required or recommended was found; it is presented as best practice.
- RAO **art. 36A (credit broking)** and the **Financial Promotion Order 2005** schedules (controlled investments) were not opened.
- Whether hosted SaaS is a "service" or "digital content" under CCRs/CRA was not checked against BEIS/DBT guidance.
- **EU VAT threshold for non-EU sellers** of e-services: not verified (gov.uk page states no threshold).
- The Autumn Budget date of 28 Oct 2026 comes from a secondary source; VAT threshold should be rechecked after it.
- CAP Code Section 08 (sales promotions) and Section 02 (recognising ads), and the ASA's remit over marketers' own websites, were not opened this session.
- The subscription regulations are **draft** (laid 19 Oct 2026); dates could still change.
