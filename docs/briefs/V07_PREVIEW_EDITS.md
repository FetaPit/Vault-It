# v0.7 preview edits (owner, 1 Nov 2026, about 19:00)

Found by the owner on the preview of candidate 67bb51e (https://candidate-v0-7-vault-it.ptlived.workers.dev). Queued only: nothing is built until the owner says go. Each edit below is the owner's own words first, then the one-line reading of it.

## Owner's words, verbatim

> First of all, the icons at the bottom, like the navigation bar at the bottom for the app, they're great and should be where they are on mobile view. But once the user opens it on a fold phone or a tablet or something wider than a usual mobile device, as in a mobile phone, then this nav bar with the icons, dashboard, budget, USP, house builder, debt tracker, investments, that needs to go back up to the top of the menu as it does on desktop. Okay, that's edit one. Edit two, the roadmap, financial freedom roadmap, needs to auto start at the next achievement for the user. So for me, it's debt halved, not at the beginning. Also, six later stages are already met, waiting on debt halved. Just remove that golden box, that tile, and then that information should be viewable once the user clicks on whatever achievement they want to complete. There needs to be a better flow animation on the cash flow and the income stream flow, as well as the labels for each expense being visible, because at the minute they're getting lost, so they need to have like a black label background. Okay, everything else is fine. Next, the budget tab. The user adding the key, the key box where it says committed essentials, variable essentials, with the icons and the color coding, that needs to be smaller and fit underneath in its own separate tile, or attached to the top tile, because that allows the user to read the bar at the top. Also, add a intro animation to that bar filling up. Then the 3D where your income flows, that's exactly going to be the same as that on the dashboard, so replicate it. The 3D view needs to be able to show a stroke line, an outline of each section, so red for committed essential, dark red. That dark red rectangle should group all of that visually and flag post to the label, so the label isn't sitting on top. It's attached to the flag post that the user can still navigate around and see that it's attached. So it'll be a green for the investments, a green rectangle stroke line, yellow for variable non-essentials, etc., etc. All labels attached with flag posts. The default view on spending and saving per month needs to be collapsed, and so the user can expand when they want to, and the arrow on the right of each committed essentials, so the expenses bar, that small arrow needs to be larger and face downwards, so it's evident that the user can click on it and expand it. Where it says choose a category, these categories, the pills, again, need to be in a drop down list and only show the main ones, and then the user can expand that when they need it. The main issue is the 3D engine, the animation for the house builder is not working. It's too slow. The user can't navigate it easily. I like it. However, it's breaking the website, which isn't great. So that needs to be fixed. So what I propose, and I would like some critique on, is only the last course of bricks, the last row, is animated upon loading, and the rest act as one 3D model already loaded. But I like the animations, it's just really slow. So we need to stop it breaking it. We need to make it more efficient, and the 3D WebGL engine more powerful, so users can work on it and understand it. So it looks like it's working really well now, but I think that's only because I've loaded the website beforehand. Also, it looks quite low fidelity, the wireframe, so the wireframe should be quite sharp. And the background, the ground plane animation isn't working, so there should be a subtle rectangle spreading out around the house, like on the net worth 3D viewport. The add your savings is a bit is wrong, so it should say contribute to your house, something like that, or it already says lay your bricks, so actually remove that add to your savings. But the entry box for the currency to add, say like £2,000 to the deposit, is too small. I want all of the functionality of this 3D viewport for the house, but at the minute it's not looking high definition, it's looking low quality. So let's figure that out. The navigation buttons at the top of the Build Your Dream Home, those should be smaller and on brand, and at the bottom of the viewport. The liabilities and wealth inventory, I can't expand the 3D view of the Honda Civic, so the liabilities should be able to on touch click and also click and drag a zoom in onto that 3D model, which is not at the minute. Same goes with the wealth inventory. Debt track is fine. Everything else is fine. So let's put a lot of effort into this house builder and progress this tonight. I want to have a version to show a tester tonight. Okay.

## The edits, one line each

### Priority: house builder (owner: "put a lot of effort into this house builder ... a version to show a tester tonight")
- E12. House builder is too slow on a cold load, hard to navigate and breaks the page. Keep every animation and feature, but stop it breaking the site. Measure from a cold load (cleared cache, phone), not a warm one.
- E13. Owner's proposal: on load only the last course (top row) animates; everything below loads at once as one finished model. Critique requested (see below).
- E14. Higher fidelity: sharp wireframe, looks high definition, not low quality.
- E15. Ground plane: a subtle rectangle spreading out around the house, as on the Net worth 3D viewport (currently not working).
- E16. Remove "Add your savings" ("Lay your bricks" already says it).
- E17. The amount box for adding to the deposit (e.g. £2,000) is bigger.
- E18. "Build your dream home" buttons: smaller, on brand, moved to the bottom of the viewport.

### Navigation
- E1. Bottom icon bar stays on phones only. On fold phones, tablets and anything wider than a phone, the nav goes to the top as on desktop.

### Dashboard
- E2. Financial freedom roadmap opens at the user's next achievement (for the owner: Debt halved), not at the start.
- E3. Remove the gold tile "six later stages are already met, waiting on Debt halved"; that information shows when the user taps an achievement.
- E4. Cash flow and income stream flow: better flow animation; every expense label readable on a black label background.

### Budget
- E5. The key (committed essentials, variable essentials, icons, colours) is smaller and sits in its own tile under the top bar, or attached to the top tile, so the top bar can be read.
- E6. Intro animation: the top bar fills up.
- E7. 3D "Where your income flows" is the same as the dashboard's: replicate it.
- E8. 3D outlines: each section grouped by a rectangle stroke in its colour (dark red committed essentials, green investments, yellow variable non-essentials, and so on). Each label sits on a flag post attached to its section, not on top, and stays visibly attached while the user orbits.
- E9. "Spending and saving per month" collapsed by default; the user expands it.
- E10. The expand arrow on each expense bar (e.g. Committed essentials) is larger and points down.
- E11. "Choose a category" pills become a dropdown showing the main categories, expandable for the rest.

### Liabilities and Wealth inventory
- E19. 3D models (e.g. the Honda Civic) open larger on tap or click, with drag to orbit and pinch or scroll to zoom. Same for Wealth inventory.

Fine as is (owner): Debt tracker, everything else.

## Critique of E13 (owner asked for it)

- Agree with the shape of it. The 31 Oct speed fix (451d6be) already merges bricks into one mesh once they have landed, but the cold load still has to build and draw the whole house before anything is usable. Showing the finished house at once and animating only the newest course removes most of that cost.
- Refinement: animate the bricks added since the user's last visit, capped at one course, rather than always the top row. A returning user then sees their progress laid, and a new user sees one row drop, not the whole house.
- Most of the cold-load cost is likely set-up, not the animation: shader compiling, building geometry and first-frame layout. Build the house geometry once and keep it (so the second visit is instant), start WebGL only when the viewport scrolls into view, and show the still picture until the first 3D frame is ready, so the page never freezes.
- Fidelity and speed pull against each other. Sharper lines usually come from rendering at the screen's full pixel ratio with anti-aliasing and using proper thick lines for the wireframe, which costs more GPU. Keep it sharp at rest and drop the resolution only while laying or orbiting.
- Prove it with numbers from a cleared-cache phone load (time to first 3D frame, longest page freeze, tap delay), before and after, as the 31 Oct fix did. The owner's hunch that it only looked fast because it was cached is a fair one to test first.
