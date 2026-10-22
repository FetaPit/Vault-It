# Vault·It — Supabase Edge Functions

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
supabase secrets set FROM_EMAIL="Vault·It <noreply@yourdomain.com>"

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
per address 6/hour, per IP 60/hour, whole service 200/hour. A refused request returns `429 { error: 'rate_limited', retryAfter }`
and the app shows the wait instead of falling back. Tunable with secrets `RATE_EMAIL_PER_HOUR`, `RATE_IP_PER_HOUR`,
`RATE_GLOBAL_PER_HOUR` (a room of testers shares one public IP, so keep the per-IP number generous). Counters are keyed by a salted hash,
never a raw address or IP. If the limiter table is missing the function **fails open** (and logs) rather than locking everyone out —
so apply migration 008 **before** relying on it. Addresses are validated strictly and HTML-escaped in the e-mail body.

Resend's free plan allows 100 e-mails/day: for a launch-night room of testers, upgrade Resend (and keep `RATE_GLOBAL_PER_HOUR` below your quota).

### Fallback

If the Edge Function is not deployed or fails (5xx / timeout), the app falls back to
Supabase's built-in `signInWithOtp` (rate-limited to ~4 emails/hour per project). It does **not** fall back when our own limit says 429.


## pin-auth

Email + PIN sign-in for returning users on any device.

1. Run `supabase/migrations/004_user_pins.sql` once (SQL Editor, or `supabase db push`). It creates the
   locked-down `user_pins` table and the atomic `pin_begin_attempt` / `pin_reset_attempts` functions.
2. Deploy: `supabase functions deploy pin-auth --no-verify-jwt`
   (optional: `supabase secrets set PIN_PEPPER=<random>`; defaults to the service-role key).

Actions: `status` (does this email have a PIN?), `set` / `remove` (need the signed-in user's JWT),
`login` (email + 6-digit PIN → one-time code the app exchanges for a real session) and
`delete` (JWT + PIN → erases the account and everything stored about it, see below).
PINs are PBKDF2-hashed server-side; 5 wrong tries lock the account for 15 min, doubling every further 5.

`status` and `login` are also metered per IP (migration 008): 120 and 60 per 10 min by default (`RATE_PIN_STATUS_PER_10MIN`,
`RATE_PIN_LOGIN_PER_10MIN`) → `429 { error: 'rate_limited', retryAfter }`, checked *before* a PIN attempt is spent.

`delete` (GDPR erasure): requires the user's own JWT. If the account has a PIN it must be supplied and is checked with the same
lockout as sign-in; if it has none, the sign-in must be within the last 15 minutes (`403 recent_login`). It calls
`erase_user_data()` (migration 008 — order matters because `vault_data` archives rows into `vault_data_history` when deleted) and
only then deletes the auth user, so a failure part-way leaves the login in place and a retry works. Limited to 10 per IP per hour.
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
