# Trust centre and ISO 27001 roadmap

Owner ask, 11 Nov 2026: "Start planning a trust centre, to start building towards iso 27001", then "MSA DPI Penetration test". Plan only. Nothing is built or published yet.

Read as: MSA = master services agreement (the B2B contract partners will want), DPI = DPIA (data protection impact assessment). Owner to confirm the MSA reading.

## The aim in one line

A public trust page that says only what is true today, backed by evidence we can show, and a clear path to an ISO 27001 certificate when a partner or investor asks for one.

## Rules this plan keeps

- The page never claims "certified", "compliant" or "secure". Allowed wording while we build: "We are building towards ISO 27001. We are not certified."
- Every statement on the page must match what the code and the settings really do (owner's standing rule). Where a test can enforce it, add one, as `tests/test_beta_client.js` does for outside hosts.
- No invented badges, logos, testimonials or numbers. No prices or timings are quoted here without a written quote.
- Not regulated by the FCA, not financial advice: stays visible.
- British English, no em dashes.

## What ISO 27001 is, plainly

- A management system for information security (an ISMS): scope, risk assessment, risk treatment, policies, a Statement of Applicability against the Annex A controls, internal audit, management review, and continual improvement.
- Certified by an accredited certification body (look for UKAS accreditation) in two stages. It is not self-declared.
- It is the standard B2B buyers, lenders and brokers ask for. It is not required to launch to consumers.

## Where we are today (from the repo and the runbook)

Already true and evidenced:
- Data held in Supabase, Frankfurt (eu-central-1), Pro plan with daily backups.
- Sign-in by e-mail code and PIN. The PIN pepper lives only in Supabase secrets. Keys are never committed.
- Rate limiting on sign-in (migration 008) and security hardening (migration 007).
- Users can download and delete their own data in Settings. `erase_user_data` exists for requests made outside the app.
- Housekeeping clears saved versions older than 180 days.
- Privacy notice and beta terms are in the app.
- A test fails if the app talks to an outside host the privacy notice does not name.
- CI runs the full suite on every push. Production moves only by the owner, from the laptop, after green CI, phone sign-off and a backup branch.
- A 72 hour ICO breach rule is written in the beta runbook.

Open or missing:
- No written policies, risk register, asset inventory or Statement of Applicability.
- ICO registration (data protection fee) not yet checked for PT Live Design.
- Privacy notice and terms not yet reviewed by a solicitor. Legal entity name and postal address not final.
- Auth log and Resend log retention not yet set to the minimum.
- No supplier register or signed data processing terms on file for each supplier.
- No independent penetration test.
- No DPIA.
- No MSA.
- The tester sample-data leak is not yet written up as an incident (3 tester rows still to delete).
- One person runs everything, so separation of duties and independent internal audit need an outside helper.

## Workstreams

### 1. Trust centre page (public)
Build as a static page in the existing site build (`tools/build_site.js`, served by the Worker), for example `vault-it.co/trust` first, `trust.vault-it.co` later if a tool hosts it.
Version 1 content, all of it already true:
- What we hold and why, and what we never hold (no bank logins, no card numbers: Stripe hosts payment).
- Where it lives (Frankfurt) and the supplier list: Supabase, Cloudflare, Stripe, Resend, Anthropic (portfolio vision), plus any others the privacy notice names.
- How sign-in works, in plain words, matching the code.
- Your rights: download, delete, contact.
- What happens if something goes wrong: the 72 hour ICO rule and how we tell users.
- How to report a vulnerability: a `security.txt` and a monitored address.
- "Building towards ISO 27001. Not certified." with the date last reviewed.
Later versions add: policy summaries, a downloadable security overview PDF, the pen test summary, the DPIA summary, a request-the-report form (NDA gated) and a status link.
Going through `ship-item` applies: intent card, failing test first, element shots at 390 and 1100 px Night and Daylight, then rollout-qc.

### 2. Penetration test
- Scope: app.vault-it.co, the edge functions (`pin-auth`, `send-auth-email`, `waitlist-join`, `portfolio-vision`, `stock-quotes`, `house-3d`), Supabase row level security, the Worker.
- Hire a CREST accredited tester. Ask for a letter of authorisation, rules of engagement, a test on a copy or a quiet window, and a retest included.
- Do first: fix the known tester-row leak and the log retention settings, so the report starts clean.
- Output: report, our fix log, and a short summary we may publish. Never publish the full report.
- Needs the owner's yes before any test touches production, and Supabase and Cloudflare terms checked first.

### 3. DPIA
- A UK GDPR data protection impact assessment for the money data we sync. It is likely needed because the data is financial and personal, and users are consumers.
- Contents: what is processed and why, lawful basis, necessity and proportionality, risks to users, controls, residual risk, sign-off.
- Cover the AI step: what is sent to Anthropic for portfolio vision, and what is not.
- Link it to the privacy notice and keep it in the trust centre evidence list. Review at each major change. A solicitor or data protection adviser should check it.

### 4. MSA (master services agreement)
- The standard contract for B2B and white-label partners, with order forms underneath.
- Needs, in order: the legal entity name, then the term sheet from the commercial plan, then a solicitor.
- Schedules to prepare: data processing terms (controller and processor roles to be settled per deal), a security schedule that points at the trust centre and promises nothing we cannot evidence, service levels we can actually meet, IP and engine licence terms (the engine IP questions are already listed for a solicitor), liability cap and insurance.
- Do not send any partner a draft until a solicitor has seen it. The mutual NDA with Greenborough is the first live example.

### 5. ISMS foundations (the ISO 27001 core)
1. Scope statement: start with the Vault-It app and its suppliers only.
2. Roles: owner as top management and information security lead, plus a named outside reviewer for independence.
3. Asset and supplier register: code, Supabase, Cloudflare, Stripe, Resend, Anthropic, GitHub, domains, laptops and phones.
4. Risk method and risk register, then a treatment plan.
5. Policies, short and real: information security, access control, acceptable use, supplier management, incident response, backup and recovery, change management and secure development, data retention and deletion, business continuity, remote working and devices.
6. Statement of Applicability against Annex A (2022, 93 controls in four themes). Mark each as applied, not applicable, or planned, with evidence.
7. Evidence habit: MFA on every admin account, quarterly access review, a backup restore test, a CI and release record (already strong), a secrets inventory with rotation notes, staff awareness for the owner and any helpers.
8. Internal audit, then management review, then Stage 1 and Stage 2 with a UKAS accredited certification body.

### 6. Cyber Essentials (optional stepping stone)
A UK scheme with a lighter, cheaper assessment. Useful as a first badge and as evidence for partners. Check it suits a one-person company on the laptop and phone setup before committing.

### 7. Tooling
Options: a compliance platform (Vanta, below), another platform, or a spreadsheet plus the repo. At our size the policies and risk work is the same either way. A platform saves evidence chasing and gives a hosted trust page.

What Vanta (Cian Whyte, account executive) told us by email on 11 Nov 2026, after the call. These are a salesperson's statements, not a quote or a contract. Check each in writing before relying on it:
- **FCA is separate.** Vanta does not help with FCA authorisation. That is an application to the regulator, handled by compliance consultants or law firms, with its own budget. ISO 27001 covers information security only. Keep the two apart in every pitch.
- **SOC 2:** park it unless US customers are a goal in the next 12 months. About 80% of the evidence is shared with ISO 27001, so it can follow.
- **DORA:** applies to EU financial entities, not to a UK company. It matters only if we later supply EU financial institutions and they pass terms down. No budget.
- **Stack:** Supabase, Cloudflare, Stripe and Sentry are supported integrations. Google Workspace likely scopes out because nothing customer facing lives there. That is decided at a scoping session, not assumed. GitHub and Resend were not mentioned; ask.
- **Effort and timing:** about 60 to 75 hours with our stack (300 to 400 hours done by hand). At 2 to 3 hours a week from a start now, audit ready around March 2027. A live trust centre within a week of starting.
- **Implementation support:** 30 days with their partner Workstreet at no cost. Week 1 integrations, week 2 policies and trust centre, week 3 gap analysis, week 4 the internal audit ISO requires, done by someone independent of us. Workstreet also runs a grey box CREST penetration test.
- **Price quoted in the email:** $10,500 a year (about £8,000) list for one framework, described as a ceiling with room to negotiate. The certification audit is separate and paid direct to the certification body: about £4,000 for initial certification and about half that for each surveillance audit in years two and three. They take no commission on the audit. Not a written quote.
- **Letter of engagement:** offered once we are a customer, and Cian can ask an auditor to give one too. Not available before buying.

Open questions for Vanta, in writing: a written quote with term and renewal terms; what the free 30 days includes and what happens after; whether the pen test is inside or on top of the price; where Vanta and Workstreet store our data and their own data processing terms; GitHub and Resend integrations; whether a hosted trust page can sit on a vault-it.co address.

Do not quote any of these prices or dates on the trust page or to investors as fact until a written quote is in hand. The email gives us a safe planning line (up to about £8,000 a year plus about £4,000 for the audit) and nothing more.

## Suggested order

| Step | What | Depends on |
|---|---|---|
| 0 | Owner decisions below | none |
| 1 | Close the leak: delete the 3 tester rows, write it up as incident 001 | owner's SQL yes |
| 2 | ICO fee check, log retention minimum, supplier list and data processing terms on file | none |
| 3 | Trust centre v1 page | 2 |
| 4 | Pen test booked, scope agreed | 1, owner's yes |
| 5 | DPIA drafted, then reviewed | 2 |
| 6 | Policies, risk register, asset list, SoA draft | 2 |
| 7 | MSA drafted and sent to a solicitor | entity name |
| 8 | Evidence habit running for a full cycle, internal audit | 6 |
| 9 | Stage 1 and Stage 2 audit booked | 4, 5, 6, 8 |

Rough elapsed time for a small team is months, not weeks. Get a certification body quote before promising anyone a date.

## Decisions for the owner

1. Confirm MSA means master services agreement.
2. Legal entity and trading name (PT Live Design now; Voxel Foundry was David's recommendation for the product design company). It must be settled before the MSA, the DPIA sign-off and the certificate scope.
3. Scope for ISO 27001: the Vault-It app only, or PT Live Design as a whole.
4. Tooling: Vanta (ask for a written quote first) or a spreadsheet plus the repo.
5. Pen test budget ceiling and the window for testing production. Vanta's partner offers a grey box CREST test; get the price and scope in writing before accepting.
6. Who is the independent reviewer (an adviser, not a family member) for internal audit.
7. Is the first trust page in the beta window or after launch. The December pitch is the date Vanta pointed at.
8. FCA route: separate from this plan. Who advises on it, and when.

## Not covered here

Insurance, FCA perimeter advice, and the engine IP questions have their own items and solicitor questions. This plan links to them only.
