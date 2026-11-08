# Entrepreneur mode: research and recommendations

Owner's ask, 8 Nov 2026: make Entrepreneur mode very useful for business owners and founders with several income streams that change month to month, and for contracts. Show each contract as a 3D card like the achievement cards, which opens to the uploaded contract or a short brief (time commitment, deliverables, income, expenses). Build a better client management system, branded to Vault-It's 3D selling point. Add a Your Team tab with profile cards for employees, contractors, consultants, companies, vendors and suppliers.

Research only. No app code was changed. Figures from outside sources are marked with their source and must be checked again before they go into the app.

---

## 1. In short

1. **Income goes from "MRR" to "what landed each month".** Today every stream and client is one fixed £ a month figure. Founders' income isn't like that. Record what each stream actually paid, month by month, and show the spread. From that, work out a **safe monthly wage**: the amount you could pay yourself every month based on your worst recent months.
2. **Contracts become 3D cards.** Reuse the 3D credit card build (real card proportions, brand colours, a photo on the front, the cut that shows the paid share). A contract card fills with gold as it gets paid, which mirrors a debt card being cut down. Tap it to flip: the brief on the back, and the uploaded contract one tap further.
3. **Clients become the bricks holding the income up.** Show clients as bricks in a wall, sized by their share of the last 12 months' income, so the house-builder look carries over. If one brick carries most of the wall, the app says so. That's the risk of relying on one client.
4. **Your Team is a deck of ID cards.** These use the same 3D card build. Each card shows the person or company, their role, what you pay them, and which contracts they work on. The team's monthly cost goes into the business picture.
5. **UK founder reminders, as information only.** A tax pot set aside from each payment, the payments on account dates, a rolling VAT threshold meter, the Making Tax Digital income line, statutory late-payment interest on overdue invoices, and an IR35 status note on contractor deals. Every figure is labelled as an estimate. No advice.

---

## 2. Who this is for and what hurts

- About 4.38 million people in the UK are self-employed (ONS, Q4 2025). The IFS says official data has overcounted them for two decades, so treat that number as an upper bound.
- In a 2024 Markel Direct survey, 51% of self-employed people named **irregular income** as their top challenge.
- One summary of 2025 and 2026 surveys says about 4 in 10 UK adults have some side income. The original surveys couldn't be traced, so this isn't safe for marketing copy.
- **Making Tax Digital for Income Tax** started on 6 April 2026 for sole traders and landlords with gross income over £50,000. The line drops to £30,000 from April 2027 and £20,000 from April 2028. HMRC expects more than 860,000 people in the first wave. These people now keep digital records and send quarterly updates, and the threshold counts gross income, not profit.

What this means for Vault-It: the hard part for these users isn't recording income. It's knowing what they can safely spend, save and put towards a deposit when the income won't hold still. That fits the app's own purpose ("Get out of the red and into your home"). The house deposit needs a steady monthly figure, and a founder doesn't have one until we work one out for them.

---

## 3. What the Entrepreneur tab does today

Checked on `brand-rollout` (75e6cdd), `index.html` from the `ENTREPRENEUR` marker.

| Part | What it holds | Gap |
|---|---|---|
| Income Stream Builder | name, type (passive, active or freelance, portfolio), target £ a month, status (idea, building, active) | only a target, no record of what was actually paid; no months |
| KPIs | MRR, active clients, pipeline value, monthly goal | MRR assumes income is fixed and recurring |
| Leads | name, email, phone, website, stage (cold, warm, hot), estimated £ a month, notes; a button to convert to a client | no next step, no dates, no proposal |
| Active clients | name, £ a month, status (Active, Paused, Prospect), contacts, notes | no contracts, no invoices, no history, no link to income |
| Storage | `bizState` = `{clients, leads, streams}` in localStorage, synced | holds no files and no people besides clients |

Who sees it today (from `docs/MONETISATION_DECISION.md`): only in the Advanced view and on a paid plan. Read-only accounts still see it.

