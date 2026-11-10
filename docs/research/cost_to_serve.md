# Vault·It — cost to serve and price floor

> **THIS IS AN ESTIMATE MODEL, NOT A SET OF FACTS.** Every vendor price below was read from the vendor's own page on **2026-10-27** (URL next to each figure). Usage profiles, token counts per call, storage per user and so on are **assumptions** and are labelled that way. Where I could not verify something it says **NOT VERIFIED** and no number is filled in.
> Repo read on branch `Pioneer_v3`. I changed nothing. I ran read-only `SELECT`s and `list_*` calls against production Supabase `legpubblzgknxdtvsant` on 2026-10-27.

---

## 0. Headline conclusions

1. **The infrastructure cost per user is close to zero. The one cost that can grow large is the AI screenshot reader (`portfolio-vision`, Anthropic Claude Sonnet 5.5).** A typical user costs about **£0.005/month** in infrastructure and about **£0.016/month** in AI. A heavy user who updates their portfolio from screenshots every few days costs about **£0.24/month** in total.
2. **The current AI cap makes a lifetime offer unsafe.** The cap is 30 images per user per **day**, available to **every signed-in user, free tier included**. One user who uses all of it every day costs about **£168–£435 a year**. At that rate they use up the net value of a **£199 Founder** payment in about **5.4 months**, or a **£149** one in about **4 months**. There is also a refund path in the code that can make the cap leaky (section 6, risk R2).
3. **Fixed costs to run this properly as a paid product are about £37.50/month before VAT** (Supabase Pro + Workers Paid + Resend Pro, all billed in USD). That is about **£45/month if vendors add 20% VAT you cannot reclaim**. This excludes a licensed market-data feed. **Break-even: about 8–12 paying users.**
4. **The biggest unpriced cost is market-data licensing, not compute.** Share prices come from Yahoo Finance's undocumented `query1/query2.finance.yahoo.com` endpoints. Yahoo's Terms of Service prohibit automated collection and commercial use without written permission. Licensed display feeds are quote-only (EODHD) or not shown on public pages (Twelve Data commercial). This is a licensing risk, and a fixed cost that is **not yet known**.
5. **Recommended price floors, assuming the AI cap is changed** to a monthly allowance:

   | Plan | Floor | Current price | Verdict |
   | --- | --- | --- | --- |
   | Monthly | **£4.99** | £5.99 | Passes |
   | Annual | **£49.99** if not VAT-registered, **£59.99** once VAT-registered | £59.99 | Safe |
   | Lifetime | **£149** (only with a **10 images/month** AI allowance and no hosted 3D) | £149 / £199 | **£199** preferred |

   Section 5 explains how each floor was derived.

---

## 1. What the code actually calls (cost drivers found in the repo)

