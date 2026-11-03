// v0.9.1 chunk G (owner, 3 Nov): house builder milestones earn Wealth Roadmap XP (E9) and the deposit can name its account (E26).
//  E9  "these milestones should link into the gamification wealth roadmap. So add XP and stuff."
//      Ten milestones, XP 20 rising to 200, 300 for "Keys are yours"; paid once each into the Roadmap's own XP (achState.wr.h),
//      latched; milestones already passed backfill silently; the XP tile and the Roadmap agree; done rows read "+n XP".
//  E26 "select what type of account they have that money in ... treat it separately to the cash and savings ... the icon for the
//      bank plus the interest rate ... amount invested so the user knows which is the 25% government bonus ... the new bank account"
//      An optional account note on the deposit (state.depAcct). It never changes saved, bricks or Cash and savings; the 25% bonus
//      is a separate estimate, not added to saved; the First Time Buyer ISA is listed as not open yet, with no rate, bonus or date.
// Run: node tests/test_v091_house_xp_deposit.js
const { chromium } = require('playwright'); const routeThree = require('./three_route');
const APP = process.env.VI_APP || (process.env.VI_INDEX ? 'file://' + process.env.VI_INDEX : 'file:///home/user/Vault-It/index.html');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const SEED = (o) => {
  localStorage.setItem('vi_declined_demo', 'true');
  localStorage.setItem('vi_session', JSON.stringify({ email: 't@t.com', expiry: Date.now() + 1e10 }));
  if (localStorage.getItem('g091')) return; localStorage.setItem('g091', '1');
  // semi at £320,000, 20% deposit = £64,000; £16,000 saved = 25%: milestones 1, 5 and 15 are passed, 30 is next
  localStorage.setItem('ht3', JSON.stringify(Object.assign({ saved: 16000, target: 320000, houseType: 'semi', depositPct: 20,
    prices: { terraced: 200000, semi: 320000, detached: 500000, mansion: 1500000, flat: 80000, apartment: 300000 }, deposits: [{ amount: 16000, date: '30/10/2026' }] }, o || {})));
};
const HIDE = '#welcome-overlay,#login-overlay,#pro-offer-modal,#sync-banner,#trial-banner,#tester-welcome{display:none!important}';
async function open(b, w, o) {
  const mob = w < 700, ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: mob, hasTouch: mob });
  await routeThree(ctx); await ctx.route(/open\.er-api\.com|google\.com\/s2/, r => r.abort());
  const p = await ctx.newPage(); p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.addInitScript(HDEF); await p.addInitScript(SEED, o || null); await p.goto(APP); await p.waitForTimeout(1500); await p.addStyleTag({ content: HIDE });
  await p.evaluate(() => { try { setSetting('view', 'adv'); } catch (e) {} showTab('house'); }); await p.waitForTimeout(600);
  await p.waitForFunction(() => /Each brick ≈/.test((document.getElementById('hb-hud') || {}).innerText || ''), null, { timeout: 30000 }).catch(() => {});
  return p;
}
// the house milestone XP held in the Roadmap's store, as a page helper
const HDEF = () => { window.H = () => { const w = (achState.wr || {}).h || null, s = w ? Object.values(w).reduce((a, b) => a + b, 0) : 0; return { h: w, sum: s }; }; };

