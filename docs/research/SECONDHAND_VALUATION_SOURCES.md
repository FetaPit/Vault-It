# Second-hand valuation sources for Vault-It (research, 3 Nov 2026)

Question from the owner: a rough average of sale prices for an item (for example a Gibson Les Paul in "good" condition), drawn from open second-hand sales data and not only eBay.

Context: this extends [LIVE_MARKET_VALUE.md](live/docs/LIVE_MARKET_VALUE.md) (step 3, "eBay estimate for collectables"). That page notes the eBay Browse API needs approval and that eBay's licence limits reselling price data and use in AI tools.

## Method and confidence

Done by web search only. The session's network allow-list blocked direct fetches of discogs.com, pricecharting.com and watchcharts.com, so their official pages were not read first-hand; facts about them come from search snippets and are marked "(search snippet, verify)". Nothing was bought. Treg (the aggregator connector) was searched for "resale price" and "used item price": it only offers scraping endpoints (Facebook Marketplace single listing by URL, Xianyu, a Chinese housing site). It has no used-price aggregator, so it adds nothing here and those endpoints are scraping, not recommended.

The headline finding: **there is no free, open, licensed, UK-wide feed of sold second-hand prices.** Sold prices are the commercial asset of every marketplace, so the usable data is either (a) asking prices from an approved API, (b) category specialists with their own price guides (records, games, watches), or (c) paid data. An honest feature is therefore "estimate from N current listings", with sold-price sources only where a specialist offers them.

## Source comparison

Key: Sold = real completed sales. Ask = current listing prices.

