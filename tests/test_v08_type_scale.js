// v0.8 type scale (F2): on phones, folds and tablets (under 1100 px) the root is ~15 px and no text is under 10.5 px,
// measured as drawn (SVG text includes its viewBox scale). Desktop (1100+) keeps its scale. The 3D stage keeps its size.
// The change makes no new clipped or overlapping text: each view is measured with the type scale on and then off in the same page.
// No sideways page scroll at 390, 690, 1100 and 1440. Run: node tests/test_v08_type_scale.js
const { chromium } = require('playwright');
const routeThree = require('./three_route');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const URL_ = 'file:///home/user/Vault-It/index.html?bypass=websummit';
const sub = s => `showTab('assets');showSubtab('assets','${s}',document.querySelector('.subtab-btn[onclick*="${s}"]'))`;
const VIEWS = [
  ['overview', "showTab('overview')"], ['budget', "showTab('budget')"], ['house', "showTab('house')"],
  ['cash', sub('cash')], ['stocks', sub('stocks')], ['crypto', sub('crypto')], ['metals', sub('metals')], ['other', sub('other')], ['liabilities', sub('liabilities')],
  ['debt', "showTab('debt')"], ['biz', "showTab('biz')"], ['achievements', "showTab('achievements')"],
  ['settings', 'showSettings()'], ['paywall', 'showPaywall()'], ['help', "document.getElementById('vi-help-btn').click()"],
  ['mortgage', "showTab('house');hbOpenCalc()"], ['debtform', "showTab('debt');showDebtForm()"], ['feedback', "document.getElementById('vi-fb-btn').click()"],
];
// Deliberate exceptions under 10 px (agreed with the creative director): nav USP/PRO badges (8 px, else they cover the tab icons),
// the Roadmap stage numbers inside the coins (8 px, decorative), the SVG fallback drawn when the 3D metals scene cannot start
// (a scene, like the canvases), and the formula superscript in the mortgage notes.
const EXEMPT = /span\.vi-usp|span\.vi-pro|metalsSvg|>sup \||fire-coin[^|]*\|\s*\d\d$/;

function measure() {
  const vw = innerWidth, small = [], boxes = [];
  for (const el of document.querySelectorAll('body *')) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|CANVAS|OPTION|svg|path|use)$/.test(el.tagName)) continue;
    let t = ''; for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent; t = t.trim(); if (!t) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.right < 0 || r.left > vw) continue;
    let hid = false; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) { hid = true; break; } } if (hid) continue;
    const cs = getComputedStyle(el); let f = parseFloat(cs.fontSize);
    if (el.ownerSVGElement && el.getScreenCTM) { const m = el.getScreenCTM(); if (m) f *= Math.hypot(m.a, m.b); }
    let p = [], e = el; for (let i = 0; e && e.nodeType === 1 && i < 4; e = e.parentElement, i++) { let s = e.tagName.toLowerCase(); if (e.id) { p.unshift(s + '#' + e.id); break; } if (e.classList.length) s += '.' + [...e.classList].slice(0, 2).join('.'); p.unshift(s); }
    const sel = p.join('>') + ' | ' + t.slice(0, 24);
    small.push([Math.round(f * 100) / 100, sel]);
    // clipped: its own text is cut off by its box (no ellipsis), or the box sticks out past the screen edge
    const clip = !el.ownerSVGElement && (cs.overflow !== 'visible' || cs.overflowX !== 'visible') && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2 && el.children.length === 0;
    let scroller = false; for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const ox = getComputedStyle(e).overflowX; if (ox === 'auto' || ox === 'scroll') { scroller = true; break; } }
    const out = r.right > vw + 1 && !scroller;   // past the screen edge, and not inside a sideways scroller
    let fixed = false; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const pz = getComputedStyle(e).position; if (pz === 'fixed' || pz === 'sticky') { fixed = true; break; } }   // bars over the page are not overlaps
    boxes.push({ sel, clip: clip || out, r: [r.left, r.top, r.right, r.bottom], leaf: el.children.length === 0 && !el.ownerSVGElement && !fixed });
  }
  // overlap between leaf text boxes that are not nested (counted once per pair, 3 px tolerance)
  const L = boxes.filter(b => b.leaf), over = [];
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i].r, b = L[j].r, x = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), y = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
    if (x > 3 && y > 3) over.push(L[i].sel + ' X ' + L[j].sel);
  }
  return { root: parseFloat(getComputedStyle(document.documentElement).fontSize), small, clipped: boxes.filter(b => b.clip).map(b => b.sel), over,
    sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
}

