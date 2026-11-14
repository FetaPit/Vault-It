// Card wall, chunk 5: every promise in words (docs/briefs/CARD_WALL.md point 5; owner, 12 Nov 2026).
// Owner: "Remove whole app no card as we are asking for card details now." and "Update font and add 30 days free in header
// font in teal with free in gold" (first welcome screen). Brief: remove "no card" wherever it appears and say what happens:
// 30 days free, card taken now, first charged on day 31, how to cancel.
//   1. first welcome screen: the heading reads "30 days free", in the heading font (family unchanged: Syne), teal with "free"
//      in gold, Night and Daylight, phone and desktop; the line under it says when the card is taken and first charged
//   2. the tester note makes no "no card" promise (its wording, reworded the same day, is test_founder_box.js)
//   3. Terms section 6 no longer says a plan is optional; it states the free period, the first charge and how to cancel;
//      the terms carry today's date; since 13 Nov it carries the price promise word for word with the note, and docs/OFFER_AND_PRICING.md
//      no longer says a subscriber's price changes after the beta
//   4. the plans screen no longer sells "editing on" (there is no read-only state to compare it with)
//   5. the help answers about the free period say the card is taken at checkout and first charged on day 31
// The sweep for "no card" over the built app and the sign-up pages is tests/test_copy.js; the landing page's prices are
// tests/test_signup_page.js.
// Run: node tests/test_card_wall_wording.js
const { FILE_URL } = require('./lib/vi');   // serves file:// app URLs over http; every context meets the app as an account on a plan
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };

(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const theme of ['dark', 'light']) for (const [w, h] of [[390, 844], [1100, 900]]) {
    const phone = w < 700, T = theme + ' ' + w + ': ';
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(T + e.message));
    await p.addInitScript(t => { localStorage.setItem('vi-theme', t); localStorage.setItem('vi_declined_demo', 'true'); }, theme);
    await p.goto(FILE_URL); await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '#login-overlay,#sync-banner,#tester-welcome{display:none!important}' });
    // ── 1  the first welcome screen ──
    const W = await p.evaluate(() => {
      [1, 2, 3].forEach(i => { const e = document.getElementById('w-step-' + i); if (e) e.style.display = i === 1 ? 'block' : 'none'; });
      const tok = (v) => { const d = document.createElement('i'); d.style.color = 'var(' + v + ')'; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      const h = document.querySelector('#wz-s1 .welcome-h2'), f = h && h.querySelector('.wz-free'), sub = document.querySelector('#wz-s1 .welcome-sub');
      const other = document.querySelector('#w-step-2 .welcome-h2') || document.querySelector('.welcome-h2:not(.wz-offer)');
      const r = h.getBoundingClientRect();
      return { text: h.textContent.replace(/\s+/g, ' ').trim(), free: f ? f.textContent.trim() : '', col: getComputedStyle(h).color, freeCol: f ? getComputedStyle(f).color : '', teal: tok('--teal'), gold: tok('--gold'),
        font: getComputedStyle(h).fontFamily, freeFont: f ? getComputedStyle(f).fontFamily : '', otherFont: other ? getComputedStyle(other).fontFamily : '', weight: getComputedStyle(h).fontWeight, freeWeight: f ? getComputedStyle(f).fontWeight : '',
        sub: sub.textContent.replace(/\s+/g, ' ').trim(), seen: r.width > 0 && r.height > 0, sideways: document.documentElement.scrollWidth > innerWidth, fit: h.scrollWidth <= h.clientWidth + 1 };
    });
    ok(W.text === '30 days free' && W.free === 'free' && W.seen, T + '1 the first welcome heading reads "30 days free" (' + W.text + ')');
    ok(W.col === W.teal && W.freeCol === W.gold && W.teal !== W.gold, T + '1 it is teal with "free" in gold (' + W.col + ' / ' + W.freeCol + ')');
    ok(/Syne/.test(W.font) && W.font === W.freeFont && (!W.otherFont || W.font === W.otherFont) && W.weight === W.freeWeight, T + '1 in the screen\'s heading font, family unchanged (' + W.font.slice(0, 30) + ', ' + W.weight + ')');
    ok(!/no card|whole app/i.test(W.text + ' ' + W.sub), T + '1 "The whole app, no card" is gone');
    ok(/card is taken/i.test(W.sub) && /first charged on day 31/.test(W.sub) && /cancel before then and you pay nothing/i.test(W.sub), T + '1 the line under it says when the card is taken and first charged, and that cancelling before then costs nothing (' + W.sub + ')');
    ok(!/keep editing|After 30 days, pick a plan/i.test(W.sub), T + '1 no promise of using the app before a plan is chosen');
    ok(!W.sideways && W.fit, T + '1 no sideways scroll, the heading fits');
    if (theme === 'dark' && w === 390) {
      // ── 2  the tester note ──
      const note = await p.evaluate(() => document.getElementById('tw-msg').textContent.replace(/\s+/g, ' ').trim());
      ok(!/no card/i.test(note) && /^Thank you, personally, for becoming a Vault-It Pioneer\. Your first 30 days are on me\./.test(note), '2 the tester note makes no "no card" promise (its wording is test_founder_box.js) (' + note.slice(0, 70) + ')');
      // ── 3  the terms ──
      const terms = await p.evaluate(() => { showTerms(); const t = document.getElementById('legal-modal').textContent.replace(/\s+/g, ' '); document.getElementById('legal-modal').remove(); return t; });
      const s6 = (terms.match(/6\. Paid plans(.*?)7\. Availability/) || [])[1] || '';
      ok(s6 && !/is optional/i.test(s6), '3 the terms no longer call a plan optional');
      ok(/Vaulter/.test(s6) && /Pioneer/.test(s6) && /Lifetime licence/.test(s6) && /30 days free/.test(s6) && /first charged on day 31/.test(s6) && /hello@vault-it\.co/.test(s6) && /legal rights as a consumer/.test(s6), '3 section 6 names the plans, the free period, the first charge and how to cancel, and keeps the consumer rights sentence (' + s6.slice(0, 90) + ')');
      ok(/last updated 13 November 2026/.test(terms), '3 the terms carry the date of this change');
      // the price promise: the note and the terms say it in the same words (owner, 13 Nov: "1. Yes add" to the terms)
      const SENT = 'You keep your discounted first movers\u2019 price forever while you stay subscribed';
      ok(note.indexOf(SENT) > -1 && s6.indexOf(SENT) > -1, '3 the note and terms section 6 carry the price promise word for word (' + SENT.slice(0, 40) + '...)');
      ok(/If you cancel and subscribe again later, the price on sale then applies/.test(s6) && !/Pioneer price/.test(s6), '3 section 6 says where the promise ends: cancel and come back, and the price on sale then applies');
      const doc = require('fs').readFileSync(require('path').join(__dirname, '..', 'docs', 'OFFER_AND_PRICING.md'), 'utf8');
      ok(!/false: tester prices do change after the beta/.test(doc) && /13 Nov/.test(doc.split('\n').filter(l => /Alpha pricing locked at signup/.test(l)).join(' ')), '3 docs/OFFER_AND_PRICING.md no longer says a subscriber\'s tester price changes after the beta (corrected 13 Nov)');
      // ── 4  the plans screen ──
      const wall = await p.evaluate(() => document.getElementById('plan-wall').textContent.replace(/\s+/g, ' '));
      ok(!/editing on/i.test(wall) && /The whole app/.test(wall), '4 the plans screen offers the whole app, with no "editing on"');
      // ── 5  the help answers ──
      const help = await p.evaluate(() => { const src = document.documentElement.innerHTML; const m = src.match(/q:'How long is the free trial\?'[^}]*a:'([^']*)'/); return m ? m[1] : ''; });
      ok(/30 days free/.test(help) && /card is taken at checkout/.test(help) && /first charged on day 31/.test(help) && !/no card/i.test(help), '5 the help answer on the free period says the card is taken at checkout and first charged on day 31');
    }
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close();
  if (fails) { console.log('FAILURES ' + fails); process.exit(1); }
  console.log('ALL PASSED');
})().catch(e => { console.error(e); process.exit(1); });
