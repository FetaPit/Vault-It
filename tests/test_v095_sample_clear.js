// v0.95, tester 1 (9 Nov 2026): "I can't seem to start off afresh and add data. If this is a bug, pls fix it." The tester signed up
// on the live build, where a fresh device's sample (Alex Morgan) became the new account's own data and was uploaded with it
// (d2a368a stops that for new sign-ups). Zeroing every Assets line still left the sample's £18,500 House Builder pot in Assets,
// the demo chip with its "start with your own data" button had gone (demo mode was off), and the cloud copy brought the sample
// back on every sign-in. Owner, 10 Nov 06:40: zeroing or clearing the sample must really clear it, and it must never come back.
// Owner, 10 Nov: "Yes, make it automatic and remove the button": every profile starts blank, filled only from onboarding.
//   1. an account holding the sample's rows (demo mode off): signed out, nothing is touched; Assets still counts the house pot
//   2. at sign-in, once the account's cloud copy is read, the sample's own rows go with no button or question, and the page
//      restarts: the user's own rows, house type and price stay; House Builder £0 saved, no deposits; Assets is the user's own
//      figure; a backup of each replaced area is kept; there is no "Clear sample figures" button anywhere
//   3. a reload and a second sign-in keep it cleared, with no further restart, and the sample does not load again
//   4. the cloud holds the sample: the cleared areas are uploaded, and nothing of the sample is in what goes to the cloud
//   5. a House Builder the user reset stays reset after a reload even when the upload had not landed (the older cloud copy used
//      to win and bring the deposit back); a mark left by another account on the device is not used
//   6. sign-in on a sample device, then the welcome screens skipped: nothing of the sample anywhere, Assets £0
//   7. a user's own rows with preset names (Savings, Emergency fund, Rent, Current Account) are never taken for the sample
//   8. a welcome pot added on top of the sample's House Builder stays; only the sample's seven deposits go
//   9. a second device still holding the sample: it counts as empty for sync, so the cleared account wins and nothing is re-uploaded
// Run: node tests/test_v095_sample_clear.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const EMAIL = 't@t.com';
async function fresh(b) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await routeThree(ctx); await ctx.route(/open\.er-api\.com|challenges\.cloudflare\.com|supabase\.co|google\.com\/s2|coingecko|binance|yahoo|stooq/, r => r.abort());
  const p = await ctx.newPage(); p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.goto(APP); await p.waitForTimeout(3000);
  return p;
}
// every sample row name the seed writes (loadDemoData); none may be left after clearing
const SAMPLE_NAMES = ['Salary (£57k)', 'Freelance consulting', 'Marcus Savings (emergency fund)', 'Current Account', 'Car · Honda Civic', 'Car Finance',
  'Student Loan Plan 2', 'Barclaycard', 'Northgate Health', 'Fernbrook Studio', 'Nova Retail', 'Harbour & Co', 'Lumen Fintech', 'VUSA.L', 'VWRL.L'];
