# Vault·It user flow

A single connected map of the live site, from the first visit to every tab, sub-tab and modal.

- FigJam board (the flow): https://www.figma.com/board/4snyHH3tVOtTUXnxAMhgEA
- Figma design file (editable screens): https://www.figma.com/design/L1XqC5LMcbv2QmBstCkp9Z
- Source: `docs/user-flow.mmd` (Mermaid flowchart). Regenerate with the Figma MCP `generate_diagram` tool, or paste into any Mermaid renderer.
- Mapped from the live app at app.vault-it.co (v0.9.2 Alpha, build flow-dash-1) and the vault-it.co landing page on 8 Nov 2026. The `index.html` in this repo is the older v0.6 build, so the flow follows production, not this file.

## What is on the board

| Area | Screens |
| --- | --- |
| vault-it.co landing | Hero 3D demo, scroll sections, Join the beta form, beta list, Open the app, Privacy notice, Beta terms |
| Sign in | Session check, email, Google, 6-digit code, set PIN, enter PIN, forgot PIN |
| First run onboarding | Tester welcome, steps 1 to 6 (name and email, where are you, money each month, home goal, plan and WhatsApp, Start Vaulting) |
| App shell | Top nav, sidebar profile, net worth |
| Overview | Net worth chart, history modal, add goal, add data point, Financial Freedom Roadmap card, Wealth Roadmap card, cash flow card, own and owe, achievements strip, Dev message |
| Budget | Income flow, income streams, expenses |
| House builder | 3D scene, levels, lay bricks, plan, deposit history, house purchased, your own design (Pro) |
| Assets and liabilities | Metals, Crypto, Cash and savings, Stocks, Wealth inventory, Liabilities |
| Debt tracker | Your plan, debt modal, debts by size, pay-off view, owed to you, owe modal |
| Entrepreneur (Pro) | Pro gate, income streams, MRR goal, leads, clients and their forms |
| Wealth Roadmap | 30 stage roadmap, next steps, side quests, levels, how XP works, reset |
| Connections | Opens Settings at platform connections |
| Network (Web3) | Connect wallet, switch network, mint card, share profile, opt-in |
| Settings modal | Account, appearance, help and tour, live prices, connections, cloud sync, PIN, privacy, delete account |
| Global | Help panel, guided tour, legal modal, Pioneer offer, day 30 plan prompt, verify payment, Stripe checkout |

## Editable screens

Every box on the FigJam board links to an editable screen in the design file (click the box text). The screens were captured from the live app in the Alex Morgan demo (Night theme, 390 px wide) on 10 Nov 2026 and imported as real Figma layers: live text in Syne, DM Sans and Share Tech Mono, vector shapes for cards and buttons, SVG icons as vectors. Page 09 holds flat reference screenshots (mobile and 1280 px desktop) to check against.

Known gaps: the 3D house and metals scenes are placeholder boxes (WebGL does not render in the capture), Connections has no screen of its own because the tab opens Settings, and Stripe checkout is off-site.

To refresh after a release: `node docs/user-flow-capture/capture.js shots spec`, then `node docs/user-flow-capture/svg.js spec svg`, then upload the SVGs to the design file with the Figma MCP `upload_assets` tool. Save the returned upload URLs as JSON and run `SVGDIR=svg node docs/user-flow-capture/post.js urls.json 03` to post one page group (keys are in manifest.json); it writes placed.json with the new frame ids. `node docs/user-flow-capture/gen-links.js <keys>` then prints the maps for re-pointing the FigJam boxes (figjam-map.json holds box id per screen) and the read-me index at the new frames.

## Legend

- Section tint: one colour per area. Gold nodes are Pro or paid. Grey nodes are outside services.
- Parallelogram: a form the user fills in. Diamond: a decision. Rounded box: a modal or overlay.
- Dotted line: optional, skipped or conditional path.
