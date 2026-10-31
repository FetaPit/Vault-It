# Vault-It — Supabase Edge Functions

## send-auth-email

Sends branded magic-link sign-in emails via Resend HTTP API.  
Bypasses Supabase SMTP entirely — zero SMTP configuration needed.

### Deploy (one-time setup)

**1. Install Supabase CLI**
```bash
npm install -g supabase
```

**2. Link to your project**
```bash
cd /path/to/Vault-It
supabase login
supabase link --project-ref legpubblzgknxdtvsant
```

**3. Set secrets**
```bash
# Your Resend API key (Resend dashboard → API Keys)
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# From address — must be verified in Resend, or use onboarding@resend.dev for testing
supabase secrets set FROM_EMAIL="Vault-It <noreply@yourdomain.com>"

# App redirect URL after magic link click
supabase secrets set APP_URL=https://fetapit.github.io/Vault-It/
```

**4. Deploy the function**
```bash
supabase functions deploy send-auth-email --no-verify-jwt
```

That's it. The app will automatically use the Edge Function for all sign-in emails.

### How it works

1. User enters email in app → app calls `supabase.functions.invoke('send-auth-email')`
2. Edge Function uses Supabase Admin API to generate a secure magic link
3. Resend delivers the branded email directly
4. User clicks link → Supabase auth completes → app unlocks

### Resend free tier note

On Resend's free plan, `FROM_EMAIL` must be `onboarding@resend.dev` and you can only
send to email addresses you've verified in the Resend dashboard. To send to any address,
add and verify your own domain in Resend → Domains.

### Abuse limits

This endpoint creates accounts and sends e-mail, so it is metered (migration `008_auth_rate_limit.sql`, `rate_hit()`):
per mailbox 8/hour (`+tags`, Gmail dots and googlemail.com count as one mailbox), per IP 60/hour (an IPv6 address counts as its /64), whole service 200/hour.
The cheap, bounded keys are checked first (IP, then service, then mailbox) so a flood of junk addresses writes almost nothing. A refused request returns `429 { error: 'rate_limited', retryAfter }`
and the app shows the wait instead of falling back. Tunable with secrets `RATE_EMAIL_PER_HOUR`, `RATE_IP_PER_HOUR`,
`RATE_GLOBAL_PER_HOUR` (a room of testers shares one public IP, so keep the per-IP number generous). Counters are keyed by a salted hash,
never a raw address or IP. If the limiter table is missing the function **fails open** (and logs) rather than locking everyone out —
so apply migration 008 **before** relying on it. Addresses are validated strictly and HTML-escaped in the e-mail body.

Resend's free plan allows 100 e-mails/day: for a launch-night room of testers, upgrade Resend (and keep `RATE_GLOBAL_PER_HOUR` below your quota).

### Human check (Cloudflare Turnstile)

Set the secret `TURNSTILE_SECRET` (the widget's secret) to require a Turnstile token (`captchaToken` in the request) — `403 { error: 'captcha' }` without a valid one,
`503 { error: 'captcha_unavailable' }` if Cloudflare cannot be asked (it never skips the check then). The token's site must be in `TURNSTILE_HOSTNAMES`
(default `app.vault-it.co,fetapit.github.io`). Order: per-IP counter → human check → service-wide and per-mailbox counters, so a script that cannot pass the check cannot use up the shared allowances.
Leave the secret unset until the client that sends tokens is live (see `docs/CUTOVER.md`). Also enable CAPTCHA (Turnstile) in Supabase → Authentication → Attack Protection so the built-in
`/auth/v1/otp` endpoint is not a way round it.

### Fallback

If the Edge Function is not deployed or fails (5xx / timeout), the app falls back to
Supabase's built-in `signInWithOtp` (only while the human check is **off**; with it on there is no fallback) (rate-limited to ~4 emails/hour per project). It does **not** fall back when our own limit says 429.


## waitlist-welcome

The landing page's join form. `POST { email }` saves the address to `public.waitlist` (a repeat address is not an error and gets the
same answer) and e-mails a short welcome with the beta link, from `hello@vault-it.co` with replies to `hello@vault-it.co`
(`WELCOME_FROM`, `WELCOME_REPLY_TO`, `APP_URL` override). Limits through `rate_hit` (migration 008): 20 an hour per IP, 3 a day per
mailbox (+tags and Gmail dots count as one), 100 an hour overall (`RATE_WL_*`). If the e-mail cannot be sent the address is still
saved and the answer says `emailed: false`; if the function is unreachable the page saves the address directly.
Deploy: `supabase functions deploy waitlist-welcome --no-verify-jwt`. Needs `RESEND_API_KEY` and the `vault-it.co` domain verified in Resend.

