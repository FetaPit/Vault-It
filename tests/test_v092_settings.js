// v0.9.2 Settings cleanup (owner, 5 Nov 2026 02:00: "Lock bank and platform connectors in pro for future releases. remove anything redundant.")
// and the sidebar summary colours (queue: Total assets green, Monthly surplus blue, net worth teal, red when negative).
//   1. Settings order: account, appearance, help, live prices, connections (locked), cloud sync, PIN, privacy, your data, danger zone, owner tools
//   2. every bank, broker, exchange and platform connector is one locked group: no key entry, no sign-in, no "connected" state, no network call
//   3. live prices are one on/off row with Refresh; off stops the automatic refreshes; the key fields users do not need are gone
//   4. owner-only tools (Notion, Founding link, NFT, Claude and Meshy keys) are hidden unless the owner flag is set; ConvertKit and EmailJS are gone
//   5. duplicates gone (net worth 3D switch, currency); Theme row works; Sign out sits in the account block; manage / cancel subscription row
//   6. sentence case titles, no sideways scroll at 390, saved settings still readable
//   7. sidebar ledger colours in Night and Daylight
// Run: node tests/test_v092_settings.js
require('./lib/vi');   // serves file:// app URLs over http and maps /home/user/Vault-It onto this checkout (tests/lib/vi.js)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => {
  localStorage.setItem('vi-theme', o.theme || 'dark'); localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  localStorage.setItem('vi_user', JSON.stringify({ name: 'T', email: 't@t.com', logins: 3 }));
  localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: o.neg ? 500 : 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 700, type: 'ce' }] }));
  localStorage.setItem('claude_api_key', 'sk-ant-saved'); localStorage.setItem('coingecko_api_key', 'CG-saved');
  if (o.owner) localStorage.setItem('vi-owner', '1');
};
(async () => {
  const b = await chromium.launch(); const errs = [], hosts = [];
  const open = async (o) => {
    const mob = (o.w || 1100) < 700;
    const ctx = await b.newContext({ viewport: { width: o.w || 1100, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push((o.w || 1100) + ': ' + e.message));
    p.on('request', r => { try { const u = new URL(r.url()); if (/^https?:/.test(u.protocol)) hosts.push(u.host + ' ' + (r.method())); } catch (e) {} });
    await p.addInitScript(seed, o); await p.goto(APP); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#trial-banner,#pro-offer-modal{display:none!important}' });
    return p;
  };
  const showS = async (p) => { await p.evaluate(() => showSettings()); await p.waitForTimeout(400); };

  for (const theme of ['dark', 'light']) for (const w of [390, 1100]) {
    const tag = theme + ' ' + w + ': ';
    const p = await open({ theme, w }); await showS(p);
    // 1. order and titles
    const O = await p.evaluate(() => {
      const ids = ['set-account', 'set-appearance', 'set-help', 'set-live', 'set-locked-conns', 'set-cloud', 'set-pin', 'set-privacy', 'set-yourdata', 'set-danger', 'set-owner-tools'];
      const els = ids.map(i => document.getElementById(i));
      const tops = els.map(e => e ? (e.compareDocumentPosition ? e : null) : null);
      let inOrder = true; for (let i = 1; i < els.length; i++) { if (!els[i] || !els[i - 1] || !(els[i - 1].compareDocumentPosition(els[i]) & Node.DOCUMENT_POSITION_FOLLOWING)) inOrder = false; }
      const title = (document.querySelector('#settings-modal [data-set-title]') || {}).textContent || '';
      const sm = document.getElementById('settings-modal');
      const text = sm.innerText;
      return { missing: ids.filter((i, k) => !els[k]), inOrder, title, text, sideways: document.documentElement.scrollWidth > innerWidth + 1,
        secFs: Math.min(...[...sm.querySelectorAll('.settings-section-title')].map(e => parseFloat(getComputedStyle(e).fontSize))) };
    });
    ok(!O.missing.length, tag + 'every section is there (' + O.missing.join(',') + ')');
    ok(O.inOrder, tag + 'sections follow the proposed order');
    ok(O.title.trim() === 'Settings', tag + 'title is "Settings" (got "' + O.title.trim() + '")');
    ok(!/Danger Zone|Reset Financial Data|Sign Out of this Device|API Keys|Save Keys/.test(O.text), tag + 'no Title Case or "API Keys" wording left');
    ok(!O.sideways, tag + 'no sideways scroll');
    ok(O.secFs >= 10.5, tag + 'section titles at or above the 10.5px floor (' + O.secFs + ')');
    // 2. locked connections
    const C = await p.evaluate(() => {
      const g = document.getElementById('set-locked-conns');
      return { items: g ? g.querySelectorAll('[data-conn]').length : 0, names: g ? g.innerText : '', inputs: g ? g.querySelectorAll('input').length : 0,
        oldList: !!document.getElementById('connections-list'), oldCards: document.querySelectorAll('#settings-modal .conn-item').length,
        enabled: g ? [...g.querySelectorAll('button')].filter(x => !x.disabled && x.getAttribute('aria-disabled') !== 'true').length : -1 };
    });
    ok(C.items >= 25, tag + 'bank, broker, exchange and platform connectors listed in the locked group (' + C.items + ')');
    ok(/Monzo/.test(C.names) && /Binance/.test(C.names) && /TrueLayer/.test(C.names) && /Trading 212/.test(C.names), tag + 'banks, brokers, exchanges and TrueLayer named');
    ok(/Pro/.test(C.names) && /future release/i.test(C.names), tag + 'says Pro and "future release"');
    ok(C.inputs === 0 && !C.oldList && C.oldCards === 0, tag + 'no key entry and no connection cards');
    ok(C.enabled === 0, tag + 'nothing in the group is actionable (' + C.enabled + ' live buttons)');
    if (theme === 'dark' && w === 1100) {
      const before = hosts.length;
      const R = await p.evaluate(() => { const ids = ['monzo', 'binance', 'truelayer', 'claude_ai']; ids.forEach(i => { try { connectPlatform(i); } catch (e) {} }); return { conn: JSON.stringify(achState.connected || {}), keys: ['vi_conn_monzo', 'vi_tl_client_id'].map(k => localStorage.getItem(k)), modal: !!document.getElementById('api-key-modal') }; });
      await p.waitForTimeout(500);
      ok(R.conn === '{}' && !R.modal && R.keys.every(k => k == null), tag + 'connectPlatform marks nothing connected, opens no key modal, stores nothing (' + R.conn + ')');
      const extra = hosts.slice(before).filter(h => !/^(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com|esm\.sh)/.test(h));   // page assets that load late are not connector calls
      ok(extra.length === 0, tag + 'no network call from the locked connectors (' + extra.join(', ') + ')');
    }
    // 3. live prices
    const L = await p.evaluate(() => { const r = document.getElementById('set-live'); return { has: !!r, btns: r ? r.querySelectorAll('[data-live]').length : 0, refresh: r ? !!r.querySelector('[data-live-refresh]') : false,
      keys: ['set-cg-key', 'set-metals-key', 'set-av-key', 'set-ck-form', 'set-ck-key', 'set-ejs-svc', 'set-ejs-tpl', 'set-ejs-key'].filter(i => document.getElementById(i)) }; });
    ok(L.has && L.btns === 2 && L.refresh, tag + 'Live prices is one On / Off row with Refresh');
    ok(!L.keys.length, tag + 'unneeded key, ConvertKit and EmailJS fields are gone (' + L.keys.join(',') + ')');
    // 4. owner tools hidden
    const T = await p.evaluate(() => { const t = document.getElementById('set-owner-tools'); const vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0;
      return { hidden: !vis(t), fields: ['set-notion-token', 'set-founding-link', 'set-nft-contract', 'set-claude-key', 'set-meshy-key'].filter(i => vis(document.getElementById(i))) }; });
    ok(T.hidden && !T.fields.length, tag + 'owner tools are hidden for a normal account (' + T.fields.join(',') + ')');
    // 5. duplicates, theme, account
    const A = await p.evaluate(() => ({ nw3d: !!document.getElementById('set-nw3d'), cur: !!document.getElementById('set-currency'),
      theme: [...document.querySelectorAll('#set-theme button')].map(x => x.dataset.val).join(','),
      signout: !!document.querySelector('#set-account [data-signout]'), signoutInDanger: !!document.querySelector('#set-danger [data-signout]'),
      manage: (document.querySelector('#set-account [data-manage-sub]') || {}).href || '', plan: !!document.querySelector('#set-account [data-plan-price]'),
      done: [...document.querySelectorAll('#settings-modal button')].some(x => /^Done$/.test(x.textContent.trim())) }));
    ok(!A.nw3d && !A.cur, tag + 'no net worth view switch and no currency row in Settings');
    ok(A.theme === 'dark,light,auto', tag + 'Theme row: Night, Daylight, Follow my device (' + A.theme + ')');
    ok(A.signout && !A.signoutInDanger, tag + 'Sign out is in the account block, not the danger zone');
    ok(/^mailto:hello@vault-it\.co/.test(A.manage), tag + 'Manage or cancel subscription row (' + A.manage + ')');
    ok(A.plan && A.done, tag + 'plan prices painted in the account block; Done button');
    await p.context().close();
  }

  // theme row works, header button untouched
  {
    const p = await open({ theme: 'dark', w: 1100 }); await showS(p);
    const T = await p.evaluate(() => { const g = v => document.querySelector('#set-theme button[data-val="' + v + '"]'); g('light').click();
      const a = { attr: document.documentElement.getAttribute('data-theme'), st: localStorage.getItem('vi-theme'), act: g('light').classList.contains('active') };
      g('dark').click(); const b = { attr: document.documentElement.getAttribute('data-theme'), st: localStorage.getItem('vi-theme') };
      g('auto').click(); const c = { st: localStorage.getItem('vi-theme'), act: g('auto').classList.contains('active') };
      return { a, b, c, hdr: !!document.getElementById('vi-theme-btn') }; });
    ok(T.a.attr === 'light' && T.a.st === 'light' && T.a.act, 'Daylight sets the theme and remembers it');
    ok(T.b.attr === 'dark' && T.b.st === 'dark', 'Night sets it back');
    ok(T.c.st === null && T.c.act, 'Follow my device forgets the saved choice (the device decides)');
    ok(T.hdr, 'header theme button is still there');
    // live prices off stops automatic refreshes, Refresh still works
    const calls = await p.evaluate(async () => { let n = 0; const of = window.fetch; window.fetch = function () { n++; return Promise.resolve(new Response('{}', { status: 200 })); };
      alState.crypto = [{ id: 1, sym: 'BTC', amount: 1, price: 1 }]; alState.cryptoCheckedAt = 0; document.querySelector('#set-live [data-live="0"]').click();
      const off = localStorage.getItem('vi_live_prices'); crAutoRefresh(); await new Promise(r => setTimeout(r, 300)); const nOff = n;
      document.querySelector('#set-live [data-live="1"]').click(); const on = localStorage.getItem('vi_live_prices'); alState.cryptoCheckedAt = 0; crAutoRefresh(); await new Promise(r => setTimeout(r, 300)); const nOn = n;
      document.querySelector('#set-live [data-live-refresh]').click(); await new Promise(r => setTimeout(r, 300)); window.fetch = of; return { off, on, nOff, nOn, nRef: n }; });
    ok(calls.off === '0' && calls.nOff === 0, 'Live prices Off: the automatic refresh makes no request (' + calls.nOff + ')');
    ok(calls.on === '1' && calls.nOn > 0, 'Live prices On: the automatic refresh runs (' + calls.nOn + ')');
    ok(calls.nRef > calls.nOn, 'Refresh fetches now');
    // saved settings still readable; owner flag shows the owner section
    const S = await p.evaluate(() => ({ claude: localStorage.getItem('claude_api_key'), cg: localStorage.getItem('coingecko_api_key') }));
    ok(S.claude === 'sk-ant-saved' && S.cg === 'CG-saved', 'saved keys are kept, not wiped');
    await p.context().close();
    const q = await open({ theme: 'dark', w: 1100, owner: true }); await showS(q);
    const V = await q.evaluate(() => { const vis = i => { const e = document.getElementById(i); return !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; }; return { sec: vis('set-owner-tools'), notion: vis('set-notion-token'), claude: vis('set-claude-key'), val: (document.getElementById('set-claude-key') || {}).value }; });
    ok(V.sec && V.notion && V.claude && V.val === 'sk-ant-saved', 'owner flag shows the owner section with the saved key');
    await q.context().close();
  }

  // 7. sidebar ledger colours
  for (const theme of ['dark', 'light']) for (const neg of [false, true]) {
    const p = await open({ theme, w: 1100, neg });
    await p.evaluate(() => { try { viRenderLedger(); } catch (e) {} });
    const K = await p.evaluate(() => { const c = id => { const e = document.getElementById(id); return e ? getComputedStyle(e).color : ''; }; const tok = n => { const d = document.createElement('i'); d.style.color = 'var(' + n + ')'; document.body.appendChild(d); const v = getComputedStyle(d).color; d.remove(); return v; };
      return { a: c('sb-assets'), s: c('sb-surplus'), n: c('sb-nw'), green: tok('--green'), blue: tok('--blue'), teal: tok('--teal'), red: tok('--red') }; });
    const tag = 'ledger ' + theme + (neg ? ' negative' : '') + ': ';
    ok(K.a === K.green, tag + 'Total assets is green (' + K.a + ' vs ' + K.green + ')');
    ok(K.s === (neg ? K.red : K.blue), tag + 'Monthly surplus is ' + (neg ? 'red' : 'blue') + ' (' + K.s + ')');
    ok(K.n === K.teal || K.n === K.red, tag + 'Net worth is teal, or red when negative (' + K.n + ')');
    if (!neg) ok(K.green !== K.teal && K.blue !== K.teal && K.green !== K.blue, tag + 'green, blue and teal are three different colours');
    await p.context().close();
  }
  // 8. Night contrast in the sidebar and plan price suffixes (Pedro's audit): each reaches 4.5:1
  {
    const p = await open({ theme: 'dark', w: 1100 }); await p.evaluate(() => toggleSidebar()); await p.waitForTimeout(500);
    const R = await p.evaluate(() => { const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
      const over = (fg, bg) => { const a = fg.match(/[\d.]+/g).map(Number), b = bg.match(/[\d.]+/g).map(Number), al = a.length > 3 ? a[3] : 1; return 'rgb(' + [0, 1, 2].map(i => Math.round(a[i] * al + b[i] * (1 - al))).join(',') + ')'; };
      const ratio = (el, bg, op) => { const cs = getComputedStyle(el); const fg = cs.color; const o = op == null ? 1 : op; const c = over(fg.replace(/rgba?\(([^)]+)\)/, (m, g) => { const a = g.split(',').map(Number); return 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + (a.length > 3 ? a[3] * o : o) + ')'; }), bg); const L1 = lum(c), L2 = lum(bg); return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); };
      const panel = 'rgb(8,13,20)'; const out = {};
      ['GBP', 'USD', 'EUR', 'INR'].forEach(k => out[k] = ratio(document.querySelector('#left-sidebar button[data-c="' + k + '"]'), panel));
      out.settings = ratio(document.querySelector('#left-sidebar button[onclick="showSettings()"]'), panel);
      const t = document.querySelector('#sidebar-toggle span'); out.toggleOp = getComputedStyle(t).opacity;
      return out; });
    ok(R.GBP >= 4.5 && R.USD >= 4.5 && R.EUR >= 4.5 && R.INR >= 4.5, 'Night: currency switcher reaches 4.5:1 (' + [R.GBP, R.USD, R.EUR, R.INR].map(x => x.toFixed(2)).join(' ') + ')');
    ok(R.settings >= 4.5, 'Night: sidebar Settings button reaches 4.5:1 (' + R.settings.toFixed(2) + ')');
    ok(R.toggleOp === '1', 'Night: the VAULT-IT tab label is full opacity (' + R.toggleOp + ')');
    await p.context().close();
  }
  // 9. phone: the side panel clears the header and the tab bar (Pedro 2, 3)
  {
    const p = await open({ theme: 'dark', w: 390 }); await p.evaluate(() => toggleSidebar()); await p.waitForTimeout(600);
    const G = await p.evaluate(() => { const s = document.getElementById('left-sidebar').getBoundingClientRect(), h = document.getElementById('topnav').getBoundingClientRect(), t = document.getElementById('vi-tabs').getBoundingClientRect(), sb = document.querySelector('#left-sidebar button[onclick="showSettings()"]'); sb.scrollIntoView({ block: 'end' }); const b = sb.getBoundingClientRect(); return { top: s.top, hdr: h.bottom, bot: b.bottom, tab: t.top }; });
    ok(G.top >= G.hdr - 1, '390: side panel starts under the header (' + G.top + ' vs ' + G.hdr + ')');
    ok(G.bot <= G.tab + 1, '390: the Settings button clears the tab bar (' + G.bot + ' vs ' + G.tab + ')');
    await p.context().close();
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
