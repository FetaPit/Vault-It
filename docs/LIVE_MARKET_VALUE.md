# Live market value for assets (proposal, 30 Oct 2026)

Owner's ask: an option to link an asset to its live market value, so the figure updates on its own.

Today stocks and funds (Yahoo, via our server), crypto (CoinGecko) and metals (spot prices) already update. Wealth inventory items, liabilities (cars and other depreciating things) and property are typed in by hand; liabilities can lose a set % a year.

## The idea: "Link to market value" on any item

Each wealth or liability item gets a **Value: manual / linked** switch. When linked, the tile shows the live figure, the source, the date it was last checked and "Show working". The user can always unlink and type their own figure. Nothing is guessed: if a source has no answer the item keeps the user's own figure and says so.

| Kind of item | Source | Cost and access | New outside host |
| --- | --- | --- | --- |
| **Gold, silver, platinum jewellery, coins, bars** | Weight and purity (for example 9ct, 18ct, 925) × the metal spot price the app already fetches | Free, works now | None |
| **Shares or funds held as an item** | Link to a holding in Stocks and funds | Free, works now | None |
| **Your home** | Purchase price × the change in the official UK House Price Index for its local authority since purchase (HM Land Registry, Open Government Licence) | Free | Land Registry (via our server, monthly) |
| **Watches, guitars, bags, cameras, consoles** | Median of current eBay listings for the exact model, with outliers removed | Free eBay developer account, but the Buy (Browse) API needs eBay's approval of our use; sold prices need a further limited-release API | eBay (via our server) |
| **Cars and vans** | A paid UK valuation API (for example Cap HPI or a similar provider) from the registration and mileage | Paid, quote needed | The provider (via our server) |

## Suggested order

1. **Now, no new costs or hosts:** precious metal items by weight and purity, and linking an item to a stock or fund holding.
2. **Home value by local house price index:** free open data; needs a small server function (your yes to deploy) and a privacy notice line.
3. **eBay estimate for collectables:** apply to eBay for Buy API access first; their licence restricts reselling price data and using it in AI tools, so the wording "estimate from current eBay listings" must be exact.
4. **Car valuations:** only if testers ask; it is the one with a monthly bill.

## Guard rails

- "Estimated market value, not an offer or a valuation. Not financial advice."
- Linked values change net worth, so the change is shown ("+£120 since last week, gold price") and every figure has "Show working".
- Prices are fetched by our server where a key is needed; keys live in Supabase secrets only.

## Step 1 built (30 Oct 2026, branch `brand-rollout`)

- Every wealth inventory tile has **Link to market value**. The pop-up offers: my own figure, precious metal by weight, or shares or a fund.
- **Metal:** weight (grams or troy ounces) × purity (9ct to 24ct; sterling, Britannia, fine silver; 950 and 999 platinum and palladium) × the price per troy ounce in Precious metals. If nobody has fetched or typed a price, the item keeps your own figure and says so (the built-in starting price is never used as a valuation).
- **Shares or a fund:** units × the price of a holding in Stocks and shares (live quote, your typed price, or your average cost, and it says which). Count units here or there, not in both.
- The item's own figure is kept. Unlinking goes back to it, and it is shown whenever the link cannot be priced (holding removed, no price yet).
- **Show working** on the tile: the sum, the source and when it was checked, the change since the reading about a week ago, your own figure and the guard-rail line.
- Linked values count in Wealth inventory, total assets and net worth. Test: `tests/test_live_value.js`.
- Not checked from the build sandbox: whether the metals price feed (`api.metals.live`) still answers. If it does not, typed prices in Precious metals still work.

## Needs Pete's yes

- ~~Build step 1 now?~~ Yes, built 30 Oct.
- Step 2 (Land Registry, server function and privacy line)?
- Apply to eBay for step 3?

