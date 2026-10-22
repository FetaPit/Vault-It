// Beta-readiness in the app: honest privacy/terms (and no false “end-to-end encrypted” claim), consent line on sign-in,
// abuse-limit (429) messages that do NOT fall back to the built-in sender, “Download my data”, and “Delete my account”.
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const SHOT = '/tmp/claude-0/-home-user/2a4eadf5-0fc4-5805-8296-f5c90b3cc25f/scratchpad/shots/';
const MOCK = `
  window._m={calls:[],otp:0,signOut:[],script:{}};
  const m=window._m;
  const fnErr=(status,body)=>({data:null,error:{context:{json:async()=>body,status}}});
  _supaClient={
    functions:{invoke:async(name,{body})=>{
      m.calls.push({name,body});
      const s=m.script[name+':'+(body.action||'')]||m.script[name];
      if(s) return typeof s==='function'?s(body):s;
      if(name==='pin-auth'&&body.action==='status')return {data:{pin:false},error:null};
      if(name==='send-auth-email')return {data:{success:true},error:null};
      return fnErr(400,{error:'bad'});
    }},
    auth:{
      signInWithOtp:async()=>{m.otp++;return {data:{},error:null};},
      verifyOtp:async()=>({data:null,error:{message:'bad'}}),
      getSession:async()=>({data:{session:null}}),
      signOut:async(o)=>{m.signOut.push(o||{});return {};}
    },
    from:(t)=>{const rows={profiles:{id:'u-1',name:'Pete',goal:3},vault_data:[{key:'pos_ov1',value:{income:[{n:'Pay',amount:3000}]},updated_at:'2026-10-20T10:00:00Z'}],nw_history:[{recorded_at:'2026-10-01',value:12000}]}[t];
      const q={select:()=>q,eq:()=>q,maybeSingle:()=>Promise.resolve({data:rows}),then:(r,j)=>Promise.resolve({data:rows}).then(r,j)};return q;},
    rpc:async()=>({data:[{id:7,key:'pos_ov1',value:{},archived_at:'2026-10-19T10:00:00Z',reason:'edited'}]})
  };`;
