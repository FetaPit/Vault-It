// The app and the sign-up page must not carry invented reference prices, fake countdowns or discounts, celebrity endorsements,
// investment wording, or a checkout link that charges a different price from the one shown (owner's decisions, 29 Oct 2026).
const fs = require('fs');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } else console.log('ok  :', m); };
const app = fs.readFileSync('/home/user/Vault-It/index.html', 'utf8'), page = fs.readFileSync('/home/user/Vault-It/landing.html', 'utf8');
for (const [re, what] of [[/was £\d/, '"was £…" reference prices'], [/50% off/i, '"50% off" claims'], [/Offer expires/i, 'expiring-offer messages'],
  [/£3\.59|£4\.49|£5\.09/, 'the old time-based discount prices'], [/Buffett|Munger|Squibb|Gary Stevenson —/, 'celebrity advisor cards'],
  [/Invest once|Invest in you/i, 'investment wording'], [/spots left/i, 'a "spots left" countdown'],
  [/3cIfZbddA6UV5yR4GG2VG01/, 'the retired £59.99 annual Stripe link'], [/£59\.99/, 'the old £59.99 annual price']]) {
  ok(!re.test(app), 'app has no ' + what);
}
ok(/£49\.99/.test(app) && /£5\.99/.test(app) && /£149/.test(app), 'the app shows the decided prices (£5.99/mo, £49.99/yr, £149 founder)');
ok(/founderSlots: 100,/.test(app), 'founding cap is 100');
// Prices are amounts with a billing period or a one-off. The hero demo's lay buttons (£5, £50, £500), the deposit figure and the block key (£1,000, £100) are illustrations, not prices.
const priced = page.match(/£[\d,.]+k?\s*(a month|\/mo\b|per month|a year|\/yr\b|per year|once|one-off)/g) || [];
ok(priced.length > 0 && priced.every((m) => /^£5\.99 a month$/.test(m)) && !/£49\.99|£149|£59\.99/.test(page), 'the sign-up page names no price except the £5.99 starting price (' + [...new Set(priced)].join(', ') + ')');
ok(/A57, 11 St Mary’s Street, Lincoln LN5 7EQ/.test(page) && /Lincoln LN5 7EQ/.test(app), 'trader address on the sign-up page and in the privacy notice');
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED'); process.exit(fails ? 1 : 0);
