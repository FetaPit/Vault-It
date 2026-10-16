// stock-quotes — read-only live price lookup for Vault·It's Stocks & Funds tab.
// Body: { symbols: ["VUSA.L", "AAPL", ...] }  →  { quotes: { "AAPL": { price, currency, name, changePct } } }
// History:  { history: { symbols: [...], range: '1mo'|'3mo'|'6mo'|'1y'|'5y'|'max' } } → { series: { SYM: { currency, t: [unix…], c: [close…] } } }
// Search:   { search: 'blockchain etf' | 'IE00BYZK4552' | 'VUSA' } → { results: [{ symbol, name, exchange, type }] }   (shares, ETFs and funds)
// Deployed with --no-verify-jwt (the app calls it with the public anon key). Max 30 symbols per call.

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

async function quote(sym: string) {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VaultIt/1.0)', 'Accept': 'application/json' } },
    )
    if (!r.ok) return null
    const j = await r.json()
    const m = j?.chart?.result?.[0]?.meta
    if (!m || !(m.regularMarketPrice > 0)) return null
    const prev = m.chartPreviousClose ?? m.previousClose
    return {
      price: m.regularMarketPrice as number,
      currency: (m.currency ?? 'USD') as string,   // note: LSE quotes come back in "GBp" (pence)
      name: (m.shortName ?? m.longName ?? sym) as string,
      changePct: prev > 0 ? ((m.regularMarketPrice - prev) / prev) * 100 : 0,
      symbol: (m.symbol ?? sym) as string,
    }
  } catch {
    return null
  }
}


const RANGES: Record<string, string> = { '1mo': '1d', '3mo': '1d', '6mo': '1d', '1y': '1d', '5y': '1wk', 'max': '1mo' }

async function history(sym: string, range: string) {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${RANGES[range]}&range=${range}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VaultIt/1.0)', 'Accept': 'application/json' } },
    )
    if (!r.ok) return null
    const j = await r.json()
    const res = j?.chart?.result?.[0]
    const ts: number[] = res?.timestamp ?? []
    const cl: (number | null)[] = res?.indicators?.quote?.[0]?.close ?? []
    const t: number[] = [], c: number[] = []
    for (let i = 0; i < ts.length; i++) if (typeof cl[i] === 'number' && cl[i]! > 0) { t.push(ts[i]); c.push(Math.round(cl[i]! * 10000) / 10000) }
    if (t.length < 2) return null
    const step = Math.ceil(t.length / 320)             // keep the payload small
    const tt = t.filter((_, i) => i % step === 0 || i === t.length - 1), cc = c.filter((_, i) => i % step === 0 || i === c.length - 1)
    return { currency: (res?.meta?.currency ?? 'USD') as string, t: tt, c: cc }
  } catch { return null }
}

async function search(q: string) {
  try {
    const r = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&listsCount=0`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VaultIt/1.0)', 'Accept': 'application/json' } },
    )
    if (!r.ok) return []
    const j = await r.json()
    return (j?.quotes ?? [])
      .filter((x: any) => ['EQUITY', 'ETF', 'MUTUALFUND'].includes(x.quoteType))
      .slice(0, 8)
      .map((x: any) => ({ symbol: String(x.symbol), name: String(x.longname ?? x.shortname ?? x.symbol), exchange: String(x.exchDisp ?? x.exchange ?? ''), type: String(x.quoteType) }))
  } catch { return [] }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let symbols: string[] = []
  let hist: { symbols?: unknown; range?: unknown } | null = null
  let q = ''
  try {
    const body = await req.json()
    symbols = Array.isArray(body?.symbols) ? body.symbols : []
    hist = body?.history && typeof body.history === 'object' ? body.history : null
    q = typeof body?.search === 'string' ? body.search.trim().slice(0, 60) : ''
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (q) return json({ results: q.length >= 2 ? await search(q) : [] })

  if (hist) {
    const range = RANGES[String(hist.range)] ? String(hist.range) : '6mo'
    const hs = [...new Set((Array.isArray(hist.symbols) ? hist.symbols : []).map((x) => String(x).trim().toUpperCase()).filter((x) => /^[A-Z0-9.\-^=]{1,15}$/.test(x)))].slice(0, 30)
    const series: Record<string, unknown> = {}
    await Promise.all(hs.map(async (sym) => {
      const h = (await history(sym, range)) ?? (!sym.includes('.') ? await history(`${sym}.L`, range) : null)
      if (h) series[sym] = h
    }))
    return json({ series, range })
  }

  const list = [...new Set(
    symbols.map((s) => String(s).trim().toUpperCase()).filter((s) => /^[A-Z0-9.\-^=]{1,15}$/.test(s)),
  )].slice(0, 30)
  if (!list.length) return json({ quotes: {} })

  const quotes: Record<string, unknown> = {}
  await Promise.all(list.map(async (sym) => {
    // Bare tickers (e.g. Trading 212 exports "VUAG") may be LSE-listed: retry with the .L suffix.
    const q = (await quote(sym)) ?? (!sym.includes('.') ? await quote(`${sym}.L`) : null)
    if (q) quotes[sym] = q
  }))

  return json({ quotes })
})
