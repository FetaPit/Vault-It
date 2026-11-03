// secondhand-estimate: a rough second-hand price estimate for one item, from CURRENT ASKING PRICES.
// Body: { q: "Gibson Les Paul Standard", cond: "new|excellent|good|fair|poor", cat: "general|records|games|instruments" }
// Reply: { status: "ok"|"no_match"|"unavailable", ... } (shape documented in docs/LIVE_MARKET_VALUE.md, step 3).
// Deployed with --no-verify-jwt (the app calls it with the public anon key), like stock-quotes.
// Rules from docs/research/SECONDHAND_VALUATION_SOURCES.md:
//  - asking prices only, never called "sold"; a stated haircut is applied and shown, never silently
//  - nothing but derived numbers is kept (24 h in-memory cache); raw listings are dropped as soon as they are summarised
//  - at least 5 usable prices per source, otherwise that source gives no match
//  - eBay, Reverb and PriceCharting sit behind flags (SECONDHAND_EBAY / _REVERB / _PRICECHARTING = "on") plus their secrets, off until approved
//  - Discogs is on once DISCOGS_TOKEN is set
//  - no scraping, no AI model sees any marketplace data (pure arithmetic here)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const env = (k: string): string => { try { return String((globalThis as any).Deno?.env?.get(k) ?? '') } catch { return '' } }

type Cond = 'new' | 'excellent' | 'good' | 'fair' | 'poor'
type Cat = 'general' | 'records' | 'games' | 'instruments'
type Item = { title: string; price: number }
type Pull = { items: Item[]; condApplied: boolean }

const CONDS: Cond[] = ['new', 'excellent', 'good', 'fair', 'poor']
const CATS: Cat[] = ['general', 'records', 'games', 'instruments']
// visible condition factors (research doc): listings are not split by condition unless the source can filter
const COND_FACTOR: Record<Cond, number> = { new: 1, excellent: 1, good: 0.9, fair: 0.75, poor: 0.55 }
// stated asking-to-selling haircut, tunable per category, always shown in "Show working"
const HAIRCUT: Record<Cat, number> = { general: 0.10, records: 0.10, games: 0.10, instruments: 0.10 }
const MIN_N = 5
const TRIM = 0.15
const CACHE_MS = 24 * 3600 * 1000
const UA = 'VaultIt/1.0 (+https://vault-it.co; hello@vault-it.co)'

const JUNK = /\b(for (spares|parts|repair)|spares|parts only|parts|repair|faulty|broken|empty box|box only|case only|bag only|wanted|wtb|manual only|replica|fake|read description|job ?lot)\b/i

// ---------- pure arithmetic ----------
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2 }
const quant = (s: number[], p: number) => { const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo) }

export function summarise(items: Item[]) {
  const clean = items.filter(i => i && Number.isFinite(i.price) && i.price > 0 && !JUNK.test(String(i.title || '')))
  if (clean.length < MIN_N) return null
  const m0 = med(clean.map(i => i.price))
  const kept = clean.map(i => i.price).filter(p => p >= m0 * 0.1 && p <= m0 * 5).sort((a, b) => a - b)
  if (kept.length < MIN_N) return null
  const k = Math.floor(kept.length * TRIM)
  const t = kept.length - 2 * k >= 3 ? kept.slice(k, kept.length - k) : kept
  return { n: kept.length, median: med(t), q1: quant(t, 0.25), q3: quant(t, 0.75) }
}

type Src = { id: string; label: string; basis: 'asking' | 'guide'; cats: Cat[]; on: () => boolean; pull: (q: string, cond: Cond) => Promise<Pull | null> }

async function getJson(url: string, init: RequestInit = {}) {
  const r = await fetch(url, { ...init, headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers || {}) } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}
const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : 0 }

