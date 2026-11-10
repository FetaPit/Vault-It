// pin-auth — email + PIN sign-in for returning users, on any device.
//
//   { action: 'status', email }            → { pin: boolean }
//   { action: 'set',    pin, current? }    → { ok }            (JWT + re-authentication, see below)
//   { action: 'remove', current? }         → { ok }            (JWT + re-authentication, see below)
//   { action: 'login',  email, pin }       → { ok, token }  |  { error: 'invalid'|'locked'|'rate_limited', ... }
//   { action: 'delete', pin? }             → { ok }            (needs the user's own session JWT; erases the account)
//
// A successful login returns a one-time email OTP which the client exchanges for a real Supabase
// session with auth.verifyOtp({ email, token, type: 'email' }). The OTP is only ever released
// after the PIN has been verified here, server-side.
//
// Security: PINs are 6 digits, stored as PBKDF2-SHA256(pin | server secret, per-user salt).
// Attempts are reserved atomically in the database BEFORE the PIN is checked (5 tries, then a
// 15 min lock that doubles every further 5), unknown e-mails take the same time and give the same
// answer as a wrong PIN, and the table is unreachable for clients (RLS on, grants revoked).
// 'status' and 'login' are also metered per IP (migration 008) so the endpoint cannot be used to
// enumerate e-mail addresses or to spread guesses across many accounts from one machine.
// 'delete' re-checks the PIN (same lockout) — or, for an account without a PIN, requires a sign-in
// within the last 15 minutes — before erasing the account and everything stored about it.
// 'set' / 'remove' are credential changes, so a session token alone is not enough either: they need a sign-in
// within the last 15 minutes (covers first-time set after the e-mail code, and 'forgot PIN') or the CURRENT PIN
// (`current`, same lockout). Without this a stolen token could install its own PIN and then pass 'delete'.
// New PINs must not be trivially guessable (all-same, runs, repeats, a short list of the most common).
// Deploy with --no-verify-jwt (the app calls it with its public key).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const PEPPER       = Deno.env.get('PIN_PEPPER') ?? SERVICE_KEY   // never stored in the database
const ITERATIONS   = 120_000
const MIN_MS       = 350                                         // uniform response time
const PIN_RE       = /^\d{6}$/
const EMAIL_RE     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const num = (k: string, d: number) => { const n = parseInt(Deno.env.get(k) ?? '', 10); return n > 0 ? n : d }
// a room of testers shares one public IP, so these are generous; they stop scripts, not people
const LIMIT_STATUS_PER_IP = num('RATE_PIN_STATUS_PER_10MIN', 300)
const LIMIT_LOGIN_PER_IP  = num('RATE_PIN_LOGIN_PER_10MIN', 60)
const LIMIT_DELETE_PER_IP = num('RATE_PIN_DELETE_PER_HOUR', 10)
const RECENT_LOGIN_SECS   = 15 * 60

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const enc = new TextEncoder()
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const unhex = (h: string) => new Uint8Array((h.match(/.{2}/g) ?? []).map((x) => parseInt(x, 16)))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function derive(pin: string, salt: Uint8Array, iterations = ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(`${pin}|${PEPPER}`), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256))
}
function sameHex(a: string, b: string): boolean {            // constant-time compare
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}
const DUMMY_SALT = new Uint8Array(16)

// Refuse PINs an attacker would try first (they get 5 free guesses per account before any lock).
const COMMON_PINS = new Set(['123456', '654321', '112233', '123321', '159753', '147258', '258369', '789456', '987654', '100000', '111222', '222333',
  '112358', '142536', '102030', '010203', '123654', '321123', '159357', '246810', '666888', '888999', '998877', '987123', '121314', '654123',
  '520520', '521521', '007007', '000001', '777888', '456123', '741852', '963852', '852456', '147852', '369258', '123789', '321654', '999000'])