## pin-auth

Email + PIN sign-in for returning users on any device.

1. Run `supabase/migrations/004_user_pins.sql` once (SQL Editor, or `supabase db push`). It creates the
   locked-down `user_pins` table and the atomic `pin_begin_attempt` / `pin_reset_attempts` functions.
2. Deploy: `supabase functions deploy pin-auth --no-verify-jwt`
   (optional: `supabase secrets set PIN_PEPPER=<random>`; defaults to the service-role key).

Actions: `status` (does this email have a PIN?), `set` / `remove` (JWT **plus** re-authentication: a sign-in within the last
15 minutes, or the current PIN in `current` — same lockout; a token alone can no longer install its own PIN),
`login` (email + 6-digit PIN → one-time code the app exchanges for a real session) and
`delete` (JWT + PIN → erases the account and everything stored about it, see below).
PINs are PBKDF2-hashed server-side; 5 wrong tries lock the account for 15 min, doubling every further 5. `set` refuses trivially
guessable PINs (`400 pin_weak`: all-same, runs, repeats, a short list of the most common).

`status` and `login` are also metered per IP (migration 008): 300 and 60 per 10 min by default (`RATE_PIN_STATUS_PER_10MIN`,
`RATE_PIN_LOGIN_PER_10MIN`) → `429 { error: 'rate_limited', retryAfter }`, checked *before* a PIN attempt is spent.

`delete` (GDPR erasure): requires the user's own JWT. If the account has a PIN it must be supplied and is checked with the same
lockout as sign-in; if it has none, the sign-in must be within the last 15 minutes (`403 recent_login`). It calls
`erase_user_data()` (migration 008 — order matters because `vault_data` archives rows into `vault_data_history` when deleted) and
only then deletes the auth user (`500 partial` if that step fails — the data is already gone, a retry completes it) and sweeps once more.
Limited to 10 per IP per hour.
Also run: `supabase/migrations/008_auth_rate_limit.sql` once (before deploying either function).


## portfolio-vision

Reads holdings out of screenshots of an investing app, as an alternative to connecting a platform.

1. Run `supabase/migrations/005_vision_usage.sql` once (daily per-user cap table + `vision_take()`).
2. Set the secret: `supabase secrets set ANTHROPIC_API_KEY=<key>` (optional: `VISION_MODEL`, `VISION_DAILY_CAP`, default 30 images/user/day).
3. Deploy: `supabase functions deploy portfolio-vision --no-verify-jwt`

Needs the signed-in user's JWT. Sends 1–4 images to Claude (vision, forced tool call), then looks up ticker
candidates on Yahoo Finance. Nothing is stored. The app turns value ÷ live price into a share count.

## house-3d

Relay for Meshy AI text-to-3D, used by House Builder → "Generate with AI". Meshy's API does not accept
browser (CORS) requests, so the app calls this function, which forwards to `api.meshy.ai` and streams the finished
GLB back. The user's Meshy key (⚙ Settings, stored on their device) is sent per request; an optional project secret
`MESHY_API_KEY` is used only when a request carries no key. Downloads are limited to `https://*.meshy.ai/…` URLs.

Actions: `create` (preview shape, `auto_size` real-world metres, GLB) → `status` → `refine` (textures) → `status` →
`download`. Deployed with `--no-verify-jwt`.

> Note (Oct 2026): the GitHub Action "Deploy Supabase Edge Functions" fails with `401 Invalid access token` —
> the repository secret `SUPABASE_ACCESS_TOKEN` needs renewing (Supabase dashboard → Account → Access Tokens, then
> GitHub → Settings → Secrets and variables → Actions). house-3d v1 was deployed directly on 20 Oct 2026.

