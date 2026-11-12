# Vault-It roadmap, November 2026 onwards

Draft v1, 12 Nov 2026. Built from the repo (`docs/QUEUE.md`, `docs/OFFER_AND_PRICING.md`, the trust centre plan, the SEIS and FCA research) and Business plan v2. Owner ask: "Help me detail my vault-it roadmap. To be more attractive for investors. Trust centre, household plans for vault it, iso compliance fca regulation seis etc based on all context. Pull in coo."

Read this first:
- Every date is a target unless it says "done". Dates come from the plan or the docs. Where a date is a supplier's estimate, it says so.
- Prices and costs are planning lines from the research files. None is a written quote.
- This is a plan, not an offer of shares. Not legal, tax or financial advice. A solicitor, an accountant and an FCA consultant confirm before anyone acts.
- Part B (Before you send this) is for Pete only. Part A can go to an investor once Part B is settled.

---

# Part A: the roadmap

## A1. The story in five lines

1. **Product.** Live MVP at app.vault-it.co: one live "Keys in hand" date, a seven-stage journey from Stage 0 (Survival), and a to-scale 3D house that gains a brick for every pound saved.
2. **Who pays.** Consumers on a 30-day trial, then Pioneer; a Household plan for couples and families next; lenders, building societies and brokers later, for reach and a white-label Partner Edition.
3. **Trust.** Public trust centre first, an independent security test before public payments, then Cyber Essentials and ISO 27001 as partners ask. We say "building towards", never "certified", until a certificate exists.
4. **Regulation.** Today a planning and calculation tool, outside FCA regulation. Each step that would cross the line (referrals to brokers, reading bank data, recommending products) has a named route and a gate before it.
5. **Money.** £250,000 under SEIS, closing March 2027, after a £20,000 non-dilutive bridge pays for incorporation, IP and HMRC advance assurance.

## A2. One-page timeline

| When | What | Evidence or source |
|---|---|---|
| Done | Live MVP, Stripe payments, double opt-in sign-up list, Cloudflare hosting, data download and delete, sign-in rate limiting, first security review (31 Oct 2026) | Plan v2 section 7, trust centre plan |
| Done | Accepted into Web Summit's startup programme; enrolled with the Business Lincolnshire Growth Hub; investor pitch and answers page live | Plan v2 |
| Now (Nov 2026) | v0.95 round: deposit reset, month strip, onboarding, house intro, Roadmap cards. Two v0.95 branches are not green in CI yet | `docs/QUEUE.md`, CI runs 940 and 964 |
| Now | Trust centre v1 planned; Vanta scoping call held; written quote not yet received | Trust centre plan |
| Dec 2026 | Founding Member pre-sale opens (plan: weeks 5 to 6 of launch; first income in December). Trust page is the date Vanta pointed at for the December pitch | Plan v2, trust centre plan |
| Dec 2026 to Jan 2027 | **Gate 1:** accounts and payments open to the public only after an independent security review | Plan v2 section 7 |
| Early 2027 | Incorporate Vault It Ltd, assign IP, HMRC advance assurance (third parties quote 4 to 6 weeks) | Plan v2, SEIS research |
| Mar 2027 | **Gate 2:** £250,000 SEIS round closes. Vanta's own estimate: ISO audit-ready around this month at 2 to 3 hours a week from a start now (a salesperson's estimate) | Plan v2, trust centre plan |
| Apr 2027 | SEIS money starts to be spent at about £13,900 a month | Plan v2 |
| Aug 2027 | Future London Academy date (owner, 11 Nov). Detail of what is agreed still to confirm | Queue, 11 Nov |
| Phase 1 end | 1,000 paying users and 30% week-4 retention; at least one paid pilot; first Partner Edition | Plan v2 sections 10 and 11 |
| Phase 2 | Seed round: £500,000 annual recurring revenue and three paying institutions. Bank sync only after a penetration test and an aggregator contract | Plan v2 |
| Apr 2029 | Market event: the First Time Buyer ISA replaces the Lifetime ISA (Autumn Budget, 28 Oct 2026) | Plan v2 |

## A3. Lane 1: product

**Live and shipped.** See A2. The calculation engine, seven-stage journey, to-scale 3D house engine and brand system are founder-built.

