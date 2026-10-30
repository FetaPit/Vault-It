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

## Needs Pete's yes

- Build step 1 now? (no cost, no new host)
- Step 2 (Land Registry, server function and privacy line)?
- Apply to eBay for step 3?

Sources: [eBay Browse API](https://developer.ebay.com/api-docs/buy/browse/resources/methods), [eBay call limits and Growth Check](https://developer.ebay.com/develop/get-started/api-call-limits), [eBay licence update on restricted pricing data (EcommerceBytes)](https://www.ecommercebytes.com/2025/07/18/ebay-restricts-developers-from-using-its-data-to-train-ai/), [UK House Price Index](https://landregistry.data.gov.uk/app/ukhpi/), [UK HPI on data.gov.uk (Open Government Licence)](https://data.gov.uk/dataset/uk-house-price-index).
