# Wealth roadmap: token redesign and levelling system (brief 1 of the series)

Author: Pedro (creative director). Date: 3 Nov 2026. Branch: `claude/bold-carson-tey49m`.
Owner's words: "I do not like our achievment icons for the road map, redesign with these inspirations, think futuristic tokens ... I want to create a more detailed levelling up system in the Achievments tab, we will rename the tab called Wealth Roadmap which will show the new roadmap mirrored on the dashboard"

Added by the owner later the same day: "we need to employ a clear linear step by step progressiom with sub milestones for each achievment with an XP mechanism. plus Recognise that there are non linear tasks and achievments that can contribute to the users level. The levels are named in a cool way related to finances saving investments etc. build into with the methodology Octalysis frasmework.. We need an incentive like a month of subscription with Vault-It for now if they reach a certain level"

Inspiration only (chamfered cards with stacked depth and four rarity tiers; octagon badges with a studded rim; hexagon badges with a name ribbon). Nothing is copied: no names, logos or art.

Where it lives today: `FIRE_ICONS` ~17408, `FIRE_PHASES` ~17441, `LVS` ~17596, `BADGES` ~17597, `fireBuildStages()` ~24683, `renderFIREroadmap()` ~24834, tab panel `#tab-achievements` ~12937, Overview card ~12201.

## 1. Decisions in one glance

| Topic | Decision |
|---|---|
| Silhouette | Chamfered octagon, flat top and bottom |
| Tiers | Four: Starter, Solid, Strong, Summit. By difficulty, not phase |
| Tier colours | grey `--lock`, `--teal`, `--purple`, `--brass` (tokens only, no new hex) |
| Studs | 6 on a stage token, two per sub-milestone. This is the signature feature |
| Spine | The 30 stages, each in 3 sub-milestones (90 steps), latched once earned. XP per step by tier (section 6) |
| Side quests | The 31 badges plus habit quests. Non linear, they add XP to the same total (section 7) |
| Levels | 20 levels in 5 ranks, named for money habits (section 8). Replaces the nine |
| Frame | Octalysis, white hat drives first (section 9) |
| Reward | One free month of Vault-It at a set level. Level and claim route are placeholders (section 10) |
| Tab | Label "Wealth roadmap". Internal id stays `achievements` so links, `showTab('achievements')` and saved state do not break |
| Renderer | One function, two mount points (Overview card, tab). Same state, same tokens |

## 2. Token anatomy

Draw as inline SVG in a 100 x 100 viewBox for shape, with all text as HTML overlay, never SVG `<text>`. Reason: SVG text scales with the token and would fall under the 10.5 px floor at rail size.

Define the shell once per page in a hidden sprite `<svg>` (one `<symbol>` per tier, gradients defined once, ids unique). Tokens use `<use>`. Do not give each token its own gradient id: the roadmap now renders twice on some screens and duplicate ids break.

All proportions are fractions of token width `w`. Token box is `w` wide and `1.05w` tall for every token so rails align (the extra `0.05w` is the stacked-depth plate).

1. **Silhouette.** Octagon, chamfer `0.22w` on all four corners: vertices `(22,0) (78,0) (100,22) (100,78) (78,100) (22,100) (0,78) (0,22)`. Why octagon and not hexagon or clipped card:
   - Rail of 30 at 44 to 60 px: the icon needs the biggest inscribed square. Octagon gives `0.62w`, a flat-top hexagon only `0.52w`, and a clipped card loses a corner of icon room.
   - Flat top and bottom sit square on the rail baseline and on the dashed connector, so the rail stays calm. A pointy hexagon makes a ragged line.
   - Collection grid: octagons tile on a square grid with no stagger, so three columns at 390 px and six at 1100 px stay simple.
   - The 45 degree chamfer survives rounding to whole pixels at 44 px. A 60 degree hex edge goes jagged.