const fresh = async (b, seed) => {
  const ctx = await b.newContext({ viewport: { width: 430, height: 900 }, acceptDownloads: true }); const page = await ctx.newPage(); const errs = []; page.errs = errs;
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript((seed) => { if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1'); localStorage.setItem('vi_declined_demo', 'true'); if (seed) for (const k in seed) localStorage.setItem(k, seed[k]); }, seed || null);
  await page.goto('file:///home/user/Vault-It/index.html'); await page.waitForTimeout(1200);
  await page.evaluate(MOCK); return { ctx, page };
};
const err = page => page.evaluate(() => document.getElementById('auth-err').textContent);
const step = page => page.evaluate(() => document.querySelector('.auth-step.active').id);
(async () => {
  const b = await chromium.launch();
  // ── 1. honest sign-in card, consent, privacy + terms ──
  let { ctx, page } = await fresh(b);
  const card = await page.evaluate(() => document.getElementById('login-overlay').innerText);
  ok(!/end-to-end/i.test(card), 'sign-in card no longer claims “end-to-end encrypted”');
  ok(/Beta Terms/.test(card) && /Privacy Notice/.test(card), 'sign-in card links the Beta Terms and Privacy Notice');
  await page.evaluate(() => document.querySelector('#auth-email-step a[onclick*="showPrivacy"]').click()); await page.waitForTimeout(200);
  let legal = await page.evaluate(() => (document.getElementById('legal-modal') || {}).innerText || '');
  ok(/not end-to-end encrypted/i.test(legal), 'privacy notice says plainly that it is NOT end-to-end encrypted');
  ok(/Supabase/.test(legal) && /Resend/.test(legal) && /GitHub/.test(legal) && /Anthropic/.test(legal) && /Yahoo/.test(legal) && /Meshy/.test(legal), 'privacy notice names every third party that handles data');
  ok(/Frankfurt/.test(legal) && /pete@ptlive\.design/.test(legal) && /ico\.org\.uk/.test(legal), 'privacy notice has the EU location, a contact and the ICO route');
  ok(/Download my data/.test(legal) && /Delete my account/.test(legal) && /one month/.test(legal), 'privacy notice points to the in-app export / delete and the one-month reply');
  ok(!/only in your browser.s local storage|never leaves your device|We have no access to it/i.test(legal), 'the old (now false) “it never leaves your device” claim is gone');
  await page.screenshot({ path: SHOT + 'beta_privacy.png' });
  await page.evaluate(() => document.getElementById('legal-modal').remove());
  await page.evaluate(() => showTerms()); legal = await page.evaluate(() => document.getElementById('legal-modal').innerText);
  ok(/not financial/i.test(legal) && /Financial Conduct Authority/.test(legal) && /England and Wales/.test(legal) && /beta/i.test(legal), 'terms: beta, not advice, not FCA-regulated, English law');
  await page.screenshot({ path: SHOT + 'beta_terms.png' });
  await page.evaluate(() => document.getElementById('legal-modal').remove());

  // ── 2. abuse limits: say so, and do not work around them with the built-in sender ──
  await page.evaluate(() => { _m.script['send-auth-email'] = { data: null, error: { context: { json: async () => ({ error: 'rate_limited', retryAfter: 1500 }), status: 429 } } }; });
  await page.fill('#auth-email', 'pete@example.com'); await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(900);
  ok(/25 min/.test(await err(page)), 'rate-limited sign-in e-mail → “' + await err(page) + '”');
  ok(await step(page) === 'auth-email-step' && await page.evaluate(() => _m.otp) === 0, 'stays on the e-mail step and does NOT fall back to the built-in sender');
  ok(await page.evaluate(() => document.querySelector('#auth-email-step .auth-btn').disabled) === false, 'the button is usable again');
  await page.evaluate(() => { _m.script['send-auth-email'] = { data: null, error: { context: { json: async () => ({ error: 'x' }), status: 500 } } }; });
  await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => _m.otp) === 1 && await step(page) === 'auth-otp-step', 'a real outage (500) still falls back to the built-in sender');
  await page.evaluate(() => { _m.script['pin-auth:login'] = { data: null, error: { context: { json: async () => ({ error: 'rate_limited', retryAfter: 240 }), status: 429 } } }; _authOTP = { email: 'pete@example.com' }; _pinMode = 'server'; _pinEnterLen = 6; _pinEnterBuf = ''; _showAuthStep('pin'); });
  for (const d of '123456') await page.evaluate(d => _enterPinKey(d), d); await page.waitForTimeout(900);
  ok(/Too many attempts from this network.*4 min/.test(await err(page)), 'rate-limited PIN sign-in → “' + await err(page) + '”');
  ok(await page.evaluate(() => document.querySelectorAll('#pin-dots .filled').length) === 0, 'PIN dots reset so they can try again later');
  await ctx.close();

  // ── 3. Settings: owner tools tucked away; export + delete present ──
  const seed = { vi_user: JSON.stringify({ name: 'Pete', email: 'pete@example.com' }), pos_ov1: JSON.stringify({ income: [{ n: 'Pay', amount: 3000 }], expenses: [] }), vi_pin_hash: '123abc', meshy_api_key: 'msy_secret', notion_token: 'ntn_secret',
    'sb-legpubblzgknxdtvsant-auth-token': JSON.stringify({ access_token: 'jwt.jwt.jwt' }), vi_session: JSON.stringify({ email: 'pete@example.com', expiry: Date.now() + 1e10 }), vi_last_email: 'pete@example.com', vi_dirty: '[]', vi_last_sync: '1' };
  ({ ctx, page } = await fresh(b, seed));
  await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await page.evaluate(() => { _supaUser = { id: 'u-1', email: 'pete@example.com' }; showSettings(); }); await page.waitForTimeout(300);
  const set = await page.evaluate(() => ({ dets: [...document.querySelectorAll('#settings-modal details')].map(d => ({ open: d.open, txt: d.querySelector('summary').innerText })), yd: !!document.getElementById('set-yourdata'), del: !!document.getElementById('set-delete-account'),
    }));
  const ckVisible = await page.locator('#set-ck-form').isVisible(), ejsVisible = await page.locator('#set-ejs-svc').isVisible(), notionVisible = await page.locator('#set-notion-token').isVisible(); set.ckHidden = !ckVisible && !notionVisible; set.ejsHidden = !ejsVisible;
  ok(set.dets.length === 2 && set.dets.every(d => !d.open), 'owner/admin tools are collapsed by default (' + set.dets.map(d => d.txt.slice(2, 30)).join(' | ') + ')');
  ok(set.ckHidden && set.ejsHidden, 'ConvertKit / EmailJS / Notion fields are not visible to a tester');
  ok(set.yd && set.del, 'Settings has “Your data” and “Delete my account”');

  // ── 4. Download my data ──
  const bundle = await page.evaluate(() => buildMyDataBundle());
  const dev = JSON.stringify(bundle.onThisDevice);
  ok(bundle.onThisDevice.pos_ov1 && bundle.onThisDevice.vi_user && bundle.onThisDevice.vi_user.name === 'Pete', 'export includes the data on this device');
  ok(!/vi_pin_hash|meshy_api_key|notion_token|sb-legpub|jwt\.jwt|msy_secret|ntn_secret|123abc|vi_dirty|vi_last_sync/.test(dev), 'export leaves out sign-in tokens, PIN hash, API keys and sync bookkeeping');
  ok(bundle.inYourAccount && bundle.inYourAccount.profile.name === 'Pete' && bundle.inYourAccount.vaultData.length === 1 && bundle.inYourAccount.netWorthHistory.length === 1 && bundle.inYourAccount.versionHistory.length === 1, 'export includes the copy in the account (profile, saved data, net-worth history, versions)');
  ok(bundle.problems.length === 0 && bundle.account.email === 'pete@example.com', 'no problems reported; account e-mail recorded');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.evaluate(() => exportMyData())]);
  ok(/^vault-it-my-data-\d{4}-\d\d-\d\d\.json$/.test(dl.suggestedFilename()), 'downloads a dated .json file: ' + dl.suggestedFilename());
  const fs = require('fs'); const parsed = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); ok(parsed.app === 'Vault·It' && parsed.onThisDevice.pos_ov1, 'the downloaded file is valid JSON with the data in it');
  // signed out: still exports the device, and says so
  const lone = await page.evaluate(() => { const u = _supaUser; _supaUser = null; return buildMyDataBundle().then(x => { _supaUser = u; return x; }); });
  ok(lone.inYourAccount === null && /Not signed in/.test(lone.problems.join()) && lone.onThisDevice.pos_ov1, 'not signed in → device data only, with a clear note');

  // ── 5. Delete my account ──
  await page.evaluate(() => { document.getElementById('set-delete-account').click(); }); await page.waitForTimeout(250);
  ok(await page.evaluate(() => !!document.getElementById('delete-modal') && document.getElementById('settings-modal').style.display === 'none'), 'Delete opens a confirmation (settings step aside)');
  ok(await page.evaluate(() => document.getElementById('del-go').disabled), 'the delete button is locked until DELETE is typed');
  await page.fill('#del-typed', 'delete me'); ok(await page.evaluate(() => document.getElementById('del-go').disabled), 'still locked for the wrong text');
  await page.screenshot({ path: SHOT + 'beta_delete.png' });
  await page.fill('#del-typed', 'DELETE'); ok(!(await page.evaluate(() => document.getElementById('del-go').disabled)), 'unlocked once DELETE is typed');
  const tryDelete = async (script, pin) => { await page.evaluate(s => { _delBusy = false; _m.script['pin-auth:delete'] = new Function('fnErr', 'return ' + s)((st, bd) => ({ data: null, error: { context: { json: async () => bd, status: st } } })); }, script);
    await page.fill('#del-pin', pin || ''); await page.evaluate(() => confirmDeleteAccount()); await page.waitForTimeout(600); return page.evaluate(() => ({ msg: (document.getElementById('del-status') || {}).textContent || '', kept: !!localStorage.getItem('pos_ov1'), done: !!document.getElementById('delete-done'), body: _m.calls.filter(c => c.name === 'pin-auth' && c.body.action === 'delete').pop().body })); };
  let r = await tryDelete(`fnErr(401,{error:'invalid',remaining:3})`, '111111'); ok(/3 attempts left/.test(r.msg) && r.kept && !r.done, 'wrong PIN → “' + r.msg + '” and nothing is deleted');
  r = await tryDelete(`fnErr(429,{error:'locked',retryAfter:900})`, '111111'); ok(/15 min/.test(r.msg) && r.kept && !r.done, 'locked → “' + r.msg + '”');
  r = await tryDelete(`fnErr(403,{error:'recent_login'})`, ''); ok(/signed in within the last 15 minutes/.test(r.msg) && r.kept && !r.done, 'stale sign-in → asks the user to sign in again');
  r = await tryDelete(`fnErr(429,{error:'rate_limited',retryAfter:120})`, '111111'); ok(/2 min/.test(r.msg) && r.kept, 'network rate limit → “' + r.msg + '”');
  r = await tryDelete(`fnErr(500,{error:'server'})`, '111111'); ok(/try again/.test(r.msg) && r.kept && !r.done, 'server error → can retry, nothing wiped');
  r = await tryDelete(`({data:null,error:{message:'down'}})`, '111111'); ok(/Could not reach the server/.test(r.msg) && r.kept && !r.done, 'offline → nothing deleted, says so');
  ok(r.body.action === 'delete' && r.body.pin === '111111', 'the PIN is sent with the delete request');
  r = await tryDelete(`({data:{ok:true},error:null})`, '482915');
  ok(r.done && !r.kept, 'success → this device is wiped and a confirmation screen is shown');
  const after = await page.evaluate(() => ({ keys: localStorage.length, user: _supaUser, signOut: _m.signOut, text: document.getElementById('delete-done').innerText }));
  ok(after.keys === 0 && after.user === null, 'every local key removed, signed out of the app');
  ok(after.signOut.length === 1 && after.signOut[0].scope === 'local', 'Supabase session dropped locally');
  ok(/has been deleted/.test(after.text), 'user sees: “' + after.text.split('\n')[0] + '”');
  await page.screenshot({ path: SHOT + 'beta_deleted.png' });
  ok(page.errs.length === 0, 'no page errors ' + page.errs.slice(0, 2).join(' | '));
  await ctx.close();

  // ── 6. not signed in: cannot delete ──
  ({ ctx, page } = await fresh(b, seed));
  await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await page.evaluate(() => { _supaUser = null; openDeleteAccount(); }); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.getElementById('delete-modal')), 'without an account session there is nothing to delete (asked to sign in instead)');
  await ctx.close(); await b.close();
  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
