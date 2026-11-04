# Settings and sidebar review (v0.9.1 candidate)

Owner, 4 Nov 2026 ~10:30: "David add another look at our settings section accessible from the sidebar. I feel there may be some irrelevant functionality, missing useful or crucial settings and superceeded features here. once you have done your review, pull in CD Pedro for a quick UI review of the Sidebar and Settinga"

Review only. Nothing is built until the owner says which parts go in. Pedro's screenshots: `shots/settings-review/` on the laptop (git-ignored).

## David: content

### Misleading or irrelevant (cut or hide)
1. **Connections promise sync that does not happen.** The copy says "Connect your accounts to sync data automatically". For 25 of the 34 cards (Monzo, Starling, Revolut, Lloyds, Barclays, HSBC, Halifax, Nationwide, Santander, Trading 212, Freetrade, eToro, IBKR, HL, Vanguard, AJ Bell, KuCoin, BullionVault, Royal Mint, Goldmoney, Claude AI, Meshy AI and others), tapping one only stores `{manual:true}` and shows "marked as connected ✓" (`connectPlatform`, default branch). No data moves. This breaks the standing rule that what the app says must match what the code does. Recommend removing them, or showing one "Bank and broker sync: coming later" line.
2. **Exchange API keys** (Binance, Coinbase, Kraken, Gemini) and **TrueLayer**: these ask users for keys or start a sign-in. Check whether they work and whether the privacy notice names those hosts. If not, cut them with item 1.
3. **Owner-only tools in the user's Settings**: ConvertKit form ID and key, and EmailJS service, template and key. Both were replaced by the Supabase waitlist and Resend. Also the Notion token, the Founding Licence link and the Pioneer NFT contract (the NFT is "not deployed yet"). Remove ConvertKit and EmailJS. Show the rest only to the owner's account.
4. **API key fields users do not need**: CoinGecko (the free feed works without a key), Metals (metals.live needs no key), Alpha Vantage (stocks come through the `stock-quotes` function). Meshy is only used by "Your own design", which is locked under Pro for everyone. Claude is only used for the Entrepreneur AI plan, on the user's own key. Recommend hiding all five under owner/developer tools. The "Save keys" button then becomes "Done".

### Superseded (duplicates)
5. "Net worth: 3D / Classic chart" duplicates the 3D | Graph switch on the Overview tile. Keep one: the tile switch, saved per device.
6. Currency is set both in the sidebar tabs and in Settings. Keep one place (Pedro: the sidebar).

### Missing or crucial (add)
7. **Theme**: Night or Daylight (plus "follow my device") is only in the header button. Add it to Settings.
8. **Manage or cancel subscription**: there's only "Already paid?". A paid plan needs an easy cancel route (UK subscription rules). Recommend a Stripe customer-portal link once payments are on.
9. **Sign out**: it sits in the Danger zone but is not destructive. Move it to the account block.
10. **Reminders**: there's no setting for a monthly check-in nudge, and the streaks depend on regular check-ins. Optional, later.

### Owner decision (prices)
11. The plan block shows "was" prices ("Monthly £3.99 (was £5.99)", "Founding £99 (was £149)"). One paragraph also says "Founding Member (£149 once ...)" while the button says £99. Reference prices are banned on the marketing pages, and the owner set £5.99 Vaulter, £3.99 for testers and early adopters. Not changed without the owner's word.

## Pedro: UI (worst first)
1. 46 emoji used as icons in Settings, 11 in the sidebar. Swap to icon pack v2, or drop them on connection cards.
2. Phone: the sidebar Settings button sits half behind the bottom tab bar. Fix: bottom padding of tab-bar height plus safe area, and a sticky footer.
3. Phone: the sidebar starts at 47px but the header ends near 105px, so the currency tabs and first rows are hidden.
4. 1100px: the top nav sits above the Settings overlay and covers the modal title.
5. Settings is about 5.3k px tall, and Connections is about 70% of that. Fix: collapse it to one "Live prices" row and use accordions.
6. The sidebar profile form (7 fields) dominates. Fix: collapse it to one card that opens the form.
7. The "+100 XP available" and "Complete profile to unlock card" call-outs compete. Fix: one line and one button.
8. Section titles render at 10px, below the 10.5px floor. Point them at `--vi-fs-1`.
9. Headings use three different styles. Fix: one for sections and one for card titles.
10. Phone option rows: the chips wrap and the labels float. Fix: label above the chips below 600px, equal-width segmented controls.
11. Three button styles with no logic. Fix: one primary per card, destructive actions as red outline only.
12. Sentence case: "Danger Zone", "Reset Financial Data", "Sign Out of this Device", "Settings & API Keys". Rename the title to "Settings".
13. The MANUAL and LIVE badges are low contrast, and pale text on beige in Daylight. Fix: use the text token.
14. The sidebar ledger has seven accent colours. Fix: colour on the icon only.
15. 1100px: no scrim behind the sidebar, and the trial toast overlaps its foot.

## Proposed Settings order
1. Account: email, plan (current price only), manage subscription, sign out.
2. Appearance and accessibility: theme, text size, contrast, motion, view.
3. Help: tour, FAQs.
4. Live prices: one on/off row with Refresh.
5. Cloud sync and version history.
6. Sign-in PIN.
7. Privacy and usage sharing: share usage, privacy notice, beta terms.
8. Your data: download.
9. Danger zone: reset financial data, delete account.
10. Owner and developer tools: hidden unless the owner flag is set.

## Overlaps
Chunk A (R23, R24) is already changing the profile card's proportions and photo, and chunk C (R22) its level source. Any Settings build must not touch those.
