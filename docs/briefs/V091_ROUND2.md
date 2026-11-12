# v0.9.1 round 2: owner edits before the v0.9.1 push

Owner, 4 Nov 2026 ~09:30, on the preview of `candidate/v0.9.1` 6b1ba9f
(https://candidate-v0-9-1-vault-it.ptlived.workers.dev/), Chief of Staff session:
"See this as the main source for an additional round of edits before push v0.91 round 2".

Annotated screenshots (owner's red marks) are in `docs/briefs/v091r2/`. Open the ones your chunk names.

## The owner's words (verbatim, numbered as given)

| # | Owner's words | Shot |
|---|---|---|
| R1 | "Increase vault it wordmark so in proportion with icon, the icon should be roatting subtley left to right by varying degrees as if opening a vault." | 01 |
| R2 | "Add small relevant icons to the left of text on labels in networth 3d" | 02 |
| R3 | "Increase the two point perspective behind the achievements and decrease perspective height. See screenshots edits in red" | 03, 07 |
| R4 | "Colour code each section of the roadmap stabilise save etc. Keep base colour of standard achievemtns teal but outline with the section colour" | 03 |
| R5 | "Grey out by 35% completed achievments" | 07 |
| R6 | "ensure section line dividers on the ground follow the perspective" | 03 |
| R7 | "Keep green as main achievemtn, purple as big milestone and add a gold tier(one for each section which graduates user to the next part of their financial freedom roadmap" | 03 |
| R8 | "Add more achievments to each section that will help[ inform the user when they have done something worthy of recognition. 50 in total. Front load the majority in Foundation, stabilise and save." | 03 |
| R9 | "Cash flow add icons to labels same style as before" | 04 |
| R10 | "Across all views m ake the income flow chart more compact acros the Y Axis" | 05 |
| R11 | "Make the dotted line the same line thickness and solid as in the flow chart above" | 06 |
| R12 | "Make the House type selctor the same style as the achievement icons and slates." | 08 |
| R13 | "Put the selcted house type top right of the viewport allowing user to click for more details, snapshot of stats and stuts of the build, also allowing user to change housetype." | 09 |
| R14 | "For the stat tiles we can resuse compressed versions of the ones below the viewport" | 10 |
| R15 | "Instead of having house type viewable as a tile in Housebuilder, include this in the onboarding questionnaire with the new aesthetic Achievment type graphics for each house type, but remove it from this tab as it will be availiable in the top right viewport and the user should bnot need to change too many times once they have decided." | 08 |
| R16 | "coins animated in singly like the bricks. viewport cash and savings is not great, earn from housebuilder viewport to adapt" (read "learn from") | none |
| R17 | "Wealth Inventory Viewport looks low quality, lets increase the contrast of the gound plane and skyle, the sharpness of the ground plane lines and add some good lighting in the environment which should have a teal hue but the lighting on the object is white light, apply to liabilities viewport too, the remove x icon needs to be to top right as its missing." | 11 |
| R18 | "Improve perfromance of these inventory and liability viewports, as its just one 3D model it should run smooth as closing the expanded viewport takes 5 seconds." | 11 |
| R19 | "add a teal bitcoin icon to the crpto subtab as the current is too low quality." | 12 |
| R20 | "Reconfigure the Crpto tiles as before putting more emphasis on the iconography of the crpto" | 12 |
| R21 | "Liabilities and Wealth Inventory remove search discogs" | 15 |
| R22 | "Ensure the Achievments, levle and Vault-It profile card sync up as my level says lvel 7 Rate Slayer but on Welth Roadmap it says Vault Guard" | 13, 14 |
| R23 | "Decrease the Y axid on the Profile card so it is in proprtiaon with a credit card" | 13 |
| R24 | "Increase profile photo space and do not apply the holographic effect to the profile image" | 13 |
| R25 | "Daylight mode still looks off, increase the the saturation slightly of the background of each tab to contrast better against the tiles" | 15 |
| R26 | "Try the Night Main Header on the Daylight section" | 15 |

## Chunks (Chief of Staff split; parallel, one branch each, cut from `candidate/v0.9.1`)

| Chunk | Branch | Edits | Area |
|---|---|---|---|
| A chrome | `v091r2/chrome` | R1, R23, R24, R25, R26 | header lockup, sidebar profile card, Daylight tokens |
| B labels and flow | `v091r2/labels-flow` | R2, R9, R10, R11 | Net worth 3D labels, Cash flow 3D labels, income flow (Sankey) chart on Budget and Overview |
| C roadmap | `v091r2/roadmap` | R3 to R8, R22 | Wealth Roadmap strip (Overview + tab), achievement list, XP and level source |
| D house type | `v091r2/house-type` | R12 to R15 | House builder house-type selector, viewport chip and panel, onboarding questionnaire |
| E coins | `v091r2/coins` | R16 | Cash and savings 3D; starts from `v09x/cash3d-look` (open, a4c4765) not the candidate |
| F inventory 3D | `v091r2/item-viewer` | R17, R18, R21 | Wealth inventory and Liabilities 3D viewer, expanded modal, Discogs search |
| G crypto | `v091r2/crypto` | R19, R20 | Assets > Crypto sub-tab |

## Readings and decisions (flag any you disagree with to the Chief of Staff)
- R3: the reference is the red sketch on shot 03: a wider, flatter ground plane (two-point perspective spread further left and right, lower camera height) so the floor reads as a stage under the slates.
- R4/R7: section colours come from brand tokens already used for the section names; standard achievement slate stays teal with a section-colour outline; big milestones purple; one gold "graduation" slate closes each section.
- R5: completed slates at 35% grey (desaturate/dim by 35%), still readable, tick still visible.
- R8: 50 achievements total (counting existing), most in Foundation, Stabilise and Save. Each must be triggered by real app data the user enters; no achievement for things the app cannot see. No money advice in the copy.
- R22: one source of truth for XP and level. The Wealth Roadmap rank (all XP: roadmap, side quests, badges, house milestones) is the recommended truth; the profile card and sidebar read it. Do not reset anyone's saved XP.
- R15: the saved house type and price stay exactly as stored; only where the choice is made moves (onboarding + the viewport chip). Existing users keep their house.
- R16: same staging as the house bricks: one coin at a time on first view, finished stacks at once on later visits, `prefers-reduced-motion` shows them placed.
- R21: remove the "Search Discogs" control only; keep the other value sources.

## Rules for every chunk
`CLAUDE.md` brand rules (no em dashes, British English, sentence case, Syne / DM Sans / Share Tech Mono only, no new outside hosts, FCA line visible, reduced motion, no sideways scroll). Through the `ship-item` skill: failing test first, named tests, element shots at 390 and 1100 px in Night and Daylight, Pedro review, `rollout-qc` PASS. Do not touch Supabase, secrets, prices, deposits or saved-data formats. Do not merge into `candidate/v0.9.1`; the Chief of Staff merges one chunk at a time.
