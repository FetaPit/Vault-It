# Moving Vault-It to vault-it.co on Cloudflare — state and remaining steps

Layout: **app.vault-it.co** = the app, **vault-it.co** = landing page + waitlist, **www** redirects to the bare domain, plain http redirects to https.
The domain is registered at Wix; its nameservers now point at Cloudflare (zone **Active**, Free plan). One Cloudflare Worker, **`vault-it`**, serves both
hosts (`worker/index.mjs`, `wrangler.jsonc`, site built by `tools/build_site.js` into `dist/app` and `dist/landing`).
Browser storage is per web address, so devices start empty on the new address until the user signs in (the cloud copy restores). Photos and uploaded
3D designs live only in the browser, so people must *Download my data* first; the old GitHub address shows a "we've moved" banner that says so.

## Where things stand (27 Oct 2026)
Done in Cloudflare (by Claude, through the Cloudflare connector):
- Zone `vault-it.co` Active; **Always Use HTTPS** on; `_dmarc` TXT `v=DMARC1; p=none;` (add a `rua=` report address later if wanted — one on another domain needs an authorisation record).
- Turnstile widget **"Vault-It sign-in"**, site key `0x4AAAAAAFoY-niKQ_Wu-1YM` (public; already in `index.html`), managed mode, allowed sites `app.vault-it.co` and `fetapit.github.io`.
  It cannot run on workers.dev preview links, so **signing in on a preview link is deliberately impossible** (it says so); previews are for looking only.
- The zone also carries Cloudflare Email Routing records (MX `route1-3.mx.cloudflare.net`, DKIM `cf2024-1._domainkey`, SPF at the apex). Resend sends from the `send.` sub-domain, so they do not clash.
- Worker `vault-it` exists but is still the dashboard's placeholder (deployments say `dash_template`); a second placeholder `blue-grass-5c9d` can be deleted.

Done in the repo (`Pioneer_v3`, tested): Worker with raw-path allowlist, host kinds, https redirect and security headers; build; the three custom-domain `routes` in `wrangler.jsonc`;
Turnstile on the sign-in e-mail (client widget on `app.vault-it.co` and `fetapit.github.io` only; server verifies token **and hostname**, refuses with 503 if Cloudflare cannot be asked, never uses the
built-in sender when the check is on); new URLs; "moved" banner; share image; privacy notice names Cloudflare/Turnstile; Worker request logging off; `hello@vault-it.co` is the contact address everywhere.