function weakPin(p: string): boolean {
  if (/^(\d)\1{5}$/.test(p)) return true                               // 000000
  if (/^(\d\d)\1\1$/.test(p) || /^(\d\d\d)\1$/.test(p)) return true     // 121212, 123123
  const d = [...p].map(Number)
  if (d.every((x, i) => i === 0 || x === (d[i - 1] + 1) % 10)) return true   // 123456, 456789, 890123
  if (d.every((x, i) => i === 0 || x === (d[i - 1] + 9) % 10)) return true   // 654321, 321098
  return COMMON_PINS.has(p)
}
// Rate-limit key for an address: IPv4 as is, IPv6 as its /64 (a single customer controls the whole /64, so per-address keys are free to rotate).
function ipKey(ip: string): string {
  const m4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i); if (m4) return m4[1]
  if (!ip.includes(':')) return ip
  const [head, tail] = ip.split('::'); const h = head ? head.split(':') : []; const t = tail ? tail.split(':') : []
  const groups = tail === undefined ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t]
  return groups.slice(0, 4).map((g) => g.padStart(4, '0')).join(':') + '/64'
}

async function keyOf(scope: string, id: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${PEPPER}|${scope}|${id}`))
  return scope + ':' + hex(d).slice(0, 32)
}
function clientIp(req: Request): string {
  return ipKey(req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown')
}

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')    return json({ error: 'method' }, 405)
  if (!SERVICE_KEY)             return json({ error: 'server' }, 500)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'bad_request' }, 400) }
  const action = String(body.action ?? '')
  const email  = String(body.email ?? '').trim().toLowerCase()
  const pin    = String(body.pin ?? '')
  const current = String(body.current ?? '')
  const admin  = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  // 0 = allowed, otherwise seconds to wait. If the limiter itself is down we let the request through and log it
  // (the per-account lockout below still protects every PIN).
  const limited = async (scope: string, id: string, limit: number, windowSecs: number): Promise<number> => {
    try {
      const { data, error } = await admin.rpc('rate_hit', { p_key: await keyOf(scope, id), p_limit: limit, p_window_secs: windowSecs })
      if (error) { console.error('rate_hit failed:', error.message); return 0 }
      const row = Array.isArray(data) ? data[0] : data
      return row && row.allowed === false ? Math.max(1, Number(row.retry_after) || 60) : 0
    } catch (e) { console.error('rate_hit threw:', e); return 0 }
  }
  const tooMany = (wait: number) => new Response(JSON.stringify({ error: 'rate_limited', retryAfter: wait }),
    { status: 429, headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': String(wait) } })

  // ── who is calling (for set / remove / delete) ──
  const userFromJwt = async () => {
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!jwt) return null
    const { data, error } = await admin.auth.getUser(jwt)
    return error || !data?.user?.email ? null : data.user
  }

  const freshLogin = (u: { last_sign_in_at?: string }) => Date.parse(u.last_sign_in_at ?? '') > Date.now() - RECENT_LOGIN_SECS * 1000

  // Check a PIN for an e-mail, spending one attempt BEFORE comparing (so parallel guesses cannot beat the lockout).
  // Unknown e-mails take the same time and give the same answer as a wrong PIN.
  type PinResult = { ok: true; userId: string } | { ok: false; res: Response }
  const checkPin = async (mail: string, candidate: string): Promise<PinResult> => {
    const t0 = Date.now()
    const pad = async () => { const left = MIN_MS - (Date.now() - t0); if (left > 0) await sleep(left) }
    const fail = async (body: unknown, status: number): Promise<PinResult> => { await pad(); return { ok: false, res: json(body, status) } }
    if (!EMAIL_RE.test(mail) || !PIN_RE.test(candidate)) { await derive('000000', DUMMY_SALT); return fail({ error: 'invalid' }, 401) }

    const { data: rows } = await admin.rpc('pin_begin_attempt', { p_email: mail })
    const row = Array.isArray(rows) ? rows[0] : rows
    if (!row) { await derive(candidate, DUMMY_SALT); return fail({ error: 'invalid' }, 401) }   // unknown e-mail: same answer + timing

    if (row.locked_secs > 0) return fail({ error: 'locked', retryAfter: row.locked_secs }, 429)

    if (!sameHex(await derive(candidate, unhex(row.salt), row.iterations), row.pin_hash)) {
      // the 5th wrong try (and every 5th after) has just locked the account: 15 min, doubling, max 24 h
      if (row.attempts % 5 === 0) return fail({ error: 'locked', retryAfter: Math.min(1440, 15 * 2 ** (row.attempts / 5 - 1)) * 60 }, 429)
      return fail({ error: 'invalid', remaining: 5 - (row.attempts % 5) }, 401)
    }
    await admin.rpc('pin_reset_attempts', { p_user: row.user_id })
    return { ok: true, userId: row.user_id }
  }

  // Credential changes need more than a session token: a sign-in within the last 15 minutes, or the CURRENT PIN.
  // Returns null when allowed, otherwise the refusal to send.
  const reauth = async (user: { id: string; email?: string; last_sign_in_at?: string }): Promise<Response | null> => {
    if (freshLogin(user)) return null
    const { data: row } = await admin.from('user_pins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!row) return json({ error: 'recent_login' }, 403)           // no PIN to check: the sign-in itself must be fresh
    if (!PIN_RE.test(current)) return json({ error: 'reauth' }, 403) // has a PIN: it must be supplied
    const r = await checkPin(user.email!.toLowerCase(), current)    // wrong guesses count towards the same lockout as sign-in
    if (!r.ok) return r.res
    return r.userId === user.id ? null : json({ error: 'auth' }, 401)
  }

  if (action === 'status') {
    { const w = await limited('pin-status', clientIp(req), LIMIT_STATUS_PER_IP, 600); if (w) return tooMany(w) }
    if (!EMAIL_RE.test(email)) return json({ pin: false })
    const { data } = await admin.from('user_pins').select('user_id').eq('email', email).maybeSingle()
    return json({ pin: !!data })
  }

  if (action === 'set') {
    const user = await userFromJwt()
    if (!user)               return json({ error: 'auth' }, 401)
    if (!PIN_RE.test(pin))   return json({ error: 'pin_format' }, 400)
    if (weakPin(pin))        return json({ error: 'pin_weak' }, 400)
    { const no = await reauth(user); if (no) return no }
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const { error } = await admin.from('user_pins').upsert({
      user_id: user.id, email: user.email!.toLowerCase(), pin_hash: await derive(pin, salt), salt: hex(salt),
      iterations: ITERATIONS, failed_attempts: 0, locked_until: null, last_attempt_at: null, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    return error ? json({ error: 'server' }, 500) : json({ ok: true })
  }

  if (action === 'remove') {
    const user = await userFromJwt()
    if (!user) return json({ error: 'auth' }, 401)
    { const no = await reauth(user); if (no) return no }
    await admin.from('user_pins').delete().eq('user_id', user.id)
    return json({ ok: true })
  }

  if (action === 'login') {
    { const w = await limited('pin-login', clientIp(req), LIMIT_LOGIN_PER_IP, 600); if (w) return tooMany(w) }
    const t0 = Date.now()
    const pad = async () => { const left = MIN_MS - (Date.now() - t0); if (left > 0) await sleep(left) }
    const r = await checkPin(email, pin)
    if (!r.ok) return r.res

    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    const token = data?.properties?.email_otp
    await pad()
    return error || !token ? json({ error: 'server' }, 500) : json({ ok: true, token })
  }

  if (action === 'delete') {
    // Erase the account and everything stored about it. Irreversible, so re-prove who is asking.
    const user = await userFromJwt()
    if (!user) return json({ error: 'auth' }, 401)
    { const w = await limited('pin-delete', clientIp(req), LIMIT_DELETE_PER_IP, 3600); if (w) return tooMany(w) }
    const mail = user.email!.toLowerCase()

    const { data: pinRow } = await admin.from('user_pins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (pinRow) {
      const r = await checkPin(mail, pin)                      // wrong PINs count towards the same lockout as sign-in
      if (!r.ok) return r.res
      if (r.userId !== user.id) return json({ error: 'auth' }, 401)
    } else {
      // no PIN to re-check: the sign-in itself must be fresh
      if (!freshLogin(user)) return json({ error: 'recent_login' }, 403)
    }

    const { error: eraseErr } = await admin.rpc('erase_user_data', { p_user: user.id, p_email: mail })
    if (eraseErr) { console.error('erase_user_data failed:', eraseErr.message); return json({ error: 'server' }, 500) }
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
    // the data is already gone but the login is not: say so (a retry works — nothing is left to erase twice)
    if (delErr) { console.error('deleteUser failed:', delErr.message); return json({ error: 'partial' }, 500) }
    // belt and braces: sweep again in case anything re-archived while the login was being removed (idempotent)
    const { error: sweepErr } = await admin.rpc('erase_user_data', { p_user: user.id, p_email: mail })
    if (sweepErr) console.error('post-delete sweep failed:', sweepErr.message)
    return json({ ok: true })
  }

  return json({ error: 'bad_request' }, 400)
}

Deno.serve(handle)
