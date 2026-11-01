// Help centre (owner, 1 Nov 2026): the ? in the header opens Help (Ask, FAQs, Tour).
//   1. the tour runs once, straight after the welcome steps and Pete's note, and opens with a choice to skip into the app
//   2. Settings has a clear "Replay the app tour" button; the full tour runs every tab with the card on screen, no sideways scroll
//   3. FAQs list and search; the chat answers from the FAQs and from the person's own numbers on the device
//   4. signed in: fuller answers from help-ask (no figures sent); "unsure" or nothing found files the question with tester-feedback
//      (moment help_unanswered); if help-ask is down, the best FAQ is used; signed out, misses stay on the device
//   5. phone and desktop, Night and Daylight; Esc closes; no page errors
// Run: node tests/test_help_centre.js
const { chromium } = require('playwright');
const APP = process.env.VI_APP || 'file:///home/user/Vault-It/index.html';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const seed = (o) => {
  localStorage.setItem('vi-theme', o.theme); localStorage.setItem('vi_declined_demo', 'true'); localStorage.setItem('vi-flag-house', '0');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  if (o.returning) {
    localStorage.setItem('vi_user', JSON.stringify({ name: 'Tess Tester', email: 't@t.com', logins: 3 })); localStorage.setItem('vi_tester_note', '1');
    localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 2400, cat: 'salary' }], expenses: [{ id: 3, name: 'Rent', amount: 900, type: 'ce' }, { id: 4, name: 'Food', amount: 300, type: 've' }] }));
    localStorage.setItem('pos_debt1', JSON.stringify({ debts: [{ id: 9, name: 'Card', balance: 3000, original: 3000, rate: 22, min: 90, type: 'credit_card' }] }));
    localStorage.setItem('ht3', JSON.stringify({ saved: 5000, target: 200000, houseType: 'terraced', deposits: [{ amount: 5000, date: '01/10/2026' }], prices: { terraced: 200000 } }));
  }
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  const open = async (w, theme, returning) => {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
    const sent = { ask: [], fb: [] }; ctx._mode = 'answer';
    await ctx.route(/\/functions\/v1\/help-ask/, (r) => { const j = JSON.parse(r.request().postData() || '{}'); sent.ask.push(j);
      const m = ctx._mode, h = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: h, body: 'ok' });
      if (m === 'down') return r.fulfill({ status: 404, headers: h, contentType: 'application/json', body: '{"error":"not found"}' });
      r.fulfill({ status: 200, headers: h, contentType: 'application/json', body: JSON.stringify(m === 'unsure' ? { ok: true, answer: '', show: null, unsure: true } : { ok: true, answer: 'Open **Settings** to change it.', show: 'settings', unsure: false }) }); });
    await ctx.route(/\/functions\/v1\/tester-feedback/, (r) => { const j = JSON.parse(r.request().postData() || '{}'); if (j.kind === 'feedback') sent.fb.push(j);
      r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, contentType: 'application/json', body: '{"ok":true,"id":5}' }); });
    await ctx.route(/^https?:\/\/(?!.*\/functions\/v1\/(help-ask|tester-feedback))/, (r) => r.abort());
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(w + ' ' + theme + ': ' + e.message));
    await p.addInitScript(seed, { theme, returning }); await p.goto(APP); await p.waitForTimeout(1600);
    await p.addStyleTag({ content: '#login-overlay,#sync-banner,#trial-banner,#pro-offer-modal{display:none!important}' });
    return { p, ctx, sent };
  };
  const tourOn = (p) => p.evaluate(() => document.getElementById('vi-tour').classList.contains('on'));
  const noSideways = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

  for (const [w, theme] of [[1100, 'dark'], [390, 'light']]) {
    const T = w + ' ' + theme + ': ';
    // ── 1. once, after the welcome steps and Pete's note
    let { p, ctx, sent } = await open(w, theme, false);
    const btn = await p.evaluate(() => { const e = document.getElementById('vi-help-btn'), r = e.getBoundingClientRect(); return { vis: r.width > 20 && r.right <= innerWidth && r.top < 60, aria: e.getAttribute('aria-label') }; });
    ok(btn.vis && /Help/.test(btn.aria), T + 'a ? Help button sits in the header');
    await p.evaluate(() => { document.getElementById('w-income').value = '2000'; wStep2Submit(); });
    await p.waitForFunction(() => !document.getElementById('tester-welcome').classList.contains('hidden'), null, { timeout: 8000 }).catch(() => {});
    ok(await p.evaluate(() => !document.getElementById('tester-welcome').classList.contains('hidden')) && !(await tourOn(p)), T + "Pete's note shows first, no tour yet");
    await p.keyboard.press('Escape');
    await p.waitForFunction(() => document.getElementById('vi-tour').classList.contains('on') && !viHelp.tour.busy, null, { timeout: 8000 }).catch(() => {});
    const first = await p.evaluate(() => ({ title: document.getElementById('vt-title').textContent, skip: document.getElementById('vt-skip').textContent, next: document.getElementById('vt-next').textContent, done: localStorage.getItem('vi_tour_done') }));
    ok(await tourOn(p) && first.title === 'Welcome to Vault-It' && first.next === 'Show me around', T + 'the tour opens once the note closes, with a choice');
    ok(first.skip === 'Skip, go to the app' && first.done === 'offered', T + 'it offers to skip straight into the app, and is marked as offered');
    await p.click('#vt-skip'); await p.waitForTimeout(300);
    ok(!(await tourOn(p)) && (await p.evaluate(() => localStorage.getItem('vi_tour_done'))) === 'skipped', T + 'skip goes straight to the app');
    ok(await p.evaluate(() => document.getElementById('tab-budget').classList.contains('active')), T + 'skipping leaves them where the welcome put them (Budget)');
    await p.evaluate(() => { localStorage.removeItem('vi_tester_note'); viAfterWelcome(); }); await p.waitForTimeout(400);
    await p.keyboard.press('Escape'); await p.waitForTimeout(800);
    ok(!(await tourOn(p)), T + 'the tour never runs on its own a second time');
    await ctx.close();

    // ── 2. Settings replay and the full tour
    ({ p, ctx, sent } = await open(w, theme, true)); await p.waitForTimeout(400);
    ok(!(await tourOn(p)), T + 'a returning account does not get the tour on load');
    await p.evaluate(() => showSettings()); await p.waitForTimeout(200);
    const rb = await p.evaluate(() => { const e = document.getElementById('set-tour-replay'), r = e.getBoundingClientRect(); return { txt: e.textContent, vis: r.width > 40 && r.top >= 0 && r.top < innerHeight }; });
    ok(rb.txt === 'Replay the app tour' && rb.vis, T + 'Settings shows a clear Replay the app tour button near the top');
    await p.click('#set-tour-replay'); await p.waitForFunction(() => document.getElementById('vi-tour').classList.contains('on'), null, { timeout: 8000 }).catch(() => {});
    ok(await tourOn(p) && (await p.evaluate(() => document.getElementById('settings-modal').style.display)) === 'none', T + 'it closes Settings and starts the tour');
    const seen = []; let bad = 0, wide = 0;
    for (let i = 0; i < 20 && await tourOn(p); i++) {
      await p.waitForFunction(() => !viHelp.tour.active || !viHelp.tour.busy, null, { timeout: 5000 }); await p.waitForTimeout(500);
      const s = await p.evaluate(() => { const c = document.getElementById('vt-card').getBoundingClientRect(), sp = document.getElementById('vt-spot');
        return { t: document.getElementById('vt-title').textContent, inView: c.left >= 0 && c.top >= 0 && c.right <= innerWidth + 1 && c.bottom <= innerHeight + 1, spot: !sp.classList.contains('none') }; });
      seen.push(s.t + (s.spot ? '' : ' (no spot)')); if (!s.inView) bad++; if (!(await noSideways(p))) wide++;
      if (i === 5) await p.screenshot({ path: '/home/user/Vault-It/shots/help-tour-' + w + '-' + theme + '.png' });
      await p.click('#vt-next');
    }
    console.log('      steps: ' + seen.join(' | '));
    ok(seen.length >= 10 && seen.includes('Budget: start here') && seen.includes('Debt tracker') && seen[seen.length - 1] === 'Help is always here', T + 'the tour covers each tab and ends on Help (' + seen.length + ' steps)');
    ok(seen.slice(1).filter((x) => /no spot/.test(x)).length === 0, T + 'every step after the first spotlights something');
    ok(bad === 0 && wide === 0, T + 'the card stays on screen and nothing scrolls sideways');
    ok(!(await tourOn(p)) && (await p.evaluate(() => localStorage.getItem('vi_tour_done'))) === 'done', T + 'Finish closes the tour');

    // ── 3. FAQs and local answers
    await p.click('#vi-help-btn'); await p.waitForTimeout(250);
    ok(await p.evaluate(() => document.getElementById('vi-help').classList.contains('open') && /Tess/.test(document.getElementById('vh-log').textContent)), T + 'Help opens with a greeting by first name');
    await p.click('#vh-tab-faq'); await p.waitForTimeout(150);
    const faqs = await p.evaluate(() => document.querySelectorAll('#vh-faq-list .vh-faq').length);
    ok(faqs >= 30, T + faqs + ' FAQs listed');
    await p.fill('#vh-faq-q', 'forgot pin'); await p.waitForTimeout(100);
    ok(/forgot my PIN/i.test(await p.evaluate(() => document.querySelector('#vh-faq-list summary').textContent)), T + 'FAQ search finds the PIN answer first');
    await p.click('#vh-tab-ask');
    const ask = async (q) => { await p.fill('#vh-q', q); await p.press('#vh-q', 'Enter'); await p.waitForTimeout(450); return p.evaluate(() => [...document.querySelectorAll('#vh-log .vh-msg.bot')].pop().innerText.replace(/\s+/g, ' ')); };
    let a = await ask('how much do I owe?');
    ok(/£3(,000|\.0k)/.test(a) && /1 debt/.test(a) && sent.ask.length === 0, T + 'own numbers answered on the device: ' + a.slice(0, 80));
    a = await ask('when could I get my keys?'); ok(/keys around/.test(a) && sent.ask.length === 0, T + 'keys date from their numbers');
    a = await ask('avalanche or snowball'); ok(/highest interest rate first/.test(a) && sent.ask.length === 0, T + 'a clear FAQ match is answered at once');
    await p.evaluate(() => { const b = [...document.querySelectorAll('#vh-log .vh-act[data-show]')].pop(); b.click(); }); await p.waitForTimeout(900);
    ok(await tourOn(p) && (await p.evaluate(() => document.getElementById('vt-title').textContent)) === 'Debt tracker', T + 'Show me spotlights the right part of the app');
    await p.click('#vt-next'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => document.getElementById('vi-help').classList.contains('open')), T + 'and returns to Help');

    // ── 4. signed out: misses stay on the device; signed in: help-ask and tester-feedback
    a = await ask('qqzz wibble frob');
    ok(sent.ask.length === 0 && sent.fb.length === 0 && /not sure/.test(a) && /wibble/.test(await p.evaluate(() => localStorage.getItem('vi_help_log') || '')), T + 'signed out: nothing sent, the miss is kept on the device');
    await p.evaluate(() => { _supaUser = { id: 'u1', email: 't@t.com' }; window._freshAccessToken = _freshAccessToken = async () => 'TOK'; });
    a = await ask('how do I change my theme for £250 a month');
    const q1 = sent.ask[0] || {};
    ok(/Open Settings to change it/.test(a) && /help guide/.test(a), T + 'signed in: a fuller answer from help-ask');
    ok(q1.question && !/250/.test(q1.question) && /\[amount\]/.test(q1.question) && q1.guide && q1.guide.length > 2000 && !/£|owe|month|3000|2400/i.test(JSON.stringify(q1.history || [])) && JSON.stringify(q1.history || []).includes('answered from their own numbers on the device'), T + 'no figures are sent: amounts stripped, answers from their numbers replaced by a placeholder');
    ctx._mode = 'unsure'; a = await ask('does it send me reminders');
    await p.waitForTimeout(400);
    const f1 = sent.fb.find((x) => x.moment === 'help_unanswered');
    ok(/passed your question to Pete/.test(a) && f1 && /reminders/.test(f1.text), T + 'help-ask unsure: the question goes to Pete via tester-feedback');
    ctx._mode = 'down'; const nfb = sent.fb.length; a = await ask('how do I install the app');
    ok(/Add to Home Screen/.test(a) && sent.fb.length === nfb, T + 'help-ask down: the best FAQ answers, nothing filed');
    a = await ask('zzqx blorp'); await p.waitForTimeout(400);
    ok(/passed your question to Pete/.test(a) && sent.fb.some((x) => /zzqx/.test(x.text)), T + 'help-ask down and no FAQ: still filed for Pete');
    await p.evaluate(() => { const b = [...document.querySelectorAll('#vh-log .vh-rate button[data-r="down"]')][0]; b.click(); }); await p.waitForTimeout(400);
    ok(sent.fb.some((x) => x.moment === 'help_unanswered'), T + 'Not helpful also files the question');
    ok(await noSideways(p), T + 'no sideways scroll with Help open');
    await p.screenshot({ path: '/home/user/Vault-It/shots/help-chat-' + w + '-' + theme + '.png' });
    await p.keyboard.press('Escape'); ok(await p.evaluate(() => !document.getElementById('vi-help').classList.contains('open')), T + 'Esc closes Help');
    const copy = await p.evaluate(() => JSON.stringify(viHelp.kb) + JSON.stringify(viHelp.steps) + document.getElementById('vi-help').textContent);
    ok(!/—/.test(copy) && /Not regulated by the FCA\. Not financial advice\./.test(copy), T + 'no em dashes; the FCA line is shown');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fails ? `FAILURES ${fails}` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
