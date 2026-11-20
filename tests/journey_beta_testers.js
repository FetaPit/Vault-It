// Five beta tester journeys (owner, 19 Nov 2026: "set up test agents to do the 5 beta tester emails"; "Act as the 5 testers").
// Each persona is a stand-in account (never a real tester) that already has saved data and is on Pioneer, set by hand with no end date,
// the way the release SQL leaves the beta testers. Each opens the new build, signs in with a PIN, and checks: the app opens (no card
// wall), data intact, the Pioneer plan shows, Pro is open, the beta prices are right. A sixth, a control on no plan, must hit the wall.
// Supabase is mocked in this script (as in journey_one_b.js): nothing is e-mailed and no real account or production data is touched.
// Run: ONLY=iris,mo node tests/journey_beta_testers.js runs just those personas (iris asha dan mo lee control).
//      node tests/journey_beta_testers.js            (local build)    SHOTS=dir to set where the screenshots go (default shots/beta-testers)
const vi = require('./lib/vi');
vi.planStub(null);   // the app must ask the (mock) server for the plan, as it does live, not take the test stub
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const APP = process.env.VI_APP || vi.FILE_URL;
const SHOTS = process.env.SHOTS || path.join(vi.ROOT, 'shots', 'beta-testers');
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const PIN = '482915';

// the stand-in profile rows
const PIONEER_ROW = { is_pioneer: true, is_founder: false, plan: 'yearly', paid_until: null, is_beta: true, stripe_synced_at: null, tier: 'pioneer', billing: 'year', pro_kept: false };
const NO_PLAN_ROW = { is_pioneer: false, is_founder: false, plan: null, paid_until: null, is_beta: true, stripe_synced_at: null, tier: null, billing: null, pro_kept: false };

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

const dep = (n, a) => ({ amount: a, date: '2026-0' + (1 + (n % 9)) + '-1' + (n % 9), note: '' });
const mkRows = (o) => {   // what the account's cloud copy holds
  const t = {};
  const put = (k, v) => { t[k] = { value: v, updated_at: '2026-11-10T09:00:00.000Z' }; };
  put('vi_user', { name: o.name, email: o.email, joined: '2026-10-20T00:00:00.000Z' });
  put('ht3', { saved: o.saved, target: o.target || 250000, deposits: o.deposits || [dep(1, o.saved)] });
  put('pos_debt1', { debts: o.debts || [] });
  return t;
};
const PERSONAS = [
  { key: 'iris', title: 'iPhone Safari, repeat visit with a PIN', vp: { width: 390, height: 844 }, mobile: true, ua: IPHONE_UA, theme: 'dark', reload: true,
    uid: 'u-iris', name: 'Iris Stand-in', email: 'iris.stand-in@example.com', saved: 6400, debts: [{ id: 1, name: 'Iris card', original: 2000, balance: 1400, rate: 21.9, min: 45, type: 'credit' }] },
  { key: 'asha', title: 'Android Chrome, installed app', vp: { width: 412, height: 915 }, mobile: true, ua: ANDROID_UA, theme: 'dark', standalone: true, reload: true,
    uid: 'u-asha', name: 'Asha Stand-in', email: 'asha.stand-in@example.com', saved: 3100, debts: [{ id: 1, name: 'Asha loan', original: 5000, balance: 4100, rate: 7.9, min: 120, type: 'loan' }] },
  { key: 'dan', title: 'Desktop 1100 px, Daylight', vp: { width: 1100, height: 800 }, mobile: false, theme: 'light', reload: true,
    uid: 'u-dan', name: 'Dan Stand-in', email: 'dan.stand-in@example.com', saved: 12000, debts: [{ id: 1, name: 'Dan overdraft', original: 800, balance: 650, rate: 39.9, min: 25, type: 'credit' }] },
  { key: 'mo', title: 'Lots of saved data (debts, savings, house builder progress)', vp: { width: 390, height: 844 }, mobile: true, theme: 'dark', reload: true,
    uid: 'u-mo', name: 'Mo Stand-in', email: 'mo.stand-in@example.com', saved: 41250, target: 380000,
    deposits: Array.from({ length: 24 }, (_, i) => dep(i + 1, 1000 + i * 75)),
    debts: [['Mo card A', 3200, 22.9, 70], ['Mo card B', 1800, 19.9, 40], ['Mo car loan', 7400, 6.9, 210], ['Mo store card', 900, 29.9, 30], ['Mo student', 18000, 0, 0], ['Mo overdraft', 450, 39.9, 20]]
      .map((d, i) => ({ id: i + 1, name: d[0], original: d[1] * 1.2, balance: d[1], rate: d[2], min: d[3], type: i === 2 ? 'loan' : 'credit' })) },
  { key: 'lee', title: 'New device, the cloud copy restores', vp: { width: 390, height: 844 }, mobile: true, theme: 'dark', reload: false,
    uid: 'u-lee', name: 'Lee Stand-in', email: 'lee.stand-in@example.com', saved: 9800, debts: [{ id: 1, name: 'Lee card', original: 1500, balance: 1100, rate: 18.9, min: 35, type: 'credit' }] }
];
const CONTROL = { key: 'control', title: 'Control: signed in, not on a plan (must see the card wall)', vp: { width: 390, height: 844 }, mobile: true, theme: 'dark', reload: false,
  uid: 'u-control', name: 'Control Stand-in', email: 'control.stand-in@example.com', saved: 500, debts: [], row: NO_PLAN_ROW };

