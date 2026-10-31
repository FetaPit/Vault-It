// One B's journey: sign up on a phone, sign in on a desktop with the same data, sync both ways on close and open,
// sign out and PIN back in, and check the app is installable. Supabase is mocked (one shared "cloud" in Node, so the
// two devices really do talk through it); nothing is e-mailed and no real account is touched.
// Run: node tests/journey_one_b.js            (local file:///home/user/Vault-It/index.html)
//      VI_APP=https://app.vault-it.co node tests/journey_one_b.js   (also checks the service worker really registers)
const { chromium } = require('playwright');
const fs = require('fs');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
const ROOT = '/home/user/Vault-It/';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const EMAIL = 'one.b@example.com', PIN = '482915';

// ── the cloud (Node side, shared by every device) ──
const cloud = { rows: {}, pins: {}, mail: 0, log: [] };
const cloudOp = async (src, op, a) => {
  cloud.log.push(op);
  if (op === 'upsert') { const t = cloud.rows[a.uid] = cloud.rows[a.uid] || {}; a.rows.forEach(r => { t[r.key] = { value: r.value, updated_at: r.updated_at || new Date().toISOString() }; }); return {}; }
  if (op === 'select') { const t = cloud.rows[a.uid] || {}; return Object.keys(t).map(k => ({ key: k, value: t[k].value, updated_at: t[k].updated_at })); }
  if (op === 'delete') { const t = cloud.rows[a.uid] || {}; (a.keys || []).forEach(k => delete t[k]); return {}; }
  if (op === 'mail') { cloud.mail++; return {}; }
  if (op === 'pinStatus') return { pin: !!cloud.pins[a.email] };
  if (op === 'pinSet') { cloud.pins[a.email] = a.pin; return { ok: true }; }
  if (op === 'pinLogin') return cloud.pins[a.email] === a.pin ? { ok: true, token: 'PINTOKEN' } : { error: 'invalid', remaining: 4 };
  return {};
};
// supabase-js stand-in, installed before the page loads (the real library is blocked so it cannot replace it)
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
      return { data: b._op === 'select' ? (b._single ? null : []) : null, error: null };
    };
    ['select', 'eq', 'in', 'order', 'limit'].forEach(m => { b[m] = function (a, v) { if (m === 'eq') b._eq[a] = v; if (m === 'in') b._in = v; return b; }; });
    b.upsert = function (rows) { b._op = 'upsert'; b._rows = [].concat(rows); return b; };
    b.insert = b.upsert;
    b.delete = function () { b._op = 'delete'; return b; };
    b.single = b.maybeSingle = function () { b._single = true; return b; };
    b.then = function (res, rej) { return run().then(res, rej); };
    return b;
  };
  window.supabase = { createClient: () => ({
    from: q,
    rpc: async () => ({ data: null, error: null }),
    functions: { invoke: async (name, { body }) => {
      if (name === 'send-auth-email') { await window.viCloud('mail', {}); return { data: { success: true }, error: null }; }
      if (name === 'pin-auth') {
        const e = (body.email || (user() && user().email) || '').toLowerCase();
        if (body.action === 'status') return { data: await window.viCloud('pinStatus', { email: e }), error: null };
        if (body.action === 'set') return { data: await window.viCloud('pinSet', { email: e, pin: body.pin }), error: null };
        if (body.action === 'login') { const r = await window.viCloud('pinLogin', { email: e, pin: body.pin }); return r.ok ? { data: r, error: null } : { data: null, error: { context: { status: 401, json: async () => r } } }; }
      }
      return { data: null, error: { message: 'unknown function ' + name } };
    } },
    auth: {
      onAuthStateChange: (fn) => { listeners.push(fn); return { data: { subscription: { unsubscribe() {} } } }; },
      getSession: async () => { const u = user(); return { data: { session: u ? { user: u, access_token: 'tok' } : null } }; },
      getUser: async () => ({ data: { user: user() } }),
      verifyOtp: async ({ email, token }) => {
        if (token !== '123456' && token !== 'PINTOKEN') return { data: null, error: { message: 'Token has expired or is invalid' } };
        const u = { id: 'u-' + email.toLowerCase(), email: email.toLowerCase() };
        localStorage.setItem(KEY, JSON.stringify(u));
        setTimeout(() => listeners.forEach(fn => fn('SIGNED_IN', { user: u, access_token: 'tok' })), 0);
        return { data: { user: u, session: { user: u, access_token: 'tok' } }, error: null };
      },
      refreshSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => { localStorage.removeItem(KEY); return { error: null }; }
    }
  }) };
};

