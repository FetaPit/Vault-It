# Vault-It — the offer, the prices and the sign-up funnel

Written 28 Oct 2026 from the research in `docs/research/` (every price and rule there has its source URL and the date it was read, 27 Oct 2026).
Figures marked *estimate* are arithmetic on stated assumptions, not facts. **Prices and caps below are recommendations: Pete decides, and nothing
is charged differently until the Stripe links are changed.**

## 1. The offer in one breath

> **Watch your deposit build your home — brick by brick.** Vault-It puts your debts, savings, house deposit and net worth on one honest map and
> turns every pound you save towards your deposit into bricks on a 3D house. You type the numbers in — no bank login. Free while it's in beta.

Why this works (from the research): it leads with the one thing no competitor has (the house that builds), cuts the two biggest fears in UK finance
apps (bank logins, data selling), and makes the first win immediate (Hormozi's value equation: shorter time delay, less effort). It describes the tool,
not a promised result. "Own your home outright" type copy is a promise the ASA treats as an outcome claim (`rules_uk_law.md` §2).

### For the public (ads, socials)
- Hook: *"Saving for a deposit? Watch it build your house."* (Not "Are you in debt?": Meta bans personal-attribute copy like that, `rules_platforms.md`.)
- Promise: one map from debt to the keys, built in the UK, no bank login, free beta.
- Proof: real screens only, plus the founder story. Add tester quotes **only** once real testers give written permission, and label any that got a free or discounted plan.
- Call to action: *Join the beta list* (email only).

### For testers
- What they get: free for the whole beta; a direct line to Pete; their feedback decides what's built; **first look at founding-member pricing**.
  This last one is a commitment: the page says it, so honour it.
- What we ask: use it (made-up figures are fine), report what's confusing or broken, answer the odd short email.

## 2. What the market charges (sourced: `pricing_uk_eu.md`, `pricing_global.md`)

| Group | Typical price | Notes |
|---|---|---|
| UK entry tiers (Plum Plus, Emma Plus, Wallet, **Snoop Plus**) | **£3.99–£5.99 / month** | Snoop Plus includes net worth: £5.99/mo or £47.99/yr |
| UK top tiers (Emma Pro, Cleo Pro, Emma Ultimate, Plum Max) | £9.99–£14.99 / month | Emma Pro (net worth): £83.99/yr |
| UK annual discount | **30–33%** at the leaders (Emma, Snoop); 16–25% at smaller players | |
| US/global synced apps (Copilot, Monarch, YNAB, Lunch Money) | $95–$109 / year | Bank sync is their main cost; manual-entry apps price at 0–50% of synced |
| Lifetime | Not offered by any UK/EU leader; indie/manual apps only | Lifetime ≈ **2.5–3.6× the annual price** in the verified examples (median 3.1×) |

The UK market has also shrunk: Money Dashboard closed in 2023 and Moneyhub's consumer app closed on 31 Jul 2026, so there is room. Prices are rising
(Snoop 2025, Monzo/Revolut 2026). No UK survey measures willingness to pay for a net-worth app directly. The closest evidence is Monzo's 16% paid share.

## 3. Recommended prices

| Plan | Recommendation | Why |
|---|---|---|
| **Beta** | Free, no card | Lead with zero effort; the paid plans come after the beta |
| **Pioneer monthly** | **£5.99 / month** (unchanged) | Top of the UK entry band, equal to Snoop Plus, which also has net worth |
| **Pioneer annual** | **£49.99 / year** (≈30% off monthly) | Matches the UK leaders' discount and sits next to Snoop's £47.99. The cost model says it's safe while you are not VAT-registered (threshold £90,000); revisit at registration (then £59.99) |
| **Founding Member** (lifetime, for testers first) | **£149 once**, a **real, enforced cap** you choose, sold only via Stripe | 3.0× the £49.99 annual, inside the evidenced band; within the cost floor *only with* the AI cap below |

**Alternative to lifetime** (the best-documented subscription-app precedent: Momentum on Kickstarter, where half the backers took it and the lifetime tier took none):
*12 months of Pioneer plus 25% off for life*, around £39. This carries less long-term cost risk. Consider offering both.

### Conditions that make the founding offer safe and lawful
1. **Cap the AI screenshot reader.** Today it allows 30 images a day to *any* signed-in user, free users included. A heavy user costs about **£168–£435 a year** (*estimate*, `cost_to_serve.md`), which would use up a £149 payment in about 4 months. Make it a monthly allowance (for example 10 a month for founders, 30 for Pioneer, 0–3 for free), stop refunding the allowance after a successful call, and try the cheaper model.
2. **3D house generation stays on the user's own Meshy key**, and lifetime excludes AI credits, 3D generation and premium data feeds. Say so next to the price.
3. **Define "lifetime"** beside the price as *the life of the Vault-It service*, with what happens on closure or sale, and give the 14-day cancellation information (Consumer Contracts Regulations). Without it the cancellation right runs to 12 months.
4. **The cap must be real.** Count paid orders and stop selling at the cap. No countdowns, and no "only X left" unless it is true at that moment. Fake scarcity is a banned practice under the DMCC Act 2024 (CMA fines up to 10% of turnover) and against CAP 3.30–3.31.
5. **Never call it an investment.** "Invest once. Own it forever." must go: equity or return language is a financial promotion (s21 FSMA).

### Fix the price mess before charging anyone (`page_audit.md`)
- The annual price is £59.99 on the old landing page and in the Stripe link, but £49.99 in the app, and **the app's £49.99 buttons charge £59.99**. Pick one, then create the Stripe link to match. I can't see or change Stripe from here: the Stripe connector needs authorising in claude.ai settings.
- Lifetime is £199 with 33 spots on the landing page, £149 with 50 in the app, and a £7.77 "Founding Licence" in admin settings.
- The app shows invented "was £11.99" and "was £119.99" reference prices, "50% off forever", and a discount ladder with "Offer expires in 7 days" whose buttons all charge full price. Remove them, or wire up real discounted links.
- Free-plan limits on the old page didn't match the code: it said 3 debts, the code allows 1; metals and cash flow were sold as Pioneer-only but aren't gated.

## 4. Raising money

- **Do it as pre-sales first**: the founding offer through Stripe on your own site. You keep the list and pay no platform fee. This is unregulated as long as there is no equity, revenue share or return.
- **Kickstarter is optional and hard.** Technology projects succeed about 23% of the time. Kickstarter won't fund something already available, and Vault-It's beta is live, so a campaign would need a defined new deliverable (a native app, for example). Ask Kickstarter first. UK fees are about 8% per pledge. Kickstarter says email lists convert at 1–5% and pre-launch *followers* at 32%, so build a Kickstarter "notify me" page from your list before launch.
- **Equity** (selling shares) is regulated. It only goes through an FCA-authorised platform (Crowdcube, Seedrs/Republic) or a qualifying exemption. Don't write "invest in Vault-It" anywhere until then.
- **Sizing** (*estimate*, `benchmarks.md`): a confirmed email from UK Meta ads costs roughly £16–£31 (range £10–£82). At 1–5% yield, ads alone don't pay for a pre-sale. A £5–10k pre-sale at about £150 needs roughly 700–1,400 engaged, confirmed emails. **Use ads to recruit testers and learn; grow the list organically for the raise.**

## 5. The funnel as built (`landing.html`, `site/sign-up/*`, `supabase/functions/waitlist-join`, migration 009)

`vault-it.co/sign-up` (also served at `vault-it.co/`) → email-only form at the top → `sign-up/thanks` ("check your inbox") → the e-mailed link →
`sign-up/confirm` ("you're on the list" + the beta link + how to sign in) → the app. Every email carries a signed `sign-up/unsubscribe` link.

- **Double opt-in.** Nothing counts until the address owner clicks. This stops anyone signing someone else up, and it is the consent evidence (what, when, which wording) for PECR. Expect 27–54% of sign-ups not to confirm (sourced).
- **Marketing box unticked**, separate from "I'd like to test". Old waitlist rows are marked `legacy` and must **not** get marketing.
- **Campaign tags** (`utm_source/medium/campaign/content`, first touch) and the referring site's origin are stored with the sign-up, so you can see which ad works.
  No pixels or cookies. If you want page analytics, enable Cloudflare Web Analytics (cookie-less) and update the privacy notice; ad pixels need a consent banner.
- **Bot protection**: per-IP, global and per-mailbox limits; Turnstile once `TURNSTILE_SECRET` is set *and* `vault-it.co` is added to the widget's allowed sites.
- **What the page no longer has**:
  - the three.js hero, which was broken in production anyway;
  - supabase-js;
  - the fake spots counter;
  - the unsourced testimonials;
  - "Works offline" and "Seven modules";
  - the Stripe buttons and the demo link.

  The demo the old page linked to shows Warren Buffett & Charlie Munger, Gary Stevenson and Simon Squibb as Vault-It advisors and officers, with made-up quotes. Remove those cards from the app before any traffic.
- **Ad links**: use `https://vault-it.co/sign-up?utm_source=meta&utm_medium=paid&utm_campaign=<name>&utm_content=<ad>` (likewise `tiktok`, `instagram`, `reddit`).

## 6. Decisions only Pete can make
1. The annual price (£49.99 recommended) and new Stripe links to match; delete the fake reference prices and discount ladder in the app.
2. Founding Member: price (£149 recommended), the real cap, the lifetime terms, the AI allowance. Or the 12-months-plus-25%-off alternative.
3. Business postal address for the footer and the privacy notice. The DMCC Act expects trader identity and address next to prices.
4. Remove the celebrity advisor and officer cards from the app.
5. Mailing tool: the build keeps the list in Supabase and sends via Resend (no new processor). Resend's free 100 emails/day is shared with sign-in codes, so upgrade to Resend Pro before running ads. Kit was checked: the account has 0 subscribers and a lapsed trial.
6. The "One Source Alpha" page couldn't be identified (closest match is a B2B Web3 early-access programme by OneSource). Send the link if you want it compared.
7. ICO fee: £52/year (tier 1), if not already paid.

## 7. Decided by Pete (29 Oct 2026)
- Release the sign-up page (migration 009 + `waitlist-join` + release).
- Pioneer **£5.99/month, £49.99/year**. The old £59.99 annual link is retired in the app. Until the new £49.99 Payment Link is pasted into
  `VI_STRIPE_LINKS.annual` (index.html), the annual buttons say the plan opens shortly instead of charging the old price.
- **Founding Member £149 once, 100 places.** Create the Payment Link with Stripe's "limit the number of payments" set to 100, so the cap is real, and
  paste it into `VI_STRIPE_LINKS.founder`. Until then the button says it opens to beta testers first. Mark founders with `profiles.is_founder = true`.
- AI screenshot reader: **monthly** allowance, free 3 / Pioneer 30 / Founding Member 10 (migration 010, `portfolio-vision`). A billed but unreadable reply is no longer refunded.
  Paid status (`is_pioneer`) is still set by the app itself, so someone could claim 30 reads a month; a Stripe webhook would close that.
- Removed from the app: the celebrity "advisor" cards, the "was £11.99 / £119.99" prices, "50% off forever", the 7-day discount ladder, the "spots left" countdown and "invest" wording.
- Trader address: PT Live Design, A57, 11 St Mary's Street, Lincoln LN5 7EQ (page footers, e-mails, privacy notice).
- Resend stays on the free plan for now, so **no paid ads yet** (100 e-mails/day shared with sign-in codes).
- Still in the app, for Pete to decide: the Network tab's "Founding Master Licence £7.77" with a Shibarium NFT card and "33 founding slots" contradicts the £149 offer. It cannot be bought without a pasted link, but it should go or be reworded before the founding offer opens.

## Stripe as set up on 31 Oct 2026 (live)

| Plan | Price | Stripe price | Payment Link | Returns to |
|---|---|---|---|---|
| Pioneer monthly | £5.99 a month | `price_1TdPy79mgKf6Hnty9GNgtoIp` | https://buy.stripe.com/4gM9AN3D0gvv5yR7SS2VG00 | `?upgraded=1&plan=monthly` |
| Pioneer yearly | £49.99 a year | `price_1UWalp9mgKf6HntyQzc6DFgy` (`pioneer_yearly`) | https://buy.stripe.com/dRm3cp6Pccff2mFa102VG02 | `?upgraded=1&plan=yearly` |
| Pioneer monthly, beta tester | £3.99 a month (£2 off) | `price_1UWalr9mgKf6Hntyo8fCeWYH` (`pioneer_monthly_tester`) | https://buy.stripe.com/6oUeV7b5sbbb7GZ6OO2VG03 | `?upgraded=1&plan=monthly` |
| Pioneer yearly, beta tester | £21.99 a year (£28 off) | `price_1UWalt9mgKf6Hntyj2Fu1WLO` (`pioneer_yearly_tester`) | https://buy.stripe.com/9B63cp0qObbb2mF6OO2VG04 | `?upgraded=1&plan=yearly` |
| Founding Member | £149 once, Stripe stops the link after 100 payments | `price_1UWam79mgKf6HntyipUcP8oo` (`founding_member`, product `prod_VXg87aVvQj3qUJ`) | https://buy.stripe.com/eVq28l0qO6UV3qJc982VG05 | `?founded=1` |

Switched off: the £59.99 yearly link (`plink_1TdPyH9mgKf6Hnty9IT0ARfh`). Still in the account, unused: the old "Vault·It Pro" £4.99 / £39.99 prices and the "Vault·It Free" product; archive them from the Dashboard when convenient. The app appends `prefilled_email` and `client_reference_id` (the account id) to every link so the webhook (secure paid gateway, queued) can match a payment to an account.
