# Test day: phone, desktop, install, sync

What to try on real devices, in order, and what "working" looks like. Everything below is also run automatically by One B (`node tests/journey_one_b.js`, mocked Supabase, two browsers sharing one cloud), so this list is about what only a real device and a real e-mail can show.

## Before you start
- Use the live app at https://app.vault-it.co (the preview build is for brand work, not this test).
- Use an e-mail address you can open on the phone. Each sign-up sends one code through Resend; the free quota is 100 a day, 3,000 a month.
- A device remembers its own copy of your data. Signing in on a new device pulls the account copy; the two merge by newest edit, and an empty device never wipes a full account.

## 1. Phone: make the account
1. Open https://app.vault-it.co in Safari (iPhone) or Chrome (Android). Expect: sign-in card, tagline, FCA line.
2. Enter your e-mail, tap Continue. Expect: "check your e-mail" step; the code arrives within a minute. If not, check spam, then the Resend dashboard.
3. Enter the 6-digit code. Expect: "set a PIN" pad. Choose a 6-digit PIN, enter it twice.
4. First-run welcome: first name, your biggest challenge, house price. Expect: the app opens on the Overview.
5. House builder: enter an amount, tap "Lay the Bricks". Expect: bricks animate, the amount shows under the house.
6. Switch to another app or lock the phone for a few seconds, then come back. (This is when the app pushes to your account.)

## 2. Desktop: sign in, same data
1. Open https://app.vault-it.co in a desktop browser you have never used for the app.
2. Enter the same e-mail, press Continue. Expect: the PIN pad straight away, no second e-mail.
3. Enter the PIN. Expect: the app opens with no welcome screen, your name in the sidebar, the same savings and house price as the phone.
4. Add a debt (Debt tab, Add). Switch to another tab or window for a moment.

## 3. Phone: open again
1. Return to the app on the phone (or reopen it). Expect within a few seconds: the debt from the desktop appears and a toast says "Updated with changes from your other device".
2. Settings, Sign out, then PIN back in. Expect: savings and debt still there.

## 4. Install the app
- iPhone Safari: Share, "Add to Home Screen". Expect: Vault-It icon; opening it gives a full-screen app with no browser bar.
- Android Chrome: menu, "Install app" (or the install banner). Expect: the same.
- Open the installed app, then turn on flight mode and open it again. Expect: the sign-in card or your data still appears (the shell is cached); live prices and sync resume when you are back online.
- Installed app sync: close the app (swipe it away), reopen it. Expect: any change made on the desktop in between shows up.

## What to send back if something fails
- Device, browser, the step number, and a screenshot.
- For a sync problem: Settings, "Sync now" status text, and whether the other device had been in the background.
- For a code that never arrived: the time you pressed Continue and the e-mail address.

## How sync works (for reference)
- Every save marks the data as unsent and pushes it to the account about a quarter of a second later.
- Going to the background, going offline then online, or closing the tab pushes anything still unsent.
- Coming back to the foreground pulls the account copy; a check also runs every 3 minutes while open.
- The app shell (page, manifest) is cached by the service worker; `version.json`, Supabase and price feeds are always live.