Done elsewhere (by the other session, through the connectors): Wix parking records deleted; Email Routing on (`hello@vault-it.co` → owner's Gmail); Supabase Site URL and redirect URL set to `https://app.vault-it.co`;
repo `FetaPit/Vault-It` connected to Worker `vault-it` (Workers Builds, build `npm run build:site`, deploy `npx wrangler deploy`, preview builds), production branch switched from `main` to
**`release/pioneer-v2`** (the first build on `main` failed because `main` has no site build). Until the release below, builds of that branch fail, so the Worker is still the placeholder and the custom
domains show nothing.

**Production Supabase updated on 2026-10-27** (checked against the live project afterwards): migration 007 applied through the connector; 008 pasted
into the SQL editor by the owner (the connector's confirmation prompt timed out three times), so `list_migrations` shows 007 but not 008 — `auth_rate`,
`rate_hit` and `erase_user_data` exist. `send-auth-email` v8 and `pin-auth` v5 are deployed from `Pioneer_v3` and match the repo. Resend's records
(DKIM `resend._domainkey`, `send` + `rsend-euw1` CNAMEs, EU region) were added by Resend's Cloudflare auto-configure. Still to set: `FROM_EMAIL`
(once Resend shows Verified); `APP_URL` is optional (the code's default is `https://app.vault-it.co/`).

## Live since 2026-10-27 18:04 UTC (verified 22:10)
- Released `208b85b` (backup `backup/release-pioneer-v2-20261027-1803`). The GitHub push did **not** start a Workers build (no build or preview build
  appears for any push since the repo was connected), so the production build was started through the API; the GitHub → Cloudflare link needs checking
  (GitHub → Settings → Applications → Cloudflare Workers and Pages → repository access must include `Vault-It`). Manual builds carry no commit hash, so
  `version.json` shows the branch name.
- Custom domains `app.vault-it.co`, `vault-it.co`, `www.vault-it.co` attached with certificates; headers (HSTS, frame-ancestors, nosniff, referrer,
  permissions) present; `http://` and `www` reach the right site; `/landing/…` on the app host is 404.
- Resend domain `vault-it.co` verified (the first auto-configure added DNS records but not the domain itself — it had to be added in Resend again);
  `FROM_EMAIL` set. Live test with a `+tag` Gmail alias: code e-mail from `noreply@vault-it.co` arrived in the inbox (not spam); code verified; weak PIN refused;
  PIN set; wrong PIN counted; PIN sign-in issued a token; data saved and read back; delete with wrong PIN refused, with right PIN erased the login, profile,
  data, history and PIN (checked in the database); `auth_rate` is counting.
- The sign-in code is **8 digits** (Supabase's OTP length), while the app and `TESTER_GUIDE.md` say 6. Owner: Authentication → Sign In / Providers → Email →
  Email OTP length = 6 (or change the wording).
- Not done yet: step 5 (`TURNSTILE_SECRET` + Supabase CAPTCHA) and step 6 (Stripe links).

## Release 2026-10-28 14:23 UTC (`b77d3ad`, backup `backup/release-pioneer-v2-20261028-1352`)
- Landing join form now calls the new `waitlist-welcome` function (deployed v1): saves the address and e-mails a welcome with the
  app link from `hello@vault-it.co`. Live test: delivered within a second, but Gmail filed it under **Promotions**.
- Direct-path session renewal (phones whose tab froze stopped syncing after an hour with 401s while looking signed in).
- Build again started through the API: the GitHub push still does not trigger Workers Builds.
- Known flaky test: `test_quick` fails intermittently on the live version too (not caused by these changes).

## Next release: the sign-up page (`vault-it.co/sign-up`, double opt-in) — needs the owner's yes
Built and tested on `Pioneer_v3`, not deployed. It replaces the live `waitlist-welcome` join (which saves and e-mails straight away, with no consent box
and no check that the address belongs to the person typing it). Plan and reasons: `docs/OFFER_AND_PRICING.md`. In one sitting:
1. Apply `009_waitlist_optin.sql` (removes the browser's insert right; existing rows become `legacy` — not on the marketing list).
2. Deploy `waitlist-join` (`--no-verify-jwt`). Optional secret `SITE_URL` (default `https://vault-it.co/`).
3. Release (suite, backup branch, fast-forward). Once 009 is applied the old page's direct-insert fallback stops working, so release straight after.
4. Verify on a phone: `/sign-up` → confirmation e-mail → `/sign-up/confirm` → app link → the e-mail's "Remove me" link → `/sign-up/unsubscribe`.
5. Then add `vault-it.co` to the Turnstile widget's allowed sites before `TURNSTILE_SECRET` is set (step 5 below).
6. Upgrade Resend before running ads (the free 100 e-mails/day is shared with sign-in codes). `waitlist-welcome` can be deleted once nothing calls it.

## Order of work (follow it — several steps depend on the one before)
1. **Owner — Resend:** add `vault-it.co` in Resend (EU region) and pass on the records it shows. **Claude** adds them to Cloudflare DNS as DNS-only (DKIM TXT `resend._domainkey`, MX + SPF TXT on `send`),
   and sets `_dmarc` to `v=DMARC1; p=none; rua=mailto:hello@vault-it.co`. Wait for Resend to show "Verified".
2. **Owner yes → Claude: production Supabase** (all in one sitting, immediately before step 3, because the old app and the new functions do not match each other):
   a. apply `007_security_hardening.sql`, then `008_auth_rate_limit.sql` (the functions fail open without 008), then `009_waitlist_optin.sql`
      (beta list with double opt-in; it removes the public insert policy, so the **old** landing page's form stops working at that moment — do it together with step 3);
   b. deploy `pin-auth`, `send-auth-email` and `waitlist-join` (all `--no-verify-jwt`);
   c. secrets: `APP_URL=https://app.vault-it.co/`, and — only once Resend shows the domain verified — `FROM_EMAIL="Vault-It <noreply@vault-it.co>"` (rollback: `onboarding@resend.dev`).
   Check with `list_migrations`, `list_edge_functions` and the advisors afterwards.
3. **Release (Claude, when asked):** full test suite, create `backup/release-pioneer-v2-YYYYMMDD-HHMM`, fast-forward `release/pioneer-v2` to the tested `Pioneer_v3` commit. Workers Builds then deploys the Worker and
   creates the custom domains and their DNS records (vault-it.co and vault-it.co/sign-up then serve the new sign-up page, `docs/OFFER_AND_PRICING.md`); GitHub Pages keeps serving the old address, which now shows the "we've moved" banner. Never release before step 2: the released app calls `pin-auth` actions
   (`set`/`remove` with re-authentication, `delete`) that exist only in the new function.
4. **Verify (Claude):** sign up on `https://vault-it.co/sign-up` with a `+tag` Gmail alias → confirmation e-mail → confirm → unsubscribe link works; `https://app.vault-it.co/version.json` shows the new commit; `curl -sI https://app.vault-it.co/` for the headers; `http://` → `https://`; `www` → bare domain; the landing-page waitlist form.
   A phone check: `https://vault-it.ptlived.workers.dev/version.json`.
5. **Turn on the human check — in this order, after step 3** (the client with the site key is then live on both allowed addresses):
   0. Add `vault-it.co` to the Turnstile widget's allowed sites (Claude, through the Cloudflare connector), so the sign-up page can get tokens.
   a. Set the Supabase secret `TURNSTILE_SECRET` (the widget's secret — Claude can read it through the Cloudflare connector). From now on `send-auth-email` refuses requests without a valid token.
   b. **Owner (Supabase dashboard):** Authentication → Attack Protection → enable CAPTCHA → Turnstile → paste the same secret. This closes Supabase's own public sign-in endpoint (`/auth/v1/otp`), which would otherwise
      still send codes to a script that skips our function.
6. **Owner — Stripe:** Payment Links (and any success/cancel URLs) that return to the old address must be changed to `https://app.vault-it.co/…`, otherwise paying users land on the old copy.
7. **Rehearse** with a non-owner e-mail (a `+tag` Gmail alias works) on a phone *and* a laptop: sign up → code → PIN → add data → sign out → PIN sign-in on the second device → *Download my data* → *Delete my account*.
   Send a real code to a Gmail address and check "Show original": SPF, DKIM and DMARC should pass. Then share `https://app.vault-it.co` (update the QR code; `docs/TESTER_GUIDE.md` already has it).
8. Later: when nobody uses the old address, turn GitHub Pages off (and drop `fetapit.github.io` from the widget's allowed sites).

## Notes
- Previews (`*.workers.dev`) are public copies wired to the **production** Supabase project and are marked `noindex`. If that bothers you, put them behind Cloudflare Access (Worker → Settings → Domains & Routes → Preview URLs → Access).
- The free Workers plan allows 100,000 requests a day; every request runs through the Worker. Plenty for a beta; the paid plan ($5/month) lifts it.
- If a deploy fails with a name mismatch: the Cloudflare Worker name must equal `name` in `wrangler.jsonc` (`vault-it`).
- Scopes the Cloudflare connector needs: Zone Read, DNS Write, Zone Settings Write, Workers Scripts Write, Turnstile Sites Write, Account Settings Read.
