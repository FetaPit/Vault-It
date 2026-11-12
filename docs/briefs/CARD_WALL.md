# Card wall at sign-up (brief)

Owner, 12 Nov 2026, to David (COO), in his own words:

- "We want to make sure the nnew sign ups see the pricing structure subscription model and that if they sign up to the monthly vaulter plan they will be sign up on stripe with a method of payment and charged after 30 days"
- Asked "plans as a last step with Not now allowed, or a card required to get in": **"Card required"**.
- Existing testers: **"Card wall for everyone"**.
- Plan names: **"Vaulter monthly, Pioneer yearly"**.
- Where the wall sits: **"After the questions"**.
- Release order: **"Fixes now, wall next"**.

## What this means

Nobody uses the app without a plan and a card on file. A person signs in, answers the onboarding questions, sees the plans, goes to Stripe, and comes back into the app. Stripe holds the card and takes the first payment on day 31 (Vaulter monthly, Pioneer yearly). The Lifetime licence is charged at checkout. The 30 free days with no card end for everyone, existing accounts included.

## What is already there (checked 12 Nov, read only)

- Stripe links with a 30-day trial and the card taken at checkout: monthly `monthly_trial` (…VG08, £3.99 a month) and yearly `annual_trial` (…VG0a, £49.99 a year). Lifetime licence `founder_tester` (…VG0b, £99 once, 100 places).
- Every checkout carries `client_reference_id` (the account id) and the e-mail (`src/app/paywall/stripe-config.js`).
- `stripe-webhook` is enabled in Stripe and marks the account (migration 011, the paid gateway). It counts a trial as paid.
- No checkout has ever completed and the webhook has never received an event: the paid path is unproven end to end.

## What has to change

1. **The wall.** After onboarding (and for an existing account at its next visit) the plans screen shows with no way past it except a plan, Sign out, Download my data and Help. The app opens only when the server says the account is on a plan (trialing counts). The device's own flags (`vi_pioneer`, `vi_user.pro`) must not be enough to open it.
2. **Coming back from Stripe.** `?upgraded=1` / `?founded=1` shows "checking your payment" and waits for the server record; if it has not arrived after a minute, say so plainly and give the support address. Never unlock on the query string alone.
3. **The in-app trial goes.** `viTrialState`, the day counter, the banner and the read-only state are replaced by: on a plan (open) or not (wall). A subscription that has ended or failed to renew goes back to the wall; the person's figures stay safe and downloadable.
4. **Names.** Monthly plan is **Vaulter**, yearly is **Pioneer**, the one-off stays **Lifetime licence**, in the app, the help, the e-mails and Stripe's product names (the Stripe rename needs the owner's yes at the time).
5. **Every promise in words.** Remove "no card" and "30 days free, no card needed" wherever they appear: welcome screen, tester note, help answers, landing page and its sign-up pages, tester guide, offer doc, e-mails. Replace with what happens: "30 days free, then £3.99 a month. Your card is taken now and first charged on day 31." The plan terms next to each button already say this (`viPlanTerms`).
6. **The demo stays open.** vault-it.co/demo-a needs no account and no card.

## Flags for the owner (David)

- **The nine testers were told "30 days free, no card".** The wall will lock them out at their next visit. Send them a short note first (draft for the owner's approval) so it is not a surprise. Six of them hold saved figures; those stay safe and downloadable behind the wall.
- **Law, not my call.** A free trial that takes a card needs the price, the first charge date and how to cancel shown before the card is given, the 14-day cooling-off right, and an easy way to cancel. Cancelling is by e-mail today. Get a solicitor to read the screen and the terms before this goes live. Not regulated by the FCA; this is consumer law, not financial advice.
- **Test it with real money once.** The owner buys Vaulter monthly on the preview build, checks the account unlocks, then cancels. David cannot enter card details.
- **Fewer sign-ups will finish.** A card wall cuts completed sign-ups. The gate that matters is paying customers, so that may be right, but watch the numbers.

## Done means (to be turned into tests)

- A new sign-up, after onboarding, sees the three plans with prices and terms and cannot reach any tab without one.
- Choosing Vaulter opens the Stripe link with the 30-day trial, the account id and the e-mail.
- An account the server marks as on a plan (including trialing) opens the app; one it does not, sees the wall, on every device.
- Setting the device's own paid flags by hand does not open the app.
- An existing account with no plan meets the wall at its next visit; its figures are untouched and Download my data works.
- No page or e-mail says "no card". `tests/test_signup_page.js` and `tests/test_copy.js` cover the wording and that prices match the Stripe links.
- The demo link opens with no account.

## Out of scope

- Self-serve cancel inside the app (stays by e-mail unless the solicitor says otherwise).
- New prices. Household plan. Any change to what a plan includes.

## How to build it

Its own session on a branch off brand-rollout, through ship-item, to the fintech-engineering standard (payments, sign-in, saved data). Chunks: (1) server truth for "on a plan" and the wall, failing test first; (2) return from Stripe; (3) remove the in-app trial; (4) names; (5) wording everywhere, with Pedro on the plans screen; (6) the owner's test purchase on the preview; then the release.
