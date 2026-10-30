// waitlist-join — the beta list behind vault-it.co/sign-up, with double opt-in.
//   POST {action:'join', email, testing, marketing, consentVersion, source, utm:{source,medium,campaign,content}, referrer, captchaToken}
//        → stores a PENDING request (migration 009) and e-mails a confirmation link; nothing counts until the owner of the address clicks it
//   POST {action:'confirm', token}        → confirms the address and applies the choices made at sign-up (the consent record)
//   POST {action:'unsubscribe', id, sig}  → leaves the list; the link is signed, so nobody can unsubscribe someone else
// Every answer to 'join' is the same whether or not the address was already on the list, so the form cannot be used to test addresses.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const FROM_EMAIL            = Deno.env.get('FROM_EMAIL') ?? 'Vault-It <onboarding@resend.dev>'
const SITE_URL              = (Deno.env.get('SITE_URL') ?? 'https://vault-it.co/').replace(/\/?$/, '/')
const TURNSTILE_SECRET      = Deno.env.get('TURNSTILE_SECRET') ?? ''     // unset = no human check yet
const TURNSTILE_HOSTS       = (Deno.env.get('WAITLIST_TURNSTILE_HOSTNAMES') ?? 'vault-it.co').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
const PEPPER                = Deno.env.get('PIN_PEPPER') ?? SUPABASE_SERVICE_KEY   // salts the limiter keys and signs unsubscribe links
// The wording of the optional marketing box the person saw. Bump it whenever the text on the page changes, so the record says what they agreed to.
const CONSENT_VERSIONS      = ['signup-2026-10-27']

const num = (k: string, d: number) => { const n = parseInt(Deno.env.get(k) ?? '', 10); return n > 0 ? n : d }
const LIMIT_IP_PER_HOUR     = num('RATE_WAITLIST_IP_PER_HOUR', 30)       // a room of people at an event shares one IP
const LIMIT_EMAIL_PER_HOUR  = num('RATE_WAITLIST_EMAIL_PER_HOUR', 3)     // stops one inbox being flooded with confirmation mails
const LIMIT_GLOBAL_PER_HOUR = num('RATE_WAITLIST_GLOBAL_PER_HOUR', 300)  // protects the shared e-mail quota (sign-in codes use it too)
const EMAIL_RE              = /^[A-Za-z0-9._%+'-]{1,64}@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/
const TAG_RE                = /[^A-Za-z0-9 _.\-+|]/g

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', ...extra } })

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
const tag = (v: unknown, max = 100) => (typeof v === 'string' ? v.replace(TAG_RE, '').trim().slice(0, max) : '')

async function sign(id: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('waitlist-unsub|' + id))).slice(0, 32)
}
function sameText(a: string, b: string): boolean {   // constant-time for equal lengths
  if (a.length !== b.length) return false
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}
export async function unsubscribeUrl(id: string): Promise<string> {
  return `${SITE_URL}sign-up/unsubscribe?u=${encodeURIComponent(id)}&s=${await sign(id)}`
}

