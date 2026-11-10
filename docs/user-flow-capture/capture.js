const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const OUT = process.argv[2]; const SPEC = process.argv[3];
const MOBILE = { width: 390, height: 844 }; const DESK = { width: 1280, height: 800 };

// ---------- in-page DOM extractor (compact output) ----------
function EXTRACT(opts) {
  const MAX = opts.maxItems || 1400, MAX_SVG = 7000, MAX_SVG_TOTAL = 90000;
  const root = opts.rootSel ? document.querySelector(opts.rootSel) : document.body;
  if (!root) return { error: 'no root ' + opts.rootSel };
  const sx = window.scrollX, sy = window.scrollY;
  const rr0 = root.getBoundingClientRect();
  const ox = opts.rootSel ? rr0.left + sx : 0, oy = opts.rootSel ? rr0.top + sy : 0;
  const docH = opts.rootSel ? Math.round(rr0.height) : Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  const docW = opts.rootSel ? Math.round(rr0.width) : document.documentElement.clientWidth;
  const items = []; let svgBytes = 0, skipped = 0;
  const hex2 = n => ('0' + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2);
  const col = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); return { h: hex2(p[0]) + hex2(p[1]) + hex2(p[2]), a: p.length > 3 ? Math.round(p[3] * 100) / 100 : 1 }; };
  const R = v => Math.round(v);
  const fontCode = (ff) => { const f = (ff || '').toLowerCase(); if (f.includes('syne')) return 'S'; if (f.includes('dm sans')) return 'D'; if (f.includes('share tech')) return 'M'; if (f.includes('archivo')) return 'A'; if (f.includes('space mono')) return 'P'; return 'I'; };
  const visible = (cs, r) => cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.02 && r.width >= 1 && r.height >= 1 && (r.bottom + sy - oy) > -5 && (r.top + sy - oy) < docH + 5;
  const svgOut = (svg) => {
    const clone = svg.cloneNode(true); const live = svg.querySelectorAll('*'), cl = clone.querySelectorAll('*');
    for (let i = 0; i < live.length && i < cl.length; i++) { const cs = getComputedStyle(live[i]); for (const p of ['fill', 'stroke']) { const v = cs[p]; if (v) cl[i].setAttribute(p, v); } if (cs.strokeWidth) cl[i].setAttribute('stroke-width', cs.strokeWidth); if (cs.opacity !== '1') cl[i].setAttribute('opacity', cs.opacity); cl[i].removeAttribute('class'); cl[i].removeAttribute('style'); }
    const r = svg.getBoundingClientRect(); const w = Math.max(1, R(r.width)), h = Math.max(1, R(r.height));
    clone.setAttribute('width', w); clone.setAttribute('height', h); if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
    clone.removeAttribute('class'); clone.removeAttribute('style'); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return clone.outerHTML.replace(/>\s+</g, '><');
  };
  const walk = (el) => {
    if (items.length >= MAX) { skipped++; return; }
    const tag = el.tagName ? el.tagName.toLowerCase() : ''; if (!tag || ['script', 'style', 'noscript', 'template', 'link', 'meta', 'br'].includes(tag)) return;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); if (!visible(cs, r)) return;
    const X = R(r.left + sx - ox), Y = R(r.top + sy - oy), W = R(r.width), H = R(r.height);
    if (tag === 'svg') {
      const s = svgOut(el);
      if (s.length <= MAX_SVG && svgBytes + s.length <= MAX_SVG_TOTAL) { svgBytes += s.length; items.push({ t: 's', x: X, y: Y, w: W, h: H, svg: s }); }
      else items.push({ t: 'r', x: X, y: Y, w: W, h: H, bg: { h: '3a3a3a', a: 0.3 }, br: 6, n: 'svg graphic, rebuild (' + Math.round(s.length / 1024) + 'KB)' });
      return;
    }
    if (['canvas', 'img', 'video', 'iframe'].includes(tag)) { items.push({ t: 'r', x: X, y: Y, w: W, h: H, bg: { h: '2a2a2a', a: 0.5 }, br: R(parseFloat(cs.borderTopLeftRadius) || 0), n: tag + (el.id ? ' #' + el.id : '') }); return; }
    const bg = col(cs.backgroundColor); const grad = cs.backgroundImage && cs.backgroundImage.includes('gradient');
    const bw = parseFloat(cs.borderTopWidth) || 0; const bc = col(cs.borderTopColor); const shadow = cs.boxShadow && cs.boxShadow !== 'none';
    if ((bg && bg.a > 0.02) || grad || (bw > 0 && bc && bc.a > 0.02) || shadow) {
      let fill = bg && bg.a > 0.02 ? bg : null; if (grad) { const m = cs.backgroundImage.match(/rgba?\([^)]+\)/); if (m) fill = col(m[0]); }
      const it = { t: 'r', x: X, y: Y, w: W, h: H }; const br = R(parseFloat(cs.borderTopLeftRadius) || 0); if (br) it.br = br;
      if (fill) it.bg = fill; if (bw > 0 && bc && bc.a > 0.02) { it.bw = Math.max(1, R(bw)); it.bc = bc; }
      const op = parseFloat(cs.opacity); if (op < 1) it.op = Math.round(op * 100) / 100;
      if (['button', 'a', 'input', 'select', 'textarea', 'nav', 'header', 'footer', 'section'].includes(tag) || (el.id && !/^\w+-\d+$/.test(el.id))) it.n = tag + (el.id ? ' #' + el.id : '');
      items.push(it);
    }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      const txt = el.value || el.placeholder || ''; if (txt) items.push({ t: 'x', x: X + R(parseFloat(cs.paddingLeft) || 0), y: Y, w: W, h: H, s: txt, f: fontCode(cs.fontFamily), fw: R(parseFloat(cs.fontWeight) || 400), fs: R(parseFloat(cs.fontSize)), c: col(cs.color), op: el.value ? 1 : 0.5, v: 1 });
      return;
    }
    for (const node of el.childNodes) {
      if (node.nodeType !== 3) continue; const raw = node.textContent; if (!raw.trim()) continue;
      const base = { f: fontCode(cs.fontFamily), fw: R(parseFloat(cs.fontWeight) || 400), fs: Math.round(parseFloat(cs.fontSize) * 10) / 10, c: col(cs.color) };
      const ls = parseFloat(cs.letterSpacing); if (ls) base.ls = Math.round(ls * 10) / 10;
      const up = cs.textTransform === 'uppercase';
      // split into visual lines: measure each word, group by line top
      const lines = []; const re = /\S+/g; let m;
      while ((m = re.exec(raw))) {
        const rg = document.createRange(); rg.setStart(node, m.index); rg.setEnd(node, m.index + m[0].length);
        const rects = rg.getClientRects(); if (!rects.length) continue; const wr = rects[0];
        if (wr.width < 0.5 || wr.height < 0.5) continue;
        const top = R(wr.top + sy - oy); let L = lines[lines.length - 1];
        if (!L || Math.abs(L.top - top) > Math.max(3, wr.height * 0.5)) { L = { top, left: wr.left + sx - ox, right: wr.right + sx - ox, h: wr.height, words: [] }; lines.push(L); }
        L.words.push(m[0]); L.right = Math.max(L.right, wr.right + sx - ox); L.left = Math.min(L.left, wr.left + sx - ox); L.h = Math.max(L.h, wr.height);
      }
      for (const L of lines) {
        let txt = L.words.join(' '); if (up) txt = txt.toUpperCase();
        const it = Object.assign({ t: 'x', x: R(L.left), y: L.top, w: R(L.right - L.left), h: R(L.h), s: txt.slice(0, 500) }, base);
        items.push(it); if (items.length >= MAX) break;
      }
      if (items.length >= MAX) break;
    }
    for (const ch of el.children) walk(ch);
  };
  walk(root);
  let bg = null; for (const e of [root, document.body, document.documentElement]) { const c = col(getComputedStyle(e).backgroundColor); if (c && c.a > 0.02) { bg = c; break; } }
  return { w: docW, h: docH, bg, items, skipped };
}
function EXPAND(id) {
  const el = document.getElementById(id); if (!el) return 'missing ' + id;
  const st = document.createElement('style'); st.textContent = '#' + id + '{display:flex!important;visibility:visible!important;opacity:1!important}'; document.head.appendChild(st); el.removeAttribute('hidden'); el.querySelectorAll('.welcome-box,.modal,.sheet').forEach(b => b.removeAttribute('hidden'));
  el.classList.remove('hidden'); const P = (k, v) => el.style.setProperty(k, v, 'important'); P('display', 'flex'); P('visibility', 'visible'); P('opacity', '1'); P('position', 'absolute'); P('top', '0'); P('left', '0'); P('right', '0'); P('bottom', 'auto'); P('height', 'auto'); P('min-height', '100vh'); P('align-items', 'flex-start'); P('overflow', 'visible'); P('z-index', '99999');
  el.querySelectorAll('*').forEach(n => { const cs = getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowY) || cs.maxHeight !== 'none') { n.style.maxHeight = 'none'; n.style.overflow = 'visible'; n.style.height = 'auto'; } });
  document.body.style.overflow = 'visible'; document.documentElement.style.overflow = 'visible'; window.scrollTo(0, 0); return 'ok';
}
function HIDE_OVERLAYS() { ['login-overlay', 'welcome-overlay', 'tester-welcome', 'pro-offer-modal', 'vi-campaign-modal', 'paywall-modal', 'settings-modal', 'legal-modal', 'delete-modal', 'nwh-modal', 'vi-help', 'debt-form-modal', 'owe-form-modal', 'pwa-install-banner'].forEach(id => { const e = document.getElementById(id); if (e) { e.classList.add('hidden'); e.style.setProperty('display', 'none', 'important'); } }); }
const EXP = '(' + EXPAND.toString() + ')';

