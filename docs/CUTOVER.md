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

## Owner's manual steps (nothing else needs the owner)
1. **Cloudflare**: account, add domain `vault-it.co` (Free). Put the two nameservers it assigns into Wix (Domains → vault-it.co → Advanced →
   Name servers), remove Wix's, keep DNSSEC off, press "I updated my nameservers". Wait for the "Active" e-mail. Confirm the Wix account e-mail.
2. **Cloudflare access for Claude** (new session afterwards): claude.ai/customize/connectors → custom connector `https://mcp.cloudflare.com/mcp`,
   or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in the environment settings (token scoped to Zone DNS edit on vault-it.co, Workers Scripts edit,
   Turnstile edit; never paste it into chat).
3. **Connect the repo to the Worker** (dashboard, needs GitHub sign-in): Workers & Pages → Create → Import a repository → `FetaPit/Vault-It`
   (authorise the Cloudflare GitHub app). Project/Worker name **`vault-it`** (must equal `name` in `wrangler.jsonc`). Production branch `release/pioneer-v2`.
   Build command `npm run build:site`, deploy command `npx wrangler deploy`. Settings → Builds → enable preview builds for other branches.
4. **Resend**: add domain `vault-it.co` (EU region); paste the record values (DKIM TXT at `resend._domainkey`, MX + SPF TXT at `send`) so they can be added to Cloudflare DNS.
5. **Supabase dashboard**: Authentication → URL Configuration → Site URL `https://app.vault-it.co`, add it to the redirect URLs.
6. **Yes** to production changes (migrations 007 + 008, function deploys, secrets).

## Claude's steps once the zone is **Active** and Cloudflare access exists (in this order)
1. In the zone's DNS: delete the records imported from Wix that park the domain (A records `185.230.63.x`, `www` CNAME `cdn3.wixdns.net`) —
   a Custom Domain cannot be created on a name that already has a CNAME. Add Resend's records and `_dmarc` (`v=DMARC1; p=none; rua=mailto:pete@ptlive.design`) as DNS-only.
2. Add the routes to `wrangler.jsonc` (a deploy fails while the zone is not Active, which is why they are commented out) and push:
   `"routes": [{"pattern":"app.vault-it.co","custom_domain":true},{"pattern":"vault-it.co","custom_domain":true},{"pattern":"www.vault-it.co","custom_domain":true}]`
3. Create the Turnstile widget (domains `app.vault-it.co`, managed mode) via the API; put the **site key** in `VI_TURNSTILE_SITEKEY` in `index.html`.
4. With the owner's yes: apply `supabase/migrations/007…` and `008…` (008 first matters), deploy `send-auth-email` and `pin-auth`, set secrets `APP_URL=https://app.vault-it.co/`,
   `FROM_EMAIL="Vault·It <noreply@vault-it.co>"`, `RESEND_API_KEY` (already), and — **only after the client with the site key is live** — `TURNSTILE_SECRET`.
5. Run the full suite, make `backup/release-pioneer-v2-YYYYMMDD-HHMM`, fast-forward `release/pioneer-v2` (Workers Builds deploys it; GitHub Pages keeps serving the old address).
6. Verify: `https://app.vault-it.co/version.json` shows the new commit; sign up with a non-owner e-mail on a phone and a laptop; PIN sign-in on the second device;
   Download my data; Delete my account. Check headers (`curl -sI https://app.vault-it.co/`). Share the new link; update the QR code and `docs/TESTER_GUIDE.md` if needed.
7. Later: when nobody uses the old address any more, turn GitHub Pages off.

## Notes
- Cloudflare preview links (`*.workers.dev`) serve the app (and the landing page under `/landing/`) and are marked `noindex`; they use the same Supabase project, so do not sign real users up on a preview.
- `observability` is enabled in `wrangler.jsonc` (Workers logs hold request URLs and IPs for a short period).
- If the Worker deploy fails with a name mismatch: the Cloudflare project name must equal `name` in `wrangler.jsonc`.