// Discogs: lowest asking price (GBP) on the releases that match the words and have copies for sale
const discogs: Src = {
  id: 'discogs', label: 'Discogs', basis: 'asking', cats: ['records'],
  on: () => !!env('DISCOGS_TOKEN') && env('SECONDHAND_DISCOGS') !== 'off',
  async pull(q) {
    const H = { Authorization: 'Discogs token=' + env('DISCOGS_TOKEN') }
    const s = await getJson('https://api.discogs.com/database/search?type=release&per_page=12&q=' + encodeURIComponent(q), { headers: H })
    const hits: { id: number; title: string }[] = (s?.results || []).slice(0, 10)
    const items: Item[] = []
    for (const h of hits) {
      try {
        const st = await getJson('https://api.discogs.com/marketplace/stats/' + h.id + '?curr_abbr=GBP', { headers: H })
        if (st && !st.blocked_from_sale && num(st.num_for_sale) > 0 && num(st.lowest_price?.value) > 0 && (st.lowest_price?.currency || 'GBP') === 'GBP') items.push({ title: h.title, price: num(st.lowest_price.value) })
      } catch { /* one release failing does not stop the rest */ }
    }
    return { items, condApplied: false }
  },
}

let ebayTok: { t: string; exp: number } | null = null
const EBAY_COND: Record<Cond, string> = { new: '1000|1500', excellent: '2750|4000', good: '5000', fair: '6000', poor: '7000' }
const ebay: Src = {
  id: 'ebay', label: 'eBay (UK)', basis: 'asking', cats: ['general', 'records', 'games', 'instruments'],
  on: () => env('SECONDHAND_EBAY') === 'on' && !!env('EBAY_CLIENT_ID') && !!env('EBAY_CLIENT_SECRET'),
  async pull(q, cond) {
    if (!ebayTok || ebayTok.exp < Date.now() + 60000) {
      const r = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + btoa(env('EBAY_CLIENT_ID') + ':' + env('EBAY_CLIENT_SECRET')), 'User-Agent': UA },
        body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
      })
      if (!r.ok) throw new Error('eBay token ' + r.status)
      const j = await r.json(); ebayTok = { t: String(j.access_token), exp: Date.now() + num(j.expires_in) * 1000 }
    }
    const f = encodeURIComponent('buyingOptions:{FIXED_PRICE},priceCurrency:GBP,conditionIds:{' + EBAY_COND[cond] + '}')
    const j = await getJson('https://api.ebay.com/buy/browse/v1/item_summary/search?limit=50&q=' + encodeURIComponent(q) + '&filter=' + f,
      { headers: { Authorization: 'Bearer ' + ebayTok!.t, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB' } })
    const items = (j?.itemSummaries || []).filter((x: any) => x?.price?.currency === 'GBP').map((x: any) => ({ title: String(x.title || ''), price: num(x.price.value) }))
    return { items, condApplied: true }
  },
}

const REVERB_COND: Record<Cond, string> = { new: 'brand-new', excellent: 'excellent', good: 'good', fair: 'fair', poor: 'poor' }
const reverb: Src = {
  id: 'reverb', label: 'Reverb', basis: 'asking', cats: ['instruments'],
  on: () => env('SECONDHAND_REVERB') === 'on',
  async pull(q, cond) {
    const j = await getJson('https://api.reverb.com/api/listings?per_page=50&currency=GBP&ships_to=GB&condition=' + REVERB_COND[cond] + '&query=' + encodeURIComponent(q),
      { headers: { 'Accept-Version': '3.0', 'Content-Type': 'application/hal+json' } })
    const items = (j?.listings || []).filter((x: any) => (x?.price?.currency || '') === 'GBP').map((x: any) => ({ title: String(x.title || x.name || ''), price: num(x.price.amount) }))
    return { items, condApplied: true }
  },
}

// PriceCharting: one price-guide figure (USD, converted at USD_GBP set by the owner). Shown beside the asking-price estimate, never inside it.
const pricecharting: Src = {
  id: 'pricecharting', label: 'PriceCharting', basis: 'guide', cats: ['games'],
  on: () => env('SECONDHAND_PRICECHARTING') === 'on' && !!env('PRICECHARTING_TOKEN') && num(env('USD_GBP')) > 0,
  async pull(q, cond) {
    const j = await getJson('https://www.pricecharting.com/api/product?t=' + encodeURIComponent(env('PRICECHARTING_TOKEN')) + '&q=' + encodeURIComponent(q))
    const pennies = cond === 'new' ? j?.['new-price'] : (cond === 'excellent' ? j?.['cib-price'] : j?.['loose-price'])
    const gbp = num(pennies) / 100 * num(env('USD_GBP'))
    return gbp > 0 ? { items: [{ title: String(j?.['product-name'] || q), price: gbp }], condApplied: true } : null
  },
}
const SOURCES: Src[] = [discogs, ebay, reverb, pricecharting]

// ---------- cache (derived numbers only) and a light guard on upstream calls ----------
const cache = new Map<string, { at: number; v: any }>()
let calls: number[] = []
const key = (q: string, c: Cond, cat: Cat) => [q.toLowerCase().replace(/\s+/g, ' '), c, cat].join('|')

export async function estimate(q: string, cond: Cond, cat: Cat) {
  const links = {
    ebay: 'https://www.ebay.co.uk/sch/i.html?LH_Sold=1&LH_Complete=1&_nkw=' + encodeURIComponent(q),
    discogs: 'https://www.discogs.com/search/?type=all&q=' + encodeURIComponent(q),
  }
  const active = SOURCES.filter(s => s.cats.includes(cat) && s.on())
  if (!active.length) return { status: 'unavailable', q, cond, cat, links }
  const k = key(q, cond, cat), hit = cache.get(k)
  if (hit && Date.now() - hit.at < CACHE_MS) return { ...hit.v, cached: true }
  const now = Date.now(); calls = calls.filter(t => now - t < 60000)
  if (calls.length >= 40) return { status: 'busy', q, cond, cat, links }
  calls.push(now)
  const haircut = HAIRCUT[cat], factor = COND_FACTOR[cond]
  const used: any[] = []
  for (const s of active) {
    let p: Pull | null = null
    try { p = await s.pull(q, cond) } catch { p = null }
    if (!p) continue
    const g = s.basis === 'guide' && p.items.length ? p.items[0].price : 0
    const sm = g > 0 ? { n: 1, median: g, q1: g, q3: g } : summarise(p.items)
    if (!sm) continue
    const f = s.basis === 'guide' ? 1 : (1 - haircut) * (p.condApplied ? 1 : factor)
    const r = (x: number) => Math.round(x * f)
    used.push({ id: s.id, label: s.label, basis: s.basis, n: sm.n, median: r(sm.median), low: r(sm.q1), high: r(sm.q3), condition: p.condApplied ? 'filtered' : 'scaled' })
  }
  const asking = used.filter(u => u.basis === 'asking'), guides = used.filter(u => u.basis === 'guide')
  let out: any
  if (!asking.length && guides.length) {
    const g = guides[0]
    out = { status: 'ok', q, cond, cat, links, value: g.median, low: g.median, high: g.median, n: 0, basis: 'a price guide', combine: 'single', haircut: 0, condFactor: 1, sources: [], guides, checked: new Date().toISOString() }
  } else if (!asking.length) out = { status: 'no_match', q, cond, cat, links, guides, checked: new Date().toISOString() }
  else {
    const meds = asking.map(u => u.median).sort((a, b) => a - b)
    const agree = asking.length >= 2 && meds[meds.length - 1] / Math.max(1, meds[0]) <= 1.25
    const top = [...asking].sort((a, b) => b.n - a.n)[0]
    const value = agree ? Math.round(med(meds)) : top.median
    const low = agree ? Math.round(med(asking.map(u => u.low))) : top.low
    const high = agree ? Math.round(med(asking.map(u => u.high))) : top.high
    out = {
      status: 'ok', q, cond, cat, links, value, low, high, n: asking.reduce((a, u) => a + u.n, 0),
      basis: 'current asking prices', combine: asking.length < 2 ? 'single' : (agree ? 'median of sources' : 'largest source'),
      haircut, condFactor: factor, sources: asking, guides, checked: new Date().toISOString(),
    }
  }
  cache.set(k, { at: Date.now(), v: out })
  if (cache.size > 300) cache.delete(cache.keys().next().value as string)
  return out
}

;(globalThis as any).Deno?.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  let b: any; try { b = await req.json() } catch { return json({ error: 'bad json' }, 400) }
  const q = String(b?.q ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  if (q.length < 2) return json({ error: 'Type what the item is first.' }, 400)
  const cond = (CONDS as string[]).includes(b?.cond) ? b.cond as Cond : 'good'
  const cat = (CATS as string[]).includes(b?.cat) ? b.cat as Cat : 'general'
  try { return json(await estimate(q, cond, cat)) } catch { return json({ status: 'error' }, 200) }
})
