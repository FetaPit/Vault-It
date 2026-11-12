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
| **Beta** | Was: free with no card asked for. From 12 Nov 2026 a plan and a card are needed from the start (the last section of this file) | Was: lead with zero effort; the paid plans come after the beta |
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
| Pioneer yearly, beta tester | £39.99 a year (£10 off; was £21.99 until 31 Oct pm) | `price_1UWeLL9mgKf6HntydosAUcXr` (`pioneer_yearly_tester`) | https://buy.stripe.com/3cI8wJ0qO9337GZa102VG06 | `?upgraded=1&plan=yearly` |
| Founding Member, beta tester | £99 once (£50 off), same 100-place cap | `price_1UWeLN9mgKf6Hnty3Rboi2or` (`founding_member_tester`) | https://buy.stripe.com/bJe3cpc9w4MN8L31uu2VG07 | `?founded=1` |
| Founding Member | £149 once, Stripe stops the link after 100 payments | `price_1UWam79mgKf6HntyipUcP8oo` (`founding_member`, product `prod_VXg87aVvQj3qUJ`) | https://buy.stripe.com/eVq28l0qO6UV3qJc982VG05 | `?founded=1` |

Switched off: that first £59.99 yearly link (`plink_1TdPyH9mgKf6Hnty9IT0ARfh`, a different link from the £59.99 one wired in on 5 Nov, see below) and the £21.99 tester yearly link (`plink_1UWamF9mgKf6Hnty4WkoKDk4`, 31 Oct pm). Still in the account, unused: the old "Vault·It Pro" £4.99 / £39.99 prices and the "Vault·It Free" product; archive them from the Dashboard when convenient. The app appends `prefilled_email` and `client_reference_id` (the account id) to every link so the webhook (secure paid gateway, live 31 Oct: endpoint `we_1UWd6t9mgKf6Hntyhibk3fEK` → Supabase `stripe-webhook`) can match a payment to an account.


## Decided by Pete (31 Oct 2026, afternoon)

- Testers use the app free for their 30 days in return for detailed feedback. After that: **£3.99 a month, £39.99 a year** (was £21.99) or **Founding Member £99** (£50 off), each shown with the full price struck through. Full prices stay £5.99 / £49.99 / £149. The webhook maps the new links and prices.

## Decided by Pete (4 Nov 2026): tier names, prices and icons (v0.9.1 round 2, chunk I)

Owner's words: "Initial offering to users onboarded for testing is Vaulter 3.99 (normal price £5.99) Pioneer (Pro) billed yearly 49.99 ( will be £59.99) Founding Memeber £99 will be £149." This replaces the 31 Oct tester prices above.

| Tier | Plan | Beta tester price (now) | After the beta | Link the app opens now | Link after the beta |
|---|---|---|---|---|---|
| **Vaulter** | monthly | £3.99 a month | £5.99 a month | `monthly_tester` (…VG03) | `monthly` (…VG00) |
| **Pioneer** (Pro) | yearly | £49.99 a year | £59.99 a year | `annual` (…VG02, the live £49.99 link) | `annual_after_beta`: **empty, no Stripe link yet** |
| **Founding Member** | once, 100 places | £99 once | £149 once | `founder_tester` (…VG07) | `founder` (…VG05) |

