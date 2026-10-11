// pin-auth — email + PIN sign-in for returning users, on any device.
//
//   { action: 'status', email }            → { pin: boolean }
//   { action: 'set',    pin }              → { ok }            (needs the user's own session JWT)
//   { action: 'remove' }                   → { ok }            (needs the user's own session JWT)
//   { action: 'login',  email, pin }       → { ok, token }  |  { error: 'invalid'|'locked', ... }
//
// A successful login returns a one-time email OTP which the client exchanges for a real Supabase
// session with auth.verifyOtp({ email, token, type: 'email' }). The OTP is only ever released
// after the PIN has been verified here, server-side.
//
// Security: PINs are 6 digits, stored as PBKDF2-SHA256(pin | server secret, per-user salt).
// Attempts are reserved atomically in the database BEFORE the PIN is checked (5 tries, then a
// 15 min lock that doubles every further 5), unknown e-mails take the same time and give the same
// answer as a wrong PIN, and the table is unreachable for clients (RLS on, grants revoked).
// Deploy with --no-verify-jwt (the app calls it with its public key).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const PEPPER       = Deno.env.get('PIN_PEPPER') ?? SERVICE_KEY   // never stored in the database
const ITERATIONS   = 120_000
const MIN_MS       = 350                                         // uniform response time
const PIN_RE       = /^\d{6}$/
const EMAIL_RE     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')    return json({ error: 'method' }, 405)
  if (!SERVICE_KEY)             return json({ error: 'server' }, 500)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'bad_request' }, 400) }
  const action = String(body.action ?? '')
  const email  = String(body.email ?? '').trim().toLowerCase()
  const pin    = String(body.pin ?? '')
  const admin  = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  // ── who is calling (for set / remove) ──
  const userFromJwt = async () => {
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!jwt) return null
    const { data, error } = await admin.auth.getUser(jwt)
    return error || !data?.user?.email ? null : data.user
  }

  if (action === 'status') {
    if (!EMAIL_RE.test(email)) return json({ pin: false })
    const { data } = await admin.from('user_pins').select('user_id').eq('email', email).maybeSingle()
    return json({ pin: !!data })
  }

  if (action === 'set') {
    const user = await userFromJwt()
    if (!user)               return json({ error: 'auth' }, 401)
    if (!PIN_RE.test(pin))   return json({ error: 'pin_format' }, 400)
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
    await admin.from('user_pins').delete().eq('user_id', user.id)
    return json({ ok: true })
  }

  if (action === 'login') {
    const t0 = Date.now()
    const pad = async () => { const left = MIN_MS - (Date.now() - t0); if (left > 0) await sleep(left) }
    if (!EMAIL_RE.test(email) || !PIN_RE.test(pin)) { await derive('000000', DUMMY_SALT); await pad(); return json({ error: 'invalid' }, 401) }

    const { data: rows } = await admin.rpc('pin_begin_attempt', { p_email: email })
    const row = Array.isArray(rows) ? rows[0] : rows
    if (!row) { await derive(pin, DUMMY_SALT); await pad(); return json({ error: 'invalid' }, 401) }   // unknown e-mail: same answer + timing

    if (row.locked_secs > 0) { await pad(); return json({ error: 'locked', retryAfter: row.locked_secs }, 429) }

    const ok = sameHex(await derive(pin, unhex(row.salt), row.iterations), row.pin_hash)
    if (!ok) {
      await pad()
      // the 5th wrong try (and every 5th after) has just locked the account: 15 min, doubling, max 24 h
      if (row.attempts % 5 === 0) return json({ error: 'locked', retryAfter: Math.min(1440, 15 * 2 ** (row.attempts / 5 - 1)) * 60 }, 429)
      return json({ error: 'invalid', remaining: 5 - (row.attempts % 5) }, 401)
    }

    await admin.rpc('pin_reset_attempts', { p_user: row.user_id })
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    const token = data?.properties?.email_otp
    await pad()
    return error || !token ? json({ error: 'server' }, 500) : json({ ok: true, token })
  }

  return json({ error: 'bad_request' }, 400)
}

Deno.serve(handle)
