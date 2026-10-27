# Moving Vault·It to vault-it.co on Cloudflare — state and remaining steps

Layout: **app.vault-it.co** = the app, **vault-it.co** = landing page + waitlist, **www** redirects to the bare domain.
The domain is registered at Wix; only its nameservers move to Cloudflare. One Cloudflare Worker (`vault-it`) serves both hosts
(`worker/index.mjs`, `wrangler.jsonc`, site built by `tools/build_site.js` into `dist/app` and `dist/landing`).
Browser storage is per web address, so devices start empty on the new address until the user signs in (the cloud copy restores);
the old GitHub address shows a "we've moved" banner reminding people to back up first.

## Done (in the repo, on `Pioneer_v3`, tested)
- Site build, Worker (host routing, security headers, path-escape and method guards), wrangler config, CI dry-run — `tests/test_site.js`.
- URLs in the app, landing page, `send-auth-email` default and docs point at the new addresses; "moved" banner on `fetapit.github.io`.
- Turnstile ("are you human") in front of the sign-in e-mail: widget in the sign-in card when `VI_TURNSTILE_SITEKEY` (index.html) is set;
  `send-auth-email` verifies the token when the Supabase secret `TURNSTILE_SECRET` is set. Failed checks never use the shared rate-limit counters.
- Privacy notice names Cloudflare and Turnstile.

## State on 2026-10-27
**Done:** zone `vault-it.co` Active on Cloudflare (nameservers `donovan`/`lady`); Wix parking records deleted; Email Routing on
(`hello@vault-it.co` → owner's Gmail; it is now the contact address everywhere); migrations 007 + 008 applied; Supabase Site URL +
redirect URL set to `https://app.vault-it.co`; repo connected to Worker `vault-it` (Workers Builds, build `npm run build:site`, deploy
`npx wrangler deploy`, production branch switched from `main` to `release/pioneer-v2` via the API — the first build on `main` failed because
`main` has no site build); routes in `wrangler.jsonc`; Turnstile widget "Vault-It sign-in" (managed, `app.vault-it.co`) with its site key in
`index.html` — used only when the page is served from `app.vault-it.co`, so the old address and previews keep signing in without it.

**Owner, still to do:**
1. **Resend**: add domain `vault-it.co` (EU region) and pass on the record values (DKIM TXT at `resend._domainkey`, MX + SPF TXT at `send`).
2. **Yes** to: deploying `send-auth-email` + `pin-auth`, the secrets below, and the release (backup branch + fast-forward).

**Claude, remaining (in this order):**
1. Add Resend's records and `_dmarc` (`v=DMARC1; p=none; rua=mailto:hello@vault-it.co`) as DNS-only; wait for Resend to show the domain verified.
2. With the owner's yes: deploy `send-auth-email` and `pin-auth`; set secrets `APP_URL=https://app.vault-it.co/`, `FROM_EMAIL="Vault·It <noreply@vault-it.co>"`
   (only once Resend shows the domain verified; until then the deployed function sends from `onboarding@resend.dev`).
3. Run the full suite, make `backup/release-pioneer-v2-YYYYMMDD-HHMM`, fast-forward `release/pioneer-v2` → Workers Builds deploys it and creates
   the custom domains (vault-it.co shows nothing between the Wix records' removal and this deploy). GitHub Pages keeps serving the old address.
4. Verify: `https://app.vault-it.co/version.json` shows the new commit; sign up with a non-owner e-mail (a `+tag` Gmail alias works) on a phone and
   a laptop; PIN sign-in on the second device; Download my data; Delete my account. Check headers (`curl -sI https://app.vault-it.co/`).
5. `TURNSTILE_SECRET` (secret of the widget above): set it only when the old address is no longer used for sign-in. Once it is set, a sign-in
   e-mail request without a Turnstile token is refused, and the old address has no widget, so its users must move to app.vault-it.co.
6. Later: when nobody uses the old address any more, set `TURNSTILE_SECRET` and turn GitHub Pages off.

## Notes
- Cloudflare preview links (`*.workers.dev`) serve the app (and the landing page under `/landing/`) and are marked `noindex`; they use the same Supabase project, so do not sign real users up on a preview.
- `observability` is enabled in `wrangler.jsonc` (Workers logs hold request URLs and IPs for a short period).
- If the Worker deploy fails with a name mismatch: the Cloudflare project name must equal `name` in `wrangler.jsonc`.
