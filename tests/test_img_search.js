// Photo search on wealth inventory and liability tiles (Openverse, mocked here): results show, a tap saves the
// photo and its credit, and refusals (too many searches, nothing found, offline) are explained. Run: node tests/test_img_search.js
require('./lib/vi');   // serves file:// app URLs over http (tests/lib/vi.js)
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch(); const errs = []; const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  let mode = 'ok', lastQ = '', delay = 0;
  await p.route('https://api.openverse.org/**', async r => {
    const u = new URL(r.request().url());
    if (delay && !u.pathname.endsWith('/thumb/')) await new Promise(res => setTimeout(res, delay));
    if (u.pathname.endsWith('/thumb/')) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    lastQ = u.searchParams.get('q');
    if (mode === 'busy') return r.fulfill({ status: 429, body: '{}', headers: { 'access-control-allow-origin': '*' } });
    if (mode === 'down') return r.abort();
    const results = mode === 'none' ? [] : [1, 2, 3].map(i => ({ id: 'id' + i, title: 'Guitar ' + i, creator: 'Sam', license: 'by', attribution: '"Guitar ' + i + '" by Sam is licensed under CC BY 4.0.', thumbnail: 'https://api.openverse.org/v1/images/id' + i + '/thumb/' }));
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result_count: results.length, results }), headers: { 'access-control-allow-origin': '*' } });
  });
  await p.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
    if (!localStorage.getItem('pos_al1')) localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], otherAssets: [{ id: 11, name: 'Gibson Les Paul', value: 2200 }], liabilities: [{ id: 21, name: 'Car', value: 4000, rate: 0, depRate: 10, runningCost: 80, addedDate: '2026-06-01T00:00:00Z' }] })); });
  await p.goto(require('./lib/vi').FILE_URL); await p.waitForTimeout(1500);
  ok(!(await p.content()).includes('loremflickr.com'), 'LoremFlickr (blocked by Flickr, one default photo only) is gone');
  for (const [kind, id, open] of [['wi', 11, 'wiSearch'], ['li', 21, 'liabSearch']]) {
    mode = 'ok'; await p.evaluate(([o, id]) => window[o](id), [open, id]);
    await p.fill('#wi-search-inp', 'electric guitar'); await p.press('#wi-search-inp', 'Enter'); await p.waitForTimeout(1600);
    const n = await p.evaluate(id => document.querySelectorAll('#wi-search-res-' + id + ' img').length, id);
    ok(n === 3 && lastQ === 'electric guitar', kind + ': Enter searches and shows the photos (' + n + ')');
    await p.evaluate(id => document.querySelector('#wi-search-res-' + id + ' img').click(), id); await p.waitForTimeout(200);
    const it = await p.evaluate(([k, id]) => (k === 'li' ? alState.liabilities : alState.otherAssets).find(x => x.id === id), [kind, id]);
    ok(/openverse\.org\/v1\/images\/id1\/thumb/.test(it.image) && /CC BY/.test(it.imageCredit) && !(await p.$('.wi-search-modal')), kind + ': tapping a photo saves it with its credit and closes the search');
  }
  for (const [m, re, label] of [['none', /No photos/, 'nothing found'], ['busy', /Too many searches/, 'too many searches'], ['down', /Could not reach/, 'offline']]) {
    mode = m; await p.waitForTimeout(1200); await p.evaluate(() => wiSearch(11)); await p.fill('#wi-search-inp', 'zzz'); await p.evaluate(() => wiDoSearch(11)); await p.waitForTimeout(500);
    ok(re.test(await p.evaluate(() => document.getElementById('wi-search-res-11').textContent)), label + ' is explained');
    await p.evaluate(() => { document.querySelector('.wi-search-modal').remove(); document.querySelector('.wi-icon-overlay').remove(); });
  }
  // v0.9.1 E31: a spinner shows from the moment a search starts until results or the error appear; the result area keeps its height
  const state = (id = 11) => p.evaluate(id => { const r = document.getElementById('wi-search-res-' + id), b = r.querySelector('.wi-search-busy'), sp = r.querySelector('.wi-spin'); return { busy: !!b, label: b ? b.textContent.trim() : '', fs: b ? parseFloat(getComputedStyle(b).fontSize) : 0, anim: sp ? getComputedStyle(sp).animationName : null, shown: sp ? getComputedStyle(sp).display !== 'none' : false, h: Math.round(r.getBoundingClientRect().height), imgs: r.querySelectorAll('img').length, aria: b ? b.getAttribute('role') : null }; }, id);
  for (const [open, run, id, who] of [['wiSearch', 'wiDoSearch', 11, 'Wealth inventory'], ['liabSearch', 'liabDoSearch', 21, 'Liabilities']])
  for (const [m, label] of [['ok', 'results'], ['none', 'no photos'], ['down', 'failure']]) {
    mode = m; delay = 900; await p.waitForTimeout(1200); await p.evaluate(([o, id]) => window[o](id), [open, id]); await p.fill('#wi-search-inp', 'guitar');
    const h0 = (await state(id)).h;
    await p.evaluate(([r, id]) => window[r](id), [run, id]); await p.waitForTimeout(250);
    const during = await state(id);
    ok(during.busy && /Searching/.test(during.label) && during.shown && during.anim === 'wi-spin' && during.aria === 'status', who + ': spinner and "Searching…" show while the photo library is being asked (' + label + ')');
    ok(during.fs >= 10.5, who + ': the label is at least 10.5 px (' + during.fs + ')');
    await p.waitForTimeout(1300);
    const after = await state(id);
    ok(!after.busy && (m !== 'ok' || after.imgs === 3), who + ': spinner is gone once the ' + label + ' arrive' + (m === 'ok' ? ' with 3 photos' : ''));
    ok(h0 === during.h && during.h === after.h, who + ': the result area keeps its height (' + h0 + ' > ' + during.h + ' > ' + after.h + ')');
    await p.evaluate(() => { document.querySelector('.wi-search-modal').remove(); document.querySelector('.wi-icon-overlay').remove(); });
  }
  delay = 0; mode = 'ok';
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const p2 = await ctx2.newPage();
  await p2.route('https://api.openverse.org/**', async r => { await new Promise(res => setTimeout(res, 800)); r.fulfill({ status: 200, contentType: 'application/json', body: '{"results":[]}', headers: { 'access-control-allow-origin': '*' } }); });
  await p2.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' })); localStorage.setItem('vi_pioneer', JSON.stringify({ active: true, email: 't@t.com' })); localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], otherAssets: [{ id: 11, name: 'Gibson Les Paul', value: 2200 }], liabilities: [], stocks: [] })); });
  await p2.goto(require('./lib/vi').FILE_URL); await p2.waitForTimeout(1500);
  await p2.evaluate(() => { wiSearch(11); document.getElementById('wi-search-inp').value = 'guitar'; wiDoSearch(11); }); await p2.waitForTimeout(250);
  const rm = await p2.evaluate(() => { const r = document.getElementById('wi-search-res-11'), b = r.querySelector('.wi-search-busy'), sp = r.querySelector('.wi-spin'); return { label: b ? b.textContent.trim() : '', fs: b ? parseFloat(getComputedStyle(b).fontSize) : 0, spin: sp ? getComputedStyle(sp).display : null, anim: sp ? getComputedStyle(sp).animationName : null }; });
  ok(/Searching/.test(rm.label) && rm.fs >= 10.5 && rm.spin === 'none' && rm.anim === 'none', 'reduced motion: a static "Searching…" label, no spinning ring (' + JSON.stringify(rm) + ')');
  await ctx2.close();
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