3D pieces already built that can be reused:
- **3D credit cards** (`3D CREDIT CARDS` in `index.html`): CSS 3D, real ID-1 card proportions, issuer colours and logo, the user's own photo on the front, and the "cut" that greys out the paid share. These are light on phones.
- **Holographic Pioneer card** (`.pioneer-card`, the `holo-*` animations): foil and sheen effects.
- **Wealth inventory**: photos stored on the device in IndexedDB (`vi_photos`) with a small thumbnail synced, a three.js item viewer, and a photo turntable.
- **House builder brick kit** (`src/hb3d/kit.js`): the brand brick, falling into place course by course.

---

## 4. Income that moves

### What to record
Each stream keeps its target and gets a **ledger of payments**: date, amount, which contract or client (if any), and a note. A payment can be entered by hand or logged straight from a contract card's "Mark paid".

### What to show
- **Month strip:** the last 12 months as bars, stacked by stream. Good months, lean months and the gaps are visible at a glance. This replaces the single MRR figure. Keep "Recurring" as one stream type; it stops being the headline.
- **Spread:** the lowest month, the typical month (median) and the best month over the last 12. Use the median, not the mean, so one big invoice doesn't skew it.
- **Safe monthly wage (estimate).** Freelance budgeting guides agree on one method: all income lands in a holding pot, you pay yourself a fixed wage from it, and good months refill the pot. One guide sizes the wage from the lowest-earning month. Another keeps a pot of two to three months' wage. Vault-It can show:
  - the safe wage = the lowest month of the last 6 or 12, after the tax pot and business costs
  - the buffer target = 3 × safe wage (the user can change it), and how full the buffer is now
  - this safe wage, not the average, is the figure that goes into the budget and the deposit timeline
- **Tax pot (estimate):** a percentage of each payment set aside. The user picks the percentage; the app doesn't guess one. The app shows the pot growing and the next HMRC dates.

### UK dates and lines to show as reminders (information only)
- **Payments on account:** 31 January and 31 July, each half of last year's bill. They apply when last year's Self Assessment bill was £1,000 or more and less than 80% of the tax was collected at source (for example through PAYE). You can apply to reduce them (form SA303), but interest is charged if the reduction turns out too low. Show the dates and the user's own figures; don't calculate their tax.
- **Making Tax Digital:** if the user's gross self-employment and property income is near £50,000 (£30,000 from April 2027), show a note: "You may need software that works with Making Tax Digital. Vault-It is not that software." Vault-It must never claim to be MTD software.
- **VAT threshold:** £90,000 of taxable turnover in **any rolling 12 months** (unchanged since April 2024). A meter of the last 12 months' income against £90,000, with a note when it passes about 80%. This is easy to miss because it's rolling, not by tax year.

Every one of these needs the tag "Estimate. Check with HMRC or an accountant." plus the standing line "Not regulated by the FCA. Not financial advice." These figures change: keep them in one table in the code with a "last checked" date, as the stamp duty tables already do.

---

## 5. Contracts as 3D cards

### The card
Build it on the same base as the 3D credit cards (`cc3dHTML`): same proportions, same tilt and shine, same respect for `prefers-reduced-motion`.

