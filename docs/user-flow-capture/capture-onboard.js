const { chromium, settle, shot, openModal, HIDE_OVERLAYS, MOBILE } = require('./capture.js');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1, colorScheme: 'dark' });
  await ctx.addInitScript(() => { try { localStorage.setItem('vi-theme', 'dark'); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto('https://app.vault-it.co/?demo=alex', { waitUntil: 'load', timeout: 90000 }); await settle(page, 3500); await page.evaluate(HIDE_OVERLAYS);
  await openModal(page, 'tester-welcome'); await shot(page, 'onboard-tester-welcome', { full: false, rootSel: '#tester-welcome' }); await page.evaluate(HIDE_OVERLAYS);
  for (const [nm, n] of [['onboard-1-name-email', 1], ['onboard-2-where-are-you', 2], ['onboard-3-money-each-month', 3], ['onboard-4-home-goal', 4], ['onboard-5-your-plan', 5]]) {
    await openModal(page, 'welcome-overlay', `wGo(${n})`); await shot(page, nm, { rootSel: '#welcome-overlay' });
  }
  await openModal(page, 'welcome-overlay', "['w-step-1','w-step-2'].forEach(i=>{const e=document.getElementById(i); if(e) e.style.display='none'}); const e3=document.getElementById('w-step-3'); if(e3){e3.classList.remove('hidden'); e3.removeAttribute('hidden'); e3.style.display='block'}");
  await shot(page, 'onboard-6-start-vaulting', { rootSel: '#welcome-overlay' }); await page.evaluate(HIDE_OVERLAYS);
  await openModal(page, 'vi-campaign-modal', "if(typeof viCampaignPaint==='function') viCampaignPaint()"); await shot(page, 'modal-campaign-pioneer', { rootSel: '#vi-campaign-modal' }); await page.evaluate(HIDE_OVERLAYS);
  await browser.close(); console.log('DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
