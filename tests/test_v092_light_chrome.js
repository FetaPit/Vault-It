// v0.9.2: in Daylight the PWA install banner and the footer keep the Night (dark) look, so they match Night whichever theme is on.
// Toggles the theme and checks both elements keep a dark background and AA text; Daylight everywhere else stays light.
// Run: node tests/test_v092_light_chrome.js
require('./lib/vi');   // serves file:// app URLs over http and maps /home/user/Vault-It onto this checkout (tests/lib/vi.js)
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1100]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('vi_declined_demo', 'true'); });
    await page.goto('file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html') + '?bypass=websummit'); await page.waitForTimeout(1500);
    await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important} #pwa-install-banner{display:flex!important} *{transition:none!important}' });
    const pix = async sel => {   // the real rendered colour at the element's left padding (no stacking guesses)
      await page.locator(sel).scrollIntoViewIfNeeded(); await page.waitForTimeout(80); const bx = await page.locator(sel).boundingBox(); const buf = await page.screenshot({ clip: { x: bx.x + 3, y: bx.y + 2, width: 4, height: 3 } });
      return page.evaluate(async b64 => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); const d = x.getImageData(1, 1, 1, 1).data; return [d[0], d[1], d[2]]; }, buf.toString('base64'));
    };
    for (const theme of ['dark', 'light', 'dark', 'light']) {
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme); await page.waitForTimeout(150);
      const px = { banner: await pix('#pwa-install-banner'), footer: await pix('#app-footer') };
      const r = await page.evaluate(px => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
        const rgb = c => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
        const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
        const over = (f, bg) => [0, 1, 2].map(i => f[i] * f[3] + bg[i] * (1 - f[3]));
        const ratio = (a, bg) => { const l1 = lum(a), l2 = lum(bg); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
        const body = rgb(getComputedStyle(document.body).backgroundColor);
        const bodyBg = body[3] ? body : rgb(getComputedStyle(document.documentElement).backgroundColor);
        const out = { bodyLum: lum(bodyBg) };
        for (const [k, sel, texts] of [['banner', '#pwa-install-banner', ['#pwa-install-banner>span', '#pwa-install-banner .install-btn', '#pwa-install-banner .dismiss-btn']], ['footer', '#app-footer', ['.vi-fca', '.footer-copy', '.ft-body .vi-disc']]]) {
          const el = document.querySelector(sel); const cs = getComputedStyle(el); const bg = rgb(cs.backgroundColor);
          // flatten the translucent background over the page background underneath
          const flat = px[k];
          out[k] = { lum: lum(flat), bgA: bg[3], texts: texts.map(t => { const e = document.querySelector(t); if (!e) return null; const c = rgb(getComputedStyle(e).color); const tb = t.includes('install-btn') ? rgb(getComputedStyle(e).backgroundColor) : flat; return { t, r: +ratio(over(c, tb), tb).toFixed(2) }; }).filter(Boolean) };
        }
        return out;
      }, px);
      const T = w + ' ' + theme + ': ';
      ok(r.banner.lum < 0.06, T + 'install banner has a dark background (luminance ' + r.banner.lum.toFixed(3) + ')');
      ok(r.footer.lum < 0.06, T + 'footer has a dark background (luminance ' + r.footer.lum.toFixed(3) + ')');
      for (const k of ['banner', 'footer']) for (const t of r[k].texts) ok(t.r >= 4.5, T + k + ' ' + t.t + ' reaches 4.5:1 (' + t.r + ')');
      if (theme === 'light') ok(r.bodyLum > 0.3, T + 'the rest of Daylight stays light (page luminance ' + r.bodyLum.toFixed(2) + ')');
    }
    ok(!errs.length, w + ': no page errors ' + errs.join('|'));
    await ctx.close();
  }
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
