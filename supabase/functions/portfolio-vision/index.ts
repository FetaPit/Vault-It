// portfolio-vision — reads holdings out of a screenshot of an investing app (Trading 212 pies,
// Freetrade, Hargreaves Lansdown, Vanguard…) so users can track them without connecting a platform.
//
//   { images: [{ media_type: 'image/jpeg', data: '<base64>' }, …] }   (1–4 images)
//   → { portfolio, accountValue, holdings: [{ name, ticker, value, shares, pl, weightPct,
//                                              candidates: [{ symbol, name, exchange, type }] }] }
//
// Needs the caller's own Supabase session JWT (signed-in users only), is capped per user per day
// (migration 005_vision_usage.sql), and the screenshots are never stored. Live prices and the
// shares-from-value maths happen in the app via the stock-quotes function.
//
// Secrets: ANTHROPIC_API_KEY (required), VISION_MODEL (optional, default claude-sonnet-5-5),
//          VISION_DAILY_CAP (optional, default 30 images per user per day).
// Deploy with --no-verify-jwt (the function checks the user's token itself).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const API_KEY      = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const MODEL        = Deno.env.get('VISION_MODEL') ?? 'claude-sonnet-5-5'
const WORKSPACE    = Deno.env.get('ANTHROPIC_WORKSPACE_ID') ?? ''   // only needed when the API key is not scoped to one workspace
const DAILY_CAP    = parseInt(Deno.env.get('VISION_DAILY_CAP') ?? '30', 10) || 30
const MAX_IMAGES   = 4
const MAX_B64      = 2_800_000            // ≈ 2 MB per image after base64
const TYPES        = ['image/jpeg', 'image/png', 'image/webp']

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const TOOL = {
  name: 'report_holdings',
  description: 'Report every investment holding visible in the screenshots.',
  input_schema: {
    type: 'object',
    properties: {
      portfolio:    { type: ['string', 'null'], description: 'Name of the pie / portfolio / account if shown (e.g. "Fully Future Focused"), else null' },
      accountValue: { type: ['number', 'null'], description: 'Total account/portfolio value shown, as a plain number, else null' },
      currency:     { type: 'string', description: 'ISO currency of the values shown, e.g. GBP' },
      holdings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name:      { type: 'string', description: 'Company / fund name exactly as shown (expand obvious truncation like "Take-Two Interact…" to "Take-Two Interactive")' },
            ticker:    { type: ['string', 'null'], description: 'Yahoo Finance symbol if you are confident (AAPL, FIG, VUSA.L, VWRL.L); null if unsure' },
            value:     { type: ['number', 'null'], description: 'Current value of the position in the displayed currency (the big number on the row). null if not visible' },
            shares:    { type: ['number', 'null'], description: 'Number of shares/units ONLY if the screenshot states it, else null' },
            pl:        { type: ['number', 'null'], description: 'Profit/loss in currency on the row (negative for a loss), else null' },
            weightPct: { type: ['number', 'null'], description: 'Current allocation percentage if shown, else null' },
          },
          required: ['name', 'value'],
        },
      },
    },
    required: ['holdings'],
  },
}

const PROMPT =
  'These are screenshots of a user\'s own investment portfolio (holdings list). Extract every holding row. ' +
  'Rules: (1) Only rows that are fully visible with a value — skip rows cut off at the top or bottom edge. ' +
  '(2) Screenshots may overlap (scrolled list): never list the same holding twice. ' +
  '(3) Numbers are plain numbers: "£1,619.66" → 1619.66, "-£2.26 (41.17%)" → pl -2.26. ' +
  '(4) Do not invent share counts; give shares only if printed. (5) Give a Yahoo Finance ticker only when you are confident. ' +
  'Call the report_holdings tool exactly once with everything you found. Do not answer in prose.'

