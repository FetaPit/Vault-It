// Landing page join form: the server (waitlist-welcome) saves the address and e-mails the beta link; the page always points at the app,
// and if the server cannot be reached it still saves the address directly.
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  const run = async (fnReply, insertResult) => {   // fnReply: {status, body} | 'down'
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
    const fnCalls = [];
    await page.route(/^https?:/, (r) => r.abort());   // no outside scripts or network
    await page.route(/\/functions\/v1\/waitlist-welcome/, (r) => {
      fnCalls.push(JSON.parse(r.request().postData() || '{}'));
      if (fnReply === 'down') return r.abort();
      return r.fulfill({ status: fnReply.status, contentType: 'application/json', body: JSON.stringify(fnReply.body || {}) });
    });
    await page.addInitScript((res) => {
      window.__inserted = [];
      const client = { from: () => ({ insert: async (rows) => { window.__inserted.push(rows); return res; } }), rpc: async () => ({ data: 21, error: null }) };
      Object.defineProperty(window, 'supabase', { value: { createClient: () => client }, writable: false });
    }, insertResult || { error: null });
    await page.goto('file:///home/user/Vault-It/landing.html'); await page.waitForTimeout(300);
    await page.fill('#waitlistEmail', 'tester@example.com');
    await page.evaluate(() => document.getElementById('waitlistForm').requestSubmit());
    await page.waitForTimeout(500);
    const msg = await page.evaluate(() => { const m = document.getElementById('signupMsg'); const a = m.querySelector('a');
      return { text: m.innerText, href: a && a.getAttribute('href'), inserted: window.__inserted.length }; });
    return { page, ctx, msg, fnCalls };
  };

  let r = await run({ status: 200, body: { ok: true, emailed: true } });
  ok(r.fnCalls.length === 1 && r.fnCalls[0].email === 'tester@example.com', 'the form asks the server to save and welcome the address');
  ok(/emailed you your beta link/i.test(r.msg.text) && r.msg.href === 'https://app.vault-it.co/', 'success says the link is in their inbox and offers the app now: ' + r.msg.text);
  ok(r.msg.inserted === 0, 'nothing is saved twice (the server saved it)');
  await r.page.locator('#signupMsg').scrollIntoViewIfNeeded(); await r.page.screenshot({ path: 'shots/landing_waitlist_ok.png' }); await r.ctx.close();

  r = await run({ status: 200, body: { ok: true, emailed: false } });
  ok(/on the list/i.test(r.msg.text) && !/emailed/i.test(r.msg.text) && r.msg.href === 'https://app.vault-it.co/', 'saved but not e-mailed: no promise of an e-mail, app link shown');
  await r.ctx.close();

  r = await run('down');
  ok(r.msg.inserted === 1 && /on the list/i.test(r.msg.text) && r.msg.href === 'https://app.vault-it.co/', 'server unreachable: the address is saved directly and the app link shown');
  await r.ctx.close();

  r = await run({ status: 500, body: { error: 'server' } });
  ok(r.msg.inserted === 1 && /on the list/i.test(r.msg.text), 'server error: saved directly');
  await r.ctx.close();

  r = await run({ status: 500 }, { error: { code: '23505', message: 'duplicate' } });
  ok(/on the list/i.test(r.msg.text) && r.msg.href === 'https://app.vault-it.co/', 'fallback with an address already on the list: same message, nothing revealed');
  await r.ctx.close();

  r = await run({ status: 500 }, { error: { code: '500', message: 'boom' } });
  ok(/went wrong/i.test(r.msg.text) && !r.msg.href, 'a real failure is reported and offers no link as if it had worked');
  await r.ctx.close();

  r = await run({ status: 400, body: { error: 'invalid_email' } });
  ok(/doesn.t look right/i.test(r.msg.text) && !r.msg.href && r.msg.inserted === 0, 'a bad address is reported, nothing saved');
  await r.ctx.close();

  r = await run({ status: 429, body: { error: 'rate_limited', retryAfter: 60 } });
  ok(/too many/i.test(r.msg.text) && r.msg.href === 'https://app.vault-it.co/' && r.msg.inserted === 0, 'rate limited: says so, still offers the app');
  await r.ctx.close();

  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
