// v0.8 type scale (F2, Pedro's spec section H): floors under the small sizes at every width, no root bump.
// Source: every font-size under .81rem (or 10.5px) carries the floor for its source size (10.5 / 11.5 / 12.5 px, 10 px for uppercase Syne).
// Screen: at 390, 690, 1100 and 1440 no text is under 10 px as drawn (SVG text includes its viewBox scale), apart from the agreed exceptions.
// The floors make no new clipped or overlapping text: each view is measured with the floors on and then off (tokens set to 0) in the same page.
// Root size, the tab bar's height and the 3D house stage's size do not change. No sideways page scroll. Run: node tests/test_v08_type_scale.js
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
// Deliberate exceptions under 10 px (agreed with the creative director): nav USP/PRO badges (9 px caps), the Roadmap stage numbers
// inside the coins (8 px, decorative), the SVG fallback drawn when the 3D metals scene cannot start (a scene, like the canvases),
// the house builder viewport's own HUD (hard rule: not touched) and the formula superscript in the mortgage notes.
const EXEMPT = /span\.vi-usp|span\.vi-pro|metalsSvg|hud-bar|>sup \||fire-coin[^|]*\|\s*\d\d$/;
const OFF = ':root{--vi-fs-0:0px!important;--vi-fs-1:0px!important;--vi-fs-2:0px!important;--vi-fs-3:0px!important}';