// ── limits (same mechanism as send-auth-email: migration 008's rate_hit, keys are salted hashes)
async function limited(admin: ReturnType<typeof createClient>, scope: string, id: string, limit: number, windowSecs: number): Promise<number> {
  try {
    const { data, error } = await admin.rpc('rate_hit', { p_key: scope + ':' + (await sha256(`${PEPPER}|${scope}|${id}`)).slice(0, 32), p_limit: limit, p_window_secs: windowSecs })
    if (error) { console.error('rate_hit failed:', error.message); return 0 }
    const row = Array.isArray(data) ? data[0] : data
    return row && row.allowed === false ? Math.max(1, Number(row.retry_after) || 60) : 0
  } catch (e) { console.error('rate_hit threw:', e); return 0 }
}
function ipKey(ip: string): string {
  const m4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i); if (m4) return m4[1]
  if (!ip.includes(':')) return ip
  const [head, tail] = ip.split('::'); const h = head ? head.split(':') : []; const t = tail ? tail.split(':') : []
  const groups = tail === undefined ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t]
  return groups.slice(0, 4).map((g) => g.padStart(4, '0')).join(':') + '/64'
}
const rawIp = (req: Request) => req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
function mailbox(email: string): string {
  let [local, domain] = email.split('@')
  local = local.split('+')[0]
  if (domain === 'googlemail.com') domain = 'gmail.com'
  if (domain === 'gmail.com') local = local.replace(/\./g, '')
  return `${local}@${domain}`
}
async function verifyTurnstile(token: string, ip: string): Promise<'ok' | 'fail' | 'unreachable' | 'misconfigured'> {
  try {
    const form = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token })
    if (ip && ip !== 'unknown') form.set('remoteip', ip)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form, signal: AbortSignal.timeout(4000) })
    if (!res.ok) { console.error('turnstile siteverify HTTP', res.status); return 'unreachable' }
    const j = await res.json()
    const codes: string[] = Array.isArray(j['error-codes']) ? j['error-codes'] : []
    if (j.success === true) return TURNSTILE_HOSTS.length && !TURNSTILE_HOSTS.includes(String(j.hostname ?? '').toLowerCase()) ? 'fail' : 'ok'
    if (codes.some((c) => c === 'invalid-input-secret' || c === 'missing-input-secret')) { console.error('turnstile secret rejected:', codes.join(',')); return 'misconfigured' }
    if (codes.includes('internal-error')) return 'unreachable'
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

