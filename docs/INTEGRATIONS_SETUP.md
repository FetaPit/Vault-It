# Integrations: what to sign up for, what it costs, what changes

For the owner. Researched 30 Oct 2026; prices and terms change, so confirm at checkout. Every key goes into **Supabase secrets** (Dashboard, Project settings, Edge Functions, Secrets), never into `index.html` and never into chat. Each provider below also adds an outside host, so the privacy notice must name it (the `test_beta_client` test enforces this).

## Read this first: three things that change the plan

1. **Bank and credit card linking is FCA-regulated.** Showing users their bank balances is an "account information service". Vault-It would have to be registered with the FCA, or become the registered **agent** of a provider that is (TrueLayer, Plaid, Finexer), or use a provider that holds the licence itself (Yapily Connect). Either way, "Not regulated by the FCA" can no longer stand alone. It would read something like: "Account information services are provided by [provider], authorised by the FCA (FRN …). Vault-It acts as its agent. Other features are not regulated." **Get a lawyer to word it.** You will need a limited company, and the agent route needs professional indemnity and cyber insurance plus written policies.
2. **The stock prices the app uses today (Yahoo Finance) are not licensed for a commercial app.** They are fine while testing; replace them before charging. Licensed UK (LSE) prices cost money: Twelve Data "Venture" from $149 a month plus approval for UK prices, or a commercial quote from EODHD.
3. **One metals price source the app calls (metals.live) appears to be offline.** It needs replacing anyway.

## 1. Photo to 3D (wealth inventory)

| Provider | Cost | Speed | Notes |
| --- | --- | --- | --- |
| **Tripo** | Pay as you go, about $0.30 per textured model | About a minute | GLB; 1 photo or 4 angles; free-plan output is not for commercial use |
| **Meshy** (already used for the house) | Pro plan about $20 a month for 1,000 credits, about $0.60 per textured model | 2 to 3 minutes | GLB; you own paid-plan output |
| **Hyper3D (Rodin, by Deemos)** | API only on the **Business plan, $120 a month** (about 416 models) | Not published; their Agentic mode says 3 to 10 minutes | 1 to 5 photos; GLB and more; files kept only 7 days so the app must store them straight away |
| Stability SPAR3D | Low cost per model | Seconds | One photo, lower quality |