- `VI_PLANS` in `index.html` is the single source: price (after the beta), tester price, and the `VI_STRIPE_LINKS` key for each. Every plan surface (Settings "Your plan", the paywall, the plans pop-up, the crowdfund modal) is painted from it by `viPricePaint()`.
- While the beta is open (`VI_BETA_OPEN`, every account is a tester) the app shows the tester price with the later price as "£59.99 after the beta" (sentences: "£49.99 a year while in beta, £59.99 after"). Nothing is struck through and there are no "was" prices.
- The app no longer links the £39.99 tester yearly link (…VG06). It is still active in Stripe; switching it off is the owner's call. The webhook still maps it, so anyone who bought through it stays matched.
- **Before the beta closes**: create the £59.99 yearly Payment Link and paste it into `VI_STRIPE_LINKS.annual_after_beta`. Until then, with the beta closed, every yearly button is disabled and says "Coming soon"; no button can open a missing link (`tests/test_tier_prices.js`).
- The after-trial state is plain **read-only** with no tier name. "Vaulter" now names only the monthly plan. (Replaced on 12 Nov 2026: there is no after-trial state any more; see the last section.)
- Price check, flagged to the owner: at beta prices 12 × £3.99 = £47.88, which is less than £49.99 a year, so the app makes no "save by paying yearly" claim. After the beta, 12 × £5.99 = £71.88 against £59.99.
- Tier icons (Pedro's brief): Vaulter a vault door (teal), Pioneer a compass (purple), Founding Member a keystone with rank chevrons (brass), drawn as Wealth Roadmap medallions. Source `tools/build_tier_icons.js`; standalone files `brand/vault-it-tier-*.svg`.

## Decided by Pete (4 Nov 2026, evening): Founder, Pioneer, Lifetime licence, and the alpha trial (I2)

Owner's words (~20:45): "card now charge later for 30 day free trial sign up for Alpha testers specifically, Have the link for founder, pioneer (includes family mode as a feature, not a separate tier) and Lifetime licence charge at checkout with recurring monthly for founder, yearly for pioneer." This replaces the names in the section above; the prices stay.

| Tier | Plan key | Beta price | After the beta | Alpha testers open | Not on the alpha trial (beta open) | After the beta |
|---|---|---|---|---|---|---|
| **Founder** | monthly | £3.99 a month | £5.99 a month | `monthly_trial` …VG08: 30 days free, card now, first charge day 31 | `monthly_tester` …VG09: charged at checkout | `monthly` …VG00 (£5.99) |
| **Pioneer** (Pro, family mode coming soon) | annual | £49.99 a year | £59.99 a year | `annual_trial` …VG0a: 30 days free, card now, first charge day 31 | `annual` …VG02: charged at checkout | `annual_after_beta`: **empty, no link yet**; buttons say "coming soon" |
| **Lifetime licence** (100 places) | founder | £99 once | £149 once | `founder_tester` …VG0b: charged at checkout, no trial | same | `founder` …VG05 (£149) |

- Links created by the Chief of Staff on 4 Nov evening (plink ids: VG08 `plink_1UYB4b9mgKf6HntyI7G9b61g`, VG09 `plink_1UYB4c9mgKf6HntysTGXUmeH`, VG0a `plink_1UYB4d9mgKf6HntyxEOhC5nM`, VG0b `plink_1UYB4f9mgKf6HntyrxjivlM7`). Each carries Stripe metadata `plan` (monthly / yearly / founder), so the deployed `stripe-webhook` maps them without a redeploy, and it counts `trialing` as paid.
- No longer used by the app (still in Stripe, the owner's call to switch off): …VG03 (old £3.99 monthly), …VG06 (£39.99 yearly), …VG07 (old £99 Founding).
- Next to every Founder and Pioneer button, for alpha testers: "Free for 30 days, then £3.99 a month. Your card is taken now and first charged on day 31. Cancel before then and you pay nothing. To cancel, email hello@vault-it.co." (Pioneer: £49.99 a year.) Not on the trial: "£3.99 a month, charged at checkout. To cancel, email hello@vault-it.co." Lifetime: "One payment, charged at checkout."
- **There is no self-serve cancel in the app**: subscribers email hello@vault-it.co. A Stripe customer portal link would let people cancel themselves; that needs the owner to switch the portal on in Stripe.
- Family mode is shown on Pioneer only as "Family mode (coming soon)": it is not built.
- The sign-up page keeps its rule of never saying "lifetime"; it calls the plan the "one-payment licence".
- Icons: the vault door is now Founder, the keystone Lifetime licence (`brand/vault-it-tier-founder.svg`, `-pioneer.svg`, `-lifetime-licence.svg`).

## Decided by Pete (5 Nov 2026): Pioneer covers both monthly and yearly; confirmed full and tester prices

Owner's words: "So let's get clear on the pricing guide for the actual price for the release. £5.99 monthly, £59.99 yearly plan Pioneer with the Pro features, £149 for the founding license. That is then discounted to £3.99 for the testers, £39.99 yearly with the Pro features, the Pioneer build yearly, and £99 discounted for the testers for the founding license. Make sure all comms, products, assets, Stripe links align with this, and the Stripe links are active."

Checked against what is actually live in Stripe before changing anything. Two numbers in the message above needed confirming against what is really charging testers today, because they conflicted with the 4 Nov decision:

| | Full price (after the beta) | Tester price (now) |
|---|---|---|
| Pioneer monthly | £5.99 a month — unchanged, matches | £3.99 a month — unchanged, matches |
| Pioneer yearly | **£59.99 a year** — now wired to a real live Stripe link (below) | **£49.99 a year, confirmed** (the owner's "£39.99" today was the pre-4-Nov price; asked directly, he kept £49.99, which is what is actually charging testers via `…VG02`) |
| Lifetime licence (Founding Member) | £149 once, 100 places — unchanged, matches | £99 once, 100 places — unchanged, matches |

**Naming.** Asked directly: Stripe's own product has always been called "Vault·It Pioneer" for both the monthly and yearly plan (it never used the word "Founder"). The app alone split this into "Founder" (monthly) and "Pioneer" (yearly). Owner's call: rename the monthly plan's display name from Founder to Pioneer, so "Pioneer" now names both. The icon and colour for the monthly plan are unchanged (still the vault-door icon, internal key `tier:'founder'`) — only the user-facing text changes. The separate "Lifetime licence" plan (`founder` plan key, `VI_STRIPE_LINKS.founder` / `founder_tester`) is untouched; it was never called "Founder" in the app, that name collision was coincidental.

**Stripe housekeeping done today:**
- The £59.99/yr full-price link already existed in the live account, created but never pasted into the app: `https://buy.stripe.com/cNidR3b5s3IJ0ex2yy2VG0c` (price `price_1TdPyB9mgKf6HntyvjViAMQg`). Wired into `VI_STRIPE_LINKS.annual_after_beta`, which was empty since 4 Nov.
- `…VG07` (the old, duplicate £99 Founding-tester link flagged as abandoned on 4 Nov but never actually switched off) is now deactivated in Stripe. It was running in parallel with the link the app actually uses (`…VG0b`), each with its own independent 100-place cap — a real risk of 200 places selling instead of 100. The link the app uses is untouched.
- `…VG06` (the old £39.99 tester-yearly link) stays live and unused, as the owner has not asked to switch it off; still his call per the 4 Nov note.

**Also removed today:** a leftover, unreachable modal (`#waitlist-modal`) carrying "DAO Governance Seat", "Lifelong Contributor Badge" and a hardcoded, stale £49.99 figure that never tracked the real plan price, plus "Alpha pricing locked at signup. It never increases" (false: tester prices do change after the beta). Confirmed nothing in the app could ever show it before deleting it.

**Pitch deck:** the pricing slide's "or £49.99 a year" was the old figure; fixed to "£59.99 a year" to match the confirmed full price (the deck shows the full/investor-facing price, not the beta-tester discount).

## Decided by Pete (7 Nov 2026): Household is its own plan

Owner's words, 7 Nov: "Also add a Pioneer Household Pricing with up to 8 users within the licence 19.99 a month or 199:99 a year". Asked whether it stays on the pitch deck: "Keep, coming soon". Asked whether it is its own plan or family mode inside Pioneer: "Yes, its own plan".

| Plan | Price | People | Status |
|---|---|---|---|
| **Household** | £19.99 a month or £199.99 a year | up to 8 in one licence | Coming soon. Not on sale: no Stripe link, no tester price |

- This replaces the 4 Nov line "pioneer (includes family mode as a feature, not a separate tier)". Pioneer no longer carries "family mode coming soon"; family features belong to Household.
- Still to do before it is sold: a Stripe product and Payment Link (owner's yes first), a Household line in the pitch deck forecast, and the family plan build (logged 4 Nov as "do not build").

## Decided by Pete (12 Nov 2026): the card wall, Vaulter monthly and Pioneer yearly

Owner's words, to David (brief `docs/briefs/CARD_WALL.md`): "We want to make sure the nnew sign ups see the pricing structure subscription model and that if they sign up to the monthly vaulter plan they will be sign up on stripe with a method of payment and charged after 30 days". Asked whether a card is required to get in: "Card required". Existing testers: "Card wall for everyone". Names: "Vaulter monthly, Pioneer yearly". Where: "After the questions".

This replaces the 30 free days with no card, the countdown and the read-only state described above and in `docs/MONETISATION_DECISION.md`. The prices and the Stripe links do not change.

| Plan | Plan key | Beta price | After the beta | What the button opens while the beta is open |
|---|---|---|---|---|
| **Vaulter** | monthly | £3.99 a month | £5.99 a month | `monthly_trial` …VG08: 30 days free, card taken at checkout, first charged on day 31 |
| **Pioneer** (Pro, family mode coming soon) | annual | £49.99 a year | £59.99 a year | `annual_trial` …VG0a: 30 days free, card taken at checkout, first charged on day 31 |
| **Lifetime licence** (100 places) | founder | £99 once | £149 once | `founder_tester` …VG0b: charged at checkout, no free period |

- **Nobody uses the app without a plan.** After the set-up questions (and for an existing account at its next visit) the plans screen covers the app. The only ways off it are a plan, Sign out, Download my data and Help. The sample at vault-it.co/demo-a needs no account and no card.
- **The server decides.** The app opens only when the account's profile, as written by the Stripe webhook, says it is on a plan (a Stripe trial counts). Flags on the device and the return address from Stripe open nothing.
- **A plan that ends or fails to renew** goes back to the plans screen. Nothing the person entered is deleted, and Download my data works from that screen.
- **One plan per account.** An account on a plan cannot start a second checkout from the app; changes and cancelling are by e-mail to hello@vault-it.co (there is still no self-serve cancel).
- **The words everywhere:** "30 days free, then £3.99 a month. Your card is taken now and first charged on day 31. Cancel before then and you pay nothing. To cancel, email hello@vault-it.co." No page says the beta is free or that no card is needed: the app, the sign-up page (`landing.html`), its confirm page and the terms (`tests/test_copy.js`, `tests/test_signup_page.js`, `tests/test_card_wall_wording.js`).
- **Names:** `VI_PLANS` is the one source and paints every plan name. Stripe's own product names still say Pioneer for both subscriptions until the owner says to rename them.
- **Still to do before it goes live (the owner):** a solicitor's read of the trial wording (the plans screen, Terms section 6, the sign-up page); the note to the nine existing testers (`docs/marketing/tester-card-wall-note.md`, a draft, not sent); one real purchase to prove the paid path end to end.
