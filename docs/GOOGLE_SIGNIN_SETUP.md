# Switching on "Continue with Google"

The app code is ready: the Google button shows on the sign-in card as soon as the Google provider is on in Supabase, and stays hidden until then. Nothing else needs deploying. These steps are the owner's (they need your Google and Supabase logins), about 15 minutes, in a browser on the laptop.

## 1. Google Cloud: the consent screen
1. Go to console.cloud.google.com, create a project called **Vault-It** (or pick an existing one).
2. **APIs & Services → OAuth consent screen** (now called **Google Auth Platform → Branding**). User type **External**.
3. App name **Vault-It**, support email **hello@vault-it.co**, logo optional.
4. App domain: home page `https://vault-it.co`, privacy policy `https://vault-it.co` (or the privacy page when there is one).
5. Authorised domains: `vault-it.co` and `legpubblzgknxdtvsant.supabase.co` (plain `supabase.co` is refused: it is on the public suffix list, like `co.uk`).
6. Scopes (Data access): `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`. Nothing else.
7. Audience: **Publish app** (otherwise only test users you list can sign in).

## 2. Google Cloud: the OAuth client
1. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**, name `Vault-It web`.
2. Authorised JavaScript origins: `https://app.vault-it.co`
3. Authorised redirect URIs: `https://legpubblzgknxdtvsant.supabase.co/auth/v1/callback`
4. Create, then copy the **Client ID** and **Client secret**. Do not paste the secret into chat.

## 3. Supabase: switch the provider on
1. supabase.com/dashboard → project **legpubblzgknxdtvsant** → **Authentication → Sign In / Providers → Google**.
2. Turn it on, paste the Client ID and Client secret, Save.
3. **Authentication → URL Configuration → Redirect URLs**: add `https://app.vault-it.co/**`. Add a preview address too if you want to test on a preview build (for example `https://*-vault-it.ptlived.workers.dev/**`).

## 4. Check
1. Open https://app.vault-it.co in a private window (after the release that carries this code).
2. The sign-in card shows **Continue with Google** above the email field. Tap it, pick an account, and you land back in the app signed in, with no PIN prompt and your first name already filled in on the welcome.
3. An account that already exists with the same Gmail address is the same account (Supabase links them by the verified email).

Notes
- Google's screen will name `legpubblzgknxdtvsant.supabase.co` as where you are signing in to. Showing `vault-it.co` there needs Supabase's custom domain add-on (paid). Fine for the beta.
- To switch Google off again, turn the provider off in Supabase: the button disappears on the next page load.
