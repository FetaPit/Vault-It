# Ahrefs review for Vault-It (12 Nov 2026)

Owner, 12 Nov 2026: "Ok Run everything Ahrefs can help with".

## Summary

- Both Ahrefs connections (the claude.ai connector and the marketing plugin) are on the **Free** plan with 0 workspace units. Every data tool except the free domain rating check answers "Insufficient plan".
- vault-it.co and app.vault-it.co have a **domain rating of 0**. That is normal for a new domain with almost no links to it yet.
- I ran the basic checks a site audit does by hand on the live site. vault-it.co is in good shape. There are two small gaps (no sitemap, and the home page's canonical tag points to /sign-up) and one wording question (the capital R in the heading).

## What each Ahrefs tool returned

| Tool | Result on the Free plan |
|---|---|
| Domain rating (free) | Works. Results below. |
| Keywords Explorer (search volumes, difficulty) | Blocked. Only demo searches for "ahrefs" work. |
| SERP overview (who ranks for a search) | Blocked |
| Site Explorer (traffic, backlinks for a domain) | Blocked |
| Site Audit projects | Blocked |
| Projects and Rank Tracker | Blocked |
| Google Search Console data | Blocked |
| Brand Radar (mentions in ChatGPT and other AI tools) | Blocked |

No figures below come from blocked tools, and none are estimated.

## Domain rating: Vault-It against UK money sites

Ahrefs Domain Rating (0 to 100) measures how strong a site's links from other sites are. Checked 12 Nov 2026.

| Site | Domain rating |
|---|---|
| moneysavingexpert.com | 84 |
| stepchange.org | 83 |
| monzo.com | 81 |
| uswitch.com | 79 |
| starlingbank.com | 77 |
| money.co.uk | 75 |
| emma-app.com | 65 |
| moneyboxapp.com | 65 |
| withplum.com | 65 |
| snoop.app | 56 |
| getchip.uk | 55 |
| habito.com | 54 |
| vault-it.co | 0 |
| app.vault-it.co | 0 |

What this means: Vault-It won't rank for broad searches like "lifetime ISA" or "budgeting app" for a long time, because sites rated 55 to 84 hold those results. The realistic route is narrow, specific searches and links from places that write about first-time buyers and getting out of debt.

## Site checks done by hand (live site, 12 Nov 2026)

These are the checks a site audit makes; Ahrefs' own audit is blocked on this plan.

Working well:
- https://vault-it.co/ and /sign-up load in about 0.15 seconds and return 200.
- www.vault-it.co redirects to vault-it.co with a 301, which is correct.
- The page has `lang="en-GB"`, a title, a meta description, Open Graph and Twitter tags, and a 1200 x 630 share image (og-image.png, 246 KB).
- Every image has alt text.
- robots.txt on vault-it.co allows search engines.
- robots.txt on app.vault-it.co blocks search engines, which is right for a private app.
- The thanks, confirm and unsubscribe pages, and the investor answers page, are all marked `noindex`.
- Unknown addresses return a real 404.

Gaps:
1. **No sitemap.** https://vault-it.co/sitemap.xml returns 404, and robots.txt doesn't point to one. A sitemap with the two public pages (/ and /sign-up), plus a `Sitemap:` line in robots.txt, helps Google and Bing find the site. This is a small change to `tools/build_site.js`.
2. **The home page's canonical tag points to /sign-up.** https://vault-it.co/ serves the sign-up page with `canonical` set to https://vault-it.co/sign-up, so search engines will list /sign-up rather than the bare domain. This works, but most sites make the bare domain the main address. It's your choice: keep it as it is, or set the canonical to https://vault-it.co/.
3. **Heading wording.** The main heading in `landing.html:264` reads "Get out of the **Red** and into your home." The brand tagline is "Get out of the red and into your home." with a lower-case r. If the capital is deliberate, keep it.
4. **No structured data.** There's no JSON-LD block (for example Organization or WebSite). This is optional. If added, it must only state facts, with no ratings or reviews.

## Next steps

Free, for the owner:
1. **Google Search Console** (search.google.com/search-console): add vault-it.co as a domain property and verify it with the TXT record Google gives you, added in Cloudflare DNS. This is the best free source of which searches bring people to the site.
2. **Ahrefs Webmaster Tools** (ahrefs.com/webmaster-tools): add vault-it.co and verify it, either by connecting Search Console or with a DNS record. This unlocks Ahrefs' site audit and backlink report for your own site on the Ahrefs website. Those reports may still not reach me through the connector while the plan is Free.
3. Don't add the Ahrefs Web Analytics script to the app or the sign-up page. It would mean a new outside address, a privacy notice change and a failing `tests/test_beta_client.js`.

Paid, owner decision: an Ahrefs paid plan unlocks keyword research, competitor searches, rank tracking and Brand Radar through the connector. Prices are at ahrefs.com/pricing; this report doesn't quote one.

Possible builds, each its own queue item through `ship-item`:
- Sitemap and robots.txt `Sitemap:` line (gap 1).
- Canonical change, if you choose it (gap 2).
- Heading capital, if you want it lower case (gap 3).
