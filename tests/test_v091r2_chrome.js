// v0.9.1 round 2, chunk A (chrome): R1 wordmark in proportion + swinging dial, R23/R24 profile card (credit-card ratio, bigger photo, no foil on the photo),
// R25 Daylight page background more saturated, R26 Night header in Daylight (?hdr=paper keeps the paper one), R27 animated Night/Daylight switch.
// Run: node tests/test_v091r2_chrome.js   (VI_INDEX points the test at another checkout, as in test_v091_chrome.js)
const { chromium } = require('playwright');
const INDEX = 'file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const seed = ({ t, png, user }) => {
  if (t && !localStorage.getItem('vi-theme')) localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi-tour-done', '1');
  if (user) localStorage.setItem('vi_user', JSON.stringify({ name: 'Pete Thickett', job: 'Founder', dream: 'Architect', saveArch: 'The Investor', spendArch: 'Impulse Reactor', avatar: png, joined: '2026-01-05' }));
};
const HIDE = '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal,#trial-banner,#tester-welcome,#vi-fb-nudge,#demo-chip,#pwa-install-banner{display:none!important}';
const open = async (b, w, h, theme, o = {}) => {
  const phone = w < 600;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone, colorScheme: theme === 'light' ? 'light' : 'dark', reducedMotion: o.rm ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.route('**/rest/v1/rpc/campaign_counts', r => r.abort());
  await p.addInitScript(seed, { t: o.noTheme ? '' : theme, png: PNG, user: o.user !== false });
  await p.goto(INDEX + (o.q || '')); await p.waitForTimeout(1400);
  await p.addStyleTag({ content: HIDE });
  return p;
};
// WCAG contrast of two computed colours (rgb / rgba strings)
const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hsl = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; return { s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l }; };

