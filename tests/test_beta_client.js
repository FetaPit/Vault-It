// Beta-readiness in the app: honest privacy/terms (and no false “end-to-end encrypted” claim), consent line on sign-in,
// abuse-limit (429) messages that do NOT fall back to the built-in sender, “Download my data”, and “Delete my account”.
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const SHOT = (() => { const d = require('os').tmpdir() + '/vaultit-shots/'; try { require('fs').mkdirSync(d, { recursive: true }); } catch (e) {} return d; })();
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
  await page.addInitScript((seed) => { if (window.name === '__seeded') return; window.name = '__seeded'; localStorage.setItem('vi_declined_demo', 'true'); if (seed) for (const k in seed) localStorage.setItem(k, seed[k]); }, seed || null);
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
  ok(/Beta Terms/.test(card) && /Privacy Notice/.test(card) && /accept the Beta Terms/.test(card) && !/agree to the .*Privacy/.test(card), 'sign-in card: accept the Terms, and the Privacy Notice is information rather than something to agree to');
  await page.evaluate(() => document.querySelector('#auth-email-step a[onclick*="showPrivacy"]').click()); await page.waitForTimeout(200);
  let legal = await page.evaluate(() => (document.getElementById('legal-modal') || {}).innerText || '');
  ok(/not end-to-end encrypted/i.test(legal), 'privacy notice says plainly that it is NOT end-to-end encrypted');
  ok(/Supabase/.test(legal) && /Resend/.test(legal) && /GitHub/.test(legal) && /Anthropic/.test(legal) && /Yahoo/.test(legal) && /Meshy/.test(legal), 'privacy notice names every third party that handles data');
  ok(/Frankfurt/.test(legal) && /pete@ptlive\.design/.test(legal) && /ico\.org\.uk/.test(legal), 'privacy notice has the EU location, a contact and the ICO route');
  ok(/Download my data/.test(legal) && /Delete my account/.test(legal) && /one month/.test(legal), 'privacy notice points to the in-app export / delete and the one-month reply');
  ok(!/only in your browser.s local storage|never leaves your device|We have no access to it/i.test(legal), 'the old (now false) “it never leaves your device” claim is gone');
  // every outside company the app or its server functions talk to must be in the notice (so a new one cannot slip in silently)
  const fsx = require('fs'), lg = legal;
  const hostsOf = (txt) => [...new Set([...txt.matchAll(/https?:\/\/([A-Za-z0-9.-]+\.[a-z]{2,})/g)].map(m => m[1]))];
  const COVERED = { 'logo.clearbit.com': /Clearbit/, 'www.google.com': /Google/, 'cdn.jsdelivr.net': /jsDelivr/, 'cdnjs.cloudflare.com': /cdnjs/, 'loremflickr.com': /loremflickr/, 'open.er-api.com': /ExchangeRate-API/, 'api.coingecko.com': /CoinGecko/,
    'api.metals.live': /metals\.live/, 'fonts.googleapis.com': /Google Fonts/, 'api.anthropic.com': /Anthropic/, 'www.alphavantage.co': /Alpha Vantage/, 'metals-api.com': /metals-api\.com/, 'buy.stripe.com': /Stripe/, 'legpubblzgknxdtvsant.supabase.co': /Supabase/, 'fetapit.github.io': /GitHub/,
    'api.resend.com': /Resend/, 'query1.finance.yahoo.com': /Yahoo/, 'query2.finance.yahoo.com': /Yahoo/, 'api.meshy.ai': /Meshy/, 'esm.sh': /Supabase/, 'challenges.cloudflare.com': /Turnstile/ };
  const NOT_USED_FOR_TESTERS = ['www.w3.org', 'vault-it.uk', 'vault-it.co', 'app.vault-it.co', 'wa.me', 'www.linkedin.com', 'instagram.com', 'ptlive.my.canva.site', 'shibariumscan.io', 'corsproxy.io', 'api.notion.com', 'api.convertkit.com', 'www.shibrpc.com', 'auth.truelayer.com'];   // links, or owner-only connections that do nothing without keys (the notice says so)
  const found = hostsOf(fsx.readFileSync('/home/user/Vault-It/index.html', 'utf8')).concat(...fsx.readdirSync('/home/user/Vault-It/supabase/functions').filter(d => fsx.existsSync('/home/user/Vault-It/supabase/functions/' + d + '/index.ts')).map(d => hostsOf(fsx.readFileSync('/home/user/Vault-It/supabase/functions/' + d + '/index.ts', 'utf8'))));
  const unlisted = [...new Set(found)].filter(h => !COVERED[h] && !NOT_USED_FOR_TESTERS.includes(h));
  ok(unlisted.length === 0, 'no outside host is missing from this check' + (unlisted.length ? ' — NEW: ' + unlisted.join(', ') + ' (add it to the privacy notice, then to COVERED)' : ''));
  const missing = Object.keys(COVERED).filter(h => !COVERED[h].test(lg)); ok(missing.length === 0, 'the privacy notice names every outside company in use' + (missing.length ? ' — missing: ' + missing.join(', ') : ''));
  ok(/owner-only connections/.test(lg), 'the notice says what the owner-only connections are');
  ok(/180 days/.test(lg) && /Waitlist/.test(lg) && /phone number/.test(lg) && /clients or leads/.test(lg) && /withdraw consent/.test(lg) && /Anthropic[^.]*keep it for a limited period/.test(lg.replace(/\n/g, ' ')), 'the notice covers retention, the waitlist, phone number, other people’s details, withdrawal of consent and Anthropic’s retention');
  ok(/Your browser keeps just a marker that a PIN is set/.test(lg), 'the notice describes the PIN as it is really stored on the device');
  await page.screenshot({ path: SHOT + 'beta_privacy.png' });
  await page.evaluate(() => document.getElementById('legal-modal').remove());
  await page.evaluate(() => showTerms()); legal = await page.evaluate(() => document.getElementById('legal-modal').innerText);
  ok(/not financial/i.test(legal) && /Financial Conduct Authority/.test(legal) && /England and Wales/.test(legal) && /beta/i.test(legal), 'terms: beta, not advice, not FCA-regulated, English law');
  ok(/Paid plans/.test(legal) && /Stripe/.test(legal) && /cancel/.test(legal) && /what you paid us/.test(legal), 'terms cover the paid plans (price shown first, Stripe, cancelling, consumer rights, liability for payers)');
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
  r = await tryDelete(`({data:null,error:{message:'down'}})`, '111111'); ok(/did not get an answer/.test(r.msg) && r.kept && !r.done, 'no answer → says it cannot tell whether anything was deleted, and nothing local is wiped');
  r = await tryDelete(`fnErr(500,{error:'partial'})`, '111111'); ok(/data has been erased.*Delete everything again/.test(r.msg) && r.kept, 'partial failure on the server → the message says what really happened: “' + r.msg + '”');
  r = await tryDelete(`fnErr(401,{error:'auth'})`, '111111'); ok(/already been deleted/.test(r.msg) && r.kept, 'expired sign-in → “' + r.msg + '”');
  ok(r.body.action === 'delete' && r.body.pin === '111111', 'the PIN is sent with the delete request');
  // success: photos exist in IndexedDB, then everything must go and the page must restart so nothing can write it back
  await page.evaluate(() => invPut(7, ['data:image/png;base64,AAAA']));
  ok(await page.evaluate(() => invGet(7).then(f => f.length)) === 1, 'setup: a Wealth Inventory photo is stored in the browser');
  await page.evaluate(s => { _delBusy = false; _m.script['pin-auth:delete'] = { data: { ok: true }, error: null }; }, '');
  await page.fill('#del-pin', '482915');
  await page.evaluate(() => { confirmDeleteAccount(); });
  await page.waitForSelector('#delete-done', { timeout: 15000 }); await page.waitForTimeout(600);
  const after = await page.evaluate(async () => ({ keys: Object.keys(localStorage).filter(k => k !== 'setItem').length, deleted: window._viDeleted === true, text: document.getElementById('delete-done').innerText, dbs: indexedDB.databases ? (await indexedDB.databases()).map(d => d.name) : null, url: location.href }));
  ok(after.keys === 0, 'every local key removed (' + after.keys + ' left)');
  ok(after.dbs === null || (!after.dbs.includes('vi_photos') && !after.dbs.includes('vaultit-house')), 'photos and saved house designs are gone from the browser (databases: ' + JSON.stringify(after.dbs) + ')');
  ok(after.deleted && !/deleted=1/.test(after.url), 'the page restarted in a locked "deleted" state and tidied its address');
  ok(/has been deleted/.test(after.text) && /photos/.test(after.text), 'user sees: “' + after.text.split('\n')[0] + '” (mentions photos and provider backups)');
  await page.evaluate(() => { try { localStorage.setItem('pos_ov1', '{"x":1}'); localStorage.setItem('vi_user', '{"name":"x"}'); } catch (e) {} });
  ok(await page.evaluate(() => localStorage.getItem('pos_ov1') === null && localStorage.getItem('vi_user') === null), 'nothing can write data back after deletion (even a late save or sync)');
  await page.screenshot({ path: SHOT + 'beta_deleted.png' });
  await page.click('#delete-done button'); await page.waitForTimeout(1200);
  ok(await page.evaluate(() => !document.getElementById('delete-done') && window._viDeleted !== true && localStorage.getItem('vi_demo_mode') === 'true' && !/pete@example\.com/.test(localStorage.getItem('vi_user') || '')), 'Close starts a normal first-visit app (sample data, nothing of the deleted account)');
  ok(page.errs.length === 0, 'no page errors ' + page.errs.slice(0, 2).join(' | '));
  await ctx.close();

  // late async writers are blocked even before the restart
  ({ ctx, page } = await fresh(b, seed));
  await page.evaluate(() => { window._viDeleted = true; _supaUser = { id: 'u-1', email: 'pete@example.com' }; _syncReady = true; window.__up = 0; _supaClient.from = () => ({ upsert: () => { window.__up++; return Promise.resolve({}); }, select: () => ({ eq: () => Promise.resolve({ data: [{ key: 'pos_ov1', value: { income: [{ n: 'Back', amount: 1 }] }, updated_at: new Date().toISOString() }] }) }) }); localStorage.removeItem('pos_ov1'); });
  await page.evaluate(async () => { await _hydrateFromSupabase('u-1'); localStorage.setItem('vi_dirty', '["pos_ov1"]'); await _flushDirty(); await _upsertRows([{ user_id: 'u-1', key: 'pos_ov1', value: {} }]); });
  ok(await page.evaluate(() => localStorage.getItem('pos_ov1') === null && window.__up === 0), 'after deletion a late hydrate / flush / upload changes nothing and sends nothing');
  await ctx.close();

  // ── 6. not signed in: cannot delete ──
  ({ ctx, page } = await fresh(b, seed));
  await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await page.evaluate(() => { _supaUser = null; openDeleteAccount(); }); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.getElementById('delete-modal')), 'without an account session there is nothing to delete (asked to sign in instead)');
  await ctx.close();

  // ── 7. PINs: weak ones refused, credential changes ask for the current PIN ──
  const seedP = { vi_user: JSON.stringify({ name: 'Pete', email: 'pete@example.com' }), vi_last_email: 'pete@example.com' };
  ({ ctx, page } = await fresh(b, seedP));
  await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  const toast = () => page.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
  const enter = async (digits) => { for (const d of digits) await page.evaluate(d => _setPinKey(d), d); await page.waitForTimeout(550); };
  const toSetStep = () => page.evaluate(() => { _supaUser = { id: 'u-1', email: 'pete@example.com' }; _authOTP = { email: 'pete@example.com' }; _pinChange = true; _pinChangeCurrent = ''; _pinBusy = false; _pinSetBuf = ''; _pinSetFirst = ''; _pinSetPhase = 'enter'; _showAuthStep('setpin'); });
  await toSetStep(); await enter('123456');
  ok(/too easy to guess/.test(await err(page)) && await page.evaluate(() => _pinSetPhase) === 'enter' && !(await page.evaluate(() => _m.calls.some(c => c.body.action === 'set'))), 'a weak PIN (123456) is refused on the device before anything is sent');
  for (const w of ['000000', '654321', '121212']) { await toSetStep(); await enter(w); if (!/too easy/.test(await err(page))) ok(false, 'weak PIN not refused: ' + w); }
  await toSetStep(); await page.evaluate(() => { _m.script['pin-auth:set'] = { data: null, error: { context: { json: async () => ({ error: 'pin_weak' }), status: 400 } } }; });
  await enter('482915'); await enter('482915');
  ok(/too easy to guess/.test(await err(page)) && await step(page) === 'auth-setpin-step' && !(await page.evaluate(() => localStorage.getItem('vi_pin_hash'))), 'if the server refuses a PIN as weak, the user stays to choose another and no PIN is saved locally');
  await toSetStep(); await page.evaluate(() => { _m.script['pin-auth:set'] = { data: null, error: { context: { json: async () => ({ error: 'reauth' }), status: 403 } } }; });
  await enter('482915'); await enter('482915');
  ok(/current PIN/.test(await toast()) && !(await page.evaluate(() => localStorage.getItem('vi_pin_hash'))), 'if the server wants re-authentication, the user is told and the local PIN is NOT changed: “' + await toast() + '”');
  await toSetStep(); await page.evaluate(() => { _m.script['pin-auth:set'] = { data: { ok: true }, error: null }; _m.calls.length = 0; });
  await enter('482915'); await enter('482915');
  const setCall = await page.evaluate(() => _m.calls.find(c => c.name === 'pin-auth' && c.body.action === 'set'));
  ok(setCall && setCall.body.pin === '482915' && setCall.body.current === '', 'a good PIN is sent (no current PIN needed right after signing in)');
  ok(await page.evaluate(() => !!localStorage.getItem('vi_pin_hash')), '…and remembered on this device');
  // changing an existing PIN: ask for the current one first
  await page.evaluate(() => { _supaUser = { id: 'u-1', email: 'pete@example.com' }; _m.script['pin-auth:status'] = { data: { pin: true }, error: null }; _m.calls.length = 0; _pinChangeCurrent = ''; window.__c = authChangePin(); });
  await page.waitForSelector('#askpin-modal', { timeout: 3000 });
  await page.screenshot({ path: SHOT + 'beta_askpin.png' });
  await page.click('#askpin-no'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.getElementById('askpin-modal') && _pinChange !== true) , 'cancelling the current-PIN prompt changes nothing');
  await page.evaluate(() => { window.__c = authChangePin(); }); await page.waitForSelector('#askpin-modal');
  await page.fill('#askpin-inp', '731942'); await page.click('#askpin-ok'); await page.waitForTimeout(300);
  ok(await step(page) === 'auth-setpin-step' && await page.evaluate(() => _pinChangeCurrent) === '731942', 'with the current PIN entered, the new-PIN pad opens');
  await enter('264813'); await enter('264813');
  const chg = await page.evaluate(() => _m.calls.filter(c => c.name === 'pin-auth' && c.body.action === 'set').pop());
  ok(chg && chg.body.current === '731942' && chg.body.pin === '264813', 'the current PIN travels with the change request');
  // removing: asks, and a refusal leaves everything as it was
  await page.evaluate(() => { window.confirm = () => true; _m.script['pin-auth:remove'] = { data: null, error: { context: { json: async () => ({ error: 'invalid', remaining: 3 }), status: 401 } } }; localStorage.setItem('vi_pin_hash', 'abc'); window.__r = authRemovePin(); });
  await page.waitForSelector('#askpin-modal'); await page.fill('#askpin-inp', '000000'); await page.click('#askpin-ok'); await page.waitForTimeout(500);
  ok(/3 attempts left/.test(await toast()) && await page.evaluate(() => localStorage.getItem('vi_pin_hash')) === 'abc', 'a wrong current PIN refuses the removal and keeps the local PIN: “' + await toast() + '”');
  ok(page.errs.length === 0, 'no page errors ' + page.errs.slice(0, 2).join(' | '));
  await ctx.close();

  // ── 8. a different person signing in on a shared device ──
  const seedA = { vi_user: JSON.stringify({ name: 'Alice', email: 'alice@example.com', phone: '07000' }), vi_last_email: 'alice@example.com', pos_ov1: JSON.stringify({ income: [{ n: 'Pay', amount: 3000 }], expenses: [] }), meshy_api_key: 'msy_alice', 'sb-legpubblzgknxdtvsant-auth-token': JSON.stringify({ access_token: 'bob.jwt' }), vi_dirty: '["pos_ov1"]' };
  ({ ctx, page } = await fresh(b, seedA));
  await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await page.evaluate(() => { window.confirm = (m) => { window.__cm = m; return false; }; });
  await page.evaluate(() => _afterVerified({ id: 'u-b', email: 'bob@example.com' }, 'bob@example.com')); await page.waitForTimeout(300);
  const cm = await page.evaluate(() => window.__cm);
  ok(/alice@example\.com/.test(cm) && /bob@example\.com/.test(cm) && /never uploaded/.test(cm), 'a different e-mail on a device with someone else\'s data → asks first, and warns about un-uploaded changes');
  ok(await page.evaluate(() => !!localStorage.getItem('pos_ov1') && _supaUser === null) && await step(page) === 'auth-email-step', 'Cancel keeps the data and signs the newcomer out again');
  await page.evaluate(() => { window.confirm = () => { throw new Error('should not ask'); }; });
  await page.evaluate(() => { _supaClient.from = () => ({ select: () => ({ eq: () => Promise.resolve({ data: [] }) }), upsert: () => Promise.resolve({}) }); });
  await page.evaluate(() => _afterVerified({ id: 'u-a', email: 'Alice@Example.com' }, 'Alice@Example.com')); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!localStorage.getItem('pos_ov1')), 'the same person (any capitalisation) signs in with no prompt and keeps their data');
  await page.evaluate(() => { window.confirm = () => true; });
  await Promise.all([page.waitForNavigation({ timeout: 15000 }), page.evaluate(() => { _afterVerified({ id: 'u-b', email: 'bob@example.com' }, 'bob@example.com'); })]);
  await page.waitForTimeout(800);
  const sw = await page.evaluate(() => ({ ov: localStorage.getItem('pos_ov1'), user: localStorage.getItem('vi_user'), key: localStorage.getItem('meshy_api_key'), sb: !!localStorage.getItem('sb-legpubblzgknxdtvsant-auth-token'), last: localStorage.getItem('vi_last_email') }));
  ok(!/"n":"Pay"/.test(sw.ov || '') && sw.key === null && !/Alice|07000/.test(sw.user || '') && sw.sb && sw.last === 'bob@example.com', 'confirming removes the previous person\'s data and API keys, keeps the new sign-in, and starts clean');
  await ctx.close();

  // ── 9. requests that cost something are never sent twice ──
  ({ ctx, page } = await fresh(b, seedP));
  await page.evaluate(() => { window.__calls = 0; window.__f = 0; _sjsStalled = false; _supaClient.functions.invoke = () => { window.__calls++; return new Promise(() => {}); }; window.fetch = () => { window.__f++; return Promise.reject(new Error('net')); }; });
  const once = await page.evaluate(() => _fnInvoke('pin-auth', { action: 'delete' }, 300, false, true));
  ok(once.error && once.error.message === 'timeout' && await page.evaluate(() => window.__calls === 1 && window.__f === 0), 'a once-only call that times out is reported, not re-sent');
  await page.evaluate(() => { _sjsStalled = false; });
  await page.evaluate(() => _fnInvoke('pin-auth', { action: 'status' }, 300, false, false));
  ok(await page.evaluate(() => window.__calls === 2 && window.__f === 1), 'ordinary calls still fall back to a direct request');
  await ctx.close();

  // ── 10. export: allow-list, other people's data, and dialog feedback ──
  const seedE = { vi_user: JSON.stringify({ name: 'Pete', email: 'pete@example.com' }), vi_last_email: 'pete@example.com', pos_ov1: '{"income":[]}', vi_hb_design: '{"id":1}', vi_tl_auth_code: 'AUTHCODE', vi_tl_code_verifier: 'VERIFIER', vi_tl_state: 'STATE', some_random_thing: 'zzz', vi_conn_x_secret: 'S', vi_bak_pos_ov1: '{"at":1,"value":"{}"}' };
  ({ ctx, page } = await fresh(b, seedE));
  await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  await page.evaluate(() => { _supaUser = { id: 'u-1', email: 'pete@example.com' }; });
  let eb = await page.evaluate(() => buildMyDataBundle());
  ok(eb.onThisDevice.pos_ov1 && eb.onThisDevice.vi_hb_design && eb.onThisDevice.vi_bak_pos_ov1, 'export lists the user data keys (and earlier saved copies)');
  ok(!('vi_tl_auth_code' in eb.onThisDevice) && !('vi_tl_code_verifier' in eb.onThisDevice) && !('vi_tl_state' in eb.onThisDevice) && !('some_random_thing' in eb.onThisDevice) && !('vi_conn_x_secret' in eb.onThisDevice), 'OAuth codes/verifiers and unknown keys are not exported (allow-list)');
  ok(/Wealth Inventory photos/.test(eb.note) && /200 saved versions/.test(eb.note), 'the file says what it does not contain');
  await page.evaluate(() => { _supaUser = { id: 'u-9', email: 'someone.else@example.com' }; });
  eb = await page.evaluate(() => buildMyDataBundle());
  ok(Object.keys(eb.onThisDevice).length === 0 && /different sign-in/.test(eb.problems.join()), 'data on the device that belongs to someone else is not put in your file');
  await page.evaluate(() => { _supaUser = { id: 'u-1', email: 'pete@example.com' }; _supaClient.from = () => { throw new Error('offline'); }; openDeleteAccount(); });
  await page.waitForSelector('#delete-modal'); await page.click('#del-export'); await page.waitForTimeout(1200);
  const stt = await page.evaluate(() => document.getElementById('del-status').textContent);
  ok(/⚠ Downloaded, but/.test(stt) && /offline/.test(stt), 'in the delete dialog an incomplete export is flagged right there: “' + stt.slice(0, 90) + '”');
  ok(await page.evaluate(() => !document.getElementById('del-export').disabled), 'the export button is usable again afterwards');
  ok(await page.evaluate(() => parseInt(getComputedStyle(document.getElementById('toast')).zIndex, 10) > 20003), 'toasts now sit above every dialog');
  await ctx.close();

  // ── 11. smaller promises ──
  ({ ctx, page } = await fresh(b, seedP));
  await page.addStyleTag({ content: '#welcome-overlay,#login-overlay{display:none!important}' });
  // the PIN is never derived into the browser when it lives on the server
  await page.evaluate(() => { _supaUser = { id: 'u-1', email: 'pete@example.com' }; _authOTP = { email: 'pete@example.com' }; _pinChange = true; _pinSetBuf = ''; _pinSetFirst = ''; _pinSetPhase = 'enter'; _showAuthStep('setpin'); _m.script['pin-auth:set'] = { data: { ok: true }, error: null }; });
  for (let k = 0; k < 2; k++) { for (const d of '482915') await page.evaluate(d => _setPinKey(d), d); await page.waitForTimeout(550); }
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => localStorage.getItem('vi_pin_hash')) === 'srv', 'a PIN kept on the server leaves only a marker in the browser (no PIN-derived value to crack)');
  await page.evaluate(() => { localStorage.removeItem('vi_pin_hash'); _pinChange = true; _pinSetBuf = ''; _pinSetFirst = ''; _pinSetPhase = 'enter'; _showAuthStep('setpin'); _m.script['pin-auth:set'] = { data: null, error: { message: 'down' } }; });
  for (let k = 0; k < 2; k++) { for (const d of '482915') await page.evaluate(d => _setPinKey(d), d); await page.waitForTimeout(550); }
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => localStorage.getItem('vi_pin_hash')) !== 'srv' && !!(await page.evaluate(() => localStorage.getItem('vi_pin_hash'))), 'only if the PIN could not reach the server is a local-only check kept (and the user is told)');
  // a throttled status lookup is not "no PIN"
  await page.evaluate(() => { _m.script['pin-auth:status'] = { data: null, error: { context: { json: async () => ({ error: 'rate_limited', retryAfter: 30 }), status: 429 } } }; });
  const stl = await page.evaluate(() => _pinStatus('pete@example.com'));
  ok(stl.pin === null && stl.limited === true, 'a rate-limited PIN lookup is reported as throttled (so nobody is invited to overwrite a PIN they already have)');
  // reset warns that earlier versions are kept
  const rc = await page.evaluate(() => { let m = ''; window.confirm = (x) => { m = x; return false; }; resetVaultData(); return m; });
  ok(/Earlier versions stay in Version history & restore for up to 180 days/.test(rc) && !/permanently delete/i.test(rc), 'Reset no longer claims to "permanently delete" — it says earlier versions stay restorable');
  // deep links from the website
  await page.goto('file:///home/user/Vault-It/index.html?privacy=1'); await page.waitForTimeout(2500);
  ok(await page.evaluate(() => /Privacy notice/.test((document.getElementById('legal-modal') || {}).innerText || '')), '?privacy=1 opens the privacy notice (linked from the website sign-up)');
  ok(page.errs.length === 0, 'no page errors ' + page.errs.slice(0, 2).join(' | '));
  await ctx.close();

  // ── 12. Cloudflare Turnstile in front of the sign-in e-mail, and the move from the old address ──
  ({ ctx, page } = await fresh(b));
  ok(await page.evaluate(() => VI_TURNSTILE_SITEKEY === '' && getComputedStyle(document.getElementById('auth-captcha')).display === 'none'), 'no site key → no widget (sign-in works exactly as before)');
  await page.evaluate(() => { window.VI_TURNSTILE_SITEKEY = '1x00000000000000000000AA'; window.__reset = 0; window.turnstile = { render: (sel, o) => { window.__ts = o; window.__sel = sel; return 'w1'; }, reset: () => { window.__reset++; } }; _showAuthStep('email'); });
  ok(await page.evaluate(() => window.__ts && window.__ts.sitekey === '1x00000000000000000000AA' && window.__sel === '#auth-captcha' && getComputedStyle(document.getElementById('auth-captcha')).display === 'block'), 'with a site key the widget is drawn in the sign-in card');
  await page.fill('#auth-email', 'pete@example.com'); await page.evaluate(() => { _m.calls.length = 0; });
  await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(500);
  ok(/security check/.test(await err(page)) && !(await page.evaluate(() => _m.calls.some(c => c.name === 'send-auth-email'))), 'no e-mail is requested until the check has passed');
  await page.evaluate(() => window.__ts.callback('tok-1')); await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(700);
  const sendCall = await page.evaluate(() => _m.calls.find(c => c.name === 'send-auth-email'));
  ok(sendCall && sendCall.body.captchaToken === 'tok-1' && sendCall.body.email === 'pete@example.com', 'the token travels with the request');
  ok(await page.evaluate(() => window.__reset >= 1 && _captchaToken === ''), 'the widget is reset and the used token forgotten (one use only)');
  await page.evaluate(() => { _showAuthStep('email'); window.__ts.callback('tok-2'); window.__ts['expired-callback'](); });
  ok(await page.evaluate(() => _captchaToken === ''), 'an expired token is dropped');
  await page.evaluate(() => { window.__ts.callback('tok-3'); _m.script['send-auth-email'] = { data: null, error: { context: { json: async () => ({ error: 'captcha' }), status: 403 } } }; _m.otp = 0; });
  await page.click('#auth-email-step .auth-btn'); await page.waitForTimeout(700);
  ok(/did not pass/.test(await err(page)) && await page.evaluate(() => _m.otp) === 0 && await step(page) === 'auth-email-step', 'a failed check is explained and is NOT worked around with the built-in sender');
  await page.evaluate(() => { _showAuthStep('setpin'); });
  ok(await page.evaluate(() => getComputedStyle(document.getElementById('auth-captcha')).display === 'none'), 'the widget is hidden on the PIN-setting step');
  // the old GitHub address says the app has moved
  const moved = await page.evaluate(() => ({ other: viMovedBanner('app.vault-it.co'), none: !document.getElementById('moved-banner'), shown: viMovedBanner('fetapit.github.io'), link: (document.querySelector('#moved-banner a') || {}).href, txt: (document.getElementById('moved-banner') || {}).innerText || '' }));
  ok(moved.other === false && moved.none && moved.shown === true && moved.link === 'https://app.vault-it.co/' && /Upload everything/.test(moved.txt), 'the old address shows a "moved" banner with the new link and the back-up reminder; the new address does not');
  await page.evaluate(() => document.querySelector('#moved-banner span[aria-label=Dismiss]').click());
  ok(await page.evaluate(() => !document.getElementById('moved-banner') && viMovedBanner('fetapit.github.io') === false), 'it can be dismissed for the session');
  ok(page.errs.length === 0, 'no page errors ' + page.errs.slice(0, 2).join(' | '));
  await ctx.close(); await b.close();
  console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
