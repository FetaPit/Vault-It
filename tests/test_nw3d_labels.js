// Net worth in 3D (makeNW, commit 5a5f32b): the floor names are the full short names, never overlap one another and never leave the stage,
// on a phone and on a desktop, in both draw orders (names on top of the blocks on phones). Spies on canvas fillText and checks every frame.
// Run: node tests/test_nw3d_labels.js   (VI_APP=file:///path/to/index.html to test another copy)
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const src = require('fs').readFileSync(__dirname + '/test_nw3d.js', 'utf8');
const seed = eval('(' + src.slice(src.indexOf('const seed = (o) =>') + 'const seed = '.length, src.indexOf('// WCAG AA')).trim().replace(/;$/, '') + ')');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[390, 844], [1100, 900]]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob }); await ctx.route(/^https?:/, r => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    await p.addInitScript(() => {
      window.__lab = { frame: 0, calls: [] }; let pend = false;
      const orig = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (t, x, y) {
        try { if (/nw3d/.test(this.canvas.id || '') && /Share Tech Mono/.test(this.font)) {
          if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; window.__lab.frame++; }); }
          window.__lab.calls.push({ f: window.__lab.frame, cv: this.canvas.id, t: String(t), x, y, w: this.measureText(String(t)).width, cw: this.canvas.clientWidth, ch: this.canvas.clientHeight, dpr: this.canvas.width / (this.canvas.clientWidth || 1) }); } } catch (e) {}
        return orig.apply(this, arguments);
      };
    });
    await p.addInitScript(seed, { theme: 'dark', flag: true }); await p.goto(APP); await p.waitForTimeout(1800);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}' });
    await p.evaluate(() => { showTab('overview'); updateKPIs(); }); await p.waitForTimeout(800);
    await p.evaluate(() => { window.__lab.calls.length = 0; nw3d.hero.kick(); }); await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const shorts = {}; // the names the stage should show: its own columns' short names
      const cols = (document.getElementById('nw3d-hero-cv') || {}).dataset ? document.getElementById('nw3d-hero-cv').dataset.cols : '';
      const frames = {}; window.__lab.calls.filter(c => c.cv === 'nw3d-hero-cv').forEach(c => (frames[c.f] = frames[c.f] || []).push(c));
      const out = Object.values(frames).filter(a => a.length >= 2);
      let overlap = 0, off = 0, one = 0, n = 0;
      out.forEach(a => { a.forEach(c => { const wd = c.w; if (c.x - wd / 2 < -1 || c.x + wd / 2 > c.cw + 1 || c.y > c.ch + 1) off++; });
        for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { const A = a[i], B = a[j]; if (Math.abs(A.y - B.y) < 10 && A.x - A.w / 2 < B.x + B.w / 2 && A.x + A.w / 2 > B.x - B.w / 2) overlap++; }
        n = Math.max(n, a.length); });
      return { cols, frames: out.length, overlap, off, n, sample: out.length ? out[out.length - 1].map(c => c.t) : [] };
    });
    const T = w + 'px: ';
    ok(r.frames >= 1 && r.n >= 3, T + 'the stage draws its floor names (' + r.sample.join(', ') + ')');
    ok(r.overlap === 0, T + 'no two floor names overlap, in any frame (' + r.overlap + ' overlaps in ' + r.frames + ' frames)');
    ok(r.off === 0, T + 'every floor name stays on the stage');
    await ctx.close();
  }
  await b.close();
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
