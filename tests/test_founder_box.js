// Meet the founder: the strip on welcome screen 1, the box at the top of the tester note, and the note reworded (card wall chunk 6).
// Owner, 12 Nov 2026: "We need to add a meet the Founder box above this with my portrait and few deats. Reword by just encouraging
// to send any testing data to me. say a personal thanks becoming a Vault-it Pioneer and have 30 days on me plus lifetime discounted
// subscriptions and a limited lifetime license pre launch." Where: "Both places". Spec: docs/briefs/ONBOARDING_FEEDBACK_12NOV.md.
//   1. welcome screen 1: a compact strip above the "30 days free" heading: the portrait (round, from the app's own address),
//      "Pete Thickett" and one line of thanks; Night and Daylight, 390 and 1100 px, no sideways scroll
//   2. the note: the box at the top of the note: a tile with the gold outline of the dashboard's Message the Dev tile (the same
//      brass border, a gold bar down its left edge, the corner chamfer) that says "From the founder" (gold mono eyebrow, inside the
//      tile), portrait 56 px at 390 and 72 px at 1100 with a 2 px gold ring, the name, and "Founder, Vault-It." on one line
//      Owner, 12 Nov 2026, on the first screenshots: "It needs to have a gold outline like the meet the dev tile but say from the founder";
//      on the second: "remove designer Lincoln"
//   3. the note reads the agreed wording, signed Pete, with one button; the name and the signature are written in the heading font
//      by the token (owner, 12 Nov 2026: "use the custom font we are building Vault-form"), so pointing the token at Vault-form changes both
//      Owner, 12 Nov 2026, last: "justr remove a note from Pete": the heading "A NOTE FROM PETE" is gone from the note (its earlier
//      asks, "Vault-orm font", "Vaultform condensed" and "Capitalise", went with it); the dialog keeps its name by aria-label
//   4. the portrait is in the app build and the app asks no outside host for it
//   5. the founder styles name no font family by hand: headings use var(--font-display), the eyebrow var(--font-mono)
//      Owner, 12 Nov 2026, later: "Make it more concice and bold the important phrases like vault-it pioneer  forever  1100 lifetime
//      licences  Remove the last para from Try it with your...": the note is short, its key phrases are bold, and nothing follows
//      the Lifetime licences sentence (the number is 100, the Lifetime link's limit)
//      Owner, 12 Nov 2026, then: "text not bold but teal highlighted on both light and dark mode": the key phrases are teal (the
//      --teal token, so Night and Daylight each get their own teal) in the regular weight, readable on the note (4.5:1 or better)
//      Owner, 12 Nov 2026, then: "remove tell Pete something, this can wait until they are in the app": the note keeps one button
//      Owner, 13 Nov 2026, answering the open points: "2. first movers prive" (the note says first movers’ price, not Pioneer price),
//      "3. yes" (no feedback line in the note), "7. adjust the teal for daylight so i contrasts better" (Night keeps --teal; Daylight
//      takes the purer --teal-deep, 4.5:1 or better against the tile and the note: every lighter Daylight teal fails 4.5:1)
//      Then, to the three options for the Daylight teal (keep, faint marker, medium weight): "medium": in Daylight the phrases are the
//      medium weight (500, not bold) as well as --teal-deep; Night stays the regular weight
//      Owner, 12 Nov 2026, then: "add a subtle glow to the teal words": the brand's text glow, the --tglow token (a soft teal halo in
//      Night; the token is none in Daylight, where the brand draws no glows)
//   6. an account on a Lifetime licence is not told about 30 free days or a subscription price: those sentences are left out
// Run: node tests/test_founder_box.js
const vi = require('./lib/vi');   // serves file:// app URLs over http; every context meets the app as an account on a plan
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const NOTE = 'Thank you, personally, for becoming a Vault-It Pioneer. Your first 30 days are on me. You keep your discounted first movers’ price forever while you stay subscribed, and you get first call on the 100 Lifetime licences before launch.';
const LIFETIME_NOTE = 'Thank you, personally, for becoming a Vault-It Pioneer.';

