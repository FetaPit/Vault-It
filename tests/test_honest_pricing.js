// The app and the sign-up page must not carry invented reference prices, fake countdowns or discounts, celebrity endorsements,
// investment wording, or a checkout link that charges a different price from the one shown (owner's decisions, 29 Oct 2026).
const fs = require('fs');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const app = fs.readFileSync(require('./lib/vi').INDEX, 'utf8'), page = fs.readFileSync(require('path').join(require('./lib/vi').ROOT, 'landing.html'), 'utf8');
for (const [re, what] of [[/was £\d/, '"was £…" reference prices'], [/50% off/i, '"50% off" claims'], [/Offer expires/i, 'expiring-offer messages'],
  [/£3\.59|£4\.49|£5\.09/, 'the old time-based discount prices'], [/Buffett|Munger|Squibb|Stevenson/, 'celebrity advisor names, including code comments'],
  [/Invest once|Invest in you/i, 'investment wording'], [/spots left/i, 'a "spots left" countdown'],
  [/3cIfZbddA6UV5yR4GG2VG01/, 'the retired £59.99 annual Stripe link'], [/3cI8wJ0qO9337GZa102VG06/, 'the old £39.99 tester yearly link (owner, 4 Nov; the Vaulter yearly beta price of £39.99 is a new link since 13 Nov)'],
  [/<s>£|\(was £/, 'struck-through prices (later prices read "£X after the beta", owner 4 Nov)'],
  [/id="waitlist-modal"|DAO Governance Seat|Lifelong Contributor Badge|It never increases|£49\.99\/yr/, 'the dead alpha waitlist pop-up and its hype (governance seat, contributor badge, a fixed £49.99/yr, "never increases"; owner, 5 Nov)']]) {
  ok(!re.test(app), 'app has no ' + what);
}
ok(/vaulter_month: \{ tierId: 'vaulter', billing: 'month', price: 5\.99,\s+tester: 3\.99,/.test(app) && /vaulter_year:\s+\{ tierId: 'vaulter', billing: 'year',\s+price: 49\.99, tester: 39\.99,/.test(app) && /pioneer_month: \{ tierId: 'pioneer', billing: 'month', price: 9\.99,\s+tester: 5\.99,/.test(app) && /pioneer_year:\s+\{ tierId: 'pioneer', billing: 'year',\s+price: 79\.99, tester: 49\.99,/.test(app) && /founder:\s+\{ tierId: 'founder', billing: 'once',\s+price: 199,\s+tester: 99,/.test(app),
  'VI_PLANS holds the decided prices (owner, 13 Nov: Vaulter £3.99 then £5.99 a month and £39.99 then £49.99 a year; Pioneer £5.99 then £9.99 a month and £49.99 then £79.99 a year; Lifetime £99 then £199)');
ok(/founderSlots: 100,/.test(app), 'founding cap is 100');
ok(/function captureEmailToList\(/.test(app), 'captureEmailToList() stays (real sign-up flows use it)');
// Prices are amounts with a billing period or a one-off. The hero demo's lay buttons (£5, £50, £500), the deposit figure and the block key (£1,000, £100) are illustrations, not prices.
const priced = page.match(/£[\d,.]+k?\s*(a month|\/mo\b|per month|a year|\/yr\b|per year|once|one-off)/g) || [];
// Until 12 Nov 2026 the beta was free and the page named one price, the £5.99 starting price after it. With the card wall (owner, 12 Nov:
// "Card required") the page leads to a card, so it names what the plans cost: the beta prices the Stripe trial links charge and the
// prices after the beta, exactly as VI_PLANS holds them. No other price, and no one-off price (the page never says "lifetime").
const planPrices = (k) => (app.match(new RegExp(k + ':\\s+\\{ tierId: \\S+ billing: \\S+\\s+price: ([\\d.]+),\\s+tester: ([\\d.]+)')) || []).slice(1);
const per = { month: ['vaulter_month', 'pioneer_month'], year: ['vaulter_year', 'pioneer_year'] };
const allowed = (period) => per[period].flatMap(planPrices).map((x) => '£' + x + (period === 'month' ? ' a month' : ' a year'));
const pence = [...new Set(page.match(/£\d+\.\d\d/g) || [])], okPence = per.month.concat(per.year).flatMap(planPrices).map((x) => '£' + x);
ok(allowed('month').length === 4 && allowed('year').length === 4 && priced.length > 0 && priced.every((m) => allowed('month').includes(m) || allowed('year').includes(m)) && pence.every((x) => okPence.includes(x)) && !/£149|£99|£199/.test(page),
  'the sign-up page names only the plan prices the app charges (Vaulter and Pioneer, monthly and yearly, beta and after the beta), and no one-off price (' + [...new Set(priced)].concat(pence).join(', ') + ')');
ok(/A57, 11 St Mary’s Street, Lincoln LN5 7EQ/.test(page) && /Lincoln LN5 7EQ/.test(app), 'trader address on the sign-up page and in the privacy notice');
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
