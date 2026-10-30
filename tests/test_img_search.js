// Photo search on wealth inventory and liability tiles (Openverse, mocked here): results show, a tap saves the
// photo and its credit, and refusals (too many searches, nothing found, offline) are explained. Run: node tests/test_img_search.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch(); const errs = []; const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  let mode = 'ok', lastQ = '';
  await p.route('https://api.openverse.org/**', r => {
    const u = new URL(r.request().url());
    if (u.pathname.endsWith('/thumb/')) return r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    lastQ = u.searchParams.get('q');
    if (mode === 'busy') return r.fulfill({ status: 429, body: '{}', headers: { 'access-control-allow-origin': '*' } });
    if (mode === 'down') return r.abort();
    const results = mode === 'none' ? [] : [1, 2, 3].map(i => ({ id: 'id' + i, title: 'Guitar ' + i, creator: 'Sam', license: 'by', attribution: '"Guitar ' + i + '" by Sam is licensed under CC BY 4.0.', thumbnail: 'https://api.openverse.org/v1/images/id' + i + '/thumb/' }));
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result_count: results.length, results }), headers: { 'access-control-allow-origin': '*' } });
  });
  await p.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 })); localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com' }));
    if (!localStorage.getItem('pos_al1')) localStorage.setItem('pos_al1', JSON.stringify({ cashAccounts: [], otherAssets: [{ id: 11, name: 'Gibson Les Paul', value: 2200 }], liabilities: [{ id: 21, name: 'Car', value: 4000, rate: 0, depRate: 10, runningCost: 80, addedDate: '2026-06-01T00:00:00Z' }] })); });
  await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1500);
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
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