| Source | Data | Categories | UK coverage | Access | Cost | Terms and limits (aggregate shown? stored? AI?) | Rate limit | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [eBay Browse API](https://developer.ebay.com/api-docs/buy/browse/resources/methods) | Ask | Everything | Strong (EBAY_GB marketplace) | Free developer account, key; production Buy API needs eBay approval ("Growth Check") | Free | eBay API licence restricts reselling price data and, since [June 2025, use in AI tools](https://www.ecommercebytes.com/2025/07/18/ebay-restricts-developers-from-using-its-data-to-train-ai/). Showing our own aggregate, labelled "from eBay listings", is the normal use but check wording with eBay. Cache only briefly; do not build a price database from it. | Daily call limits, raised via [Growth Check](https://developer.ebay.com/develop/get-started/api-call-limits) | Recommended as the general fallback, after approval |
| [eBay Marketplace Insights](https://developer.ebay.com/api-docs/buy/marketplace-insights/overview.html) | Sold, last 90 days | Vetted categories only | Yes | Limited Release: select developers approved by eBay business units; no public form found, route is [developer support](https://community.ebay.com/t5/eBay-APIs-Talk-to-your-fellow/Marketplace-Insights-API-access/m-p/34838736) (community advice, verify) | Free if granted | A "Restricted API": data may not go into third-party generative AI tools without written consent ([EcommerceBytes](https://www.ecommercebytes.com/2025/07/18/ebay-restricts-developers-from-using-its-data-to-train-ai/), [eBay research APIs](https://edp.ebay.com/develop/buying-apps/research-apis)) | Not published | Worth one enquiry, do not plan on it |
| eBay Terapeak / sold-listing scrapers (Apify etc.) | Sold | Everything | Yes | Scraping | Per-run fees | Against eBay terms | n/a | **Not recommended** |
| Reverb ([price guide](https://reverb.com/price-guide), [API notes](https://www.reverb-api.com)) | Price guide range from completed sales; live listings | Guitars, amps, pedals, synths | Global, UK strong for guitars | Listings API is public (HAL+JSON, `Accept-Version: 3.0`). The public price-guide and transactions endpoints are reported retired or returning 403/empty in 2026 (third-party [changelog](https://apify.com/devilscrapes/reverb-sold-listings/changelog) and [MCP notes](https://glama.ai/mcp/servers/pipeworx-io/mcp-reverb/tree); not confirmed by Reverb) | Free | No official developer terms found. Treat price-guide use as needing Reverb's written permission. Third-party scrapers of the guide are not recommended. | Not published | Listings API: usable for asking prices, confirm terms by emailing Reverb. Price guide: ask Reverb for a data licence |
| [Discogs API](https://www.discogs.com/developers) | Ask (lowest/median listed, number for sale); price suggestions by condition grade for the authenticated seller; last-sold date | Records, CDs, tapes | Global, GBP supported | Free, personal token or OAuth; app name and User-Agent required | Free | Monthly data dumps are CC0, but dumps carry no marketplace prices. API use is under Discogs API Terms of Use (not read first-hand). Price suggestions reported to need an authenticated seller account and to be hidden otherwise (search snippet, verify) | About 60 per minute unauthenticated, 240 with token (search snippet, verify; moving 60 second window, headers `X-Discogs-Ratelimit*`) | Recommended for records. Confirm caching and display terms first |
| [PriceCharting API](https://www.pricecharting.com/api-documentation) | Sold-derived (their price is built from completed eBay and other sales); loose, boxed, new, graded | Video games, consoles, cards, LEGO, comics | Prices in USD, US-centric; UK values need conversion and are looser | Paid subscription token | Paid, about $49 a month per a competitor's claim (search snippet, unconfirmed) | Official docs: API is for data you purchased; **all data must be purged when the subscription ends**; keep token private. Displaying a figure is the point of the feed; redistribution not allowed. | Not published | Recommended for games and consoles only if testers use them; cost and USD caveat |
| CeX / [webuy.com](https://uk.webuy.com) | Ask (sell price) and trade-in (cash and voucher) | Phones, games, consoles, laptops, music, DVDs, cameras | Best UK trade-in benchmark | No documented public API; the site uses an undocumented JSON backend that scrapers call ([Apify actor](https://apify.com/sync-network/cex-product-scraper-uk-webuy-com)). No terms found permitting reuse. | Free if scraped | Unknown terms; undocumented endpoint is scraping in practice | n/a | **Not recommended** unless CeX agrees in writing. Email them for a partner or data feed; their trade-in price is the most honest "floor" in the UK |
| Back Market | Ask (refurbished, graded) | Phones, laptops, tablets, consoles | UK site | Affiliate programme via [Awin](https://ui.awin.com/merchant-profile/25205) offers links and likely product feeds; no price API found | Free to join, approval needed | Affiliate rules (for example avoid "discount" wording against new). Feed use for valuation not stated | Feed-based | Possible for electronics via the affiliate feed, but refurbished-with-warranty prices run above private sales, so label it "refurbished retail price" |
| Vinted | Ask | Clothes, bags, some electronics | UK big | Official Pro Integrations API is allowlisted and for sellers' own inventory, not search ([summary](https://scrapebadger.com/blog/vinted-api-best-scraping-apis-compared-for-2026)); reported terms forbid automated access | Pro account about EUR 30 a month for sellers | Scraping breaches terms (reported) | n/a | **Not recommended** |
| Gumtree | Ask | Everything local | UK strong | No public API found | n/a | Terms not verified; scraping only | n/a | **Not recommended** |
| Facebook Marketplace | Ask | Everything local | UK strong | Only inside the [Meta Content Library API](https://developers.facebook.com/docs/content-library-and-api/content-library-api/guides/fb-marketplace), restricted to approved researchers. Treg and Apify offer scraped single listings. | n/a | Commercial use not available via official route | n/a | **Not recommended** |
| [Chrono24](https://www.chrono24.co.uk) ChronoPulse | Sold-based index for 140 models, 14 brands, public chart | Luxury watches | Global | No public API reported (third-party claim, behind bot protection); datasets sold by Bright Data | Dataset price on request | Scraping or resold datasets are a licence risk | n/a | Do not scrape. Link out only |
| [WatchCharts API](https://watchcharts.com/api) | Market value from listings and sales | Watches | Global | Paid API key | Pay as you go 2,500 credits for $200; Professional + API from $600 a month (search snippet, verify) | Standard access is internal use only; showing data in our app needs a **distribution licence** at +50 percent (with attribution) or +100 percent (white label) ([licence](https://watchcharts.com/api/license)) | 1 request per second per key | Too costly for a free tier. Revisit only if watches become a major category |
| Music Magpie | Trade-in quote | Phones, games, books, CDs, tech | UK | No public API found; sell quotes sit behind their site | n/a | Not verified | n/a | Not recommended (no feed found). Same ask as CeX: write for a partner feed |
| Kaggle and open data | Mostly one-off scraped ask prices (used cars, eBay Kleinanzeigen, etc.) | Cars mainly | Mixed, stale | Download | Free | Licences vary per dataset; scraped data of unclear provenance. Example: [UK used cars on Google Dataset Search](https://datasetsearch.research.google.com/search?query=ebay) | n/a | Not usable for live items. Useful only for offline sanity checks |
| ONS | Index of second-hand goods sales and used-car CPI series, not item prices | Aggregate | UK | Free download, [Open Government Licence](https://www.ons.gov.uk/businessindustryandtrade/retailindustry/adhocs/14709secondhandgoodsstoresinternetsalesforgreatbritainjanuary2008toapril2022) | Free | OGL v3.0 allows reuse with attribution | n/a | Useful for "values for used goods generally moved X percent" only, not an item price |
| Treg connector | Scraper endpoints only | n/a | n/a | n/a | About $0.002 per listing | Scraping | n/a | Nothing suitable |

## Recommended design

### Sources, by category (3 to 5)

1. **General fallback, all categories: eBay Browse API (UK marketplace), asking prices.** Apply for production access now (it takes time). Wording must say "current eBay listings", never "sold".
2. **Records and music media: Discogs API.** Lowest and median asking price per release, plus condition-based suggestions when available. Free, global, UK-friendly in GBP.
3. **Games and consoles: PriceCharting API**, only if the owner accepts a paid subscription and USD conversion. Otherwise skip and let eBay cover.
4. **Guitars and gear: eBay first; Reverb listings API second**, subject to Reverb's written OK on terms. Ask Reverb for a price-guide licence in the same email.
5. **UK floor for electronics and games: CeX trade-in**, only with CeX's written permission. Without it, do not include.

Not worth building yet: WatchCharts (cost), Chrono24, Back Market feed (label issues), everything scraped.

### How to aggregate (server function)

- Supabase edge function `secondhand-estimate`. Input: category, brand/model text, condition grade. Keys in Supabase secrets. Cache results per query for 24 hours (short, to respect eBay licence), keep only the derived number and count, not raw listings.
- Per source, collect the last up to 50 relevant listings, drop obvious junk (parts, "for spares", boxes, cases, "wanted", price under 10 percent or over 5 times the median).
- Compute the **median** after a 10 to 20 percent trim at each end. Report an interquartile range as "typically £X to £Y".
- **Asking to selling gap:** asking prices run above real sale prices. Apply a stated haircut (start at 10 percent, tunable per category, shown in "Show working") when the source is asking-only. Never apply it silently.
- **Condition:** map the user's condition grade to the source's own condition filter where one exists (Discogs grades, eBay Used/Very good/Good/Acceptable, PriceCharting loose/boxed/new). Where it does not, scale the median by a visible factor (for example excellent 1.00, good 0.90, fair 0.75, poor 0.55) and say so.
- Minimum evidence: at least 5 usable listings, otherwise treat as "no match".
- Combining sources: show one figure per source, and the app total uses the one with the most listings, or the median of source medians when two or more agree within 25 percent. Show the spread, do not hide disagreement.

### What the user sees

- "Estimate from 23 current eBay listings (UK), checked 3 Nov 2026. Typically £820 to £1,100. Adjusted for 'good' condition."
- Tap "Show working": listings count, trim, asking-to-sale haircut, condition factor, source name and date, and a link to the search.
- Linked value changes net worth, so show change since last check and let the user unlink to type their own figure (matches the existing design).

### Fallback when nothing matches

- Keep the user's own figure and say "No reliable match found. Your figure is used."
- Offer: refine the name (add model, year, colour), choose a broader category, or open a search link on eBay "sold items" and Discogs so the user can judge it themselves and type a figure.
- For depreciating items without market data, the existing percentage-a-year decay stays as the manual option.

### Honest wording

- "Estimated from current asking prices, not a valuation, offer or sale price. Real sale prices are usually lower. Not financial advice."
- Never say "sold" unless the source is genuinely sold data. Never say "worth".
- Name the source and date each time (eBay and others require attribution, and it protects us).

## Legal and compliance notes

- **eBay:** a licence breach can end the developer account. Do not store listings as a database, do not resell the data, do not send eBay data to an AI model (including Claude) without eBay's written consent. Keep the aggregation pure arithmetic in the edge function. Describing results as "estimate from eBay listings" is the safe line; confirm with eBay during approval.
- **Marketplace Insights data** has an explicit AI restriction. Do not feed it to any AI feature.
- **PriceCharting:** purge stored data if the subscription lapses.
- **WatchCharts:** displaying to users needs a distribution licence.
- **Scraping (CeX undocumented backend, Vinted, Gumtree, Facebook, Chrono24, Reverb price guide, eBay sold via Apify):** only works against the sites' terms or without published permission. Not recommended. Treg's Facebook endpoints are the same thing.
- **Privacy notice:** each new host (api.ebay.com, api.discogs.com, PriceCharting, any other) needs a line saying the item name, category and condition is sent to that service through our server. No personal data or account data is sent; item names can be personal, so say so plainly.
- **UK law:** the wording above avoids financial promotion or advice claims. Do not describe estimates as guaranteed. Pricing claims should not mislead (eBay itself warns about FTC-style deceptive pricing rules).

## What needs the owner

1. Apply for eBay Buy API production access (Growth Check). Optional: ask developer support about Marketplace Insights.
2. Register a Discogs developer app and generate a token (free).
3. Decide whether to pay for PriceCharting (about $49 a month, unconfirmed) and for how many users it makes sense.
4. Email Reverb (price guide and listings terms), CeX and Music Magpie (partner feed or written permission). Free, slow, may be refused.
5. Approve a privacy-notice line for each new host and the edge function deploy.

## Suggested build order

1. eBay Browse median, with trim and condition factor (once approved).
2. Discogs for records.
3. PriceCharting for games if funded.
4. Reverb and CeX only after written permission.

## Sources

- [eBay Browse API](https://developer.ebay.com/api-docs/buy/browse/resources/methods)
- [eBay Marketplace Insights overview](https://developer.ebay.com/api-docs/buy/marketplace-insights/overview.html)
- [eBay research APIs](https://edp.ebay.com/develop/buying-apps/research-apis)
- [eBay call limits and Growth Check](https://developer.ebay.com/develop/get-started/api-call-limits)
- [EcommerceBytes: eBay restricts AI use of data](https://www.ecommercebytes.com/2025/07/18/ebay-restricts-developers-from-using-its-data-to-train-ai/)
- [eBay community: Marketplace Insights access](https://community.ebay.com/t5/eBay-APIs-Talk-to-your-fellow/Marketplace-Insights-API-access/m-p/34838736)
- [Reverb API docs (reported)](https://www.reverb-api.com), [Reverb price guide](https://reverb.com/price-guide), [retirement notes](https://apify.com/devilscrapes/reverb-sold-listings/changelog), [MCP notes](https://glama.ai/mcp/servers/pipeworx-io/mcp-reverb/tree)
- [Discogs developers](https://www.discogs.com/developers), [Discogs API listing](https://publicapis.dev/resource/discogs/gt7co86z)
- [PriceCharting API documentation](https://www.pricecharting.com/api-documentation)
- [CeX UK](https://uk.webuy.com), [CeX scraper (shows no official API)](https://apify.com/sync-network/cex-product-scraper-uk-webuy-com)
- [Back Market on Awin](https://ui.awin.com/merchant-profile/25205)
- [Vinted API comparison](https://scrapebadger.com/blog/vinted-api-best-scraping-apis-compared-for-2026)
- [Meta Content Library: Marketplace](https://developers.facebook.com/docs/content-library-and-api/content-library-api/guides/fb-marketplace)
- [Chrono24 ChronoPulse](https://www.fratellowatches.com/chrono24-launches-chronopulse/)
- [WatchCharts API](https://watchcharts.com/api), [WatchCharts licence](https://watchcharts.com/api/license), [WatchCharts pricing](https://watchcharts.com/subscribe)
- [ONS second-hand goods](https://www.ons.gov.uk/businessindustryandtrade/retailindustry/adhocs/14709secondhandgoodsstoresinternetsalesforgreatbritainjanuary2008toapril2022)
- [Google Dataset Search: eBay](https://datasetsearch.research.google.com/search?query=ebay)

## Unverified and to check before building

- Discogs: exact rate limits, whether price suggestions work without a seller account, and caching and display terms.
- PriceCharting: current price of API tier and exact display terms.
- Reverb: whether price-guide endpoints are really retired; no official terms found.
- eBay: whether showing a derived median from Browse listings needs separate sign-off.
- CeX, Music Magpie, Gumtree, Back Market feed: no first-hand terms found.