// source check: every small font-size in index.html carries its tier floor
{
  const src = require('fs').readFileSync('/home/user/Vault-It/index.html', 'utf8');
  const body = src.slice(0, src.indexOf('// <<HB3D_ENGINE')) + src.slice(src.indexOf('// HB3D_ENGINE>>'));
  const bare = [], wrong = [];
  for (const m of body.matchAll(/font-size\s*:\s*(\d*\.?\d+)(rem|px)(?![\w(])/g)) {
    const n = +m[1], u = m[2]; if (u === 'rem' ? n >= 0.81 : n >= 10.5) continue;
    const line = body.slice(body.lastIndexOf('\n', m.index) + 1, body.indexOf('\n', m.index));
    if (/\.nw-more-btns button\{|\.bd-tile-tt b\{|\.hud-bar|(^|[^b])tab-btn\b|#app-footer|\.ft-[a-z]|#vi-fb-btn|\.i3d-hint\{|\.i3d-badge\{|#topnav \.vi-usp,#topnav \.vi-pro\{/.test(line)) continue;   // KEEP rules (C2 pills, D2 card titles, house viewport HUD)
    bare.push(line.trim().slice(0, 90));
  }
  // the font: shorthand too, including a clamp() minimum (follow-up: .dtm-n / .dtm-s on the Debt tree map)
  for (const m of body.matchAll(/\bfont\s*:\s*(?:[a-z0-9-]+\s+){0,3}(clamp\(\s*)?(\d*\.?\d+)(rem|px)/g)) {
    const n = +m[2], u = m[3]; if (u === 'rem' ? n >= 0.81 : n >= 10.5) continue;
    const line = body.slice(body.lastIndexOf('\n', m.index) + 1, body.indexOf('\n', m.index));
    if (/\.nw-more-btns button\{|\.bd-tile-tt b\{|\.hud-bar|(^|[^b])tab-btn\b|#app-footer|\.ft-[a-z]|#vi-fb-btn|\.i3d-hint\{|\.i3d-badge\{|#topnav \.vi-usp,#topnav \.vi-pro\{/.test(line)) continue;
    bare.push('font: ' + line.trim().slice(0, 80));
  }
  for (const m of body.matchAll(/max\((\d*\.?\d+)rem,var\(--vi-fs-(\d)\)\)/g)) {
    const n = +m[1], t = +m[2], want = n < 0.56 ? 1 : n < 0.70 ? 2 : 3;
    if (t < want && t !== 0) wrong.push(m[0]);   // a caps Syne button may sit above its source tier (11.5 px)
  }
  ok(bare.length === 0, `source: every font-size under .81rem / 10.5px has a floor (${bare.length} without)` + (bare.length ? '\n        ' + bare.slice(0, 6).join('\n        ') : ''));
  ok(wrong.length === 0, `source: each floor matches its source size tier (${wrong.length} wrong)` + (wrong.length ? ' ' + wrong.slice(0, 4).join(' ') : ''));
  ok(/--vi-fs-1:10\.5px;--vi-fs-2:11\.5px;--vi-fs-3:12\.5px/.test(src) && /--vi-fs-0:10px/.test(src), 'source: floor tokens 10 / 10.5 / 11.5 / 12.5 px');
  ok(!/--vi-scale:1\.15/.test(src), 'source: no root bump');
}

function measure() {
  for (const an of document.getAnimations()) { try { an.pause(); an.currentTime = 0; } catch (e) {} }   // measure at rest (the Roadmap's next coin spins)
  const vw = innerWidth, small = [], boxes = [];
  for (const el of document.querySelectorAll('body *')) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|CANVAS|OPTION|svg|path|use)$/.test(el.tagName)) continue;
    let t = ''; for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent; t = t.trim(); if (!t) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.right < 0 || r.left > vw) continue;
    let hid = false; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) { hid = true; break; } } if (hid) continue;
    const cs = getComputedStyle(el); let f = parseFloat(cs.fontSize);
    if (el.ownerSVGElement && el.getScreenCTM) { const m = el.getScreenCTM(); if (m) f *= Math.hypot(m.a, m.b); }
    else { for (let e = el; e && e.nodeType === 1; e = e.parentElement) f *= parseFloat(getComputedStyle(e).zoom) || 1; }   // CSS zoom (the desktop nav is zoomed to fit)
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
    const phone = w < 700;
    const ctx = await b.newContext({ viewport: { width: w, height: phone ? 844 : 900 }, isMobile: phone, hasTouch: phone });
    await routeThree(ctx);
    let under = 0, under105 = 0, navGrew = [], sideways = [], newClip = [], newOver = [], errs = [], root = 0;
    for (const [name, js] of VIEWS) {
      const page = await ctx.newPage(); page.on('pageerror', e => errs.push(name + ': ' + e.message));
      await page.addInitScript(() => { try { localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} });
      await page.goto(URL_); await page.waitForTimeout(1100);
      await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
      try { await page.evaluate(js); } catch (e) { errs.push(name + ' js: ' + e.message); }
      await page.waitForTimeout(600);
      const on = await page.evaluate(measure); root = on.root;
      if (on.sideways) sideways.push(name);
      {
        for (const [f, s] of on.small) { if (f < 10.5) under105++; if (f < 10 && !EXEMPT.test(s)) { under++; if (under <= 12) console.log(`      ${w} ${name}: ${f}px  ${s}`); } }
        // the same page with the floors switched off: anything clipped or overlapping only with them on is new
        const nav1 = await page.evaluate(() => Math.round(document.getElementById('topnav').getBoundingClientRect().height));
        await page.addStyleTag({ content: OFF }); await page.waitForTimeout(300);
        const nav0 = await page.evaluate(() => Math.round(document.getElementById('topnav').getBoundingClientRect().height));
        if (nav1 !== nav0) navGrew.push(`${name} ${nav0}->${nav1}`);
        const off = await page.evaluate(measure);
        const oc = new Set(off.clipped.map(s => s.split(' | ')[0])), oo = new Set(off.over.map(s => s.replace(/ \| [^X]*/g, '')));
        for (const s of on.clipped) if (!oc.has(s.split(' | ')[0])) newClip.push(name + ': ' + s);
        for (const s of on.over) if (!oo.has(s.replace(/ \| [^X]*/g, ''))) newOver.push(name + ': ' + s);
      }
      await page.close();
    }
    {
      ok(Math.abs(root - 13 * (w >= 1400 ? 1.28 : w >= 1100 ? 1.12 : 1)) < 0.05, `${w}: root size unchanged (${root} px)`);
      ok(navGrew.length === 0, `${w}: the tab bar keeps its height` + (navGrew.length ? ' (' + navGrew.slice(0, 3).join(', ') + ')' : ''));
      ok(under === 0, `${w}: no text under 10 px outside the agreed exceptions (${under} found; ${under105} under 10.5 incl. exceptions)`);
      ok(newClip.length === 0, `${w}: no text newly clipped by the floors (${newClip.length})` + (newClip.length ? '\n        ' + newClip.slice(0, 8).join('\n        ') : ''));
      ok(newOver.length === 0, `${w}: no text newly overlapping (${newOver.length})` + (newOver.length ? '\n        ' + newOver.slice(0, 8).join('\n        ') : ''));
    }
    ok(sideways.length === 0, `${w}: no sideways page scroll on any view` + (sideways.length ? ' (' + sideways.join(', ') + ')' : ''));
    ok(errs.length === 0, `${w}: no page errors` + (errs.length ? ' (' + errs[0].slice(0, 120) + ')' : ''));

    // the 3D house stage keeps its size: same canvas box with the type scale on and off
    const page = await ctx.newPage(); await page.addInitScript(() => { try { localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} });
    await page.goto(URL_); await page.waitForTimeout(1100);
    await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await page.evaluate("showTab('house')"); await page.waitForTimeout(700);
    const st = () => page.evaluate(() => { const c = document.querySelector('#houseSceneCard canvas'); if (!c) return 'none'; const r = c.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
    const s1 = await st(); const offTag = await page.addStyleTag({ content: OFF }); await page.waitForTimeout(400); const s0 = await st();
    await offTag.evaluate(e => e.remove()); await page.waitForTimeout(300);   // floors back on for the fit checks below
    ok(s1 === s0 && s1 !== 'none', `${w}: 3D house stage size unchanged by the floors (${s1} vs ${s0})`);
    // Pedro review 1: badges clear of their tab's icon and label; the 3D key wraps rather than losing its end; KPI labels on one line
    const fit = await page.evaluate(() => { const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
      const bad = [...document.querySelectorAll('#topnav .vi-usp,#topnav .vi-pro')].filter(x => x.offsetParent).filter(bd => { const t = bd.closest('.tab-btn'), br = bd.getBoundingClientRect(), lb = t.querySelector('.nav-tab-label');
        return hit(br, t.querySelector('svg').getBoundingClientRect()) || (lb && lb.offsetParent && hit(br, lb.getBoundingClientRect())); }).map(x => x.textContent);
      const tabs = document.querySelector('#topnav .vi-tabs'), key = document.querySelector('#houseSceneCard .vp-key');
      showTab('overview'); const kpi = [...document.querySelectorAll('#ov-page .ov-kpi-lbl')].filter(e => e.offsetParent);
      return { bad, tabsOver: tabs.scrollWidth - tabs.clientWidth, keyCut: key && key.offsetParent ? key.scrollWidth > key.clientWidth + 1 : false,
        kpiCut: kpi.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim()), kpiTall: kpi.filter(e => e.getBoundingClientRect().height > parseFloat(getComputedStyle(e).fontSize) * 2).map(e => e.textContent.trim()) }; });
    ok(fit.bad.length === 0, `${w}: USP/PRO badges clear of their tab's icon and label (${fit.bad.join(',')})`);
    ok(fit.tabsOver <= 1, `${w}: all tabs fit in the tab row (${fit.tabsOver} px over)`);
    ok(!fit.keyCut, `${w}: the 3D key line is not cut off`);
    ok(fit.kpiCut.length === 0 && fit.kpiTall.length === 0, `${w}: dashboard KPI labels on one line, none cut (${fit.kpiCut.concat(fit.kpiTall).join(',')})`);
    await ctx.close();
  }
  // the Roadmap's phone carousel still fades the coins away from the centre (its scale floor is 1 so names keep their size)
  {
    const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p2 = await c2.newPage();
    await p2.addInitScript(() => { try { localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} });
    await p2.goto(URL_); await p2.waitForTimeout(1100); await p2.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await p2.evaluate("showTab('overview')"); await p2.waitForTimeout(800);
    const co = await p2.evaluate(() => { try { fireCarousel(); } catch (e) {} return [...document.querySelectorAll('#fire-roadmap-svg .fire-coin')].map(g => [parseFloat(g.style.opacity || '1'), (g.style.transform.match(/scale\(([\d.]+)\)/) || [0, 1])[1] * 1]); });
    ok(co.length > 2 && co.some(x => x[0] < 0.9) && co.every(x => x[1] >= 1), `390: Roadmap coins away from the centre still fade, and none scales under 1 (opacity min ${Math.min(...co.map(x => x[0]))}, scale min ${Math.min(...co.map(x => x[1]))})`);
    await c2.close();
  }
  // follow-up items (David's sweep of 8b33d7c): Entrepreneur KPI labels are never cut; the Stocks donut sub-line and the item block caption draw at 10.5 px or more
  {
    const c3 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p3 = await c3.newPage();
    await p3.addInitScript(() => { try { localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} });
    await p3.goto(URL_); await p3.waitForTimeout(1100); await p3.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    const fu = await p3.evaluate(() => { showTab('biz');
      const biz = [...document.querySelectorAll('#tab-biz .ov-kpi-lbl')].filter(e => e.offsetParent).filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim());
      const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:150px;height:150px'; document.body.appendChild(host);
      host.innerHTML = '<div style="position:relative;width:150px;height:150px">' + generateAssetISO('Laptop', '', 'asset') + '</div>' + stkDonut([{ v: 1, c: '#3ecf8e' }], 1, '£1,234', '+20.29%', '#3ecf8e');
      const cap = host.querySelector('.iso-cap'), sub = [...host.querySelectorAll('svg text')].pop();
      const out = { biz, cap: cap ? parseFloat(getComputedStyle(cap).fontSize) : 0, capText: cap ? cap.textContent : '', sub: +(parseFloat(sub.getAttribute('font-size')) * sub.getScreenCTM().a).toFixed(2) }; host.remove(); return out; });
    ok(fu.biz.length === 0, `390: Entrepreneur KPI labels are not cut (${fu.biz.join(',')})`);
    const bl = await p3.evaluate(() => [...document.querySelectorAll('#tab-biz .ov-kpi-lbl')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight === 'normal' ? parseFloat(getComputedStyle(e).fontSize) * 1.2 : getComputedStyle(e).lineHeight))));
    ok(bl.length > 0 && bl.every(n => n <= 2), `390: Entrepreneur KPI labels wrap to at most two lines (${bl.join(',')})`);
    await p3.setViewportSize({ width: 360, height: 780 }); await p3.waitForTimeout(300);
    const bl360 = await p3.evaluate(() => [...document.querySelectorAll('#tab-biz .ov-kpi-lbl')].filter(e => e.offsetParent).map(e => [Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight === 'normal' ? parseFloat(getComputedStyle(e).fontSize) * 1.2 : getComputedStyle(e).lineHeight)), e.scrollWidth > e.clientWidth + 1]));
    ok(bl360.length > 0 && bl360.every(x => x[0] <= 2 && !x[1]), `360: Entrepreneur KPI labels wrap to at most two lines, none cut (${bl360.map(x => x[0]).join(',')})`);
    // David / Pedro (2 Nov): 2x2 on phones and small tablets, 4 across once the labels fit in two lines; never a lone tile on its own row
    for (const w of [460, 599, 700, 768, 1100]) {
      await p3.setViewportSize({ width: w, height: 844 }); await p3.waitForTimeout(300);
      const g = await p3.evaluate(() => { const k = [...document.querySelectorAll('#tab-biz .ov-kpis:not(.debt-strip)>.ov-kpi')].filter(e => e.offsetParent); const rows = {}; k.forEach(e => { const t = Math.round(e.getBoundingClientRect().top); rows[t] = (rows[t] || 0) + 1; });
        const l = k.map(e => e.querySelector('.ov-kpi-lbl')); return { rows: Object.values(rows), lines: l.map(e => Math.round(e.getBoundingClientRect().height / (parseFloat(getComputedStyle(e).fontSize) * 1.2))), cut: l.some(e => e.scrollWidth > e.clientWidth + 1) }; });
      ok(g.rows.length && g.rows.every(n => n === g.rows[0]) && (w < 768 ? g.rows[0] === 2 : g.rows[0] === 4) && g.lines.every(n => n <= 2) && !g.cut, `${w}: Entrepreneur KPIs ${w < 768 ? '2x2' : '4 across'}, no lone tile, labels at most two lines (rows ${g.rows.join('+')}, lines ${g.lines.join(',')})`);
    }
    await p3.setViewportSize({ width: 390, height: 844 }); await p3.waitForTimeout(300);
    ok(fu.cap >= 10.5 && fu.capText === 'LAPTOP', `item block caption at ${fu.cap} px (${fu.capText})`);
    ok(fu.sub >= 10.5, `Stocks donut sub-line drawn at ${fu.sub} px`);
    await c3.close();
  }
  // Pedro (2 Nov): the forecast note shows only in Graph view; hidden in 3D, and the remembered choice holds on reload
  // (a signed-in seeded page: the sample-data mode starts every load fresh, so it cannot show a remembered choice; seed from test_sankey_fit)
  {
    const seedFc=()=>{if(localStorage.getItem('pos_debt1'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com'}));
      localStorage.setItem('vi_settings',JSON.stringify({fontSize:'large',contrast:'standard',motion:'full',currency:'GBP',compactNav:true}));
      const ex=[['Council tax',147,'ce'],['Electricity',75,'ce'],['Gas',60,'ce'],['Phone & internet',50,'ce'],['Water',35,'ce'],['Rent',300,'ce'],['Debt repayments',300,'ve'],['Monthly groceries',220,'ve'],['Groceries top-up',50,'ve'],['Gym',50,'cn'],['Car tax',38,'cn'],['Car insurance',33,'cn'],['Monzo Max',22,'cn'],['House contents',9,'cn'],['Petrol',70,'vn'],['Car repairs',50,'vn'],['Eating out',30,'vn'],['Clothing',30,'vn'],['Drinks',30,'vn'],['Shopping',21,'vn'],['Haircut',15,'vn'],['Emergency fund',100,'sv'],['ISA',50,'iv']].map((e,i)=>({id:100+i,name:e[0],amount:e[1],type:e[2]}));
      localStorage.setItem('pos_ov1',JSON.stringify({income:[{id:1,name:'Universal Credit',amount:381,cat:'benefits'},{id:2,name:'PIP (Care/Mobility)',amount:778,cat:'benefits'},{id:5,name:'LCWRA',amount:430,cat:'benefits'},{id:8,name:'UC Housing Element',amount:347,cat:'benefits'}],expenses:ex}));
      localStorage.setItem('pos_debt1',JSON.stringify({debts:[{id:1,name:'Card',original:2500,balance:2000,rate:20,min:60,type:'credit'}]}));};
    const c4 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); await routeThree(c4); const p4 = await c4.newPage();
    await p4.addInitScript(seedFc);
    const st = () => p4.evaluate(() => { const n = document.getElementById('nw-fc-note'), c = n && n.closest('.ov-chart-card'); return { has: !!(n && n.textContent.trim()), is3d: !!(c && c.classList.contains('nw3d-main-3d')), shown: !!(n && n.offsetParent) }; });
    const pick = m => p4.evaluate(m => document.querySelector('#nw3d-main button[data-m="' + m + '"]').click(), m);
    await p4.goto('file:///home/user/Vault-It/index.html'); await p4.waitForTimeout(2200); await p4.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
    await pick('3d'); await p4.waitForTimeout(400); const a3 = await st();
    await pick('graph'); await p4.waitForTimeout(400); const ag = await st();
    await p4.reload(); await p4.waitForTimeout(2200); const ar = await st();
    await pick('3d'); await p4.waitForTimeout(300); await p4.reload(); await p4.waitForTimeout(2200); const ar3 = await st();
    ok(a3.has && a3.is3d && !a3.shown, 'forecast note hidden while the Net worth tile shows 3D ' + JSON.stringify(a3));
    ok(!ag.is3d && ag.shown, 'forecast note shown in Graph view ' + JSON.stringify(ag));
    ok(!ar.is3d && ar.shown && ar3.is3d && !ar3.shown, 'after a reload the note follows the remembered view (Graph: shown, 3D: hidden) ' + JSON.stringify([ar, ar3]));
    // Pedro (2 Nov): on phones the cash-flow diagram is drawn 1:1 in its sideways scroller, so its chips read at 10.5 px or more
    // the dashboard Cash Flow tile is now the 3D income flow (owner, 3 Nov), so only the Budget flow chart is checked here
    for (const [tab, id] of [['budget', 'bd-sankey']]) {
      await p4.evaluate(t => showTab(t), tab); await p4.waitForTimeout(800);
      const sk = await p4.evaluate(id => { const host = document.getElementById(id), sv = host.querySelector('svg'); const sz = [...sv.querySelectorAll('.cf-chip text')].map(t => parseFloat(t.getAttribute('font-size')) * t.getScreenCTM().a);
        const ch = [...sv.querySelectorAll('.cf-chip rect')].map(x => x.getBoundingClientRect()); let ov = 0; for (let i = 0; i < ch.length; i++) for (let j = i + 1; j < ch.length; j++) { const a = ch[i], c = ch[j]; if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 1 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 1) ov++; }
        return { n: sz.length, min: +Math.min(...sz).toFixed(1), scrolls: host.scrollWidth > host.clientWidth, ov, side: document.documentElement.scrollWidth > innerWidth + 1 }; }, id);
      ok(sk.n > 0 && sk.min >= 10.5 && sk.scrolls && sk.ov === 0 && !sk.side, `390 ${id}: chips drawn at ${sk.min} px or more (1:1 in the sideways scroller), none overlapping, page not sideways ` + JSON.stringify(sk));
    }
    // Pete (2 Nov, into 0.8): the same 1:1 treatment at 600 to 1099 px; 1440 keeps its fitted diagram
    for (const w of [690, 1024, 1440]) {
      await p4.setViewportSize({ width: w, height: 900 });
      for (const [tab, id] of [['budget', 'bd-sankey']]) {
        await p4.evaluate(t => { showTab(t); try { drawCashflowDiagram(); } catch (e) {} }, tab); await p4.waitForTimeout(700);
        const sk = await p4.evaluate(id => { const host = document.getElementById(id), sv = host.querySelector('svg'); const sz = [...sv.querySelectorAll('.cf-chip text')].map(t => parseFloat(t.getAttribute('font-size')) * t.getScreenCTM().a);
          return { n: sz.length, min: +Math.min(...sz).toFixed(1), one: sv.classList.contains('cf-1to1'), side: document.documentElement.scrollWidth > innerWidth + 1 }; }, id);
        if (w < 1100) ok(sk.n > 0 && sk.min >= 10.5 && sk.one && !sk.side, `${w} ${id}: chips drawn at ${sk.min} px or more, 1:1 in the scroller, page not sideways ` + JSON.stringify(sk));
        else ok(sk.n > 0 && !sk.one && !sk.side, `${w} ${id}: the fitted diagram is unchanged (not 1:1) ` + JSON.stringify(sk));
      }
    }
    // Pete (2 Nov, into 0.8): a debt tile under 56 px a side shows no text; tap shows its name and amount in a #080808 chip inside the tree map
    await p4.setViewportSize({ width: 390, height: 844 });
    await p4.evaluate(() => { showTab('debt'); debtState.debts = [{ id: 1, name: 'Card', original: 2500, balance: 2000, rate: 20, min: 60, type: 'credit' }, { id: 2, name: 'Car loan', original: 6000, balance: 4200, rate: 9, min: 180, type: 'loan' }, { id: 3, name: 'Overdraft', original: 800, balance: 650, rate: 39, min: 25, type: 'overdraft' }, { id: 4, name: 'Catalogue', original: 400, balance: 310, rate: 44, min: 20, type: 'credit' }]; drawDebtTreemap(); });
    await p4.waitForTimeout(400);
    const dt = await p4.evaluate(() => { const el = document.getElementById('debt-treemap'), cells = [...el.querySelectorAll('.dtm-cell')];
      const small = cells.filter(c => c.offsetWidth < 56 || c.offsetHeight < 56), sm = el.querySelector('.dtm-sm');
      const bad = cells.filter(c => (c.offsetWidth < 56 || c.offsetHeight < 56) && (c.textContent.trim() || !c.classList.contains('dtm-sm'))).length;
      if (sm) sm.click(); const t = el.querySelector('.dtm-tip'), r = t.getBoundingClientRect(), R = el.getBoundingClientRect(), cs = getComputedStyle(t);
      const out = { small: small.length, bad, shown: !t.hidden && t.offsetWidth > 0, text: t.textContent, bg: cs.backgroundColor, fs: Math.min(...[...t.children].map(x => parseFloat(getComputedStyle(x).fontSize))), inside: r.left >= R.left - 0.5 && r.right <= R.right + 0.5 && r.top >= R.top - 0.5 && r.bottom <= R.bottom + 0.5 };
      document.body.click(); el.click(); out.hides = t.hidden; return out; });
    ok(dt.small > 0 && dt.bad === 0, `390 debt tree map: tiles under 56 px show no text (${dt.small} small)`);
    ok(dt.shown && /Catalogue/.test(dt.text) && /310/.test(dt.text) && dt.bg === 'rgb(8, 8, 8)' && dt.fs >= 10.5 && dt.inside && dt.hides, '390 debt tree map: tap shows name and amount in a #080808 chip inside the map, and it closes ' + JSON.stringify(dt));
    await c4.close();
  }
  // Pete (2 Nov, into 0.8): the header NET WORTH label never wraps; under 380 px it reads NW and the figure stays
  for (const w of [360, 390]) {
    const cx = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true }); const pg = await cx.newPage();
    await pg.addInitScript(() => { try { localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} });
    await pg.goto(URL_); await pg.waitForTimeout(1000);
    const nl = await pg.evaluate(() => { const s = document.querySelector('#topnav .vi-nw-wrap>span:first-child'), v = document.getElementById('nav-nw'), a = getComputedStyle(s, '::after');
      const lh = parseFloat(getComputedStyle(s).lineHeight) || 16; return { h: s.getBoundingClientRect().height, after: a.content, fig: !!(v && v.offsetParent && v.textContent.trim()) }; });
    ok(nl.h < 24 && nl.fig && (w < 380 ? nl.after === '"NW"' : nl.after === 'none' || nl.after === 'normal'), `${w}: header net worth label on one line${w < 380 ? ', reads NW' : ''}, figure shown ` + JSON.stringify(nl));
    await cx.close();
  }
  // Pete (2 Nov): the house builder caption starts 44 px in on phones (clear of the controls); caption only, from 600 px it keeps its 14 px
  for (const [w, want] of [[390, 44], [599, 44], [600, 14]]) {
    const cx = await b.newContext({ viewport: { width: w, height: 844 } }); const pg = await cx.newPage();
    await pg.addInitScript(() => { try { localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} });
    await pg.goto(URL_); await pg.waitForTimeout(800);
    const l = await pg.evaluate(() => { const h = document.createElement('div'); h.id = 'house-scene'; h.className = 'hb-brand'; h.style.cssText = 'position:fixed;left:0;top:0;width:300px;height:200px'; h.innerHTML = '<div id="hb3d-cap-t" style="position:absolute"></div>'; document.body.appendChild(h);
      const c = h.firstChild; c.id = 'hb3d-cap'; const v = getComputedStyle(c).left; h.remove(); return parseFloat(v); });
    ok(l === want, `${w}: house builder caption left ${l} px (want ${want})`);
    await cx.close();
  }
  // the user's Text Size setting still works (Large = 15 px root on a phone)
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }); const page = await ctx.newPage();
  await page.addInitScript(() => { try { localStorage.setItem('vi_declined_demo', 'true'); } catch (e) {} });
  await page.goto(URL_); await page.waitForTimeout(1000);
  const lg = await page.evaluate(() => { document.documentElement.style.setProperty('--vi-base', '15px'); return parseFloat(getComputedStyle(document.documentElement).fontSize); });
  ok(Math.abs(lg - 15) < 0.05, `390: Text Size Large still scales the app (${lg} px)`);
  await b.close();
  console.log(fails ? `FAILURES ${fails}` : 'ALL OK');
  process.exit(fails ? 1 : 0);
})();