async function settle(page, ms = 700) { await page.waitForTimeout(ms); }
async function shot(page, name, { full = true, spec = true, rootSel = null, maxItems = 1400 } = {}) {
  await settle(page);
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: full });
  if (!spec) { console.log(`${name}: png only`); return; }
  const data = await page.evaluate(EXTRACT, { rootSel, maxItems });
  data.name = name; const f = path.join(SPEC, name + '.json'); fs.writeFileSync(f, JSON.stringify(data));
  console.log(`${name}: ${data.w}x${data.h} items=${data.items ? data.items.length : 'ERR ' + data.error} skipped=${data.skipped} json=${Math.round(fs.statSync(f).size / 1024)}KB`);
}
async function openModal(page, id, pre) { const r = await page.evaluate(({ id, pre, EXP }) => { try { if (pre) eval(pre); } catch (e) { return 'pre failed: ' + e; } return eval(EXP)(id); }, { id, pre, EXP }); if (r !== 'ok') console.log('  ', id, r); }

async function main() {
  const browser = await chromium.launch();
  let ctx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1, colorScheme: 'dark' }); let page = await ctx.newPage(); await ctx.addInitScript(() => { try { localStorage.setItem('vi-theme', 'dark'); } catch (e) {} });
  // 1. landing + legal pages
  await page.goto('https://vault-it.co/', { waitUntil: 'load', timeout: 90000 }); await settle(page, 2500); await shot(page, 'landing', { maxItems: 420 });
  await page.goto('https://vault-it.co/privacy', { waitUntil: 'load', timeout: 60000 }); await shot(page, 'landing-privacy');
  await page.goto('https://vault-it.co/terms', { waitUntil: 'load', timeout: 60000 }); await shot(page, 'landing-terms');
  // 2. sign in (fresh)
  await page.goto('https://app.vault-it.co/', { waitUntil: 'load', timeout: 90000 }); await settle(page, 2500);
  const steps = ['auth-email-step', 'auth-otp-step', 'auth-setpin-step', 'auth-pin-step'];
  for (const st of steps) {
    await page.evaluate(({ st, steps }) => { const ov = document.getElementById('login-overlay'); if (ov) { ov.classList.remove('hidden'); ov.style.display = 'flex'; } steps.forEach(s => { const e = document.getElementById(s); if (e) { e.classList.toggle('hidden', s !== st); e.style.display = s === st ? 'block' : 'none'; } }); ['auth-otp-email', 'auth-pin-email'].forEach(i => { const e = document.getElementById(i); if (e) e.textContent = 'you@example.com'; }); window.scrollTo(0, 0); }, { st, steps });
    await shot(page, 'signin-' + st.replace('auth-', '').replace('-step', ''), { full: false, rootSel: '#login-overlay' });
  }
  await ctx.close();
  // 3. demo app (mobile)
  ctx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1, colorScheme: 'dark' }); await ctx.addInitScript(() => { try { localStorage.setItem('vi-theme', 'dark'); } catch (e) {} }); page = await ctx.newPage();
  await page.goto('https://app.vault-it.co/?demo=alex', { waitUntil: 'load', timeout: 90000 }); await settle(page, 3500); await page.evaluate(HIDE_OVERLAYS);
  await openModal(page, 'tester-welcome'); await shot(page, 'onboard-tester-welcome', { full: false, rootSel: '#tester-welcome' }); await page.evaluate(HIDE_OVERLAYS);
  for (const [nm, n] of [['onboard-1-name-email', 1], ['onboard-2-where-are-you', 2], ['onboard-3-money-each-month', 3], ['onboard-4-home-goal', 4], ['onboard-5-your-plan', 5]]) {
    await openModal(page, 'welcome-overlay', `wGo(${n})`); await shot(page, nm, { rootSel: '#welcome-overlay' });
  }
  await openModal(page, 'welcome-overlay', "['w-step-1','w-step-2'].forEach(i=>{const e=document.getElementById(i); if(e) e.style.display='none'}); const e3=document.getElementById('w-step-3'); if(e3){e3.classList.remove('hidden'); e3.style.display='block'}");
  await shot(page, 'onboard-6-start-vaulting', { rootSel: '#welcome-overlay' }); await page.evaluate(HIDE_OVERLAYS);
  await openModal(page, 'vi-campaign-modal', "if(typeof viCampaignPaint==='function') viCampaignPaint()"); await shot(page, 'modal-campaign-pioneer', { rootSel: '#vi-campaign-modal' }); await page.evaluate(HIDE_OVERLAYS);
  await openModal(page, 'pro-offer-modal', "viShowTrialEnd('biz')"); await shot(page, 'modal-day30-plans', { rootSel: '#pro-offer-modal' }); await page.evaluate(HIDE_OVERLAYS);
  await openModal(page, 'paywall-modal', "showPaywall('assets')"); await shot(page, 'modal-verify-payment', { rootSel: '#paywall-modal' }); await page.evaluate(HIDE_OVERLAYS);
  // tabs
  const tabs = [['overview', 'tab-overview'], ['budget', 'tab-budget'], ['house', 'tab-house'], ['assets', 'tab-assets-metals'], ['debt', 'tab-debt'], ['biz', 'tab-biz-gate'], ['achievements', 'tab-wealth-roadmap'], ['network', 'tab-network']];
  for (const [id, nm] of tabs) { await page.evaluate((id) => { try { showTab(id); window.scrollTo(0, 0); } catch (e) {} }, id); await settle(page, 1200); await shot(page, nm, { maxItems: 360 }); }
  for (const sub of ['crypto', 'cash', 'stocks', 'other', 'liabilities']) {
    await page.evaluate((sub) => { try { showTab('assets'); const btn = [...document.querySelectorAll('#assets-page .subtab-btn')].find(b => (b.getAttribute('onclick') || '').includes("'" + sub + "'")); showSubtab('assets', sub, btn || null); window.scrollTo(0, 0); } catch (e) {} }, sub); await settle(page, 900);
    await shot(page, 'tab-assets-' + sub, { maxItems: 360 });
  }
  await page.evaluate(() => { try { showTab('biz'); document.querySelectorAll('#pro-gate-biz, #tab-biz .pro-gate').forEach(e => e.style.display = 'none'); window.scrollTo(0, 0); } catch (e) {} }); await settle(page, 800); await shot(page, 'tab-biz-unlocked', { maxItems: 360 });
  for (const [fn, nm] of [['showStreamForm', 'biz-form-income-stream'], ['showLeadForm', 'biz-form-add-lead'], ['showClientForm', 'biz-form-add-client']]) { await page.evaluate((fn) => { try { window[fn](); } catch (e) {} }, fn); await settle(page, 500); await shot(page, nm, { maxItems: 360 }); }
  await page.evaluate(() => { try { showTab('debt'); showDebtForm(); } catch (e) {} }); await settle(page, 600); await shot(page, 'debt-form-add-debt', { maxItems: 360 });
  await page.evaluate(() => { try { const m = document.getElementById('debt-form-modal'); if (m) { m.classList.add('hidden'); m.style.display = 'none'; } showOweForm(); } catch (e) {} }); await settle(page, 600); await shot(page, 'debt-form-owed-to-you', { maxItems: 360 }); await page.evaluate(HIDE_OVERLAYS);
  await page.evaluate(() => { try { showTab('overview'); } catch (e) {} }); await openModal(page, 'nwh-modal', 'openNwHistory()'); await shot(page, 'modal-nw-history', { rootSel: '#nwh-modal' }); await page.evaluate(HIDE_OVERLAYS);
  await openModal(page, 'settings-modal', 'showSettings()'); await shot(page, 'modal-settings', { rootSel: '#settings-modal' }); await page.evaluate(HIDE_OVERLAYS);
  for (const [view, nm] of [['ask', 'help-ask'], ['faq', 'help-faq'], ['tour', 'help-tour']]) { await openModal(page, 'vi-help', `if(typeof viHelpOpen==='function') viHelpOpen('${view}'); else openHelp()`); await shot(page, nm, { rootSel: '#vi-help' }); await page.evaluate(HIDE_OVERLAYS); }
  await openModal(page, 'legal-modal', 'showPrivacy()'); await shot(page, 'modal-legal-privacy', { rootSel: '#legal-modal' }); await page.evaluate(HIDE_OVERLAYS);
  await openModal(page, 'legal-modal', 'showTerms()'); await shot(page, 'modal-legal-terms', { rootSel: '#legal-modal' }); await page.evaluate(HIDE_OVERLAYS);
  await openModal(page, 'delete-modal', "window._supaUser = { id: 'demo', email: 'demo@vault-it.app' }; openDeleteAccount()"); await shot(page, 'modal-delete-account', { rootSel: '#delete-modal' });
  await ctx.close();
  // 4. desktop references
  ctx = await browser.newContext({ viewport: DESK, deviceScaleFactor: 1, colorScheme: 'dark' }); page = await ctx.newPage();
  await page.goto('https://vault-it.co/', { waitUntil: 'load', timeout: 90000 }); await settle(page, 2500); await shot(page, 'desk-landing', { spec: false });
  await page.goto('https://app.vault-it.co/?demo=alex', { waitUntil: 'load', timeout: 90000 }); await settle(page, 3500); await page.evaluate(HIDE_OVERLAYS);
  for (const [id, nm] of tabs) { await page.evaluate((id) => { try { showTab(id); window.scrollTo(0, 0); } catch (e) {} }, id); await settle(page, 1200); await shot(page, 'desk-' + nm, { spec: false }); }
  await browser.close(); console.log('DONE');
}
module.exports = { EXTRACT, EXPAND, HIDE_OVERLAYS, EXP, settle, shot, openModal, MOBILE, DESK, chromium };
if (require.main === module) main().catch(e => { console.error('FATAL', e); process.exit(1); });
