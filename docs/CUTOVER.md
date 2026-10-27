# Moving Vault·It to vault-it.co on Cloudflare — state and remaining steps

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

Done in the repo (`Pioneer_v3`, tested): Worker with raw-path allowlist, host kinds, https redirect and security headers; build; Turnstile on sign-in e-mail
(client widget only on the allowed sites; server verifies token **and hostname**, refuses with 503 if Cloudflare cannot be asked, never uses the built-in sender when the check is on);
new URLs; "moved" banner; share image; privacy notice names Cloudflare/Turnstile; Worker request logging off.

## Order of work (follow it — several steps depend on the one before)
1. **Owner — connect Git to the Worker** (dashboard, needs GitHub sign-in): Workers & Pages → `vault-it` → Settings → Builds → Connect → `FetaPit/Vault-It`,
   production branch **`Pioneer_v3`** *for now* (`release/pioneer-v2` does not contain the Cloudflare files yet), build command `npm run build:site`,
   deploy command `npx wrangler deploy`, root directory empty, enable **preview builds** for other branches. The first build replaces the placeholder.
   Check on a phone: `https://vault-it.ptlived.workers.dev/version.json` shows a commit hash.
2. **Owner yes → Claude: production Supabase.** The new app calls `pin-auth` actions that exist only in the new function (`set`/`remove` with re-authentication, `delete`), so the
   database and functions must be updated *before* testers use the new app: apply migrations `007…` then `008…`, deploy `pin-auth` and `send-auth-email`, set `APP_URL=https://app.vault-it.co/`.
   (`FROM_EMAIL` waits for step 4.) Check with `list_migrations` and the advisors afterwards.
3. **Claude — attach the domains:** add the three `routes` (custom domains) to `wrangler.jsonc` and push. Cloudflare creates the DNS records itself. Verify `https://app.vault-it.co/version.json`,
   `curl -sI` for the headers, `http://` → `https://`, `www` → bare domain. (Until this step the domains show nothing.)
4. **Resend:** owner adds `vault-it.co` in Resend (EU region); Claude adds the records it shows to Cloudflare DNS (DKIM TXT `resend._domainkey`, MX + SPF TXT on `send`) as DNS-only.
   **Only when Resend shows "Verified"**, set `FROM_EMAIL="Vault·It <noreply@vault-it.co>"` (rollback = set it back to `onboarding@resend.dev`). Send a real code to a Gmail address and check "Show original": SPF, DKIM and DMARC should pass.
5. **Turn on the human check — in this order:**
   a. The client with the site key must already be live on `app.vault-it.co` (it is, after step 3, because the key ships in `index.html`).
   b. Set the Supabase secret `TURNSTILE_SECRET` (the widget's secret — Claude can read it through the Cloudflare connector). From now on `send-auth-email` refuses requests without a valid token.
   c. **Owner (Supabase dashboard):** Authentication → Attack Protection → enable CAPTCHA → Turnstile → paste the same secret. This closes Supabase's own public sign-in endpoint (`/auth/v1/otp`), which would otherwise still send codes to a script that skips our function.
6. **Owner — Supabase Authentication → URL Configuration:** Site URL `https://app.vault-it.co`, add it to the redirect URLs (keep the github.io one while it is still used).
7. **Owner — Stripe:** Payment Links (and any success/cancel URLs) that return to the old address must be changed to `https://app.vault-it.co/…`, otherwise paying users land on the old copy.
8. **Release:** full test suite, make `backup/release-pioneer-v2-YYYYMMDD-HHMM`, fast-forward `release/pioneer-v2` to the tested `Pioneer_v3` commit, then change the Worker's production branch to `release/pioneer-v2`
   (Claude can do it through the Cloudflare API, or dashboard: Settings → Builds → Branch control). GitHub Pages keeps serving the old address, which now shows the moved banner.
   Never release before step 3 works: the released app links to `app.vault-it.co`.
9. **Rehearse** with a non-owner e-mail on a phone *and* a laptop: sign up → code → PIN → add data → sign out → PIN sign-in on the second device → *Download my data* → *Delete my account*. Check the landing-page waitlist form.
   Then share `https://app.vault-it.co` (update the QR code; `docs/TESTER_GUIDE.md` already has it).
10. Later: when nobody uses the old address, turn GitHub Pages off.

## Notes
- Previews (`*.workers.dev`) are public copies wired to the **production** Supabase project and are marked `noindex`. If that bothers you, put them behind Cloudflare Access (Worker → Settings → Domains & Routes → Preview URLs → Access).
- The free Workers plan allows 100,000 requests a day; every request runs through the Worker. Plenty for a beta; the paid plan ($5/month) lifts it.
- If a deploy fails with a name mismatch: the Cloudflare Worker name must equal `name` in `wrangler.jsonc` (`vault-it`).
- Scopes the Cloudflare connector needs: Zone Read, DNS Write, Zone Settings Write, Workers Scripts Write, Turnstile Sites Write, Account Settings Read.
