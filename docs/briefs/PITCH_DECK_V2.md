# Pitch Deck v2: brief and collated comms

Owner's ask, 6 Nov 2026: "Pitch Deck v2, pull in all relevent info comms, task for Pitchdeck v2". Queue item: "Eligent Pitch Deck v2" (formerly deck v1.1).

Still to come from the owner: transcriptions of handwritten meeting notes. Add them under "Owner's meeting notes" below, word for word, before building.

## Deadline and the day

| When (Sat 7 Nov) | What | Where |
| --- | --- | --- |
| 10:00 to 10:45 | HelpBnk Starter Kit mentorship with David Amor ("Business Clarity") | Cal.com call |
| 13:00 to 18:00 | Eligent Club: "How to build a tech start-up in 2026", panels, pitches, investors | Westminster Business School, 35 Marylebone Road, London NW1 5LS |
| 13:30 to 14:30 | Free 15-minute mentor clinic (book ahead): Alexander Pemberton, Marco Poliafico, Alexander Mercury, Obi Umegbolu | Same venue |

Source: Eligent Club Eventbrite emails, 23 Oct (rescheduled to 7 Nov) and 5 Nov (updated agenda, 13:00 to 18:00); Cal.com reminder 6 Nov.

## v1 (what exists)

- Live: vault-it.co/pitch-Eligent (15 slides, noindex) and vault-it.co/pitch-Eligent-presenter (synced presenter view with the approved 5-minute script).
- Source: `site/pitch-eligent/index.html`, `presenter.html`, assets in `site/pitch-eligent/pitch/`, test `tests/test_pitch_page.js`. These are on `release/pioneer-v2` (production), not on `brand-rollout`.
- Slides: cover (tagline), problem ("People in debt have no date for owning a home"), gap, product ("One live date. A home built brick by brick"), net worth 3D (live), neurodivergent audience, behaviour change, Budget / first-time buyer, pricing ("The date is free. Changing it faster is paid"), B2B data sharing, business model ("One hook, three engines"), traction, team ("A designer who builds"), the ask ("Three things from this room"), close ("What's your keys date?").
- Already applied: Founding Membership £149, 100 places (bb1cf17); full yearly price (51dca00); neon tagline style, red in neon red and home in gold gradient neon (e97a16c).

## What Slava (Eligent founder) flagged, 4 Nov Zoom

From the owner's email to Thomas Ray Dobson (HelpBnk), 5 Nov:
- The pitch "went well" and Slava invited the owner to London.
- Gaps: a clear route to market, and financials for a pre-trading, pre-seed business.
- A letter of intent from a partner "would be invaluable at this stage".

Owner's own v1.1 list from the handwritten notes after that call (queue, 4 Nov): financials focus, seed ask and use of funds, breakeven, ROI, forecast 2027, roadmap, team change and cofounder, B2B/B2C split, scalability and distribution, neurodiverse audience, UoL study, brand deals and affiliates.

Owner, 4 Nov ~20:30: "Biggest was route to market, financial forecasts, route to B2B licencing White labeling costs, and how much i am asking for and what that money will contribute to".

Gap: the 4 Nov research brief on those slides was written in a cloud session scratchpad (`v11/research-brief.md`) and is not in git. Recover it from that session if possible; otherwise rebuild from the business plan figures below.

## Partner outreach (route to market evidence)

- 5 Nov, owner to Thomas (HelpBnk), cc David (ensobrain): asked for intros to B2B partners for a letter of intent; owner is approaching StepChange, MoneySavingExpert, Moneybox and First Time Buyer ISA providers "on the same basis".
- No replies found in Gmail as of 6 Nov. The deck must not claim any LOI, pilot or partner interest that does not exist in writing.

## Copywriter feedback: Chris, 6 Nov