- **Front:** client logo or initial (the logo route the bank tiles already use, which the privacy notice already names), contract name, contract value, start and end date, and a status chip.
- **Fill instead of cut:** on a debt card the paid share is cut away. On a contract card the **paid share fills with gold** from left to right, and the **invoiced but unpaid** share shows as a dashed outline. One look tells you how much of the deal is in the bank.
- **States:** Draft, Signed, Live, Delivered, Paid, Overdue, Ended. Overdue gets the red edge. Paid in full gets the achievement treatment (the holo foil from the Pioneer card), which makes the "achievement card" link the owner asked for. Brass stays reserved for achievements (owner's rule, `08838b5`).
- **Deck view:** the cards fan out in a row on desktop and become a swipeable stack at 390 px, sorted by next payment due.

### Tap to open (the brief)
The card flips to show the back, the brief the user typed:

| Field | Notes |
|---|---|
| Client | links to the client brick |
| Type | fixed fee, retainer (monthly), day rate, hourly, milestone, revenue share |
| Value | total, or rate × expected units |
| Payment schedule | milestones with amount and due date; each one has "Mark invoiced" and "Mark paid", and a paid milestone logs a payment on the stream |
| Payment terms | days to pay (for example 30); the overdue date comes from this |
| Time commitment | hours a week or days a month, start and end; gives an effective £ an hour |
| Deliverables | a checklist; ticking them off shows progress |
| Expenses for this contract | costs, subcontractors (link to Team cards), materials; gives **profit on the contract** |
| IR35 status (contractor deals) | Outside, Inside, Not sure, Not applicable. A note only, with a link to HMRC's CEST tool. From 6 April 2026 a client company counts as "small" if it meets two of: turnover up to £15m, balance sheet up to £7.5m, 50 or fewer staff. For a small client, the contractor's own company decides the status. |
| Renewal | end date and a reminder 30, 60 or 90 days before |
| Files | the uploaded contract (see below) |

### Overdue invoices
For business-to-business debts, the Late Payment of Commercial Debts (Interest) Act 1998 allows **statutory interest of 8% above the Bank of England base rate**, plus fixed compensation for each invoice: £40 under £1,000, £70 from £1,000 to £9,999.99, £100 at £10,000 or more. When a milestone goes overdue, the card can show "Statutory interest so far: £x" with the base rate and the date it was last checked. This is a known UK right, so it's information, not advice. Never send anything to the client for the user.

### The uploaded contract
- **Where it lives:** on the device, in IndexedDB, the same way as `vi_photos`. It isn't synced. The brief and a small thumbnail are synced. A new device shows "Contract file is on your other device" with a button to upload it again. This keeps the privacy notice accurate and adds no storage cost.
- **Viewing:** PDFs and images open in the browser's own viewer from a local blob. No outside host.
- **Later, if wanted:** encrypt the file on the device before storing it (WebCrypto AES-GCM with a new IV per file). Keeping the key safe is the hard part, and an XSS bug could still read the file, so the notice must say "stored on this device" rather than "encrypted" unless that's built and tested.
- **Later, if wanted:** an AI reader that fills in the brief from the contract, like the portfolio screenshot reader. It needs a new edge function, an Anthropic line in the privacy notice for contracts, a monthly cap and the owner's yes. The brand rules for this branch rule out Supabase changes, so this is its own queue item.

---

## 6. Client management, Vault-It style

What the competitors do (US-led tools, prices from 2026 comparison blogs, several written by rivals):

| Tool | Strong at | Price (USD a month, roughly) |
|---|---|---|
| HoneyBook | polished client experience, proposals, payments | 29 to 36 |
| Dubsado | custom workflows; steep to learn | 28 to 35 |
| Bonsai | lawyer-checked contract templates, invoices, tax add-on | 9 to 25 |
| Moxie | everything in one place, expense tracking, cheap | 10 to 12 |
| FreeAgent (UK) | accounting, tax timeline, MTD; free with NatWest, RBS, Mettle | about £19, or free |
| Coconut, Countingup, Tide (UK) | bank-linked bookkeeping, tax estimates, invoices | £0 to £17 |

None of them **shows** the business. None ties it to a personal goal like a home. That gap is Vault-It's angle: it shouldn't try to be a CRM or accounting package; it should be the place where a founder sees the business and the house together.

### The client wall
- Each active client is a **brick in a wall**, using the brand brick from the house builder kit. Brick length = that client's share of the last 12 months' income.
- **Colour = payment health:** brand teal when they pay on time, amber when a payment is overdue, red when 30 days or more overdue. Faded "hologram" bricks = leads and proposals, the same language as the house builder's unbuilt courses.
- **Concentration warning:** if one client brought in over half of the last 12 months' income, the wall shows a crack line under that brick and the note "One client holds up most of your income." Make the line an owner setting, and test the wording with alpha users.
- **Tap a brick** for the client sheet: contacts, lifetime value, average days to pay, contracts (as mini cards), next action and notes.
- **Pipeline:** leads move Lead, Proposal sent, Agreed, Signed. "Signed" turns the lead into a client and creates a contract card in Draft. The current one-tap "Convert" stays as the quick route.
- **Next action:** each lead and client gets one next step and a date ("chase invoice 14 Nov"). The Overview shows the three due soonest. This is the one CRM habit that matters most for a solo founder.

### Making it 3D without slowing phones
- Draw the wall with CSS 3D or a single small canvas, not a new three.js scene, for the first version. If a three.js wall comes later, it must share the house builder's renderer setup and pass `stress-doctor` at 390 px with CPU throttled 4x.
- When `prefers-reduced-motion` is set, show the finished wall with no bricks dropping in.

---

## 7. Your Team tab

### Cards
Same 3D card base (ID-1 proportions, like a staff pass). Card types each get their own colour band and icon from the brand set:

Employee · Contractor or freelancer · Consultant or adviser · Agency or company · Supplier or vendor · Other

| Field | Notes |
|---|---|
| Name, role, company | company name alone is fine for a supplier |
| Photo or logo | optional; stored on the device like wealth photos |
| Contact | email, phone, website (all optional) |
| What you pay them | amount and how often (monthly, per day, per hour, per job); goes into the business's monthly costs |
| Linked contracts | the contracts this person works on; their cost appears in those contracts' expenses |
| Start date, notice or renewal date | reminder before a renewal |
| Status | IR35 note for contractors, as on contracts |
| Notes | free text |

### What the tab shows
- **Team cost a month** and **team cost as a share of income** (from the income ledger). That gives a true monthly profit next to the safe wage.
- A **deck** at 390 px and a **grid** at 1100 px, filtered by type.

### Privacy (UK GDPR)
Team cards hold other people's personal data. Points from ICO-related sources (to check on ico.org.uk before building):
- Even "basic contact details" are personal data.
- A business usually relies on **contract** (staff, contractors) or **legitimate interests** (business contacts in their work role).
- The **user** is the one holding their team's details for their business. The app should keep the fields to the minimum, keep files on the device, and make deleting a card remove its photo too.
- The privacy notice needs a line saying Vault-It stores contacts that users add about their own clients and team, for that user only, and never contacts them. `tests/test_beta_client.js` must still pass, so no new outside hosts.
- Never offer to email or message team members from the app at this stage.

---

## 8. Guardrails

- **Not advice:** tax, VAT, IR35 and payments on account are reminders with the user's own figures, labelled as estimates. The app gives no "you should" lines about tax. "Not regulated by the FCA. Not financial advice." stays visible.
- **Not accounting software:** don't claim MTD, bookkeeping or invoicing. Vault-It shows the picture; the user's accountant or MTD software files.
- **No guessed figures:** tax pot percentage, buffer months and concentration line are set by the user, with neutral starting values the owner signs off.
- **Data:** no change to how deposits, prices, house types, levels or saved data work. New keys sit beside `bizState`, which grows with `contracts`, `payments` and `team` arrays. Old saves load unchanged.
- **Brand:** Syne, DM Sans and Share Tech Mono only; British English; sentence case; no em dashes; no sideways scroll at 390 px.

---

## 9. Suggested build order

Each phase is one queue item and goes through `ship-item` (failing test first, named tests, Night and Daylight shots at 390 and 1100 px, then `rollout-qc`).

| # | Phase | Why first | Size |
|---|---|---|---|
| 1 | **Income ledger, month strip, safe wage, tax pot** | it fixes the core problem and feeds the deposit timeline | medium |
| 2 | **Contract cards: data, brief, fill, states, deck** (no file upload yet) | the owner's headline idea; reuses the credit card build | large |
| 3 | **Contract files on the device** + privacy notice line | small once phase 2 exists | small |
| 4 | **Client wall and client sheet, pipeline, next actions** | needs contracts and the ledger for brick sizes | large |
| 5 | **Your Team cards, team cost, links to contracts** + privacy notice line | uses the same card base | medium |
| 6 | **UK reminders:** VAT meter, MTD line, payments on account dates, late-payment interest, IR35 note | needs the ledger; one table of figures with "last checked" dates | medium |
| later | AI contract reader; on-device encryption; a three.js client wall | each needs owner sign-off, and the AI reader needs Supabase work | n/a |

Tests to add per phase: money maths in a node test (safe wage, buffer, contract profit, statutory interest, rolling 12-month VAT sum) to the `fintech-engineering` standard (pence as integers, rounding at the end); a browser test that old `bizState` saves load unchanged; the sync test with the new keys; and the beta client test (no new hosts).

---

## 10. Decisions for the owner

1. **Plan:** does all of this stay in the paid, Advanced-view Entrepreneur tab, or does the safe wage reach every user who has variable income?
2. **Your Team:** its own tab in the menu, or a section inside Entrepreneur? (Recommendation: a section inside Entrepreneur, so the menu doesn't grow.)
3. **Contract files:** on the device only (recommended for now), or synced to the cloud later? Syncing adds storage cost and a privacy notice change.
4. **Starting values** for the tax pot percentage and the buffer (months), shown as editable.
5. **Concentration warning:** keep it, and at what share?

---

## Sources

- [ONS and IFS on self-employment numbers, via Statista and IFS](https://ifs.org.uk/publications/new-trends-self-employment-and-top-incomes)
- [Markel Direct: over half of the self-employed list irregular income as their top challenge (2024)](https://londonlovesbusiness.com/over-half-of-self-employed-list-irregular-income-as-their-top-challenge-in-2024)
- [Whito: UK self-employment statistics (side-income claim, unverified)](https://whito.co.uk/research/uk-self-employment-statistics/)
- [GOV.UK: Making Tax Digital](https://www.gov.uk/government/publications/making-tax-digital)
- [nibusinessinfo: prepare for Making Tax Digital for Income Tax](https://www.nibusinessinfo.co.uk/content/prepare-making-tax-digital-income-tax)
- [TinyTax: MTD for Income Tax, the April 2026 start date](https://tinytax.co.uk/guides/mtd-itsa-2026-start-date)
- [Xero: payments on account for Self Assessment](https://www.xero.com/uk/guides/payment-on-account-self-assessment/)
- [TinyTax: Self Assessment payments on account](https://tinytax.co.uk/guides/self-assessment-payments-on-account)
- [Avask: UK VAT threshold 2026](https://avask.com/blog/uk-vat-threshold-2026/)
- [Forvis Mazars: new IR35 off-payroll thresholds from 6 April 2026](https://www.forvismazars.com/uk/en/insights/corporate-tax-insights/new-ir35-off-payroll-thresholds)
- [Sprintlaw: statutory interest on late payments](https://sprintlaw.co.uk/articles/statutory-interest-on-late-payments-in-the-uk/)
- [Xero: late payment interest](https://www.xero.com/uk/guides/late-payment-interest/)
- [Get Holdings: Profit First for freelancers](https://getholdings.com/resources/blog/profit-first-for-freelancers)
- [WTOP: how to budget when your income is irregular (2026)](https://wtop.com/news/2026/07/how-to-budget-when-your-income-is-irregular-advice-from-the-experts/)
- [Agiled: HoneyBook vs Moxie (2026)](https://agiled.app/compare/honeybook-vs-moxie), [Dubsado vs HoneyBook](https://agiled.app/compare/dubsado-vs-honeybook), [Bonsai vs Moxie](https://agiled.app/compare/bonsai-vs-moxie)
- [Dupple: best CRM for freelancers 2026](https://dupple.com/learn/best-crm-for-freelancers)
- [Capterra: HoneyBook vs Bonsai](https://www.capterra.com/compare/162588-238825/HoneyBook-vs-Bonsai)
- [ANNA: FreeAgent review 2026](https://anna.money/blog/guides/freeagent-accounting-software-review/)
- [Tide: sole trader features](https://www.tide.co/sole-trader-features/)
- [ICO: data protection self-assessment checklist for sole traders](https://ico.org.uk/for-organisations/sme-web-hub/whats-new/news/new-data-protection-self-assessment-checklist-for-sole-traders)
- [DMA: ICO legitimate interests guidance](https://dma.org.uk/article/the-ico-have-published-their-long-awaited-legitimate-interest-guidance)
- [Classmethod: WebCrypto AES-GCM in the browser](https://dev.classmethod.jp/en/articles/webcrypto-aes-gcm-credential-encryption-browser/)
- [Couchbase Lite JavaScript: database encryption](https://docs.couchbase.com/couchbase-lite-javascript/current/encryption.html)
