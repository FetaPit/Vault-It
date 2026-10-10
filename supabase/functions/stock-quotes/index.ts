// stock-quotes — read-only live price lookup for Vault·It's Stocks & Funds tab.
// Body: { symbols: ["VUSA.L", "AAPL", ...] }  →  { quotes: { "AAPL": { price, currency, name, changePct } } }
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let symbols: string[] = []
  try {
    const body = await req.json()
    symbols = Array.isArray(body?.symbols) ? body.symbols : []
  } catch {
    return json({ error: 'Invalid request body' }, 400)
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