2. **Stacked depth plate.** Strong and Summit only: a second, darker octagon behind, offset down `0.05w`, same size. Starter and Solid have none (their `0.05w` is empty space).
3. **Rim.** Ring `0.08w` thick, solid tier colour. Inner edge has a 1 px darker line (`--bg` at 60%) so the rim reads as metal against the face. Night: 6 px glow at 25% of the tier colour, hairline only, never a floodlight. Daylight: no glow, a 1 px soft drop shadow instead.
4. **Studs.** Stage tokens carry six dots on the rim centreline, at the six octagon vertices that the state chip does not cover (all but bottom-right), inset `0.04w`, radius `0.03w`, never below 1.5 px. Lit stud = tier colour fill. Unlit = 1 px ring in the tier colour at full opacity, hollow. They read as the three sub-milestones, two studs each, filled clockwise from top-left: reach sub-milestone 1 and studs 1 and 2 light together, and so on. Achieved = all 6 lit. Locked = none lit. (The rank token keeps eight studs, one per eighth of the current level's XP.) Why pairs and not eighths: progress within a stage is told by the sub-milestone list and the bar in the stage panel, so the token shows steps, not a fuzzy fraction.
5. **Face.** Inset `0.08w`, linear gradient 135 degrees from tier tint at 24% over `--panel2` (top-left) to `--panel` (bottom-right). One inner hairline at `0.14w` inset, 1 px, tier colour at 35%. Summit adds a second hairline at `0.17w` and a small notch on the top edge (a `0.10w` wide, `0.03w` deep V cut in the rim).
6. **Central icon.** Box `0.46w` square, centred at `(0.50w, 0.47w)`. Stroke `1.5` in a 24 viewBox (the brand's under-24 px weight, handover phase 3), fill at 16% of the same colour, `currentColor`. Icon colour is the tier colour (Starter: `--text`). Drop the per-stage `col` values (they use red for "first debt cut", but red means debt only). Keep the 30 existing glyph names and metaphors; redraw one only if it fails the 24 px legibility check in section 10.
7. **State chip (rail).** Bottom-right, `0.30w` square with a `0.07w` clipped top-left corner, overlapping the rim by `0.06w`. Holds the state glyph (section 4). At 52 px that is 15.6 px: glyph 10 px. This is where the old tick or padlock sat.
8. **Number plate (large tokens only).** The XP plate, `0.40w x 0.20w`, clipped top-left corner `0.05w`, Share Tech Mono, shows "+150". Shown only when a token is 96 px or wider (rank token, stage detail panel). Never on the rail or the grid: it would fall under 10.5 px.
9. **Ribbon (large tokens only, 96 px and wider).** `0.92w x 0.26w`, centred, overlapping the bottom of the token by `0.10w`, swallowtail ends `0.06w` deep, fill `--panel` with a 1 px tier-colour edge. Text is the badge short name (14 characters max, no wrapping, ellipsis) in Share Tech Mono 10.5 px minimum. In the collection grid, XP and tier go in a text row under the ribbon. In the rank token the ribbon holds the level name.

### Token sizes

| Place | Width | Detail shown |
|---|---|---|
| Rail, desktop | 52 px (next up 64 px) | shell, studs, icon, chip |
| Rail, phone carousel | 44 px sides, 64 px centre | same; side tokens keep all 6 studs |
| Stage detail panel | 96 px | adds ribbon (stage name) and XP plate |
| Collection grid | 112 px (3 across at 390, 6 across at 1100) | adds ribbon |
| Rank token | 96 px phone, 120 px desktop | numeral instead of glyph, level ribbon |

## 3. Rarity tiers

Four tiers, plain English, sentence case. Names are not gaming terms: they read as "where you are on the climb".

| Tier | Colour token | Rim and depth finish (the non-colour cue) | Meaning |
|---|---|---|---|
| Starter | `--lock` (grey) | single rim, no depth plate, no inner second hairline | first steps, small effort |
| Solid | `--teal` | single rim plus inner hairline | real habits formed, foundations laid |
| Strong | `--purple` | stacked depth plate | big money moves |
| Summit | `--brass` (brass means achievement) | depth plate, double hairline, top notch | the long-haul goals |

Why not blue: blue means monthly surplus. Why not gold: gold means "now". Teal here reads as "built or owned", which is its brand meaning, and not as a net worth number because tokens never carry a figure.

### Mapping: by difficulty, one per stage (30 stages, 6 / 9 / 8 / 7)

- **Starter (6):** First Log, Map Debts, Zero Budget, First £ Saved, £500 Buffer, First Debt Cut.
- **Solid (9):** £1k Buffer, Debt Halved, £1k Net Worth, Debt Free, 3-Month EF, ISA Opened, 1% Deposit, 5% Deposit, £5k Net Worth.
- **Strong (8):** 6-Month EF, Deposit Ready, £10k Net Worth, Applied, Exchanged, Keys!, £25k, £50k.
- **Summit (7):** £100k, Coast FI, Mortgage Free, £250k, Full FI, Fat FIRE, Legacy.

Why difficulty and not phase: phases already own six colours on the rail bands and labels (FOUNDATION teal, STABILISE brass and so on). Tier colour on the token plus phase colour on the band would be two colour systems on one strip. Phases keep the band, the label and the "STAGE n/30 · PHASE" chip. Tiers own the token and the XP value (section 6). The working proposal was to set XP by phase; I have kept difficulty because phase would pay "£500 Buffer" the same as "6-Month EF" (both Stabilise or Save), and would pay a trivial early Buy-phase step the same as a hard one. The two lists differ by only a few stages (6 / 9 / 8 / 7 here against 4 / 12 / 10 / 4 by phase), so if the owner prefers the simpler phase rule it is a one-line change to the mapping.

### Mapping: badges (31), rule not table

Tier comes from the badge's existing `xp`: 50 or less Starter, 51 to 150 Solid, 151 to 400 Strong, over 400 Summit. A new badge gets a tier for free.

## 4. Rail states

Every state is told apart by at least two cues that are not colour: chip glyph, rim style, stud count, scale. Each token also carries `aria-label` of the form "Stage 7 of 30, Debt Halved, Solid, achieved" and the legend lists all five states with the real chip glyph.

| State | Rim | Studs | Chip | Face | Other cue |
|---|---|---|---|---|---|
| Achieved | solid, tier colour | all 6 lit | tick, `--green` fill (green = cleared) | full gradient | normal scale |
| Next up | solid, tier colour | two per sub-milestone reached | none (replaced by the "START HERE" or "NEXT" tag) | full gradient | 1.25 x scale, hairline ring pulsing every 2.8 s, small pointer notch under the token |
| Met but waiting | dashed `4 3`, tier colour | all 6 lit | dashed-outline tick | full gradient | caption "Met. Waiting on earlier stages" (this wording exists today, keep it) |
| Skipped | dotted `1 2`, `--amber` | none lit | amber double chevron | diagonal hatch, 1 px lines at 45 degrees | caption "Skipped" |
| Locked | solid 1 px, `--lock` | 6 hollow rings | padlock | flat `--panel`, no gradient | icon stays at full `--lock` colour, no opacity fade |

Contrast, measured against the token's own face and the card behind it, from existing tokens only (no new hex):
- Night: `--lock` #8C939B on `--panel` #080D14 is about 6:1. Tier rims and icons against the face are 3:1 or better. Check each tier once and log the number.
- Daylight: the token set swaps to the darker values (`--lock` #39433F, `--teal` #185550, `--purple` #583F81, `--brass` #5B4A19, `--amber` #6B4303) which pass 4.5:1 on the Daylight panels, so rim, icon and chip glyphs clear 3:1 with room. Face gradient tint drops to 12% in Daylight so icons stay on a light ground. No glow. The depth plate becomes a 1 px darker outline offset down.
- Never use opacity to show "locked". Locked is shape and grey, not faded.

Reduced motion: the next-up pulse becomes a static 1 px ring. Earn animation (section 6) is skipped.

## 5. Wealth roadmap tab: top to bottom

Gates today: the roadmap, tier colours and stage detail are free. Rank, XP, ladder, quests and collection are Pro, blurred for free users, and the tab is Advanced view only. Keep exactly that until the owner answers question 2 in section 12 (the reward needs free users to see their level).

### Phone, 390 px (single column, 16 px gutters, no sideways page scroll)

1. Title "Wealth roadmap", one-line subtitle, "7 of 30 stages".
2. Rank card (Pro, see question 2): rank token 96 px with level ribbon, "Level 8 · Vault Guard", rank name "Shield", total XP, XP bar with 8 ticks, "350 XP to Compounder". Under it, one reward line: "Reach [level TBD] for a free month of Vault-It" with a thin progress bar (placeholder, section 10).
3. Roadmap: same carousel as the dashboard (centre token 64 px), legend under it in two wrapped rows.
4. Stage panel for the selected stage (free): 96 px token, name, tier, status, current against target ("£3,420 of £5,000") with "Show working". Below it the three sub-milestones as a vertical step list: done (tick, "£150"), current (ring, "£300, £120 to go"), to do (hollow). Each line shows its XP ("+40 XP", Pro). This list is the linear step by step the owner asked for.
5. "Next steps" (Pro): three rows, 40 px token, name, thin bar, "+XP". Always one linear step (the next sub-milestone of the next-up stage) first, then the two side quests closest to done.
6. Side quests (Pro): section 7.
7. Level ladder (Pro): five rank groups as an accordion, current rank open, each group four 44 px rows. No horizontal strip.
8. Token collection (Pro): section 11.
9. FCA line.

### Desktop, 1100 px

1. Header row: title left, "7 of 30 stages" and "Current stage" button right.
2. Two columns: rank card with reward line (about 340 px) left, "Next steps" right.
3. Full-width roadmap rail (scrolls inside its own container only), legend on one row, then the stage panel with its three-step list beside the token (token left, steps right).
4. Side quests, three cards across.
5. Level ladder as five rank blocks side by side (about 200 px each), four levels stacked in each, current level enlarged. No scroll.
6. Token collection, 6 across.
7. FCA line.

### Dashboard mirror (Overview)

Same renderer, compact mode: header, rail, legend, count, plus one "next step" line ("Next: £300 of £500 buffer"). No rank card, no stage panel. Tapping a token sets the selected stage; both surfaces repaint from the same state. The Overview "Achievements" card heading and its "See all" button become "Wealth roadmap" and "Open roadmap".

## 6. The linear spine: stages, sub-milestones and XP

The 30 stages stay the one ordered path. Each has three sub-milestones, so 90 steps in all. A step is the unit that pays XP, so something pays out every few days for an active user, not only at 30 big moments.

**Sub-milestone rules (data the app already holds)**
- Amount stages (cash buffers, emergency funds, deposit, net worth, FI multiples, mortgage cleared, debt cleared): steps at 30%, 60% and 100% of the stage target, amounts rounded to £10 and shown as figures (for £500 buffer: £150, £300, £500). The third step is the stage achieved. Debt Halved works on the 50% target, so steps are 15%, 30%, 50% cleared.
- Confirm-only stages (Map Debts, Zero Budget, ISA Opened, Applied, Exchanged, Keys!, Coast FI if the app cannot measure it): Started (first related entry), In progress (the stage's working screen is part complete), Confirmed (the existing manual confirm). Use the existing `fireMan` confirm for step 3. Where the app can measure a step, use the measure, not a tap. Zero Budget, for example: income added, spending listed, every pound assigned.
- Wording for Applied, Exchanged and Keys! stays neutral and illustrative. The ladder must never read as "buy a house to level up" or "take on debt to level up".

**Latching.** A sub-milestone, once earned, stays earned and its XP is never removed, even if net worth later falls. Persist the earned step ids in the app's existing synced state. The stage's live state on the rail (achieved, waiting) can still move, XP cannot go down. A test needs: earn, drop the number, reload, XP unchanged.

**XP per step, by tier** (one mapping for token and XP, so there is one thing to learn)

| Tier | XP per step | Per stage | Stages | Total |
|---|---|---|---|---|
| Starter | 20 | 60 | 6 | 360 |
| Solid | 40 | 120 | 9 | 1,080 |
| Strong | 80 | 240 | 8 | 1,920 |
| Summit | 150 | 450 | 7 | 3,150 |
| Spine total | | | 30 | 6,510 |

The working proposal named these "core, rare, epic, legendary". Do not use those words in the UI: use Starter, Solid, Strong, Summit.

**Skipped stages.** Skipping pays nothing and costs nothing. Skipping is the user's own tap, so it must not earn partial XP (that would reward skipping). Fairness check for renters: skipping every house stage (1% and 5% deposit, Deposit Ready, Applied, Exchanged, Keys!, Mortgage Free, and the Homeowner badge) removes about 1,950 XP of roughly 16,400 available, which is why the top threshold in section 8 is 13,000 and not higher. Builder: re-run this sum after the final XP values are set. Level 20 must stay reachable by a user who skips all house stages, with at least 5% to spare.

**Earn moment** (inside the 250 ms rule): the stud pair lights (60 ms apart), a "+40 XP" line floats up with the source ("£300 of £500 buffer"), the XP bar moves. Finishing a stage adds the chip pop. Reduced motion: it all lands at once.

## 7. Side quests (non linear)

Money life is not a straight line, so these add XP to the same total whatever the order, and are not on the rail.

- **Milestone badges:** the 31 existing badges, XP unchanged (about 9,800 in total). Some net worth badges overlap the net worth stages. That is deliberate: a badge is the quick celebration, the stage step is the path. If the doubling feels too rich in testing, say so rather than lowering badge XP quietly.
- **Habit quests**, from data the app already has:

| Quest | Trigger | XP |
|---|---|---|
| Three in a row | existing contribution streak reaches 3 | 10 |
| Seven in a row | streak reaches 7 | 25 |
| Thirty in a row | streak reaches 30 | 60 |
| Monthly snapshot | a net worth snapshot added this month | 10 a month |
| Budget kept | budget filled in for this month | 15 a month |

Monthly habit XP is capped at 25 a month, so there is no grinding. Judgement on the proposal: I would use the app's existing contribution streak (`hbStreak` ~15942, `habit-streak-label`), counted in whatever unit it already counts, and not a "visit" streak. Rewarding money behaviour fits the brand. Rewarding opening the app is engagement farming and can feel nagging. If no visit log exists, do not add one.
- **Quests are tokens too:** same octagon, tier from XP by the section 3 rule (60 XP lands in Solid). They sit in their own "Side quests" block above the collection, locked ones show how to earn them.
- **Streak rule, kind not harsh:** one missed day is forgiven. A broken streak says "Fresh start" and keeps every quest already earned. Nothing is ever taken away.

## 8. Levels: 20 in five ranks

Ranks are named for what the money is doing. Names are plain English except where the audience knows the word.

| Rank | Rim tier | Levels (XP to reach) |
|---|---|---|
| Groundwork | Starter | 1 Spare Change (0), 2 Penny Pincher (100), 3 Budget Builder (250), 4 Ledger Keeper (400) |
| Shield | Solid | 5 Buffer Builder (600), 6 Debt Breaker (850), 7 Rate Slayer (1,150), 8 Vault Guard (1,550) |
| Growth | Strong | 9 Compounder (2,050), 10 Yield Hunter (2,650), 11 Market Rider (3,350), 12 Portfolio Pilot (4,150) |
| Keys | Strong | 13 Goal Hunter (5,050), 14 Brick Stacker (6,000), 15 Key Holder (7,050), 16 Equity Builder (8,150) |
| Freedom | Summit | 17 Coast Captain (9,350), 18 Wealth Architect (10,600), 19 Freedom Maker (11,800), 20 Vault Legend (13,000) |

Changes from the working proposal, with reasons:
- "Bull Runner" becomes **Market Rider** (the bull/bear idiom is gaming-adjacent jargon for a first-time investor). "Deposit Hunter" becomes **Goal Hunter**, because levels come from XP, not from a house goal, and a renter should not be called a deposit hunter. Bricks and keys stay: "every pound saved lays a brick" is the brand idea for any saver.
- Five ranks sit on four tier colours. Growth and Keys share Strong, and each rank gets its own rank glyph on the ribbon (shield, sprout, key, flame, one for Groundwork) so ranks never rely on colour.
- Thresholds are an XP curve of roughly 150 to 1,200 XP between levels, widening as the app gets harder. Level 20 at 13,000 is the "did nearly everything" level. Level 8 (1,550) is reachable within weeks by an active user: the six Starter stages (360) plus a few Solid stages and the early badges.
- Existing testers: the old thresholds counted badge XP only. Everyone keeps their XP and never drops. They will probably jump levels on first open once stage steps are counted. Show one calm "Your level has been recalculated" line once, then nothing.
- The rank token numeral goes up to 20, Syne, `0.40w` tall. Eight studs light one per eighth of the XP in the current level.

## 9. Octalysis: eight core drives, what we use

Rule over all of it: ECD brief rule 4 and the idea line say it must never feel like a game that hides the maths. Lean on the white hat drives (meaning, accomplishment, creativity), use ownership with care, keep the black hat drives light.

| Core drive | Weight | What we do | What we deliberately avoid |
|---|---|---|---|
| 1 Epic meaning and calling | High | The path is "out of the red, towards freedom". Rank names tell a story from Spare Change to Vault Legend. Level ribbon always says what the money is doing | No hype claims, no promise of outcomes |
| 2 Development and accomplishment | High | Stages, 90 steps, XP, 20 levels, tiers, the earn moment | Never a figure without its working |
| 3 Empowerment of creativity and feedback | Medium | Every step answers within 250 ms (stud, number, line). Choose when to skip. Side quests can be done in any order | No forced order beyond the stage rail |
| 4 Ownership and possession | High | The token collection is yours. Bricks and keys language. Tokens persist and are never taken away | No tokens that can be lost or bought |
| 5 Social influence and relatedness | Light, on purpose | Privacy first: no leaderboard, no public profile, nothing shared by default. A later opt-in "share my rank" card with no figures is possible, not in this build | No comparing users |
| 6 Scarcity and impatience | Light | Tier rarity is about effort, never about limited time. The free month is a one-off, with no countdown timer | No timers, no "only today" |
| 7 Unpredictability and curiosity | Light | A locked token's silhouette hints at what comes next. "Next steps" names the nearest wins | No random rewards or loot, nothing that resembles gambling |
| 8 Loss and avoidance | Light, on purpose | Gentle streaks: one missed day forgiven, "Fresh start" copy, earned XP is never removed | No shaming, no red warnings, no "you lost" messages |

## 10. Reward: a free month (placeholders until the owner answers)

Surface: a reward line on the rank card and one reward token in the ladder at the chosen level. States: locked ("Reach [level] for a free month of Vault-It"), reached ("Your free month is ready. [claim route]"), claimed (the date and what it covers).

- `REWARD_LEVEL`: **TBD**, owner to confirm.
- `REWARD_CLAIM`: **TBD**, owner to confirm (candidates: automatic credit to the account, a button that starts the free month, or a code).
- Pedro's recommendation: Level 8, Vault Guard (1,550 XP), the end of the Shield rank. It is the first point where a user has built a buffer, taken on debt and set a budget, so it rewards real habit and not a login. It is far enough in not to be given away.
- Guard rails the builder should build in whichever way the owner chooses:
  - One free month per account, ever. State it in the copy.
  - Counted from XP that is latched (section 6), so changing numbers afterwards cannot revoke or re-earn it.
  - Figures are self entered, so someone can cheat the level. The cost is bounded at one month, so accept it and do not add nagging checks. The "Show working" lines keep it honest for everyone else.
  - Copy describes using the tracker, never doing a financial thing. No wording that links a reward to opening an ISA, taking a mortgage or investing. FCA line stays on the card.
  - Free users: see question 2.

## 11. Token collection (replaces the emoji cards)

- Same octagon. Three blocks: Milestone badges (31), Habit quests (the five in section 7), and a count "12 of 36".
- Tier from `xp` by the section 3 rule. Glyphs: reuse `FIRE_ICONS` where the metaphor fits, draw at most 10 new on the same 24 grid (the five quests included). Suggested sets: net worth ladder (sprout, coin, note, coins, bars, bars up, gem, gem 2, bolt, medal, mountain, crown, star, trophy, flame), save rate (piggy, safe, key), snapshots (snapshot, chart, calendar), debt (scissors, half pie, unlock), house, gold coin, rocket (income stream), flame (financially free), shield (emergency), sail (coast), streak (existing `vi-streak` symbol), calendar (monthly quests).
- No emoji anywhere on a token.
- Cell: token with ribbon (short name), then a text row "+150 XP · Strong". Locked cell: grey token, ribbon in `--lock`, line under it says how it is earned. Tap opens the stage panel pattern for that token. Filter chips: All, Starter, Solid, Strong, Summit.

## 12. Standing rules check and questions

| Rule | How this brief meets it |
|---|---|
| Type floor 10.5 px | All token text is HTML, Share Tech Mono or DM Sans, 10.5 px minimum. Plate and ribbon hidden below 96 px. Studs and chips carry no text |
| No em dashes | None in this file. Builder: none in UI strings, level names, tier names, quest names or aria labels |
| Sentence case | "Wealth roadmap", "Next up", "Side quests". Level names are proper names (Vault Guard). Stage names keep their current casing |
| FCA line | "Illustrative only. Not regulated by the FCA. Not financial advice." at the foot of the tab, under the dashboard roadmap and on the reward card. XP and reward copy never says "you should" |
| Reduced motion | Pulse becomes a static ring, earn animation is instant |
| No sideways scroll | Rail scrolls inside its own container only. Phone tab is a single column, ladder is an accordion, collection wraps |
| Colour meaning | Tokens never use blue (surplus) or red (debt). Teal means built, green only on the "cleared" tick, brass means achievement, amber only for skipped. No net worth figure on a token |
| One hero | The rank token on the tab, the rail on the dashboard |
| Honest maths | Stage panel and every XP line show their source and "Show working" |

**Questions for the owner (one batch). Builder proceeds on the defaults.**
1. Reward: at which level, and how is the free month claimed? Default: placeholders as in section 10, recommended Level 8.
2. Who sees their level and the reward? Today the XP part is Pro only, so a free user would never see the reward. Default (changes the current gate by this much only): everyone sees the rank card, XP bar and reward line, read only; the ladder detail, side quests and collection stay Pro and blurred. If you want all of it Pro only, the reward is then only for subscribers and the "free month" is a renewal credit, not a try-out. Those are two different products.
3. Existing testers will jump levels on first open when stage steps are counted. Default: accept, with one calm recalculation line. Say if you would rather start everyone from zero.

## 13. Acceptance (what Pedro will check in review)

Shots at 390 and 1100, Night and Daylight, of: dashboard rail, tab top (rank card and reward line), stage panel (one of each of the five states, with its three steps), ladder, side quests, collection.
1. Token is the same octagon on the dashboard and the tab, from one renderer.
2. 52 px token: icon legible, chip glyph distinguishable between tick, padlock, chevron and dashed tick. Measure at 100% zoom.
3. Four tiers distinguishable in greyscale (rim, depth plate and notch do the work). Five ranks distinguishable by glyph.
4. Rim, icon and chip contrast measured at 3:1 or better in both themes, numbers logged.
5. 30 stages, 90 steps, 31 badges, 5 habit quests. Stage tier counts 6 / 9 / 8 / 7. Spine XP totals 6,510.
6. Latching test: earn a step, lower the number, reload, XP and level unchanged.
7. Level 20 reachable with all house stages skipped, margin reported.
8. Free user: roadmap, tiers and (per question 2) rank card visible, Pro blocks blurred.
9. No text under 10.5 px, no em dashes, no horizontal page scroll at 390.
10. `prefers-reduced-motion`: no pulse, no stud sequence, no floating XP travel.
11. Renderer cost: 30 tokens use `<use>` on shared symbols, no per-token gradient ids.
12. Copy sweep: no "core, rare, epic, legendary", no "loss", "lost", "failed" on any streak or level text.