function confirmHtml(email: string, link: string, unsub: string, testing: boolean): string {
  const e = esc(email), l = esc(link), u = esc(unsub)
  const body = `<p style="${EYEBROW}">Beta list</p>
<h1 style="${H1}">One click to confirm</h1>
<p style="${P}">Someone (hopefully you) asked to join the Vault-It beta list with <strong style="color:#E8E8E8">${e}</strong>.${testing ? ' Confirm and we will send you the link to start testing.' : ''}</p>
<p style="margin:0 0 22px;text-align:center"><a href="${l}" style="${BTN}">Confirm my place</a></p>
<p style="${SMALL}">The link works for 7 days. If you did not ask for this, ignore this e-mail: you will not hear from us again and the request is deleted after 30 days.</p>`
  const footer = `${TRADER} · <a href="${u}" style="color:#44C0B9">Remove me from the list</a>`
  return brandShell('Confirm your place on the Vault-It beta list', body, footer)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  if (!SUPABASE_SERVICE_KEY || !RESEND_API_KEY) return json({ error: 'not_configured' }, 500)

  let body: Record<string, unknown>
  try { body = await req.json(); if (!body || typeof body !== 'object') throw new Error('shape') } catch { return json({ error: 'bad_request' }, 400) }
  const action = body.action ?? 'join'
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const ip = ipKey(rawIp(req))

  if (action === 'confirm') {
    const token = typeof body.token === 'string' ? body.token : ''
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return json({ error: 'invalid_link' }, 400)
    const wait = await limited(admin, 'wl-act-ip', ip, 60, 3600)
    if (wait) return json({ error: 'rate_limited', retryAfter: wait }, 429, { 'Retry-After': String(wait) })
    const { data, error } = await admin.rpc('waitlist_confirm', { p_confirm_hash: await sha256(token) })
    if (error) { console.error('waitlist_confirm failed:', error.message); return json({ error: 'server' }, 500) }
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return json({ error: 'invalid_link' }, 410)     // unknown, used or expired
    return json({ success: true, testing: !!row.wants_testing, unsubscribe: await unsubscribeUrl(String(row.id)) })
  }

  if (action === 'unsubscribe') {
    const id = typeof body.id === 'string' ? body.id : '', sig = typeof body.sig === 'string' ? body.sig : ''
    if (!/^[0-9a-f-]{36}$/i.test(id) || !sameText(sig, await sign(id))) return json({ error: 'invalid_link' }, 400)
    const wait = await limited(admin, 'wl-act-ip', ip, 60, 3600)
    if (wait) return json({ error: 'rate_limited', retryAfter: wait }, 429, { 'Retry-After': String(wait) })
    const { error } = await admin.rpc('waitlist_unsubscribe', { p_id: id })
    if (error) { console.error('waitlist_unsubscribe failed:', error.message); return json({ error: 'server' }, 500) }
    return json({ success: true })   // also when the row is already gone: either way they are off the list
  }

  if (action !== 'join') return json({ error: 'bad_request' }, 400)
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return json({ error: 'invalid_email' }, 400)
  const marketing = body.marketing === true, testing = body.testing === true
  const consentVersion = typeof body.consentVersion === 'string' && CONSENT_VERSIONS.includes(body.consentVersion) ? body.consentVersion : CONSENT_VERSIONS[0]
  const utm = (body.utm && typeof body.utm === 'object') ? body.utm as Record<string, unknown> : {}
  let referrer = ''
  try { if (typeof body.referrer === 'string' && body.referrer) { const u = new URL(body.referrer); if (u.protocol === 'https:' || u.protocol === 'http:') referrer = u.origin.slice(0, 200) } } catch { /* not a URL: dropped */ }
  const source = tag(body.source, 40) || 'sign-up'
  const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken.slice(0, 2048) : ''

  // Same order as send-auth-email: the bounded per-IP counter, then the human check, and only then the shared counters,
  // so a script that cannot pass Turnstile cannot use up everyone's allowance.
  let wait = await limited(admin, 'wl-ip', ip, LIMIT_IP_PER_HOUR, 3600)
  if (!wait && TURNSTILE_SECRET) {
    const verdict = captchaToken ? await verifyTurnstile(captchaToken, rawIp(req)) : 'fail'
    if (verdict === 'fail') return json({ error: 'captcha' }, 403)
    if (verdict === 'unreachable') return json({ error: 'captcha_unavailable', retryAfter: 30 }, 503, { 'Retry-After': '30' })
  }
  wait = wait || (await limited(admin, 'wl-all', 'all', LIMIT_GLOBAL_PER_HOUR, 3600)) || (await limited(admin, 'wl-addr', mailbox(email), LIMIT_EMAIL_PER_HOUR, 3600))
  if (wait) return json({ error: 'rate_limited', retryAfter: wait }, 429, { 'Retry-After': String(wait) })

  const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const { data: id, error } = await admin.rpc('waitlist_request', {
    p_email: email, p_testing: testing, p_marketing: marketing, p_consent_version: consentVersion, p_confirm_hash: await sha256(token),
    p_source: source, p_utm_source: tag(utm.source), p_utm_medium: tag(utm.medium), p_utm_campaign: tag(utm.campaign), p_utm_content: tag(utm.content), p_referrer: referrer,
  })
  if (error || !id) { console.error('waitlist_request failed:', error?.message); return json({ error: 'server' }, 500) }

  const link = `${SITE_URL}sign-up/confirm?t=${token}`
  const unsub = await unsubscribeUrl(String(id))
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL, to: [email], subject: 'Confirm your place on the Vault-It beta list',
      html: confirmHtml(email, link, unsub, testing),
      text: `Confirm your place on the Vault-It beta list: ${link}\n\nThe link works for 7 days. If you did not ask for this, ignore this e-mail.\nRemove me: ${unsub}\n\nVault-It is run by PT Live Design, A57, 11 St Mary's Street, Lincoln LN5 7EQ · hello@vault-it.co\nNot regulated by the FCA. Not financial advice.`,
      headers: { 'List-Unsubscribe': `<${unsub}>` },
    }),
  })
  if (!res.ok) { console.error('Resend error:', await res.json().catch(() => ({}))); return json({ error: 'mail' }, 502) }
  return json({ success: true })
})
