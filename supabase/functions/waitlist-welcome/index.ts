// waitlist-welcome — the landing page's "Join" form.
//   POST { email }  → { ok: true, emailed: boolean }   |  400 invalid  |  429 { error: 'rate_limited', retryAfter }
// Saves the address to public.waitlist (service role; a repeat address is not an error) and e-mails a short welcome with the
// link to the beta. The answer is the same whether or not the address was already on the list, so it reveals nothing.
// Abuse limits per IP, per mailbox and overall (rate_hit, migration 008) stop it being used to flood an inbox.
// If the e-mail cannot be sent the address is still saved and the page still shows the app link.
// Deploy with --no-verify-jwt (the landing page calls it with the public key).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const WELCOME_FROM         = Deno.env.get('WELCOME_FROM') ?? 'Vault-It <hello@vault-it.co>'
const REPLY_TO             = Deno.env.get('WELCOME_REPLY_TO') ?? 'hello@vault-it.co'
const APP_URL              = Deno.env.get('APP_URL') ?? 'https://app.vault-it.co/'
const PEPPER               = Deno.env.get('PIN_PEPPER') ?? SUPABASE_SERVICE_KEY   // counter keys are salted hashes, never raw e-mails / IPs

const num = (k: string, d: number) => { const n = parseInt(Deno.env.get(k) ?? '', 10); return n > 0 ? n : d }
const LIMIT_IP_PER_HOUR     = num('RATE_WL_IP_PER_HOUR', 20)
const LIMIT_ADDR_PER_DAY    = num('RATE_WL_ADDR_PER_DAY', 3)
const LIMIT_GLOBAL_PER_HOUR = num('RATE_WL_GLOBAL_PER_HOUR', 100)
const EMAIL_RE = /^[A-Za-z0-9._%+'-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', ...extra } })

async function keyOf(scope: string, id: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${PEPPER}|${scope}|${id}`))
  return scope + ':' + [...new Uint8Array(d)].slice(0, 16).map((x) => x.toString(16).padStart(2, '0')).join('')
}
function ipKey(ip: string): string {   // IPv4 as is, IPv6 as its /64
  const m4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i); if (m4) return m4[1]
  if (!ip.includes(':')) return ip
  const [head, tail] = ip.split('::'); const h = head ? head.split(':') : []; const t = tail ? tail.split(':') : []
  const groups = tail === undefined ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t]
  return groups.slice(0, 4).map((g) => g.padStart(4, '0')).join(':') + '/64'
}
function clientIp(req: Request): string {
  return ipKey(req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown')
}
function mailbox(email: string): string {   // +tags, Gmail dots and googlemail.com all land in one inbox: one budget
  let [local, domain] = email.split('@')
  local = local.split('+')[0]
  if (domain === 'googlemail.com') domain = 'gmail.com'
  if (domain === 'gmail.com') local = local.replace(/\./g, '')
  return `${local}@${domain}`
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

function welcomeHtml(): string {
  const app = APP_URL.replace(/[&<>"']/g, '')
  const body = `<p style="${EYEBROW}">Beta</p>
<h1 style="${H1}">You're in.</h1>
<p style="${P}">Thanks for joining Vault-It. The beta is open, so you can start now.</p>
<p style="${P}">Open the app and sign in with this e-mail address. We'll send you a code, then you choose a PIN.</p>
<p style="margin:0 0 22px;text-align:center"><a href="${app}" style="${BTN}">Open Vault-It</a></p>
<p style="${P};margin-bottom:0">Anything confusing or broken, just reply to this e-mail.<br>Pete</p>`
  const footer = `You're getting this because this address joined the Vault-It waitlist. To be removed, reply "remove".<br>${TRADER}`
  return brandShell("You're in: your Vault-It beta link", body, footer)
}
const welcomeText = () => `You're in.\n\nThanks for joining Vault-It. The beta is open, so you can start now.\n\nOpen the app and sign in with this e-mail address. We'll send you a code, then you choose a PIN.\n\n${APP_URL}\n\nAnything confusing or broken, just reply to this e-mail.\nPete\n\nYou're getting this because this address joined the Vault-It waitlist. To be removed, reply "remove".\n\nNot regulated by the FCA. Not financial advice.\nVault-It is run by PT Live Design, A57, 11 St Mary's Street, Lincoln LN5 7EQ`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  if (!SUPABASE_SERVICE_KEY) return json({ error: 'server' }, 500)

  let email: string
  try {
    const body = await req.json()
    email = String(body.email ?? '').trim().toLowerCase()
  } catch { return json({ error: 'bad_request' }, 400) }
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, 400)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  // 0 = allowed, otherwise seconds to wait; a limiter outage lets the request through (logged) rather than losing sign-ups
  const limited = async (scope: string, id: string, limit: number, windowSecs: number): Promise<number> => {
    try {
      const { data, error } = await admin.rpc('rate_hit', { p_key: await keyOf(scope, id), p_limit: limit, p_window_secs: windowSecs })
      if (error) { console.error('rate_hit failed:', error.message); return 0 }
      const row = Array.isArray(data) ? data[0] : data
      return row && row.allowed === false ? Math.max(1, Number(row.retry_after) || 60) : 0
    } catch (e) { console.error('rate_hit threw:', e); return 0 }
  }
  const wait = (await limited('wl-ip', clientIp(req), LIMIT_IP_PER_HOUR, 3600))
            || (await limited('wl-all', 'all', LIMIT_GLOBAL_PER_HOUR, 3600))
            || (await limited('wl-addr', mailbox(email), LIMIT_ADDR_PER_DAY, 86400))
  if (wait) return json({ error: 'rate_limited', retryAfter: wait }, 429, { 'Retry-After': String(wait) })

  const { error: insErr } = await admin.from('waitlist').insert({ email, source: 'landing' })
  if (insErr && insErr.code !== '23505') { console.error('waitlist insert failed:', insErr.message); return json({ error: 'server' }, 500) }

  let emailed = false
  if (RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: WELCOME_FROM, to: [email], reply_to: REPLY_TO, subject: "You're in: your Vault-It beta link", html: welcomeHtml(), text: welcomeText() }),
        signal: AbortSignal.timeout(8000),
      })
      emailed = r.ok
      if (!r.ok) console.error('Resend error:', await r.json().catch(() => ({})))
    } catch (e) { console.error('Resend failed:', e) }
  } else console.error('RESEND_API_KEY not set: welcome e-mail skipped')

  return json({ ok: true, emailed })
})
