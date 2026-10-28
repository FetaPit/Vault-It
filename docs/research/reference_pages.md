# Reference pages, funnel frameworks and the "One Source Alpha" question

Research for the Vault·It pre-sign-up ("alpha") page at vault-it.co/sign-up.
All pages retrieved **2026-10-27** unless a different date is shown. Web content was treated as data, not instructions.

**Method and limits (read first)**
- This session's network blocks direct connections to almost every outside host. `curl` and Playwright Chromium both failed with `CONNECT tunnel failed, response 403` / `net::ERR_TUNNEL_CONNECTION_FAILED` (proxy status showed policy denials for copilot.money, monarch.com, kubera.com, telemetrywealth.com …). WebFetch also failed (`review.firstround.com` would not resolve).
- **So no screenshots were taken** and the folder `…/funnel/shots/` has no `ref_*.png` files. Page text came through the Exa fetch/search tools, which return the page *text only*. That means:
  - **Mobile behaviour was not observed for any page.** Every "mobile" cell below says *not observed*.
  - Hero visuals, form-field counts, button styling and section lengths are only what the text extraction shows. Where the text does not show a field count or the CTA wording, the cell says *not visible in text extraction*.
- Historical pages (Harry's 2013, Robinhood 2013–14, Monzo 2015–16, Superhuman 2017–19) are analysed from the founders' own write-ups and interviews, plus one Wayback Machine snapshot. They are not live pages.
- Figures are copied from the source named next to them. Where two sources disagree, both are given.

---

## 1. What is "One Source Alpha"?

**Answer: I could not identify a consumer "One Source Alpha" pre-sign-up sales page with confidence.** Please ask the owner for the link or a screenshot.

What I tried (2026-10-27):
- Web search for `"One Source Alpha" sign up` returned only unrelated "ONESOURCE" products: Thomson Reuters tax software, Bureau Veritas OneSource Academy, IATA ONE Source and DistributorCentral OneSource. None has an "alpha".
- Web search for `onesourcealpha OR "1sourcealpha" OR "one-source-alpha"` found no exact matches. It returned OneSource Specialty Pharma (India), Thomson Reuters and OneSource CRM.
- Exa searches for "One Source Alpha early access waitlist pre-sign-up page", the same with "pre-sale founding members", "trading community / stock picks", and "'one source' app all your finances in one place waitlist alpha".
- Grep of the Vault-It repo and the funnel scratchpad folder for "one source"/"onesource"/"1source": the only hits are unrelated uses of the phrase "one source of truth".

**Closest real match (low confidence that this is what the owner means):**
- **OneSource (onesource.io), "OneSource Alpha"** is a *developer* early-access programme for a unified blockchain/Web3 data API. It is B2B, not a consumer finance app.
  - LinkedIn post "🚨 OneSource Alpha is Live 🚨" dated 2025-11-06 (https://www.linkedin.com/feed/update/urn:li:activity:7392246430423334912). It says: "We're opening up early access to our unified blockchain API, and we need builders to put it to the test." It gives three ✅ bullets: "Free to use, no credit card required", "Locked in early adopter pricing", "Shape the future of blockchain infra". The CTA is "Start building for free → onesource.io/".
  - Sign-up page https://app.onesource.io/signup has the heading "Sign Up / Get your first API key." It has a marketing-consent line, "I agree to receive email updates about product news, features, and offers from OneSource. Unsubscribe at any time." and a "Get Started" button. The number of fields is not visible in the text.
  - The homepage https://www.onesource.io/ now reads only "OneSource - Blockchain data for AI agents".
  - If this *is* the reference, the transferable pattern is the three-promise "alpha" offer: free now, early-adopter price locked, help shape the product. Pair it with a separate marketing-consent checkbox.

**Other "Alpha" pages found while searching.** None of them is called One Source:
- **"Alpha" by Ecomm Hero Academy** (https://www.ecommheroacademy.com/alpha) is a UK *founding-member pre-sale* page with a Hormozi-style value stack. It is analysed below as a pattern to avoid.
- **Alpha Investors** (https://join.alphainvestors.io/) is a founder-led UK investing community with an "Alpha OS" waitlist. It is analysed below and is a good example of honest scarcity.
- **Monzo's "Mondo Alpha Preview"** (2015) is the best-documented UK fintech "alpha" programme. It is analysed below and is probably the most useful model for Vault·It whatever "One Source Alpha" turns out to be.

---

## 2. Framework basics, from primary sources

### 2.1 ClickFunnels / Russell Brunson: squeeze page → thank-you page → ascension
- **Squeeze page.** Source: the ClickFunnels "Squeeze Page Funnel" recipe by Todd Dickerson (https://app.clickfunnels.com/recipes/1). "The only goal of a squeeze page is to get somebody to give you their email address. These pages have very few other distractions. Often times, I won't even put a logo on the page or any complicated footers or extra links. The #1 secret … is to use a curiosity-based headline." The funnel has two pages, Squeeze Page then Thank You Page.
- The ClickFunnels blog "12 Tips To Master Your Squeeze Page Design" (https://www.clickfunnels.com/blog/squeeze-page/, last updated 2025-06-20) widens the definition to "sign up for a free trial, join a waitlist, or even make a purchase". It recommends curiosity, urgency ("Sign up now before midnight!") and scarcity ("Only 23 spots left!") headlines.
  - ⚠️ For a UK finance app the urgency and scarcity examples conflict with the CMA guidance (§5) unless the deadline or limit is real.
- **Thank-you page as the first step up.** Brunson tells this story in "My New 'Thank You Page' Secret" (Marketing Secrets podcast transcript, https://jarvislegacy.com/podcast/my-new-thank-you-page-secret/) and again in FHL "One Funnel to Rule Them All" (Ep. 135 transcript, https://podscripts.co/podcasts/marketing-secrets-with-russell-brunson/one-funnel-to-rule-them-all-how-to-find-the-one-that-actually-matters-marketing-ep-135, published 2026-07-06).
  - The thank-you page after webinar registration offered a free trial. Brunson's account: "2,500 people had ended buying the $1,000 version … but 7,500 people had stuck on recurring who had clicked on that link". These are his own figures and were not verified independently.
  - He later sent people to different thank-you pages depending on a one-question "where are you struggling most?" answer on the registration step.
  - **Implication:** the Vault·It thank-you page is where the second ask belongs (founding-member pre-sale, tester application, referral). It should not be a dead end.
- **Lead-magnet funnel.** The ClickFunnels support doc "How to Create a Lead Magnet Funnel" (https://support.myclickfunnels.com/docs/how-to-create-a-lead-magnet-funnel/) describes two pages. The opt-in page needs a headline, a short description of the offer and a form. The thank-you page confirms the submission, delivers the item and can carry "additional calls to action".
- **Hook, Story, Offer.** Source: ClickFunnels blog (https://www.clickfunnels.com/blog/hook-story-offer/, last updated 2025-06-27).
  - "Hook — … a headline and subheading that grabs your target market's attention … triggers their curiosity."
  - "Story — … how the product you're selling changed your life … and how it changes your customers' life as well."
  - "Offer — … the price/value ratio is so compelling that your target market will have trouble saying 'no'."
  - Tips: use curiosity, leverage empathy.
- **Value ladder.** Source: ClickFunnels blog (https://www.clickfunnels.com/blog/value-ladder/, last updated 2024-04-18). There are five stages:
  - **Bait**: a free high-value offer.
  - **Front End**: a compelling, heavily discounted offer.
  - **Middle**: the main thing you sell, often a subscription.
  - **Back End**: more expensive and more valuable.
  - **The Peak**: the premier offer. ClickFunnels' own Inner Circle is "limited to only 100 people at a time".
  - Continuity (subscription) runs along the bottom of the ladder.
  - **A possible Vault·It mapping, offered as my suggestion and not from the source:** Bait is the free waitlist plus a free tool such as a deposit-timeline calculator. Front End is the free plan or beta access. Middle is Pioneer monthly or yearly. Peak is the Founding Member lifetime plan.

### 2.2 Alex Hormozi: value equation and Grand Slam Offer
- **Value equation.** Source: Hormozi's own $100M Offers audiobook, read on *The Game* podcast, "Part 3: $100M Offers Book" (transcript https://podscripts.co/podcasts/the-game-with-alex-hormozi/part-3-100m-offers-book, 2023-08-19).
  - "Dream outcome times perceived likelihood of achievement divided by Time delay times effort and sacrifice equals value."
  - He adds that beginners inflate the top of the equation with bigger claims. "The best companies in the world focus all their attention on the bottom side of the equation." Also: "fast beats free."
  - Cross-checked with acquisition.com's free bundle page (https://www.acquisition.com/offers-oo), which lists "The Value Equation — The 4 variables that determine how much any buyer is willing to pay".
- **Grand Slam Offer enhancers.** Source: the official book sales page (https://shop.acquisition.com/products/100m-offers-hardcover) and the library table of contents (https://catalog.myrichlandlibrary.org/Record/282362). Section IV covers scarcity, urgency, bonuses, guarantees and naming.
  - The sales page says: "The Scarcity Stack … three different types of scarcity … (without lying)". It also promises "ethical time pressure" for urgency and "4 types" of guarantees.
- **MAGIC naming.** Source: acquisition.com checklist PDF (https://www.acquisition.com/hubfs/Offer%20Checklists%20-%20PDF%20Downloads/Product-Naming-Checklist.pdf): "Make A Magnetic Reason Why · Announce Your Avatar · Give Them a Goal · Indicate a Time Interval · Complete with Container Word".
- **Chapter detail from a secondary summary.** This is not the primary text and is labelled as such. Source: https://www.devendavis.com/book-summaries/100m-offers.
  - Ch.11 describes "honest scarcity": publicly stating how close you are to capacity, e.g. "81 percent full".
  - Ch.12 claims "the last 4 hours, about 3% of the time, bring in 50 to 60% of the sales" of a week-long launch. That is Hormozi's claim and has not been verified.
  - Ch.14 says guarantees are the biggest lever. The book is cited as saying changing only the guarantee can lift conversion "two to four times". This is his claim and was not verified.
- **Translating this to Vault·It:**
  - Dream outcome: "own your home, and see the house build as your deposit grows".
  - Raise perceived likelihood with a working beta, the founder's face and name, and real tester quotes.
  - Cut time delay: show a first win in minutes, such as a deposit-date estimate from your own numbers.
  - Cut effort: no bank login needed.
  - Scarcity and urgency must be *honest* (see §5 and the patterns-to-avoid list).

---

## 3. Reference pages: what each one does

Key: **Proof** = the type of proof and where it sits. **Form** = number of fields and the CTA text. "n/v" = not visible in the text extraction. Mobile behaviour was not observed for any page (see Method).

### A. Consumer personal-finance and fintech pages

#### A1. Copilot Money: homepage and beta-waitlist pages (US)
- URLs: https://copilot.money/, https://agent.copilot.money/, and the beta post https://www.copilot.money/dispatch/beta-introducing-your-money-assistant (2026-04-16).
- **Hook:** "Your money, beautifully organized." **Sub-head:** "All of your accounts, spending, and investments, automatically tracked."
- **Hero:** the text shows rotating life-goal labels ("Baby, wedding, Date night, Groceries, Home…") and UI demos with realistic numbers. The image itself was not seen.
- **Proof:**
  - Award badges right under the hero: "Editor's Choice", "Apple Design Awards Finalist", "Must-Have Finance Apps", "Apps We Love".
  - Further down, a long wall of named App Store reviews and X posts, plus a Marques Brownlee "What's on my Phone 2026!" mention.
- **Offer and price:**
  - "Test drive for free … before you connect a single account. If you like what you see, you can start a free trial."
  - Price shown on the homepage: "$7.92 /mo — $95, billed yearly … No ads, no hidden fees." It links to "Why isn't Copilot free?" and says "Your data stays private".
  - The FAQ (https://www.copilot.money/faq) says "A 1-month free trial is included for new users".
- **Waitlist:** the beta assistant and MCP features use a separate page, agent.copilot.money. Its copy: "Meet your personal money assistant — Proactive, intelligent, and built for you", four benefit tiles, and "Copilot suggests, you approve". The blog CTA reads "If you want to be among the first to try it and help shape where it goes, join the waitlist."
- **Urgency or scarcity:** none.
- **Form, CTA and consent:** "Get started". Fields and consent are n/v.
- **Section order (homepage):** hero → badges → feature blocks (spend → wealth) → pricing → reviews → closing CTA "Gain peace of mind".
- **Borrow:**
  - A price shown openly, with a one-line "why we charge" link. This is a trust signal: no ads, so the customer is not the product.
  - "Try before you connect a single account".
  - Waitlist copy that is about *shaping* the product.
  - "You approve" language for anything automated.
- **Avoid:** nothing scam-like. It leans on US celebrity and awards proof, which Vault·It does not have yet.

#### A2. Monarch (US)
- URL: https://www.monarch.com/
- **Hook:** "The modern way to manage money" / "Your home base for money clarity".
- **Proof:** a large block of App Store review quotes, an editorial quote ("best budgeting app overall for 2024") and a community count, "Join our growing community of 50,000+ Redditors".
- **Offer:** "Try Monarch free for 7 days … No ads and best-in-class connectivity."
  - Connectivity claim: "connect with 13,000+ financial institutions". This is Monarch's own claim.
- **Urgency:** none. **Form:** n/v.
- **Section order:** hero → feature tabs (Track/Budget/Collaborate/Plan) → feature sections → testimonials → community → trial CTA.
- **Borrow:** a community proof point (Reddit) that a founder can copy early with a Discord, subreddit or WhatsApp group of testers. Collaborate-with-partner framing suits house-deposit couples.
- **Avoid:** it is long and feature-heavy, which is wrong for a squeeze page.

#### A3. Kubera (global, founder-led tone)
- URL: https://www.kubera.com/ (the pricing page returned "CRAWL_NOT_FOUND").
- **Hook:** "The Balance Sheet for those who keep the 1%". **Sub-head:** "$250 a year, not 1% of your wealth."
- **Proof:** a *named* founder testimonial placed straight after the hero, from Eoghan McCabe, Founder & CEO of Intercom. Further named founder quotes follow (Morning Brew's Austin Rief, among others).
- **Story:** "Take back your wealth / Skip the middleman": an anti-industry narrative about 1% advisory fees.
- **Price:** shown in the headline as a contrast with the alternative.
- **Urgency:** none. **Form:** n/v.
- **Borrow:**
  - The price set against the cost of the alternative. Vault·It could use the same move, e.g. Founding Member price versus the cost of a spreadsheet, a planner or a mortgage-adviser session, *only if verifiable*.
  - Named, credible, specific testimonials.
  - A clear "who it's for".
- **Avoid:** wealthy-audience positioning ("the 1%") does not suit first-time UK buyers.

#### A4. Origin (US)
- URL: https://useorigin.com/
- **Hook:** "Meet your proactive AI Financial Advisor."
- **Hero:** example insight cards with concrete numbers, e.g. "You have $23,400 in savings earning almost nothing (~0.01%) … earns about $975/year."
- **Proof:** "Loved by these companies" plus first-name-and-initial testimonials.
- **Urgency:** none. **Form:** n/v ("Download Origin").
- **Borrow:** a hero that *shows the product's output* on realistic example numbers. For Vault·It that would be the 3D house plus "deposit 62% → est. March 2029". Label it clearly as an example and *never* present it as a typical result.
- **Avoid:** savings claims with specific amounts. In the UK any promise of savings or returns needs care, and Vault·It must not invent figures (owner's rule).

#### A5. Fina (US)
- URL: https://fina.money/
- **Hook:** "Modular Financial Tracking Unique as You". Proof sits *above* the headline: "Trusted by 20,000+ active users".
- **Price table on the page:**

  | Plan | Billed yearly | Billed monthly |
  |---|---|---|
  | Free | $0 | $0 |
  | Premium | $8.25/m | $12/m |
  | Business | $20/m | $25/m |

- **Referral:** "💡 Pro tip: invite 3 friends to Fina and get Premium free for life."
- **Proof:** a wall of creator testimonials with @handles.
- **CTA:** "Try Fina For Free". **Form:** n/v. **Urgency:** none.
- **Borrow:** a user count next to the headline (only once it is real), and a simple, achievable referral reward that is the product itself, not cash.
- **Avoid:** an influencer testimonial claiming "$260,000 debt to millionaire in 10 years" sits next to the product. In UK finance, a testimonial that implies the app caused a wealth outcome is risky.

#### A6. Rocket Money (US)
- URL: https://www.rocketmoney.com/
- **Hook:** "Budget smart. Cancel what you don't need."
- **Proof:** "a few of our thousands of 5 star reviews*", with the asterisk note "*Reviews may have been edited for clarity and/or conciseness."
- **Offer:** a free tier plus Premium ("real access to humans …").
- **Urgency:** none. **Form:** n/v.
- **Borrow:** the honesty footnote on edited reviews. The UK DMCC Act regime on fake reviews makes this kind of transparency sensible; see the rules files for the detail.
- **Avoid:** the extracted text repeats each block three times, so the page carries a lot of repeated copy.

#### A7. Cleo (US/UK)
- URL: https://meetcleo.com/
- **Hook:** "Money talks. Cleo talks back." A strong personality-led voice: "Finally, a financial assistant without a fleece vest."
- **Proof:**
  - App Store quotes.
  - A dated press list ("Cleo in the news"), including UK pieces such as the 2025-09-30 article on its unicorn status.
  - An FAQ on bank linking ("linked through Plaid").
  - Regulatory footnotes ("not an FDIC-insured bank").
- **CTA:** "Get Cleo for free now" (App Store / Google Play).
- **Borrow:** a voice that makes money feel less scary, an FAQ that answers "do you store my bank details?" directly, and regulatory and status footnotes.
- **Avoid:** "roast" humour may not fit a trust-first, house-deposit audience.

#### A8. Emma (UK)
- URL: https://emma-app.com/
- **Hook:** "Take control of your money". **Sub-head:** "Download Emma to build your credit, save more and spend less with the all-in-one financial membership."
- **Proof:**
  - A dedicated "Security & support you can trust" block: open banking, "can revoke consent anytime", "256-bit TLS encryption and biometric login".
  - Numbers: "3m+ downloads", "10bn+ analysed transactions".
  - Dated Trustpilot-style quotes.
- **Offer:** "7-day free trial, cancel anytime" and tiers Basic / Plus / Pro / Ultimate. The prices were not shown in the extraction.
- **Compliance:** "Capital at risk." appears next to investing.
- **Borrow:** a UK-specific security block written in plain English, "revoke consent anytime", and inline risk warnings.
- **Avoid:** none noted.

#### A9. Snoop (UK)
- URL: https://snoop.app/
- **Hook:** "Cut the cost of living and build your savings".
- **Trust:** "We never see your bank login details … We're registered with the Financial Conduct Authority."
- **"How does Snoop make money?"** It explains its revenue openly: switching commissions, anonymised insight, and Snoop Plus. Snoop Plus price as shown on the page: "£5.99/mth or £47.99/year".
- **Proof:** user quotes (e.g. "claimed back over £700!"). A London postal address is shown.
- **Borrow:**
  - **The "How do we make money?" FAQ is the single most transferable trust pattern for Vault·It.**
  - A physical address and a named contact.
  - Snoop Plus is priced like Pioneer monthly (£5.99). Its £47.99/yr is below Vault·It's £59.99/yr. Cross-check with the pricing files.
- **Avoid:** none noted.

#### A10. Moneyhub (UK)
- URL: https://www.moneyhub.com/
- **Finding:** it is now B2B ("The context engine for financial services"), with case-study quotes from Mercer, Nationwide and Admiral. **Not useful as a consumer waitlist reference.**

#### A11. Telemetry (US, founder-stage early access with founding-member pricing). **Strong model**
- URL: https://telemetrywealth.com/
- **Hook:** "Your financial cockpit."
- **Sub-head and risk reversal under the hero:** "No credit card, no time limit. Free while we're in early access, and it's the real product, not a sandbox."
- **Founding-member section:** "Founding members lock in introductory pricing before it's announced publicly … **We won't start billing without your say. No card on file, no automatic conversion, and you choose a plan when pricing is announced.**"
- **Security honesty:** "Formal certification like SOC 2 is a long-term goal, not something we claim to have today. What we do have: …" and "Telemetry can see your balances and transactions. It cannot move your money."
- **FAQ:** includes "Is it really free? What happens when you launch pricing?" and "How much will it cost?". The answer to the second is that pricing is still being finalised.
- **Urgency or scarcity:** none. The only time element is "commercial launch in late 2026".
- **Form:** n/v.
- **Borrow (top pick):**
  - The no-auto-conversion promise.
  - Stating what security you *don't* have yet.
  - "real product, not a sandbox".
  - An FAQ that answers what happens when free ends.
  - This tone fits the owner's rule that privacy and security copy must match the code.

#### A12. Vault (vaultmoney.app, US). Relevant for both pattern and name
- URL: https://vaultmoney.app/
- **Hook:** "Every dollar you have. Every dollar you owe. Nobody else's business."
- **Offer:** "Early access members get 3 months of Vault Pro completely free — no credit card required."
- **Steps:** a three-step "how it works" block.
- **Proof:** three "Beta Tester / Freelancer"-style quotes with no names. One says "I've saved more in 6 weeks than I did all of last year."
- **Counter:** "Join — people waiting …", with the number missing from the text, which suggests a counter that renders empty. "🔒 Zero spam. We only email when Vault is ready."
- **Privacy claims:** "zero-knowledge architecture", "Duress PIN".
- **Borrow:** a three-step "what happens after you join" block, a free-months bonus with no card, and a one-line "zero spam" promise.
- **Avoid:**
  - Unnamed testimonials that claim outcomes.
  - A sign-up counter that can show blank or zero.
  - Absolute privacy claims ("No exceptions. Ever.") that need an audit to back them.
- ⚠️ **Name clash:** another personal-finance app markets itself as "VAULT" with "Open Your Vault" copy. Consider this when choosing ad copy and search keywords for Vault·It. This is a brand and keyword note, not legal advice.

#### A13. Wealtheon (waitlist with a lifetime deal)
- URL: https://wealtheon.app/personal-finance-app
- **Hook:** "The Personal Finance App Built for 2026".
- **Offer:** "Early birds get a lifetime deal", repeated three times. The lifetime deal is never defined on the page.
- **Proof:** "Join 1,250 on the waitlist", repeated. Not verifiable.
- **CTA:** "Get early access". **Trust:** "256-bit encryption, Plaid-backed read-only connections".
- **Borrow:** a short page with the CTA repeated after each section.
- **Avoid:** an undefined "lifetime deal". If Vault·It sells a lifetime plan it must say exactly what lifetime covers (whose lifetime, which features, what happens if the service closes). The lifetime_crowdfunding research file covers this.

#### A14. FemWealth waitlist (pre-launch, Q3 2026)
- URL: https://femwealth.com/waitlist/
- **Hook:** "The investing app built for how women actually invest."
- **Offer:** "waitlist members get early access and early-bird pricing", plus a free weekly newsletter ("She Invests … one investing concept, one framework, one action").
- **Micro-copy under the form:** "No spam. No credit card. Unsubscribe anytime. Early-bird pricing reserved for waitlist members."
- **Borrow:** a **value-while-you-wait** lead magnet, which keeps the list warm and is Brunson's "bait". For Vault·It it could be a weekly "first-home money" email with one concept and one action. It must not give regulated advice.

#### A15. Alpha Investors (UK, founder-led investing community with an "Alpha OS" waitlist). Example of honest scarcity
- URL: https://join.alphainvestors.io/
- **Hook:** "Decide what deserves your capital."
- **Founder named in the eyebrow line:** "Led directly by former hedge fund manager Brendan Walsh". The bio has specific, checkable credentials: Aviva Investors and Franklin Templeton.
- **Scarcity with a stated reason:** "Capped at 100 members. Approximately 50% full. The cap means Brendan can participate directly …"
- **Waitlist copy:** "Access will open in stages while Alpha OS moves through beta … This is an early-access request. No payment details required."
- **Two-step form:** "Start with your email … Afterwards, you can optionally add a little context … Your enquiry is saved as soon as this step succeeds. Any context comes afterwards and is optional."
- **Disclaimers:** model-performance numbers carry a full disclaimer ("Hypothetical model performance, not member or client returns … Past or model performance does not predict future results").
- **Objections section:** "The useful objections. If one of these answers makes Alpha wrong for you, that is useful information too."
- **Borrow:**
  - Email-first, then optional questions. The email is saved even if they skip the rest.
  - Scarcity tied to a reason the reader can check (founder time, tester support capacity).
  - An objections FAQ that is allowed to disqualify.
  - Hard disclaimers next to any number.
- **Avoid:** performance figures, even with disclaimers. Vault·It is not an investment adviser and should show no return figures.

#### A16. Budgie (US "alpha" waitlist)
- URL: https://mybudgie.app/waitlist
- An "alpha" badge sits next to the name. The form marks **Email as "optional"**. The CTA is "Join the waitlist".
- **Consent and help text:** "Help us gauge interest, get feedback, and keep you updated. We'll never spam you, share, or sell your information. Your data is always encrypted. **Change your mind? Remove yourself.**"
- **Borrow:** "Change your mind? Remove yourself." is plain-English withdrawal of consent, which suits UK GDPR. Saying *why* you are collecting the email is also good practice.

#### A17. Nestwell, FinancIA, Forecast and Grownee (waitlist pages seen in search, not analysed in depth)
- **Nestwell** (https://nestwell.io/): "Founding members — limited spots" with no number or reason given, which is unexplained scarcity to avoid. Prices are shown ($0.99/mo Starter, $6.99/mo Pro).
- **FinancIA** (https://financiaapp.com/en/) has an unusually honest block: "Waitlist is the right conversion step today … Public pricing: Not announced yet … No vague launch promise here: the CTA collects real interest instead of pretending the app is ready for immediate download." A three-step "Leave your email → Get confirmation → Get invited first" sits next to it.
- **Forecast** (https://forecastfinance.app/): a "Limited Time Offer" with no end date, and a waitlist counter that shows "—" ("Updated in real-time"). **Both are patterns to avoid.**
- **Grownee** (https://waitlist.grownee.com/): "1200+ joined the waitlist already" and an FAQ ("Why should I join? When will it launch? Who can join?").

### B. Recognised high-converting pre-launch pages (any industry)

#### B1. Harry's pre-launch referral microsite (2013)
- Primary source: Jeff Raider (co-founder), guest post on Tim Ferriss's blog, "How to Gather 100,000 Emails in One Week", 2014-07-21 (https://tim.blog/2014/07/21/harrys-prelaunch/).
- **Result:** "nearly 100,000 email addresses in one week". This is the founder's figure.
- **Structure:** "a two-page microsite."
  - **Page 1:** a splash page with an email field only. The hook was "Respecting the face, and wallet since like right now." It showed a photo of the razor and deliberately "no more information about our company or product". The CTA button said "**STEP INSIDE**" with a small key drawing, to signal insider access.
  - **Page 2:** the thank-you and referral page. It had a unique link and share buttons, the copy "Shaving is evolving. Don't leave your friends behind." and a **progress tracker**.
- **Reward tiers:**

  | Referrals | Reward |
  |---|---|
  | 5 | Shave cream |
  | 10 | Razor |
  | 25 | Premium Winston shave set |
  | 50 | A year of free shaving |

  - "over 200 people achieved our highest referral tier". The team dropped a 1,000-referral "lifetime" tier because they worried it "would discourage people from participating at all".
- **Borrow:**
  - A one-field first step.
  - A thank-you page that does the second job: referral, a progress tracker and achievable tiers paid in product.
  - Founder-written "insider" framing.
- **Avoid in finance:** mystery-only copy with no product information. A finance visitor arriving from a social ad needs to know what it is and who is behind it before giving an email (see §4).

#### B2. Robinhood waitlist (2013–2015)
- Sources:
  - Sequoia podcast with Vlad Tenev (https://sequoiacap.com/podcast/robinhood-ft-vlad-tenev-reinventing-finance-for-a-new-generation): "We had 50,000 signups in the first week. We had about a million people join within the first year". Referrals moved people up the queue, an idea inspired by Mailbox. Tenev added that "the stakes were much higher for a financial product".
  - Business Insider, 2017-07-11 (https://www.businessinsider.com/free-viral-marketing-how-robinhood-got-1-million-users-before-launch-2017-7): about 10,000 on day one and 50,000 by the end of the first week. It credits Hacker News.
  - HuffPost, 2015-08-12 (https://www.huffpost.com/entry/startup-insider-the-story_b_7976446) gives Tenev's account of Reddit, then Hacker News, and confirmation emails that did not work at first.
- **Figures disagree:**
  - TechCrunch, 2014-12-11 (https://techcrunch.com/2014/12/11/robinhood-free-stock-trading/): "500,000 waitlist signups" at App Store launch.
  - Quartz, 2015-03-12 (https://qz.com/361274/the-free-stock-trading-app-robinhood-is-taking-all-comers): the list "stood at 50,000 or so" when it was scrapped. This conflicts with the other figures and may refer to the remaining queue.
  - Quartz also quotes Baiju Bhatt: "There were definitely people who were algorithmically referring people … writing scripts to move up the waitlist." Reddit r/finance banned referral codes.
- **Page (Wayback snapshot 2014-02-15, https://web.archive.org/web/20140215000000/http://www.robinhood.io/):** the hero did not come through in the extraction. The body has short benefit blocks ("Secure and Encrypted", "Reliable prices"). It includes **regulatory status even pre-launch**: "member of … FINRA and … SIPC". Team credibility: "built by a team of engineers and designers in California … Stanford, MIT … E*Trade". Investors are shown.
- Secondary (Prefinery blog, 2023-03-14, https://www.prefinery.com/blog/referral-programs/prelaunch-campaign/robinhood/): the sign-up asked for email only, and the thank-you page showed the person's position in the queue. *Secondary source only.*
- **Borrow:** a one-field sign-up, a queue position plus refer-to-move-up mechanic, the team named, and regulatory and protection facts stated plainly.
- **Avoid:** referral mechanics that can be gamed with fake emails. Use double opt-in and count only confirmed referrals.

#### B3. Monzo (then "Mondo") Alpha → Beta waitlist and crowdfunding (UK, 2015–2018). **The closest UK analogue for Vault·It's three goals**
- Sources:
  - Monzo blog "We're Ready", 2015-10-30 (https://monzo.com/blog/2015/10/30/we-are-ready).
  - Monzo blog "The Next Step", 2016-03-17 (https://monzo.com/blog/2016/03/17/beta).
  - Tom Blomfield (co-founder), "Monzo Growth", 2022-07-31 (https://tomblomfield.com/post/691384431502557184/monzo-growth).
  - Monzo blog "No more waiting list", 2018-05-24 (https://monzo.com/blog/2018/05/24/no-more-monzo-waiting-list).
  - Monzo community "Golden tickets", 2016-10-03 (https://community.monzo.com/t/golden-tickets/6240).
- **Alpha.** The first wave was 500 alpha cards, then 3,000 limited-edition "Mondo Alpha" cards. Eligibility was stated openly: London, 18+, iPhone. "If you help spread the word … by tweeting or posting to Facebook, we'll even bump you up the list."
  - Blomfield: "We capped the number of customers at 3000 because I think that was the limit for Testflight". This is scarcity with a real, technical reason.
  - He also says customers collected cards in person, so "I met all 3000 of these users face-to-face".
- **Beta waitlist.** "If you're on the waiting list, you can see exactly where you are in the queue, and invite more friends to move forward in line … we'll continue to send out a thousand Mondo cards every week."
- **Crowdfunding (2016).** Blomfield describes it:
  - Pre-registration so customers could invest before the general public.
  - Investment capped at £1,000 per person "to maximise the number of people who could invest".
  - Investors got "Investor" printed on their card and could skip the queue.
  - 6,500 pre-registrations. The partner's servers crashed. The relaunch "sold out in 96 seconds". "We ultimately raised £1m from 1861 investors".
  - He also notes they "already had 45,000 customers on a waitlist, and £5m investment committed from Passion Capital".
  - Monzo's own 2018 crowdfunding PDF (https://monzo.com/static/docs/crowdfunding-intro-2018.pdf) agrees: "people pledged £1 million in just 96 seconds".
- **Golden tickets (2017).** Blomfield: "about 40% of our signups in 2017 came from Golden Tickets". He also notes "invite friends to get bumped up the queue" had become less effective because "people … would just create a bunch of throwaway email addresses".
- **Dates disagree:** Monzo's 2019 annual report PDF (https://monzo.com/static/docs/annual-report-2019.pdf) dates the full banking licence to 2017. The 2018 crowdfunding PDF's timeline extraction appears to place it under 2018. The PDF layout looked scrambled, so treat that as an extraction problem. It does not affect Vault·It.
- **Borrow:**
  - Call it "Alpha" and *say what alpha means*: a capped number of testers, the reason for the cap, and who is eligible.
  - The founder meets or talks to early users.
  - A transparent queue.
  - Later, a one-per-user invite ("golden ticket") from *active* users instead of raw referral counts.
  - Investor or founder perks that are about identity and status (a badge or name on the card), not money.
- **Caution:** Monzo's crowdfunding was *equity* crowdfunding through a regulated platform. A Kickstarter-style *pre-sale* of a lifetime plan is a different thing legally; see `lifetime_crowdfunding.md` and `rules_uk_law.md`. Do not use the word "invest" for a pre-sale.

#### B4. Superhuman waitlist and onboarding survey (2017–2019)
- Sources:
  - Typeform customer story, "Building a Superhuman growth funnel to find product-market fit", last published 2025-01-07 (https://webflow-prod.typeform.com/blog/superhuman-product-market-fit).
  - Acquired podcast episode with Rahul Vohra, 2019-06-27 (https://www.acquired.fm/episodes/superhuman).
  - The First Round Review article (https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/, 2018-11-12) could not be opened here. Only its search snippet was seen, which lists the 4 PMF survey questions.
- **Mechanic.** After joining, the visitor saw a full-page Typeform on the welcome page asking "roughly twenty questions" (devices, browsers, email client …) with skip logic.
  - An algorithm sorted people into "Good customers" and "maybe, but not right now".
  - People who fit saw "Congratulations! You've made it to the top of the list." and a booking link.
  - People who did not fit got "a polite message explaining why and potential next steps".
- **Size.** On Acquired, the host said "a wait list of 180,000 people" and Vohra replied "That's more or less correct". He added "each week 70% of our new users are virally referred".
- **PMF test.** It asks how users would feel if they could no longer use the product ("Very / Somewhat / Not disappointed"). The commonly cited 40% "very disappointed" benchmark was **not verified** here because the primary article was blocked.
- **Borrow:** use the *thank-you page*, not the sign-up form, for a short optional qualifying survey. For Vault·It that could ask: first-time buyer? deposit stage? debts? device? willing to test weekly? Use the answers to pick testers and send each group a different follow-up.
- **Avoid:** twenty questions is too many for cold social-ad traffic. Keep the first step to email only.

### C. The "Alpha" founding-member pre-sale page: pattern to avoid
#### C1. Ecomm Hero Academy, "Alpha" (UK course pre-sale)
- URL: https://www.ecommheroacademy.com/alpha
- **Hook:** "Build an Amazon Wholesale Business Using the Product-to-Sale™ System".
- **Price anchor:** "WAS £997 £347 For the first 10 Founder Seats".
- **Value stack:** five modules priced individually (£297, £497, £997, £497, £997), giving "TOTAL VALUE £3,285 LAUNCH ENROLMENT £347".
- **Founder section:** "Save £650 Today … Future cohorts pay full price — you won't … Only 10 Seats … Lifetime Updates … Founding Status".
- **Guarantee:** an "Action Guarantee" with no refund term visible in the extraction.
- **Founder story:** "From earning £5 an hour …".
- **Internal inconsistencies:**
  - "Trusted by 200+ Sellers" and "more than 200 Amazon sellers have joined Alpha", yet also "A few of the 400+ sellers who followed the same system".
  - A "WAS £997" anchor next to a "TOTAL VALUE £3,285" stack.
- **Why it matters:** this is Hormozi's offer stack applied literally. It shows the risks for a *finance* brand:
  - A "was" price for something never sold at that price. The CMA says price-reduction claims mislead "where they no longer reflect the item's usual price" (CMA blog, §5).
  - Self-assigned "values".
  - A seat count with no way to check it.
  - Proof numbers that contradict each other.
- **Borrow only:** a clear founder story and a list of what a founding member gets (lifetime updates, founding status, a say in the roadmap).

---

## 4. Cross-page patterns

Counts are drawn from the 17 pages and programmes analysed in §3. Where something was not visible in the text, it is not counted.

1. **Live finance apps never use countdowns or "only X left".** None of Copilot, Monarch, Kubera, Origin, Fina, Rocket Money, Cleo, Emma, Snoop or Telemetry showed urgency or scarcity in the extracted text. Scarcity appears only where it has a stated *capacity reason*: Monzo's TestFlight cap of 3,000, Alpha Investors' 100-member cap with "the cap means Brendan can participate directly", and ClickFunnels' Inner Circle "limited to only 100". Unexplained scarcity appears on small or unknown pages (Nestwell, Forecast, Ecomm Hero).
2. **Trust blocks are standard in UK finance.** Emma has its security block with "revoke consent anytime" and "Capital at risk". Snoop has "We never see your bank login details", "registered with the FCA" and "How does Snoop make money?". Cleo has a Plaid FAQ and status footnotes. Robinhood stated FINRA/SIPC status even before launch.
3. **Founder visibility drives early trust.** Kubera, Alpha Investors, Lunch Money ("Jen (founder/developer) is fantastic …", https://lunchmoney.app/), Monzo (Blomfield met all 3,000 alpha users) and Harry's (a founder-written campaign) all show it.
4. **First step = email only.**
   - Harry's: one field, from the primary source.
   - Robinhood: one field, from a secondary source.
   - Alpha Investors: email first, "Any context comes afterwards and is optional".
   - Budgie: email marked optional.
   - Superhuman: the survey comes *after* the email.
5. **The thank-you page does the second job.** Harry's had referral tiers and a tracker. Robinhood and Monzo showed queue position and invite-to-move-up. Brunson used a trial or offer on the thank-you page. Superhuman used a qualifying survey.
6. **Early-access offers are framed as "lock in" plus "no card".**
   - Telemetry: "lock in introductory pricing … won't start billing without your say".
   - FemWealth: "Early-bird pricing — locked in at signup".
   - OneSource: "Locked in early adopter pricing".
   - Lunch Money: "Your price is locked in for life".
   - Vault (vaultmoney): "3 months of Vault Pro completely free — no credit card required".
7. **Proof is real and named, or it is a liability.** The strongest pages use named people with roles (Kubera) or dated reviews (Emma). Weak pages use "Beta Tester / Freelancer" (vaultmoney), unverified counters (Wealtheon "1,250", Forecast "—") or contradictory counts (Ecomm Hero).

---

## 5. UK rules that limit urgency and scarcity tactics (primary sources)
*This section only frames the patterns. The legal analysis is in `rules_uk_law.md`.*
- **CMA, "Urgency and price reduction claims: compliance advice for online businesses"**, open letter (https://assets.publishing.service.gov.uk/media/64232b153d885d000cdadd30/OCA_business_open_letter_FINAL.pdf). It defines an "urgency claim" as "any scarcity, popularity, 'act fast' or time limited claim". Its examples include timers that restart, and combined false price, time and stock claims.
- **CMA blog, 2023-03-31** (https://competitionandmarkets.blog.gov.uk/2023/03/31/urgency-and-price-reduction-claims-are-your-online-tactics-legal/):
  - "Countdowns that are untrue because the sale price rolls on beyond the advertised end point are misleading."
  - "Timers that start again when the webpage is refreshed … are misleading."
  - "'Only 5 left' when this has no bearing … may also mislead."
  - Price-reduction claims "are misleading where they no longer reflect the item's usual price."
- **CMA207 "Unfair commercial practices"** guidance, dated 18 Nov 2025 (https://assets.publishing.service.gov.uk/media/691b9bd821ef5aaa6543ee6f/Unfair%5Fcommercial%5Fpractices%5FCMA207%5F18%5FNov%5F2025%5F%5F2%5F.pdf). **Banned practice 7:** "Falsely stating that a product will only be available for a limited time … in order to elicit an immediate decision". It says a *true* deadline "is unlikely to be problematic" unless "a substantially similar offer appears within a short period".
- **FCA ScamSmart warning signs:**
  - FCA press release, 2023-02-20 (https://www.fca.org.uk/news/press-releases/armchair-detective-investors-take-inspiration-sherlock-holmes-foil-investment-scams) lists: "Time pressure: they might offer a bonus or discount to invest before a set date"; "Exclusivity or Secrecy … specially chosen"; "Social proof: they may share fake reviews"; "Unrealistic returns"; "False authority … claiming to be regulated"; "Flattery"; "Remote access".
  - FCA, 2014-10-15 (https://www.fca.org.uk/news/press-releases/national-campaign-will-target-those-most-risk-investment-fraud-says-fca): "You are told the offer is only available for a limited time or to a limited group of people."
  - FCA crypto scams page (https://www.fca.org.uk/consumers/crypto-investment-scams): fraudsters "advertise on social media, often using images of celebrities" and link to "professional-looking websites".
  - **Implication:** Vault·It will recruit through social-media ads into a finance product. The ordinary funnel tactics of countdown bonuses, "you've been selected", "limited group" and big-outcome testimonials match the exact cues the FCA teaches UK consumers to treat as fraud signals. Even when the tactic is legal, it costs trust.

---

## 6. Recommended structure for vault-it.co/sign-up
*This is a synthesis of the evidence above. It is a recommendation, not a measured result. No conversion-rate figures are claimed here; see `benchmarks.md`.*

**Page 1: sign-up (squeeze page, but with trust built in)**
1. **Slim header.** Logo, plus "Private alpha · UK" and a link to the privacy notice. No navigation. This is Brunson's "few distractions", while keeping the brand because finance traffic needs to know who is asking.
2. **Hero (Hook).**
   - Outcome headline about the dream outcome: owning a home and seeing the deposit build.
   - Sub-head saying exactly what it is: "A UK money app that tracks your deposit, debts and net worth, and builds a 3D house as you save."
   - A one-field email form with a first-person CTA, e.g. "Join the alpha". Harry's used "STEP INSIDE".
   - Micro-copy right under the button: "Free. No card. No bank login needed. Unsubscribe in one click." Precedents: Telemetry, FemWealth, Budgie.
   - **Hero visual:** the real 3D house building with the progress bar, captured from the real app. Label any numbers "Example".
3. **"What happens next" in three steps.** Precedents: vaultmoney, FinancIA. For example: confirm your email → we invite testers in waves (say how many and why) → founding-member offer opens to the list first.
4. **Show the product (proof by demonstration).** Three or four real screens or a short screen recording: roadmap from debt to owning outright, net worth, budget/cash flow, House Builder. Origin and Copilot show this pattern.
5. **Founder story (Story).** Pete's face and name, PT Live Design, why he built it, and "you can reply to any email and it comes to me". Precedents: Kubera, Lunch Money, Monzo, Alpha Investors.
6. **Trust block.**
   - Where data lives and which outside services are used. It must match the privacy notice and code.
   - What it *cannot* do ("cannot move your money").
   - What it does *not* have yet, Telemetry-style.
   - A "How does Vault·It make money?" answer (Snoop).
   - The UK company/trader details.
7. **Offer (Offer).** Plain-English plan cards (Free / Pioneer / Founding Member) with *one* agreed set of prices. The current £49.99 vs £59.99 and £149 vs £199 inconsistencies must be resolved first.
   - Founding-member terms stated exactly: what "lifetime" means, the refund policy, and what happens if the service ends.
   - The Telemetry-style promise "we won't charge you without your say".
   - Scarcity only if real *and* explained, e.g. "First 100 founding members, because I support each one personally". Show live counts only from real data and never a fake "was" price.
8. **Honest FAQ / objections.** Is it safe? Do I need to connect my bank? Is this financial advice? (No.) What happens to my data if I leave? What if the app closes? When does alpha end? Alpha Investors has a good "if this makes it wrong for you, fine" tone.
9. **Repeat the CTA.** The same one-field form, with consent wording and links to the privacy notice and terms.
10. **Footer.** Trader name, contact email, privacy, terms, and an unsubscribe/withdraw line.

**Page 2: thank-you page (ascension)**
1. "Check your inbox to confirm" (double opt-in, which also blocks fake referrals; see the Robinhood scripts).
2. An optional 4–6 question tester survey, Superhuman-style but short. It segments people into tester, mailing list or founding-member prospect, Brunson-style.
3. A **founding-member pre-sale** CTA, offered once, with exact terms and no timer unless the deadline is real.
4. A referral link with a modest reward that is the product: e.g. 3 confirmed friends earns a month of Pioneer (Fina-style; Harry's tiers). Later, a one-per-user "golden ticket" for active users (Monzo).
5. Follow on social or join the tester community (Monarch-style community proof).

**Emails while they wait:** a "value-while-you-wait" weekly email (FemWealth), so the list is warm when the pre-sale or launch opens. It gives general education only, never personal advice.

---

## 7. Patterns to avoid because they look like scams in finance
Each line names the evidence behind it.
1. **Countdown timers and "offer ends midnight" without a real, kept deadline.** The CMA blog and CMA207 banned practice 7 cover this, and the FCA lists "Time pressure" as a scam sign. The ClickFunnels blog's "Sign up now before midnight!" is the pattern *not* to copy.
2. **"Only X spots left" with no reason or no live, true count.** CMA blog ("Only 5 left"); FCA "only available … to a limited group of people". Seen on Nestwell ("limited spots") and Ecomm Hero ("Only 10 Seats").
3. **"WAS £X, NOW £Y" anchors and self-assigned "total value" stacks** for something never sold at the higher price. CMA blog on price reduction claims. Ecomm Hero shows both "WAS £997" and "TOTAL VALUE £3,285".
4. **Outcome or wealth testimonials** ("saved more in 6 weeks than all last year", "debt to millionaire"), especially unnamed ones. FCA "Social proof … fake reviews" and "Unrealistic returns". Seen on vaultmoney.app and fina.money.
5. **Unverifiable or broken social-proof counters**: an empty "— people waiting" or round numbers that never change. Seen on Forecast and vaultmoney (blank count), and Wealtheon ("1,250"). Inconsistent counts appear on Ecomm Hero (200+ vs 400+).
6. **"You've been specially selected" / secrecy / VIP flattery copy.** FCA lists "Exclusivity or Secrecy" and "Flattery". Insider language like Harry's "STEP INSIDE" is fine for razors and riskier for money.
7. **Celebrity or influencer faces in ads** for a finance product. The FCA crypto page says scam ads use "images of celebrities". If creators are used, name them, disclose payment, and make no outcome claims.
8. **Absolute security claims you cannot prove** ("bank-level", "zero-knowledge", "No exceptions. Ever.") or claimed regulation you do not have. FCA "False authority". Telemetry's "SOC 2 is a long-term goal, not something we claim to have today" is the safe model. The owner's rule says copy must match the code, and `tests/test_beta_client.js` enforces the privacy notice for outside hosts.
9. **Asking for bank logins, card details or a lot of personal data on the first step.** The FCA (2023) found requests for personal details are a top tell-tale sign investors cite (34%). Keep step 1 to email only and take payment only through a recognised checkout.
10. **The words "invest", "returns" or "shares" for a pre-sale or lifetime plan.** Monzo's crowdfunding was regulated equity. A product pre-sale is not an investment, and blurring the two will look like a scheme. See `lifetime_crowdfunding.md`.
11. **A mystery-only hero** that hides what the product is and who runs it (Harry's style). The FCA crypto page warns that scam ads "link to professional-looking websites". Say what it is, who is behind it and where they are based, above the fold.
12. **A referral race with leaderboards or cash rewards.** Robinhood saw scripted fake referrals (Quartz), and Monzo saw throwaway emails (Blomfield). Count only confirmed referrals, and pay rewards in product, not cash.

---

## 8. Gaps and things not verified
- "One Source Alpha" was not identified with confidence (§1). Ask the owner for the URL.
- No screenshots, and no mobile behaviour observed for any page, because the network blocks outside hosts for curl, Playwright and WebFetch.
- Form-field counts and consent wording are only known where the page text shows them (OneSource, Budgie, Alpha Investors, FemWealth, Telemetry, Harry's from the primary write-up). For Copilot, Monarch, Kubera, Origin, Fina, Rocket Money, Cleo, Emma and Snoop they were not visible.
- The First Round Review Superhuman article could not be opened, so the 40% PMF benchmark is unverified.
- These figures are each company's own claims and were not audited: Harry's ~100k, Robinhood 50k / 1M, Monzo 96 seconds, 1,861 investors and 40% golden-ticket sign-ups, Superhuman 180k, and Brunson's 7,500.
- Robinhood waitlist figures disagree across sources: 500k (TechCrunch, Dec 2014), ~1M in the first year (Sequoia/Tenev), and "50,000 or so" when the list was scrapped (Quartz, Mar 2015).
- Hormozi chapter details (honest scarcity at "81% full", "last 4 hours = 50–60% of sales", guarantees "2–4×") come from a secondary book summary, not the book text.
- Kubera's pricing page could not be fetched. The $250/yr is from its homepage headline.