const state = (p) => p.evaluate((names) => {
  const j = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const blob = ['pos_ov1', 'pos_al1', 'pos_debt1', 'pos_biz1'].map(k => localStorage.getItem(k) || '').join(' ');
  const al = j('pos_al1') || {}, h = j('ht3') || {};
  return { left: names.filter(n => blob.indexOf(JSON.stringify(n).slice(1, -1)) >= 0),
    eth: (al.crypto || []).some(c => c.sym === 'ETH' && +c.amount === 1.4), gold: al.metals ? al.metals.gold : null,
    snaps: ((j('pos_ov1') || {}).snapshots || []).length,
    own: (al.cashAccounts || []).map(c => c.name), ownDebt: ((j('pos_debt1') || {}).debts || []).map(d => d.name),
    ht3: { saved: h.saved, n: (h.deposits || []).length, type: h.houseType, price: h.prices && h.prices.terraced },
    mem: { saved: state.saved, assets: Math.round(alTotalAssets()) }, kpi: (document.getElementById('kpi-assets') || {}).textContent,
    button: !!document.getElementById('sample-chip') || /clear sample figures/i.test(document.body.innerText), demo: localStorage.getItem('vi_demo_mode'),
    baks: Object.keys(localStorage).filter(k => /^vi_bak_/.test(k)) };
}, SAMPLE_NAMES);
// the tester's device after signing up on the live build: the sample is their data, demo mode is off, plus rows of their own
async function adopted(b) {
  const p = await fresh(b);
  await p.evaluate((e) => {
    const j = k => JSON.parse(localStorage.getItem(k)); const set = (k, v) => _lsOrig.call(localStorage, k, v);
    localStorage.removeItem('vi_demo_mode'); localStorage.removeItem('vi_demo_variant');
    set('vi_user', JSON.stringify({ name: 'Tess', email: e, logins: 3 }));
    set('vi_session', JSON.stringify({ email: e, expiry: Date.now() + 864e5 }));
    set('vi_onboarded', '1');
    const al = j('pos_al1'); al.cashAccounts.push({ id: 99, name: 'My ISA', type: 'Savings', balance: 1000, rate: 0 }); set('pos_al1', JSON.stringify(al));
    const d = j('pos_debt1'); d.debts.push({ id: 99, name: 'My card', balance: 300, original: 300, rate: 20, minPay: 10, type: 'credit' }); set('pos_debt1', JSON.stringify(d));
    const h = j('ht3'); h.houseType = 'terraced'; h.prices.terraced = 210000; h.target = 210000; set('ht3', JSON.stringify(h));
  }, EMAIL);
  await p.reload(); await p.waitForTimeout(3000);
  return p;
}

// sign-in as the app does it: the account's cloud copy is read (_hydrateFromSupabase), which is when the clean-up may run.
// A stand-in client keeps every upload in sessionStorage. Returns whether the page restarted within 6 s.
async function signIn(p, cloud) {
  const nav = p.waitForNavigation({ timeout: 6000 }).then(() => true, () => false);
  await p.evaluate(async ([e, cloud]) => {
    _supaClient = { auth: { getSession: async () => ({ data: { session: null } }) },
      from: () => ({ select: () => ({ eq: async () => ({ data: cloud || [] }) }), upsert: async (rows) => { const u = JSON.parse(sessionStorage.getItem('ups') || '[]'); sessionStorage.setItem('ups', JSON.stringify(u.concat([rows]))); return {}; } }) };
    _supaUser = { id: 'u-t', email: e }; _flushing = false;
    await _hydrateFromSupabase('u-t');
  }, [EMAIL, cloud || null]).catch(() => null);   // the restart can cut the evaluate short
  const restarted = await nav; await p.waitForTimeout(restarted ? 2500 : 0);
  return restarted;
}
const cloudOf = (p) => p.evaluate(() => ['pos_ov1', 'pos_al1', 'pos_debt1', 'pos_biz1', 'ht3'].map(k => ({ key: k, value: JSON.parse(localStorage.getItem(k)), updated_at: new Date(Date.now() - 864e5).toISOString() })));

