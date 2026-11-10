# Vault·It — audit of the current landing page (`landing.html`)

Phase: Audit · Auditor run: 2026-10-27 (all times UTC) · Repo: `/home/user/Vault-It`, branch `Pioneer_v3`, HEAD `fd279aa` · I changed nothing in the repo.

Scratch evidence (all under `/tmp/claude-0/-home-user/2a4eadf5-0fc4-5805-8296-f5c90b3cc25f/scratchpad/funnel/`):
- `shots/current_mobile_top.png`, `shots/current_mobile_full.png`, `shots/current_desktop_top.png`, `shots/current_desktop_full.png`. These are faithful to production: three.js returns 404 and Google Fonts and supabase-js load.
- `shots/*_intended.png`: the same views with a working three.js (r128 from `tests/vendor`), showing what the design was meant to look like.
- `shots/stall_supabase_cdn_4s.png`: the hero 4 s into a load while the supabase-js CDN is stalled. The hero is blank.
- `shots/crop_mobile_gap.png`, `shots/crop_mobile_waitlist.png`, `shots/crop_mobile_pricing.png`, `shots/founder_avatar.jpg` (the decoded inline image).
- Scripts and logs: `shotscript/shots.js`, `shotscript/perf.js` with `shotscript/perf.json`, `shotscript/log_prod.json`, `shotscript/log_intended.json`, `shotscript/stall.js`, `shotscript/sw.js`, `shotscript/probe.js`.

Network note: in this sandbox, cdn.jsdelivr.net, data.jsdelivr.com, unpkg.com, cdnjs, api.metals.live, vault-it.co and legislation.gov.uk could not be reached directly. Google Fonts, the npm registry and `legpubblzgknxdtvsant.supabase.co` could. I reached jsDelivr, legislation.gov.uk and others through the Exa fetch tool instead. Every external fact below carries its URL and retrieval date. I did not see the live vault-it.co HTML. This audit is of the repo file that `tools/build_site.js:10` publishes as `dist/landing/index.html`.

---

