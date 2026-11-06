# Instagram intro: page set-up and video carousel

Owner's ask, 6 Nov 2026: "Instagram video carousel intro post and instagram page creation".

> **Go (owner, 6 Nov 2026: "Name is final, go").** The name stays Vault-It and the social hold is lifted. Usernames checked logged out on 6 Nov: `vaultit`, `vaultit.app`, `vaultit.uk`, `getvaultit` and `vaultit.co` show no profile; `vault_it` is taken. A name that shows nothing can still belong to a deactivated account, so the sign-up screen has the final word. If the name ever changes, change `BRAND` at the top of `slides.js` and re-render.

## What is in the kit

Rendered files go in `out/`. That folder is not committed; re-render it with the steps at the end.

| File | Use |
|---|---|
| `slide-01.mp4` … `slide-06.mp4` | The carousel, in order. 1080 x 1350 (4:5), 6 s each, 30 fps, H.264, silent |
| `slide-0N-cover.png` | A still of each slide. Use these if you would rather post an image carousel |
| `profile-picture.png` | Profile picture, 1080 x 1080 (the V mark; Instagram crops it to a circle) |
| `highlight-1-start-here.png` … `highlight-5-founder.png` | Story highlight covers, 1080 x 1920 |

### The six slides

1. **Get out of the red and into your home.** "red" in the darker tagline red with a glow, "your" in teal, "home." all gold with a gold glow. The 3D house builds from the ground up.
2. **Your money lives in too many places.** Six scattered cards (credit card, overdraft, car finance, savings pot, deposit fund, budget notes) snap into one panel. Ends on "One honest map instead."
3. **Every pound you save lays a brick.** The house rises in steps while a gold "Deposit saved" bar fills. Marked "Illustration".
4. **Clear the red, block by block.** Red debt blocks clear one by one ("Paid off"), then teal net worth blocks stack up with gold £100 cubes. Uses the app's own key: block = £1,000, cube = £100. Marked "Illustration".
5. **You type the numbers in.** A phone form fills in (figures hidden as dots) next to four ticks: no bank login, no card to join, runs in your browser, add it to your home screen.
6. **Free during the beta.** The finished house glows, then "Join the beta list", "Link in bio · vault-it.co" and "No card. No bank login. Made in Lincoln by Pete Thickett."

Every slide carries the wordmark, a slide count and "Not regulated by the FCA. Not financial advice." Headings are Oxanium (your 6 Nov pick), body text DM Sans, labels Share Tech Mono, wordmark Syne. No prices, testimonials, scarcity or advisers, and no figures that look like anyone's real money.

## Page set-up (you do this in the Instagram app on your phone)

I can't create accounts for you, so these steps are yours. Each one is in the Instagram app unless it says otherwise.

