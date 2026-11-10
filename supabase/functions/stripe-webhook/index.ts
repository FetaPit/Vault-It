// stripe-webhook: the only way an account becomes paid (secure paid gateway, owner 31 Oct 2026).
//   Stripe POSTs events here. The Stripe-Signature header is checked against STRIPE_WEBHOOK_SECRET (HMAC-SHA256, 5-minute window)
//   before anything is read; then the event is applied once through stripe_apply (migration 011), which also skips stale events.
//   checkout.session.completed / async_payment_succeeded → the account in client_reference_id (the app adds it to every Payment Link)
//   customer.subscription.created / updated / deleted    → renewals, late payments and cancellations
//   Everything else is acknowledged and ignored. Test-mode events are ignored unless STRIPE_ALLOW_TEST = 1.
// Deploy with --no-verify-jwt (Stripe sends no Supabase token; the signature is the check). Secrets: STRIPE_WEBHOOK_SECRET
// (several, comma-separated, while rotating), plus the usual SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SECRETS       = (Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ALLOW_TEST    = Deno.env.get('STRIPE_ALLOW_TEST') === '1'
const TOLERANCE_S   = 300

// Live Payment Links and prices (docs/OFFER_AND_PRICING.md). The link decides the plan; the link's metadata.plan and the price are fallbacks.
const LINK_PLAN: Record<string, string> = {
  plink_1TdPyE9mgKf6HntyJ3h5SAhd: 'monthly',   // Pioneer monthly £5.99
  plink_1UWamD9mgKf6HntyUntyzIXi: 'monthly',   // Pioneer monthly, beta tester £3.99
  plink_1UWamA9mgKf6HntyEUGFyoUl: 'yearly',    // Pioneer yearly £49.99
  plink_1UWamF9mgKf6Hnty4WkoKDk4: 'yearly',    // Pioneer yearly, beta tester £21.99 (switched off 31 Oct)
  plink_1UWeLV9mgKf6HntypWOAliQr: 'yearly',    // Pioneer yearly, beta tester £39.99 (31 Oct)
  plink_1UWeLX9mgKf6Hnty371EuOTR: 'founder',   // Founding Member, beta tester £99 once (31 Oct)
  plink_1UWamU9mgKf6HntyFvzfNyKe: 'founder',   // Founding Member £149 once
  plink_1TdPyH9mgKf6Hnty9IT0ARfh: 'yearly',    // the retired £59.99 yearly link (switched off; earlier buyers)
}
const META_PLAN: Record<string, string> = {
  pioneer_monthly: 'monthly', pioneer_monthly_tester: 'monthly', pioneer_yearly: 'yearly', pioneer_yearly_tester: 'yearly',
  founding_member: 'founder', founding_member_tester: 'founder', monthly: 'monthly', yearly: 'yearly', founder: 'founder',
}
const PRICE_PLAN: Record<string, string> = {
  price_1TdPy79mgKf6Hnty9GNgtoIp: 'monthly', price_1UWalr9mgKf6Hntyo8fCeWYH: 'monthly',
  price_1UWalp9mgKf6HntyQzc6DFgy: 'yearly',  price_1UWalt9mgKf6Hntyj2Fu1WLO: 'yearly',
  price_1UWam79mgKf6HntyipUcP8oo: 'founder', price_1UWeLL9mgKf6HntydosAUcXr: 'yearly', price_1UWeLN9mgKf6Hnty3Rboi2or: 'founder',
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const te = new TextEncoder()
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('')
const same = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }

export async function verifySignature(body: string, header: string, secrets: string[], nowS = Date.now() / 1000): Promise<boolean> {
  if (!header || !secrets.length) return false
  let t = ''; const v1: string[] = []
  for (const part of header.split(',')) {
    const i = part.indexOf('='); if (i < 0) continue
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim()
    if (k === 't') t = v; else if (k === 'v1' && /^[0-9a-f]{64}$/.test(v)) v1.push(v)
  }
  if (!/^\d{1,12}$/.test(t) || !v1.length || Math.abs(nowS - Number(t)) > TOLERANCE_S) return false
  for (const s of secrets) {
    const key = await crypto.subtle.importKey('raw', te.encode(s), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const mac = hex(await crypto.subtle.sign('HMAC', key, te.encode(t + '.' + body)))
    if (v1.some((x) => same(x, mac))) return true
  }
  return false
}

const idOf = (x: unknown): string | null => typeof x === 'string' ? x : (x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string') ? (x as { id: string }).id : null
const iso = (s: unknown): string | null => typeof s === 'number' && s > 0 ? new Date(s * 1000).toISOString() : null
const json = (status: number, b: unknown) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })

// deno-lint-ignore no-explicit-any
function checkoutArgs(ev: any) {
  const s = ev.data?.object ?? {}
  if (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') return null   // bank payments: async_payment_succeeded follows
  const plan = LINK_PLAN[idOf(s.payment_link) ?? ''] ?? META_PLAN[String(s.metadata?.plan ?? '')]
    ?? (s.mode === 'payment' && (s.amount_total === 14900 || s.amount_total === 9900) && s.currency === 'gbp' ? 'founder' : null)
  if (!plan) return null                                                                         // not one of our plans
  const ref = typeof s.client_reference_id === 'string' && UUID_RE.test(s.client_reference_id) ? s.client_reference_id.toLowerCase() : null
  const created = (typeof ev.created === 'number' ? ev.created : 0)
  // until the subscription event brings the real period end: a month or a year from now, plus three days' grace
  const until = plan === 'founder' ? null : iso(created + (plan === 'yearly' ? 368 : 34) * 86400)
  const email = s.customer_details?.email ?? s.customer_email ?? null
  return { p_kind: 'checkout', p_user: ref, p_email: typeof email === 'string' ? email.toLowerCase().slice(0, 254) : null,
    p_customer: idOf(s.customer), p_sub: idOf(s.subscription), p_plan: plan, p_status: null, p_paid_until: until }
}

// deno-lint-ignore no-explicit-any
function subscriptionArgs(ev: any) {
  const o = ev.data?.object ?? {}
  const item = o.items?.data?.[0] ?? {}
  const ended = ev.type === 'customer.subscription.deleted'
  const end = o.current_period_end ?? item.current_period_end   // older API versions keep it on the subscription, newer on the item
  const price = item.price ?? item.plan ?? {}
  const plan = PRICE_PLAN[idOf(price) ?? ''] ?? META_PLAN[String(o.metadata?.plan ?? '')]
    ?? (price.recurring?.interval === 'year' || price.interval === 'year' ? 'yearly' : price.recurring?.interval === 'month' || price.interval === 'month' ? 'monthly' : null)
  return { p_kind: 'subscription', p_user: null, p_email: null, p_customer: idOf(o.customer), p_sub: idOf(o.id),
    p_plan: plan === 'founder' ? null : plan, p_status: ended ? 'canceled' : String(o.status ?? ''),
    p_paid_until: ended ? (iso(o.ended_at) ?? iso(end)) : iso(end) }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' })
  if (!SECRETS.length || !SUPABASE_URL || !SERVICE_KEY) { console.error('stripe-webhook: not configured'); return json(500, { error: 'not configured' }) }
  const body = await req.text()
  if (body.length > 512 * 1024) return json(413, { error: 'too large' })
  if (!(await verifySignature(body, req.headers.get('stripe-signature') ?? '', SECRETS))) return json(400, { error: 'bad signature' })

  // deno-lint-ignore no-explicit-any
  let ev: any; try { ev = JSON.parse(body) } catch { return json(400, { error: 'bad json' }) }
  if (typeof ev?.id !== 'string' || !/^evt_[A-Za-z0-9]+$/.test(ev.id) || typeof ev.type !== 'string') return json(400, { error: 'not an event' })
  if (ev.livemode !== true && !ALLOW_TEST) return json(200, { ignored: 'test mode' })

  let args = null
  if (ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') args = checkoutArgs(ev)
  else if (ev.type === 'customer.subscription.created' || ev.type === 'customer.subscription.updated' || ev.type === 'customer.subscription.deleted') args = subscriptionArgs(ev)
  if (!args) return json(200, { ignored: ev.type })

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const { data, error } = await admin.rpc('stripe_apply', { p_event: ev.id, p_created: iso(ev.created) ?? new Date().toISOString(), ...args })
  if (error) { console.error('stripe-webhook: stripe_apply failed', ev.id, error.message); return json(500, { error: 'not applied' }) }   // Stripe retries
  if (data === 'no_user') console.warn('stripe-webhook: no account matched', ev.id, ev.type)
  return json(200, { result: data })
})
