const { chromium, settle, shot, openModal, HIDE_OVERLAYS, MOBILE } = require('./capture.js');
const REMOVE = () => { ['login-overlay', 'welcome-overlay', 'tester-welcome', 'pro-offer-modal', 'vi-campaign-modal', 'paywall-modal', 'pwa-install-banner', 'trial-banner', 'delete-modal', 'legal-modal', 'vi-help', 'settings-modal', 'nwh-modal'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); }); };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1, colorScheme: 'dark' });
  await ctx.addInitScript(() => { try { localStorage.setItem('vi-theme', 'dark'); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto('https://app.vault-it.co/?demo=alex', { waitUntil: 'load', timeout: 90000 }); await settle(page, 3500);
  await page.evaluate(HIDE_OVERLAYS); await page.evaluate(REMOVE);
  const tabs = [['overview', 'tab-overview'], ['budget', 'tab-budget'], ['house', 'tab-house'], ['assets', 'tab-assets-metals'], ['debt', 'tab-debt'], ['biz', 'tab-biz-gate'], ['achievements', 'tab-wealth-roadmap'], ['network', 'tab-network']];
  for (const [id, nm] of tabs) { await page.evaluate((id) => { try { showTab(id); window.scrollTo(0, 0); } catch (e) {} }, id); await settle(page, 1200); await page.evaluate(REMOVE); await shot(page, nm); }
  for (const sub of ['crypto', 'cash', 'stocks', 'other', 'liabilities']) {
    await page.evaluate((sub) => { try { showTab('assets'); const btn = [...document.querySelectorAll('#assets-page .subtab-btn')].find(b => (b.getAttribute('onclick') || '').includes("'" + sub + "'")); showSubtab('assets', sub, btn || null); window.scrollTo(0, 0); } catch (e) {} }, sub); await settle(page, 900); await page.evaluate(REMOVE);
    await shot(page, 'tab-assets-' + sub);
  }
  await page.evaluate(() => { try { showTab('biz'); document.querySelectorAll('#pro-gate-biz, #tab-biz .pro-gate').forEach(e => e.style.display = 'none'); window.scrollTo(0, 0); } catch (e) {} }); await settle(page, 800); await page.evaluate(REMOVE); await shot(page, 'tab-biz-unlocked');
  for (const [fn, nm, sel] of [['showStreamForm', 'biz-form-income-stream', '#stream-form-card'], ['showLeadForm', 'biz-form-add-lead', '#lead-form-card'], ['showClientForm', 'biz-form-add-client', '#client-form-card']]) { await page.evaluate((fn) => { try { window[fn](); } catch (e) {} }, fn); await settle(page, 500); await shot(page, nm, { rootSel: sel }); }
  await page.evaluate(() => { try { showTab('debt'); } catch (e) {} }); await settle(page, 600);
  await openModal(page, 'debt-form-modal', 'showDebtForm()'); await shot(page, 'debt-form-add-debt', { rootSel: '#debt-form-modal' });
  await page.evaluate(() => { const m = document.getElementById('debt-form-modal'); if (m) { m.classList.add('hidden'); m.style.setProperty('display', 'none', 'important'); } });
  await openModal(page, 'owe-form-modal', 'showOweForm()'); await shot(page, 'debt-form-owed-to-you', { rootSel: '#owe-form-modal' });
  await browser.close(); console.log('DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
