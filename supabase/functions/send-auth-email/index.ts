import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const FROM_EMAIL            = Deno.env.get('FROM_EMAIL') ?? 'Vault-It <onboarding@resend.dev>'
const APP_URL               = Deno.env.get('APP_URL') ?? 'https://app.vault-it.co/'
const TURNSTILE_SECRET      = Deno.env.get('TURNSTILE_SECRET') ?? ''     // Cloudflare Turnstile ("are you human"); unset = no check yet
// Sites a token may have been minted on (Cloudflare reports the hostname in its answer): the app, and the older GitHub address.
const TURNSTILE_HOSTS       = (Deno.env.get('TURNSTILE_HOSTNAMES') ?? 'app.vault-it.co,fetapit.github.io').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
const PEPPER                = Deno.env.get('PIN_PEPPER') ?? SUPABASE_SERVICE_KEY   // keys in auth_rate are salted hashes, never raw e-mails / IPs

// Abuse limits (fixed windows, counted in the database by rate_hit — see migration 008).
// A whole room of testers shares one public IP, so the per-IP allowance is generous; the per-address
// limit stops one inbox being flooded and the global one protects the e-mail quota and sender reputation.
const num = (k: string, d: number) => { const n = parseInt(Deno.env.get(k) ?? '', 10); return n > 0 ? n : d }
const LIMIT_EMAIL_PER_HOUR  = num('RATE_EMAIL_PER_HOUR', 8)
const LIMIT_IP_PER_HOUR     = num('RATE_IP_PER_HOUR', 60)
const LIMIT_GLOBAL_PER_HOUR = num('RATE_GLOBAL_PER_HOUR', 200)
// Practical address shape: the characters real mailboxes use, ASCII domain (punycode for IDN). Keeps look-alike text and markup out of the e-mail body.
const EMAIL_RE              = /^[A-Za-z0-9._%+'-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
}
function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