Sources: [eBay Browse API](https://developer.ebay.com/api-docs/buy/browse/resources/methods), [eBay call limits and Growth Check](https://developer.ebay.com/develop/get-started/api-call-limits), [eBay licence update on restricted pricing data (EcommerceBytes)](https://www.ecommercebytes.com/2025/07/18/ebay-restricts-developers-from-using-its-data-to-train-ai/), [UK House Price Index](https://landregistry.data.gov.uk/app/ukhpi/), [UK HPI on data.gov.uk (Open Government Licence)](https://data.gov.uk/dataset/uk-house-price-index).

## Value over time (Round 3, item 8, 31 Oct 2026)
- Every wealth item keeps `valHist`: one reading a day at most, `{d: 'YYYY-MM-DD', v, src}`, newest 120. `src` is the live source when the item is linked and priced (for example "Gold spot price"), otherwise "your figure". Stored on the item like the rest of the user's data (device and their own cloud copy); nothing is sent anywhere new.
- The tile shows a small line of the readings and the change since the first one; the full sentence and the latest source are in its label.
- The link pop-up suggests a source from the item's name: a metal word (gold, sovereign, Krugerrand, Britannia, silver, platinum, palladium, carat marks) suggests the metal by weight, a ticker or name of a holding in Stocks and shares suggests that holding. No weight, purity or units are filled in. When nothing fits it stays on "My own figure" and says so; the own figure can be edited there and each change is kept in the history.
- Test: `tests/test_value_hist.js`.

## Step 3 part 1 built (v0.9.1, branch `v09x/secondhand-value`): second-hand price estimate
- Owner, 3 Nov: "dont just look at ebay as we need a rough average of sale prices. Look at other open source 2nd hand sales data for an aggregate valuation." There is no free licensed feed of sold prices (see `docs/research/SECONDHAND_VALUATION_SOURCES.md`), so the feature says "from current asking prices", never "sold", and shows a stated allowance.
- **In the app:** Wealth inventory, Link to market value, "Second-hand prices (estimate)": search words (from the item name), kind of item, condition (new, excellent, good, fair, poor). "Search second-hand prices" asks the edge function. The result is shown with "Show working" and is **never applied until the user taps "Use this estimate"**. Saved on the item additively: `cond` and `link {type:'market', v, lo, hi, n, at, q, cat, cond, haircut, cf, srcs, srcd}` (derived numbers only, no listings). If the function is not deployed or no source is on: "Not available yet" plus two manual links (eBay sold items, Discogs). **Liabilities (part 1b, owner: "as well as the liabilities"):** each liability tile has "Second-hand prices" opening the same search. A tap on "Use this estimate" sets the liability's own value (old figure kept as `estWas`, numbers as `est`, condition as `cond`) only when the item has no yearly depreciation of its own; with a depreciation rate the estimate is shown for information only (it would be counted twice). `depreciatedValue()` is unchanged.
- **Edge function `secondhand-estimate`** (`{q, cond, cat}`): per-source adapters; junk filter (spares, parts, case only, wanted and so on); prices under 10% or over 5x the median dropped; 15% trimmed each end; median and interquartile range; 10% asking-to-sale allowance (per category, shown); condition factor new/excellent 1.00, good 0.90, fair 0.75, poor 0.55 unless the source filters by condition; at least 5 usable prices per source else no match; two or more sources within 25% give the median of their medians, otherwise the source with most prices; 24 hour in-memory cache of derived numbers only (no table, so no migration); about 40 upstream searches a minute.
- **Sources and switches:** Discogs (records; lowest asking price on up to 10 matching releases, GBP) is on once `DISCOGS_TOKEN` is set. eBay (`SECONDHAND_EBAY=on`, `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`), Reverb (`SECONDHAND_REVERB=on`) and PriceCharting (`SECONDHAND_PRICECHARTING=on`, `PRICECHARTING_TOKEN`, and `USD_GBP` set by the owner; no guessed rate) are off until approved. Flag off means no call. Categories route sources: Discogs for records, Reverb for instruments, PriceCharting for games, eBay for all.
- Fixtures in `tests/fixtures/secondhand` follow each API's documented shape with made-up prices; they are not live recordings (no keys here). Re-check each adapter against the real API when its key arrives.
- Tests: `tests/test_secondhand_server.js` (node), `tests/test_v091_secondhand.js` (browser).
