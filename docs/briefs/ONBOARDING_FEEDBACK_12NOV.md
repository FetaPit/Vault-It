# Onboarding screen: rollout feedback (owner, 12 Nov 2026)

Brief by David (ops). Screen: the first welcome screen (`src/app/welcome/welcome.html` `#wz-s1`, `welcome.js`, `welcome.css`). `index.html` is generated: edit `src/app/*`, then `node tools/build_app.js`.

**The plan of record (section "Plan of record, 12 Nov evening" at the end) replaces "Who builds what", "Open decisions" and anything else it contradicts.**

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

## Plan of record, 12 Nov evening

Owner, 12 Nov: "Restart this analysis of this round of edits, understanding intent and what is needed, Plan effectively with relevant agents, then push to existing or new sessions if needed to work in tandem". Reviews behind it: an architect on the data (pull-through, email, deposit), an architect on the 3D tiles, Pedro on the screen, the founder box and the plans placement.

### Owner's decisions (12 Nov)
- Expenses: **yes, one rough row**. The welcome expenses answer pre-fills Budget as "Monthly spending (rough) £X"; each real expense added comes off it until it is gone. Income works the same way. Nothing is ever counted twice.
- Heading font: **"Use the custom font we are building Vault-form"**. Vault-form (D+ Heading cut) is built in the brand typeface session (branch `claude/great-hopper-xtzoi8`), which owns the app-wide swap. This round never hard-codes `'Syne'`: every heading it writes or touches uses `var(--font-display)` (`src/app/shell/tokens.css:23`), so it changes to Vault-form in the same pass as the rest of the app. Replace the 13 hard-coded `'Syne'` in `welcome.css` with the variable.
- Founder box: **both places**. A compact strip at the top of welcome screen 1 and the full box above the note.
- Target Deposit Value: **exact pounds** (`state.depositPct` kept unrounded when it comes from this field; shown to one decimal place).
- Plans: after "Your plan", where the card wall already puts them. No build change.

### Findings that are now in scope (architect, file:line on brand-rollout 60e2330)
- A home value typed with no house type picked is lost: `welcome.js:217` calls `saveHouse`, which does not exist; and `shell/init.js:48` resets `target` from `prices[houseType]` on load. Fix: write `state.prices[state.houseType]` and `target`, then `save()`.
- The email field shows on every route because the only prefill (`viWelcomePrefill`) runs after network work (`sync.js:486`, `:714`), and never on the local PIN route (`auth.js:903-925`). Fix: `viKnownEmail()` in `welcome.js` read synchronously at load from `_supaUser`, `_authOTP`, the `sb-*-auth-token` session, an unexpired non-demo `vi_session`, then a non-demo `vi_user`; never `vi_last_email` (shared devices). The registered address wins over anything typed.
- Adding an income stream in Budget adds on top of the onboarding row (double count). Fix: draw the onboarding row down (`budget.js` `addIncome`, and the same in `addExpense` for the new expenses row), plus a nudge in `bdRender`.
- The welcome expenses answer is saved only to `vi_user.expenses`; the phone fields no longer exist (leave phone alone).
- Deposit display needs one decimal at `house/levels.js:61`, `:101`, `fire-roadmap.js:104`, and `step="any"` at `house.html:133`.
- Type: `.welcome-sub` and `.welcome-opt` use the heading font (should be DM Sans); `.welcome-field label` is under the 10.5 px floor (raise to `--vi-fs-1`); inputs 16 px at 390 px.
- Stage icons (Pedro): debt `vi-debt-tracker` (`--red`), savings `vi-piggy` (`--green`), deposit `vi-house-builder` (`--gold`), wealth `vi-net-worth` (`--teal`); icon colour never changes on selection.
- Pedro's final note wording (owner approves on the screenshots): "Thank you, personally, for becoming a Vault-It Pioneer. Your first 30 days are on me. You keep your subscription price for as long as you stay subscribed, and you get first call on the 100 Lifetime licences before launch. Try it with your own numbers or made-up ones. Then tell me what is confusing, what is broken and what you wish it did. Please don't email me your real figures. I read every message. Pete"

### Who builds what (three sessions, in tandem, each on its own branch cut from `origin/feat/card-wall`)
The card wall branch already changes `welcome.html`, `welcome.css`, `welcome.js`, `offer-modals.html` and `manifest.json`, so both new branches start from it to avoid conflicts. Nothing merges to `brand-rollout` without the owner's word. Merge order: card wall, then A, then B.

| Session | Owns (only these) | Builds |
|---|---|---|
| **Card wall** (existing, `feat/card-wall`) | heading lines at the top of `#wz-s1`; a new founder strip above them; `#tester-welcome` in `offer-modals.html`; founder styles inside `offer-modals.html` (a `<style>` block), never `welcome.css`; the portrait asset in the app build | Chunk 6: Meet the founder strip (screen 1) and box (above the note), Pedro's note wording, both shown to the owner on screenshots before the commit |
| **A: onboarding data and form** (new) | `welcome.js` (except `viWhenOpen`/`initWelcome`/the card wall's lines), the rest of `welcome.html` `#wz-s1` to `#wz-s3` except the six tile buttons (lines 129-136 on brand-rollout) and the heading/founder lines, `welcome.css`, `budget.js`, `house/levels.js`, `fire-roadmap.js`, `house.html:133`, new tests | 1) Answers feed the tools (older queue item) with the expenses and income rough rows and draw-down; 2) email never asked when known; 3) Target Home Value label, Target Deposit Value field (exact pounds), one-decimal display; 4) stage icons and type fixes |
| **B: 3D house tiles** (new) | `src/hb3d/house_gl.js` (new `H.TileHouses`) then `node tools/build_hb3d.js`; new parts `src/app/welcome/house-tiles.js` and `house-tiles.css`; their two entries in `src/app/manifest.json`; optionally `.w-ht .ico` in the Night selector at `tokens.css:6` | One WebGL canvas over `#w-htypes`, scissored viewport per tile; the six houses built in a Worker; draws on demand; still slate until the first frame and wherever WebGL is weak or missing; drag sideways or arrow keys turn, vertical scroll untouched, reduced motion no idle spin; pauses the sign-in house while live; disposed when the overlay closes. Measured build cost: about 1.4 s for all six on the laptop, so 4 to 7 s on a phone, all off the main thread. Optional last commit: the sign-in house follows the picked house type |

No session edits another session's lines. If one needs a change in another's area, it asks David (the ops session) instead.