**Built but not live.** Deposit reset on the House Builder page (`v095/deposit-reset`, `a29cbab`), month strip fix (`v095/month-strip`, `e19d8c6`), Roadmap cards larger (preview sent, uncommitted). Merged to `brand-rollout` and waiting for the next release: the index split, house intro behind sign-in, onboarding friction, tester 1 clean-up, the `/demo-a` demo link.

**Next, in the order the plan gives it.**
1. Finish v0.95 and release it (laptop release, CI green on the exact commit, phone sign-off, backup branch).
2. Accounts and saved state, the ISA switch planner (Lifetime ISA to First Time Buyer ISA), the shareable "keys date" card. Funded first by the £20,000 bridge, then by the round.
3. Entrepreneur mode, items 2 to 5 (contract cards, income that moves, Your Team tab, UK reminders). Queued, not started.
4. Household plan (lane 2).
5. Partner Edition: white-label build for lenders, with the security pack from lane 3 ready first.
6. Engine IP: make the 3D engine protectable; UK IP questions are listed for a solicitor.

**Not before:** bank sync (needs a penetration test and an aggregator contract first, see lane 4).

## A4. Lane 2: Household plan

**What is decided (owner, 7 Nov 2026).** Household is its own plan: £19.99 a month or £199.99 a year, up to 8 people in one licence. Status: coming soon, not on sale, no Stripe link, no tester price. It replaces the earlier idea of "family mode" inside Pioneer.

**Why it matters to investors.** It lifts revenue per account (the plan notes that half of first-time buyers buy as a couple) and it gives the business a second, higher-priced plan to test.

**What exists.** Sourced data for two parent personas (Paul and Claire Ashworth, UK averages with the method shown) in `docs/research/family_personas.md`. The design idea is logged: a persona switcher with a family dashboard. The 20-year-old and the 17-year-old are named in the data file but not yet modelled. Nothing is built.

**Steps and gates.**

| Step | What | Gate or owner |
|---|---|---|
| 1 | Settle the price. Business plan v2 shows £9.99 a month or £79.99 a year, which does not match the 7 Nov decision. | Pete decides, then plan and deck match |
| 2 | Write the privacy position before building: several people under one licence, a 17-year-old in the data, who can see whose figures. This goes into the DPIA (lane 3). | Adviser check; children's data is a question to ask, not assumed |
| 3 | Build in stages: shared household total first, then personas and named bills, then the joint journey for two | One queue item per stage, through `ship-item` |
| 4 | Stripe product and Payment Link | Pete's yes first |
| 5 | Put it on sale | Only after Pioneer shows paying users; plan: price tests start once 1,000 people pay |

## A5. Lane 3: trust centre, security and ISO 27001

**The aim.** A public trust page that says only what is true today, backed by evidence, and a clear path to an ISO 27001 certificate when a partner or investor asks.

**Already true and evidenced.** Data in Supabase, Frankfurt, with daily backups. Sign-in by email code and PIN, secrets only in Supabase. Rate limiting (migration 008) and security hardening (migration 007). Users can download and delete their data. Privacy notice and beta terms in the app. A test fails if the app talks to an outside host the privacy notice does not name. CI runs the full suite on every push. Releases need green CI, phone sign-off and a backup branch. A 72 hour ICO breach rule is written in the runbook.