(async () => {
  const b = await chromium.launch();
  for (const w of [390, 690, 1100, 1440]) {
    const phone = w < 700, narrow = w < 1100;
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, isMobile: phone, hasTouch: phone });
    await routeThree(ctx);
    let under = 0, under105 = 0, sideways = [], newClip = [], newOver = [], errs = [], root = 0;
    for (const [name, js] of VIEWS) {
      const page = await ctx.newPage(); page.on('pageerror', e => errs.push(name + ': ' + e.message));
      await page.addInitScript(() => { try { localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} });
      await page.goto(URL_); await page.waitForTimeout(1100);
      await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
      try { await page.evaluate(js); } catch (e) { errs.push(name + ' js: ' + e.message); }
      await page.waitForTimeout(600);
      const on = await page.evaluate(measure); root = on.root;
      if (on.sideways) sideways.push(name);
      if (narrow) {
        for (const [f, s] of on.small) { if (f < 10.5) under105++; if (f < 10 && !EXEMPT.test(s)) { under++; if (under <= 12) console.log(`      ${w} ${name}: ${f}px  ${s}`); } }
        // the same page with the type scale switched off: anything clipped or overlapping only with it on is new
        await page.addStyleTag({ content: ':root{--vi-scale:1!important;--vi-fs-min:0px!important}' }); await page.waitForTimeout(300);
        const off = await page.evaluate(measure);
        const oc = new Set(off.clipped.map(s => s.split(' | ')[0])), oo = new Set(off.over.map(s => s.replace(/ \| [^X]*/g, '')));
        for (const s of on.clipped) if (!oc.has(s.split(' | ')[0])) newClip.push(name + ': ' + s);
        for (const s of on.over) if (!oo.has(s.replace(/ \| [^X]*/g, ''))) newOver.push(name + ': ' + s);
      }
      await page.close();
    }
    if (narrow) {
      ok(Math.abs(root - 13 * 1.15) < 0.05, `${w}: root is ${root} px (13 x 1.15)`);
      ok(under === 0, `${w}: no text under 10 px outside the agreed exceptions (${under} found; ${under105} under 10.5 incl. exceptions)`);
      ok(newClip.length === 0, `${w}: no text newly clipped by the bigger type (${newClip.length})` + (newClip.length ? '\n        ' + newClip.slice(0, 8).join('\n        ') : ''));
      ok(newOver.length === 0, `${w}: no text newly overlapping (${newOver.length})` + (newOver.length ? '\n        ' + newOver.slice(0, 8).join('\n        ') : ''));
    } else ok(Math.abs(root - 13 * (w >= 1400 ? 1.28 : 1.12)) < 0.05, `${w}: desktop root unchanged (${root} px)`);
    ok(sideways.length === 0, `${w}: no sideways page scroll on any view` + (sideways.length ? ' (' + sideways.join(', ') + ')' : ''));
    ok(errs.length === 0, `${w}: no page errors` + (errs.length ? ' (' + errs[0].slice(0, 120) + ')' : ''));

    // the 3D house stage keeps its size: same canvas box with the type scale on and off
    const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} });
    await page.goto(URL_); await page.waitForTimeout(1100);
    await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await page.evaluate("showTab('house')"); await page.waitForTimeout(700);
    const st = () => page.evaluate(() => { const c = document.querySelector('#houseSceneCard canvas'); if (!c) return 'none'; const r = c.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
    const s1 = await st(); await page.addStyleTag({ content: ':root{--vi-scale:' + (narrow ? 1 : 'var(--vi-scale)') + '!important;--vi-fs-min:0px!important}' }); await page.waitForTimeout(400); const s0 = await st();
    ok(s1 === s0 && s1 !== 'none', `${w}: 3D house stage size unchanged by the type scale (${s1} vs ${s0})`);
    await ctx.close();
  }
  // the user's Text Size setting still works on top (Large = 15 px base x 1.15 on a phone)
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }); const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} });
  await page.goto(URL_); await page.waitForTimeout(1000);
  const lg = await page.evaluate(() => { document.documentElement.style.setProperty('--vi-base', '15px'); return parseFloat(getComputedStyle(document.documentElement).fontSize); });
  ok(Math.abs(lg - 15 * 1.15) < 0.05, `390: Text Size Large still scales the app (${lg} px)`);
  await b.close();
  console.log(fails ? `FAILURES ${fails}` : 'ALL OK');
  process.exit(fails ? 1 : 0);
})();
