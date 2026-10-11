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

### Fallback

If the Edge Function is not deployed, the app automatically falls back to
Supabase's built-in `signInWithOtp` (rate-limited to ~4 emails/hour per project).


## pin-auth

Email + PIN sign-in for returning users on any device.

1. Run `supabase/migrations/004_user_pins.sql` once (SQL Editor, or `supabase db push`). It creates the
   locked-down `user_pins` table and the atomic `pin_begin_attempt` / `pin_reset_attempts` functions.
2. Deploy: `supabase functions deploy pin-auth --no-verify-jwt`
   (optional: `supabase secrets set PIN_PEPPER=<random>`; defaults to the service-role key).

Actions: `status` (does this email have a PIN?), `set` / `remove` (need the signed-in user's JWT) and
`login` (email + 6-digit PIN → one-time code the app exchanges for a real session).
PINs are PBKDF2-hashed server-side; 5 wrong tries lock the account for 15 min, doubling every further 5.