const device = async (b, name, vp) => {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: vp.width < 500 ? 2 : 1, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase|\.supabase\.co\//, r => r.abort());
  await ctx.exposeBinding('viCloud', cloudOp);
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); });
  const page = await ctx.newPage(); page.errs = []; page.on('pageerror', e => page.errs.push(name + ': ' + e.message));
  page.on('dialog', d => d.accept());
  page.devName = name;
  return page;
};
const open = async (page) => { await page.goto(APP); await page.waitForTimeout(1500); };
const step = p => p.evaluate(() => { const a = document.querySelector('.auth-step.active'); return a ? a.id : ''; });
const overlay = p => p.evaluate(() => getComputedStyle(document.getElementById('login-overlay')).display);
const pad = async (p, digits) => { for (const d of digits) await p.evaluate(d => { const a = document.querySelector('.auth-step.active').id; a === 'auth-setpin-step' ? _setPinKey(d) : _enterPinKey(d); }, d); await p.waitForTimeout(900); };
const vis = async (p, state) => { await p.evaluate(s => { Object.defineProperty(document, 'visibilityState', { value: s, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, state); await p.waitForTimeout(1200); };
const data = p => p.evaluate(() => ({ saved: state.saved, debts: debtState.debts.map(d => d.name), user: _supaUser && _supaUser.email, ready: _syncReady, dirty: JSON.parse(localStorage.getItem('vi_dirty') || '[]') }));

(async () => {
  const b = await chromium.launch();
  console.log('One B journey against', APP);

  // ── 1. phone: sign up with an e-mail code and set a PIN ──
  const phone = await device(b, 'phone', { width: 390, height: 844 });
  await open(phone);
  ok(await overlay(phone) === 'flex' && await step(phone) === 'auth-email-step', 'phone: new visitor sees the sign-in card');
  await phone.fill('#auth-email', EMAIL); await phone.click('#auth-email-step .auth-btn'); await phone.waitForTimeout(900);
  ok(await step(phone) === 'auth-otp-step' && cloud.mail === 1, 'phone: no PIN on file, so one e-mail code is sent');
  await phone.fill('#auth-otp-inp', '123456'); await phone.click('#auth-otp-step .auth-btn'); await phone.waitForTimeout(1500);
  ok(await step(phone) === 'auth-setpin-step', 'phone: code accepted, asked to set a PIN');
  await pad(phone, PIN); await pad(phone, PIN); await phone.waitForTimeout(800);
  ok(cloud.pins[EMAIL] === PIN && await overlay(phone) === 'none', 'phone: PIN saved to the account and the app opens');
  let d = await data(phone);
  ok(d.user === EMAIL && d.ready, 'phone: signed in and sync is ready');
  ok(!cloud.rows['u-' + EMAIL] || !Object.keys(cloud.rows['u-' + EMAIL]).some(k => k === 'ht3' && cloud.rows['u-' + EMAIL].ht3.value.saved > 0), 'phone: a brand-new account has no savings in the cloud yet');

  // first-run welcome: name, biggest challenge, house price
  const welcome = p => p.evaluate(() => getComputedStyle(document.getElementById('welcome-overlay')).display);
  ok(await welcome(phone) === 'flex', 'phone: first run asks for a name and goal');
  await phone.fill('#w-name', 'One B'); await phone.fill('#w-email', EMAIL); await phone.click('#w-opts .welcome-opt[data-val="1"]'); await phone.click('#w-step-1 .welcome-cta'); await phone.waitForTimeout(600);
  await phone.fill('#w-house', '250000'); await phone.click('#w-step-2 .welcome-cta'); await phone.waitForTimeout(1000);
  ok(await welcome(phone) === 'none' && await phone.evaluate(() => JSON.parse(localStorage.getItem('vi_user')).name === 'One B' && state.target === 250000), 'phone: welcome done, name and £250,000 house price saved');
  // Pete's tester note shows once after the welcome flow (31 Oct): a tester reads it and closes it
  await phone.waitForTimeout(900);
  ok(await phone.evaluate(() => !document.getElementById('tester-welcome').classList.contains('hidden')), 'phone: the tester welcome note from Pete shows once');
  await phone.click('#tester-welcome .tw-go'); await phone.waitForTimeout(200);

  // ── 2. phone: save money, then put the app in the background (close / switch app) ──
  await phone.evaluate(() => showTab('house')); await phone.waitForTimeout(800);
  await phone.fill('#savingsInput', '250'); await phone.click('#btnAdd'); await phone.waitForTimeout(800);
  d = await data(phone);
  ok(d.saved === 250, 'phone: £250 laid as bricks (state.saved = ' + d.saved + ')');
  await vis(phone, 'hidden');
  const c1 = cloud.rows['u-' + EMAIL] || {};
  ok(c1.ht3 && c1.ht3.value.saved === 250, 'phone → cloud: the deposit reached the account when the app went to the background');
  ok((await data(phone)).dirty.length === 0, 'phone: nothing left unsent');

  // ── 3. desktop: brand-new browser, sign in with e-mail + PIN, same data ──
  const desk = await device(b, 'desktop', { width: 1280, height: 900 });
  await open(desk);
  ok(await step(desk) === 'auth-email-step', 'desktop: new browser starts empty at the sign-in card');
  await desk.fill('#auth-email', EMAIL); await desk.click('#auth-email-step .auth-btn'); await desk.waitForTimeout(900);
  ok(await step(desk) === 'auth-pin-step' && cloud.mail === 1, 'desktop: PIN on file, so the PIN pad shows and no second e-mail is sent');
  await pad(desk, PIN); await desk.waitForTimeout(2000);
  ok(await overlay(desk) === 'none' && await step(desk) !== 'auth-setpin-step', 'desktop: PIN accepted, no "set a PIN" prompt again');
  d = await data(desk);
  ok(d.saved === 250 && d.user === EMAIL, 'desktop ← cloud: the £250 from the phone is there (state.saved = ' + d.saved + ')');
  ok(await welcome(desk) === 'none' && await desk.evaluate(() => (JSON.parse(localStorage.getItem('vi_user') || '{}').name) === 'One B' && state.target === 250000), 'desktop: no second welcome; name and house price came with the account');
  const c2 = cloud.rows['u-' + EMAIL] || {};
  ok(c2.ht3 && c2.ht3.value.saved === 250, 'desktop did not overwrite the account with its empty defaults');

  // ── 4. desktop: add a debt, background → phone comes back and sees it ──
  await desk.evaluate(() => { debtState.debts.push({ id: Date.now(), name: 'One B card', original: 1200, balance: 900, rate: 19.9, min: 35, type: 'credit' }); saveDebtState(); if (typeof renderDebtTab === 'function') renderDebtTab(); });
  await desk.waitForTimeout(800); await vis(desk, 'hidden');
  const c3 = cloud.rows['u-' + EMAIL] || {};
  ok(c3.pos_debt1 && c3.pos_debt1.value.debts.some(x => x.name === 'One B card'), 'desktop → cloud: the debt reached the account');
  await vis(phone, 'visible'); await phone.waitForTimeout(1500);
  d = await data(phone);
  ok(d.debts.includes('One B card') && d.saved === 250, 'phone ← cloud: on reopening, the debt from the desktop appears and the savings are intact');

  // ── 5. phone: sign out, PIN back in, data still there ──
  await phone.evaluate(() => signOut()); await phone.waitForTimeout(2500);
  const afterOut = await step(phone);
  ok(afterOut === 'auth-pin-step' || afterOut === 'auth-email-step', 'phone: signed out, back at the sign-in card (' + afterOut + ')');
  if (afterOut === 'auth-email-step') { await phone.fill('#auth-email', EMAIL); await phone.click('#auth-email-step .auth-btn'); await phone.waitForTimeout(900); }
  ok(await step(phone) === 'auth-pin-step', 'phone: remembered e-mail, PIN pad offered');
  await pad(phone, PIN); await phone.waitForTimeout(2000);
  d = await data(phone);
  ok(await overlay(phone) === 'none' && d.saved === 250 && d.debts.includes('One B card'), 'phone: PIN back in, savings and debt still there');
  ok(cloud.mail === 1, 'only one e-mail was ever needed (' + cloud.mail + ' sent)');

  // ── 6. install readiness ──
  const html = fs.readFileSync(ROOT + 'index.html', 'utf8');
  ok(/rel="manifest" href="\.\/manifest\.webmanifest"/.test(html), 'install: manifest is a real file linked from the page');
  const man = JSON.parse(fs.readFileSync(ROOT + 'manifest.webmanifest', 'utf8'));
  ok(man.display === 'standalone' && man.start_url && man.icons.some(i => i.sizes === '512x512') && man.icons.some(i => i.sizes === '192x192'), 'install: manifest says standalone with 192 and 512 px icons');
  ok(/navigator\.serviceWorker\.register\('\.\/sw\.js'\)/.test(html) && !/URL\.createObjectURL\(new Blob/.test(html.slice(html.indexOf('serviceWorker'), html.indexOf('serviceWorker') + 2000)), 'install: the page registers ./sw.js (not a blob: URL)');
  ok(/name="apple-mobile-web-app-capable" content="yes"/.test(html) && /rel="apple-touch-icon"/.test(html) && /name="theme-color"/.test(html), 'install: iOS home-screen and theme-colour tags present');
  const sw = fs.readFileSync(ROOT + 'sw.js', 'utf8');
  ok(/addEventListener\('install'/.test(sw) && /addEventListener\('fetch'/.test(sw) && /version\.json/.test(sw), 'install: sw.js caches the shell and always fetches version.json live');
  if (/^https?:/.test(APP)) {
    const reg = await desk.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); if (!r) return null; await navigator.serviceWorker.ready; const ks = await caches.keys(); return { scope: r.scope, caches: ks }; });
    ok(reg && reg.caches.some(k => /^vault-it-/.test(k)), 'install (live): service worker registered and the shell is cached: ' + JSON.stringify(reg));
  } else console.log('skip: service worker can only register over http(s); set VI_APP=<url> to check it live');

  const errs = phone.errs.concat(desk.errs).filter(e => !/supabase|Failed to fetch|NetworkError/i.test(e));
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? `FAILURES ${fails}` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL: script error', e); process.exit(1); });
