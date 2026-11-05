// The app and the sign-up page must not carry invented reference prices, fake countdowns or discounts, celebrity endorsements,
// investment wording, or a checkout link that charges a different price from the one shown (owner's decisions, 29 Oct 2026).
const fs = require('fs');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const app = fs.readFileSync('/home/user/Vault-It/index.html', 'utf8'), page = fs.readFileSync('/home/user/Vault-It/landing.html', 'utf8');
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
ok(priced.length > 0 && priced.every((m) => /^£5\.99 a month$/.test(m)) && !/£49\.99|£149|£59\.99/.test(page), 'the sign-up page names no price except the £5.99 starting price (' + [...new Set(priced)].join(', ') + ')');
ok(/A57, 11 St Mary’s Street, Lincoln LN5 7EQ/.test(page) && /Lincoln LN5 7EQ/.test(app), 'trader address on the sign-up page and in the privacy notice');
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