(async () => {
  const b = await chromium.launch();
  // ── 1 to 3 ──
  let p = await adopted(b);
  let s = await state(p);
  ok(s.demo === null && s.left.length > 5 && s.mem.saved === 18500, '1 signed out, nothing is touched: the account holds the sample as its own, ' + s.left.length + ' sample rows, House Builder £' + s.mem.saved);
  ok(!s.button, '1 no "Clear sample figures" button');
  let restarted = await signIn(p, await cloudOf(p));
  ok(restarted, '2 at sign-in the clean-up runs by itself and the page restarts');
  s = await state(p);
  ok(s.left.length === 0 && !s.eth && !s.gold && s.snaps === 0, '2 no sample row is left in any area (' + JSON.stringify({ left: s.left, eth: s.eth, gold: s.gold, snaps: s.snaps }) + ')');
  ok(s.own.join() === 'My ISA' && s.ownDebt.join() === 'My card', '2 the user\'s own rows stay (' + JSON.stringify({ own: s.own, debt: s.ownDebt }) + ')');
  ok(s.ht3.saved === 0 && s.ht3.n === 0 && s.ht3.type === 'terraced' && s.ht3.price === 210000, '2 House Builder: £0 saved, no deposits; their house type and price stay (' + JSON.stringify(s.ht3) + ')');
  ok(s.mem.saved === 0 && s.mem.assets === 1000 && /1,000|1\.0k/.test(s.kpi || ''), '2 Assets is the user\'s own £1,000 (' + JSON.stringify(s.mem) + ' ' + s.kpi + ')');
  ok(s.baks.indexOf('vi_bak_ht3') >= 0 && s.baks.indexOf('vi_bak_pos_al1') >= 0, '2 a backup of each replaced area is kept (' + s.baks.join(',') + ')');
  ok(!s.button, '2 no button or question was shown');
  await p.reload(); await p.waitForTimeout(3000);
  restarted = await signIn(p, JSON.parse(await p.evaluate(() => { const u = JSON.parse(sessionStorage.getItem('ups') || '[]'); const last = {}; u.forEach(b => b.forEach(r => { last[r.key] = r; })); return JSON.stringify(Object.values(last)); })));
  s = await state(p);
  ok(!restarted, '3 a second sign-in has nothing to clean: no restart');
  ok(s.left.length === 0 && s.mem.saved === 0 && s.demo === null, '3 after a reload it stays cleared and the sample does not load again (' + JSON.stringify({ left: s.left, saved: s.mem.saved, demo: s.demo }) + ')');
  ok(p._errs.length === 0, '1-3 no page errors' + (p._errs.length ? ': ' + p._errs.join(' | ') : ''));
  await p.context().close();

  // ── 4: signed in, the cloud holds the sample ──
  p = await adopted(b);
  const reloaded = await signIn(p, await cloudOf(p));
  const up = { rows: JSON.parse(await p.evaluate(() => { const u = JSON.parse(sessionStorage.getItem('ups') || '[]'); const last = {}; u.forEach(b => b.forEach(r => { last[r.key] = r; })); return JSON.stringify(Object.values(last)); })), reloaded };
  const keys = up.rows.map(r => r.key).sort();
  const blob = JSON.stringify(up.rows.map(r => r.value));
  ok(['ht3', 'pos_al1', 'pos_debt1'].every(k => keys.indexOf(k) >= 0), '4 the cleared areas are uploaded (' + keys.join(',') + ')');
  ok(!SAMPLE_NAMES.some(n => blob.indexOf(JSON.stringify(n).slice(1, -1)) >= 0) && /My ISA/.test(blob), '4 nothing of the sample goes to the cloud, the user\'s own rows do');
  const h3 = (up.rows.find(r => r.key === 'ht3') || {}).value || {};
  ok(h3.saved === 0 && (h3.deposits || []).length === 0, '4 the uploaded House Builder is £0 with no deposits (' + JSON.stringify({ saved: h3.saved, n: (h3.deposits || []).length }) + ')');
  ok(up.reloaded, '4 the page restarts after the upload, so every tab redraws from storage');
  await p.context().close();

  // ── 5: a House Builder the user reset stays reset across a reload when the upload had not landed ──
  p = await fresh(b);
  const own = { saved: 500, target: 250000, houseType: 'terraced', depositPct: 10, deposits: [{ date: '01/11/2026', amount: 500 }], prices: { terraced: 250000 } };
  await p.evaluate(([e, o]) => { const set = (k, v) => _lsOrig.call(localStorage, k, v);   // this page started on the sample: its guard refuses sample keys
    localStorage.clear(); set('vi_user', JSON.stringify({ name: 'Tess', email: e }));
    set('vi_session', JSON.stringify({ email: e, expiry: Date.now() + 864e5 })); set('vi_onboarded', '1');
    set('vi_last_pull', String(Date.now() - 1000)); set('ht3', JSON.stringify(o)); set('vi_dirty', '[]'); }, [EMAIL, own]);
  await p.reload(); await p.waitForTimeout(2500);
  const pre = await p.evaluate((e) => {   // the user zeroes their deposit; the upload fails (offline)
    _supaClient = { from: () => ({ upsert: async () => ({ error: { message: 'offline' } }), select: () => ({ eq: async () => ({ data: [] }) }) }) };
    _supaUser = { id: 'u-t', email: e }; _syncReady = true;
    state.saved = 0; state.deposits = []; save();
    return { saved: JSON.parse(localStorage.getItem('ht3')).saved, marked: !!_emptiedByUser.ht3 };
  }, EMAIL);
  ok(pre.saved === 0 && pre.marked, '5 the reset is saved on the device and marked as emptied on purpose (' + JSON.stringify(pre) + ')');
  await p.waitForTimeout(800);
  await p.reload(); await p.waitForTimeout(2500);
  const r5 = await p.evaluate(async ([e, o]) => {
    _supaClient = { from: () => ({ select: () => ({ eq: async () => ({ data: [{ key: 'ht3', value: o, updated_at: new Date(Date.now() - 864e5).toISOString() }] }) }), upsert: async () => ({}) }) };
    _supaUser = { id: 'u-t', email: e };
    await _hydrateFromSupabase('u-t');
    return { saved: JSON.parse(localStorage.getItem('ht3')).saved, mem: state.saved };
  }, [EMAIL, own]);
  ok(r5.saved === 0 && r5.mem === 0, '5 after a reload the reset stands; the older cloud copy does not bring the £500 back (' + JSON.stringify(r5) + ')');
  await p.evaluate(() => { localStorage.setItem('vi_emptied', JSON.stringify({ e: 'someone@else.com', k: ['ht3'] })); });
  await p.reload(); await p.waitForTimeout(2000);
  const other = await p.evaluate(() => !!_emptiedByUser.ht3);
  ok(!other, '5 a mark left by another account on this device is not used');
  ok(p._errs.length === 0, '5 no page errors' + (p._errs.length ? ': ' + p._errs.join(' | ') : ''));
  await p.context().close();

  // ── 6: sign-in on a sample device, then the welcome screens skipped ──
  p = await fresh(b);
  await p.evaluate(async (e) => { _hydrateFromSupabase = async () => false; _guardAccountSwitch = async () => true; await _afterVerified({ id: 'u-new', email: e }, e); }, 'new6@example.com');
  await p.waitForTimeout(3500);
  await p.addStyleTag({ content: '#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
  await p.evaluate(() => { try { wStep2Skip(); } catch (e) { window._skipErr = e.message; } });
  await p.waitForTimeout(1500);
  s = await state(p);
  ok(s.left.length === 0 && s.mem.saved === 0 && s.mem.assets === 0 && s.ht3.saved !== 18500, '6 after skipping the welcome screens: nothing of the sample, House Builder £0, Assets £0 (' + JSON.stringify({ left: s.left, mem: s.mem }) + ')');
  ok(!s.button && s.demo === null, '6 no button and no demo mode');
  await p.context().close();


  // ── 7: a user who never saw the demo, with rows named like the app's presets ──
  p = await fresh(b);
  await p.evaluate((e) => { const set = (k, v) => _lsOrig.call(localStorage, k, v); localStorage.clear();
    set('vi_user', JSON.stringify({ name: 'Tess', email: e })); set('vi_session', JSON.stringify({ email: e, expiry: Date.now() + 864e5 })); set('vi_onboarded', '1');
    const t = Date.now();
    set('pos_ov1', JSON.stringify({ income: [{ id: t, name: 'Salary', amount: 2000 }], expenses: [{ id: t + 1, name: 'Savings', amount: 250, cat: 'savings', type: 'sv' }, { id: t + 2, name: 'Emergency fund', amount: 200, cat: 'emergency', type: 'sv' }, { id: t + 3, name: 'Rent', amount: 1150 }] }));
    set('pos_al1', JSON.stringify({ cashAccounts: [{ id: t + 4, name: 'Current Account', balance: 2100 }], crypto: [{ id: 1, sym: 'BTC', amount: 0.05, price: 42000 }, { id: 2, sym: 'ETH', amount: 0, price: 2200 }] }));
  }, EMAIL);
  await p.reload(); await p.waitForTimeout(2500);
  const r7restart = await signIn(p);
  const r7 = await p.evaluate(() => ({ areas: viSampleAreas().map(a => a.key), restarted: false, rows: JSON.parse(localStorage.getItem('pos_ov1')).expenses.length + JSON.parse(localStorage.getItem('pos_al1')).cashAccounts.length }));
  r7.restarted = r7restart;
  ok(r7.areas.length === 0 && !r7.restarted && r7.rows === 4, '7 rows of the user\'s own with preset names (Savings £250, Emergency fund £200, Rent £1,150, Current Account £2,100) are not the sample: nothing removed, no restart (' + JSON.stringify(r7) + ')');
  await p.context().close();

  // ── 8: the welcome pot was added on top of the sample's House Builder ──
  p = await adopted(b);
  await p.evaluate(() => { const h = JSON.parse(localStorage.getItem('ht3')); h.deposits.push({ amount: 6000, date: '09/11/2026', acct: { t: 'savings', n: '' } }); h.saved = 24500; _lsOrig.call(localStorage, 'ht3', JSON.stringify(h)); });
  await p.reload(); await p.waitForTimeout(3000);
  await signIn(p, await cloudOf(p));
  s = await state(p);
  ok(s.ht3.saved === 6000 && s.ht3.n === 1, '8 the sample\'s seven deposits go, the £6,000 welcome pot stays: £6,000 saved, one deposit (' + JSON.stringify(s.ht3) + ')');
  await p.context().close();

  // ── 9: a second device still holding the sample cannot bring it back ──
  p = await adopted(b);
  const r9 = await p.evaluate(async (e) => {
    sessionStorage.setItem('vi_sample_auto', '1');   // this case is about sync alone: the automatic clean-up is covered by 1-4
    const sampleOv = localStorage.getItem('pos_ov1');
    const blankNow = _isBlankArea('pos_ov1', sampleOv);
    // this device has the sample (synced long ago, not edited here); the account was cleared on another device since
    const cleared = JSON.parse(sampleOv); cleared.income = []; cleared.expenses = []; cleared.snapshots = [];
    _lsOrig.call(localStorage, 'vi_dirty', '[]'); _lsOrig.call(localStorage, 'vi_ts', JSON.stringify({ pos_ov1: Date.now() - 864e5 * 3 })); _lsOrig.call(localStorage, 'vi_last_pull', String(Date.now() - 864e5 * 2));
    let ups = null;
    _supaClient = { from: () => ({ select: () => ({ eq: async () => ({ data: [{ key: 'pos_ov1', value: cleared, updated_at: new Date(Date.now() - 864e5).toISOString() }] }) }), upsert: async (rows) => { ups = rows; return {}; } }) };
    _supaUser = { id: 'u-t', email: e };
    await _hydrateFromSupabase('u-t'); await new Promise(r => setTimeout(r, 500));
    const ov = JSON.parse(localStorage.getItem('pos_ov1'));
    return { blankNow, income: ov.income.length, uploadedSample: !!(ups && ups.some(r => r.key === 'pos_ov1' && (r.value.income || []).length)) };
  }, EMAIL);
  ok(r9.blankNow, '9 an area holding only the sample counts as empty for sync');
  ok(r9.income === 0 && !r9.uploadedSample, '9 the cleared cloud copy wins on the second device, and the sample is not uploaded again (' + JSON.stringify(r9) + ')');
  await p.context().close();
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