async function candidates(name: string, hint: string | null) {
  const out: { symbol: string; name: string; exchange: string; type: string }[] = []
  const push = (c: typeof out[number]) => { if (c.symbol && !out.some((o) => o.symbol === c.symbol)) out.push(c) }
  if (hint && /^[A-Z0-9.\-^=]{1,15}$/.test(hint.toUpperCase())) push({ symbol: hint.toUpperCase(), name, exchange: '', type: '' })
  try {
    const r = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(name)}&quotesCount=8&newsCount=0&listsCount=0`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VaultIt/1.0)', Accept: 'application/json' } },
    )
    if (r.ok) {
      const j = await r.json()
      for (const q of j?.quotes ?? []) {
        if (!['EQUITY', 'ETF', 'MUTUALFUND'].includes(q.quoteType)) continue
        push({ symbol: String(q.symbol), name: String(q.shortname ?? q.longname ?? q.symbol), exchange: String(q.exchDisp ?? q.exchange ?? ''), type: String(q.quoteType) })
      }
    }
  } catch { /* the model's own guess (if any) is still returned */ }
  return out.slice(0, 5)
}

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')    return json({ error: 'method' }, 405)
  if (!API_KEY || !SERVICE_KEY) return json({ error: 'not_configured' }, 503)

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: u, error: uerr } = jwt ? await admin.auth.getUser(jwt) : { data: null, error: true }
  if (uerr || !u?.user?.id) return json({ error: 'auth' }, 401)

  let body: { images?: { media_type?: string; data?: string }[] }
  try { body = await req.json() } catch { return json({ error: 'bad_request' }, 400) }
  const images = (Array.isArray(body.images) ? body.images : []).slice(0, MAX_IMAGES)
  if (!images.length) return json({ error: 'no_images' }, 400)
  for (const im of images) {
    if (!TYPES.includes(String(im.media_type)) || typeof im.data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(im.data)) return json({ error: 'bad_image' }, 400)
    if (im.data.length > MAX_B64) return json({ error: 'too_large' }, 413)
  }

  const { data: allowed } = await admin.rpc('vision_take', { p_user: u.user.id, p_cost: images.length, p_max: DAILY_CAP })
  if (allowed === false) return json({ error: 'limit', message: 'Daily screenshot limit reached — try again tomorrow.' }, 429)

  // a read that produced nothing doesn't count against the daily allowance
  const refund = async () => { try { await admin.rpc('vision_take', { p_user: u.user.id, p_cost: -images.length, p_max: DAILY_CAP }) } catch { /* best effort */ } }
  let result: any
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(WORKSPACE ? { 'anthropic-workspace-id': WORKSPACE } : {}) },
      body: JSON.stringify({
        model: MODEL, max_tokens: 4096,
        tools: [TOOL],   // newer models reject a forced tool_choice, so the prompt asks for the tool call and a JSON reply is accepted as a fallback
        messages: [{ role: 'user', content: [
          ...images.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.media_type, data: im.data } })),
          { type: 'text', text: PROMPT },
        ] }],
      }),
    })
    if (!r.ok) {
      // surface WHY (never the key): Anthropic's own error type/message, e.g. invalid key, no credit, bad model
      let detail = ''
      try { const e = await r.json(); detail = String(e?.error?.message ?? e?.error?.type ?? '').slice(0, 200) } catch { /* no body */ }
      console.error('anthropic', r.status, detail)
      await refund()
      return json({ error: 'vision_failed', upstream: r.status, detail }, 502)
    }
    const j = await r.json()
    result = (j?.content ?? []).find((c: any) => c.type === 'tool_use')?.input
    if (!result) {   // fallback: a JSON object in a text reply
      const txt = (j?.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
      const m = txt.match(/\{[\s\S]*\}/)
      if (m) { try { result = JSON.parse(m[0]) } catch { /* unreadable */ } }
    }
  } catch (e) { console.error('anthropic fetch failed', String(e)); await refund(); return json({ error: 'vision_failed', detail: 'could not reach the AI service' }, 502) }
  if (!result || !Array.isArray(result.holdings)) { await refund(); return json({ error: 'unreadable' }, 422) }

  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null)
  const rows = result.holdings.filter((h: any) => h && typeof h.name === 'string' && h.name.trim()).slice(0, 60)
  const holdings = await Promise.all(rows.map(async (h: any) => ({
    name: String(h.name).trim().slice(0, 80),
    ticker: typeof h.ticker === 'string' ? h.ticker.trim().toUpperCase() || null : null,
    value: num(h.value), shares: num(h.shares), pl: num(h.pl), weightPct: num(h.weightPct),
    candidates: await candidates(String(h.name).trim(), typeof h.ticker === 'string' ? h.ticker.trim() : null),
  })))
  return json({
    portfolio: typeof result.portfolio === 'string' ? result.portfolio.slice(0, 40) : null,
    accountValue: num(result.accountValue), currency: typeof result.currency === 'string' ? result.currency : 'GBP',
    holdings,
  })
}

Deno.serve(handle)
