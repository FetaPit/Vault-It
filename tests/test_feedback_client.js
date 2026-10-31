// Tester feedback, in the app (owner, 31 Oct 2026; docs/TESTER_FEEDBACK.md): one Feedback button on every screen; a sentence, a 1 to 5
// rating and a picture of the screen with every figure hidden; context attached (screen, device, last actions, errors) with no
// figures; a light activity log batched to our own function, switched off in Settings; prompts at good moments, once each.
// Run: node tests/test_feedback_client.js
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, theme] of [[1100, 'dark'], [390, 'light']]) {
    const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ' ' + e.message));
    const sent = []; let status = 200;
    await ctx.route(/\/functions\/v1\/tester-feedback/, r => { const j = JSON.parse(r.request().postData() || '{}'); sent.push(j);
      r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(status === 200 ? { ok: true, id: 7, n: (j.events || []).length } : { error: 'limit' }) }); });
    await ctx.route(/^https?:\/\/(?!.*\/functions\/v1\/tester-feedback)/, r => r.abort());
    await p.addInitScript(t => {
      localStorage.setItem('vi_theme', t); localStorage.setItem('vi_declined_demo', 'true');
      localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
      if (!localStorage.getItem('pos_ov1')) localStorage.setItem('pos_ov1', JSON.stringify({ income: [{ id: 1, name: 'Salary', amount: 3217, cat: 'salary' }], expenses: [{ id: 2, name: 'Rent', amount: 987, type: 'ce' }] }));
      /* stand-in for html2canvas: renders nothing, but runs the app's onclone so the masking can be checked */
      window.html2canvas = async (el, o) => { const d = document.implementation.createHTMLDocument(''); d.body.innerHTML = document.body.innerHTML; o.onclone(d);
        window._fbClone = d.body.textContent; window._fbCloneHasFb = !!d.getElementById('vi-fb'); const c = document.createElement('canvas'); c.width = 320; c.height = 200; c.getContext('2d').fillRect(0, 0, 320, 200); return c; };
    }, theme);
    await p.goto('file:///home/user/Vault-It/index.html'); await p.waitForTimeout(1600);
    await p.addStyleTag({ content: '#welcome-overlay,#login-overlay,#sync-banner,#pro-offer-modal,#trial-banner,#tester-welcome{display:none!important}' });
    await p.evaluate(t => { if ((document.documentElement.dataset.theme || 'dark') !== t && window.viToggleTheme) viToggleTheme(); }, theme);
    const T = w + ' ' + theme + ': ';
    // the button, on every screen, clear of the nav and footer
    const btn = await p.evaluate(() => { const e = document.getElementById('vi-fb-btn'); const r = e.getBoundingClientRect(), fh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--footer-h')) || 30;
      return { vis: getComputedStyle(e).display !== 'none' && r.width > 0, bottom: r.bottom, right: r.right, fh, label: getComputedStyle(e.querySelector('span')).display !== 'none', aria: e.getAttribute('aria-label') }; });
    ok(btn.vis && btn.right <= w && btn.bottom <= (mob ? 844 : 900) - 30 && btn.aria === 'Send feedback', T + 'a Feedback button sits above the footer and nav (bottom ' + Math.round(btn.bottom) + ')');
    ok(btn.label === !mob, T + (mob ? 'on a phone it is just the icon' : 'on desktop it says Feedback'));
    // not signed in: says so, sends nothing
    await p.click('#vi-fb-btn'); await p.waitForTimeout(300);
    ok(/Sign in to send feedback/.test(await p.textContent('#vi-fb-msg')) && sent.length === 0, T + 'signed out: the sheet says how to reach us instead');
    await p.evaluate(() => viFbClose());
    // signed in
    await p.evaluate(() => { _supaUser = { id: 'u1', email: 't@t.com' }; window._freshAccessToken = _freshAccessToken = async () => 'TOK'; showTab('budget'); showTab('assets'); showSubtab('assets', 'cash', null); });
    await p.waitForTimeout(300);
    await p.click('#vi-fb-btn'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => !document.getElementById('vi-fb').hidden && document.activeElement.id === 'vi-fb-text'), T + 'the sheet opens with the cursor in the box');
    ok(await p.evaluate(() => typeof window._fbClone === 'string' && window._fbClone.length > 200 && !/\d/.test(window._fbClone) && !window._fbCloneHasFb), T + 'the picture is taken with every digit hidden and without the sheet');
    ok(await p.evaluate(() => { const i = document.getElementById('vi-fb-shot'); return !i.hidden && /^data:image\/jpeg/.test(i.src); }) && /figures are hidden/.test(await p.textContent('#vi-fb-picst')), T + 'a preview of the picture shows, saying the figures are hidden');
    await p.click('#vi-fb-send'); ok(/Write a sentence or pick a number/.test(await p.textContent('#vi-fb-msg')) && !sent.some(x => x.kind === 'feedback'), T + 'an empty send is stopped');
    await p.fill('#vi-fb-text', 'The cash total confused me'); await p.click('#vi-fb .vi-fb-rate button[data-r="4"]'); await p.click('#vi-fb-send'); await p.waitForTimeout(700);
    const fb = sent.find(x => x.kind === 'feedback');
    ok(fb && fb.text === 'The cash total confused me' && fb.rating === 4 && /^data:image\/jpeg;base64,/.test(fb.screenshot || '') && fb.context && fb.context.tab === 'assets/cash', T + 'sends the words, the rating, the picture and the screen (' + (fb && fb.context && fb.context.tab) + ')');
    const cj = JSON.stringify(fb && fb.context || {});
    ok(fb && Array.isArray(fb.context.trail) && fb.context.trail.length >= 3 && !/3217|987|£/.test(cj) && fb.context.trail.every(e => !/\d/.test(e.el || '')), T + 'the context carries the last actions and no figures');
    ok(await p.evaluate(() => document.getElementById('vi-fb').hidden), T + 'the sheet closes with a thank you');
    // untick the picture: none sent
    await p.click('#vi-fb-btn'); await p.waitForTimeout(400); await p.uncheck('#vi-fb-pic'); await p.fill('#vi-fb-text', 'No picture please'); await p.click('#vi-fb-send'); await p.waitForTimeout(600);
    ok(sent.filter(x => x.kind === 'feedback').pop().screenshot === null, T + 'unticked: no picture is sent');
    // too many: a kind message
    status = 429; await p.click('#vi-fb-btn'); await p.waitForTimeout(400); await p.fill('#vi-fb-text', 'Again'); await p.click('#vi-fb-send'); await p.waitForTimeout(600);
    ok(/a lot of feedback for one day/.test(await p.textContent('#vi-fb-msg')), T + 'over the daily limit it says so kindly'); status = 200; await p.evaluate(() => viFbClose());
    // no picture possible (the picture library cannot load): the box is unticked and it says so; words still send
    await p.evaluate(() => { window.html2canvas = undefined; }); await p.click('#vi-fb-btn'); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => { const c = document.getElementById('vi-fb-pic'); return !c.checked && c.disabled && /not available here/.test(document.getElementById('vi-fb-picst').textContent); }), T + 'when no picture can be taken, the box is unticked and says so');
    await p.evaluate(() => viFbClose());
    // activity log
    await p.evaluate(() => { showTab('debt'); showTab('overview'); }); const n0 = sent.length; await p.evaluate(() => viFb.flush()); await p.waitForTimeout(400);
    const ev = sent.slice(n0).find(x => x.kind === 'events'), allEv = [].concat(...sent.filter(x => x.kind === 'events').map(x => x.events));
    ok(ev && /^[0-9a-f-]{36}$/.test(ev.session) && ev.events.some(e => e.ev === 'tab' && e.tab === 'debt' && e.ms >= 0) && allEv.some(e => e.ev === 'session_start'), T + 'activity: screens opened and time on them are batched to our own function');
    ok(ev && !/3217|987|£/.test(JSON.stringify(ev)) && ev.events.every(e => e.ev !== 'click'), T + 'activity holds no figures and no taps');
    await p.evaluate(() => { const b = document.querySelector('#set-fbact button[data-val="0"]'); viFbAct(false, b); showTab('budget'); }); const n1 = sent.length; await p.evaluate(() => viFb.flush()); await p.waitForTimeout(300);
    ok(sent.length === n1 && await p.evaluate(() => localStorage.getItem('vi-fb-activity') === '0' && document.querySelector('#set-fbact button[data-val="0"]').classList.contains('active')), T + 'Settings > Share usage off: nothing is sent');
    await p.evaluate(() => viFbAct(true));
    // honest questions: at most one prompt per visit, never in the first minute (it waits for a later visit), each asked once
    ok(await p.evaluate(() => viFbMoment('debt') === false && JSON.parse(localStorage.getItem('vi-fb-pending') || '[]').includes('debt')), T + 'a question in the first minute waits for a later visit');
    ok(await p.evaluate(() => viFbMoment('budget', true) === true && viFbMoment('budget', true) === false && !document.getElementById('vi-fb-nudge').hidden && /which part was hardest/.test(document.getElementById('vi-fb-nudge').textContent)), T + 'a question prompt shows once, never twice');
    await p.click('#vi-fb-nudge .btn-add-data'); await p.waitForTimeout(300);
    ok(/which part was hardest to fill in/.test(await p.textContent('#vi-fbq-q')) && await p.evaluate(() => document.querySelectorAll('#vi-fbq-ch button').length === 5), T + 'Answer opens the question with its choices');
    await p.click('#vi-fbq-ch button[data-v="Bills"]'); await p.fill('#vi-fbq-text', 'Did not know my council tax'); const n2 = sent.length; await p.click('#vi-fbq-next'); await p.waitForTimeout(600);
    const q1 = sent.slice(n2).find(x => x.kind === 'feedback');
    ok(q1 && q1.question === 'budget' && q1.choice === 'Bills' && q1.text === 'Did not know my council tax' && q1.screenshot === null, T + 'the answer is sent with its question id and choice');
    // a check-in, one question at a time; skipped questions are left out
    await p.evaluate(() => viFbAsk('day14')); await p.waitForTimeout(200);
    ok(/Question 1 of 5/.test(await p.textContent('#vi-fbq-step')) && /no longer use Vault-It/.test(await p.textContent('#vi-fbq-q')), T + 'the two-week check-in starts at question 1 of 5');
    await p.click('#vi-fbq-ch button[data-v="Very disappointed"]'); await p.click('#vi-fbq-next');
    await p.fill('#vi-fbq-text', 'Seeing my deposit grow'); await p.click('#vi-fbq-next');
    await p.click('#vi-fbq-skip'); await p.fill('#vi-fbq-text', 'Bank sync'); await p.click('#vi-fbq-next');
    ok(/Question 5 of 5/.test(await p.textContent('#vi-fbq-step')) && (await p.textContent('#vi-fbq-next')) === 'Send', T + 'the last question says Send');
    await p.click('#vi-fbq-ch button[data-v="No"]'); const n3 = sent.length; await p.click('#vi-fbq-next'); await p.waitForTimeout(600);
    const sv = sent.slice(n3).find(x => x.kind === 'survey');
    ok(sv && sv.survey === 'day14' && sv.answers.length === 4 && sv.answers[0].q === 'pmf' && sv.answers[0].choice === 'Very disappointed' && sv.answers.some(a => a.q === 'improve' && a.text === 'Bank sync') && !sv.answers.some(a => a.q === 'who'), T + 'the check-in is sent as one set of answers, skipped ones left out');
    ok(!/3217|987/.test(JSON.stringify(sv || {})), T + 'no figures in the check-in');
    // the end-of-trial check-in has a 0 to 10 score and the tester price as charged
    await p.evaluate(() => viFbAsk('day25')); await p.waitForTimeout(150);
    for (let k = 0; k < 2; k++) await p.click('#vi-fbq-skip');
    ok(/£3\.99 a month/.test(await p.textContent('#vi-fbq-q')), T + 'the price question uses the tester price (£3.99 a month)');
    await p.click('#vi-fbq-skip');
    ok(await p.evaluate(() => document.querySelectorAll('#vi-fbq-ch.vi-fbq-score button').length === 11), T + 'the recommend question is a 0 to 10 score');
    await p.evaluate(() => viFbAskClose());
    // privacy notice matches
    ok(await p.evaluate(() => { showPrivacy(); const t = document.body.textContent; return /third-party analytics/.test(t) && /Share usage/.test(t) && /reads the feedback you send/.test(t); }), T + 'the privacy notice says what is recorded and that Claude sorts feedback');
    ok((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, T + 'no sideways scroll');
    await ctx.close();
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
