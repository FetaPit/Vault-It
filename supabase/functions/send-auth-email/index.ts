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

// Brand shell for e-mails (Night palette from the brand book, inline styles, tables; no web fonts or images, so nothing is fetched when the e-mail opens).
function brandShell(title: string, body: string, footer: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#080808;color:#E8E8E8;font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:36px 16px"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#080D14;border:1px solid #15302F;border-radius:18px;max-width:520px;width:100%">
<tr><td style="padding:28px 36px 18px;border-bottom:1px solid #102221">
<div style="font-family:'Syne','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1;color:#E8E8E8">Vault<span style="display:inline-block;width:8px;height:4px;background:#44C0B9;border-radius:1px;margin:0 2px;vertical-align:middle;position:relative;top:-2px"></span><span style="color:#44C0B9">It</span></div>
<div style="margin-top:8px;font-size:12px;letter-spacing:.04em;color:#9AA0A6">Get out of the red and into your home.</div>
</td></tr>
<tr><td style="padding:26px 36px 10px">${body}</td></tr>
<tr><td style="padding:16px 36px 26px;border-top:1px solid #102221">
<p style="margin:0 0 8px;font-size:12px;color:#E8E8E8">Not regulated by the FCA. Not financial advice.</p>
<p style="margin:0;font-size:11px;line-height:1.6;color:#9AA0A6">${footer}</p>
</td></tr>
</table></td></tr></table></body></html>`
}
const EYEBROW = "margin:0 0 8px;font-family:'Share Tech Mono',Menlo,Consolas,'Courier New',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#44C0B9"
const H1 = "margin:0 0 14px;font-family:'Syne','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;line-height:1.25;color:#E8E8E8"
const P = "margin:0 0 18px;font-size:15px;line-height:1.6;color:#9AA0A6"
const SMALL = "margin:0 0 8px;font-size:12px;line-height:1.6;color:#9AA0A6"
const BTN = "display:inline-block;background:#E8C56A;color:#1A1400;text-decoration:none;font-family:'Syne','Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:700;font-size:13px;letter-spacing:.14em;text-transform:uppercase;padding:15px 24px;border-radius:10px"
const TRADER = 'Vault-It is run by PT Live Design, A57, 11 St Mary&#39;s Street, Lincoln LN5 7EQ · <a href="mailto:hello@vault-it.co" style="color:#44C0B9">hello@vault-it.co</a>'

function emailHtml(otpCode: string, email: string): string {
  email = esc(email)
  const body = `<p style="${EYEBROW}">Your sign-in code</p>
<h1 style="${H1}">Open your vault</h1>
<p style="${P}">Enter this code on the Vault-It sign-in screen for <strong style="color:#E8E8E8">${email}</strong>. It expires in <strong style="color:#44C0B9">60 minutes</strong> and works once.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 18px"><tr><td style="background:#080808;border:1px solid #15302F;border-radius:12px;padding:18px 32px;text-align:center">
<div style="${EYEBROW};margin:0 0 10px">Enter this code</div>
<div style="font-family:'Share Tech Mono',Menlo,Consolas,'Courier New',monospace;font-size:38px;letter-spacing:.22em;line-height:1;color:#E8E8E8">${otpCode}</div>
</td></tr></table>
<p style="${SMALL};text-align:center">Type or paste it into the app.</p>`
  const footer = `You received this because a sign-in was requested for this address. If that was not you, ignore this e-mail: your vault stays locked.<br>${TRADER}`
  return brandShell('Sign in to Vault-It', body, footer)
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