1. Who is it for? The deck opens on people in debt (no other app does this) but they may not pay; halfway through it moves to first-time buyers with money. Pick one clear initial B2C buyer: investors will ask "who are we selling to?"
2. The brick-by-brick house plus the keys date is the core USP. Other money apps already do the maths. Lean into the visual, step-by-step build.
3. Social content: for example a TikTok of someone using Vault-It, then a camera pan to their real new house.
4. Keep "Get out of the red and into your home" and "What's your keys date?" for now; messaging to be improved later.

Chris's questions back: will Vault-It keep a separate B2C website once it sells white label, or focus on B2B? White label to banks and lenders is likely the big money; the government push on a first-time buyer ISA helps; consider selling to government and councils. And: any specific branding or marketing questions for Chris?

## Figures to use (Business plan v2, 1 Nov)

Source: https://claude.ai/artifact/3FL65npH4T8Mgs8qa4FKkC (Business plan tab, sections 1, 4, 9 and 10). All figures there are marked illustrative, to be rebuilt in a spreadsheet with an accountant. Do not invent new ones.

The ask, in two stages:
- Stage A, now: £20,000 non-dilutive. Founding Member pre-sale (100 × £149: £8,940 base, £14,900 at the cap) plus a Start Up Loan or grant (Business Lincolnshire Growth Hub, Innovate UK). Use: incorporate, secure the product, first paying users, first paid pilot.
- Stage B, late 2027: £150,000 to £250,000 SEIS angel round, only once a paid pilot and 30% week-4 retention are proven. Pre-money then £1m to £1.5m (today £250k to £750k). Funds the first engineer, a partnerships lead and security certifications.

Forecast (Year 1 starts at launch, December 2026):

| | Year 1 | Year 2 | Year 3 |
| --- | --- | --- | --- |
| Sign-ups (year end) | 5,000 | 25,000 | 70,000 |
| Paying users (year end) | 200 | 1,000 | 2,500 |
| Founding Members sold | 60 | 0 | 0 |
| Consumer revenue | £14,400 | £33,000 | £96,000 |
| B2B revenue | £2,500 | £26,000 | £100,000 |
| Total revenue | £16,900 | £59,000 | £196,000 |
| Costs | £17,500 | £59,000 | £190,000 |
| Net | -£600 | £0 | £6,000 |

Break-even: close in Year 1 (Stage A covers the gap), break-even in Year 2.

B2B offers:

| Offer | Buyer | Price guide |
| --- | --- | --- |
| Paid pilot | Building society, broker | £2,500 to £5,000 for 90 days |
| Partner Edition (white label) | Lenders, banks | £10k to £25k set-up, then £1 to £3 per active user per month |
| Impact licence | Debt charities | Free or at cost |
| Sponsored free tier | Brands, lenders | Pay to unlock Pioneer for their customers |

## Prices (must match Stripe)

Live since 5 Nov pricing alignment: Pioneer £5.99/month or £59.99/year; Founding £149 once (100 places). Testers: £3.99/month, £49.99/year, £99 once. The business plan still says £49.99 yearly for Pioneer: use £59.99 in the deck.

## Rules for v2

- No invented figures, testimonials, partners, LOIs, scarcity or advisers. Every number from the business plan or the owner.
- Name: Vault-It (hyphen). The business plan writes "Vault·It": do not copy that spelling.
- British English, sentence case, no em dashes. Keep "Not regulated by the FCA. Not financial advice." visible.
- Tagline neon style as v1. Fonts Syne, DM Sans, Share Tech Mono.
- The live pitch page is production: changing it is a release and needs the owner's sign-off.

## Open decisions for the owner

1. Initial B2C buyer: people in debt, or first-time buyers who are already saving? (Chris's point 1.)
2. The headline ask on Saturday: Stage A £20,000 as in the plan, or a different number?
3. B2C app and site kept alongside white label, or B2B first? (Chris's question.)
4. "Team change and cofounder": who, and what can the deck say?
5. v2 replaces vault-it.co/pitch-Eligent, or goes up at a new address with v1 kept?

## Owner's meeting notes

(To be added: the owner's transcriptions of handwritten notes, verbatim.)