**Open or missing.** No written policies, risk register, asset inventory or Statement of Applicability. ICO fee not yet checked for the trading entity. Privacy notice and terms not yet solicitor-reviewed. Log retention not at the minimum. No supplier register. No independent penetration test, no DPIA, no MSA. The tester sample-leak is not yet written up as incident 001 (three tester rows still to delete, awaiting Pete's yes).

**The sequence (from the trust centre plan).**

| Step | What | Depends on |
|---|---|---|
| 1 | Close the leak: delete the 3 tester rows, write up incident 001 | Pete's yes |
| 2 | ICO fee check, log retention minimum, supplier list and data processing terms on file | none |
| 3 | **Trust centre v1** at vault-it.co/trust: what we hold, where, suppliers, how sign-in works, your rights, breach rule, security.txt, "Building towards ISO 27001. Not certified." | step 2 |
| 4 | **Penetration test** by a CREST accredited tester; scope app, edge functions, row level security and the Worker; we publish a short summary only | steps 1 and 3, Pete's yes; Gate 1 |
| 5 | **DPIA** (UK GDPR), including what goes to Anthropic for the screenshot reader and the Household position | step 2 |
| 6 | Policies, risk register, asset list, Statement of Applicability draft | step 2 |
| 7 | **MSA** (master services agreement) for B2B partners, sent to a solicitor | entity name |
| 8 | Evidence habit for a full cycle (MFA, access review, backup restore test, release record), then internal audit by someone independent | step 6 |
| 9 | Stage 1 and Stage 2 audit with a UKAS accredited certification body | steps 4 to 8 |

**Stepping stone.** Cyber Essentials, then Cyber Essentials Plus (the plan budgets both). Check it suits a one-person company on a laptop and phone first.

**Tooling and cost lines.** The planning line from Vanta's email of 11 Nov: up to about $10,500 a year (about £8,000) for one framework, described as a ceiling, plus about £4,000 for the certification audit paid to the certification body, and about half that for each of the next two surveillance audits. Implementation help from their partner Workstreet: 30 days at no cost, including a grey box CREST penetration test offered by that partner. **None of this is a written quote.** Ask for one in writing (term, renewal, what happens after the free 30 days, whether the pen test is inside the price, where they store our data, GitHub and Resend integrations, a hosted trust page on a vault-it.co address). The plan's security and compliance budget is £37,500 of the £250,000 round, so the planning line fits with room for the pen test and a legal review.

**Park.** SOC 2 (only if US customers become a 12 month goal; about 80% of the evidence is shared with ISO 27001). DORA (applies to EU financial entities, matters only if we later supply them).

**What investors can rely on.** The trust page makes no claim the code cannot back. "Not certified" stays until a certificate exists.

## A6. Lane 4: FCA position and regulation

**Where Vault-It is now.** A budgeting and planning tool sold as a software subscription. It does not advise, arrange, broker or read bank data. It says "Not regulated by the FCA. Not financial advice." on every screen.

**The boundary, and the route if we cross it.**

| If Vault-It... | Likely regulated activity | Route and rough application cost |
|---|---|---|
| Stays a planning tool | None | £0 |
| Sells software to brokers or lenders (they use it, we do not advise) | Probably none, to be checked | £0 until a consultant confirms |
| Reads bank data itself | Account information service | Work through a regulated aggregator (plan), or register: Category 3, £1,130 |
| Passes users to brokers for a fee or commission | May be arranging or credit broking | Introducer Appointed Representative under an authorised firm first (vendors quote weeks), or direct authorisation, Category 4, £2,820 |
| Advises on or arranges mortgages itself | Mortgage advising and arranging | Direct authorisation, Category 4, £2,820, plus consultant, indemnity insurance, capital and conduct rules |

**Cost and time lines.** FCA application fees come from the FCA page (updated 3 Nov 2026). Annual fees were not retrieved. A consultant to prepare an application is quoted in the low five figures (unverified). The FCA has up to 6 months for a complete application; consultancies say 6 to 15 months in practice. The appointed representative route is quoted at weeks, not months. **Get fixed quotes from three consultants before any date is promised.**

**Gates.**
- Before any referral income: legal view on whether it is "arranging", an AR arrangement signed.
- Before any bank sync: penetration test done, aggregator contract in place.
- Before any paid social: Meta and TikTok financial-services ad rules confirmed (Meta requires an FCA firm number from UK financial-services advertisers, since 2022).
- Every claim stays about time saved and readiness, never about borrowing more. The "25% more into affordability" idea has no evidence behind it and stays out of everything until it does.

**Broker readiness pack (hypothesis, not a promise).** A tidy, user-entered pack a buyer can hand to a broker: income, commitments, deposit, target price. Always labelled "user-entered, not verified". A pilot with two or three brokers would measure minutes saved on the first fact-find and chasers per case. None is measured yet.

**Decisions this lane waits for.** Whether the aim is a tool for brokers, a tool for buyers that brokers use, or becoming a broker. The answer sets the SEIS, FCA and trust priorities (see Part B).

## A7. Lane 5: SEIS and the raise

**The round.** £250,000 under SEIS, closing March 2027, equity terms on request. About 18 months at roughly £13,900 a month.

| Use of funds | Share | Amount |
|---|---|---|
| R&D and product, including a technical cofounder | 35% | £87,500 |
| Marketing | 20% | £50,000 |
| Partnerships and B2B sales | 15% | £37,500 |
| Security and compliance: Cyber Essentials Plus, pen test, legal review, ISO 27001 when a partner asks | 15% | £37,500 |
| Contingency | 15% | £37,500 |

**The bridge first (£20,000, non-dilutive).** Founding Member pre-sale (100 places at £149: £8,940 base, £14,900 at the cap), plus a Start Up Loan or grant to make up the gap. It pays for incorporation, IP assignment, trade mark, ICO, accountant and an independent security review.

**SEIS tests (gov.uk, updated 6 April 2026).** Raised under SEIS in its lifetime at most £250,000. Less than 3 years old. No more than £350,000 gross assets. Fewer than 25 employees. Not controlled by another company. Not listed. A qualifying trade: more than 20% of the trade in an excluded area (including legal or financial services, banking, insurance, debt or financing) can disqualify it. HMRC charges nothing; solicitor and accountant fees are unquoted, so get two quotes.

**Order of steps.**
1. Settle the company name and incorporate Vault It Ltd (Pete sole director and shareholder). Incorporation is pending.
2. Assign the code, 3D engine, brand and domains to it by deed. Check the trade mark clearance first (see Part B).
3. Apply to HMRC for advance assurance with the business plan, share structure and cap table. It covers only some conditions and is not an endorsement.
4. Close the £20,000 bridge.
5. Raise, issue shares, then SEIS1 to HMRC, then SEIS3 certificates to investors.

**Protect the SEIS status.** No holding company above Vault It Ltd. Any de minimis grant in the previous three years counts against the £250,000. The broker and referral route could look like an excluded financial services trade, so it waits for advice before anyone designs the business around it.

**Equity wording.** Do not write "invest in Vault-It" on any public page. Pitch material says the raise is a target and not an offer, and a solicitor reviews how it is sent.

## A8. Lane 6: partners and B2B

| Offer | Buyer | Price guide (plan) |
|---|---|---|
| Paid pilot | Building society, broker | £2,500 to £5,000 for 90 days, one clear success measure |
| Partner Edition (white label) | Lenders, banks | £10,000 to £25,000 set-up, then £1 to £3 per active user per month |
| Impact licence | Debt charities | Free or at cost, for reach and credibility |
| Sponsored Free tier | Brands, lenders | They pay to unlock Pioneer for their customers |

**What unlocks the first institution.** The same pack in lane 3: trust centre, penetration test summary, DPIA summary, MSA, and later Cyber Essentials Plus or ISO 27001. Start the conversations from Web Summit and Business Lincolnshire contacts. Mortgage referral income is a later stream, and only with an authorised firm (lane 4).

## A9. Gates in one table

| Gate | Must be true | Lanes |
|---|---|---|
| **1. Public accounts and payments** | Independent security review done; trust centre v1 live; incident 001 closed; ICO fee checked; secrets out of client code; backups; error monitoring; tests on the date calculation | 3, product |
| **2. Round closes** | Vault It Ltd incorporated; IP assigned; HMRC advance assurance in hand; no holding company above | 5 |
| **3. First institution asks** | Pen test summary, DPIA, MSA draft with a solicitor, supplier register, Cyber Essentials | 3, 6 |
| **4. Phase 1 complete** | At least one paid pilot; 3 months of retention data; week-4 retention at 30% or more; 1,000 paying users; first Partner Edition | all |
| **5. Before bank sync or referrals** | FCA route chosen and in writing; pen test; aggregator contract or AR agreement | 4 |
| **6. Seed** | £500,000 annual recurring revenue; three paying institutions | all |

## A10. What this costs, in one place

| Item | Planning line | Source and caveat |
|---|---|---|
| SEIS advance assurance | HMRC nothing; solicitor and accountant unquoted | SEIS research. Get two quotes |
| Incorporation, IP deed, trade mark, ICO, accountant, hosting | Inside the £20,000 bridge (£4,500) | Plan v2 |
| Security review before public launch | Inside the bridge (£3,500) | Plan v2 |
| Vanta (one framework) | up to about £8,000 a year | Salesperson's email, not a quote |
| ISO 27001 certification audit | about £4,000 first year, about half in each later year | Same email, not a quote |
| Penetration test | Unquoted | Get a CREST quote, scope in writing |
| FCA direct application (Category 4) | £2,820 plus consultant, insurance, capital | FCA page and unverified consultant lines |
| FCA account information registration (Category 3) | £1,130 | FCA page |
| Appointed representative | No FCA application fee for the AR; principal's fees unknown | Vendor pages, rough |
| Security and compliance budget in the round | £37,500 | Plan v2 |

## A11. Risks, said plainly

- **One founder builds, sells and supports.** Answer: the round funds a technical cofounder and a part-time contractor first, and releases keep a human gate.
- **Traction is early.** Four friendly testers and no paying users. The plan's first gates are about paying and retention, not downloads.
- **People in debt may not pay.** Answer: institutions pay for reach; a 30-day trial with no card removes surprise charges.
- **Name and trade mark.** A live UK word mark VAULTIT is held by a Swedish company (classes 9, 35, 38, 42, 45). The owner decided on 6 Nov to keep the name; an attorney clearance check is still advised before filing.
- **Regulatory creep.** Referrals, bank data and recommendations each cross a line. Each has a gate in A9.
- **Security claims.** Nothing public says "secure" or "certified". The trust page matches the code, and a test guards the outside-host list.

---

# Part B: before you send this (Pete only)

These are conflicts and open points I found between the files. Each needs your word, or an adviser's.

1. **Household price clash.** You decided £19.99 a month or £199.99 a year, up to 8 people (7 Nov, `docs/OFFER_AND_PRICING.md`). Business plan v2 shows £9.99 a month or £79.99 a year, with a joint journey for two. Which one goes to investors? The deck already shows £19.99 and £199.99.
2. **Holding company versus SEIS.** Plan v2 says Vault It Ltd must not sit under a holding company or SEIS relief fails. The queue (10 Nov) has an open item to name a parent or holding company so you can build other products in a similar style. Ask the accountant before choosing a structure. If a holding company ever sits above Vault It Ltd, the SEIS round is at risk.
3. **ISO 27001 timing.** Plan v2 says "ISO 27001 when a partner asks". The trust centre plan has Vanta pointing at the December pitch and an audit-ready estimate of around March 2027. Which do you want to promise? My suggestion: promise the trust page and the penetration test, and say ISO is "building towards, partner-led".
4. **Pen test timing.** Plan v2 puts the penetration test at Phase 2 (before bank sync) and an independent security review at public launch (Gate 1). Are the review and the CREST test the same thing for Gate 1?
5. **Which route: tool, partner tool or broker?** The broker idea and SEIS pull against each other. If Vault-It ever brokers mortgages, a financial services trade could cost SEIS. Pick the order: SEIS first, then the AR route for referral income is the safer reading, but ask a SEIS-experienced adviser.
6. **Name and company.** Incorporation is still pending. The MSA, DPIA sign-off, ISO scope, SEIS and any FCA application all need the legal name. Also ask the attorney to clear VAULTIT before the filing.
7. **Scope for ISO.** The Vault-It app only, or PT Live Design as a whole? I suggest the app only.
8. **Independent reviewer.** Someone who is not a family member for the internal audit.
9. **Sending to investors.** Selling shares is a regulated activity. Ask a solicitor how the deck, this roadmap and any email to an investor should be worded and who may receive them before sending. Your own deck wording ("a target, not an offer") already points the right way.
10. **Things I could not check from here.** CI on the two v0.95 branches is red (one infrastructure failure, one real test failure). The Vanta items are statements from a salesperson. FCA annual fees were not retrieved.
11. **Open from the plan.** What each named adviser agreed to be named as; the Future London Academy detail; "free while in beta" wording on the sign-up page; two plan clean-ups already queued.

## Sources

- `docs/plans/TRUST_CENTRE_ISO27001_PLAN.md`
- `docs/research/SEIS_FCA_BROKER_RESEARCH.md` (gov.uk, FCA fees page, vendor pages as listed there)
- `docs/OFFER_AND_PRICING.md`, `docs/research/family_personas.md`
- Vault-It Business Plan v2 (Claude Doc), sections 1, 4, 7, 10, 11
- `docs/QUEUE.md` on `brand-rollout`, CI runs 940 and 964
