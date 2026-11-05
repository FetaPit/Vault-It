module.exports = () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const cache = {};
  function parse(c) {
    if (cache[c]) return cache[c];
    cx.fillStyle = '#000'; cx.fillStyle = c; const n = cx.fillStyle; let m, res;
    if ((m = /^#([0-9a-f]{6})$/i.exec(n))) res = [parseInt(m[1].slice(0,2),16), parseInt(m[1].slice(2,4),16), parseInt(m[1].slice(4,6),16), 1];
    else if ((m = /^rgba?\(([^)]+)\)$/.exec(n))) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat); res = [p[0],p[1],p[2], p.length > 3 ? p[3] : 1]; }
    else if ((m = /^color\(srgb ([^)]+)\)$/.exec(n))) { const p = m[1].split(/[ \/]+/).filter(Boolean).map(parseFloat); res = [p[0]*255,p[1]*255,p[2]*255, p.length > 3 ? p[3] : 1]; }
    else { res = [255,0,255,1]; window.__unk = (window.__unk||[]).concat(n); }
    return cache[c] = res;
  }
  const over = (f, b) => { const a = f[3]; return [f[0]*a+b[0]*(1-a), f[1]*a+b[1]*(1-a), f[2]*a+b[2]*(1-a), 1]; };
  const lum = c => { const f = v => { v/=255; return v<=.03928 ? v/12.92 : Math.pow((v+.055)/1.055,2.4); }; return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]); };
  const ratio = (a,b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05); };
  const hex = c => '#' + [0,1,2].map(i => Math.round(c[i]).toString(16).padStart(2,'0')).join('').toUpperCase();
  const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || s.visibility==='collapse') return false; if (+s.opacity === 0) return false; if (e.hasAttribute('hidden')) return false;} return true; };
  function sel(el) { const p = []; for (let e = el, i = 0; e && e.nodeType === 1 && i < 4; e = e.parentElement, i++) { let s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id; else if (e.classList.length) s += '.' + [...e.classList].slice(0,2).join('.'); p.unshift(s); if (e.id) break; } return p.join('>'); }
  function backdrop(el) {
    const chain = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) chain.unshift(e);
    let alts = [[8,8,8,1]]; let grad = false;
    for (const e of chain) {
      const s = getComputedStyle(e); const op = +s.opacity;
      const bc = parse(s.backgroundColor);
      if (bc[3] > 0) alts = alts.map(b => over([bc[0],bc[1],bc[2],bc[3]*op], b));
      const bi = s.backgroundImage;
      if (bi && bi !== 'none' && /gradient/.test(bi)) {
        grad = true;
        const cols = (bi.match(/rgba?\([^)]*\)|color\([^)]*\)|#[0-9a-fA-F]{3,8}/g) || []).map(parse).filter(c => c[3] > 0);
        if (cols.length) { const next = []; for (const b of alts) for (const c of cols) next.push(over([c[0],c[1],c[2],c[3]*op], b)); alts = next.slice(0, 40); }
      } else if (bi && bi !== 'none' && /url/.test(bi)) grad = 'img';
    }
    return { alts, grad };
  }
  const out = [];
  const seen = new Set();
  function test(el, text, fg0, fontPx, weight, kind) {
    if (!text || !text.trim()) return;
    let opProd = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) opProd *= +getComputedStyle(e).opacity;
    const { alts, grad } = backdrop(el);
    const f = parse(fg0);
    let worst = null, worstB = null, worstFg = null;
    for (const b of alts) {
      const fa = f[3] * opProd;
      const fgc = over([f[0],f[1],f[2],fa], b);
      const r = ratio(fgc, b);
      if (!worst || r < worst) { worst = r; worstB = b; worstFg = fgc; }
    }
    let rNoOp = 99; for (const b of alts) { const fgc = over([f[0],f[1],f[2],f[3]], b); rNoOp = Math.min(rNoOp, ratio(fgc, b)); }
    const large = fontPx >= 24 || (fontPx >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    if (worst >= need) return;
    const dis = !!el.closest('[disabled],[aria-disabled="true"],.disabled');
    const scope = el.closest('#left-sidebar,#sidebar-toggle') ? 'sidebar' : el.closest('#settings-modal') ? 'settings' : 'app';
    const key = sel(el) + '|' + hex(worstFg) + '|' + hex(worstB) + '|' + text.trim().slice(0,30);
    if (seen.has(key)) return; seen.add(key);
    const cs = getComputedStyle(el);
    out.push({ sel: sel(el), text: text.trim().replace(/\s+/g,' ').slice(0,40), kind, fg: hex(f), fgA: +f[3].toFixed(2), eff: hex(worstFg), bg: hex(worstB), r: +worst.toFixed(2), need, rNoOp: +rNoOp.toFixed(2), opProd: +opProd.toFixed(2), px: +fontPx.toFixed(1), w: weight, grad, dis, scope, tag: el.tagName, bgBtn: cs.backgroundColor });
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const el = n.parentElement; if (!el) continue;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION)$/.test(el.tagName)) continue;
    if (!n.nodeValue.trim()) continue;
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect(); if (r.bottom < -5 || r.right < -5) continue;
    if (r.left > innerWidth + 5) continue;
    const s = getComputedStyle(el);
    const isSvg = el instanceof SVGElement;
    const fg = isSvg ? (s.fill && s.fill !== 'none' ? s.fill : s.color) : s.color;
    test(el, n.nodeValue, fg, parseFloat(s.fontSize), +s.fontWeight || 400, isSvg ? 'svg' : 'text');
  }
  document.querySelectorAll('input,textarea').forEach(el => {
    if (!vis(el)) return;
    const ph = el.getAttribute('placeholder');
    if (ph && !el.value) { const ps = getComputedStyle(el, '::placeholder'); const s = getComputedStyle(el); test(el, ph, ps.color, parseFloat(s.fontSize), +s.fontWeight, 'placeholder'); }
  });
  return out;
};
