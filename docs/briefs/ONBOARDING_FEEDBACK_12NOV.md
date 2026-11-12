# Onboarding screen: rollout feedback (owner, 12 Nov 2026)

Brief by David (ops). Build session: one, on its own branch off `brand-rollout`. Screen: the first welcome screen (`src/app/welcome/welcome.html` `#wz-s1`, `welcome.js`, `welcome.css`). `index.html` is generated: edit `src/app/*`, then `node tools/build_app.js`.

## The owner's words (with a screenshot of the screen at phone width)

> Do not ask for email address as it should auto populate from registering before.
> For the Where are you right now, add up to date iconograpohy from brand book.
> Remove whole app no card as we are asking for card details now.
> Update font and add 30 days free in header font in teal with free in gold
> Make the icons for the house type in the app minuture 3D models of our exisiting models that we use in the house builder that can be rotated with the same viewport background
> Instead of dream home target, put Target Home Value
> Add Target Deposit Value. Ensure all this data pulls through to the tool

## Who builds what

| # | Point | Where it goes |
|---|---|---|
| 1 | Email not asked again | This build, chunk 1 |
| 2 | Brand icons on "Where are you right now?" | This build, chunk 1 |
| 3 | Remove "The whole app, no card" | **Card wall build** (`feat/card-wall`): the line is true until the wall ships, so it changes with the wall, not before |
| 4 | Heading "30 days free", teal with "free" in gold, header font | **Card wall build** for the heading and the line under it (same two lines as point 3); this build for the rest of the screen's type |
| 5 | House type tiles as small rotatable 3D models | This build, chunk 2 |
| 6 | "Dream Home Target" becomes "Target Home Value" | This build, chunk 1 |
| 7 | "Target Deposit Value" added; every answer pulls through | This build, chunk 1 |

## Queue order (queue-keeper, 12 Nov: STOP until this is respected)