**Recommendation:** start with **Tripo or Meshy** (pay per model, no monthly fee beyond Meshy's Pro). Try Hyper3D side by side on 5 real items (a guitar, a watch, a ring, a handbag, a bike); move to it only if it is clearly better, because of the $120 monthly floor.

**Steps:** Tripo: developer platform, buy credits (from $1), create an API key, add secret `TRIPO_API_KEY`. Or Meshy: buy Pro, API settings, create a key, add secret `MESHY_API_KEY`. Hyper3D only if chosen: subscribe to Business, API dashboard, create a key, add secret `RODIN_API_KEY`.

## 2. Bank accounts and credit cards (Open Banking)

| Provider | How you are covered | Cost |
| --- | --- | --- |
| **Yapily** | Its own FCA firm, Yapily Connect (FRN 827001), holds the licence; its name shows on the bank's consent screen. Least paperwork, but confirm with a lawyer it covers a dashboard | Free sandbox; live price through sales |
| **TrueLayer** | Vault-It becomes TrueLayer's agent: they check the company, insurance and policies, then register you with the FCA (up to about 15 working days) | Free sandbox; live price quoted |
| **Finexer** (UK only) | Its clients become its agents (FRN 925695) | Fixed monthly plans, startup discount |
| Plaid UK | Agent of Plaid | Through sales |
| GoCardless Bank Account Data | **Closed to new customers since mid-2025** | Not an option |

- Credit cards come through Open Banking too: Amex UK, Barclaycard, Capital One, MBNA, HSBC, Lloyds, NatWest and others.
- Users re-confirm access every **90 days** inside the app.

**Recommendation:** get quotes from **Yapily** and **TrueLayer** (and Finexer as a cheaper fallback). It also unlocks the Level 2 "payday build": the mortgage payment is spotted and the bricks lay themselves.

**Steps:**
1. Make sure Vault-It trades through a limited company.
2. Sign up for the free sandboxes: TrueLayer Console and Yapily Console.
3. Book sales calls with Yapily, TrueLayer and Finexer.
4. If you go the agent route: arrange professional indemnity and cyber insurance, and written security and complaints policies.
5. Ask a lawyer for the new FCA wording for the app, the sign-up page and the privacy notice.
6. When live: add the client ID and secret as Supabase secrets (`YAPILY_APP_KEY` and `YAPILY_APP_SECRET`, or `TRUELAYER_CLIENT_ID` and `TRUELAYER_CLIENT_SECRET`).

## 3. Prices for asset tracking

| What | Today | Recommended | Cost |
| --- | --- | --- | --- |
| Stocks, funds, ETFs | Yahoo (unofficial; personal use only) | Twelve Data Venture (needs LSE approval) or EODHD commercial | From $149 a month, or quoted |
| Crypto | CoinGecko without a key | **CoinGecko Basic** (commercial rights; show "Data powered by CoinGecko") | $29 a month |
| Precious metals | metals.live (appears offline), metals-api.com | **MetalAPI** or Metals.Dev, cached on the server | From free (100 a month) or $4.99 a month |
| Trading 212 holdings | none | Official read-only API: each user makes their own key in Trading 212 | Free |
| Hargreaves Lansdown, Vanguard and others | none | No public read API; import their CSV exports | Free |

**Steps:** CoinGecko: create an account, subscribe to Basic, create a key, add secret `COINGECKO_API_KEY`. Metals: sign up for MetalAPI (or Metals.Dev free), create a key, add secret `METALS_API_KEY`. Stocks: ask Twelve Data and EODHD for a commercial quote; until then keep Yahoo for testers only.

## Order I suggest

1. Now, cheap: CoinGecko Basic and a metals key (prices stop being "personal use only").
2. With the wealth inventory build: Tripo or Meshy.
3. Before charging money: a licensed stock price feed.
4. When the company, insurance and legal wording are in place: Open Banking (Yapily or TrueLayer). This is the "track effortlessly" step and the biggest one.

Each step needs your yes before any key is used, the privacy notice is updated, and the edge function is deployed.

## Sources

- Hyper3D: [API docs](https://developer.hyper3d.ai/), [Gen-2.5 spec](https://docs.hyper3d.ai/en/api-specification/rodin-gen2-5), [API page](https://hyper3d.ai/features/api), [plans](https://hyper3d.ai/help/articles/how-much-do-hyper3d-plans-cost), [terms](https://hyper3d.ai/legal/terms)
- Meshy: [API pricing](https://docs.meshy.ai/en/api/pricing), [pricing](https://www.meshy.ai/pricing), [task lifecycle](https://docs.meshy.ai/en/api/task-lifecycle). Tripo: [API pricing](https://developers.tripo3d.ai/en/pricing). Stability: [SPAR3D](https://docs.stability.ai/api-reference/3d/stable-point-aware-3d)
- FCA: [PERG 15](https://handbook.fca.org.uk/handbook/perg15), [agency models](https://www.fca.org.uk/firms/agency-models-under-psd2). TrueLayer: [becoming an agent](https://support.truelayer.com/hc/en-us/articles/360016552778-Are-you-interested-in-becoming-a-TrueLayer-agent), [90-day reconsent](https://support.truelayer.com/hc/en-us/articles/4418813282449). Yapily: [licensing](https://docs.yapily.com/concepts/licensing-and-registration). Finexer: [pricing](https://www.finexer.com/pricing). Plaid: [UK open banking](https://plaid.com/en-gb/open-banking/). GoCardless closure: [discussion quoting GoCardless](https://github.com/we-promise/sure/discussions/366)
- Prices: [Twelve Data pricing](https://twelvedata.com/pricing.md), [EODHD commercial use](https://eodhd.com/financial-apis/commercial-vs-personal-license-use), [Alpha Vantage terms](https://www.alphavantage.co/terms_of_service/), [CoinGecko pricing](https://www.coingecko.com/en/api/pricing), [MetalAPI pricing](https://metalapi.com/pricing), [Metals.Dev pricing](https://metals.dev/pricing), [Trading 212 API](https://docs.trading212.com/api/account-data), [yfinance note on personal use](https://ranaroussi.github.io/yfinance/_sources/index.rst.txt)
