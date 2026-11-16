# Trust page v1: draft wording for the owner's approval

Status: DRAFT, 16 Nov 2026. Not approved, not built, not published. For `vault-it.co/trust` (queue line "Trust centre page v1").
Every line below is taken from the privacy notice (5 Nov 2026), the beta runbook or the code. Lines in [square brackets] stay OUT of the page until the owner has checked them. Banned words on the page: "secure", "compliant" and "certified" (except the one allowed sentence at the end). No badges, logos, numbers or prices from the Vanta email. British English, no em dashes.

Note: the live privacy notice still says "Pioneer (monthly and yearly) and the Lifetime licence". The plan cards change the plan names, so the privacy notice and this page must be checked together at release.

---

# Trust

How Vault-It looks after your information, in plain words. Last reviewed: [date].

## What we hold, and why
Your email address and the profile answers you give at set-up, so we can create your account and send your sign-in codes. Your plan and payment references, so the app knows what you have bought. The figures you enter (income, spending, assets, debts, house plans), so we can show your dashboard and keep your devices in step. We do not sell your data and we do not use your figures for anything else.

## What we never hold
Your bank login. Vault-It does not connect to your bank. Your card details. Stripe takes payments and we never see or store them. Your PIN in a readable form: it is kept only as a salted, peppered one-way hash that we cannot read.

## Where it lives
Your data is stored with Supabase in Frankfurt, in the EU. Some of our server functions run on Supabase's network and may run outside the EU.

## Who handles it for us
Supabase (database and sign-in), Cloudflare (web hosting, DNS and the "are you human" check), Stripe (payments), Resend (sign-in and beta-list emails) and, only if you choose it, Google sign-in. Some optional features send limited information to Anthropic. The full list, and what each one receives, is in the [privacy notice](/privacy).
[Add "We have data processing terms on file with each of them" only when every supplier's terms are saved.]

## How sign-in works
You ask for a code by email, or use a PIN you set, or choose Continue with Google. Repeated failed attempts are limited, and a check that you are a person runs when you ask for a code or join the beta list.

## Your rights
You can download your data and delete your account in Settings. If you cannot use Settings, email hello@vault-it.co and we will deal with it. Earlier saved copies of your data clear automatically after about 180 days.
[Add the retention period for sign-in records only once checked in Supabase and Resend.]

## If something goes wrong
If a personal data breach is likely to put people at risk, we will report it to the ICO within 72 hours and tell the people affected.
[Add "PT Live Design is registered with the ICO, reference ..." only once the registration is confirmed.]

## Report a vulnerability
Email security@vault-it.co [only once that address is live and monitored]. Our security.txt is at /.well-known/security.txt. Please give us reasonable time to fix a problem before you share it.

## ISO 27001
We are building towards ISO 27001. We are not certified.

Not regulated by the FCA. Not financial advice.

---

## security.txt (for /.well-known/security.txt)
Contact: mailto:security@vault-it.co
Expires: 2027-11-01T00:00:00.000Z
Preferred-Languages: en
Policy: https://vault-it.co/trust
Canonical: https://vault-it.co/.well-known/security.txt
