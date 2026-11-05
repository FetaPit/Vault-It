# Vault-It automated checks

Run everything with `bash scripts/run-tests.sh` (see CLAUDE.md); the commands below run a single test.

Headless-browser (Playwright) and logic tests written while hardening sync, login and data safety.
They assume the repository is checked out at `/home/user/Vault-It` (edit the `file:///home/user/Vault-It/` paths otherwise).

```
npm i playwright esbuild @electric-sql/pglite     # + a Chromium (npx playwright install chromium)
node tests/crawl.js real 1280      # clicks every tab / sub-tab / button, reports JS errors (modes: real | new | demo, widths 390 | 820 | 1280)
node tests/xss.js; node tests/xss.js attr; node tests/xss2.js   # user text can never inject script
node tests/test_safe.js            # sync: local-vs-cloud merge, blank-never-wins, sample data, retries, direct REST fallback
node tests/test_sync.js            # every data key syncs; new device restores everything
node tests/test_syncnow.js         # sync status, "Upload everything", not-backed-up banner
node tests/test_history.js         # version history + restore + cross-device pull
node tests/test_pin_client.js      # email + PIN login flows; test_pin_server.js / test_vision_server.js: edge function logic
node tests/test_hist.mjs; node tests/test_007.mjs; node tests/test_008.mjs   # SQL migrations 006 / 007 / 008 on a local Postgres
node tests/test_authmail_server.js # send-auth-email: validation, HTML escaping, per-address / per-IP / global limits, fail-open
node tests/test_009.mjs; node tests/test_waitlist_server.js   # beta list: migration 009 on Postgres, and the waitlist-join function (double opt-in, signed unsubscribe, limits)
node tests/test_signup_page.js       # vault-it.co/sign-up and its confirm / thanks / unsubscribe pages in a browser, served through the Worker routing
node tests/test_beta_client.js     # privacy/terms wording, 429 handling, Download my data, Delete my account
node tests/journey_one_b.js        # One B's two-device journey: phone signs up (code + PIN), desktop PINs in with the same data, sync both ways on background/foreground, sign out and back, install readiness (VI_APP=<url> also checks the live service worker)
node tests/test_hb_l2_entry.js      # Level 2 onboarding: purchase-day mortgage entry (lender, balance, rate, fix end, term), panel summary, what-ifs on those figures
node tests/test_house_gl.js          # the brand-book renderer (src/hb3d/house_gl.js, no three.js): palette, lazy laying, deposit delta and stagger, type switch under 100 ms, orbit, reduced motion, every house type, ?house=legacy
node tests/test_hb_speed.js          # house builder speed (phone, CPU 4x): landed bricks drawn as one static mesh, same pixels as the old way at a fraction of the GPU work (geometry under half the old way; on CI also passes if the new way is under 20 ms, as the old-way baseline swings about 40% between hosts); page blocked far less while a deposit lays bricks; 30 frames a second at rest; cold load (tests/hb_coldload.js): still picture first, the house below the newest course at once, only that course lays, pixel ratio 1.25 laying / 2 at rest, demo house mid-build on a fresh device, reduced motion final state
node tests/test_hb_one_builder.js    # one house builder: no house flag or switch, old SVG/classic code gone, Level 2 in the brand look (paid line rises, mortgage free lit), Level 3 and own design locked under Pro, still picture without 3D
node tests/test_hb3d_app.js          # brand 3D build in the app: clean shell, bricks laid = deposit %, ROW tag and gold slice; three.js blocked -> the still picture with the same HUD figures
node tests/test_hb3d_levels.js       # Level 2 in the brand build (whole house as the hologram, the share you own laid in colour, gold tag MORTGAGE x% PAID / YOU OWN y%, MORTGAGE FREE), Level 3 locked, plot, types, floors, pinch zoom
node tests/test_hb4.js               # Level 3 locked under Pro: PRO chip, locked card, hbSetView(3) / hbUnlockL3 only toast, a saved level3 still shows Level 2 (the SVG Level 2 test test_hb3 is gone)
node tests/test_hb3d_design.js       # Your own design locked under Pro: card text only, no upload or prompt, hbDesignOn false, loadCustomModel / generateMeshyModel only toast
node tests/test_zoom.js              # 3D zoom: every house framed at the default zoom, + / - move the camera within its limits, reset
node tests/test_sw.js              # installable app: real manifest, sw.js registers over http, versioned cache, offline shell, Worker no-cache rule
node tests/test_gl_recover.js       # 3D viewports on phones: a lost WebGL context shows a note and the house viewer rebuilds itself; the net worth scene follows a cloud sync; canvas pixel budgets; three.js fetched after first paint, viewers sleep off screen and in background tabs, lite quality on demand, the coin stage draws only on a kick
node tests/test_trial.js            # trial then paid: day 1 nudge, day 25 countdown and plans prompt (no free column, Founding first), day 31 read-only vault (handlers blocked, numbers and tabs still show, Settings READ-ONLY, prompt once a day), paid untouched, phone line above the tab bar
node tests/test_plans.js            # plans pop-up and Settings: Read-only / Founder / Pioneer / Lifetime licence columns, beta prices with "£X after the beta", the seven Stripe links with e-mail and account id
node tests/test_tier_prices.js      # Founder / Pioneer / Lifetime licence on every plan surface: VI_PLANS prices, the alpha 30-day trial links with the trial terms and how to cancel, charge-at-checkout links off the trial, beta closed: Pioneer says coming soon; icons on each card
node tests/test_tiers.js            # tier gates: no item caps, design tools (upload, AI) locked under Pro for everyone, every preset house for all, read-only stops Level 2 / 3 / restore, the recorded plan read by viTier, AI reader allowance line
node tests/test_paid_gateway.js     # secure paid gateway, app side: the Stripe return URL alone unlocks nothing, the profile is mirrored both ways, typed e-mail proves nothing, no is_pioneer in the sign-in upsert, older server works as before
node tests/test_stripe_server.js     # stripe-webhook: signature checks, plan from link / metadata / price, unpaid and test-mode ignored, retry on database failure
node tests/test_011.mjs              # migration 011 on pglite: browser cannot set paid columns, events once and in order, founders, testers from the waitlist, erase unlinks events
node tests/test_012.mjs              # migration 012 on pglite: tester feedback, surveys, events and reports; RLS with no client access, checks, per-tester limits, activity totals, retention, erase
node tests/test_v08_type_scale.js     # v0.8 type scale: tiered floors (10/10.5/11.5/12.5 px) on every small size in the source, no text under 10 px as drawn at 390-1440 (agreed exceptions), no new clipping or overlap (scale on vs off), no sideways scroll at 390-1440, root, tab bar height and 3D stage size unchanged
node tests/test_feedback_server.js   # tester-feedback + feedback-digest: auth, 400/413/429, trail amounts stripped, Claude triage (bad reply stays untriaged), severity 4 e-mail, surveys, events, digest key, daily and weekly digests
node tests/test_view_mode.js        # Simplified / Advanced view: Advanced when nothing is saved, the Simplified tile list on Overview / Budget / House, achievements card, tabs, synced choice, welcome default, phone KPIs in two rows, Sankey flow animation and reduced motion
node tests/test_tester_welcome.js    # tester welcome note: shown once after the welcome flow for beta accounts, agreed wording with the 30-day first sentence, closes with Esc / outside / Let's go, phone fit
node tests/test_nw3d_first.js       # 3D net worth draws on first show even when a stale "not visible" observer entry arrives first (the phone defect of 31 Oct); fails on the old code
node tests/test_ov_tiles.js           # Round 3: forecast note says what it rests on (no line before two real months); assets and liabilities on one scale; debt left in soft red, paid off in green from the right
node tests/test_bd_flow3d.js          # Round 3: income flow at the top of Budget, light teal divider running on from it, Flow | 3D tree map (areas in proportion, rises in, reduced motion finished)
node tests/test_inv_preview.js         # Round 3: the item viewer shows the saved preview when the full photos are on another device; tapping the picture opens it
node tests/test_value_hist.js         # Round 3 (8): each wealth item keeps one value reading a day with its source; the link suggests a source from the name, else stays manual
node tests/test_icons.js              # Icons: embedded coin logos work offline, no emoji fallback; inventory and liability items are the brand block, blank until a brand icon is picked; old emoji choices map to brand icons
node tests/test_bank_logos.js         # Bank and platform logos: cash accounts get their bank's logo from the name (initials offline, brand bank icon when unknown); more platforms for pies
node tests/test_feedback_client.js     # Tester feedback in the app: button, sheet, picture with figures hidden, context without figures, activity log and its Settings switch, moment prompts, privacy notice
node tests/test_help_centre.js       # Help centre: ? in the header, tour once after the welcome and Pete's note with a skip, Settings replay, FAQs, chat from FAQs and own numbers, help-ask and unanswered questions filed
node tests/test_help_server.js       # help-ask (Haiku, guide only, amounts stripped, limits, unsure) and tester-feedback e-mailing each unanswered help question
node tests/test_crypto_live.js         # Round 3: crypto prices fetched by themselves (CoinGecko mocked), tokens held, price source and age, bigger icons, last price kept on failure
node tests/test_i3d_live.js           # Round 3: desktop, hover a model tile to orbit it by click and drag (one live view), click opens the viewer; touch keeps the picture
node tests/test_ledger.js             # Round 3: the side bar ledger lists every money figure with its icon, each equal to its tab; also the Savings rate line and the stale-price note
node tests/test_nw3d_labels.js       # Net worth in 3D: floor names never overlap or leave the stage (makeNW, 5a5f32b)
node tests/test_signoff_a.js         # Phone sign-off A: Feedback pill never covers a 3D stage; Net worth floor names sit on the income flow label plate
node tests/test_signoff_b.js         # Phone sign-off B: old green item pictures redrawn in the model colours; phone tap makes the tile a live orbit view
node tests/test_signoff_c.js         # Phone sign-off C: Cash and savings 3D ground grid half the size and fading into the fog
node tests/test_ui_round2.js         # v0.7 UI round 2 (for alpha 0.8), Net worth tile: no forecast note in the 3D card; forecast from the Budget (savings and investments only, investments compound at 4%, debt repayments after interest, shortfall comes off, no budget no growth) with a full-width note; History, Goals, Snapshots as collapsed pills at the foot of the tile
node tests/test_signoff_d.js         # Phone sign-off D: income flow bands get a bright colour stroke and leaders; only two reds, clearly apart, AA text
node tests/test_signoff_d.js         # Phone sign-off D: income flow bands get a bright colour stroke and leaders; only two reds, clearly apart
node tests/test_footer.js             # footer: approved disclaimer, Privacy notice / Beta terms links in the app and landing footers, type floors, --footer-h tracks the fixed footer
node tests/test_v08_chrome.js         # v0.8 chrome: Message the Dev last on Overview and gone from every other tab (v0.9.1), Feedback fixed bottom right, footer collapses to the FCA strip (full on scroll up / page end), compact category pills (below Cash flow), synced scroll rails above and below the flow charts
node tests/test_csp_report_only.mjs   # Worker: Content-Security-Policy-Report-Only lists every outside host the app calls; enforced CSP unchanged
node tests/test_mobile_nav.js       # phones: tab bar fixed to the bottom of the screen, seven tabs at 44px, header one row, footer in flow; Connections out of the menu bar and into Settings at every width
node tests/test_nw3d.js            # net worth in 3D (on by default): flag off unchanged, 3D | Graph toggle, same numbers in both views, debts grouped by kind (cards stacked in one column, each in its own colour), zoom buttons / ctrl+wheel / reset (VI_APP=file:///… to test another copy)
node tests/test_email_brand.js   # every e-mail the functions send: brand lockup (Vault, brick, teal It), Night colours, Syne, tagline, FCA line
```
node tests/test_v07_e16.js         # v0.7 E16: "Add to your savings" gone, button "Lay the bricks" with the brick-wall icon, input aria-label
node tests/test_v07_e17.js         # v0.7 E17: amount box 56 px, 24 px mono digits, gold pound, 599/600 px layout, live "£n lays n bricks" line
node tests/test_v07_e18.js         # v0.7 E18: house camera buttons in a bottom-centre pill, sprite icons, no emoji, orbit glow
node tests/test_v07_e1.js          # v0.7 E1: bottom tab bar at 599 px and under only; icon nav at the top from 600 px
node tests/test_v07_e2.js          # v0.7 E2: the roadmap opens centred on the next achievement, each time the tab opens
node tests/test_v07_e3.js          # v0.7 E3: gold roadmap tile gone; stage detail on tap (Next up, Met. Waiting on, ring, close x/Esc)
node tests/test_wealth_roadmap.js   # Wealth Roadmap (3 Nov): tab label, one roadmap card mirrored, octagon tokens with studs and tiers, levels, XP, side quests, badge tokens, phone floor
node tests/test_v091r2_roadmap.js   # v0.9.1 round 2 chunk C (4 Nov): wide ground plane, leaning dividers, section colour outlines, grey only on slates not achieved (C2), boxed name labels (C2), section names painted on the ground in perspective (C3), teal/purple/gold graduation, 50 achievements, profile card reads the roadmap level
node tests/test_toast_race.js      # shared toast (v0.9.1): the opening build unlocks badges quietly, showToast() and toast() share one hide timer counted from when it is drawn, so no older timer or long task hides a newer toast
node tests/test_v07_e9.js          # v0.7 E9: budget spending groups folded by default; a saved choice wins
node tests/test_v07_e10.js         # v0.7 E10: expense bar arrow: sprite chevron 20 px in a 44 px target, down folded, up open
node tests/test_v08_cards.js        # v0.8 D2: budget cards (no separator, 30-32 px icons, 10 px titles, titles clear of the amount) and the one House progress tile (iconned stats, house-type milestones, no dead columns)
node tests/test_v091_house_xp_deposit.js  # v0.9.1 G: house milestones pay Wealth Roadmap XP once (E9: 20 to 200, 300 last; silent backfill; latched) and the deposit account note (E26: logo, AER, Lifetime ISA bonus estimate not added to saved, First Time Buyer ISA not open yet)
node tests/test_v091_debt_cards.js  # v0.9.1 E33: every debt type is a 3D tile with its lender icon (no chip, number or network off cards), pays down right to left, undo, provider field, old saves load
node tests/test_v091_debt_reverse.js # v0.9.1 E33b: type icon under the logo on debt tiles; the back shows the debt-free date (estimate), interest this month and year, last three payments and paid so far
node tests/test_v07_chips.js       # v0.7 E4 labels: black chips on the flow diagram, on #bd-sankey, Night and Daylight
node tests/test_v07_demo_first.js  # v0.7: the first demo visit shows the Dashboard and Budget cash flow without a reload
node tests/test_v091_cash3d.js     # v0.9.1 chunk A: a gold plate and flag per cash account (bank mark, amount, rate), the intro drop, "Add to vault" per metal, the draw budget
node tests/test_v091_cash3d_frame.js  # v0.9.1 cash 3D phone framing: at 390 no coin sits under a flag (projected), desktop camera unchanged at 1280, flag floor and clamp kept; served over http
node tests/test_v091_cash3d_look.js   # v0.9.1 cash 3D look: Budget-style account chips (brand stroke and balance, white name, small logo, 10.5 px floor, off coins, chips and total, same size zoomed), real £1 coin shapes, a block of 1,000 is 100 stacks in one shape; served over http
node tests/test_v092_cash3d_solid.js  # v0.9.2 cash 3D solid stacks: every coin shape closed (0 open edges), a block is 100 closed stacks, and from low side cameras a ray beside every stack hits its own wall (390, 1280, £ and $); served over http
node tests/test_v092_cash3d_caption.js  # v0.9.2 cash 3D caption: with 3D on the line under the stage is the 3D one at every step (built, re-drawn off screen, in view, 390 and 1280); without WebGL the flat view keeps its own; served over http
node tests/test_v091r2_coins.js      # v0.9.1 round 2 R16: coins open like the bricks (newest row one coin at a time, finished stacks at once on a later visit, only new money lays), in view only, flat picture until the first frame, full pixel ratio at rest, reduced motion, bars too
node tests/v3_measure.js           # not a test: prints the cash and metals stages' draw calls, triangles and frame times at 390 px on a 4x CPU, for before and after numbers
node tests/test_v091_model_library.js  # v0.9.1 E30: the 3D button opens a search over models/catalog.json (title, tags, item, set), pick attaches and persists, CC-BY credit on the item and in a credits panel, stand-ins say "Close match", files load only when picked or opened, service worker and build handle models/, no new host, 320/390 px
node tests/test_secondhand_server.js  # v0.9.1 E28: secondhand-estimate edge function (junk filter, trimmed median and IQR, haircut, condition factors, minimum 5, cache, flags off means no call), fixtures in tests/fixtures/secondhand
node tests/test_v091_secondhand.js    # v0.9.1 E28: condition field, estimate needs a tap to apply, "Not available yet" with manual links, old items untouched, wording, 10.5 px floor
node tests/test_v091_chrome.js      # v0.9.1 chrome: rotating dial mark (turns on load and click, static under reduced motion), bigger desktop menu bar (icons 24 / 22 px, no zoom), pinned Assets sub-menu (one row of six icons on phones), Message the Dev on Overview only, sidebar colours, crowdfund Vaulter card (prices from VI_PLANS, real counts, Open days)
node tests/test_014.mjs             # migration 014 on pglite: campaign_counts() gives backers per paid plan and nothing personal; anon may call it
node tests/test_v091_stocks_return.js # v0.9.1 E17: Stocks tiles judged from when a holding was added (entry price kept in addPx, avgCost never rewritten), "Check your average cost" nudge, tiles reconcile
node tests/test_v091_stocks_map.js # v0.9.1 E19, E20: Stocks tree map is taller, no label clipped or under 10.5px, tiny holdings merge into "Other (n)" with a list, fund names not codes, logos in rows and tiles with initials fallback
node tests/test_v091_crypto.js # v0.9.1 E32: Crypto gets the Stocks dashboard: three tiles judged from entry price, holdings grouped by wallet, donut, Bars | Tree map (shared dtmFitMap), coin badges, old {sym,amount,price} saves untouched
node tests/test_v091_overview_budget.js  # v0.9.1 E4/E23/E5/E6: Cash Flow tile 3D only, Net worth window +20%, Budget pills full width, Budget 3D viewport larger
node tests/test_v091_inventory_files.js  # v0.9.1 E29: inventory 3D uploads: .glb .gltf .stl .obj .fbx .3mf preview, persist across reload, old glb-only record opens, STL/OBJ tinted, oversize and wrong type error
- `test_v091_cash_accounts.js`: v0.9.1 E15/E16, cash account interest rate (AER), add and take out with Undo, over-balance refused, old saves load, pence-exact.
- `test_v091_demo_guard.js`: v0.9.1 data-loss guard: a device holding any saved data (only pos_al1, ht3, cash, debts or journey, or several keys with vi_declined_demo cleared) never boots into the demo or has a key overwritten, at normal speed and with a slow start; a new device still gets the demo. Serves the folder of `VI_INDEX` over http://127.0.0.1 itself, because headless Chrome sometimes empties or hides localStorage on file:// (never seen over http).
node tests/test_v091_3d_fit.js  # v0.9.1: Net worth plate and Budget tree map never touch the stage edges with real data, at 1100 to 1920 wide, through the idle camera swing
node tests/test_v091_model_library_all.js  # v0.9.1 E30: every one of the 233 library models attaches to an item with a preview and no page error (real files, local http)
node tests/test_v091r2_item_viewer.js  # v0.9.1 round 2 R17/R18/R21: item 3D viewer draws once a frame (no doubling loop), a click on X closes it fast and leaves nothing drawing, X top right, card remove X shows over the 3D picture, teal stage with white light, no Discogs search; F2: no layout read per frame (size from the ResizeObserver), canvas follows a resize, decorative animations paused behind the viewer, phone 4x CPU frame cost reported
node tests/test_v091r2_house_type.js  # v0.9.1 round 2 chunk D (R12 to R15): house types as roadmap slates, chip top right of the viewport, panel with build status, compressed stat tiles and type change, no type tiles in the tab, onboarding slate picker; saved type, price, deposit and brick value unchanged
node tests/test_v091r2_chrome.js  # v0.9.1 round 2 chunk A (R1, R23 to R27): wordmark in proportion with the dial and the dial swinging both ways, credit-card profile card with a bigger still photo, Daylight page background more saturated, Night header in Daylight (?hdr=paper keeps the paper one), the animated Night/Daylight switch (role=switch, sizes, 44 px hit area, keys, contrast, reduced motion, no first-paint animation)
node tests/test_pitch_page.js      # vault-it.co/pitch-Eligent: 15 slides, no sideways scroll, Present one-slide view (keys, buttons, swipe, Esc), live 3D viewports (Net worth in 3D, Net worth progress) with demo data
node tests/test_viewport_perf.js  # v0.9.2 viewport speed budgets (cash, metals, wealth inventory, liabilities on a phone profile, CPU 4x): one WebGL renderer for every item tile and full-viewer open, the model read once from tile to full viewer, one draw a frame, nothing drawing after close, at most 3 drawing-buffer size sets per cash or metals open, draw calls and triangles; wall-clock printed, not gated
node tests/perf_viewports.js      # v0.9.2 measurement, not pass/fail: cold open to first 3D frame, long tasks and blocking time in 6 s, tap p95, draw calls, modal open and close, for the four viewports (VI_ROOT to measure another checkout, PERF_ONLY, PERF_OUT, PERF_PROFILE)
node tests/test_pete_card.js       # vault-it.co/pete: digital business card flips (tap, Flip button, drag in 3D), house build corner on the front (still with reduced motion), Save contact vCard, no placeholders, no outside hosts
node tests/perf_baseline.js      # v0.9.2 baseline, not pass/fail: every 3D viewport against the House Builder at 390 and 1100 px, CPU 4x: tap to first draw, blocking time, draws a second idle and while turning, draws per frame, canvas size, drawing after the tab is left (VI_ROOT, PB_ONLY, PB_WIDTHS, PB_OUT)
- test_v092_coin_rims.js, test_v092_crypto_tiles.js: v0.9.2 polish (every coin's own rim colour; Pedro's chunk G nits on the crypto tiles)
- test_v092_light_chrome.js: the install banner and the footer keep the Night look in Daylight (real rendered pixels, AA text, theme toggled four times)
