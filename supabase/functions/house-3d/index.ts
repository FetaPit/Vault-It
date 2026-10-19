// house-3d — relay for Meshy AI text-to-3D, used by the House Builder's "Generate with AI" card.
// Meshy's API does not allow browser (CORS) requests, so the app calls this function instead.
// The user's own Meshy API key travels in the body (it is stored on their device, never on our servers);
// a project-wide MESHY_API_KEY secret is used only if one has been set and the caller sends none.
//
// Body:
//   { action: 'create',   key, prompt }          → { id }            preview (shape) task, real-world size, GLB only
//   { action: 'refine',   key, preview_id }      → { id }            texture the finished preview
//   { action: 'status',   key, id }              → { status, progress, glb, thumbnail, error }
//   { action: 'download', url }                  → GLB bytes          only Meshy asset URLs (https://*.meshy.ai/…)
// Deployed with --no-verify-jwt (the app calls it with the public anon key).

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const API = 'https://api.meshy.ai/openapi/v2/text-to-3d'
const MAX_BYTES = 60 * 1024 * 1024

async function meshy(key: string, path: string, init?: RequestInit) {
  const r = await fetch(API + path, {
    ...init,
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  let j: any = null
  try { j = await r.json() } catch { /* empty */ }
  return { ok: r.ok, status: r.status, j }
}

function meshyError(status: number, j: any) {
  const msg = String(j?.message ?? j?.error ?? '').slice(0, 200)
  if (status === 401) return 'Meshy rejected the API key — check it in Settings.'
  if (status === 402) return 'Your Meshy account is out of credits.'
  if (status === 429) return 'Meshy is rate-limiting requests — wait a minute and try again.'
  return msg || `Meshy returned ${status}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  let body: any
  try { body = await req.json() } catch { return json({ error: 'bad JSON' }, 400) }
  const action = String(body?.action ?? '')

  if (action === 'download') {
    let u: URL
    try { u = new URL(String(body?.url ?? '')) } catch { return json({ error: 'bad url' }, 400) }
    if (u.protocol !== 'https:' || !(u.hostname === 'meshy.ai' || u.hostname.endsWith('.meshy.ai'))) return json({ error: 'only Meshy asset URLs can be fetched' }, 400)
    const r = await fetch(u.toString())
    if (!r.ok || !r.body) return json({ error: `asset fetch failed (${r.status})` }, 502)
    const len = Number(r.headers.get('content-length') ?? 0)
    if (len > MAX_BYTES) return json({ error: 'model is too large' }, 413)
    return new Response(r.body, { status: 200, headers: { ...CORS, 'Content-Type': 'model/gltf-binary', 'Cache-Control': 'private, max-age=600' } })
  }

  const key = String(body?.key ?? '').trim() || (Deno.env.get('MESHY_API_KEY') ?? '')
  if (!key) return json({ error: 'No Meshy API key — add one in Settings.' }, 400)

  if (action === 'create') {
    const prompt = String(body?.prompt ?? '').trim().slice(0, 800)
    if (!prompt) return json({ error: 'Describe the house first.' }, 400)
    const r = await meshy(key, '', { method: 'POST', body: JSON.stringify({
      mode: 'preview', prompt, should_remesh: true, target_polycount: 40000, topology: 'triangle',
      auto_size: true, origin_at: 'bottom', target_formats: ['glb'], moderation: true,
    }) })
    return r.ok && r.j?.result ? json({ id: r.j.result }) : json({ error: meshyError(r.status, r.j) }, r.status >= 400 ? r.status : 502)
  }

  if (action === 'refine') {
    const preview = String(body?.preview_id ?? '')
    if (!/^[\w-]{8,64}$/.test(preview)) return json({ error: 'bad preview id' }, 400)
    const r = await meshy(key, '', { method: 'POST', body: JSON.stringify({ mode: 'refine', preview_task_id: preview, target_formats: ['glb'] }) })
    return r.ok && r.j?.result ? json({ id: r.j.result }) : json({ error: meshyError(r.status, r.j) }, r.status >= 400 ? r.status : 502)
  }

  if (action === 'status') {
    const id = String(body?.id ?? '')
    if (!/^[\w-]{8,64}$/.test(id)) return json({ error: 'bad task id' }, 400)
    const r = await meshy(key, '/' + id)
    if (!r.ok) return json({ error: meshyError(r.status, r.j) }, r.status >= 400 ? r.status : 502)
    const t = r.j ?? {}
    return json({
      status: t.status ?? 'UNKNOWN',
      progress: Number(t.progress ?? 0),
      glb: t.model_urls?.glb ?? null,
      thumbnail: t.thumbnail_url ?? null,
      error: t.task_error?.message ?? null,
    })
  }

  return json({ error: 'unknown action' }, 400)
})