1. **Sign up** with `hello@vault-it.co`. That address forwards to your Gmail, so the code arrives there. Use a new password from your password manager and turn on two-factor authentication straight away (Settings and activity → Accounts Centre → Password and security).
2. **Username.** Try these in order in the sign-up screen and take the first one it accepts:
   `vaultit` · `vaultit.app` · `vaultit.uk` · `getvaultit`
   (Instagram usernames can't contain hyphens, so `vault-it` is not possible.)
3. **Professional account:** Settings and activity → Account type and tools → Switch to professional account → **Business** → category **App page**.
4. **Name** (30 characters, and it shows in search): `Vault-It · Debt to deposit`
5. **Bio** (144 of 150 characters; keep the line breaks):
   ```
   Get out of the red and into your home.
   Debts, savings and your deposit on one map.
   Free UK beta. Not regulated by the FCA. Not financial advice.
   ```
6. **Link:** `https://vault-it.co/sign-up?utm_source=instagram&utm_medium=social&utm_campaign=intro` (same tracking pattern as `docs/OFFER_AND_PRICING.md`). Set the link title to `Join the free beta`.
7. **Profile picture:** `profile-picture.png`.
8. **Contact button:** email `hello@vault-it.co`. Leave out the phone number and address.
9. **Privacy:** keep the account public (it is a business page), and turn on Hidden Words (Settings → Hidden words) to filter abusive comments and message requests.

## The intro post

1. Tap **+** → **Post**, tap the multi-select icon, and choose `slide-01.mp4` to `slide-06.mp4` **in that order**.
2. Tap the crop icon and check the frame is **4:5** (portrait), so nothing gets cut off.
3. **Sound:** the videos are silent. Add a calm instrumental from Instagram's music library if you like, at low volume. Avoid anything with lyrics about money or getting rich.
4. **Caption** (paste as is):

   ```
   Get out of the red and into your home.

   I'm Pete, a designer in Lincoln, and I'm building Vault-It: one honest map of your debts, savings, house deposit and net worth. Every pound you save towards your deposit becomes a brick on your own 3D house, so you can watch the deposit rise.

   You type the numbers in. No bank login, no card to join. It runs in your browser and you can add it to your home screen.

   It's free during the beta. Join the beta list with the link in my bio.

   Not regulated by the FCA. Not financial advice.

   #firsttimebuyer #housedeposit #debtfreejourney #savingmoney #ukpersonalfinance #budgetinguk #moneytips
   ```

5. **Location:** Lincoln, United Kingdom.
6. **Share**, then on the profile grid press and hold the post → **Pin to your profile**.
7. **Highlights:** share the post to your story, add that story to a new highlight called **Start here**, and use `highlight-1-start-here.png` as its cover (Edit highlight → Edit cover → choose from camera roll). Add the other four highlights (How it works, Beta, Questions, Founder) as you post stories for them.

### Accessibility

Instagram writes captions for video automatically. If you post the PNG stills instead, add alt text to each image (Advanced settings → Accessibility → Write alt text):

1. "Vault-It. Get out of the red and into your home. A 3D brick house being built on a grid."
2. "Your money lives in too many places. Six cards for credit card, overdraft, car finance, savings pot, deposit fund and budget notes gathered into one map."
3. "Every pound you save lays a brick. A 3D house three quarters built, with a gold bar showing 75 percent of the deposit saved, as an illustration."
4. "Clear the red, block by block. Debt marked paid off, and teal net worth blocks stacked with gold cubes. One block is 1,000 pounds, one cube is 100 pounds."
5. "You type the numbers in. A phone form with hidden figures, next to: no bank login, no card to join, runs in your browser, add it to your home screen."
6. "Free during the beta. A finished, lit 3D house and a button reading Join the beta list. Link in bio, vault-it.co."

### If you pay to boost it later

Boosting counts as an ad. Meta does not ask for FCA verification unless it decides the ad is for a financial product (see `docs/research/rules_platforms.md`, section on Meta). If it is flagged, ask for a review and explain that the app is a tracker people type their own figures into: it holds no money, gives no advice and sells no financial product.

## Net worth over time post (one video)

`out/networth-01.mp4`, 1080 x 1350, 10 s. The app's own "Net worth progress" card with Forecast on, filmed frame by frame from the real app with example figures (the seed from `tests/test_nw3d.js`): solid columns for March to November 2026, a "Today" plane, then six see-through forecast months. Marked "Example figures" on the video.

Caption:

```
Watch your net worth grow, month by month.

In Vault-It every month is a column of blocks: teal for net worth, red for debt, gold for monthly income. Today is marked, and the next six months appear as see-through blocks, forecast from your own budget.

You type the numbers in. No bank login. Free during the beta, link in bio.

Example figures. Not regulated by the FCA. Not financial advice.

#networth #debtfreejourney #savingmoney #ukpersonalfinance #moneytips #firsttimebuyer
```

Alt text (if you post the still): "A 3D chart with one column of blocks per month from March 2026 to May 2027: teal net worth, red debt and gold monthly income. A dashed plane marks today; the later months are see-through forecast blocks. Example figures."

Render it (laptop, Git Bash, in `~/Projects/Vault-It`):

```bash
PW="$HOME/Projects/Vault-It-oxanium/node_modules/playwright" MUXER="$HOME/tools/ig/node_modules/mp4-muxer/build/mp4-muxer.js" node docs/marketing/instagram/networth.js
```

## Eligent Club pitch post (two square videos)

`out/eligent-01.mp4` (your card with light effects) and `out/eligent-02.mp4` (Vault-It title slide). Captions, title options and posting notes: `ELIGENT_POST.md`.

## Re-rendering (laptop, Git Bash, in `~/Projects/Vault-It`)

`render.js` loads `brand/vault-it-brand-book.html` in Chrome or Edge, uses the brand book's own 3D house renderer, draws each frame from `slides.js`, and encodes MP4 with Chrome's built-in H.264 encoder. It needs Playwright and the `mp4-muxer` package. Neither is in `package.json`. The Oxanium worktree has Playwright; install mp4-muxer once in a folder outside the repo:

```bash
mkdir -p ~/tools/ig && cd ~/tools/ig && npm init -y && npm i mp4-muxer@5.1.3
```

```bash
cd ~/Projects/Vault-It && PW="$HOME/Projects/Vault-It-oxanium/node_modules/playwright" MUXER="$HOME/tools/ig/node_modules/mp4-muxer/build/mp4-muxer.js" node docs/marketing/instagram/render.js video
```

Without `video` it only writes the PNG stills (quick to check layout). `video 1 6` re-renders only slides 1 and 6. Fonts load from Google Fonts, so it needs internet access.