## waitlist-join

The beta list behind `vault-it.co/sign-up` (migration `009_waitlist_optin.sql` must be applied first). Double opt-in: `join` stores a pending request and
e-mails a confirmation link (`SITE_URL` + `sign-up/confirm?t=…`); `confirm` applies the person's choices (testing, marketing) and records the consent
wording version and time; `unsubscribe` needs the HMAC-signed link from any of our e-mails. Limits per IP / overall / mailbox (`RATE_WAITLIST_*`) use
`rate_hit` (migration 008); Turnstile is checked when `TURNSTILE_SECRET` is set (allowed hostnames `WAITLIST_TURNSTILE_HOSTNAMES`, default `vault-it.co`).
Uses `RESEND_API_KEY`, `FROM_EMAIL`, `PIN_PEPPER` (signs unsubscribe links — never change it, or old links stop working).

```
supabase functions deploy waitlist-join --no-verify-jwt
```
Tests: `tests/test_waitlist_server.js` (function), `tests/test_009.mjs` (SQL on pglite), `tests/test_signup_page.js` (pages in a browser).


## E-mail templates (brand, 30 Oct 2026)

`send-auth-email` (sign-in code), `waitlist-join` (beta list confirm) and `waitlist-welcome` (older single-step welcome) share the same inline
`brandShell()`: Night palette from the brand book (background `#080808`, card `#080D14`, text `#E8E8E8`, teal `#44C0B9`, gold button `#E8C56A`),
the Vault-It wordmark with the brick as the hyphen, the tagline, and a footer with "Not regulated by the FCA. Not financial advice." and the trader
address. Tables and inline styles only; no web fonts or images, so nothing is fetched when an e-mail opens (Syne, DM Sans and Share Tech Mono are
named first in the font stacks and used where installed). The shell is pasted into each function rather than imported, because the server tests
transform each `index.ts` on its own. Preview: `node shots/_email_preview.js` after copying it from the session scratchpad, or render the
functions' HTML with the tests' esbuild stub. Deploying the three functions is a production change and needs the owner's explicit yes.

## stripe-webhook (secure paid gateway)

The only way an account becomes paid. Stripe sends payment events here; the function checks the `Stripe-Signature` header
(HMAC-SHA256 with the endpoint's signing secret, 5-minute window) before reading anything, then applies the event once through
`stripe_apply` (migration 011). The browser can no longer set `is_pioneer`, `is_founder`, `plan`, `paid_until`, `is_beta` or the
Stripe ids on its profile: a trigger silently keeps the server's values.

Handled: `checkout.session.completed` and `checkout.session.async_payment_succeeded` (the account comes from `client_reference_id`,
which the app adds to every Payment Link; else the Stripe customer; else the checkout e-mail), `customer.subscription.created`,
`.updated`, `.deleted` (renewals, late payments, cancellations). The plan comes from the Payment Link id, then the link's
`metadata.plan`, then the price. Test-mode events are ignored unless `STRIPE_ALLOW_TEST=1`.

**Go-live order (needs Pete's yes; production database and functions):**
1. Apply `supabase/migrations/011_paid_gateway.sql`.
2. Deploy: `supabase functions deploy stripe-webhook --no-verify-jwt` (Stripe sends no Supabase token; the signature is the check).
3. Stripe Dashboard → Developers → Webhooks → Add endpoint `https://legpubblzgknxdtvsant.supabase.co/functions/v1/stripe-webhook`,
   events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`. Copy its signing secret (`whsec_…`).
4. `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_…` (comma-separate two while rotating).
5. Release the app (it detects the new columns and switches to the profile by itself; on an older server it behaves as before).
6. Check: `select id, kind, result, received_at from stripe_events order by received_at desc limit 20;` A `no_user` row has the
   checkout e-mail so it can be linked by hand: `update profiles set is_pioneer = true, plan = 'monthly' where id = '…';`

Tests: `tests/test_011.mjs` (database, real Postgres), `tests/test_stripe_server.js` (function), `tests/test_paid_gateway.js` (app).
