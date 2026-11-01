# Weekly newsletter: format guide

Template: `newsletter-template.html` (built by `node docs/marketing/build_emails.js`, shared look with the other Vault-It e-mails). Welcome e-mail: `welcome-email.html`; day 3 research e-mail: `research-email.html`. Both are drafts. Nothing is sent and nothing is deployed without the owner's yes.

## Filling it each week (a session can do this in one pass)
1. Window: last Monday to this Sunday. Sources: `docs/QUEUE.md` Done section, and `git log --since="<monday>" --oneline origin/release/pioneer-v2` (only what is live counts; no unreleased work).
2. Sort each shipped item into one section:
   - **New**: something a user can now do. Say where to find it.
   - **Fixed**: a bug that bit someone. One line: what went wrong, now fixed.
   - **Better**: faster, clearer or easier than before.
3. Skip anything internal: tests, refactors, queue housekeeping, hooks, docs, tooling.
4. **Coming up**: one or two queue items, never a date.
5. **One ask**: a single question or request, answered by replying.
6. Subject: `Vault-It this week: <headline>`. Headline is the one change a user will notice most.

## Voice (Pete's, see `docs/creative/VOICE.md` on the creative branch)
Plain, direct, British English, sentence case, no em dashes, no hype words, no exclamation marks. Numbers over adjectives. Say limits plainly. Sign off "Thanks, Pete".

## Hard rules
- Keep "Not regulated by the FCA. Not financial advice." in the footer.
- No invented testimonials, user counts, scarcity or reference prices. Prices only as on the Stripe links.
- Name a tester only with their written yes.
- Privacy or security claims must match what the code does (`docs/BETA_RUNBOOK.md`).
- Neurodivergence: cite sources, no medical claims, no promised outcomes.
- Every send includes the one-click unsubscribe link, and goes only to confirmed (double opt-in) addresses.
- Pedro reviews the look before the first send and after any layout change.

## Sender (owner decides)
Recommended: the existing Resend set-up, because it adds no new processor to the privacy notice (`docs/research/mailing_stack.md`). Kit is connected and has a no-code editor and broadcasts, but is a new company to name and the list would have to live there.
