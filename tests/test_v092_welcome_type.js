// Welcome screens type size (CoS for Pete and a tester, 5 Nov 2026): the onboarding text was smaller than the app's body text.
//   .welcome-h2 about 20 px on a phone and 24 px on desktop; .welcome-sub and the "among the first" line at least body size
//   (14 to 15 px phone, 16 px desktop); the plan CTAs at least 14 px with a 44 px tap height; the main button stays on screen on 390x664.
// Run: node tests/test_v092_welcome_type.js
require('./lib/vi');
const { chromium } = require('playwright');
const APP = process.env.VI_APP || require('./lib/vi').FILE_URL;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['dark', 'light']) for (const [w, h] of [[390, 664], [1440, 900]]) {
    const phone = w < 700, T = theme + ' ' + w + ': ';
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.addInitScript(t => { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); }, theme);
    await p.goto(APP); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#login-overlay,#sync-banner,#trial-banner{display:none!important}' });
    const fs = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : 0; }, sel);
    const step = n => p.evaluate(n => { [1, 2, 3].forEach(i => { const e = document.getElementById('w-step-' + i); if (e) e.style.display = i === n ? 'block' : 'none'; }); }, n);
    const body = await p.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    for (const n of [1, 2, 3]) {
      await step(n);
      const h2 = await p.evaluate(n => { const e = document.querySelector('#w-step-' + n + ' .welcome-h2'); return parseFloat(getComputedStyle(e).fontSize); }, n);
      const sub = await p.evaluate(n => { const e = document.querySelector('#w-step-' + n + ' .welcome-sub'); return parseFloat(getComputedStyle(e).fontSize); }, n);
      ok(phone ? h2 >= 19.5 && h2 <= 21 : h2 >= 23.5 && h2 <= 25, T + 'step ' + n + ' heading ' + h2 + ' px (' + (phone ? '20' : '24') + ' wanted)');
      ok(sub >= (phone ? 14 : 16) && sub >= body, T + 'step ' + n + ' sub text ' + sub + ' px, at least body (' + body + ')');
    }
    const lead = await fs('.welcome-lead'); ok(lead >= (phone ? 14 : 16) && lead >= body, T + '"among the first" line ' + lead + ' px');
    // the main button stays on screen (phone 390x664)
    for (const n of [1, 2, 3]) {
      await step(n);
      const r = await p.evaluate(n => { const box = document.querySelector('.welcome-box'), btn = document.querySelector('#w-step-' + n + ' .welcome-cta'); if (!btn) return null; box.scrollTop = 0; const o = btn.getBoundingClientRect(); return { bottom: o.bottom, top: o.top, vh: innerHeight, sideways: document.documentElement.scrollWidth > innerWidth + 1 }; }, n);
      if (r) ok(r.bottom <= r.vh - 2 && !r.sideways, T + 'step ' + n + ' main button on screen without scrolling (bottom ' + Math.round(r.bottom) + ' of ' + r.vh + ')');
    }
    // Pedro's checks: the pinned button does not hide the form, is readable, and the congrats line outranks the lead
    await step(1);   // one screen at a time, as in the app
    const X = await p.evaluate(() => { const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
      document.getElementById('w-step-1').style.display = 'block'; const box = document.querySelector('.welcome-box'); box.scrollTop = 0;
      const btn = document.querySelector('#w-step-1 .welcome-cta'), cs = getComputedStyle(btn), bg = cs.backgroundColor, L1 = lum(cs.color), L2 = lum(bg);
      const inp = document.getElementById('w-name').getBoundingClientRect(), foot = document.querySelector('#w-step-1 .welcome-foot').getBoundingClientRect();
      return { ratio: (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05), fsBtn: parseFloat(cs.fontSize), inputTop: inp.top, inputBottom: inp.bottom, footTop: foot.top, congrats: parseFloat(getComputedStyle(document.querySelector('.welcome-congrats')).fontSize), lead: parseFloat(getComputedStyle(document.querySelector('.welcome-lead')).fontSize), leadText: document.querySelector('.welcome-lead').textContent.trim() }; });
    const U = await p.evaluate(() => { const box = document.querySelector('.welcome-box'), f = document.querySelector('#w-step-1 .welcome-foot'); box.scrollTop = 0; const fr = f.getBoundingClientRect(), br = box.getBoundingClientRect(); return { gap: Math.round(br.bottom - fr.bottom), scrolls: box.scrollHeight > box.clientHeight + 1 }; });
    // the new onboarding (6 Nov): only a card that scrolls needs its button pinned to the edge
    ok(!U.scrolls || U.gap <= 1, T + 'the pinned button sits at the card edge when the card scrolls, nothing shows under it (gap ' + U.gap + ' px)');
    ok(X.fsBtn >= 14, T + 'main button text ' + X.fsBtn + ' px');
    ok(X.ratio >= 4.5, T + 'main button text contrast ' + X.ratio.toFixed(2) + ':1');
    ok(X.congrats > X.lead && X.congrats <= 20.5, T + 'congrats line (' + X.congrats + ' px) larger than the lead (' + X.lead + ' px)');
    ok(!phone || X.inputBottom <= X.footTop, T + 'the first field is visible above the pinned button (input bottom ' + Math.round(X.inputBottom) + ', button area top ' + Math.round(X.footTop) + ')');
    ok(X.leadText === "You're among the first to vault, and shaping what this becomes.", T + 'lead wording (Pedro approved Pradeep\'s line)');
    // lining figures: Syne's default zero is a small round o ("30" read as "3o"); the headline must ask for lining figures everywhere it is drawn
    const N = await p.evaluate(() => ['.welcome-h2', '.welcome-sub', '.welcome-lead', '.wall-cta', '.vi-camp-tier-cta', '.set-tier-price', '.welcome-cta'].map(q => { const e = document.querySelector(q); if (!e) return [q, 'missing']; const cs = getComputedStyle(e); return [q, /lining-nums/.test(cs.fontVariantNumeric)]; }));
    ok(N.every(x => x[1] === true), T + 'lining figures on the welcome text, plan buttons and prices (' + JSON.stringify(N.filter(x => x[1] !== true)) + ')');
    // real rendering: a "3" and a "0" drawn with the welcome heading's CSS, ink heights read from a screenshot (needs the Syne web font, so it is skipped where Google Fonts is blocked)
    const loaded = await p.evaluate(async () => { try { await document.fonts.load('800 40px Syne', '30'); } catch (e) {} return document.fonts.check('800 40px Syne', '30'); });
    let glyph = null;
    if (loaded) {
      await p.evaluate(() => { const d = document.createElement('div'); d.id = 'lnum-probe'; d.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#fff;color:#000;padding:10px;display:flex;gap:30px'; d.innerHTML = '<span id="p3" class="welcome-h2" style="font-size:80px;line-height:1.1;margin:0;color:#000">3</span><span id="p0" class="welcome-h2" style="font-size:80px;line-height:1.1;margin:0;color:#000">0</span>'; document.body.appendChild(d); });
      const ink = async id => { const buf = await p.locator('#' + id).screenshot(); return p.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let a = c.height, z = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 128) { const y = ((i / 4) / c.width) | 0; a = Math.min(a, y); z = Math.max(z, y); } return z - a; }, buf.toString('base64')); };
      glyph = { three: await ink('p3'), zero: await ink('p0') };
      await p.evaluate(() => document.getElementById('lnum-probe').remove());
    }
    if (glyph) ok(glyph.zero >= glyph.three * .95, T + 'Syne zero as tall as the 3 (' + glyph.zero + ' vs ' + glyph.three + ' px ink height)'); else console.log('skip: Syne web font not reachable here, glyph check skipped (computed-style check above still runs)');
    // heading font (Pedro, 5 Nov): sentence-length headings are Syne 700, the wordmark and short titles stay 800
    const W = await p.evaluate(() => { const g = q => { const e = document.querySelector(q); return e ? getComputedStyle(e).fontWeight : 'missing'; }; return { h2: g('.welcome-h2'), question: g('.welcome-question'), offer: g('#plan-wall .wall-view[data-view="plans"] .wall-title'), camp: g('.vi-camp-headline'), congrats: g('.welcome-congrats'), logo: g('.welcome-logo'), section: g('.settings-section-title') }; });
    ok(W.h2 === '700' && (W.question === '700' || W.question === 'missing') && W.offer === '700' && W.camp === '700' && W.section === '700', T + 'long headings are Syne 700 (' + JSON.stringify(W) + ')');
    ok(W.congrats === '800', T + 'short titles (the congrats line) stay Syne 800');
    // plan CTAs: 14 px and 44 px tap height (shown in their own modals, measured as laid out)
    const cta = await p.evaluate(() => { const out = []; for (const m of ['pro-offer-modal', 'vi-campaign-modal']) { const el = document.getElementById(m); if (!el) continue; const was = [el.className, el.style.display]; el.classList.remove('hidden'); el.style.display = 'flex'; el.querySelectorAll('.vi-tier-cta,.vi-camp-tier-cta').forEach(x => { if (x.disabled && /ghost/.test(x.className)) return; const r = x.getBoundingClientRect(); if (r.width > 0) out.push({ m, cls: x.className.split(' ')[0], fs: parseFloat(getComputedStyle(x).fontSize), h: r.height }); }); el.className = was[0]; el.style.display = was[1]; } return out; });
    ok(cta.length > 0, T + 'plan CTAs found (' + cta.length + ')');
    ok(cta.every(c => c.fs >= 14 && c.h >= 44), T + 'plan CTAs at least 14 px and 44 px tall (' + cta.map(c => c.fs + '/' + Math.round(c.h)).join(' ') + ')');
    await ctx.close();
  }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
