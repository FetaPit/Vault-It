# v0.9.1 release checklist (4 Nov 2026)

All 13 chunks plus follow-ups are merged into `candidate/v0.9.1`, and CI is green on each merge.
The demo-seed data-loss guard (`v09x/demo-guard`) went in last.
**On hold (owner, 4 Nov 08:30): v0.9.1 waits for the cash 3D look (bank chips with logos, better coins, `v09x/cash3d-look`).** Do not run the release step below until this line is replaced with the final SHA.
Last green candidate: `248e7e4` (run 41768973204). Cash 3D phone framing merged since as `6b1ba9f` (CI run 41792595429 green on re-run; first attempt hit a test_hb_speed timing flake, untouched by this change).

## Done already
- Migration 014 (`campaign_counts`) is applied to production (owner's yes, 3 Nov). The Founding badge reads "100 left".
- No other migrations this round.

## Owner, in this order
1. **Phone sign-off** on the Fold (Chrome), Night and Daylight. Check:
   - header V
   - Assets sub-menu
   - Overview, Budget
   - house deposit
   - cash and metals 3D, including the flags on the phone
   - Stocks, Crypto
   - debt cards
   - Wealth inventory: model picker, upload, second-hand price, image spinner
   - Liabilities
   - crowdfund badge
2. **Backup** (laptop, Git Bash):
   ```bash
   git fetch origin
   ```
   ```bash
   git push origin origin/release/pioneer-v2:refs/heads/backup/release-pioneer-v2-20261104-HHMM
   ```
3. **Release.** This is a fast-forward, because the candidate descends from live 5e8b5a5:
   ```bash
   git push origin 248e7e4d8de102cc5c01dceda5819034b287c962:refs/heads/release/pioneer-v2
   ```
4. **Live check:** open https://app.vault-it.co/version.json and confirm it shows the new build.
5. **Second-hand prices function.** Type the token on the laptop only, never in chat:
   ```bash
   npx supabase secrets set DISCOGS_TOKEN=<your token> --project-ref legpubblzgknxdtvsant
   ```
   ```bash
   npx supabase functions deploy secondhand-estimate --project-ref legpubblzgknxdtvsant --no-verify-jwt
   ```
   eBay, Reverb and PriceCharting stay off until their approval comes in (`SECONDHAND_EBAY=on` and the others).
6. Check the phone again on the live address.

## After release (queued)
- Serve all browser tests over http, not file:// (headless Chrome loses localStorage on file://).
- Make every test honour VI_INDEX.
- Index split (7 Nov).
- Phone framing of the cash 3D flags, if wanted after sign-off.