(async () => {
  const b = await chromium.launch();
  let p = await open(b, 1100), r;

  // ── E9: the XP table and the silent backfill ──
  r = await p.evaluate(() => ({ xp: typeof HB_MS_XP !== 'undefined' ? HB_MS_XP.slice() : null, toast: document.getElementById('toast').classList.contains('show'), toastTxt: document.getElementById('toast').textContent }));
  ok(JSON.stringify(r.xp) === JSON.stringify([20, 40, 60, 80, 100, 125, 150, 175, 200, 300]), 'ten milestone XP values rising 20 to 200, 300 for "Keys are yours" (' + r.xp + ')');
  r = Object.assign(r, await p.evaluate(() => H()));
  ok(r.h && r.h['1'] === 20 && r.h['5'] === 40 && r.h['15'] === 60 && !r.h['30'] && r.sum === 120, 'milestones already passed are paid into the Roadmap XP (1, 5, 15 = 120 XP): ' + JSON.stringify(r.h));
  ok(!r.toast || !/^\+[\d,]+ XP · /.test(r.toastTxt), 'the backfill is silent: no house XP toast on the opening build (' + r.toastTxt + ')');   // badge toasts ("Badge unlocked: ... +100 XP") are not ours
  r = await p.evaluate(() => {
    const tg = id => { const e = document.querySelector('#ms' + id + ' .ms-tg'); return e ? { t: e.textContent, vis: getComputedStyle(e).display !== 'none' } : null; };
    return { tile: (document.getElementById('stXP') || {}).textContent || '', total: wrTotalXp(), d1: tg('1'), d15: tg('15'), n30: tg('30'), l50: tg('50'),
      split: (() => { renderAchievements(); const s = document.querySelector('#wr-rank .wr-split'); return s ? s.textContent : ''; })(), src: wrSourceSplit() };
  });
  ok(r.tile === r.total.toLocaleString('en-GB'), 'the House XP tile shows the Roadmap XP total (' + r.tile + ' vs ' + r.total + ')');
  ok(r.d1 && r.d1.vis && r.d1.t === '+20 XP' && r.d15 && r.d15.t === '+60 XP', 'done rows read "+n XP" (' + JSON.stringify([r.d1, r.d15]) + ')');
  ok(r.n30 && /to go/.test(r.n30.t) && /\+80 XP/.test(r.n30.t), 'the next row keeps "£x to go" and shows the XP it pays (' + (r.n30 && r.n30.t) + ')');
  ok(r.l50 && (!r.l50.vis || r.l50.t === ''), 'later rows stay quiet');
  ok(/House milestones\s*120/.test(r.split), 'the Roadmap XP split names the house milestones (' + r.split + ')');
  ok(r.src.steps + r.src.quests + r.src.badges + r.src.house === r.total, 'the split adds up to the total (' + JSON.stringify(r.src) + ' = ' + r.total + ')');

  // ── E9: crossing 30% by a deposit pays 80 XP once, with one toast, and changes no money ──
  await p.click('#savingsInput'); await p.fill('#savingsInput', '3300');
  const pre = await p.evaluate(() => ({ saved: state.saved, n: state.deposits.length, h: H().sum }));
  await p.click('#btnAdd');
  await p.waitForFunction(() => /\+80 XP/.test(document.getElementById('toast').textContent) && document.getElementById('toast').classList.contains('show'), null, { timeout: 9000 }).catch(() => {});
  r = await p.evaluate(() => ({ saved: state.saved, n: state.deposits.length, h: H(), toast: document.getElementById('toast').textContent, tile: (document.getElementById('stXP') || {}).textContent, total: wrTotalXp(), d30: (document.querySelector('#ms30 .ms-tg') || {}).textContent }));
  ok(Math.abs(r.saved - (pre.saved + 3300)) < 0.005 && r.n === pre.n + 1, 'the deposit itself is saved as before (£' + r.saved + ', ' + r.n + ' deposits)');
  ok(r.h.h['30'] === 80 && r.h.sum === pre.h + 80, 'crossing 30% pays 80 XP (' + pre.h + ' to ' + r.h.sum + ')');
  ok(/\+80 XP · /.test(r.toast), 'one toast names the XP and the milestone (' + r.toast + ')');
  ok(r.tile === r.total.toLocaleString('en-GB') && r.d30 === '+80 XP', 'the tile and the row update at once (' + r.tile + ', ' + r.d30 + ')');
  await p.evaluate(() => { updateUI(); updateUI(); hbRenderHUD(); });
  ok(await p.evaluate(() => H().sum) === pre.h + 80, 'redraws never pay twice');

  // ── E9: reload, all ten, latched ──
  // under heavy load Chromium can drop a file:// page's storage across a reload (rollout-qc traced it: the page starts with
  // localStorage empty, the app clears nothing). Restore this snapshot only in that case, so the checks below test the app, not the harness.
  const snap = await p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  await p.addInitScript(sn => { if (localStorage.getItem('pos_ach1') === null) { for (const k in sn) localStorage.setItem(k, sn[k]); window._snapRestored = true; } }, snap);
  await p.reload(); await p.waitForTimeout(1500);
  if (await p.evaluate(() => !!window._snapRestored)) console.log('note: the browser dropped storage on reload; snapshot restored'); await p.addStyleTag({ content: HIDE }); await p.evaluate(() => showTab('house')); await p.waitForTimeout(500);
  const stored = await p.evaluate(() => { const a = JSON.parse(localStorage.getItem(ACH_KEY) || '{}'); return a.wr && a.wr.h; });
  ok(stored && stored['30'] === 80, 'the 30% XP is in the saved copy after the reload (' + JSON.stringify(stored) + ')');
  await p.waitForFunction(() => document.getElementById('stXP'), null, { timeout: 30000 }).catch(() => {});
  r = await p.evaluate(() => H()); ok(r.sum === 200 && r.h['30'] === 80, 'a reload keeps the XP and pays nothing again (' + r.sum + ')');
  r = await p.evaluate(() => { state.saved = 64000; save(); updateUI(); const a = H(); state.saved = 0; save(); updateUI(); const z = H(); state.saved = 19300; save(); updateUI(); return { a, z }; });
  ok(r.a.sum === 1250 && Object.keys(r.a.h).length === 10, 'all ten milestones pay 1,250 XP in all (' + r.a.sum + ')');
  ok(r.z.sum === 1250, 'XP is latched: a lower saved figure never takes it back (' + r.z.sum + ')');
  r = await p.evaluate(() => { achState.wr.h = { '1': 20 }; const t = document.getElementById('toast'); t.classList.remove('show'); window._viActed = true; state.saved = 64000; updateUI(); return 1; });
  await p.waitForTimeout(700);
  r = await p.evaluate(() => document.getElementById('toast').textContent);
  ok(/\+1,230 XP · 9 milestones/.test(r), 'several milestones at once make one toast, not a flood (' + r + ')');
  await p.evaluate(() => { state.saved = 19300; save(); updateUI(); });
  await p.context().close();

  // ── E26: no account = exactly today ──
  p = await open(b, 1100, { saved: 16000 });
  r = await p.evaluate(() => ({ acct: state.depAcct, raw: JSON.parse(localStorage.getItem('ht3')), chip: !!document.getElementById('hb-dacct'), btn: (document.querySelector('#hb-dacct button') || {}).textContent || '' }));
  ok(r.acct === undefined && !('depAcct' in r.raw), 'an old save loads unchanged (no account written)');
  ok(r.chip && /account/i.test(r.btn), 'the Level 1 tile offers to note the deposit account (' + r.btn + ')');
  const base = await p.evaluate(() => ({ saved: state.saved, per: hbBrickInfo().perBrick, bricks: document.getElementById('stBricks').textContent, n: state.deposits.length, cash: JSON.stringify(alState.cashAccounts || []), nw: computeNetWorth(), savedTxt: document.getElementById('savedAmt').textContent }));

  // the account form: types, the First Time Buyer ISA not open yet, the FCA line
  await p.evaluate(() => hbOpenDepAcct()); await p.waitForTimeout(200);
  r = await p.evaluate(() => {
    const s = document.getElementById('hbd-type'), o = s ? [...s.options].map(x => ({ v: x.value, t: x.textContent, d: x.disabled })) : [];
    return { o, fca: /Not regulated by the FCA\. Not financial advice\./.test((document.getElementById('hbd-ov') || {}).textContent || '') };
  });
  const ty = r.o.map(x => x.v);
  ok(['lisa_cash', 'lisa_ss', 'cash_isa', 'ss_isa', 'savings', 'linked', 'ftb_isa'].every(v => ty.includes(v)), 'account types listed (' + ty.join(', ') + ')');
  const ftb = r.o.find(x => x.v === 'ftb_isa') || {};
  ok(ftb.d && /First Time Buyer ISA/.test(ftb.t) && /not open yet/.test(ftb.t) && !/\d|%|£/.test(ftb.t), 'the First Time Buyer ISA is listed as not open yet, with no rate, bonus or date (' + ftb.t + ')');
  ok(r.fca, 'the FCA line shows in the account form');
  await p.selectOption('#hbd-type', 'lisa_ss'); await p.fill('#hbd-name', 'Moneybox'); await p.fill('#hbd-rate', '3.5'); await p.fill('#hbd-paid', '4000');
  await p.click('#hbd-save'); await p.waitForTimeout(300);
  r = await p.evaluate(() => ({ acct: state.depAcct, saved: state.saved, per: hbBrickInfo().perBrick, bricks: document.getElementById('stBricks').textContent, n: state.deposits.length, cash: JSON.stringify(alState.cashAccounts || []), nw: computeNetWorth(), savedTxt: document.getElementById('savedAmt').textContent,
    chip: (document.getElementById('hb-dacct') || {}).innerText || '', logo: !!document.querySelector('#hb-dacct .cash-logo'), raw: JSON.parse(localStorage.getItem('ht3')).depAcct }));
  ok(r.acct && r.acct.type === 'lisa_ss' && r.acct.name === 'Moneybox' && r.acct.rate === 3.5 && r.acct.paidIn === 4000 && r.raw && r.raw.type === 'lisa_ss', 'the account is saved on the house builder (' + JSON.stringify(r.acct) + ')');
  ok(r.saved === base.saved && r.per === base.per && r.bricks === base.bricks && r.n === base.n && r.savedTxt === base.savedTxt, 'saved, brick value and bricks laid are identical before and after (' + r.saved + ', ' + r.bricks + ')');
  ok(r.cash === base.cash && Math.abs(r.nw - base.nw) < 0.005, 'Cash and savings and net worth are untouched');
  ok(r.logo && /Moneybox/.test(r.chip) && /3\.5% AER/.test(r.chip), 'the tile shows the bank logo, name and rate (' + r.chip.replace(/\s+/g, ' ').slice(0, 120) + ')');
  ok(/Estimated 25% bonus: £1,000/.test(r.chip) && /not added/i.test(r.chip), 'a Lifetime ISA shows the 25% bonus as a separate estimate, not added to saved');
  ok(/£4,000/.test(r.chip) && /£450,000/.test(r.chip) && /25% (withdrawal )?charge/i.test(r.chip), 'the Lifetime ISA rules shown: £4,000 a year, £450,000 price cap, 25% withdrawal charge');

  // a deposit made with the account set carries a note and the log line shows it
  await p.click('#savingsInput'); await p.fill('#savingsInput', '100'); await p.click('#btnAdd'); await p.waitForTimeout(400);
  r = await p.evaluate(() => ({ d: state.deposits[state.deposits.length - 1], saved: state.saved, log: (document.querySelector('#logList .log-entry') || {}).innerHTML || '' }));
  ok(r.d.amount === 100 && r.d.acct && r.d.acct.t === 'lisa_ss' && r.d.acct.n === 'Moneybox' && Math.abs(r.saved - (base.saved + 100)) < 0.005, 'the new deposit carries the account note; saved rises by the deposit only (' + JSON.stringify(r.d) + ')');
  ok(/cash-logo/.test(r.log) && /Moneybox/.test(r.log), 'the log line shows the bank chip');

  // other types: no bonus line; hostile names are escaped
  await p.evaluate(() => { hbOpenDepAcct(); });
  await p.selectOption('#hbd-type', 'cash_isa'); await p.fill('#hbd-name', '<img src=x onerror="window._pwn=1">'); await p.fill('#hbd-rate', ''); await p.fill('#hbd-paid', '');
  await p.click('#hbd-save'); await p.waitForTimeout(300);
  r = await p.evaluate(() => ({ chip: (document.getElementById('hb-dacct') || {}).innerText || '', pwn: !!window._pwn, img: !!document.querySelector('#hb-dacct img[src="x"]'), rate: state.depAcct.rate }));
  ok(!/bonus/i.test(r.chip) && r.rate === undefined, 'a Cash ISA shows no bonus, and a blank rate is stored as none (rate ' + r.rate + ')');
  ok(!r.pwn && !r.img, 'the account name is escaped');
  await p.evaluate(() => hbClearDepAcct()); await p.waitForTimeout(200);
  r = await p.evaluate(() => ({ acct: state.depAcct, saved: state.saved }));
  ok(r.acct === undefined && Math.abs(r.saved - (base.saved + 100)) < 0.005, 'removing the account note leaves the deposit as it is');
  ok(p._errs.length === 0, 'no page errors ' + p._errs.slice(0, 3).join(' | '));
  await p.context().close();

  // ── 390 px: the chip fits, no sideways scroll ──
  p = await open(b, 390, { depAcct: { type: 'lisa_cash', name: 'Nationwide', rate: 4.1, paidIn: 2500 } });
  r = await p.evaluate(() => { const c = document.getElementById('hb-dacct'), R = c ? c.getBoundingClientRect() : null, hud = document.getElementById('hb-hud').getBoundingClientRect();
    const small = []; if (c) c.querySelectorAll('*').forEach(e => { if (!e.children.length && e.textContent.trim() && getComputedStyle(e).display !== 'none') { const f = parseFloat(getComputedStyle(e).fontSize); if (f < 10.5) small.push(f + ':' + e.textContent.trim().slice(0, 16)); } });
    return { has: !!c, fits: R && R.right <= hud.right + 1 && R.left >= hud.left - 1, side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, txt: c ? c.innerText : '', small }; });
  ok(r.has && r.fits && !r.side, '390 px: the account chip fits the tile, no sideways scroll');
  ok(/Estimated 25% bonus: £625/.test(r.txt), '390 px: bonus estimate on £2,500 paid in is £625');
  ok(r.small.length === 0, 'no text under 10.5 px (' + r.small.join(', ') + ')');
  // Pedro (3 Nov): the tile label at 11.5 px, every tap 44 px, the rate kept on one line
  r = await p.evaluate(() => { const c = document.getElementById('hb-dacct'), R = e => e.getBoundingClientRect();
    const hd = parseFloat(getComputedStyle(c.querySelector('.hb-da-hd')).fontSize), ed = R(c.querySelector('.stk-btn')), rate = c.querySelector('.hb-da-rate');
    hbOpenDepAcct(); const o = document.getElementById('hbd-ov'), taps = [...o.querySelectorAll('button,input,select,.hbd-x')].map(e => R(e)).filter(q => q.height < 44 || q.width < 44).length;
    const small = [...o.querySelectorAll('*')].filter(e => !e.children.length && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 11.5).map(e => e.textContent.trim().slice(0, 12));
    hbCloseDepAcct(); return { hd, edit: ed.height >= 44 && ed.width >= 44, rate: rate ? rate.getClientRects().length : 0, taps, small }; });
  ok(r.hd >= 11.5 && r.edit && r.taps === 0 && r.rate === 1, '390 px: label 11.5 px, every tap at least 44 px, the rate on one line (' + JSON.stringify(r) + ')');
  ok(r.small.length === 0, '390 px: the account form has no text under 11.5 px (' + r.small.join(', ') + ')');
  ok(p._errs.length === 0, 'no page errors ' + p._errs.slice(0, 3).join(' | '));
  await p.context().close();

  await b.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
