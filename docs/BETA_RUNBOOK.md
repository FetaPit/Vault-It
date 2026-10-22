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

**Legal**
- Privacy notice and beta terms are in the app (`showPrivacy` / `showTerms`). Have them reviewed before opening beyond friendly testers.
- Check whether **ICO registration** (data-protection fee) applies to PT Live Design.
- Replace "PT Live Design" with the legal entity name if different.

**Rehearse** with a non-owner e-mail on a phone *and* a laptop: sign up → code → PIN → add data → sign out → sign in with PIN on the other device → *Download my data* → *Delete my account*.

## B. At the meeting
- Hand out the QR code and `docs/TESTER_GUIDE.md` (or its text). Expect many people on one Wi-Fi/IP — limits are set generously for that.
- If someone reports "too many sign-in emails": limits are per address (6/h), per IP (60/h), global (200/h). Raise `RATE_*` secrets or wait for the window.

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
