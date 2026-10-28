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

Done in the repo (`Pioneer_v3`, tested): Worker with raw-path allowlist, host kinds, https redirect and security headers; build; the three custom-domain `routes` in `wrangler.jsonc`;
Turnstile on the sign-in e-mail (client widget on `app.vault-it.co` and `fetapit.github.io` only; server verifies token **and hostname**, refuses with 503 if Cloudflare cannot be asked, never uses the
built-in sender when the check is on); new URLs; "moved" banner; share image; privacy notice names Cloudflare/Turnstile; Worker request logging off; `hello@vault-it.co` is the contact address everywhere.

Done elsewhere (by the other session, through the connectors): Wix parking records deleted; Email Routing on (`hello@vault-it.co` → owner's Gmail); Supabase Site URL and redirect URL set to `https://app.vault-it.co`;
repo `FetaPit/Vault-It` connected to Worker `vault-it` (Workers Builds, build `npm run build:site`, deploy `npx wrangler deploy`, preview builds), production branch switched from `main` to
**`release/pioneer-v2`** (the first build on `main` failed because `main` has no site build). Until the release below, builds of that branch fail, so the Worker is still the placeholder and the custom
domains show nothing.

**Production Supabase has NOT been updated yet** (checked 2026-10-27 against the live project, not assumed): `list_migrations` stops at `vision_usage_screenshot_cap`, there is no `auth_rate` table or
`rate_hit` / `erase_user_data` function (migration 008), `anon` can still execute `handle_new_user`, `rls_auto_enable` and `waitlist_count` (migration 007), and the deployed `send-auth-email` (v6) and
`pin-auth` (v4) are the old ones. Re-check with `list_migrations` and `get_edge_function` before relying on any line that says "applied".

## Order of work (follow it — several steps depend on the one before)
1. **Owner — Resend:** add `vault-it.co` in Resend (EU region) and pass on the records it shows. **Claude** adds them to Cloudflare DNS as DNS-only (DKIM TXT `resend._domainkey`, MX + SPF TXT on `send`),
   and sets `_dmarc` to `v=DMARC1; p=none; rua=mailto:hello@vault-it.co`. Wait for Resend to show "Verified".
2. **Owner yes → Claude: production Supabase** (all in one sitting, immediately before step 3, because the old app and the new functions do not match each other):
   a. apply `007_security_hardening.sql`, then `008_auth_rate_limit.sql` (the functions fail open without 008), then `009_waitlist_optin.sql`
      (beta list with double opt-in; it removes the public insert policy, so the **old** landing page's form stops working at that moment — do it together with step 3);
   b. deploy `pin-auth`, `send-auth-email` and `waitlist-join` (all `--no-verify-jwt`);
   c. secrets: `APP_URL=https://app.vault-it.co/`, and — only once Resend shows the domain verified — `FROM_EMAIL="Vault·It <noreply@vault-it.co>"` (rollback: `onboarding@resend.dev`).
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