// ── the cloud (Node side) ──
const cloud = { rows: {}, pins: {}, profiles: {}, log: [] };
[...PERSONAS, CONTROL].forEach(p => { cloud.rows[p.uid] = mkRows(p); cloud.pins[p.email] = PIN; cloud.profiles[p.uid] = p.row || PIONEER_ROW; });
const cloudOp = async (src, op, a) => {
  cloud.log.push(op);
  if (op === 'upsert') { const t = cloud.rows[a.uid] = cloud.rows[a.uid] || {}; a.rows.forEach(r => { t[r.key] = { value: r.value, updated_at: r.updated_at || new Date().toISOString() }; }); return {}; }
  if (op === 'select') { const t = cloud.rows[a.uid] || {}; return Object.keys(t).map(k => ({ key: k, value: t[k].value, updated_at: t[k].updated_at })); }
  if (op === 'delete') { const t = cloud.rows[a.uid] || {}; (a.keys || []).forEach(k => delete t[k]); return {}; }
  if (op === 'profile') return cloud.profiles[a.uid] || null;
  if (op === 'pinStatus') return { pin: !!cloud.pins[a.email] };
  if (op === 'pinLogin') return cloud.pins[a.email] === a.pin ? { ok: true, token: 'PINTOKEN' } : { error: 'invalid', remaining: 4 };
  return {};
};
const MOCK = () => {
  const KEY = 'sb-mock-auth-token';
  const user = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const listeners = [];
  const q = (table) => {
    const b = { _op: 'select', _rows: null, _eq: {}, _in: null };
    const run = async () => {
      if (table === 'vault_data') {
        if (b._op === 'upsert') return window.viCloud('upsert', { uid: b._rows[0] && b._rows[0].user_id, rows: b._rows });
        if (b._op === 'delete') return window.viCloud('delete', { uid: b._eq.user_id, keys: b._in });
        return { data: await window.viCloud('select', { uid: b._eq.user_id }), error: null };
      }
      if (table === 'profiles' && b._op === 'select') {
        if (!b._eq.id) return { data: [], error: null };   // the gateway check asks for a column with no row
        const row = await window.viCloud('profile', { uid: b._eq.id });
        return row ? { data: b._single ? row : [row], error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
      }
      return { data: b._op === 'select' ? (b._single ? null : []) : null, error: null };
    };
    ['select', 'eq', 'in', 'order', 'limit'].forEach(m => { b[m] = function (a, v) { if (m === 'eq') b._eq[a] = v; if (m === 'in') b._in = v; return b; }; });
    b.upsert = function (rows) { b._op = 'upsert'; b._rows = [].concat(rows); return b; };
    b.insert = b.upsert; b.update = b.upsert;
    b.delete = function () { b._op = 'delete'; return b; };
    b.single = b.maybeSingle = function () { b._single = true; return b; };
    b.then = function (res, rej) { return run().then(res, rej); };
    return b;
  };
  window.supabase = { createClient: () => ({
    from: q,
    rpc: async () => ({ data: null, error: null }),
    functions: { invoke: async (name, { body }) => {
      if (name === 'pin-auth') {
        const e = (body.email || (user() && user().email) || '').toLowerCase();
        if (body.action === 'status') return { data: await window.viCloud('pinStatus', { email: e }), error: null };
        if (body.action === 'login') { const r = await window.viCloud('pinLogin', { email: e, pin: body.pin }); return r.ok ? { data: r, error: null } : { data: null, error: { context: { status: 401, json: async () => r } } }; }
      }
      return { data: { success: true }, error: null };
    } },
    auth: {
      onAuthStateChange: (fn) => { listeners.push(fn); return { data: { subscription: { unsubscribe() {} } } }; },
      getSession: async () => { const u = user(); return { data: { session: u ? { user: u, access_token: 'tok' } : null } }; },
      getUser: async () => ({ data: { user: user() } }),
      verifyOtp: async ({ email, token }) => {
        if (token !== 'PINTOKEN') return { data: null, error: { message: 'Token has expired or is invalid' } };
        const u = { id: 'u-' + email.toLowerCase().split('.')[0], email: email.toLowerCase() };   // iris.stand-in@... -> u-iris
        localStorage.setItem(KEY, JSON.stringify(u));
        setTimeout(() => listeners.forEach(fn => fn('SIGNED_IN', { user: u, access_token: 'tok' })), 0);
        return { data: { user: u, session: { user: u, access_token: 'tok' } }, error: null };
      },
      refreshSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => { localStorage.removeItem(KEY); return { error: null }; }
    }
  }) };
};

const pad = async (p, digits) => { for (const d of digits) await p.evaluate(d => { _enterPinKey(d); }, d); await p.waitForTimeout(900); };
const overlay = p => p.evaluate(() => getComputedStyle(document.getElementById('login-overlay')).display);
const step = p => p.evaluate(() => { const a = document.querySelector('.auth-step.active'); return a ? a.id : ''; });
const shot = async (p, who, name) => { const f = path.join(SHOTS, who.key + '-' + name + '.png'); await p.screenshot({ path: f }); return f; };
const state = p => p.evaluate(() => ({
  wall: document.documentElement.classList.contains('vi-walled'), wallState: (document.getElementById('plan-wall') || {}).dataset ? document.getElementById('plan-wall').dataset.state : null,
  planState: typeof _viPlanState !== 'undefined' ? _viPlanState : null,
  welcome: getComputedStyle(document.getElementById('welcome-overlay')).display,
  saved: state.saved, deposits: (state.deposits || []).length, debts: debtState.debts.length, debtTotal: debtTotal(),
  name: (JSON.parse(localStorage.getItem('vi_user') || '{}')).name, pioneer: localStorage.getItem('vi_pioneer'), tier: localStorage.getItem('vi_tier'),
  billing: localStorage.getItem('vi_billing'), pro: typeof viPro === 'function' ? viPro() : null, tierId: typeof viTierId === 'function' ? viTierId() : null,
  theme: document.documentElement.getAttribute('data-theme'),
  noScroll: document.documentElement.scrollWidth <= window.innerWidth + 1
}));

const runPersona = async (b, p) => {
  console.log('\n── ' + p.key + ': ' + p.title + ' ──');
  const ctx = await b.newContext({ viewport: p.vp, deviceScaleFactor: p.mobile ? 2 : 1, isMobile: p.mobile, hasTouch: p.mobile, userAgent: p.ua });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase|\.supabase\.co\//, r => r.abort());
  await ctx.exposeBinding('viCloud', cloudOp);
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript((o) => {
    localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_tester_note', '1'); localStorage.setItem('vi_tour_done', '1');
    if (o.theme === 'light') localStorage.setItem('vi-theme', 'light'); else localStorage.setItem('vi-theme', 'dark');
    if (o.standalone) { const mm = window.matchMedia.bind(window); window.matchMedia = q => /display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q); }
  }, { theme: p.theme, standalone: !!p.standalone });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(APP); await page.waitForTimeout(1500);
  ok(await step(page) === 'auth-email-step', p.key + ': opens at the sign-in card');
  await page.fill('#auth-email', p.email); await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(900);
  ok(await step(page) === 'auth-pin-step', p.key + ': the account has a PIN, so the PIN pad shows and no e-mail code is asked for');
  await pad(page, PIN); await page.waitForTimeout(2500);
  if (p.reload) { await page.reload(); await page.waitForTimeout(2500); }   // the second visit: the saved sign-in, the new build for the second time
  const s = await state(page);
  const planOn = !p.row;
  if (planOn) {
    ok(await overlay(page) === 'none' && !s.wall && s.wallState !== 'plans', p.key + ': the app opens, no card wall (plan state: ' + s.planState + ')');
    ok(s.planState === 'on', p.key + ': the app reads the account as on a plan');
    ok(s.welcome === 'none', p.key + ': no welcome questions again for an existing account');
    ok(s.name === p.name, p.key + ': name came back with the account (' + s.name + ')');
    ok(s.saved === p.saved, p.key + ': savings intact (' + s.saved + ' of ' + p.saved + ')');
    ok(s.debts === p.debts.length, p.key + ': all ' + p.debts.length + ' debts there (' + s.debts + ')');
    if (p.deposits) ok(s.deposits === p.deposits.length, p.key + ': house builder progress intact (' + s.deposits + ' deposits)');
    ok(s.pioneer === 'true' && s.tier === 'pioneer' && s.billing === 'year' && s.tierId === 'pioneer', p.key + ': Pioneer, yearly, mirrored on the device');
    ok(s.pro === true, p.key + ': Pro features open (own 3D design, Entrepreneur tab)');
    ok(s.theme === p.theme, p.key + ': theme kept (' + s.theme + ')');
    ok(s.noScroll, p.key + ': the page does not scroll sideways');
    await page.waitForTimeout(p.reload ? 0 : 5000);   // a new device gets a few extra seconds: the cloud copy is still arriving
    const nw3 = await page.evaluate(() => { const t = document.body.innerText.match(/Own £[\d,]+ · Owe £[\d,]+ · Net worth £[\d,]+/); return { scene: t ? t[0] : '', kpi: (document.getElementById('kpi-nw') || {}).textContent || '' }; });
    console.log('note: ' + p.key + ' 3D net worth line: ' + nw3.scene);
    ok(/Own £0 · Owe £0 · Net worth £0/.test(nw3.scene) === false, p.key + ': the Net worth in 3D matches the saved data, not £0 (' + nw3.scene + ')');
    await shot(page, p, 'dashboard');
    await page.evaluate(() => { if (typeof showTab === 'function') showTab('debt'); }); await page.waitForTimeout(800);
    await shot(page, p, 'debt');
    // the plan and pricing, as a Pioneer sees them in Settings
    await page.evaluate(() => { if (typeof showSettings === 'function') showSettings(); }); await page.waitForTimeout(900);
    const sp = await page.evaluate(() => {
      const el = document.getElementById('set-pioneer-active');
      const prices = {}; ['vaulter_month', 'vaulter_year', 'pioneer_month', 'pioneer_year', 'founder'].forEach(k => { prices[k] = viPlanPrice(k); });
      const line = document.getElementById('set-plan-line');
      return { modal: getComputedStyle(document.getElementById('settings-modal')).display !== 'none', backBtn: (() => { const b = document.getElementById('vi-back-us-btn'); return !!b && getComputedStyle(b).display !== 'none'; })(), active: !!el && getComputedStyle(el).display !== 'none', line: line ? line.textContent.trim().slice(0, 120) : '', prices, betaEnds: VI_BETA_ENDS_ON, betaOpen: VI_BETA_OPEN };
    });
    ok(sp.modal, p.key + ': Settings opens');
    console.log('note: ' + p.key + ' sees the "Back Vault-It" button: ' + sp.backBtn);
    ok(sp.active, p.key + ': Settings shows "plan is active" (' + sp.line + ')');
    ok(sp.prices.vaulter_month === '£3.99' && sp.prices.vaulter_year === '£39.99' && sp.prices.pioneer_month === '£5.99' && sp.prices.pioneer_year === '£49.99' && sp.prices.founder === '£99',
      p.key + ': beta prices ' + JSON.stringify(sp.prices) + ' (beta ends ' + sp.betaEnds + ')');
    if (!p.mobile) {   // the only place a Pioneer meets the plan cards: the Back Vault-It button (hidden on a phone, nav.css)
      await page.evaluate(() => { closeSettings(); viShowCampaign(); }); await page.waitForTimeout(700);
      const cm = await page.evaluate(() => { const m = document.getElementById('vi-campaign-modal'); return { open: !!m && !m.classList.contains('hidden'), text: m ? m.innerText : '' }; });
      ok(cm.open && /3\.99/.test(cm.text) && /49\.99/.test(cm.text) && /£99/.test(cm.text), p.key + ': Back Vault-It opens the plan cards with the beta prices (Vaulter monthly, Pioneer yearly, Lifetime)');
      console.log('note: ' + p.key + ': the Back Vault-It cards offer "START 30 DAYS FREE" to an account already on Pioneer: ' + /START 30 DAYS FREE/i.test(cm.text));
      await shot(page, p, 'back-vault-it'); await page.evaluate(() => { document.getElementById('vi-campaign-modal').classList.add('hidden'); showSettings(); }); await page.waitForTimeout(400);
    }
    const sec = await page.$('#set-pioneer-active'); if (sec) await sec.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300); await shot(page, p, 'settings-plan');
  } else {
    await page.waitForTimeout(1500);
    const w = await state(page);
    ok(w.wall && w.wallState === 'plans', p.key + ': the card wall shows (state ' + w.wallState + ')');
    const cards = await page.evaluate(() => Array.from(document.querySelectorAll('#plan-wall .wall-plan[data-tier-card]')).map(c => ({ tier: c.dataset.tierCard, price: (c.querySelector('[data-wall-price],[data-plan-price]') || {}).textContent || '' })));
    ok(cards.length >= 3 && /39\.99/.test(JSON.stringify(cards)) && /49\.99/.test(JSON.stringify(cards)) && /99/.test(JSON.stringify(cards)), p.key + ': the wall shows beta prices ' + JSON.stringify(cards));
    await shot(page, p, 'wall');
  }
  ok(errs.filter(e => !/supabase|Failed to fetch|NetworkError/i.test(e)).length === 0, p.key + ': no page errors' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
  await ctx.close();
};

(async () => {
  const b = await chromium.launch();
  console.log('Beta tester journeys against', APP);
  const only = (process.env.ONLY || '').split(',').filter(Boolean);
  for (const p of [...PERSONAS, CONTROL]) if (!only.length || only.includes(p.key)) await runPersona(b, p);
  await b.close();
  console.log('\nScreenshots in', SHOTS);
  console.log(fails ? `FAILURES ${fails}` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: script error', e); process.exit(1); });
