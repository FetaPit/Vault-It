# Vault·It — Claude Code Handover
## v0.3 Alpha · Ready for GitHub · FetaPit/Pareto-/Vault-It/

**Owner:** Pete Thickett (FetaPit)  
**Product:** Vault·It — Personal finance app. Mission: get the average person in debt to owning their home outright.  
**Repo target:** `github.com/FetaPit/Pareto-` → subfolder `Vault-It/`  
**Deploy:** GitHub Pages (`index.html` at root of subfolder)  
**Date:** 27 May 2026  
**File:** `Vault-It_v0.3_Alpha.html` — single self-contained file, no build step  

---

## 1. WHAT THIS IS

A single-file progressive web app. All state in `localStorage`. No backend required for core functionality. Stripe integration stubbed (Phase 3). Opens directly in browser from file or GitHub Pages.

**North star:** Stage 0 (debt > income) → Stage 6 (outright home ownership). Every feature serves this journey.

**Advisory board mental model:** Munger/Buffett strategy, Sinek purpose/narrative, Gary Stevenson accessibility.

---

## 2. BRAND TOKENS

```css
:root {
  --bg: #080808;  --c1: #0f0f0f;  --c2: #161616;  --c3: #1e1e1e;  --c4: #252525;
  --em: #44c0b9;  --em2: #38a09a;  --dp: #007f7b;
  --go: #c9a84c;  --go2: #e8c56a;
  --gr: #3ecf8e;  --re: #e05c5c;  --or: #e0894a;  --pu: #9b7ec8;
  --tx: #e8e8e8;  --t2: #9aa0a6;  --t3: #5a6068;
  --bd: rgba(68,192,185,.13);  --bd2: rgba(68,192,185,.28);
}
```

**Fonts:** Syne (headings/labels), Share Tech Mono (numbers/codes), DM Sans (body)  
**Logo:** SVG vault door — concentric rings, 60 tick marks, V chevron in teal, gold bolt holes  
**Aesthetic:** Cyberpunk precision. Clip-path polygon corners. Scan-line texture. Duo-tone icon shadows.

---

## 3. TAB STRUCTURE (sitemap)

| Tab | ID | Free/Pro | Colour | Key components |
|-----|-----|----------|--------|----------------|
| Overview | `tab-overview` | FREE | Teal | KPI strip, FIRE roadmap, cashflow chart, milestone tracker |
| Journey Map | `tab-journey` | FREE | Gold | 7-stage wizard, SVG road, Gary Stevenson trio |
| House Builder | `tab-house` | FREE | Amber | ISO SVG viewport, HUD controls, property selector |
| Assets & Liabilities | `tab-assets` | FREE | Green | Metals/Crypto/Cash/Liabilities subtabs |
| Debt Tracker | `tab-debt` | FREE | Red | Debt rows, avalanche calculator |
| Entrepreneur | `tab-biz` | **PRO** | Orange | Revenue, clients, pipeline (gated) |
| Achievements | `tab-achievements` | FREE | Gold | Badges, XP system |
| Connections | `tab-connections` | FREE | Purple | Platform cards (UI only, Phase 2) |

---

## 4. STATE SCHEMA

All state lives in `localStorage`. Keys:

| Key | Contents |
|-----|----------|
| `pos4` | Main app state (overview, assets, cashflow) |
| `pos_house` | House builder state (`{saved, target, type, deposits[]}`) |
| `pos_journey` | Journey map state (`{profile, onboarded, stageOverride, mortgageActive, mortgageBalance}`) |
| `vi_user` | User profile (`{name, email, phone, goal, joined, pro, logins, income, expenses, house}`) |
| `vi_debt` | Debt tracker state |

---

## 5. USER JOURNEY FLOW

### New user
1. `initWelcome()` fires on load — overlay visible
2. Step 1: name + email + goal question → `wStep1Next()` → maps to journey stage
3. Step 2: income, expenses, debt, house target → `wStep2Submit()` → writes into `ovState`, `debtState`, `state`, `journeyState`
4. Profile auto-populates sidebar on `updateSidebar()`
5. Free tier: Overview, Journey, House, Assets, Debt, Achievements, Connections

### Returning user
1. `initWelcome()` fires — overlay stays hidden
2. After 1.5s: `initProOffer()` fires Pro offer modal
3. Discount ladder: standard → 15% (7d) → 25% (14d) → 40%/£2.99/mo (30d+)
4. Pro gate on Entrepreneur tab — task gate blocks upgrade until 5 core tasks done

### Core tasks (gate for Pro upgrade)
- [ ] Add income source
- [ ] Add monthly expenses
- [ ] Set house target
- [ ] Log a debt or confirm debt-free
- [ ] Complete Journey Map wizard

---

## 6. ISO VIEWPORT (House Builder)

The ISO SVG renderer is the **main USP**. Do not break it.

**Coordinate system:**
- `_ox`, `_oy` = SVG origin (centre-left, 68% down)
- `_tx`, `_ty`, `_tz` = ISO tile dimensions (scale with zoom)
- `_iso(x, y, z)` = converts ISO coords to SVG pixel coords
- X axis = left/right, Y axis = depth into screen, Z axis = height (up)

**Ground plane:** fills the full 700×500 SVG viewBox. Grid from (-14,-4) to (18,16). Horizon fade applied to dots and lines.

**House states:** building (progress fills brick by brick), ghost (deposit saved, blueprint blue), owned (warm full colour)

**HUD controls:**
- `houseZoomIn()` / `houseZoomOut()` — ±15% zoom
- `toggleOrbitMode()` — toggles orbit/pan
- Touch: 1-finger = orbit, 2-finger = pan, pinch = zoom
- Readout strip shows ZOOM/YAW/MODE live

