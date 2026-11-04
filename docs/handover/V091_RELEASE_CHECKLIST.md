# v0.9.1 release checklist (4 Nov 2026, MVP by 16:00)

**Release candidate: `51b2848` on `candidate/v0.9.1`.** **CI green on that exact SHA: run 41832893910, all 4 jobs, first attempt (13:13).** GO. Release any time from now; 14:30 is the latest comfortable slot.

What is in it:
- Round 1: all 13 chunks plus follow-ups, the demo-seed data-loss guard, cash 3D phone framing.
- Round 2: C roadmap (R3 to R8, R22) and D house type (R12 to R15), merged by the round 2 Chief of Staff.
- The cash 3D look: Budget-style bank chips and stylised coins.
- **Production's Eligent pitch page** (`release/pioneer-v2` 6e9c618), merged in so vault-it.co/pitch-Eligent stays live. The candidate now descends from live, so the push below is a plain fast-forward. Never force-push: a forced push would delete the pitch page.

Frozen for the deadline: no more merges into `candidate/v0.9.1` until the release is live. Round 2 A, B, E, F, G and tiers move to v0.9.2.

## Done already
- Migration 014 (`campaign_counts`) is applied to production (owner's yes, 3 Nov). The Founding badge shows real counts ("100 left"), never fake backers.
- No other migrations this round.

## Owner, 14:30 to 14:50 (laptop, Git Bash, then phone)
1. **Phone look** at the preview of `candidate/v0.9.1` (https://candidate-v0-9-1-vault-it.ptlived.workers.dev). It is look-only and cannot sign in. Check Overview, Budget, cash 3D, Wealth Roadmap, house type and the crowdfund badge, in Night and Daylight.
2. **Backup:**
   ```bash
   git fetch origin
   ```
   ```bash
   git push origin origin/release/pioneer-v2:refs/heads/backup/release-pioneer-v2-20261104-1430
   ```
3. **Release** (fast-forward from 6e9c618):
   ```bash
   git push origin 51b2848929c8eb016d5f19010930f5a27f8a39d1:refs/heads/release/pioneer-v2
   ```
   If git says "rejected" or "non-fast-forward", stop and tell the Chief of Staff. Do not force it.
4. **Live check** about 3 minutes after the push:
   - https://app.vault-it.co/version.json shows the new build;
   - sign in on the phone at app.vault-it.co, and your saved data is all there;
   - https://vault-it.co/pitch-Eligent still opens, and Present works.
5. **Rollback**, only if step 4 fails:
   ```bash
   git push --force-with-lease=release/pioneer-v2:51b2848929c8eb016d5f19010930f5a27f8a39d1 origin 6e9c618:refs/heads/release/pioneer-v2
   ```

## Optional, after the pitch (not needed for the MVP)
- Second-hand prices function. Type the token on the laptop only, never in chat:
  ```bash
  npx supabase secrets set DISCOGS_TOKEN=<your token> --project-ref legpubblzgknxdtvsant
  ```
  ```bash
  npx supabase functions deploy secondhand-estimate --project-ref legpubblzgknxdtvsant --no-verify-jwt
  ```
  Until then the app says "Not available yet" and shows the manual links. eBay, Reverb and PriceCharting stay off.

## After release (queued for v0.9.2)
- Round 2 A chrome, B labels and flow, E coins one by one, F item viewer, G crypto, tiers.
- Cash 3D: in the default view the blocks of 1,000 read as gold cubes, not a fine coin grid. Owner to decide.
- Serve all browser tests over http, not file://. Make every test honour VI_INDEX. Index split (7 Nov).