(async () => {
  const b = await chromium.launch();
  for (const theme of ['dark', 'light']) for (const [w, h] of [[1440, 900], [1100, 900], [768, 900], [390, 844], [360, 740]]) {
    const p = await open(b, w, h, theme); const T = w + ' ' + theme + ': ';

    // ── R1: wordmark in proportion with the icon; the dial swings left and right by varying degrees ──
    const m = await p.evaluate(() => {
      const mk = [...document.querySelectorAll('#topnav .vi-mark svg')].find(s => s.getBoundingClientRect().width > 0), lg = document.querySelector('#topnav .logo.wm');
      const mr = mk.getBoundingClientRect(), lr = lg.getBoundingClientRect(), fs = parseFloat(getComputedStyle(lg).fontSize);
      const angs = []; for (let i = 0; i < 8; i++) { viMarkTurn(); angs.push(window.viMarkDial); }
      return { mark: Math.round(mr.width), fs, lw: Math.round(lr.width), lh: lr.height, vis: lr.width > 0, angs };
    });
    ok(m.vis && m.fs >= m.mark * 0.5, T + 'wordmark is in proportion with the icon: font ' + m.fs + ' px for a ' + m.mark + ' px mark (at least half)');
    ok(m.angs.some(a => a > 0) && m.angs.some(a => a < 0), T + 'the dial turns both ways (' + m.angs.join(', ') + ')');
    ok(new Set(m.angs.map(Math.abs)).size >= 3 && m.angs.every(a => Math.abs(a) <= 60), T + 'by varying degrees, never more than 60 (' + m.angs.join(', ') + ')');
    ok(await p.evaluate(() => { const d = document.documentElement; return d.scrollWidth <= d.clientWidth + 1; }), T + 'no sideways scroll with the bigger wordmark');

    // ── R23/R24: the sidebar profile card ──
    if (w >= 1024 || w === 390) {
      if (w === 390) await p.evaluate(() => { try { toggleSidebar(); } catch (e) {} });
      const c = await p.evaluate(() => {
        renderPioneerCard(); const card = document.querySelector('#sb-pioneer-card .pioneer-card'), wrap = document.querySelector('#sb-pioneer-card .pioneer-card-wrap');
        const av = document.querySelector('#sb-pioneer-card .pc-avatar-wrap'), inn = document.querySelector('#sb-pioneer-card .pc-avatar-inner'), img = inn.querySelector('img');
        const wr = wrap.getBoundingClientRect(), cs = getComputedStyle(av), ir = inn.getBoundingClientRect();
        return { ratio: wr.width / wr.height, w: Math.round(wr.width), h: Math.round(wr.height), over: card.scrollHeight - card.clientHeight, photo: Math.round(ir.width), photoH: Math.round(ir.height), img: !!img,
          anim: cs.animationName, filter: cs.filter, ishadow: getComputedStyle(inn).filter, imgFilter: getComputedStyle(img).filter, imgAnim: getComputedStyle(img).animationName };
      });
      const lv = await p.evaluate(() => { const out = []; for (const n of [0, 745, 4000, 20000, 90000]) { try { const w = wrState(); w.s = { 'firstLog.0': n }; w.q = {}; w.m = {}; w.h = {}; } catch (e) {} renderPioneerCard();
        const card = document.querySelector('#sb-pioneer-card .pioneer-card'), bd = card.querySelector('.pc-level-badge'); const ar = card.querySelector('.pc-archetypes').getBoundingClientRect(), ft = card.querySelector('.pc-footer').getBoundingClientRect(); const chipCut = [...card.querySelectorAll('.pc-archetype')].some(c => { const r = c.getBoundingClientRect(); return r.bottom > ar.bottom + 0.5 || r.bottom > ft.top + 0.5 || c.scrollHeight > c.clientHeight + 1 || r.right > ar.right; }); out.push({ n, name: bd.textContent, over: card.scrollHeight - card.clientHeight + (chipCut ? 99 : 0), bh: 0 }); } return out; });
      ok(lv.every(r => r.over <= 1), T + 'with every rank name the card holds its shape and nothing is cut off (' + lv.map(r => r.name + ' ' + r.over + '/' + r.bh).join('; ') + ')');
      ok(c.ratio >= 1.5 && c.ratio <= 1.68, T + 'profile card is credit-card shaped, 85.60 x 53.98 = 1.586 (' + c.w + ' x ' + c.h + ' = ' + c.ratio.toFixed(2) + ')');
      ok(c.over <= 1, T + 'nothing is cut off inside the shorter card (overflow ' + c.over + ' px)');
      ok(c.photo >= 64 && c.photoH >= 64, T + 'the profile photo has more room, at least 64 px (' + c.photo + ' x ' + c.photoH + ')');
      ok(c.anim === 'none' && c.filter === 'none' && c.imgFilter === 'none' && c.imgAnim === 'none', T + 'no holographic effect on the photo (animation ' + c.anim + ', filter ' + c.filter + ')');
      ok(await p.evaluate(() => getComputedStyle(document.querySelector('#sb-pioneer-card .pioneer-card-wrap')).animationName !== 'none'), T + 'the card itself keeps its holographic edge');
    }

    // ── R25 / R26: Daylight page background, header ──
    const d = await p.evaluate(() => { const nav = getComputedStyle(document.getElementById('topnav')), body = getComputedStyle(document.body);
      const q = s => { const e = document.querySelector(s); return e && e.getBoundingClientRect().width ? getComputedStyle(e).color : null; };
      return { navBg: nav.backgroundColor, body: body.backgroundColor, tab: q('#topnav .tab-btn .nav-tab-label') || q('#topnav .tab-btn'), nw: q('#nav-nw'), wm: q('#topnav .logo.wm'), hdr: document.documentElement.getAttribute('data-hdr') }; });
    if (theme === 'light') {
      const s = hsl(d.body);
      ok(s.s >= 0.2 && s.s <= 0.36 && s.l >= 0.72 && s.l <= 0.8, T + 'Daylight page background is more saturated, lightness unchanged (' + d.body + ', S ' + s.s.toFixed(2) + ', L ' + s.l.toFixed(2) + ')');
      ok(d.navBg === 'rgb(8, 8, 8)', T + 'the Daylight header is the Night header, dark (' + d.navBg + ')');
      ok(d.tab && contrast(d.tab, d.navBg) >= 4.5 && contrast(d.nw, d.navBg) >= 4.5 && contrast(d.wm, d.navBg) >= 4.5, T + 'header text reads on the dark bar (tab ' + d.tab + ', net worth ' + d.nw + ', wordmark ' + d.wm + ')');
    } else ok(d.navBg === 'rgb(8, 8, 8)' && !d.hdr, T + 'Night header is unchanged (' + d.navBg + ')');
    ok(p.errs.length === 0, T + 'no page errors ' + p.errs.slice(0, 1));

    // ── R27: the animated switch ──
    const s = await p.evaluate(() => { const bt = document.getElementById('vi-theme-btn'), r = bt.getBoundingClientRect(), tr = bt.querySelector('.vi-sw-track'), kn = bt.querySelector('.vi-sw-knob');
      const tk = tr && tr.getBoundingClientRect(), kk = kn && kn.getBoundingClientRect();
      return { role: bt.getAttribute('role'), checked: bt.getAttribute('aria-checked'), pressed: bt.getAttribute('aria-pressed'), label: bt.getAttribute('aria-label'), theme: document.documentElement.getAttribute('data-theme'), w: r.width, h: r.height,
        tw: tk && Math.round(tk.width), th: tk && Math.round(tk.height), kw: kk && Math.round(kk.width), lbl: !!bt.querySelector('.vi-th-lbl'), title: bt.title, anim: bt.classList.contains('vi-th-anim') }; });
    ok(s.role === 'switch' && s.checked === (s.theme === 'dark' ? 'true' : 'false') && s.pressed === null && s.label === 'Night mode', T + 'role=switch, aria-checked matches the theme, fixed label (' + s.role + '/' + s.checked + '/' + s.label + ')');
    ok(s.w >= 44 && s.h >= 44, T + 'hit area at least 44 x 44 (' + Math.round(s.w) + ' x ' + Math.round(s.h) + ')');
    const want = w >= 1024 ? [64, 32, 26] : w >= 600 ? [56, 30, 24] : [48, 26, 20];
    ok(s.tw === want[0] && s.th === want[1] && s.kw === want[2], T + 'track ' + want[0] + ' x ' + want[1] + ', knob ' + want[2] + ' (got ' + s.tw + ' x ' + s.th + ', knob ' + s.kw + ')');
    ok(!s.lbl && /^Switch to (Night|Daylight)$/.test(s.title) && s.title.includes(theme === 'light' ? 'Night' : 'Daylight'), T + 'no text label, hover tip says where it goes (' + s.title + ')');
    ok(await p.evaluate(() => { const d = document.documentElement; return d.scrollWidth <= d.clientWidth + 1; }), T + 'no sideways scroll with the switch');
    // Space and Enter toggle; the choice is stored
    await p.focus('#vi-theme-btn'); await p.keyboard.press('Space'); await p.waitForTimeout(250);
    let t2 = await p.evaluate(() => [document.documentElement.getAttribute('data-theme'), localStorage.getItem('vi-theme'), document.getElementById('vi-theme-btn').getAttribute('aria-checked')]);
    const flip = theme === 'dark' ? 'light' : 'dark';
    ok(t2[0] === flip && t2[1] === flip && t2[2] === (flip === 'dark' ? 'true' : 'false'), T + 'Space switches to ' + flip + ' and stores it (' + t2 + ')');
    await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    t2 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
    ok(t2 === theme, T + 'Enter switches back (' + t2 + ')');
    // knob contrast against its sky, both scenes (knob fill vs sky fill, from the computed styles)
    for (const th of ['dark', 'light']) {
      await p.evaluate(t => { if (document.documentElement.getAttribute('data-theme') !== t) viToggleTheme(); }, th); await p.waitForTimeout(700);
      const k = await p.evaluate(() => { const bt = document.getElementById('vi-theme-btn'); const kn = getComputedStyle(bt.querySelector('.vi-sw-knob')).backgroundColor, tr = getComputedStyle(bt.querySelector('.vi-sw-track')), hd = getComputedStyle(document.getElementById('topnav')).backgroundColor;
        return { kn, sky: tr.backgroundColor, edge: tr.borderTopColor, hd, kx: bt.querySelector('.vi-sw-knob').getBoundingClientRect().x - bt.querySelector('.vi-sw-track').getBoundingClientRect().x }; });
      ok(contrast(k.kn, k.sky) >= 3, T + th + ' scene: knob against its sky at least 3:1 (' + k.kn + ' on ' + k.sky + ' = ' + contrast(k.kn, k.sky).toFixed(2) + ')');
      ok(contrast(k.edge, k.hd) >= 3, T + th + ' scene: track edge against the header at least 3:1 (' + k.edge + ' on ' + k.hd + ' = ' + contrast(k.edge, k.hd).toFixed(2) + ')');
      ok(th === 'dark' ? k.kx + want[2] / 2 > want[0] / 2 + 6 : k.kx + want[2] / 2 < want[0] / 2 - 6, T + th + ' scene: the knob is on the ' + (th === 'dark' ? 'right' : 'left') + ' (' + Math.round(k.kx) + ')');
    }
    // the stored choice wins after a reload
    await p.evaluate(() => { localStorage.setItem('vi-theme', 'light'); }); await p.reload(); await p.waitForTimeout(900);
    const rl = await p.evaluate(() => [document.documentElement.getAttribute('data-theme'), document.getElementById('vi-theme-btn').getAttribute('aria-checked'), document.getElementById('vi-theme-btn').classList.contains('vi-th-anim')]);
    ok(rl[0] === 'light' && rl[1] === 'false', T + 'after a reload the stored theme wins and the switch matches (' + rl + ')');
    await p.context().close();
  }

  // first visit follows the device; the stored choice beats the device
  for (const [scheme, want] of [['light', 'light'], ['dark', 'dark']]) {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: scheme }); const p = await ctx.newPage();
    await p.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); }); await p.goto(INDEX); await p.waitForTimeout(700);
    const got = await p.evaluate(() => [document.documentElement.getAttribute('data-theme'), document.getElementById('vi-theme-btn').getAttribute('aria-checked')]);
    ok(got[0] === want && got[1] === (want === 'dark' ? 'true' : 'false'), 'first visit on a ' + scheme + ' device starts in ' + want + ' with the switch to match (' + got + ')');
    await ctx.close();
  }
  {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: 'light' }); const p = await ctx.newPage();
    await p.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi-theme', 'dark'); }); await p.goto(INDEX); await p.waitForTimeout(700);
    ok(await p.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark', 'a stored Night choice beats a light device');
    await ctx.close();
  }

  // ?hdr=paper keeps the paper header in Daylight, so the owner can compare
  { const p = await open(b, 1100, 900, 'light', { q: '?hdr=paper' });
    const nb = await p.evaluate(() => getComputedStyle(document.getElementById('topnav')).backgroundColor);
    ok(nb !== 'rgb(8, 8, 8)' && hsl(nb).l > 0.6, '?hdr=paper keeps the paper header in Daylight (' + nb + ')');
    await p.context().close(); }

  // reduced motion: the dial stays still, the switch has no transition, the card has no animation on the photo
  for (const [w, h] of [[1100, 900], [390, 844]]) {
    const p = await open(b, w, h, 'dark', { rm: true });
    const r = await p.evaluate(() => { const a0 = window.viMarkDial; viMarkTurn(); viMarkTurn(); const bt = document.getElementById('vi-theme-btn'), kn = bt.querySelector('.vi-sw-knob'), sc = [...bt.querySelectorAll('*')].map(e => getComputedStyle(e)).concat(getComputedStyle(kn));
      return { a0, a1: window.viMarkDial, tr: sc.map(c => c.transitionDuration.split(',').map(x => parseFloat(x)).reduce((a, x) => Math.max(a, x), 0)).reduce((a, x) => Math.max(a, x), 0), an: sc.map(c => c.animationName).filter(n => n !== 'none') }; });
    ok(r.a0 === 0 && r.a1 === 0, w + ' reduced motion: the dial stays still (' + r.a0 + ', ' + r.a1 + ')');
    ok(r.tr === 0 && r.an.length === 0, w + ' reduced motion: the switch has no transition or animation (' + r.tr + 's, ' + r.an + ')');
    await p.context().close();
  }

  // the switch has a visible focus ring
  { const p = await open(b, 1100, 900, 'dark'); await p.keyboard.press('Tab');
    await p.focus('#vi-theme-btn'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
    const f = await p.evaluate(() => { const c = getComputedStyle(document.getElementById('vi-theme-btn')); return [document.activeElement.id, c.outlineStyle, c.outlineWidth, c.outlineOffset]; });
    ok(f[0] === 'vi-theme-btn' && f[1] !== 'none' && parseFloat(f[2]) >= 2 && parseFloat(f[3]) >= 2, 'keyboard focus shows a 2 px ring, 2 px out (' + f + ')');
    await p.context().close(); }
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
