// A phone that froze the tab: supabase-js stalls, the app uses the direct REST path, and the access token expires after an hour.
// The direct path must renew the session with the saved refresh token instead of being refused (401) for ever while looking signed in.
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const KEY = 'sb-legpubblzgknxdtvsant-auth-token';
const jwt = (expSecsFromNow, tag) => 'h.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expSecsFromNow, tag })).toString('base64').replace(/=+$/, '') + '.s';
const OLD = jwt(-600, 'old'), NEW = jwt(3600, 'new');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 400, height: 800 } }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.route(/^https?:/, (r) => r.abort());
  await page.addInitScript(([k, oldTok]) => {
    localStorage.setItem('vi_declined_demo', 'true');
    localStorage.setItem(k, JSON.stringify({ access_token: oldTok, refresh_token: 'R1', token_type: 'bearer', expires_at: 1, user: { id: 'u1' } }));
  }, [KEY, OLD]);
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1200);

  const setup = (refreshOk) => page.evaluate(([newTok, refreshOk]) => {
    window.__log = [];
    window.fetch = async (url, opt) => {
      const auth = (opt && opt.headers && (opt.headers.authorization || opt.headers.Authorization)) || '';
      const R = (o, s) => ({ ok: s < 300, status: s, json: async () => o });
      if (url.includes('/auth/v1/token')) { const body = JSON.parse(opt.body); window.__log.push('refresh:' + body.refresh_token); await new Promise((r) => setTimeout(r, 50));
        return refreshOk ? R({ access_token: newTok, refresh_token: 'R2', token_type: 'bearer', expires_in: 3600, user: { id: 'u1' } }, 200) : R({ error: 'invalid_grant' }, 400); }
      const good = auth === 'Bearer ' + newTok; window.__log.push((url.includes('on_conflict') ? 'put:' : 'get:') + (good ? 'new' : 'old'));
      if (!good) return R({ message: 'JWT expired' }, 401);
      return url.includes('on_conflict') ? R(null, 201) : R([{ key: 'pos_ov1', value: { income: [] }, updated_at: new Date().toISOString() }], 200);
    };
    _sjsStalled = true;   // supabase-js is not answering: everything goes direct
  }, [NEW, refreshOk]);

  await setup(true);
  let r = await page.evaluate(async (k) => {
    const [a, c] = await Promise.all([_selectRows('u1'), _upsertRows([{ user_id: 'u1', key: 'pos_ov1', value: { income: [] }, updated_at: new Date().toISOString() }])]);
    return { a, c, err: _lastSyncErr, log: window.__log, saved: JSON.parse(localStorage.getItem(k)) };
  }, KEY);
  ok(r.log.filter((x) => x.startsWith('refresh')).length === 1, 'an expired token is renewed once, even with a read and a write at the same moment: ' + r.log.join(','));
  ok(r.log.includes('refresh:R1') && !r.log.includes('get:old') && !r.log.includes('put:old'), 'it is renewed BEFORE calling, so the server never sees the expired token');
  ok(Array.isArray(r.a.data) && r.a.data.length === 1, 'the read succeeds');
  ok(r.c === true && r.err === '', 'the write succeeds (nothing left unsynced)');
  ok(r.saved.access_token === NEW && r.saved.refresh_token === 'R2' && r.saved.user && r.saved.user.id === 'u1', 'the new pair is saved where supabase-js keeps it (and the rest of the session is kept)');

  // a token that looks valid but the server refuses (revoked, clock skew): renew and retry once
  await page.evaluate(([k, tok]) => { const s = JSON.parse(localStorage.getItem(k)); s.access_token = tok; s.refresh_token = 'R1'; localStorage.setItem(k, JSON.stringify(s)); }, [KEY, jwt(3000, 'revoked')]);
  await setup(true);
  r = await page.evaluate(async () => ({ a: await _selectRows('u1'), log: window.__log }));
  ok(r.log.join(',') === 'get:old,refresh:R1,get:new' && Array.isArray(r.a.data), 'a refused (401) call is retried once after renewing: ' + r.log.join(','));

  // the refresh token itself is dead: report it, do not loop
  await page.evaluate(([k, tok]) => { const s = JSON.parse(localStorage.getItem(k)); s.access_token = tok; localStorage.setItem(k, JSON.stringify(s)); }, [KEY, OLD]);
  await setup(false);
  r = await page.evaluate(async () => { const ok2 = await _upsertRows([{ user_id: 'u1', key: 'pos_ov1', value: {}, updated_at: new Date().toISOString() }]); return { ok2, err: _lastSyncErr, log: window.__log }; });
  ok(r.ok2 === false && /401/.test(r.err) && r.log.length <= 4, 'a dead refresh token is reported (401) without retrying for ever: ' + r.log.join(','));

  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
