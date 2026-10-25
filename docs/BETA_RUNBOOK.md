# Vault·It beta — owner's runbook

Everything that has to be true before testers sign up, and what to do when something goes wrong.
Project: Supabase `legpubblzgknxdtvsant` (eu-central-1, Frankfurt). Live app: `release/pioneer-v2` → GitHub Pages.

## A. Before the meeting

**Database and functions** (in this order)
1. Apply `supabase/migrations/007_security_hardening.sql` and `008_auth_rate_limit.sql` (SQL Editor, or `supabase db push`). 008 first matters: the functions fail *open* without it.
2. Deploy `send-auth-email` and `pin-auth` (the GitHub Action needs a renewed `SUPABASE_ACCESS_TOKEN`, or deploy from the CLI: `supabase functions deploy <name> --no-verify-jwt`).
3. Secrets (Edge Functions → Secrets): `RESEND_API_KEY`, `FROM_EMAIL` (`Vault·It <noreply@your-domain>`), `APP_URL`, `PIN_PEPPER` (random, **never change it later** — every PIN would stop working), optionally `RATE_*` overrides.
4. Run the Supabase **Security Advisor** and clear anything new.

**Supabase Auth settings** (Authentication → …)
- URL Configuration: Site URL = the live app URL; add it (and the old github.io URL while both exist) to Redirect URLs.
- Email OTP length 6; the e-mail template must include the 6-digit `{{ .Token }}` (used only by the built-in fallback sender).
- Consider CAPTCHA (Authentication → Attack Protection) if the sign-up link will be shared widely.

**E-mail**
- Resend: domain verified (SPF/DKIM green), region EU. The free plan is 100 e-mails/day — upgrade for a room of testers, and keep `RATE_GLOBAL_PER_HOUR` under the plan.
- `_dmarc` TXT record published (start with `p=none`).

**Plan and backups**
- Supabase **Pro** (daily backups, no auto-pause). Free projects pause after a week of inactivity.

**Domain cut-over** (only after DNS resolves and Resend shows *Verified*)
- Add a `CNAME` file containing the domain to the repo root of the Pages branch, enforce HTTPS in repo Settings → Pages.
- Update `APP_URL`, `FROM_EMAIL`, Supabase Site URL/Redirects, and the links in the tester guide / QR code.
- localStorage is per-origin: anyone who used the github.io address starts empty on the new one until they sign in (their cloud copy restores).

**Before the link goes beyond friendly testers** (from the security review)
- Sign-in e-mails are protected by rate limits, not a CAPTCHA. Someone determined (a few IPs) can use up the service-wide allowance (default 200/hour) and stop new testers getting a code; PIN sign-in keeps working. Before sharing the link widely add **Cloudflare Turnstile** (or Supabase CAPTCHA) in front of `send-auth-email`, and keep `RATE_GLOBAL_PER_HOUR` under your Resend quota.
- Anyone who knows an address can spend that mailbox's hourly allowance (8) or lock a PIN (5 wrong tries): the owner can always get in with an e-mail code once the window passes. Known, accepted for the beta.
- Pin the Edge Functions region if you want the "EU" statement to cover them as well as the database (Supabase → Edge Functions settings).
- Auth logs (Supabase) and Resend delivery logs hold e-mail address and IP for a short period after deletion; set their retention to the minimum.
- `?bypass=websummit` on the app URL skips the login screen *on that device* and switches to sample data (no cloud access). It is linked from the landing page for demos; remove it before wide release if you do not want it.
- The housekeeping that clears saved versions older than 180 days and old usage counters runs as part of normal sign-ins (migration 008). After the beta, delete remaining test accounts yourself (Authentication → Users, or `erase_user_data` + delete) — the notice promises an e-mail first.

**Legal**
- Privacy notice and beta terms are in the app (`showPrivacy` / `showTerms`). Have them reviewed before opening beyond friendly testers.
- Check whether **ICO registration** (data-protection fee) applies to PT Live Design.
- Replace "PT Live Design" with the legal entity name if different, and add a postal address (UK GDPR Art. 13 expects the controller's identity and contact details).
- The notice and terms state things only you can decide — please confirm each is what you intend: no marketing e-mail without opt-in; accounts removed (after an e-mail) when the beta ends; cancelling a Pioneer plan any time via Stripe or e-mail; liability limited to £100 or what a paying user paid in 12 months. Have a solicitor read them.

**Rehearse** with a non-owner e-mail on a phone *and* a laptop: sign up → code → PIN → add data → sign out → sign in with PIN on the other device → *Download my data* → *Delete my account*.

## B. At the meeting
- Hand out the QR code and `docs/TESTER_GUIDE.md` (or its text). Expect many people on one Wi-Fi/IP — limits are set generously for that.
- If someone reports "too many sign-in emails": limits are per mailbox (8/h), per IP (60/h), global (200/h). Raise `RATE_*` secrets or wait for the window.

## C. While it's live
- Supabase → Logs → Edge Functions: watch `send-auth-email` and `pin-auth` for 4xx/5xx; "rate_hit failed" means migration 008 is missing.
- Resend → Emails: bounces/complaints.
- Table `auth_rate` self-cleans (≈2% of calls sweep rows older than a day).
- A tester who is **locked out**: they can use "Forgot PIN? Get an email code". Never read or reset a PIN; there is no way to see it.

## D. If something goes wrong
- **Suspected abuse / spam sign-ups:** lower `RATE_*`, enable CAPTCHA, review Authentication → Users and delete junk accounts.
- **Key leak:** rotate `RESEND_API_KEY` and the service role key; **not** `PIN_PEPPER` unless you accept every PIN being reset.
- **Personal-data incident:** you have 72 hours to report a notifiable breach to the ICO — note what, when, who is affected.
- **A user asks for their data or deletion:** they can do both in Settings; otherwise export/delete by their `user_id` (`erase_user_data(uuid, email)` then delete the auth user) and reply within one month.