| Driver | Where | Who pays | Limits in code |
| --- | --- | --- | --- |
| **Anthropic Messages API, vision** | `supabase/functions/portfolio-vision/index.ts`. Model `VISION_MODEL` defaults to `claude-sonnet-5-5`, `max_tokens: 4096`, 1–4 images per call, one tool (`report_holdings`) | **Vault·It** (project `ANTHROPIC_API_KEY`) | `VISION_DAILY_CAP` default **30 images per user per day**, through `vision_take()` (migration 005; production function default `p_max` = 30, checked 2026-10-27). Max 4 images per call. Max 2.8 MB base64 per image. Refund on failure (see R2). The client downscales each image to a 1800 px long edge, JPEG q 0.85 (`index.html`, `stkShotDownscale`). **No plan check:** the only gate is "signed in" (`stkShotStart`, and the server only checks the JWT). |
| Yahoo search per extracted holding | same function, `candidates()` → `query2.finance.yahoo.com/v1/finance/search` (up to 60 holdings per read) | free / unofficial | none |
| **Stock quotes, history, search** | `supabase/functions/stock-quotes/index.ts` → `query1.finance.yahoo.com/v8/finance/chart`, `query2…/v1/finance/search` | free / unofficial (**licensing risk**) | 30 symbols per call. **No auth, no rate limit** (`--no-verify-jwt`, anon key). The client auto-refreshes when a price is older than 5 minutes (`stkAutoRefresh`). |
| **Meshy text-to-3D relay** | `supabase/functions/house-3d/index.ts`: preview (`mode: preview`, remesh 40k triangles) then refine. Also a `download` proxy for `*.meshy.ai` GLBs up to 60 MB | **The user's own Meshy key** (BYOK, kept on the device). A project secret `MESHY_API_KEY` is used **if it is set** and the caller sends no key. | **No auth, no rate limit, no per-user cap** |
| Sign-in e-mails | `send-auth-email` → Resend `api.resend.com/emails` | Vault·It (`RESEND_API_KEY`) | 8 per address per hour, 60 per IP per hour, **200 per hour globally** (`RATE_*` env). Turnstile when the IP limit trips. Migration 008 (rate limiter) is **not applied in production** yet (see below). |
| PIN auth | `pin-auth` (Supabase admin `generateLink`, no e-mail sent) | Supabase | 300 status / 60 login per IP per 10 min, 10 delete per IP per hour |
| Database + sync | `vault_data` (JSON per key), `vault_data_history` (archived versions kept **180 days**), `nw_history`, `vision_usage`, `auth_rate`, `waitlist` | Supabase | History archives at most once per 5 minutes per key ("edited"), plus "shrunk" and "deleted" events |
| Hosting | `worker/index.mjs` + `wrangler.jsonc`: one Worker, `"run_worker_first": true` | Cloudflare | Because of `run_worker_first`, **every request, static files included, invokes the Worker** and counts against the Workers request quota |
| Bring-your-own-key client calls (no cost to Vault·It) | `index.html`: Anthropic direct with the user's `claude_api_key` (Haiku 4.5 key test, income-stream plans), Alpha Vantage, metals-api.com / api.metals.live, CoinGecko public API, open.er-api.com (FX), TrueLayer auth URL, Notion via corsproxy.io, ConvertKit (Kit) form subscribe, logo.clearbit.com | user, or free public APIs | n/a. Licensing / attribution risks are in section 6 |
| Payments | `buy.stripe.com` Payment Links (monthly £5.99; annual £59.99 on the landing page, £49.99 in parts of the app; Founder £149 in the app / £199 on the landing page; "Founding Licence" £7.77 link) | Stripe fees come out of revenue | n/a |

**Production state (read-only checks, 2026-10-27):**
- Supabase org "PT Live Design" is on the **Free plan** (`get_organization`).
- Database **16 MB** in total. **4** auth users, **11** `vault_data` rows (average **908 bytes**, largest **4,759 bytes**). `vault_data_history`: **170 rows, 3.75 MB**, average stored value **20.7 KB**, first archive 2026-10-15. **1** waitlist row. `vision_usage`: **13 images in total by 1 user**, at most 11 in one day.
- Migrations applied: 001, 002, 003, `user_pins_pin_login`, `vision_usage_screenshot_cap`, `007_security_hardening`. **008 (auth rate limiter) is not applied.**
- Edge functions live: send-auth-email v9, stock-quotes v9, pin-auth v6, portfolio-vision v9, house-3d v2.
- **Not checked (no read access to secrets):** whether `VISION_DAILY_CAP`, `VISION_MODEL` or `MESHY_API_KEY` are set in production.

---

## 2. Vendor prices (current official pages, retrieved 2026-10-27)

### FX used to convert USD bills
- ECB reference rates, 27 Oct 2026: EUR/USD **1.1150**, EUR/GBP **0.83658**. Cross rate: **£1 = $1.3328, so $1 = £0.7503**.
  Sources: https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-usd.en.html and …/eurofxref-graph-gbp.en.html (retrieved 2026-10-27).
- *Assumption:* card or bank FX margins on USD invoices are **not** included. Add your card's non-sterling fee if it has one.