async function keyOf(scope: string, id: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${PEPPER}|${scope}|${id}`))
  return scope + ':' + [...new Uint8Array(d)].slice(0, 16).map((x) => x.toString(16).padStart(2, '0')).join('')
}
// 0 = allowed, otherwise seconds to wait. If the limiter itself is unavailable we let the request through
// (a database hiccup must not lock every tester out) and log it.
async function limited(admin: ReturnType<typeof createClient>, scope: string, id: string, limit: number, windowSecs: number): Promise<number> {
  try {
    const { data, error } = await admin.rpc('rate_hit', { p_key: await keyOf(scope, id), p_limit: limit, p_window_secs: windowSecs })
    if (error) { console.error('rate_hit failed:', error.message); return 0 }
    const row = Array.isArray(data) ? data[0] : data
    return row && row.allowed === false ? Math.max(1, Number(row.retry_after) || 60) : 0
  } catch (e) { console.error('rate_hit threw:', e); return 0 }
}
// IPv4 as is, IPv6 as its /64 (one customer controls a whole /64, so keying on the full address would be free to rotate).
function ipKey(ip: string): string {
  const m4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i); if (m4) return m4[1]
  if (!ip.includes(':')) return ip
  const [head, tail] = ip.split('::'); const h = head ? head.split(':') : []; const t = tail ? tail.split(':') : []
  const groups = tail === undefined ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t]
  return groups.slice(0, 4).map((g) => g.padStart(4, '0')).join(':') + '/64'
}
function rawIp(req: Request): string {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
}
function clientIp(req: Request): string { return ipKey(rawIp(req)) }
// One mailbox, however it is spelled: +tags, Gmail dots and googlemail.com all land in the same inbox, so they share one budget.
function mailbox(email: string): string {
  let [local, domain] = email.split('@')
  local = local.split('+')[0]
  if (domain === 'googlemail.com') domain = 'gmail.com'
  if (domain === 'gmail.com') local = local.replace(/\./g, '')
  return `${local}@${domain}`
}

// Ask Cloudflare whether this Turnstile token is genuine and was minted on one of our sites.
//   'ok'          genuine
//   'fail'        not genuine / wrong site
//   'unreachable' Cloudflare could not be asked (timeout, HTTP error, network): the caller refuses with 503 — failing OPEN here would let anyone
//                 who can make verification slow or rate-limited (e.g. by flooding it with junk tokens) skip the check altogether
//   'misconfigured' our own secret is wrong or missing: logged loudly and skipped, so a typo cannot lock every tester out
async function verifyTurnstile(token: string, ip: string): Promise<'ok' | 'fail' | 'unreachable' | 'misconfigured'> {
  try {
    const form = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token })
    if (ip && ip !== 'unknown') form.set('remoteip', ip)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form, signal: AbortSignal.timeout(4000) })
    if (!res.ok) { console.error('turnstile siteverify HTTP', res.status); return 'unreachable' }
    const j = await res.json()
    const codes: string[] = Array.isArray(j['error-codes']) ? j['error-codes'] : []
    if (j.success === true) {
      const host = String(j.hostname ?? '').toLowerCase()
      return TURNSTILE_HOSTS.length && !TURNSTILE_HOSTS.includes(host) ? 'fail' : 'ok'
    }
    if (codes.some((c) => c === 'invalid-input-secret' || c === 'missing-input-secret')) { console.error('turnstile secret rejected:', codes.join(',')); return 'misconfigured' }
    if (codes.includes('internal-error')) { console.error('turnstile internal-error'); return 'unreachable' }
    return 'fail'
  } catch (e) { console.error('turnstile siteverify failed:', e); return 'unreachable' }
}

function emailHtml(otpCode: string, email: string): string {
  email = esc(email)
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in to Vault-It</title>
</head>
<body style="margin:0;padding:0;background:#04090f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#04090f;padding:40px 20px">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#060d16;border:1px solid rgba(68,192,185,.18);border-radius:16px;overflow:hidden;max-width:520px;width:100%">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#060d16,#0a1520);padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(68,192,185,.12)">
        <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:.12em;color:#c9a84c">VAULT-IT</div>
        <div style="font-size:10px;color:rgba(68,192,185,.7);letter-spacing:.18em;margin-top:4px">SECURE FINANCIAL INTELLIGENCE</div>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:36px 40px">
        <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,.45);letter-spacing:.06em">YOUR SIGN-IN CODE</p>
        <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#f0f4f8;line-height:1.3">Open your Vault</h1>
        <p style="margin:0 0 28px;font-size:15px;color:rgba(255,255,255,.6);line-height:1.6">
          Enter this code on the Vault-It sign-in screen for <strong style="color:#e8edf2">${email}</strong>.<br>
          The code expires in <strong style="color:#44c0b9">60 minutes</strong> and can only be used once.
        </p>
        <!-- OTP Code Block -->
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;width:100%">
          <tr><td style="text-align:center">
            <div style="display:inline-block;background:rgba(68,192,185,.08);border:2px solid rgba(68,192,185,.35);border-radius:12px;padding:20px 40px">
              <div style="font-size:11px;color:rgba(68,192,185,.6);letter-spacing:.18em;margin-bottom:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">ENTER THIS CODE</div>
              <div style="font-size:40px;font-weight:800;letter-spacing:.25em;color:#f0f4f8;font-family:'Courier New',Courier,monospace;line-height:1">${otpCode}</div>
            </div>
          </td></tr>
        </table>
        <p style="margin:0;font-size:12px;color:rgba(255,255,255,.3);text-align:center">Type or copy the code above into the Vault-It app</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 40px 28px;border-top:1px solid rgba(68,192,185,.08);text-align:center">
        <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,.2)">You received this because a sign-in was requested for this email address.</p>
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,.15)">If you didn't request this, you can safely ignore it. Your vault remains locked.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return err('Method not allowed', 405)

  if (!RESEND_API_KEY)       return err('Server not configured', 500)
  if (!SUPABASE_SERVICE_KEY) return err('Server not configured', 500)

  let email: string, captchaToken = ''
  try {
    const body = await req.json()
    captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken.slice(0, 2048) : ''
    email = String(body.email ?? '').trim().toLowerCase()
    if (!email || email.length > 254 || !EMAIL_RE.test(email)) return err('Invalid email address')
  } catch {
    return err('Invalid request body')
  }

  // Generate OTP via Supabase admin API (magiclink type also produces email_otp)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Abuse protection: this endpoint creates accounts and sends e-mail, so it is metered per address, per IP and overall.
  // Cheapest, bounded keys first: a flood from one IP can write at most one counter row per hour before it is refused.
  // Order matters: the per-IP counter first (bounded), then the human check, and only then the shared counters — so a script that
  // cannot pass Turnstile can never use up the service-wide or the per-mailbox allowance (the cheap way to deny everyone sign-in).
  let wait = await limited(admin, 'mail-ip', clientIp(req), LIMIT_IP_PER_HOUR, 3600)
  if (!wait && TURNSTILE_SECRET) {
    const verdict = captchaToken ? await verifyTurnstile(captchaToken, rawIp(req)) : 'fail'
    if (verdict === 'fail') return new Response(JSON.stringify({ error: 'captcha' }), { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } })
    if (verdict === 'unreachable') return new Response(JSON.stringify({ error: 'captcha_unavailable', retryAfter: 30 }), { status: 503, headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': '30' } })
  }
  wait = wait || (await limited(admin, 'mail-all', 'all', LIMIT_GLOBAL_PER_HOUR, 3600))
            || (await limited(admin, 'mail-addr', mailbox(email), LIMIT_EMAIL_PER_HOUR, 3600))
  if (wait) {
    return new Response(JSON.stringify({ error: 'rate_limited', retryAfter: wait }), {
      status: 429, headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': String(wait) },
    })
  }

  const { data, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: APP_URL },
  })

  if (linkErr || !data?.properties?.email_otp) {
    console.error('generateLink error:', linkErr)
    return err('Could not create a sign-in code', 500)
  }

  const otpCode = data.properties.email_otp

  // Send via Resend HTTP API
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [email],
      subject: 'Your Vault-It sign-in code',
      html:    emailHtml(otpCode, email),
    }),
  })

  if (!resendRes.ok) {
    const resendErr = await resendRes.json().catch(() => ({}))
    console.error('Resend error:', resendErr)
    return err('Could not send the sign-in e-mail', 502)
  }

  return ok({ success: true })
})