(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['dark', 'light']) for (const [w, h] of [[390, 844], [1100, 900]]) {
    const phone = w < 700, T = theme + ' ' + w + ': ';
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(T + e.message));
    const hosts = new Set(); p.on('request', r => { try { if (/founder/.test(r.url())) hosts.add(new URL(r.url()).host); } catch (e) {} });
    await p.addInitScript(t => { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); }, theme);
    await p.goto(vi.FILE_URL); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#login-overlay,#sync-banner{display:none!important}' });
    const tok = "(v) => { const d = document.createElement('i'); d.style.cssText = 'color:var(' + v + ');font-family:var(' + v + ')'; document.body.appendChild(d); const c = getComputedStyle(d); const o = { color: c.color, font: c.fontFamily }; d.remove(); return o; }";
    // ── 1  the strip on welcome screen 1 ──
    const S = await p.evaluate(async (tokSrc) => {
      const tok = eval(tokSrc);
      [1, 2, 3].forEach(i => { const e = document.getElementById('w-step-' + i); if (e) e.style.display = i === 1 ? 'block' : 'none'; });
      const s = document.querySelector('#wz-s1 .vi-founder-strip'), h = document.querySelector('#wz-s1 .welcome-h2');
      if (!s) return { missing: true };
      const img = s.querySelector('img'), name = s.querySelector('.vi-founder-name'), line = s.querySelector('.vi-founder-thanks');
      if (img && !img.complete) await new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 4000); });
      const r = s.getBoundingClientRect(), ir = img.getBoundingClientRect();
      return { before: !!(s.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING), heading: h.textContent.replace(/\s+/g, ' ').trim(), src: img.getAttribute('src'), own: new URL(img.src).origin === location.origin, loaded: img.naturalWidth > 0,
        alt: img.alt, round: getComputedStyle(img).borderRadius, iw: Math.round(ir.width), ih: Math.round(ir.height), name: name ? name.textContent.trim() : '', nameFont: name ? getComputedStyle(name).fontFamily : '', display: tok('--font-display').font,
        thanks: line ? line.textContent.replace(/\s+/g, ' ').trim() : '', thanksSize: line ? parseFloat(getComputedStyle(line).fontSize) : 0, seen: r.width > 0 && r.height > 0, tall: Math.round(r.height), sideways: document.documentElement.scrollWidth > innerWidth };
    }, tok);
    ok(!S.missing && S.seen && S.before && S.heading === '30 days free', T + '1 the founder strip sits at the top of welcome screen 1, above "30 days free"');
    if (!S.missing) {
      ok(S.src === 'img/founder.jpg' && S.own && S.loaded && S.alt === 'Pete Thickett, founder of Vault-It', T + '1 the portrait loads from the app\'s own address, with its alt text (' + S.src + ', loaded ' + S.loaded + ')');
      ok(/50%|9999px/.test(S.round) && S.iw === S.ih && S.iw >= 36 && S.iw <= 48, T + '1 the portrait is a small circle (' + S.iw + ' px)');
      ok(S.name === 'Pete Thickett' && S.nameFont === S.display, T + '1 it names Pete Thickett in the heading font, by the token (' + S.nameFont.slice(0, 24) + ')');
      ok(/^Thank you/.test(S.thanks) && S.thanks.length <= 60 && !/—/.test(S.thanks) && S.thanksSize >= 10.5, T + '1 one line of thanks, at or above the type floor (' + S.thanks + ', ' + S.thanksSize + ' px)');
      ok(!S.sideways && S.tall <= 72, T + '1 compact (' + S.tall + ' px tall), no sideways scroll');
    }
    // ── 2  the box above the note ──
    const B = await p.evaluate(async (tokSrc) => {
      const tok = eval(tokSrc);
      const m = document.getElementById('tester-welcome'); m.classList.remove('hidden');
      const box = m.querySelector('.vi-founder'), title = document.getElementById('tw-title'), msg = document.getElementById('tw-msg');
      if (!box) return { missing: true };
      const eb = box.querySelector('.vi-founder-eyebrow'), img = box.querySelector('img'), name = box.querySelector('.vi-founder-name'), role = box.querySelector('.vi-founder-role'), panel = box.querySelector('.vi-founder-row');
      if (img && !img.complete) await new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 4000); });
      const cs = getComputedStyle(img), ps = getComputedStyle(panel), ir = img.getBoundingClientRect(), mb = m.querySelector('.tw-box').getBoundingClientRect();
      const o = { before: !!(box.compareDocumentPosition(msg) & Node.DOCUMENT_POSITION_FOLLOWING), noHeading: !title && !/note from pete/i.test(m.querySelector('.tw-box').innerText), label: m.getAttribute('aria-label'), labelledby: m.hasAttribute('aria-labelledby'), eyebrow: eb.textContent.trim(), ebFont: getComputedStyle(eb).fontFamily, mono: tok('--font-mono').font, ebCol: getComputedStyle(eb).color, gold: tok('--gold').color,
        w: Math.round(ir.width), h: Math.round(ir.height), round: cs.borderRadius, ring: cs.borderTopWidth, ringCol: cs.borderTopColor, loaded: img.naturalWidth > 0, alt: img.alt, own: new URL(img.src).origin === location.origin,
        name: name.textContent.trim(), nameFont: getComputedStyle(name).fontFamily, display: tok('--font-display').font, role: role.textContent.replace(/\s+/g, ' ').trim(), tile: box.textContent, roleLines: Math.round(role.getBoundingClientRect().height / parseFloat(getComputedStyle(role).lineHeight)), roleSize: parseFloat(getComputedStyle(role).fontSize),
        border: ps.borderTopWidth, bCol: ps.borderTopColor, dev: (function () { const d = document.getElementById('vi-devcard'); return d ? getComputedStyle(d).borderTopColor : ''; })(), inPanel: panel.contains(eb),
        bar: (function () { const b = getComputedStyle(panel, '::before'); return { w: b.width, img: b.backgroundImage, pos: b.position, left: b.left }; })(), clip: ps.clipPath, fits: mb.bottom <= innerHeight + 1 && mb.top >= -1, sideways: document.documentElement.scrollWidth > innerWidth,
        swap: (function () { const r = document.documentElement; r.style.setProperty('--font-display', '"Vault-form Heading", serif');
          const f = [name, m.querySelector('.tw-sign')].map(e => getComputedStyle(e).fontFamily).join(' | '); r.style.removeProperty('--font-display'); return f; })(),
        tileContrast: (function () { const lum = (c) => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
          const rgba = (c) => (c.match(/[\d.]+/g) || []).map(Number); const row = document.querySelector('#tester-welcome .vi-founder-row'), st = document.querySelector('#tw-msg strong'); if (!row || !st) return 0;
          let base = null; for (let e = row.parentElement; e && !base; e = e.parentElement) { const a = rgba(getComputedStyle(e).backgroundColor); if (a.length >= 3 && (a.length < 4 || a[3] === 1)) base = a.slice(0, 3); }
          const t = rgba(getComputedStyle(row).backgroundColor), al = t.length > 3 ? t[3] : 1; const tile = base.map((b, i) => t[i] * al + b * (1 - al)); const fg = rgba(getComputedStyle(st).color).slice(0, 3);
          const L1 = lum(fg), L2 = lum(tile); return Math.round((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) * 100) / 100; })(),
        bold: [...document.getElementById('tw-msg').querySelectorAll('strong, b')].map(e => e.textContent.replace(/\s+/g, ' ').trim() + ':' + (parseInt(getComputedStyle(e).fontWeight, 10) >= 600 ? 'bold' : parseInt(getComputedStyle(e).fontWeight, 10) >= 500 ? 'medium' : 'regular') + ':' + (getComputedStyle(e).color === tok(document.documentElement.getAttribute('data-theme') === 'light' ? '--teal-deep' : '--teal').color ? 'teal' : 'other') + ':' + (getComputedStyle(e).textShadow === (function () { const d = document.createElement('i'); d.style.textShadow = 'var(--tglow)'; document.body.appendChild(d); const g = getComputedStyle(d).textShadow; d.remove(); return g; })() && getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)' ? 'glow' : 'effect')).join(' | '),
        glowSeen: (function () { const d = document.createElement('i'); d.style.textShadow = 'var(--tglow)'; document.body.appendChild(d); const g = getComputedStyle(d).textShadow; d.remove(); return g; })(),
        contrast: (function () { const lum = (c) => { const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
          let bg = null; for (let e = document.getElementById('tw-msg'); e && !bg; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; const a = c.match(/[\d.]+/g); if (a && (a.length < 4 || parseFloat(a[3]) === 1)) bg = c; }
          const st = document.querySelector('#tw-msg strong'); if (!bg || !st) return 0; const L1 = lum(getComputedStyle(st).color), L2 = lum(bg); return Math.round((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) * 10) / 10; })(),
        msg: document.getElementById('tw-msg').textContent.replace(/\s+/g, ' ').trim(), sign: m.querySelector('.tw-sign').textContent.trim(), signFont: getComputedStyle(m.querySelector('.tw-sign')).fontFamily,
        go: (m.querySelector('.tw-go') || {}).textContent, mail: !!m.querySelector('.tw-mail') || /Tell Pete/.test(m.textContent), buttons: m.querySelectorAll('.tw-row button, .tw-row a').length };
      m.classList.add('hidden'); return o;
    }, tok);
    ok(!B.missing && B.before, T + '2 the founder box sits at the top of the note, above its text');
    if (!B.missing) ok(B.noHeading && B.label === 'A note from Pete' && !B.labelledby, T + '2 the heading "A NOTE FROM PETE" is gone (owner: "justr remove a note from Pete"); the dialog keeps its name by aria-label (' + B.label + ')');
    if (!B.missing) {
      ok(/^from the founder$/i.test(B.eyebrow) && B.inPanel && B.ebFont === B.mono && B.ebCol === B.gold, T + '2 the tile says "From the founder": mono, gold, inside the outline (' + B.eyebrow + ', ' + B.ebCol + ')');
      ok(B.w === (phone ? 56 : 72) && B.h === B.w && /50%|9999px/.test(B.round) && B.ring === '2px' && B.ringCol === B.gold && B.loaded && B.own && B.alt === 'Pete Thickett, founder of Vault-It', T + '2 portrait: a ' + (phone ? 56 : 72) + ' px circle with a 2 px gold ring, from the app\'s own address (' + B.w + ' px, ring ' + B.ring + ' ' + B.ringCol + ')');
      ok(B.name === 'Pete Thickett' && B.nameFont === B.display && B.role === 'Founder, Vault-It.' && !/designer|lincoln/i.test(B.tile) && B.roleSize >= 10.5 && B.roleLines === 1, T + '2 "Pete Thickett" in the heading font by the token, and under it "Founder, Vault-It." on one line, with no "Designer, Lincoln." (' + B.role + ')');
      ok(parseFloat(B.border) >= 1 && B.dev && B.bCol === B.dev && B.clip && B.clip !== 'none', T + '2 the gold outline of the Message the Dev tile: the same brass border, with the corner chamfer (' + B.bCol + ' / ' + B.dev + ')');
      ok(B.bar.w === '3px' && /gradient/.test(B.bar.img) && B.bar.pos === 'absolute' && B.bar.left === '0px', T + '2 and its gold bar down the left edge (' + B.bar.w + ')');
      ok(B.fits && !B.sideways, T + '2 the note with its box fits the screen, no sideways scroll');
      // ── 3  the wording ──
      ok(B.msg === NOTE && B.sign === 'Pete' && B.signFont === B.display, T + '3 the note reads the agreed wording, signed Pete in the heading font (' + B.msg.slice(0, 60) + ')');
      ok(B.swap.split(' | ').length === 2 && B.swap.split(' | ').every(f => /^"?Vault-form Heading/.test(f)), T + '3 the name and the signature are in the heading font by the token: both take Vault-form once the token points at it (' + B.swap.slice(0, 40) + ')');
      ok(/Let.s go/.test(B.go || '') && !B.mail && B.buttons === 1, T + '3 one button, "Let\'s go": "Tell Pete something" is gone (owner, 12 Nov: "remove tell Pete something, this can wait until they are in the app")');
      ok(/You keep your discounted first movers’ price forever while you stay subscribed/.test(B.msg), T + '3 the price sentence says "first movers\u2019 price" (owner, 13 Nov: "first movers prive"), keeps "discounted" and "forever", with the condition the paywall states');
      const WT = theme === 'light' ? 'medium' : 'regular';   // owner, 13 Nov: "medium" for the Daylight teal; Night stays regular
      ok(B.bold === ['Vault-It Pioneer', '30 days', 'forever', '100 Lifetime licences'].map(x => x + ':' + WT + ':teal:glow').join(' | '), T + '3 the key phrases are teal, not bold, with the brand\'s text glow (owner: "text not bold but teal highlighted on both light and dark mode", "add a subtle glow to the teal words"): Vault-It Pioneer, 30 days, forever, 100 Lifetime licences (' + B.bold + ')');
      ok((theme === 'dark') === (B.glowSeen !== 'none'), T + '3 the glow is the --tglow token: a soft halo in Night (' + B.glowSeen.slice(0, 44) + '), none in Daylight by the brand\'s own rule');
      ok(B.contrast >= 4.5 && B.tileContrast >= 4.5, T + '3 the teal phrases read on the note and on the tile: contrast ' + B.contrast + ':1 and ' + B.tileContrast + ':1 (4.5:1 or better)');
      ok(/before launch\.$/.test(B.msg) && !/Try it with your|tell me what|real figures|I read every message/i.test(B.msg) && B.msg.split(' ').length <= 45, T + '3 concise: nothing follows the Lifetime licences sentence ("Try it with your..." to the end is gone; ' + B.msg.split(' ').length + ' words)');
      ok(!/Pioneer price/.test(B.msg), T + '3 the note no longer says "Pioneer price"');
      ok(!/—/.test(B.msg) && !/no card|free beta/i.test(B.msg) && !/1100/.test(B.msg), T + '3 no em dash, no "no card", and the number of Lifetime licences is 100');
    }
    // ── 4  no outside host ──
    ok([...hosts].length === 1 && [...hosts][0] === new URL(p.url()).host, T + '4 the portrait is asked from the app\'s own address only (' + [...hosts].join(', ') + ')');
    if (theme === 'dark' && w === 390) {
      // ── 6  a Lifetime licence holder ──
      const L = await p.evaluate(() => { localStorage.removeItem('vi_tester_note'); localStorage.setItem('vi_pioneer', 'true'); localStorage.setItem('vi_founder', 'true'); localStorage.setItem('vi_plan', 'founder');
        const shown = viTesterWelcome(); const vis = (e) => !!e && getComputedStyle(e).display !== 'none'; const m = document.getElementById('tw-msg');
        const seen = [...m.childNodes].map(n => n.nodeType === 3 ? n.textContent : (vis(n) ? n.textContent : '')).join('').replace(/\s+/g, ' ').trim();
        viTesterWelcomeClose(); localStorage.removeItem('vi_tester_note'); localStorage.removeItem('vi_pioneer'); localStorage.removeItem('vi_founder'); localStorage.removeItem('vi_plan');
        const again = viTesterWelcome(); const seen2 = [...m.childNodes].map(n => n.nodeType === 3 ? n.textContent : (vis(n) ? n.textContent : '')).join('').replace(/\s+/g, ' ').trim(); viTesterWelcomeClose();
        return { shown, seen, again, seen2 }; });
      ok(L.shown && L.seen === LIFETIME_NOTE, '6 a Lifetime licence holder is not told about 30 free days or a subscription price; nothing is added (' + L.seen.slice(0, 90) + ')');
      ok(L.again && L.seen2 === NOTE, '6 and an account on a subscription reads the whole note');
    }
    await ctx.close();
  }
  // ── 4 + 5  the build and the styles ──
  const site = fs.readFileSync(path.join(vi.ROOT, 'tools', 'build_site.js'), 'utf8');
  ok(fs.existsSync(path.join(vi.ROOT, 'img', 'founder.jpg')) && /app:[\s\S]*?\['img\/founder\.jpg', 'img\/founder\.jpg'\][\s\S]*?landing:/.test(site), '4 the portrait is in the app build (img/founder.jpg in tools/build_site.js, app list)');
  const part = fs.readFileSync(path.join(vi.ROOT, 'src', 'app', 'paywall', 'offer-modals.html'), 'utf8');
  const css = (part.match(/<style id="vi-founder-style">([\s\S]*?)<\/style>/) || [])[1] || '';
  ok(css && !/Syne|DM Sans|Share Tech/i.test(css) && /var\(--font-display\)/.test(css) && /var\(--font-mono\)/.test(css) && !/#[0-9a-f]{3,8}\b/i.test(css), '5 the founder styles are in offer-modals.html and name no font or colour by hand: tokens only');
  const welcome = fs.readFileSync(path.join(vi.ROOT, 'src', 'app', 'welcome', 'welcome.html'), 'utf8');
  ok(!/font-family:\s*'Syne'/.test((welcome.match(/<div class="vi-founder-strip"[\s\S]*?<\/div>\s*<\/div>/) || [''])[0]), '5 the strip\'s markup hard-codes no font');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
  if (fails) { console.log('FAILURES ' + fails); process.exit(1); }
  console.log('ALL PASSED');
})().catch(e => { console.error(e); process.exit(1); });
