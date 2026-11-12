# Mailing-list stack decision for vault-it.co/sign-up

Research date: **2026-10-27**. Every figure has its source URL and the date I retrieved it. Note on method: WebFetch could not reach these sites from this session (kit.com, resend.com, mailerlite.com, buttondown.com, loops.so and brevo.com are all outside the session's network allow-list), so I read pages through the Exa fetch and search tools on the same date. Some pricing pages set the price with a JavaScript slider that the fetch could not run. Where that happened I say so, and use the vendor's help pages or two independent price trackers that agree, marked **[secondary]**. Where I worked out a figure myself, it is marked **[computed]**. Prices are in USD unless the vendor publishes GBP. Taxes are excluded.

---

## 0. Summary

**Recommendation: Option A.** Supabase (Frankfurt) stays the system of record. A new edge function handles sign-ups, with Turnstile, rate limiting, a double opt-in (DOI) email sent through Resend, consent-evidence columns and one-click unsubscribe. Confirmed addresses are mirrored into **Resend Contacts** for the welcome Automation and Broadcasts. (This is effectively A+C on a vendor already in use.)

Why:
1. **It adds no new processor.** The privacy notice already names Supabase, Resend and Cloudflare/Turnstile. Only the *purposes* need widening. Kit, Brevo, MailerLite, Loops and Buttondown would each be a new company to name.
2. **It costs nothing until ~1,000 contacts**, and is the cheapest option with a welcome sequence at 5k and 10k.
3. **The repo already has the patterns:** Turnstile siteverify in `send-auth-email`, `rate_hit()` in migration 008, and Resend sending.
4. **The Kit account is empty:** 0 subscribers, 0 tags, 0 sequences, 0 broadcasts, and one default form with 0 subscribers. Moving away from it loses nothing.

Caveat on the "EU-hosted" story: **Resend stores all customer data in the US** (an EU sending region only changes where mail is sent from). So the honest claim is: *"Your sign-up record is held in the EU (Supabase, Frankfurt). Our email provider, Resend (US), gets your address to send the emails, under Standard Contractual Clauses and the UK Extension to the EU–US Data Privacy Framework."* If the owner wants every copy of the list stored in the EU, **Brevo** (France/Germany/Belgium) or **MailerLite** (Google Cloud, Netherlands) are the EU-stored alternatives. Either is a new processor for the notice.

**Two blockers to check before building:**
- **Migration 008 (`auth_rate` / `rate_hit`) is not in production's migration history.** `list_migrations` on project `legpubblzgknxdtvsant` (2026-10-27) shows 001, 002, 003, `user_pins_pin_login`, `vision_usage_screenshot_cap` and `007_security_hardening`, and no 008. It may have been run by hand in the SQL editor. Confirm with a read-only check of `pg_proc` before relying on it. Applying it needs the owner's explicit yes (CLAUDE.md).
- **The Supabase org is on the Free plan**, confirmed with `get_organization` on 2026-10-27. Supabase pauses Free projects "after 1 week of inactivity" (https://supabase.com/pricing, retrieved 2026-10-27). A paused project would break the sign-up page.

---

## 1. What exists in Kit today (read-only, via the Kit connector, 2026-10-27)

| Item | Result |
|---|---|
| Account | id 2932733, created **2026-10-05**, primary email = the owner's address, timezone set to America/New_York (worth changing to Europe/London if Kit is kept) |
| Plan | `plan_type: creator`, `interval: month`, `subscriber_limit: 1000`, `on_trial: false`, `trial_lapse_date: 2026-10-19`, `renews_at: null`, `cancels_at: null`. This reads as a **lapsed 14-day Creator trial with no paid renewal**. I can't see billing, so whether it has fallen back to the Free plan is **unverified**. |
| Sending address | Owner's Gmail, status **pending, not verified, DMARC not configured** |
| Domain | `unique-composer-6407.kit.com` (Kit subdomain, verified). No custom domain. |
| Forms | 1: "Newsletter site" (embed, id 10004100, created 2026-10-05), **0 subscribers** |
| Landing pages (v2 API) | none |
| Sequences | none |
| Tags | none |
| Segments | none |
| Custom fields | none |
| Broadcasts | none |
| Webhooks | none |
| Total subscribers | **0** (growth stats 2015-01-01 → 2026-10-27: 0 new, 0 cancellations, 0 subscribers) |

**Conclusion:** there is no Kit list. The account is a default shell created on 2026-10-05, probably while trying the connector. Nothing needs migrating out of it. I made no write calls and read no subscriber records.

## 2. What exists in Supabase / the repo today

- Table `public.waitlist (id, email, source DEFAULT 'landing', created_at)`, with `UNIQUE(email)` (case-sensitive, so `A@x.com` and `a@x.com` are two rows). RLS policy `public_insert` lets **anyone with the public key insert any row**, and `waitlist_count()` is SECURITY DEFINER and granted to `anon` (`supabase/migrations/002_waitlist.sql`, `003`, `007`).
- `landing.html` line 933 calls `supa.from('waitlist').insert([{email}])` straight from the browser. There is no consent checkbox, no Turnstile and no confirmation.
- Migration 008 holds `auth_rate` and `rate_hit(p_key, p_limit, p_window_secs)` (service_role only), plus the deletion helper that already removes `waitlist` rows by email. `send-auth-email` already does Turnstile siteverify with a hostname allow-list. **008 is not recorded in production** (see §0).
- The privacy notice (`index.html` → `showPrivacy()`, dated 25 October 2026) says:
  - "Waitlist — if you joined from our website, your email address, to send your Pioneer invite."
  - "We do not send marketing unless you opt in."
  - Resend "delivers your sign-in emails".
  - Turnstile runs "when you ask for a sign-in code".
  - "Some of these companies are in the United States… approved contract terms."
- Supabase project: region **eu-central-1**, status ACTIVE_HEALTHY, org plan **free** (connector, 2026-10-27).

---

## 3. Legal frame (UK) that drives the design

| Rule | Source (retrieved 2026-10-27) |
|---|---|
| Unsolicited email marketing to individuals needs **consent or the soft opt-in**. Consent must be freely given, specific (name the sender and say it is email), informed, and given by a clear affirmative action, with no pre-ticked boxes. "Keep a record of the consent (eg who, when, how)". | https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/how-do-we-comply-with-the-pecr-electronic-mail-marketing-rules/ |
| The products-and-services soft opt-in only applies where you got the details "while selling or negotiating to sell", and "does not apply to prospective customers or new contacts". So an ad-driven waitlist sign-up should rely on **consent**. | same page; https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/ |
| UK GDPR consent checklist: "Keep evidence of consent – who, when, how, and what you told people"; make withdrawal easy. | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/consent/ |
| Every message must identify the sender and give a valid opt-out address. | ICO PECR email pages above |
| PECR fines are now up to **£17.5 million or 4% of global turnover**. The DUAA provisions commenced **5 February 2026**. | https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/02/statement-on-the-commencement-of-the-data-use-and-access-act-duaa/ ; https://www.legislation.gov.uk/uksi/2026/82/note/made |
| Double opt-in is **not legally required** by GDPR, but vendors recommend it as proof of consent and protection against sign-ups made with someone else's address. | MailerLite help (https://www.mailerlite.com/help/how-to-use-double-opt-in-when-collecting-subscribers), Brevo help (https://help.brevo.com/hc/en-us/articles/208733449), both retrieved 2026-10-27 |
| Bulk senders to Gmail/Yahoo need RFC 8058 one-click unsubscribe (`List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click`), and unsubscribes must take effect within 48 h. Resend says this applies to "those sending more than 5,000 messages per day". | https://www.resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails |

---

## 4. Prices at 0 / 1,000 / 5,000 / 10,000 subscribers

Monthly billing unless noted. "Sequence" means the plan can run an automated welcome series.

| Option | 0 | 1,000 | 5,000 | 10,000 | Notes and sources |
|---|---|---|---|---|---|
| **A. Supabase + Turnstile + Resend** | $0 | $0 (Resend Marketing Free covers 1,000 contacts). But see the 100/day cap → realistically **$20** (Resend Transactional Pro) during ad bursts | **$40** Marketing + $20 Transactional Pro = **$60** [computed] | **$80** + $20 = **$100** [computed] | Resend: Transactional Free 3,000/mo and **100/day**; Pro $20 for 50,000/mo with no daily limit. Marketing Free 1,000 contacts; Pro marketing **$40 @ 5,000**, **$80 @ 10,000**; "not limited by the number of emails sent". 10,000 Automation runs/mo included. Monthly billing only, no annual discount. https://resend.com/pricing (2026-10-27). Turnstile: **Free, unlimited challenges, up to 20 widgets** (https://developers.cloudflare.com/turnstile/plans/, 2026-10-27). Supabase Free $0: 500 MB DB, 500,000 edge-function invocations, **pauses after 1 week of inactivity**; Pro **from $25/mo**, never pauses (https://supabase.com/pricing, 2026-10-27). Adding Supabase Pro would put A at $25 / $45 / $85 / $125. **Gap:** whether the Resend Marketing and Transactional plans are separate subscriptions that add together. The pricing page lists them as separate tables, so I assume they add. Not confirmed. |
| **B. Kit** | $0 (Free plan, no sequences) | Free $0 (no sequences) / **Creator $39** ($390/yr) | Creator **$89** [secondary] | Creator **$139** [secondary] | Free plan: "up to 10,000 email subscribers", unlimited forms and broadcasts, API access; **Visual automations and Email sequences need a paid plan** (https://help.kit.com/en/articles/16627071-the-kit-free-plan, 2026-10-27). Creator "$39 / month" up to 1,000 (https://help.kit.com/en/articles/4494683-creator-vs-pro-choose-the-right-plan, 2026-10-27). kit.com/pricing (partner-link render, 2026-10-27) shows Creator "$33/mo, $390 billed yearly" at 1,000, which is the yearly figure. The 5k/10k slider prices could not be read from the official page. Two trackers agree on $89 @ 5k and $139 @ 10k (monthly): https://newslettermath.com/platforms/kit ("verified 2026-09-29"), https://sendbroadcast.net/compare/kit-pricing (Oct 2026). |
| **C. Hybrid (Supabase capture/confirm → push confirmed addresses to Kit or Resend)** | as A, or as B | as A, or as B | as A, or as B | as A, or as B | Price is whichever ESP receives the pushed addresses. Supabase/Turnstile add $0 on Free. |
| **D1. MailerLite** | $0 (Free ≤ **250** subs, 2,500 emails/mo, 3 automations of 5 steps) | Comfort **$19** ($17.10/mo yearly) [secondary] | Comfort **$49** [secondary] | Comfort **$89** [secondary] | Free plan limits, and Comfort "starting $12/month", are from the official page (https://www.mailerlite.com/pricing, 2026-10-27). Comfort sends 10× the tier ceiling per month, with 50 automations (https://www.mailerlite.com/help/plan-and-billing). Tier prices are from trackers that agree: https://newsletterpricing.com/pricing/mailerlite/ ("Last verified 27 Oct 2026"), https://creatormailstack.com/guides/mailerlite-pricing (7 Oct 2026), https://sendfox.com/compare/mailerlite-pricing (20 Oct 2026). New pricing introduced 16 June 2026 (official help page). |
| **D2. Buttondown** | $0 (≤ 100 subs) | **$9** [secondary] | **$29** [secondary] | **$79** [secondary] | Official page: "Absolutely nothing for your first 100 subscribers". **Automations are a +$29/month add-on**, so a welcome sequence costs $38 / $58 / $108 [computed]. Prices assume at most one email a day to the list (https://buttondown.com/pricing, 2026-10-27). Tier prices: https://newsletterledger.com/buttondown-pricing/ (checked 2026-10-24). **Disagreement:** Buttondown's own https://buttondown.com/llms.txt says Basic $9 includes "automations". Confirm at checkout. |
| **D3. Loops** | $0 (Free: 1,000 contacts, 4,000 sends / rolling 30 days, Loops footer) | $0 | Growth **$49** (≤ 5,000 subscribed contacts, unlimited sends) | **not readable** (slider) | https://loops.so/pricing (2026-10-27). The 10k price is a gap. |
| **D4. Brevo** (priced by emails per month, not contacts) | £0 (Free: 300 emails/day, store up to 100,000 contacts, automation up to 2,000 contacts) | Starter **£12** (£6 base + £6 for the 10,000-email tier, which allows 1,500 contacts). Remove Brevo logo +£8. Standard £25 [computed] | Starter **£24** (£6 + £18 for 20,000 emails; contact limit then 500,000). Standard £47 [computed] | Starter **£24**, Standard **£47** [computed]. Note 20,000 emails = only 2 sends to 10k | Official GBP pricing API: https://pricing-backend.brevo.com/public/pricing/api/plans/all?currency=GBP, and https://www.brevo.com/pricing.md (generated 2026-09-29, retrieved 2026-10-27). Starter £6/mo (£65/yr), Standard £13/mo (£140/yr). Free plan limits: https://help.brevo.com/hc/en-us/articles/208589409 (2026-10-27). Base + tier sums are **[computed]** from the API and not checked in a checkout. Standard adds unlimited-contact automation, no logo, A/B. |

---

## 5. Option-by-option comparison

### A. Supabase system of record + edge function + Resend (recommended)
- **Data location / transfer:** list rows in Supabase **eu-central-1 (Frankfurt)** (connector, 2026-10-27). Resend "stores customer data in the United States… The region you select… does not control where data is stored". Transfers rely on EU SCCs (Module 2), the UK Addendum, and the EU–US DPF plus UK Extension. The DPA is pre-signed for every account (https://resend.com/security/gdpr; https://resend.com/docs/dashboard/domains/regions; https://resend.com/legal/dpa, all 2026-10-27). Resend sub-processors are all US entities (AWS, PlanetScale, Supabase, etc.): https://www.resend.com/legal/subprocessors.
- **Double opt-in:** not a built-in Resend feature. You build it: a pending row plus a hashed token, and a confirmation email sent through the Resend Emails API. Resend's own example repo shows the pattern (`resend-examples/.../double_optin_subscribe.py`, GitHub). Doing it in Supabase means the evidence is held where the owner controls it.
- **Unsubscribe:** Resend Broadcasts and Automations handle unsubscribes when the template contains `{{{RESEND_UNSUBSCRIBE_URL}}}` (preference page, Topics). The Automation `send_email` step does **not** add one automatically (https://resend.com/docs/dashboard/broadcasts/editor; https://resend.com/docs/dashboard/automations/send-email). The app's own one-click endpoint (RFC 8058) is needed for any mail sent through the Emails API, and a Resend webhook or poll should sync unsubscribes back to Supabase.
- **Sequences / automation:** Resend Automations has triggers (custom events), Delay (max 30 days), Condition, Wait-for-event and Send Email steps. 10,000 runs/mo are included on all plans (https://resend.com/docs/dashboard/automations/create-automation; /delay; https://resend.com/pricing).
- **Broadcasts:** the Resend Broadcast editor/API with Segments and Topics.
- **API for landing page:** the page posts to the edge function `waitlist-signup` (Turnstile token, email, consent flag, UTMs). It never writes to the table directly.
- **Effort (estimate, my own judgement):** about 1.5–3 developer-days: migration, function, confirm/unsubscribe pages, tests in the existing harness. Running cost is mostly writing emails. Every DB/function deploy needs the owner's yes.
- **Privacy-notice change:** small. Widen the Resend bullet (also sends mailing-list emails if you join; stores data in the US), widen the Turnstile bullet (also on the sign-up form), and replace the "Waitlist" bullet with a "Mailing list" bullet (§7).
- **Failure modes and mitigations:** bots → Turnstile siteverify with hostname check (already coded in `send-auth-email`). Subscription bombing / someone else's address → DOI, nothing marketing-like before confirmation, at most one confirmation email per address per 24 h and per IP-hash per hour (`rate_hit`), and pending rows purged after N days. Quota exhaustion → the **Resend Free 100/day cap is shared with sign-in codes**, so an ad burst could block log-ins. Upgrade to Pro ($20) before ads run, or send DOI mail from a separate domain/plan. Supabase Free pausing (above). Resend Marketing Free tops out at 1,000 contacts.

### B. Kit as list and ESP
- **Data / transfer:** Kit relies on the EU–US DPF + UK Extension, SCCs or the UK **IDTA**, set out in its DPA (https://help.kit.com/en/articles/2502527-compliance-with-gdpr; https://kit.com/dpa, 2026-10-27). That implies US processing. I did not find a statement of exact storage location, so treat it as **unverified**.
- **DOI:** built in per form ("Auto-confirm new subscribers" unchecked = DOI, and it is the default) (https://help.kit.com/en/articles/2502655-the-confirmation-email; https://help.kit.com/en/articles/2971364-the-all-important-double-opt-in). Via API v4: create the subscriber as `inactive`, then add them to the DOI form, which "will trigger sending an Incentive Email" (https://developers.kit.com/api-reference/forms/bulk-add-subscribers-to-forms). Imports into a DOI form are auto-confirmed (https://help.kit.com/en/articles/5027047). The API records `referrer` and parses UTMs.
- **Unsubscribe:** built in.
- **Sequences:** **paid only** (Creator from $39/mo at ≤ 1,000).
- **Effort:** lowest if you use the Kit embed. But the embed loads a script from `*.kit.com`, which is a new third party on the page. With a server-side API call it is about 1 day.
- **Privacy notice:** add Kit as a processor, say it is in the US with DPF/SCC/IDTA, and remove or replace the Supabase "Waitlist" line.
- **Failure modes:** Kit's embed has its own bot protection, but I did not verify Turnstile-equivalent controls. The consent-text record would live in Kit rather than in your own database. The account currently has an unverified sending address and no DMARC.

### C. Hybrid (Supabase captures and confirms → push confirmed addresses to Kit or Resend Contacts)
- Capture and evidence work as in A. On confirmation, call the ESP API with the subscriber **already confirmed**: Kit `state: active` into a non-DOI form/tag, or Resend `unsubscribed: false`.
- Pushing to **Resend Contacts** is effectively the recommended A.
- Pushing to **Kit** costs Kit's price, adds a processor, and means two systems hold the list. It also needs an unsubscribe-sync webhook from Kit back to Supabase, or the two drift and you risk emailing someone who opted out elsewhere.
- **Failure modes:** sync drift; double DOI (Kit sending its own confirmation on top of yours) if the wrong form type is used.

### D. EU-friendly ESPs
| | Data location / transfer | DOI | Sequences | API | Source (2026-10-27) |
|---|---|---|---|---|---|
| **MailerLite** | "Google data storage center… in the European Union". Sub-processor list: Google Cloud EMEA, data centre in **the Netherlands** (new MailerLite). DPA is part of the Terms of Use. MailerLite, Inc. also holds a DPF listing. | Default on forms. Separate toggle **"Double opt-in for API and integrations"**. Editing DOI emails is paid only. | Free: 3 active automations, 5 steps. Comfort: 50. | Yes (Free is "Limited") | https://www.mailerlite.com/legal/data-processing-agreement ; https://www.mailerlite.com/help/is-my-data-safe-with-mailerlite ; https://www.mailerlite.com/help/how-to-use-double-opt-in-when-collecting-subscribers ; https://www.mailerlite.com/pricing |
| **Brevo** | "all located within the European Union": OVH in France and Germany, data on Google Cloud in Belgium. | Built into forms. API endpoint `POST /v3/contacts/doubleOptinConfirmation`, with consent text recommended in the DOI template. | Free: automation up to 2,000 contacts. Standard: unlimited. | Yes | https://help.brevo.com/hc/en-us/articles/360001005510-Data-storage-location ; https://developers.brevo.com/reference/create-doi-contact.md ; https://help.brevo.com/hc/en-us/articles/360019540880 |
| **Buttondown** | US-based. SCCs Module 2 in the DPA. | **Mandatory by default**. API can bypass per subscriber with `type: regular`. | +$29/mo add-on (see disagreement in §4) | Yes | https://buttondown.com/legal/data-processing-agreement ; https://docs.buttondown.com/double-opt-in ; https://docs.buttondown.com/api-subscribers-create |
| **Loops** | All sub-processors "process data in the United States". DPF + UK Extension, SCCs. | Built in but **"only enabled on Form endpoints. API endpoints… are not yet gated"** | Yes (workflows) | Yes | https://loops.so/subprocessors ; https://loops.so/privacy ; https://loops.so/docs/contacts/double-opt-in |

Effort for any D option: about 1 day for a server-side API integration, or less with their embed (which adds a third-party script). Each needs a new processor line in the notice. Brevo and MailerLite give a fully EU-stored list. Buttondown and Loops are US-based, the same as Resend and Kit.

---

## 6. Decision

**Choose A** (Supabase + Turnstile + Resend DOI + Resend Contacts/Automations/Broadcasts). Fallback if the owner wants a no-code editor and an all-EU list: **Brevo Standard** or **MailerLite Comfort**, fed from the same Supabase-confirmed flow (C pattern), with the notice updated to name them. **Do not keep Kit:** it is empty, a welcome sequence needs a paid plan ($39+/mo), it is US-based, and it would be a new processor.

Build checklist for A (for the build task; nothing applied here):
1. New migration `0xx_mailing_list.sql`: add the columns in §7, a case-insensitive unique index on `lower(email)`, **drop the `public_insert` policy and revoke anon INSERT**, and change `waitlist_count()` to count confirmed rows only (if the page shows a count). The migration goes in first. Apply/confirm 008 before deploying the function.
2. Edge function `waitlist-signup`. Order of checks: Turnstile siteverify → `rate_hit` per IP-hash and per email-hash → upsert pending row → send DOI email via Resend. Always return the same generic "check your inbox" response, so the endpoint cannot be used to find out which addresses are on the list.
3. `GET/POST /confirm?t=` sets `confirmed_at`, creates the Resend contact, and fires the `waitlist.confirmed` event, which starts the welcome Automation.
4. `GET/POST /unsubscribe` (RFC 8058) plus a Resend unsubscribe webhook → `unsubscribed_at`.
5. Upgrade Resend Transactional to Pro **before** paid ads, so sign-in codes cannot be starved by the 100/day cap. Consider Supabase Pro for the no-pause guarantee.
6. Existing `waitlist` rows were collected with no consent record, "to send your Pioneer invite". Use them only for that invite. Don't put them in the marketing Audience unless they sign up again through the new consent flow.

## 7. Exact fields to capture (and nothing more)

| Column | Why the notice can justify it |
|---|---|
| `email` (stored lower-cased and trimmed) | needed to send what was asked for |
| `status` (`pending` / `confirmed` / `unsubscribed`) | needed to honour consent and withdrawal |
| `consent_text` (exact checkbox wording shown) **or** `consent_version` → a `consent_texts` table | ICO: record "what you told people" |
| `consent_at` (timestamptz, when the form was submitted with the box ticked) | ICO: record "when" |
| `confirmed_at` (timestamptz, DOI click) | proves the address owner agreed ("how") |
| `confirm_token_hash` + `confirm_expires_at` (cleared on confirm) | security; not personal content |
| `source` (page path, e.g. `/sign-up`) | ICO: record "how / where" |
| `utm_source`, `utm_medium`, `utm_campaign` (from the URL, length-capped) | measuring which ads work. Must be stated in the notice. |
| `referrer` (origin only, e.g. `https://www.instagram.com`, no path or query) | same purpose, kept minimal |
| `interests` (optional ticked options such as `tester`, `founding_member`) | only if the form offers them, and each is a separate opt-in |
| `unsubscribed_at` | keeps a suppression ("do not contact") record (ICO marketing-lists guidance) |

**Do not store:** raw IP address, user agent, name, location, or the full referrer URL. Abuse control uses the existing short-lived **hashed** counters in `auth_rate`, which the notice already covers under "Security records".

Wording to add to the privacy notice (draft, to be checked against the final code):
- **Mailing list:** "If you join from vault-it.co, we keep your email address, the wording you agreed to and when, when you confirmed, the page you signed up on and, if you arrived from an advert or link, the campaign name and the website you came from. We use it, with your consent, to email you Vault·It launch news, beta-tester invitations and founding-member offers. Unsubscribe with the link in any email. Unconfirmed sign-ups are deleted after [N] days, and we keep a note of unsubscribed addresses so we don't email them again."
- **Resend:** "…delivers your sign-in emails and, if you join our mailing list, our confirmation and update emails. Resend stores data in the United States under approved contract terms."
- **Cloudflare:** "…runs the 'are you human' check (Turnstile) when you ask for a sign-in code or join the mailing list."
- **Lawful bases:** add "your consent, for mailing-list emails".
- The sign-up page must link to the notice. It currently lives inside the app's modal, so vault-it.co needs a reachable copy.
- **The checkbox text must name PT Live Design / Vault·It and "email".** It must be unticked by default and separate from the terms.

## 8. Gaps / not verified
- Kit 5k/10k prices, MailerLite tier prices and Buttondown tier prices come from agreeing third-party trackers, because the official slider could not be read.
- The Loops price at 10,000 contacts could not be read.
- Brevo totals are computed from the public pricing API (base + email-tier add-on), not checked in a checkout.
- Whether Resend Marketing and Transactional plans are billed as separate subscriptions that add together.
- Kit's exact data-storage location (only the transfer mechanism is stated), and the real billing state after the trial lapsed.
- Whether migration 008 exists in production despite being absent from `list_migrations`.
- Buttondown: whether automations are included at $9 (llms.txt) or a +$29 add-on (pricing page).
- Effort estimates are my own judgement, not measured.