### Anthropic (Claude API), https://platform.claude.com/docs/en/about-claude/pricing (retrieved 2026-10-27)
- **Claude Sonnet 5.5** (the code default): input **$2 / MTok**, output **$10 / MTok**. 5-minute cache write $2.50; cache hit $0.10 / MTok. Batch API: $1 / $5.
- **Claude Haiku 5.5** (prompts up to 100k tokens): input **$0.10 / MTok**, output **$0.50 / MTok**. This is the cheaper alternative.
- Haiku 4.5 (used by the app's BYOK key test): $1 / $5.
- Tool use adds a system prompt of **286 tokens** for Sonnet 5.5 (`tool_choice` auto). Tool schemas count as input tokens.
- `inference_geo: "us"` costs 1.1×. The code does not use it.
- Vision, https://platform.claude.com/docs/en/build-with-claude/vision (retrieved 2026-10-27):
  - An image costs `ceil(w/28) × ceil(h/28)` visual tokens.
  - "Claude 4.7 and later" models are high-resolution tier: maximum long edge **2,576 px**, maximum **4,784 visual tokens** per image.
  - Example: 1000×1000 = 1,296 tokens.
- Cross-check: the same page links claude.com/pricing as canonical. I did not open it separately.

### Supabase, https://supabase.com/pricing (retrieved 2026-10-27, via Exa fetch; supabase.com is not reachable directly from this session)

**Free plan**
- $0: 50,000 MAU, **500 MB database**, 5 GB egress + 5 GB cached egress, 1 GB storage, 500,000 Edge Function invocations.
- **Paused after 1 week of inactivity**. **No automatic backups**. Limit of 2 active projects.

**Pro plan**
- **From $25/month**, including $10/month compute credits (covers one Micro instance).
- Included: 100,000 MAU (then **$0.00325/MAU**), 8 GB disk per project (then **$0.125/GB**), 250 GB egress (then **$0.09/GB**), 250 GB cached egress (then $0.03/GB), 100 GB storage (then $0.0213/GB), 2 million function invocations (then **$2 per million**).
- Daily backups kept 7 days. Spend cap on by default.

**Other points**
- Egress covers Database, Auth, Storage, **Edge Functions** and Realtime. Source: https://supabase.com/docs/guides/platform/manage-your-usage/egress (Supabase docs search, 2026-10-27).
- Supabase is rolling out VAT/indirect tax collection, 1 May to 30 June 2026, based on billing address. Source: https://supabase.com/docs/guides/platform/billing-faq.
- Cross-check: the billing-on-supabase docs page gives the same Free/Pro quota table (egress 5 GB / 250 GB; database 500 MB / 8 GB then $0.125; MAU 50k / 100k then $0.00325; functions 500k / 2M then $2 per million).

### Resend, https://resend.com/pricing (retrieved 2026-10-27, via Exa)

**Transactional**
- **Free**: $0, **3,000 e-mails/month, 100 per day**, 3 domains, 30-day log retention.
- **Pro**: **$20/month for 50,000** or $35 for 100,000; overage **$0.90 per 1,000**; no daily limit.
- Scale: from $90/month.
- Billed monthly only.

**Marketing**
- Free: 1,000 contacts.
- Pro marketing: $40/month for 5,000 contacts.

Cross-check: I found no second independent source; Resend's pricing page is the official one.

### Meshy (3D)

**Plan prices**, https://www.meshy.ai/pricing (retrieved 2026-10-27)
- Free: 100 credits/month, **no API access** (see the help-centre article below). Output licensed **CC BY 4.0**.
- **Pro: $20/month, 1,000 credits.** The page shows $10 as a first-month 50% offer.
- Studio: $70 for a 5,500-credit pool (the page layout was garbled when extracted; treat as approximate).

**API credit costs**, https://docs.meshy.ai/en/api/pricing (retrieved 2026-10-27)
- Text-to-3D **Preview, mesh only: 20 credits** (`meshy-7.1`/latest and `meshy-6`) or 5 (`meshy-6-lite`/T2).
- **Refine** (texture) 2K/4K: **10 credits**.
- So the app's preview + refine flow costs **30 credits per house** on the default models.

**Cross-check**, https://help.meshy.ai/en/articles/16815622 (2026-09-04)
- Same figures.
- "the Free plan does not have API access, even if you purchase additional credits".
- Failed tasks are refunded.

**Derived (estimate):** at Pro's $20 per 1,000 credits, that is $0.02/credit, so about **$0.60 ≈ £0.45 per generated house** if Vault·It paid. The page says API credits are bought "in your subscription settings"; I found **no separate published $/credit for API top-ups** (NOT VERIFIED).

### Cloudflare
- **Workers**, https://developers.cloudflare.com/workers/platform/pricing/ (last updated Oct 2, 2026; retrieved 2026-10-27)
  - Free: **100,000 requests/day**, 10 ms CPU per invocation.
  - Paid: **$5/month** minimum, 10 million requests/month included then **$0.30 per million**, 30 million CPU-ms included then $0.02 per million CPU-ms.
  - Requests to static assets are free and unlimited, **but only when the Worker does not run first**. Vault·It sets `run_worker_first: true`.
- **Turnstile**, https://developers.cloudflare.com/turnstile/plans/ (2026-10-27)
  - Free: up to 20 widgets, **unlimited challenges**, 10 hostnames per widget.
- **Email Routing (inbound forwarding)**, https://developers.cloudflare.com/email-routing/limits/ (2026-10-27)
  - Limits only (200 rules per domain, 200 destinations, 25 MiB per message).
  - **Price NOT VERIFIED** on this page. CUTOVER.md says the zone is on Cloudflare's Free plan with Email Routing on.

### Stripe UK

**Card payments**, https://stripe.com/gb/pricing and https://stripe.com/gb/pricing/local-payment-methods (retrieved 2026-10-27)
- Standard UK cards **1.5% + 20p**.
- Premium UK cards (commercial / corporate) **2.8% + 20p**.
- EEA cards **2.5% + 20p**.
- Other international cards **3.15% + 20p**.
- Disputes **£20** received, plus £20 if countered.
- Cross-checks agreeing on the same four rates: merchanthq.co.uk (published 2026-07-14, "as published October 2026") and digitalroyalty.co.uk (checked 16 Oct 2026). These add **+2% currency conversion**.

**Stripe Billing (subscriptions, Payment Links included)**
- Pay-as-you-go **0.7% of Billing volume**. Read from https://stripe.com/en-gb-it/billing/pricing, because the /gb page's percentage did not render in extraction.
- Consistency check: the GB page's "Pay monthly £450 for up to £70,000, save 8%" implies a pay-as-you-go cost of about £490 = 0.7% × £70,000. Treat 0.7% as **verified with that caveat**.
- It applies to recurring charges, not one-off payments.

**Stripe Tax**, https://stripe.com/gb/tax/pricing
- Tax Basic **0.5% per transaction** where you are registered (Billing / Checkout / Payment Links).
- Tax Complete from **£70/month** (1-year contract).

**Stripe Managed Payments (merchant of record)**, https://stripe.com/managed-payments
- **+3.5% per successful transaction** on top of standard processing.
- Includes global indirect tax (calculation, collection, filing, remittance), fraud and disputes.
- Works with Payment Links and Billing.

### UK VAT
- **Registration threshold £90,000** taxable turnover over 12 months (or expected in the next 30 days). Source: https://www.gov.uk/register-for-vat (retrieved 2026-10-27).
- **Standard rate 20%.** Source: https://www.gov.uk/vat-rates.
- **Sales of digital services from the UK to EU consumers:** "EU VAT will be due on all supplies of digital services to EU consumers, regardless of the value of the sales". Use the non-Union OSS or register in each member state. Sources: https://www.gov.uk/government/publications/accounting-for-vat-on-goods-moving-between-great-britain-and-northern-ireland-from-1-january-2021/accounting-for-vat-on-services-between-the-uk-and-eu-member-states-from-1-january-2021 and https://www.gov.uk/guidance/the-vat-rules-if-you-supply-digital-services-to-private-consumers (retrieved 2026-10-27).

### Market-data licensing (relevant to the stock-quotes function)

**Yahoo Terms of Service**, https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html (retrieved 2026-10-27). Clauses quoted:
- "access or collect data … from our Services using any automated means … scrapers, data mining tools … for any purpose without our express, prior permission."
- "Unless otherwise expressly stated, you may not access or reuse the Services, or any portion thereof, for any commercial purpose."
- "you must not reproduce … distribute … or exploit for any commercial purposes, any portion or use of, or access to, the Services (including content … APIs …)."
- A separate Yahoo API ToS (https://legal.yahoo.com/us/en/yahoo/terms/product-atos/apiforydn/index.html) forbids deriving income from Yahoo APIs without written permission.
- Supporting evidence (non-official): a Yahoo feedback form quoted on GitHub (iprak/yahoofinance#146) says Yahoo "licenses data from 3rd-party providers that do not currently authorize us to redistribute these data in API form".

**EODHD**
- https://eodhd.com/financial-apis/commercial-vs-personal-license-use: "packages on the pricing page are intended for personal use only".
- https://eodhd.com/commercial-pricing: Commercial "Internal use" **$399/month**, with **"Displaying it or sharing it with people outside your company is not permitted"**. Display licence is **quote only** (NOT VERIFIED price).
- Personal plans from $19.99/month: https://eodhd.com/pricing.

**Twelve Data**, https://twelvedata.com/pricing
- Public page shows **personal-use** prices (Grow $79/month, Pro $229/month, Ultra $999/month).
- **Commercial-use prices were not shown in the extract** (NOT VERIFIED).

**CoinGecko**, https://www.coingecko.com/en/api/pricing
- Demo (free) plan says "Attribution required" and has no commercial licence.
- Commercial licence from **Basic $29/month billed yearly ($348/year)**. A $35 figure also appears, probably the monthly price; not confirmed.

**ExchangeRate-API open endpoint (open.er-api.com)**, https://www.exchangerate-api.com/docs/free
- Commercial use allowed, but **attribution required** and **no redistribution**.

---

## 3. Assumptions for the per-user model (all ESTIMATES)

| Item | Light | Typical | Heavy | Basis |
| --- | --- | --- | --- | --- |
| Screenshot reads per month | 0 | 1 call × 2 images | 10 calls × 3 images | Assumption: weekly-ish portfolio updates for heavy users |
| Visual tokens per image | – | 1,950 | 1,950 | 1179×2556 phone screenshot downscaled by the client to 830×1800 gives 30 × 65 patches (Anthropic formula) |
| Non-image input per call | – | 1,200 | 1,200 | Estimate: prompt (~900 chars) + tool schema (~1.8k chars) + 286-token tool system prompt |
| Output tokens per call | – | 1,100 | 1,500 | Estimate: ~15–20 holdings × ~70 tokens. Hard ceiling 4,096 (`max_tokens`) |
| Database growth per user (steady state, 180-day history) | 1 MB | 5 MB | 56 MB | Heavy uses the production measurement: 3.75 MB of history in 12 days from about 1 active user, so about 0.3 MB/day × 180 days |
| Supabase egress per month | 2 MB | 10 MB | 100 MB | Estimate (sync pulls a few KB to tens of KB per key; heavy includes a few GLB downloads through `house-3d`) |
| Edge-function invocations per month | 40 | 300 | 1,500 | Estimate from 5-minute auto-refresh + history + search |
| Auth e-mails per month | 1 | 2 | 5 | Estimate (PIN sign-in avoids most e-mails) |
| 3D generations | 0 | 0 | 0 cost to Vault·It | BYOK: the user's Meshy key pays. Only becomes a cost if `MESHY_API_KEY` is set or a hosted allowance is offered |

**Costs per call and per image (computed with the vendor prices above):**

| Case | USD | GBP |
| --- | --- | --- |
| Typical call (2 images) | $0.0212 | **£0.0159** |
| Heavy call (3 images) | $0.0291 | **£0.0218** |
| Worst case per image, 1 image per call at 4,784 tokens and 4,096 output tokens | $0.0529 | **£0.0397** |
| Worst case per image, 4 images per call | $0.0204 | £0.0153 |
| Same worst case on **Haiku 5.5** | – | **£0.0020 per image** (about 20× cheaper) |

---

## 4. Cost model

### 4a. Fixed monthly costs (ESTIMATE; vendor prices verified)

| Line | Now (beta) | Paid launch, minimum sensible stack |
| --- | --- | --- |
| Supabase | Free, $0 (pauses after 1 week idle, no backups, 500 MB) | **Pro $25** (one Micro project; compute credit covers it) |
| Cloudflare Workers | Free, $0 (100k requests/day, all requests count because of `run_worker_first`) | **Paid $5** (needed beyond ~100k requests/day, or for CPU headroom) |
| Resend | Free, $0 (100/day — **below the code's 200/hour global limit**) | **Pro $20** (no daily limit; needed once sign-ups exceed ~100/day, e.g. an ad burst) |
| Turnstile, Email Routing | $0 | $0 (Turnstile free verified; Email Routing price not verified) |
| Anthropic, Meshy | no fixed fee | no fixed fee (pay per use; BYOK for Meshy) |
| Domain (Wix registration) | **NOT VERIFIED** | **NOT VERIFIED** |
| Licensed market data (to replace Yahoo) | – | **UNKNOWN**. EODHD display licence is quote-only; its $399/month internal licence does **not** allow display |
| Mailing-list tool (Kit / ConvertKit) | out of scope (another research task) | out of scope |
| **Total, excluding data licence and domain** | **$0** | **$50 ≈ £37.51/month** (≈ **£45.02** if 20% VAT is added and not reclaimable) |

### 4b. Variable cost per active user per month (ESTIMATE)

Infrastructure is priced at Supabase Pro overage rates (the cost once the included quotas are used up; inside the quota the marginal cost is £0). It includes MAU at $0.00325 and Resend overage at $0.0009 per e-mail.

| Profile | Infrastructure | AI (Sonnet 5.5) | **Total per month** | Per year |
| --- | --- | --- | --- | --- |
| Free user, light | £0.003 | £0 | **£0.003** | £0.04 |
| Free user, typical (can use the AI today) | £0.005 | £0.016 | **£0.021** | £0.25 |
| Paying user, light | £0.003 | £0 | **£0.003** | £0.04 |
| Paying user, typical | £0.005 | £0.016 | **£0.021** | £0.25 |
| Paying user, heavy | £0.020 | £0.218 | **£0.24** | £2.86 |
| Any signed-in user maxing **today's** cap (30 images/day, every day) | £0.02 | **£14–£36** | **£14–£36** | **£168–£435** |

**Free-tier ceilings these imply (estimate):**
- Supabase Free's 500 MB database fills at about 95 typical or about 9 heavy users (16 MB is already used).
- Resend Free's 100/day is reached with about 50–100 sign-ups in one day.
- So **a paid launch should start on Supabase Pro**. Pausing and the lack of backups on Free are also unsuitable for paying customers.

### 4c. Net revenue per payment after Stripe (standard UK card)

Monthly and annual include the 0.7% Billing fee; one-off payments do not.

| Price | Stripe fees | Net, **not** VAT-registered | Net, VAT-registered (price includes 20% VAT) | Net on premium card | Net with Managed Payments (+3.5%) |
| --- | --- | --- | --- | --- | --- |
| £5.99/mo | £0.33 | **£5.66 (94.5%)** | **£4.66 (77.8%)** | £5.58 | £5.45 |
| £59.99/yr | £1.52 | **£58.47 (97.5%)** | **£48.47 (80.8%)** | £57.69 | £56.37 |
| £49.99/yr | £1.30 | £48.69 (97.4%) | £40.36 (80.7%) | £48.04 | £46.94 |
| £199 lifetime | £3.19 | **£195.81 (98.4%)** | **£162.65 (81.7%)** | £193.23 | £188.85 |
| £149 lifetime | £2.44 | £146.56 (98.4%) | £121.73 (81.7%) | £144.63 | £141.35 |
| £7.77 founding link | £0.32 | £7.45 (95.9%) | £6.16 (79.3%) | £7.35 | £7.18 |

**Rule of thumb:** per £1 of price you keep about **94–98p** if not VAT-registered, and about **78–82p** once VAT-registered with VAT-inclusive prices. Stripe Tax Basic would take a further 0.5%.

**EU customers:** EU VAT is due from the first sale. Either block EU consumers, register for non-Union OSS, or use Managed Payments (+3.5%).

### 4d. Break-even on fixed costs (ESTIMATE)

The £45.02/month stack (VAT on vendor bills, no data licence) is covered by:

| Mix | Paying users needed |
| --- | --- |
| All monthly £5.99, not VAT-registered | **8** |
| All annual £59.99, not VAT-registered | **10** |
| All annual £49.99 | **12** |
| Monthly £5.99, VAT-registered | **10** |
| Annual £59.99, VAT-registered | **12** |

With a licensed data feed costing **£D/month**, break-even ≈ **(45 + D) ÷ 4.66** monthly subscribers in the VAT-registered case. D is unknown (section 2).

### 4e. Worst-case yearly cost of a heavy "lifetime" user

- **Under today's code:** 30 images/day × 365 days at £0.0153–£0.0397 per image comes to **£168–£435 per year**. A £199 Founder payment (net £195.81) is used up in about **5.4 months**, and £149 (net £146.56) in about **4.0 months**. The R2 refund path can push this higher.
- **Realistic heavy legitimate user:** about **£2.86 per year**.
- **If 3D generation were ever hosted** (Vault·It's key, no cap): about £0.45 per house with no limit. Today this is £0 because of BYOK.

---

## 5. Recommended price floors and cap policy (ESTIMATE)

The floors come from this rule: (worst-case capped variable cost) must not exceed a set share of net revenue.
- Subscriptions: 30% (a 70% contribution-margin rule of thumb).
- Lifetime: 50% of net over a 10-year horizon.

Both shares and the 10-year horizon are **my assumptions**; change them and recompute.

**Change the cap first:** from **30 images/day** to a **monthly allowance per plan**, enforced server-side by plan (a change to `vision_take` and a plan check in `portfolio-vision`).

| Allowance | Worst-case cost on Sonnet 5.5 |
| --- | --- |
| 10 images/month | £0.40/month = £4.77/year |
| 30 images/month | £1.19/month = £14.30/year |

| Plan | Suggested AI allowance | Worst-case break-even price (VAT-reg.) | Floor with margin rule (VAT-reg. / not) | Current price | Recommended floor |
| --- | --- | --- | --- | --- | --- |
| Free | **0–3 images/month** (or a one-off trial of 3) | – | – | £0 | Do not give Free users 30/day |
| Monthly | 30 images/month | £1.74 | £5.22 / £4.33 | £5.99 | **£4.99** (current £5.99 passes) |
| Annual | 30 images/month | £18.16 | £59.96 / £49.74 | £59.99 (landing) / £49.99 (app) | **£59.99 if VAT-registered; £49.99 acceptable only while not VAT-registered** |
| Lifetime / Founder | **10 images/month**; no hosted 3D (BYOK only); optional paid top-up packs | £61.39 (10 years) | £122.54 / £101.81 | £149 / £199 | **£149 minimum; £199 preferred.** With a 30/month lifetime allowance the 10-year floor rises to £355.47 (VAT-reg.) / £295.33 (not), so **do not** promise 30/month or "unlimited" AI on lifetime |

**Further levers that make lifetime safer:**
1. **Switch `VISION_MODEL` to Claude Haiku 5.5** if extraction quality holds up in testing. That cuts the worst-case per image from £0.0397 to £0.0020, and a 30/day cap-maxer from £435 to about £21.7/year. *Verify accuracy on real screenshots first; quality is not verified here.*
2. Cut `max_tokens` from 4,096 to about 2,000. Output is about 77% of the worst-case per-call cost.
3. Define lifetime in the terms as **"lifetime of the product, with fair-use AI allowance"**, and state the allowance numerically.
4. Never set a project-wide `MESHY_API_KEY` while `house-3d` is unauthenticated. If hosted 3D is offered, sell it as a separate credit pack priced at least 2× £0.45 per house (estimate).

---

## 6. Cost and licensing risks found

- **R1 — Yahoo Finance data used commercially without a licence (HIGH).**
  - `stock-quotes` and `portfolio-vision` call `query1/query2.finance.yahoo.com` from a server (identified with a `User-Agent`) for a paid product.
  - Yahoo's ToS forbid automated collection and commercial use without written permission (quoted in section 2).
  - Risks: blocking, breakage, legal exposure.
  - The licensed replacement is a fixed cost that is **not yet priced** (EODHD display licence quote-only; Twelve Data commercial not public). Get quotes before committing paid-plan prices or a lifetime offer that includes live prices.
- **R2 — Vision cap can leak through refunds (MEDIUM–HIGH).**
  - `portfolio-vision` refunds the allowance when the model's reply is "unreadable" (no tool call and no JSON).
  - Anthropic has still charged for that call.
  - A crafted image or text that makes the model answer in prose would cost money and refund the cap each time.
  - **Fix:** do not refund after a successful (HTTP 200) Anthropic response; refund only when the upstream call fails.
- **R3 — Free users can use the paid AI (HIGH for lifetime/free economics).**
  - The only gate is "signed in"; there is no plan check in the client or the server.
  - 30 images/day for anyone with an e-mail address. Sign-up is cheap even with Turnstile.
- **R4 — `house-3d` is an open, unauthenticated relay (MEDIUM).**
  - It has no rate limit, and the `download` action proxies up to 60 MB per request from `*.meshy.ai`.
  - That egress counts against Supabase's 5 GB (Free) or 250 GB (Pro) quota, then $0.09/GB.
  - If `MESHY_API_KEY` were ever set, anyone could spend the project's Meshy credits.
- **R5 — `stock-quotes` has no auth or rate limit (LOW–MEDIUM).**
  - It counts against 500k (Free) or 2M (Pro) invocations, then $2 per million.
  - It amplifies Yahoo traffic from Vault·It's servers, which makes R1 worse.
- **R6 — E-mail limits do not match the vendor quota (MEDIUM, operational).**
  - The code allows **200 sign-in e-mails per hour globally**; Resend Free allows **100 per day**.
  - An ad-driven sign-up burst would hit Resend's daily cap and block sign-ins.
  - Production also lacks migration 008, so the limiter is not active yet (CUTOVER.md; `list_migrations` 2026-10-27).
  - Budget Resend Pro ($20/month) before running ads, or lower `RATE_GLOBAL_PER_HOUR`.
- **R7 — Workers request quota covers static files (LOW).**
  - `run_worker_first: true` makes every asset request a Worker invocation.
  - Free allows 100k/day; Paid is $5 for 10M/month then $0.30 per million.
- **R8 — Supabase Free is unsuitable for paying users (MEDIUM).**
  - Pause after 1 week idle, no backups, 500 MB.
  - Version history grows about 0.3 MB/day for an active user (measured), with 180-day retention.
- **R9 — Attribution or licence gaps in client-side free APIs (LOW–MEDIUM).**
  - **open.er-api.com** requires an attribution link; none was found in `index.html`.
  - The **CoinGecko** free Demo/public API requires attribution and has no commercial licence; commercial use starts at Basic, $29/month billed yearly.
  - **logo.clearbit.com** is used for card logos. Its current status and terms are **NOT VERIFIED**.
  - **corsproxy.io** (Notion) and **api.metals.live** terms are **NOT VERIFIED**.
- **R10 — Meshy licensing for BYOK users (LOW).**
  - Meshy's Free plan has **no API access**, so BYOK users need a paid Meshy plan (Pro $20/month).
  - Free-plan outputs are CC BY 4.0 (attribution).
- **R11 — VAT (MEDIUM, structural).**
  - **UK:** below £90,000 turnover no UK VAT is due, but vendor invoices may carry 20% VAT you cannot reclaim.
  - **EU:** EU VAT is due from the **first** sale to EU consumers. Options: block the EU, register for non-Union OSS, or use Stripe Managed Payments (+3.5%).
  - If prices are advertised VAT-inclusive, net revenue drops about 17 points once registered (section 4c).
- **R12 — Price inconsistency (business, not cost).**
  - Annual is £59.99 on the landing page and in app settings, but £49.99 in the app offer modal and campaign.
  - Founder is £199 on the landing page and £149 in the app.
  - The model above supports **£59.99** and **£199** as the safer pair.

---

## 7. Gaps (not verified)
- Production secrets `VISION_DAILY_CAP`, `VISION_MODEL`, `MESHY_API_KEY` (no read access to secrets).
- Real per-call token usage: no Anthropic usage export was read. The 1,200-token overhead and the output sizes are estimates. Check them in the Anthropic Console usage page, or log `usage` from the API response.
- Licensed market-data **display** pricing (EODHD, Twelve Data commercial, others).
- Domain renewal cost at Wix. Cloudflare Email Routing price (believed free; not confirmed on a pricing page).
- A Meshy API credit top-up price separate from the Pro plan.
- Kit / ConvertKit mailing-list cost (another research task covers it).
- Whether Supabase, Cloudflare, Resend and Anthropic will add UK VAT to PT Live Design's invoices (depends on billing address and their registration).
- Stripe Billing 0.7%: read from the en-gb-it page and consistent with the GB page's tier maths, but the GB page's own percentage did not render.
- Extraction quality of Haiku 5.5 compared with Sonnet 5.5 on portfolio screenshots.
