// The app and the sign-up page must not carry invented reference prices, fake countdowns or discounts, celebrity endorsements,
// investment wording, or a checkout link that charges a different price from the one shown (owner's decisions, 29 Oct 2026).
const fs = require('fs');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const app = fs.readFileSync(require('./lib/vi').INDEX, 'utf8'), page = fs.readFileSync(require('path').join(require('./lib/vi').ROOT, 'landing.html'), 'utf8');
for (const [re, what] of [[/was £\d/, '"was £…" reference prices'], [/50% off/i, '"50% off" claims'], [/Offer expires/i, 'expiring-offer messages'],
  [/£3\.59|£4\.49|£5\.09/, 'the old time-based discount prices'], [/Buffett|Munger|Squibb|Stevenson/, 'celebrity advisor names, including code comments'],
  [/Invest once|Invest in you/i, 'investment wording'], [/spots left/i, 'a "spots left" countdown'],
  [/3cIfZbddA6UV5yR4GG2VG01/, 'the retired £59.99 annual Stripe link'], [/3cI8wJ0qO9337GZa102VG06|£39\.99/, 'the old £39.99 tester yearly price and link (owner, 4 Nov)'],
  [/<s>£|\(was £/, 'struck-through prices (later prices read "£X after the beta", owner 4 Nov)'],
  [/id="waitlist-modal"|DAO Governance Seat|Lifelong Contributor Badge|It never increases|£49\.99\/yr/, 'the dead alpha waitlist pop-up and its hype (governance seat, contributor badge, a fixed £49.99/yr, "never increases"; owner, 5 Nov)']]) {
  ok(!re.test(app), 'app has no ' + what);
}
ok(/monthly: \{ price: 5\.99, tester: 3\.99,/.test(app) && /annual: \{ price: 59\.99, tester: 49\.99,/.test(app) && /founder: \{ price: 149, tester: 99,/.test(app), 'VI_PLANS holds the decided prices (owner, 4 Nov: £3.99 then £5.99 a month, £49.99 then £59.99 a year, £99 then £149 Founding)');
ok(/founderSlots: 100,/.test(app), 'founding cap is 100');
ok(/function captureEmailToList\(/.test(app), 'captureEmailToList() stays (real sign-up flows use it)');
// Prices are amounts with a billing period or a one-off. The hero demo's lay buttons (£5, £50, £500), the deposit figure and the block key (£1,000, £100) are illustrations, not prices.
const priced = page.match(/£[\d,.]+k?\s*(a month|\/mo\b|per month|a year|\/yr\b|per year|once|one-off)/g) || [];
// Until 12 Nov 2026 the beta was free and the page named one price, the £5.99 starting price after it. With the card wall (owner, 12 Nov:
// "Card required") the page leads to a card, so it names what the plans cost: the beta prices the Stripe trial links charge and the
// prices after the beta, exactly as VI_PLANS holds them. No other price, and no one-off price (the page never says "lifetime").
const planPrices = (k) => (app.match(new RegExp(k + ': \\{ price: ([\\d.]+), tester: ([\\d.]+)')) || []).slice(1);
const [mAfter, mNow] = planPrices('monthly'), [aAfter, aNow] = planPrices('annual');
const pence = [...new Set(page.match(/£\d+\.\d\d/g) || [])];
ok(mNow && aNow && priced.length > 0 && priced.every((m) => m === '£' + mNow + ' a month' || m === '£' + aNow + ' a year') && pence.every((x) => ['£' + mNow, '£' + mAfter, '£' + aNow, '£' + aAfter].includes(x)) && !/£149|£99\b/.test(page),
  'the sign-up page names only the plan prices the app charges: £' + mNow + ' a month and £' + aNow + ' a year, £' + mAfter + ' and £' + aAfter + ' after the beta (' + [...new Set(priced)].concat(pence).join(', ') + ')');
ok(/A57, 11 St Mary’s Street, Lincoln LN5 7EQ/.test(page) && /Lincoln LN5 7EQ/.test(app), 'trader address on the sign-up page and in the privacy notice');
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
