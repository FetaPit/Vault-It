// The shared toast (#toast) is deterministic (v0.9.1, CI flake in test_hb_brand):
// 1. the opening build is silent: badges the saved data already meets unlock (XP counts) without a toast, as wrSync does for XP;
// 2. showToast() and the house toast() share one hide timer, so an older toast's timer can never hide a newer toast;
// 3. the hide count starts once the toast is drawn, so a long task (a house rebuild) cannot expire it unseen;
// 4. after the user has done something, a new badge still toasts; 5. never over a toast already showing.
// Each check is driven by events and the page's own timers, not by machine speed.
const { chromium } = require('playwright');
const routeThree = require('./three_route');
const INDEX = 'file://' + (process.env.VI_INDEX || '/home/user/Vault-It/index.html');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const o = { saved: 5900, target: 120000, houseType: 'terraced', depositPct: 20, deposits: [{ amount: 5900, date: '01/10/2026' }], prices: { terraced: 120000 } };
const seed = `(function(){if(localStorage.getItem('ht3'))return;localStorage.setItem('vi_declined_demo','true');localStorage.setItem('vi_session',JSON.stringify({email:'t@t.com',expiry:Date.now()+1e10}));localStorage.setItem('vi_user',JSON.stringify({name:'T',email:'t@t.com',pro:true}));localStorage.setItem('vi_pioneer','true');localStorage.setItem('ht3',${JSON.stringify(JSON.stringify(o))});})()`;
const frames = 'new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce' });
  await routeThree(ctx); const p = await ctx.newPage(); p.setDefaultTimeout(120000);
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(seed);
  // every text the toast shows, from the first paint on
  await p.addInitScript(() => { window.__toasts = []; new MutationObserver(() => { const t = document.getElementById('toast'); if (t && t.classList.contains('show') && window.__toasts[window.__toasts.length - 1] !== t.textContent) window.__toasts.push(t.textContent); }).observe(document, { attributes: true, childList: true, characterData: true, subtree: true }); });   // from the first parsed byte: the boot script runs before DOMContentLoaded
  await p.goto(INDEX);
  await p.waitForFunction(() => document.readyState === 'complete' && typeof achState !== 'undefined' && typeof showToast === 'function');
  await p.evaluate(frames);

  // 1. opening build: badges unlock quietly
  let r = await p.evaluate(() => ({ toasts: window.__toasts.slice(), unlocked: (achState.unlocked || []).slice(), xp: achState.xp || 0, acted: !!window._viActed }));
  ok(!r.acted, 'nobody has interacted yet');
  ok(r.unlocked.includes('nw5k') && r.xp > 0, 'badges already met still unlock and count their XP (' + r.unlocked.join(', ') + ', ' + r.xp + ' XP)');
  ok(!r.toasts.some(t => /Badge unlocked/.test(t)), 'the opening build shows no badge toast (' + (r.toasts.join(' | ') || 'none') + ')');

  // 2a. an older showToast timer does not hide a newer house toast
  await p.evaluate(() => { showToast('old', 300); toast('Milestone: 25% Quarter'); });
  await p.evaluate(() => new Promise(r => setTimeout(r, 900)));   // the old toast's 300 ms has long passed; the new one has 3 s
  r = await p.evaluate(() => { const t = document.getElementById('toast'); return { shown: t.classList.contains('show'), text: t.textContent }; });
  ok(r.shown && r.text === 'Milestone: 25% Quarter', 'a newer toast() is not hidden by an older showToast() timer (' + JSON.stringify(r) + ')');

  // 2b. an older house toast timer does not hide a newer showToast
  await p.evaluate(() => { toast('older house toast'); });
  await p.evaluate(frames);   // its 3 s count has started
  await p.evaluate(() => showToast('newer', 8000));
  await p.evaluate(() => new Promise(r => setTimeout(r, 3600)));   // past the older toast's 3 s
  r = await p.evaluate(() => { const t = document.getElementById('toast'); return { shown: t.classList.contains('show'), text: t.textContent }; });
  ok(r.shown && r.text === 'newer', 'a newer showToast() is not hidden by an older toast() timer (' + JSON.stringify(r) + ')');

  // 3. a long task right after the toast does not expire it before it is drawn
  await p.evaluate(() => { showToast('after a long task'); const t0 = performance.now(); while (performance.now() - t0 < 3500) {} });
  await p.evaluate(frames);
  r = await p.evaluate(() => { const t = document.getElementById('toast'); return { shown: t.classList.contains('show'), text: t.textContent }; });
  ok(r.shown && r.text === 'after a long task', 'a 3.5 s long task does not use up the 3 s before the toast is drawn (' + JSON.stringify(r) + ')');
  // and it still goes: the page's own timer hides it (waited on, not slept on)
  const gone = await p.waitForFunction(() => !document.getElementById('toast').classList.contains('show'), null, { timeout: 10000 }).then(() => true).catch(() => false);
  ok(gone, 'the toast still hides itself afterwards');

  // 4. once the user has done something, a new badge still toasts
  await p.mouse.click(5, 5);
  r = await p.evaluate(() => { achState.unlocked = (achState.unlocked || []).filter(id => id !== 'nw5k'); checkAchievements(); const t = document.getElementById('toast'); return { acted: !!window._viActed, shown: t.classList.contains('show'), text: t.textContent, back: achState.unlocked.includes('nw5k') }; });
  ok(r.acted && r.back && r.shown && /^Badge unlocked: .*\+\d+ XP$/.test(r.text), 'after a click, a newly met badge toasts (' + r.text + ')');
  // 5. a badge never replaces a toast already showing (the house milestone after a deposit)
  r = await p.evaluate(() => { toast('Milestone: 25% Quarter'); achState.unlocked = achState.unlocked.filter(id => id !== 'nw5k'); checkAchievements(); const t = document.getElementById('toast'); return { text: t.textContent, back: achState.unlocked.includes('nw5k') }; });
  ok(r.back && r.text === 'Milestone: 25% Quarter', 'a badge met while a toast shows unlocks quietly and leaves the toast alone (' + r.text + ')');

  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