**Build phases** (by deposit %):
- Foundation: 0%+ 
- Walls: 15%+ 
- Upper floors: 40%+
- Roof: 65%+
- Details/garden: 82%+

---

## 7. JOURNEY MAP CALCULATORS

All pure functions, no side effects:

| Function | Calculates |
|----------|-----------|
| `jrnyCalcStage()` | 0-6 journey stage from live data |
| `jrnyDebtFreeMonths()` | Months to zero debt (avalanche) |
| `jrnyEFMonths()` | Months to 3-month emergency fund |
| `jrnyDepositMonths()` | Months to deposit target (with LISA bonus) |
| `jrnyKeysDate()` | Projected keys-in-hand date |
| `jrnyCalcDTI()` | Debt-to-income ratio |
| `jrnyMaxMortgage()` | 4.5× annual income |
| `jrnyMortgageReadiness()` | RAG grid (5 criteria) |

---

## 8. FIRE ROADMAP

Full-width horizontal SVG timeline. 30 stages in 6 phases.

| Phase | Stages | Colour |
|-------|--------|--------|
| Foundation | 1-4 | Teal |
| Stabilise | 5-10 | Gold |
| Save | 11-16 | Amber |
| Buy | 17-21 | Purple |
| Own | 22-26 | Green |
| Free | 27-30 | Gold |

Timeline scrolls horizontally. Click node → `fireShowDetail(idx)` shows panel below. Progress arc on next node. YOU ARE HERE chip on current stage.

---

## 9. FREEMIUM / PAYWALL

```javascript
// Check upgrade eligibility
function getCoreTaskStatus() // returns [{label, done, tab, icon}]
function coreTasksComplete() // returns bool

// Trigger upgrade
function showUpgrade(plan) // 'annual' | 'monthly'
// Stripe IDs (Phase 3):
// Monthly: price_1TbOhV9mgKf6HntykhBYBaHI (£4.99/mo)
// Annual:  price_1TbOha9mgKf6HntyZR0AEYvK (£39.99/yr)

// Pro offer modal
function initProOffer() // fires 1.5s after load for returning users
```

**Discount ladder:**
- Day 0-6: standard price
- Day 7-13: 15% off (£4.24/mo)
- Day 14-29: 25% off (£3.74/mo)
- Day 30+: 40% off (£2.99/mo) — best price, expires in 7 days

---

## 10. DATA PERSISTENCE

```javascript
// Export full backup
function exportData() // downloads JSON bundle of all localStorage keys

// Import backup
function importData() // file picker → JSON → write to localStorage → reload

// Profile save
function saveProfile() // saves vi_user from sidebar inputs
```

---

## 11. KNOWN GAPS (v0.4 backlog)

| Priority | Gap | Notes |
|----------|-----|-------|
| 🔴 HIGH | Stripe checkout not wired | `showUpgrade()` shows toast. Wire to Stripe Checkout URL |
| 🔴 HIGH | Metals live prices CORS-blocked | Need `/api/metals` proxy or CORS workaround |
| 🟡 MED | Settings: WCAG options | Font size, contrast mode, reduce motion |
| 🟡 MED | Settings: currency toggle | GBP default. USD/EUR stubs present |
| 🟡 MED | Connections tab API | UI complete, no real API calls yet |
| 🟡 MED | Entrepreneur tab content | Pro-gated. Revenue/client/pipeline UIs need wiring to state |
| 🟡 MED | PWA manifest + service worker | Add for offline + install prompt |
| 🟡 MED | Supabase sync | Cross-device state sync. localStorage only currently |
| 🟢 LOW | 3D model upload in House Builder | GLTFLoader present, `handleModelUpload` wired |
| 🟢 LOW | Meshy AI integration | `generateMeshyModel()` present, needs API key |
| 🟢 LOW | Achievements XP system | Data structure present, trigger logic partial |

---

## 12. GITHUB PAGES DEPLOY

```bash
# From repo root
cd Vault-It/
cp Vault-It_v0.3_Alpha.html index.html

# Or in repo settings:
# Settings → Pages → Source: Deploy from branch
# Branch: main  Folder: /Vault-It
# Access: https://fetapit.github.io/Pareto-/Vault-It/
```

The file is fully self-contained. No node_modules. No build step. Open `index.html` and it works.

---

## 13. OPENING PROMPT FOR CLAUDE CODE

```
I'm working on Vault-It, a single-file personal finance app at:
github.com/FetaPit/Pareto- → Vault-It/Vault-It_v0.3_Alpha.html

Read VAULT_IT_CLAUDE_CODE_HANDOVER.md first — it contains the full spec.

Current session goal: [DESCRIBE YOUR SESSION GOAL HERE]

Key constraints:
- Single HTML file. No build step.
- All state in localStorage (keys: pos4, pos_house, pos_journey, vi_user)
- ISO SVG renderer is the USP — do not touch the _grid, _bgRect, _iso functions without reading §6 of the handover doc
- Freemium: free tier gates Entrepreneur tab behind Pro
- Brand: teal #44c0b9 + gold #c9a84c, Syne font, cyberpunk clip-path aesthetics

Do not rebuild. Surgical changes only.
Form follows function follows intent.
```

---

## 14. FILE MANIFEST

```
Vault-It/
├── index.html                          ← copy of Vault-It_v0.3_Alpha.html
├── Vault-It_v0.3_Alpha.html           ← source
└── VAULT_IT_CLAUDE_CODE_HANDOVER.md   ← this file
```

---

*Vault·It v0.3 Alpha · PT Live Design · 27 May 2026*  
*Single file · 9,083 lines · 275 functions · 8 tabs · localStorage only*  
*Mission: From debt to owning your home outright.*