An older open item comes first and covers point 7: "Onboarding answers feed the tools and the house" (owner, 8 and 10 Nov; everything answered pre-fills, then Budget lets the user split the income into separate income streams; fintech-dev, needs Pedro's UX spec). The build does that item first, as its own commit, then chunk 1 and chunk 2 below. Point 7's pull-through test belongs to that first commit.

Related lines to read before starting, so nothing is built twice: "Welcome screens type" (branch `v092/welcome-type`), "Google sign-in and a new first-run onboarding", "Readable futuristic heading font".

## Open decisions (the owner's, asked 12 Nov, not yet answered)

1. **Heading font.** On 6 Nov the owner picked Oxanium to replace Syne for headings ("Apply to website, pitchdeck website tool app etc."). It never reached the app: no Oxanium in `src/app`, and the branch `brand/oxanium-tagline` is not on origin. CLAUDE.md still says Syne, DM Sans, Share Tech Mono only. "Update font" most likely means this. David's recommendation: Oxanium on every heading in the app, the font rule updated to match. Until the owner answers, point 6 of chunk 1 does not start.
2. **Target Deposit Value, exact pounds or nearest 0.1%.** See chunk 1 point 4. David's recommendation: exact pounds.

This build does **not** edit the `<h2 class="welcome-h2">` and `.welcome-sub` lines at the top of `#wz-s1` (welcome.html lines 94 and 95 on brand-rollout e99f9ec). The card wall session owns them.

## Chunk 1: the form (one commit, ship-item)

1. **Email.** What exists: `viWelcomePrefill()` (welcome.js:86) hides the email field and shows "Signed in as ..." when `_supaUser` is set; it is called from `auth/sync.js` 486 and 714. The owner still saw the empty email field after registering. Find the path where the screen shows while the email is already known (the session not yet read when the screen paints, an emailed-code or PIN registration, `vi_session`, `vi_last_email`, the demo then sign-up route) and write the failing test first. Done means: anyone who reached this screen by registering or signing in never sees an email field; the address they registered with is saved to the profile exactly as before. The field stays only for the one case where no address is known at all.
2. **Icons.** The four options use an emoji and three text glyphs (`💳 ◈ ⌂ ◉`). Replace with pack v2 sprite icons (`<svg class="vi-ic"><use href="#vi-..."/></svg>`, see `brand/vault-it-brand-handover.md` Phase 3 and `brand/vault-it-icons.json` for ids and colour tokens). Pick the icon each stage already uses elsewhere in the app (debt, savings, house builder, wealth) so the screen matches the menu. No new icons drawn, no emoji left on the screen.
3. **Label.** "Dream Home Target (£)" becomes "Target Home Value (£)" here, and anywhere else the app still says "Dream Home Target" for the same figure (grep; the comment at welcome.js:128 names it). Tests that read the old label change with it.
4. **Target Deposit Value.** A new £ field under Target Home Value.
   - The app does not store a deposit in pounds: it stores `state.depositPct` (1 to 60, default 20) and `depositTarget()` is `state.target * depositPct / 100` (`house/tracker.js:7-9`, `house/levels.js:11-15`). Standing rule: do not change how deposits, prices, house types, levels or saved data work.
   - So the typed value is saved as the percentage it is of the home value, through the same path as the House builder's own deposit control. No new saved field.
   - **Flag for the owner (decide before coding, David to ask):** the House builder rounds the percentage to 0.1, so a typed £25,000 on £237,000 would come back as £24,885. Recommended: keep the percentage at full precision when it comes from this field so the House builder shows the pounds typed, and show one decimal place in the percentage box. If that cannot be done without changing saved data, stop and report.
   - Empty field: nothing is guessed. The existing 20% default applies and the hint says so in plain words, with the figure it comes to once a home value is typed.
   - Outside 1% to 60% of the home value, or typed with no home value: a plain hint, nothing saved for it.
   - Follow the `fintech-engineering` skill for the arithmetic and rounding.
5. **Pull-through.** One test that fills every answer on the three welcome screens and then reads the tools: first name and email on the profile; the picked stage sets where the plan starts; house type, Target Home Value and Target Deposit Value show in the House builder (type, price, deposit target, brick value still `depositTarget * 0.77 / bricksTotal`); the deposit pot lands as before; income shows in the budget. Check the queue for the open v0.95 item on onboarding answers feeding the tools and close the overlap rather than build it twice.
6. **Type.** Bring the screen's text to the brand rules: Syne for headings and question labels, DM Sans for body and option text, Share Tech Mono for figures and small caps labels; type floor respected at 390 px. `pedro` reviews before `rollout-qc`.

## Chunk 2: house type tiles in 3D (separate commit, ship-item)

- The six tiles (`#w-htypes .w-ht`, terraced, semi, detached, mansion, flat, apartment) show the House builder's own models for those types, small, on the same background as the House builder viewport, and each can be turned by drag or swipe. The name stays under each. Picking a tile works exactly as now (`wPickHouse`).
- Read first: `src/hb3d/kit.js`, `src/hb3d/viewer.js`, `tools/build_hb3d.js`, `docs/HB3D_KIT.md`, `docs/HOUSE_BUILDER_3D_SPEC.md`. Engine edits go in `src/hb3d/*`, then `node tools/build_hb3d.js`. The level rules must keep working; Level 3 and "Your own design" are not touched.
- One renderer for the six tiles, not six WebGL contexts (phones cap them). The 3D starts only when the tiles are in view; until the first frame, and wherever 3D is not available, the still picture shows as now.
- `prefers-reduced-motion`: no idle spin; turning by hand still works. Turning a tile must not scroll the page sideways and must not trap vertical scrolling.
- Run the `stress-doctor` agent on the welcome screen at phone-class load before the commit: time to first paint of the screen must not get worse than before the change by more than its noise, and the screen must stay responsive while the tiles load. If it cannot be met with six live tiles, report with the numbers and the nearest thing that can (for example stills that become live on touch) rather than shipping a slow first screen.
- Keyboard: tiles stay buttons, focus visible, arrow keys turn the focused model.

## Chunk 3: Meet the founder box and the note reworded (separate commit, ship-item)

Owner, 12 Nov, with a screenshot of the tester note (`#tester-welcome` in `src/app/paywall/offer-modals.html`):

> We need to add a meet the Founder box above this with my portrait and few deats. Reword by just encouraging to send any testing data to me. say a personal thanks becoming a Vault-it Pioneer and have 30 days on me plus lifetime discounted subscriptions and a limited lifetime license pre launch.

- **The box**, above the note: eyebrow "Meet the founder", the portrait (round, gold ring, as on the landing page), "Pete Thickett", "Founder, Vault-It", "Designer, Lincoln". Portrait file: `site/founder.jpg` (the landing page serves it as `img/founder.jpg`); it must be served from the app's own address, so add it to the app build. No new outside host. Details are only what the landing page already says about him: nothing invented.
- **The note, David's draft (the owner approves it on the screenshots before it ships):**

  > Thank you, personally, for becoming a Vault-It Pioneer. Your first 30 days are on me. As one of the first in, you keep the beta price for as long as you stay subscribed, and you get first call on the 100 Lifetime licences before launch. Put your numbers in, made-up ones are fine, then tell me what you find: what is confusing, what is broken, what you wish it did. I read every message.
  >
  > Pete

- **Every promise checked against what is real:** "30 days on me" is the 30-day trial on the Stripe links; "the beta price for as long as you stay subscribed" is what the paywall already says ("Your price stays the same while you stay subscribed", `paywall.html:47`); "100 Lifetime licences" is the real limit on the `founder_tester` link. No other figure, no countdown, no "only N left" unless it is read from Stripe.
- "Send any testing data to me" is worded as "tell me what you find": the note must never read as asking people to send their own financial figures by email.
- Buttons stay: "Let's go" and "Tell Pete something" (mailto hello@vault-it.co).
- The line "no card needed" in this note is removed by the card wall build (its chunk 5). This chunk starts only after that wording has landed on `brand-rollout`, or is built on top of the card wall branch, so the two never edit the same line.
- **Where it shows (the owner's call, asked 12 Nov):** as asked, above the note once the app opens. David's recommendation: show the box at the top of the first welcome screen as well, before the questions, because a face and a personal thank you earn trust before the card is asked for, not after.

## Where the plans show in the onboarding (owner asked 12 Nov; David's recommendation)

1. Sign up (Google or email).
2. Founder welcome: the box, the thank you, "30 days on me". No ask.
3. The two question screens.
4. Your plan: their own numbers, their house, their first bricks.
5. The plans straight after it: Vaulter monthly, Pioneer yearly, Lifetime licence, with the day 31 sentence. Card through Stripe. This is where the card wall already sits ("After the questions", owner, 12 Nov).
6. The app opens with the tour and the note from Pete.

Reason: the person has just put the work in and is looking at something made from their own answers. Before the questions they have seen nothing worth a card; later is not possible with a card wall for everyone. The demo stays open for anyone who wants to look first. No change to the card wall build is needed for this.

## Rules that apply (from CLAUDE.md)

British English, sentence case, no em dashes. No new outside hosts. Fonts: Syne, DM Sans, Share Tech Mono only. "Not regulated by the FCA. Not financial advice." stays visible. Pages never scroll sideways. Never clear data on a device. No Supabase, secrets, migrations or edge function changes. Screenshots of the changed elements at 390 and 1100 px, Night and Daylight, sent to the owner. No release from this build: it merges to `brand-rollout` only on the owner's word, one chunk at a time.

## Done means

- Chunk 1: named tests green (new ones plus `test_welcome*`, `test_v095_demo_signup`, `test_hb_brand`, `test_beta_client`, `test_signup_page` where touched), shots sent, `pedro` and `rollout-qc` PASS, commit on the build branch, queue line updated on `brand-rollout`.
- Chunk 2: the same, plus the `stress-doctor` numbers in the commit message.