## 0. Executive summary: the 12 things that matter most

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | **BLOCKER (broken)** | The three.js hero never renders in production. `landing.html:772` loads `three@0.169.0/build/three.min.js`, which does not exist: three.js stopped shipping UMD builds at r160. The inline scene script then throws `ReferenceError: THREE is not defined`. | jsDelivr file listing for three@0.169.0 has no `three.min.js`; it has only `three.cjs`, `three.module(.min).js` and the webgpu builds (https://data.jsdelivr.com/v1/packages/npm/three@0.169.0?structure=flat, retrieved 2026-10-27). A fetch of the URL returned `CRAWL_NOT_FOUND`. The npm tarball `three-0.169.0.tgz` has the same `build/` contents. Playwright logged `pageerror: THREE is not defined` (`shotscript/log_prod.json`). |
| 2 | **BLOCKER (conversion)** | The whole hero (eyebrow, H1, sub, CTAs, badges) stays at `opacity:0` until the last `<script>` on the page runs. That script sits after a **parser-blocking** supabase-js tag (`landing.html:914`, 218 KB). If that CDN is slow, blocked or stalled, a visitor sees an empty black screen. | `.reveal{opacity:0}` (`landing.html:288`), reveal script at `landing.html:972-985`. With supabase-js stalled, hero opacities at 4 s were `0,0,0,0,0,0` (`shots/stall_supabase_cdn_4s.png`). Under a throttled mobile profile, LCP was about 2.3 s even though FCP was about 0.55 s (§2). There is no `<noscript>` fallback, so with JS off the page body is blank. |
| 3 | **BLOCKER (conversion)** | A full screen of empty black sits between the hero and the first section. `.hero-section{min-height:100vh}` and `.page-body{margin-top:100vh}` add together, so content starts at 2×vh. The empty band was meant to sit behind the 3D canvas, which is broken (#1). | `landing.html:62,100`. Measured `#problem` top = 1688 px on a 390×844 viewport and 1800 px on 1440×900 (`shotscript/probe.js`). See `shots/crop_mobile_gap.png`. |
| 4 | **BLOCKER (legal)** | The scarcity is false. "33 Pioneer Spots Remaining" is computed as `33 − waitlist rows`. A waitlist row is not a spot, Pioneer is an unlimited Stripe subscription, sign-up to the app is open, and the counter falls back to a hard-coded "21". | `landing.html:334,348-351,955-966,699,707`. Live count was 1 at 22:08 and 2 at 22:18 (RPC `waitlist_count`), so visitors see "32/31 remaining". DMCC Act 2024 Sch. 20 para 7 and para 20 are banned practices (https://www.legislation.gov.uk/ukpga/2024/13/schedule/20, retrieved 2026-10-27). |
| 5 | **BLOCKER (legal)** | Three named testimonials ("Sarah M., Manchester", "James T., Bristol", "Priya K., London") sit under the heading "From our pioneers". The database holds **0 pioneers** (profiles: 4 rows, `is_pioneer` true: 0, queried 2026-10-27 ~22:18). The quotes arrived in the same design commit as the 3D hero (`ca95d4f`, 2026-06-21), months before a beta existed. No source or consent record exists anywhere in the repo. | `landing.html:630-651`. Sch. 20 para 13 (fake consumer reviews) and CMA fake-reviews short guide (https://www.gov.uk/government/publications/fake-reviews/short-guide-for-businesses-publishing-consumer-reviews-and-complying-with-consumer-protection-law, published 2025-04-04, retrieved 2026-10-27). |
| 6 | **BLOCKER (legal, app/demo step)** | The demo the landing page links to ("Try live demo" goes to the app) shows real public figures as company officers. It shows "Warren Buffett & Charlie Munger — Strategic Advisors, Vault·It", "Gary Stevenson — CFO, Vault·It" and "Simon Squibb — COO, Vault·It", each with invented quotes. Charlie Munger died in 2023 (background knowledge, not verified online in this run). | `index.html:10156, 10806, 10893`. Sch. 20 para 4 (false claims of approval or endorsement). Remove the cards before any ad traffic. |
| 7 | **HIGH (lost leads)** | The waitlist reports success without saving anything if supabase-js failed to load: `if(supa){…insert…}` is skipped and "✨ You're in!" is shown anyway. | `landing.html:932-938`. |
| 8 | **HIGH (claims)** | "Works offline" is false as stated. The app's service worker is registered from a `blob:` URL, which browsers reject. | `index.html:29-40`. Chromium returned `TypeError … The URL protocol of the script ('blob:…') is not supported` (`shotscript/sw.js`). No other service worker exists in the repo. |
| 9 | **HIGH (claims)** | Free plan "Up to 3 debt entries" is wrong: the app allows **1** debt (plus 3 assets and 2 liabilities). | `index.html:20757` `FREE_LIMITS={assets:3,liabilities:2,debts:1}`; paywall copy at `index.html:20765` says "Free tier: 1 debt tracked". |
| 10 | **HIGH (prices)** | Prices disagree everywhere. Annual is £59.99 (landing, Stripe link comment) against £49.99 (app modals, whose button opens the £59.99 link). Lifetime is £199/33 spots (landing), £149/50 spots (app), £7.77 "Founding Licence" (app admin) and £7.77/mo (README). There are also struck-through "was £11.99/mo" and "was £119.99/yr" reference prices, and a "40% off – expires in 7 days" ladder of £3.59/£4.49/£5.09 that charges the full-price link. | §4. |
| 11 | **HIGH (perf)** | Paid mobile traffic downloads 218 KB of supabase-js (55 KB gzip, unpinned `@2`) just to insert one row and read one count. The 640×640 founder JPEG is inlined as 58 KB of base64 into HTML that is otherwise ~52 KB. If three.js is fixed, the canvas costs a further ~600–690 KB and, under 4× CPU throttling with software WebGL, drops the hero to about 11 fps with 100% main-thread busy. | §2. |
| 12 | **HIGH (assets)** | `logo.png` (70 B) is a **1×1 transparent test pixel**. `tests/test_plat.js:36-37` writes it into the repo root, it was committed by accident in `e8d910a` (2026-10-16), and `tools/build_site.js:9-10` ships it to both sites. Nothing references it, so the page has no favicon and no logo image. `og-image.png` is a real 1200×630 PNG (246 KB). | §6. |

---

## 1. Screenshots: what a first-time visitor from a social ad sees

Method: Playwright Chromium (`chromium.launch()`), `file:///home/user/Vault-It/landing.html`.
- Mobile: 390×844, DPR 2, `isMobile`.
- Desktop: 1440×900.
- I routed `three@0.169.0/*` to a 404, which is what jsDelivr returns, and served supabase-js 2.118.0 locally. That is the npm `latest` that `@2` resolves to: published 2026-10-15T12:57Z (https://registry.npmjs.org/@supabase/supabase-js, retrieved 2026-10-27).
- Google Fonts loaded for real through the proxy (DM Sans 400/600/700, Share Tech Mono, Syne 700/800).
- The waitlist count came from the live public RPC, which is a read only. All other Supabase REST calls were aborted. **I never submitted the form.**
- I scrolled the page in half-viewport steps with 350 ms pauses, which revealed all `.reveal` elements, then scrolled back to the top for the "top" shots. With 120 ms pauses, 10 of the mobile and 13 of the desktop reveal blocks were still hidden. The 0.7 s reveal plus IntersectionObserver leaves blank cards for fast scrollers.

**Mobile, first 5 seconds (`current_mobile_top.png`):**
1. A black page. The nav shows only the "Vault·It" wordmark: `.nav-links` is `display:none` under 768 px (`landing.html:299`) and there is no menu, so the "Open App" CTA disappears on phones.
2. For about 0.2–1.2 s the hero is invisible. After the CDN scripts run it fades in.
3. The eyebrow pill wraps badly into four lines: "EARLY ACCESS · / 32 PIONEER SPOTS / REMAINING".
4. A huge H1, "From debt to owning your home outright.", in Syne 800, takes about 40% of the screen.
5. A grey sub-line.
6. A gold "Get early access →" button at y≈480–532 CSS px, which is above the fold, and a ghost "Try live demo" button.
7. Four trust badges on two rows: "🔒 Encrypted in transit & at rest", "🇬🇧 UK built", "📱 Works offline", "0 credit card required".
8. A second pill repeating "32 pioneer spots remaining".

There is no product image, app screenshot or 3D object, because the canvas is broken. Nothing shows what the app looks like until about 2 screens down: the empty band is 844 px tall (see `crop_mobile_gap.png`). The page is **~14,170 px tall on mobile (~16.8 screens)**. The only email field is at **y≈13,200–13,500 px**, about 16 screens from the top.

**Desktop (`current_desktop_top.png`):** the same hero, centred, with nav links Features / How it works / Pricing / Founder / Open App. The "Open App" button text is grey on gold (`.nav-links a{color:var(--muted)}` overrides `.btn-gold` text colour by specificity, `landing.html:85` vs `93`). Contrast is **1.34–1.64:1**, so it looks disabled. The hero is calm and legible. The 3D gem from `*_intended.png` would sit behind the sub-headline and reduce its legibility: there, the gem's specular highlights overlap the paragraph text.

**What an ad visitor understands in 5 s:** "a dark finance dashboard, early access, limited spots". They do **not** learn:
- what the product looks like;
- that it is free to start;
- that it is UK-specific (beyond a flag);
- what "Pioneer" means;
- why they should hand over an email now rather than click "Try live demo", which drops them into the app.

---

## 2. Performance

### 2.1 Inventory of what the page loads

| Resource | Where | Bytes | Blocking? | Notes |
|---|---|---|---|---|
| `landing.html` | origin | 110,335 raw / 58,064 gzip-9 (measured locally) | — | 58,369 chars of it (line 719) are one base64 JPEG |
| Inline founder JPEG | `landing.html:719` | 58,268 b64 chars → **43,700 B**, 640×640 | in HTML, delays HTML parse | Shown at 124–128 CSS px; 256×256 would cover DPR 2 |
| Google Fonts CSS | `landing.html:14-16` | 647 B transferred (1,790 B raw via curl) | **render-blocking** `<link rel=stylesheet>` | `display=swap` is set; preconnects are present |
| Font files (woff2) | fonts.gstatic.com | DM Sans 62,724 B + Syne 34,608 B + Share Tech Mono 13,500 B = **110,832 B** for Latin, as Chromium fetched them | swap | The Android-UA CSS lists 18 `@font-face` subsets |
| three.js | `landing.html:772`, jsDelivr | **404** (file does not exist in 0.169.0) | parser-blocking classic script at end of body | If fixed with a UMD build: r128 `three.min.js` is 603,445 B / 148,737 B gzip; `three.module.min.js` 0.169.0 is 687,458 B (jsDelivr listing above) |
| supabase-js | `landing.html:914`, jsDelivr, **unpinned `@2`** | 218,252 B raw / 55,421 B gzip (2.118.0) | **parser-blocking**, and it gates the reveal script | Used for one `insert` and one `rpc` |
| Supabase RPC `waitlist_count` | supabase.co | 1 B body | async | Public; returns the live count |
| `og-image.png` | crawlers only | 246,285 B | — | Not loaded by the page |

There are no analytics, pixels or other third parties: no GA, Meta Pixel, TikTok or Plausible script anywhere in `landing.html`.

### 2.2 Throttled mobile measurement

Setup:
- Profile: CDP `Network.emulateNetworkConditions` with latency 150 ms, 1.6 Mbps down, 750 kbps up, plus `Emulation.setCPUThrottlingRate` 4×, at 390×844 DPR 2. These network values are Lighthouse's default mobile preset, which Lighthouse now calls "Slow 4G" and used to label "Fast 3G" (https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md, retrieved 2026-10-27).
- The page and all its dependencies (fonts localised, supabase-js, three r128) were served from a local gzip server, so the throttling applies to all of them.
- Cache was disabled. Three runs per variant; the medians are shown.
- Caveats: request-level (DevTools-style) throttling is an approximation. Headless Chromium renders WebGL in software (SwiftShader), so the WebGL costs overstate a real phone GPU. Treat the "intended" figures as an upper bound.

| Variant | FCP | LCP | DOMContentLoaded/load | Long tasks (count / ms) | Transfer | Hero idle fps | Main-thread busy, 5 s idle |
|---|---|---|---|---|---|---|---|
| **prod** (three 404, fonts, supabase-js) | **548 ms** | **2,284 ms** | 1,571 ms | 2 / 225 ms | 215 KB | 60 | 12% |
| **intended** (three.js working) | 564 ms | **3,984 ms** | 2,984 ms | **97 / 9,352 ms** | 361 KB | **11** | **107%** |
| **lean** (no three tag, no Google Fonts) | 280 ms | 1,644 ms | 920 ms | 2 / 183 ms | 112 KB | 60 | 13% |

Raw runs are in `shotscript/perf.json`.

Reading the table:
- The large gap between FCP (the nav paints) and LCP (the hero text appears) is the reveal gating described in finding #2.
- Even the lean variant has LCP ≈1.6 s. That is the remaining parser-blocking supabase-js (55 KB gzip) plus the 200 ms + 120 ms×i reveal timers and the 0.7 s opacity transition.
- Fixing three.js as written would make the page far heavier: an extra ~146 KB gzip and a continuous `requestAnimationFrame` loop. The loop has no visibility or scroll-off check, so it keeps rendering after the canvas fades to opacity 0 at 60% of a viewport (`landing.html:858-909`).
- The scene itself is cheap to describe:
  - an IcosahedronGeometry(1.8, detail 1) with two materials;
  - a 120-segment torus;
  - 1,200 points;
  - a 50×50 grid;
  - two point lights plus an ambient light.

  Its cost comes from a full-screen render at DPR up to 2 with `antialias:true`, every frame, forever.

### 2.3 What to defer or remove for paid mobile traffic

Recommendations (engineering judgement, not measured unless stated):
1. **Remove the three.js hero** for the sign-up page. If a 3D moment is wanted, use a looping MP4/WebM, a static poster, or a CSS-only gem. A loop should be < 300 KB; that figure is a target, not a measurement. If 3D is kept, load `three.module.min.js` with `type="module"` **after** first paint, pause it with `IntersectionObserver` and `document.hidden`, and skip it under `prefers-reduced-motion` and on low-power devices.
2. **Drop supabase-js.** Post the email with one `fetch()` to `…/rest/v1/waitlist` (with the publishable key headers), or better, to an edge function with Turnstile and rate-limiting (§5). That removes 55 KB gzip of render-blocking JS. If the library is kept, pin an exact version and load it with `defer`.
3. **Never gate the hero on JS.** Start `.reveal` visible and add the animation class only from JS (progressive enhancement), or add `<noscript><style>.reveal{opacity:1;transform:none}</style></noscript>`. Make above-the-fold content visible with no animation at all.
4. **Fix the 100vh double offset** (`landing.html:100`): drop `margin-top:100vh` from `.page-body` when there is no canvas.
5. **Founder photo:** serve it as a separate 256×256 WebP/AVIF file with `loading="lazy"`, `width` and `height` attributes. At that size it should be about 10–20 KB (an estimate from typical JPEG/WebP ratios; not measured). This stops 58 KB of base64 riding in the critical HTML.
6. **Fonts:** three families and seven weights are requested. Subset to Latin, self-host, `preload` only the H1 weight (Syne 800), and use `font-display:swap` or `optional`. Share Tech Mono could be replaced by a system monospace font.
7. Inline only the critical CSS. Everything is already inline, which is fine at this size.

---

## 3. Claims audit (every claim, number, badge, testimonial and social-proof or scarcity element)

Legend:
- **SUPPORTED**: proven by code or docs.
- **UNSUPPORTED**: no evidence either way.
- **FALSE**: contradicted by the code or data.
- **RISKY**: legally risky as presented, whether or not literally true.

Legal references, both opened 2026-10-27:
- DMCC Act 2024 Sch. 20: https://www.legislation.gov.uk/ukpga/2024/13/schedule/20. Para 4 covers false endorsement, para 7 false limited-time claims, para 13 fake reviews, para 20 materially inaccurate availability information. All are in force from 6.4.2025 (S.I. 2025/272).
- DMCC Act s.230, material information in an invitation to purchase: https://www.legislation.gov.uk/ukpga/2024/13/section/230.

### 3.1 Hero and badges

| # | Claim (line) | Status | Evidence | Fix |
|---|---|---|---|---|
| H1 | "Early Access · **33 Pioneer Spots Remaining**" eyebrow (`:334`), replaced at runtime with `33−count` (`:955-958`) | **FALSE / RISKY** | 33 is a constant in JS. The count is waitlist rows (`002_waitlist.sql`), not Pioneer places. Pioneer is a Stripe subscription with no cap (`index.html:23851-23852`). The app has no invite gate: `send-auth-email` has no waitlist or allowlist check (grep of `supabase/functions/send-auth-email/index.ts` found none). The app's own campaign config says `founderSlots: 50` (`index.html:23876`), not 33. Shows "32" (22:08 UTC) and "31" (22:18 UTC) on 2026-10-27. Anyone can insert rows anonymously (§5), so the counter can be driven to 0. | Remove it. If a cap is real, show "Founding places sold: X of N", computed from paid orders, enforced server-side, and hidden on error (Sch. 20 paras 7 and 20). |
| H2 | Hard-coded fallback "**21** pioneer spots remaining" (`:960-965`) | **FALSE / RISKY** | The fallback shows whenever supabase-js or the RPC fails, and is unrelated to any data. | Delete it. Fail closed: show nothing. |
| H3 | Pulse pill "Loading pioneer spots…" then "N pioneer spots remaining" (`:348-351`) | FALSE / RISKY | Same as H1. Also duplicates the eyebrow. | Remove. |
| H4 | "From debt to owning your home outright." (`:336`) | Aspirational (SUPPORTED as product positioning) | The app has a roadmap that runs to mortgage-free (roadmap stages in `index.html`). | Keep, but avoid implying an outcome is guaranteed. Pair it with "tracking tool, not advice" near the CTA. |
| H5 | "One dark, beautiful dashboard … clear your debt, build your deposit, track metals and cashflow" (`:337`) | SUPPORTED | The modules exist: Debt, House Builder, Metals in the Assets tab, Budget/cash flow. | — |
| H6 | "🔒 **Encrypted in transit & at rest**" (`:343`) | **SUPPORTED (server copy) with a caveat** | Privacy notice: "encrypted in transit (HTTPS) and at rest by our database provider … **It is not end-to-end encrypted**" (`index.html:24213`). Supabase: "All customer data is encrypted at rest with AES-256 and in transit via TLS" (https://supabase.com/security, retrieved 2026-10-27). **But** the primary copy of the data lives unencrypted in the browser's localStorage (`index.html:24215`, "keeps your data … in your browser's storage"). | Keep, but qualify: "Encrypted in transit and at rest on our servers (not end-to-end)". Link to the privacy notice. |
| H7 | "🇬🇧 **UK built**" (`:344`) | SUPPORTED (self-declaration) | Founder copy "I'm a UK developer" (`:725`). Operator is PT Live Design (`index.html:24193`). Note that the database is in Frankfurt (EU) and some processors are in the US (`index.html:24203-24211`). | Keep "Built in the UK". Don't say "UK hosted". |
| H8 | "📱 **Works offline**" (`:345`) | **FALSE as stated** | The service worker is a `blob:` URL (`index.html:29-40`), which browsers reject (Chromium TypeError reproduced in `shotscript/sw.js`). The registration error is swallowed (`.catch(function(){})`). A cold reload with no network fails. Data entered is kept locally, so an already-open tab keeps working. The `index.html:9455` banner "works offline, opens like an app" is equally unsupported. | Remove until a real `/sw.js` is served by the Worker and tested offline. Alternatively say "Your data is stored on your device". |
| H9 | "**0 credit card required**" (`:346`) | SUPPORTED (awkward wording) | The waitlist takes only an email. The Free plan needs no payment: the only payment paths are Stripe links. | Reword to "No card needed". |
| H10 | "Get early access →" (`:339`), "Join waitlist" (`:741`) and "we'll send you your Pioneer invite as soon as your spot opens up" (`:738`) | **MISLEADING** | Nothing gates access. "Get started free" (`:674`) and "Open App" (`:325,759`) let anyone sign up now. No code anywhere sends invites from the waitlist, and no process for it exists in the docs. | Decide on one model. Either make the waitlist the gate, or rename it "Get updates and the founding offer". |
| H11 | "Try live demo" goes to `https://app.vault-it.co/?bypass=websummit` (`:340`) | Works, but RISKY funnel step | §5.8. | §5.8. |

### 3.2 Problem and module sections

| # | Claim (line) | Status | Evidence | Fix |
|---|---|---|---|---|
| P1 | "Your money lives in ten different tabs." / "Budgeting apps track yesterday. **None of them** map the path…" (`:363,375`) | UNSUPPORTED (comparative) | No competitor research is in the repo. "None of them" is an absolute comparative claim. | Soften to "Most budgeting apps…", or substantiate it. |
| M0 | "**Seven modules.** One journey." / "not seven disconnected apps" (`:391-392`) | **FALSE (internal)** | The page lists **six** (Module 01–06, `:398-575`). The app has more tabs (Stocks & Funds, Budget, Roadmap, Entrepreneur, Achievements, etc.). | Say "Six" and list them, or count the real tabs. |
| M1 | "Real-time net worth across every account and asset" (`:402`) | Partly SUPPORTED | Manual entry. "Live" prices exist only for crypto, metals and stocks on request. There are no bank connections: "No bank logins required" (`:613`). | "Net worth across everything you add". |
| M1b | "Historical growth chart from day one" (`:404`) | **Pro-only in the app** | `openNwHistory()` → `if(!_isPro()){ showUpgrade('annual'); return; }` (`index.html:24650`). The campaign and offer modals list "NW History" as paid (`index.html:9862,9976,9990`). | List it under the paid plan. |
| M1c | Mock figures £12,450 / £18,200 / £5,750 / 35.9% / "+11% mo" (`:413-416`) | Illustrative | Hard-coded. | Label mock-ups "Sample data". |
| M2 | "Every pound saved fills another brick", "Animated brick-by-brick deposit progress", "Projected 'keys in hand' date" (`:435-439`) | SUPPORTED for **Pro only** | Free users see the house at 0% or 4% progress: `_isPro() ? pct() : 0` and `p:_isPro()?pct():0.04` (`index.html:14005,14993`). Free toast: "Upgrade to Pro to watch your house being built" (`index.html:14130`). | Say this is a paid feature, or ungate it for Free. It is the hero differentiator, so ungating is worth considering (product decision). |
| M3 | "Snowball & avalanche strategy engine", "Debt-free date countdown" (`:473-475`) | Assumed SUPPORTED; not individually verified | The Debt tab exists. I did not trace the snowball/avalanche code in this run. | Verify before reuse. |
| M4 | "Real assets, valued at **live spot**", "Live spot-price valuation", "spot live" pill (`:507-520`) | **RISKY / partly FALSE** | `fetchMetalPrices()` converts USD to GBP with a **hard-coded 0.79** (`index.html:18842`). `fetchMetalsLive()` multiplies by `vi_fx_gbpusd`, which `fetchExchangeRates()` stores as *USD per GBP* (~1.33; `index.html:20327,20364`). That **inflates GBP metal values by roughly 1.33/0.75 ≈ 1.78×**. The mock shows gold at **£1,910/oz**, but spot on 2026-10-27 was about **£3,044–3,052/oz**: gold-pricex.com £3,043.66 at 22:10 UTC, Exa markets XAUGBP £3,052.22 at 22:18 UTC, gold.co.uk £3,050.37, 150currency.com £3,046.74 (all retrieved 2026-10-27). `api.metals.live` availability could not be checked from here (blocked). Prices are fetched on request, not continuously. | Fix the FX bug. Label it "prices refreshed on demand". Use current numbers in mock-ups, or label them "illustrative". |
| M5 | "Know your surplus to the pound", "Automatic surplus & savings-rate maths" (`:534-539`) | SUPPORTED | Budget/cash-flow tab and sidebar income/expense/surplus (`index.html:9498-9500`). Not gated. | — |
| M5b | Mock "June 2026" (`:546`) | Stale | Today is 2026-10-27. | Remove the date. |
| M6 | "Milestones, XP", "Earn XP for every financial win" (`:575-578`) | SUPPORTED, partly Pro | Achievements render is Pro-gated (`index.html:20213`). | Clarify which parts are Free. |
| HW1 | "Set up in minutes" / "No bank logins required — you stay in control" (`:607,613`) | SUPPORTED | Manual entry only. | — |

### 3.3 Testimonials and social proof

| # | Claim (line) | Status | Evidence | Fix |
|---|---|---|---|---|
| T0 | Eyebrow "**From our pioneers**" / "People **already on the climb**." (`:633-634`) | **FALSE** | `profiles`: 4 rows, **0** with `is_pioneer=true`. `waitlist`: 2 rows (both `source='landing'`). Read-only SQL via the Supabase connector, 2026-10-27 ~22:18 UTC. | Remove. |
| T1 | "Finally — one place for my entire financial life." — **Sarah M., Manchester** (`:638-639`) | **UNSUPPORTED → treat as FAKE / LEGALLY RISKY** | First added in `ca95d4f` (2026-06-21, "Three.js 3D environment + Web Summit polish"). There is no record of the person, consent or source in the repo, and no beta users existed then (the beta runbook is dated October). The CMA expects traders to hold evidence that a testimonial is genuine. | Delete all three unless Pete holds written originals and consent. If he does, add a date and say whether the tester got anything free (Sch. 20 para 13; CMA short guide above). Replace with real beta-tester quotes collected with consent, or with no testimonials. |
| T2 | "Paid off my credit card watching the bar fill up. Weirdly addictive." — **James T., Bristol** (`:642-643`) | Same as T1. Also implies a financial outcome. | — | Delete. |
| T3 | "The house builder is unlike anything I've seen in fintech." — **Priya K., London** (`:646-647`) | Same as T1 | — | Delete. |
| T4 | "Pioneer #001" founder badge (`:726`) | UNSUPPORTED / cosmetic | Nothing assigns numbers to real users. The demo persona has `pioneerNum: 7` (`index.html:24377`). Implies a numbered membership scheme with members. | Remove, or keep only if numbering is real. |
| T5 | Founder bio: "built every line of this myself" (`:725`) | Self-declaration | — | Keep if true. |
| T6 | Founder photo `alt="Pete Thickett, founder of Vault-It"` (`:719`) | SUPPORTED (owner's own photo, per the alt text) | The photo shows an RAF ensign behind the founder. | Low risk. Consider a neutral background so nothing implies an affiliation (my judgement, not legal advice). |

### 3.4 Pricing section

| # | Claim (line) | Status | Evidence | Fix |
|---|---|---|---|---|
| PR1 | Free £0: "Net worth overview", "**Up to 3 debt entries**", "Deposit goal tracking", "Journey milestone view" (`:665-673`) | **FALSE (debts)** | `FREE_LIMITS={assets:3,liabilities:2,debts:1}` (`index.html:20757`). The paywall text says "Free tier: 1 debt tracked" (`index.html:20765`). | State the real limits: 1 debt, 3 assets, 2 liabilities. Or change the code (owner's call). |
| PR2 | Pioneer **£5.99/mo**, ribbon "**Most popular**" (`:679-681`) | £5.99 consistent with the Stripe link comment. "Most popular" is **FALSE** (0 subscribers). | `index.html:23851`, `profiles.is_pioneer`=0. I could not open the Stripe link's real price: buy.stripe.com rendered only "Stripe Checkout" via fetch, and the Stripe connector needs authorisation. | Remove "Most popular". Use "Recommended" or nothing. Verify the Stripe prices in the dashboard. |
| PR3 | "**Lock in this rate forever**" / "Pioneer locks in the best rate forever" (`:659,682`) | RISKY (open-ended promise) | No code or terms define the price lock. App copy says "renews at same price as long as you stay subscribed" (`index.html:9858`). | Use the precise wording from the terms: "your price won't rise while your subscription stays active". |
| PR4 | Pioneer features: "Unlimited debts & assets" | SUPPORTED | `isPioneer()` bypasses `FREE_LIMITS` (`index.html:19011,19522,19544`). | — |
| PR5 | "Precious metals tracker (live spot)" listed as Pioneer | **FALSE as a differentiator** | No metals gate exists in the app; Free users can use it. Also see M4. | Move to Free, or gate it in code. |
| PR6 | "Full cashflow module" listed as Pioneer | **FALSE as a differentiator** | No gate found on Budget/cash flow. | Move to Free. |
| PR7 | "House builder with projections" listed as Pioneer | SUPPORTED (house build progress is Pro-gated: M2) | — | But the app's own modals list "House builder" as **Free** (`index.html:9845,9970`). Reconcile. |
| PR8 | "Journey XP & milestones" listed as Pioneer, while Free says "Journey milestone view" | Partly SUPPORTED | Achievements are gated (`index.html:20213`). The Journey map is free in the app modals. | Clarify. |
| PR9 | "**Priority support**" | UNSUPPORTED | No support system or SLA exists in code or docs. Support is the single mailbox hello@vault-it.co. | Remove, or define it (e.g. "replies within 2 working days"). |
| PR10 | "or **£59.99/yr** — save 2 months" (`:692`) | Arithmetic SUPPORTED, price INCONSISTENT | 12 × £5.99 = £71.88. £71.88 − £59.99 = £11.89 ≈ 1.98 months of £5.99, so "save 2 months" is about right. The app shows **£49.99/yr** in two modals but opens this £59.99 link (§4). | Pick one annual price everywhere. |
| PR11 | Founding Member "**£199** once", "**Lifetime access**", "Limited to **33 spots** — claim yours before they're gone", "Only 33 spots — first come, first served" (`:697-707`) | **RISKY / INCONSISTENT** | The app says £149 and 50 slots (`index.html:9873,10007,23876`). There is no Founder Stripe link (`founder: null`, `index.html:23853`); purchase is by email (`:706`). No cap is enforced. "Lifetime" is undefined: whose lifetime, and what if the service closes? | Choose one price and cap. Enforce the cap. Define "lifetime" (e.g. "for as long as Vault·It operates"). Add refund and closure terms (§4). Avoid "before they're gone" pressure unless the cap is real (Sch. 20 para 7). |
| PR12 | Founder features: "Everything in Pioneer, forever", "Founding Member badge", "Direct influence on the roadmap", "**1-to-1 onboarding with Pete**" | Promises (UNSUPPORTED as product features, SUPPORTED as owner commitments) | A badge exists via `vi_founder` and `?founded=1` (`index.html:20600-20615`), but nothing verifies payment. 1-to-1 onboarding is a manual commitment, workable only at small volume. | Keep only what Pete can deliver at the cap. Write it into the founding terms. |
| PR13 | No trader identity or address near the prices or Stripe buttons | **GAP (legal)** | DMCC s.230(2)(d)-(e) treats an invitation to purchase as omitting material information if it lacks the trader's identity and business address (https://www.legislation.gov.uk/ukpga/2024/13/section/230, retrieved 2026-10-27). The footer says only "© 2026 Vault·It" (`:764`). BETA_RUNBOOK also says to add a postal address (`docs/BETA_RUNBOOK.md:39`). | Add "Vault·It is a trading name of PT Live Design, [address], hello@vault-it.co". Also state the cancellation right and whether VAT is included. |
| PR14 | Footer "Not regulated by the FCA. Not financial advice." (`:763`) | SUPPORTED | Matches the terms (`index.html` `showTerms`). | Keep, and make it more prominent near outcome claims. |

### 3.5 Claims inside the app that the funnel exposes (via "Try live demo" and "Open App")

These are not in `landing.html`, but ad traffic lands on them:
- `index.html:10156`: "Warren Buffett & Charlie Munger — Strategic Advisors, Vault·It" with a fabricated quote, labelled only "Advisory board framing · Future collaboration".
- `index.html:10806`: "Gary Stevenson — CFO, Vault·It".
- `index.html:10893`: "Simon Squibb — COO, Vault·It".
- **Status: FALSE / BLOCKER.** These are false endorsement and affiliation claims (Sch. 20 para 4) and invented quotes from real people. Remove them before any traffic.
- `index.html:11417,11424`: struck-through "was £11.99/mo" and "was £119.99/yr". These are reference prices with no evidence they were ever charged (RISKY; CMA price-transparency guidance CMA209 is cited in the sibling report `research/rules_uk_law.md`, not opened here).
- `index.html:23522-23547` together with `index.html:23566`: a 7/14/30-day discount ladder at £5.09/£4.49/£3.59 with "Offer expires in 7 days". Every button opens the **full-price** monthly or annual link (`showUpgrade`, `index.html:23881-23896`), so the advertised discount is never applied. That is FALSE pricing and false urgency.
- `index.html:11308`: "Upgrade to Pioneer … Alpha: **50% off forever**" (RISKY: no evidence of a 50%-off reference price).
- Pioneer unlock has no payment verification:
  - `?upgraded=1` sets `vi_pioneer` (`index.html:20581-20599`);
  - "verify purchase" only checks that the typed email equals the profile email (`index.html:20834-20852`);
  - users can upsert their own `profiles.is_pioneer`.

  Not a landing-page claim, but it matters before taking pre-sales.

---

## 4. Price and plan-name inconsistencies

| Plan / item | landing.html | index.html (app) | Docs / other | Conflict |
|---|---|---|---|---|
| Free | "Free", £0 (`:665`); 3 debts | "Free", £0 (`index.html:9839,9967`); code allows 1 debt (`:20757`); House builder listed as **free** (`:9845,9970`) | — | Debt limit 3 vs 1; house builder free vs paid |
| Monthly | "Pioneer" **£5.99/mo** (`:680-681`), Stripe `4gM9AN3D0gvv5yR7SS2VG00` (`:691`) | "Pro" £5.99/mo (`:9985`); Pioneer £5.99 (`:11310,25128`); "was £11.99/mo" (`:11417`); ladder £5.09/£4.49/£3.59 (`:23526-23540`); comment "£5.99/mo" (`:23851`) | README "Pioneer (**£7.77/mo**)" (`README.md:35`); handover doc £4.99/mo, ladder £4.24/£3.74/£2.99 (`VAULT_IT_CLAUDE_CODE_HANDOVER.md:168-179`) | Name: Pioneer vs Pro. Discount ladder not wired to Stripe. Stale docs. |
| Annual | **£59.99/yr** (`:692`), Stripe `3cIfZbddA6UV5yR4GG2VG01` | "Pro Backer" **£49.99/yr** (`:9857,9867`); offer modal **£49.99/yr** (`:9997,23587`), whose buttons open the **£59.99** link (`:23852`); Pioneer £59.99 (`:10888,11311,11424,25132`); "was £119.99/yr" | Handover £39.99/yr | **£49.99 vs £59.99**, and the £49.99 button charges £59.99 |
| Lifetime | "Founding Member" **£199 once**, **33** spots, purchase by email (`:697-707`) | "Founding Member"/"Founder" **£149 once** (`:9873,10007`); campaign `founderSlots: 50` (`:23876`); `founder: null` Stripe (`:23853`); "Founding Licence (**£7.77**) one-time" + Shibarium NFT admin config (`:11333-11337,23855-23866`) | Design brief "33 Pioneer spots" (`VAULT_IT_DESIGN_BRIEF_v2.md:204`); README "33 Pioneer spots. Invite-only." | £199 vs £149 vs £7.77. 33 vs 50 spots. "Pioneer spots" (landing hero) vs "Founding Member spots" (pricing card) refer to different things |
| Campaign | — | `VI_CAMPAIGN` goal 200 backers, goalGBP 9,980 ("200 × £49.90 avg"), deadline **2026-08-31** (passed) (`index.html:23870-23878`) | — | Campaign modal "Days left" would show an expired deadline |
| Plan names | Free / Pioneer / Founding Member | Free / Pro / Pro Backer / Pioneer / Founder / Founding Member / Founding Licence / "Beta Lifetime Licence" (`:11330`) | — | Seven names for three products |

**Recommendation:** one source of truth, a single `PLANS` object rendered into both pages and tested. One name per product, e.g. Free / Pioneer (monthly or annual) / Founding Member (one-off). Remove every struck-through "was" price and the discount ladder unless the real Stripe prices are wired in.

---

## 5. Conversion mechanics

### 5.1 Waitlist form (`landing.html:739-744`, JS `:921-944`)

**Fields.** There is one `type=email` input with a `required` attribute and a placeholder. It has **no `<label>`** and no `aria-label`; `probe.js` reported `inputLabel:false`, `inputAria:null`. It has no `name`, `autocomplete="email"` or `inputmode`. There is no first name, no "what are you saving for" segmentation question and no consent checkbox.

**Validation and errors.**
- The browser's own `required` and `type=email` checks run. Then `trim()`. The address is not lowercased.
- On a server error it shows "Something went wrong. Email hello@vault-it.co directly." in red. `#signupMsg` has no `role="status"` or `aria-live`, so screen readers aren't told.
- **Fake success:** if supabase-js didn't load (CDN blocked, or an ad-blocker in in-app browsers), `supa` is null and the user still sees "✨ You're in!" (`:932-937`). The lead is lost silently.

**Double submit.** The button is never disabled. A second click inserts again, hits the unique constraint (`23505`), and that error is treated as success. The result is harmless, but there is no in-flight state.

**What the 23505 handling reveals.** Duplicates are reported as success, which is good: the form does not reveal whether an address is already on the list. However:
1. The unique constraint is on raw `email` (`002_waitlist.sql:9`), so `Foo@x.com` and `foo@x.com` both insert, and the count inflates.
2. The insert uses PostgREST `return=minimal` by default in supabase-js v2, so no row is read back. That is consistent with RLS having no SELECT policy.

**Database exposure** (`002_waitlist.sql`; live check via the connector on 2026-10-27):
- Policy `public_insert`, `FOR INSERT … WITH CHECK (true)`, roles `{public}`. **Anyone with the public key can insert unlimited rows.**
- The client can set any column: `email` is unbounded `text` with no format CHECK, and `source`, `created_at` and `id` can all be written. There is no Turnstile, rate limit or honeypot.
- Consequences:
  1. Spam or junk addresses that a later send would bounce, damaging the domain's sending reputation. That is an inference.
  2. Anyone can drive the "spots remaining" counter to 0.
  3. Table bloat.
- `waitlist_count()` is `SECURITY DEFINER`, executable by `anon` (`007_security_hardening.sql:5-7`). It publishes the exact list size to anyone: 2 on 2026-10-27, which undercuts any social-proof story and lets competitors track growth.
- SELECT is denied: `GET /rest/v1/waitlist?select=email` returned `[]`.
- **Fix:** move the insert into an edge function with:
  - Turnstile server verification (already built for sign-in);
  - IP and mailbox rate limits (reuse `rate_hit` from migration 008);
  - email normalisation and validation;
  - `source` and UTM columns set server-side;
  - double opt-in.

  Revoke the anon insert policy and remove the public count, or have it return a rounded or bucketed number only if it is genuinely needed. These are production DB changes and need the owner's explicit yes, per CLAUDE.md.

**Consent text** (`:744`): "We'll only use your email to send your Pioneer invite and updates about Vault·It, and we won't send marketing unless you opt in."
- There is **no opt-in control**, so the "unless you opt in" branch can never happen.
- "Updates about Vault·It" is itself arguably marketing.
- The privacy notice says the waitlist email is used only "to send your Pioneer invite" (`index.html:24201`). That does not mention updates and gives no retention period for waitlist rows.
- **Fix:** an unticked opt-in checkbox for news and offers, separate from the purpose of "tell me when I can join". Align the notice. Add retention and a working unsubscribe. The mechanics belong to the mailing-stack research; UK PECR and GDPR analysis is in `research/rules_uk_law.md`, which I did not re-verify.

**Success state.** An inline message only. There is no thank-you page (which would serve as a conversion event), no next step (share, demo, founding offer), no confirmation email and no double opt-in.

### 5.2 Tracking

There is **none**: no analytics, pixel or conversion API. The privacy notice says "We run no advertising and no analytics or tracking in the beta" (`index.html:24211`), so adding Meta or TikTok pixels would require a notice update and cookie consent first. For paid social, at minimum use a cookieless, first-party count of visits per UTM and sign-ups per UTM (e.g. Cloudflare Web Analytics, or server-side counting in the edge function) after updating the notice.

### 5.3 UTM parameters

- `landing.html` never reads `location.search`.
- The insert sends only `{email}`. `source` defaults to `'landing'`, and both live rows show `landing`.
- The Worker preserves query strings on its redirects (`worker/index.mjs`: `url.pathname + url.search` on the http→https and www→root redirects), so UTMs arrive at the page.
- `Referrer-Policy: strict-origin-when-cross-origin` means the full URL with UTMs isn't leaked cross-origin.
- **UTMs are dropped** from every outbound link: Open App, demo, Stripe and the founder mailto.
- **Fix:** capture `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` and `fbclid`/`ttclid` on load into memory. Send them with the sign-up, server-validated, into new columns. Optionally pass `client_reference_id` to Stripe Payment Links.

### 5.4 Accessibility

- **Labels:** the email input has no label (WCAG 1.3.1 / 3.3.2).
- **Contrast** (WCAG relative luminance, computed):
  - nav "Open App" grey #8595a6 on gold: **1.34–1.64:1** (fails);
  - disclaimer `rgba(133,149,166,.55)` on #04090f: **2.67:1** (fails 4.5:1 at 12 px);
  - consent text at `opacity:.7`: about **3.57:1** (fails at 12.5 px);
  - muted body text #8595a6: 6.51:1 (passes);
  - gold #c9a84c: 8.74:1 and teal #44c0b9: 9.02:1 on the background (pass).
- **Focus:** the input sets `outline:none` with a box-shadow replacement, which is OK. Buttons and links rely on browser default outlines; `.btn` doesn't remove them. There is no skip link.
- **Reduced motion:** there is no `prefers-reduced-motion` handling anywhere. The page has an infinite rAF WebGL loop when three.js works, pulse animations, `scroll-behavior:smooth` and translate-in reveals.
- **Canvas:** `#three-canvas` is fixed full-screen with `pointer-events:none` but no `aria-hidden="true"`. It is harmless to assistive tech once it is gone.
- **Structure:** one H1, which is good. The emoji in trust badges and problem cards will be read aloud ("locked", "flag: United Kingdom").
- **Motion-gated content:** see finding #2. Content hidden until JS runs also hides it from users with JS off and from some crawlers.

### 5.5 SEO and social tags (`landing.html:5-16`)

| Tag | Value | Comment |
|---|---|---|
| `<title>` | "Vault·It — From debt to owning your home outright." | Good. 50 characters. |
| `description` | present (`:7`) | Good. |
| `og:title`, `og:description`, `og:type`, `og:url` (`https://vault-it.co/`), `og:image` (`https://vault-it.co/og-image.png`) | present | Missing `og:image:width`/`height`/`alt`, `og:site_name`, `og:locale=en_GB`. A /sign-up page needs its own `og:url`. |
| `twitter:*` | **absent** | Add `twitter:card=summary_large_image` (plus title, description, image). |
| canonical | `https://vault-it.co/` (`:13`) | A new /sign-up page must not copy this canonical. If it is an ad-only page, consider `noindex`. |
| robots | `robots.txt` "Allow: /" for landing, "Disallow: /" for app (`tools/build_site.js:12`). Preview hosts get `X-Robots-Tag: noindex` (`worker/index.mjs:51`). | No sitemap. |
| favicon / apple-touch-icon / theme-color | **absent** on landing | The app uses an emoji-SVG data icon (`index.html:75`). |
| Structured data | none | Optional: Organization or SoftwareApplication. Don't add review stars (§3.3). |

### 5.6 Routing for vault-it.co/sign-up

The Worker maps `/sign-up` to `/landing/sign-up.html` (`worker/index.mjs` `route()`: extensionless path → `.html`). A new page therefore needs `tools/build_site.js` to copy it into `dist/landing/sign-up.html`, and `tests/test_site.js:11` must be updated, since it asserts the exact landing file list.

### 5.7 Competing CTAs

| CTA | Where | Destination | Conflict |
|---|---|---|---|
| "Open App" | nav (desktop only), footer | app sign-in, open to all | Bypasses the waitlist. Hidden on mobile. |
| "Get early access →" | hero | `#waitlist`, about 16 screens down on mobile | Long scroll to the only form. |
| "Try live demo" | hero | app with `?bypass=websummit` | Leaves the page in a new tab. |
| "Get started free" | Free card | app | Again bypasses the waitlist. |
| "Get Pioneer →" / "save 2 months" | Pioneer card | Stripe Payment Links (live) | Takes money from cold traffic on a page whose figures (§3, §4) are wrong. |
| "Email hello@vault-it.co" | Founding card | mailto | Manual sales. Mailto often fails on mobile and in in-app browsers. |
| "Join waitlist →" | bottom | Supabase insert | The intended conversion. |

That is **seven different primary actions** pointing to four destinations. For an ad funnel, pick **one primary action** (email capture with an optional founding-member upsell on the thank-you page). Repeat it after each section and in a sticky mobile bar. Demote demo and app links to secondary text links.

### 5.8 The "Try live demo" link (`?bypass=websummit`)

What it does (`index.html:9584-9593`):
- Sets a 24 h local session for `demo@vault-it.app` (or the stored user's email) and `vi_demo_mode=true`.
- Hides the login overlay, strips the param, and loads the "Alex Morgan" sample persona with `vi_pioneer='true'`, so Pro features appear unlocked (`index.html:24369-24379`).
- A demo chip offers "Start with your own data" or "Sign up free" (`index.html:9453`).
- The runbook says to remove it before wide release (`docs/BETA_RUNBOOK.md:33`).

As a funnel step:
- Pro: it shows the product with no sign-up.
- Con: it is the full 1.69 MB app (`index.html` is 1,689,929 B raw; not measured under throttling here), on a cold mobile connection, in a new tab. It loses the visitor from the email capture. The demo shows Pro features unlocked that Free users won't get. It also shows the fake "advisory board" cards (§3.5).
- Recommendation:
  1. Replace it with a short in-page video, GIF or screenshot carousel of the House Builder.
  2. Offer the demo only *after* email capture, on the thank-you page.
  3. Remove the advisor cards first regardless.

---

## 6. Asset facts

| Asset | Fact | Evidence | Action |
|---|---|---|---|
| `logo.png` (repo root) | **70-byte 1×1 RGBA PNG: a placeholder or test artefact, not a logo.** Its bytes are identical to the base64 written by `tests/test_plat.js:36-37` (`iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ…`), which writes `logo.png` into the current directory, i.e. the repo root. It was committed in `e8d910a` (2026-10-16, House Builder P4) with other test shots. `tools/build_site.js:9-10` copies it into both sites. No HTML references it. | `od` dump; `git log --diff-filter=A -- logo.png` | Make the test write to a temp dir and remove the file. Produce a real logo (SVG plus 512 px PNG), favicon and apple-touch-icon. (Repo change, for a later phase.) |
| `og-image.png` | Real: **1200×630**, 8-bit RGB, 246,285 B. Content: "VAULT·IT / DEBT → DEPOSIT → KEYS / From debt to owning your home outright." with a teal-to-gold progress bar. Matches the page's message. | PNG IHDR read; visual check | Fine. Could be compressed (it is under the common 5 MB OG limits, though I didn't verify those limits here). Add `og:image:width`, `og:image:height` and `og:image:alt`. Consider a variant with a product screenshot or the 3D house for ads. |
| Founder avatar | Inline base64 JPEG, **640×640, 43,700 B** (58,268 base64 chars), displayed at 124–128 CSS px. Studio-style headshot of a man in glasses and a jacket in front of an RAF ensign. | Decoded to `shots/founder_avatar.jpg` | Serve it as an external 256 px WebP with explicit size and `loading=lazy`. The background choice is the owner's. |
| Favicon | none on landing | `landing.html` head | Add one. |

---

## 7. Fix list for the new /sign-up page, in priority order

1. Remove the fake scarcity (H1–H3, PR11 wording) and the fake testimonials and social proof (T0–T4, "Most popular"). In the app demo, remove the celebrity "advisor" cards, the "was" prices and the discount ladder.
2. Render the hero without JS. No canvas, no 100vh gap, no CDN script before the content.
3. Put the email form in the first viewport on mobile, with a visible label, `autocomplete=email`, a disabled-while-sending state, an `aria-live` message, and a real failure state (never a fake success).
4. Send sign-ups through an edge function with Turnstile, rate limits, normalisation, UTM capture and double opt-in. Drop the public insert policy and public count (owner approval needed for the DB and function changes).
5. Use one plan table and one name per product. Correct the Free limits (1 debt). Move metals and cash flow to Free or gate them in code. Define "lifetime" and "price lock". Add the trader name and address, VAT and cancellation statements next to any price (DMCC s.230).
6. Qualify "Encrypted …" and drop "Works offline" until a real service worker ships. Fix the metals FX bug before claiming "live spot".
7. Add a thank-you page (conversion event; next step: founding offer or demo), Twitter and OG tags specific to /sign-up, a favicon and logo, and reduced-motion support. Fix the contrast failures.

## 8. Gaps and what I could not verify

- **Live vault-it.co HTML:** not fetched (host blocked here). I assume it equals `landing.html` at the release-branch commit; this was not checked.
- **Stripe Payment Link prices:** not verifiable. buy.stripe.com rendered no price via fetch, and the Stripe connector needs authorisation in claude.ai connector settings. The figures in §4 are what the code says, not what Stripe charges.
- **api.metals.live status:** host blocked. Whether the endpoint still works is unknown.
- **Real-device WebGL cost:** the headless numbers use software rendering and are an upper bound.
- **Snowball/avalanche engine and debt-free date** (M3): not traced line by line.
- **The second waitlist row** (created 2026-10-27 22:14:15 UTC, gmail.com): origin unknown. None of my scripts submit the form; all non-RPC Supabase REST calls were aborted or mocked.
- **Charlie Munger's death (2023):** from background knowledge, not re-verified online in this run.
- **CMA207/CMA209 guidance paragraphs** cited in §3.5: not opened by me. See `research/rules_uk_law.md`.
