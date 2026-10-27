// Landing page waiting list: joining sends no e-mail, so the success message must point people at the app (where the sign-in code comes from).
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
(async () => {
  const b = await chromium.launch();
  const run = async (insertResult) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
    // no network: outside scripts (Supabase library, 3D, fonts) are refused, and a stand-in Supabase client answers instead
    await page.route(/^https?:/, (r) => r.abort());
    await page.addInitScript((res) => {
      window.__inserted = [];
      const client = { from: () => ({ insert: async (rows) => { window.__inserted.push(rows); return res; } }), rpc: async () => ({ data: 21, error: null }) };
      Object.defineProperty(window, 'supabase', { value: { createClient: () => client }, writable: false });
    }, insertResult);
    await page.goto('file:///home/user/Vault-It/landing.html'); await page.waitForTimeout(300);
    await page.fill('#waitlistEmail', 'tester@example.com');
    await page.evaluate(() => document.getElementById('waitlistForm').requestSubmit());
    await page.waitForTimeout(300);
    const msg = await page.evaluate(() => { const m = document.getElementById('signupMsg'); const a = m.querySelector('a');
      return { text: m.innerText, href: a && a.getAttribute('href'), linkText: a && a.innerText, inserted: window.__inserted.length }; });
    return { page, ctx, msg };
  };

  let r = await run({ error: null });
  ok(r.msg.inserted === 1, 'the address is saved to the waiting list');
  ok(/on the list/i.test(r.msg.text), 'success says they are on the list: ' + r.msg.text);
  ok(r.msg.href === 'https://app.vault-it.co/' && /Open the app/.test(r.msg.linkText), 'success points to the app (that is where the sign-in e-mail comes from): ' + r.msg.href);
  await r.page.locator('#signupMsg').scrollIntoViewIfNeeded(); await r.page.screenshot({ path: 'shots/landing_waitlist_ok.png' }); await r.ctx.close();

  r = await run({ error: { code: '23505', message: 'duplicate' } });
  ok(/on the list/i.test(r.msg.text) && r.msg.href === 'https://app.vault-it.co/', 'already on the list: same message and link, nothing revealed');
  await r.ctx.close();

  r = await run({ error: { code: '500', message: 'boom' } });
  ok(/went wrong/i.test(r.msg.text) && !r.msg.href, 'a failure is reported and offers no app link as if it had worked');
  await r.ctx.close();

  await b.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
})();
