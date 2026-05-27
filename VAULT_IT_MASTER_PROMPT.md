# Vault·It — Master Development Prompt
## v0.3.1-alpha | Owner: Pete Thickett (FetaPit) | Updated: 27 May 2026

---

## ADVISORY BOARD

Every product decision runs through this mental model:

| Role | Advisor | Their Lens |
|------|---------|-----------|
| CEO / GCDO | **Pete Thickett** | Vision. Brand. Global creative direction. The why behind everything. |
| CFO | **Gary Stevenson** | Debt-first. Working class truth. Blunt. "Clear the cage before you build the castle." |
| Strategic Advisors | **Warren Buffett & Charlie Munger** | Patient compounding. Economic moats. Long-term over short-term every time. |
| COO | **Simon Squibb** | Dream-activation. First steps. "What's your dream?" turns into "Here's your roadmap." |

*Advisory board framing — future collaboration hinted. No current endorsement implied. All attributions clearly fictional/aspirational.*

---

## OPENING PROMPT — PASTE AT THE START OF EVERY CLAUDE CODE SESSION

```
You are the senior engineer for Vault·It.

Mission: take the average person in debt to owning their home outright.
North star: Stage 0 (debt > income) → Stage 6 (outright ownership).

READ FIRST (before any code):
  /Vault-It/VAULT_IT_CLAUDE_CODE_HANDOVER.md   ← full spec
  /Vault-It/VAULT_IT_MASTER_PROMPT.md           ← this file

Working file: /Vault-It/index.html
(Vault-It_v0.3_Alpha.html — single self-contained HTML. Same file.)

TECH CONSTRAINTS — NEVER BREAK:
  1. ISO SVG house builder is the USP. Do not touch _iso(), _grid(), _bgRect()
     without re-reading §6 of the handover first.
  2. Tab switching: display:none/block only. Never position:absolute for tabs.
  3. Single <script> tag. No ES modules. No external JS libs not already present.
  4. After EVERY change: run `node --check` on extracted JS. Fix before moving on.
  5. Div balance check: count('<div') must equal count('</div>').
  6. localStorage keys: pos4 · pos_house · pos_journey · vi_user · vi_debt · vi_waitlist

ADVISORY BOARD MENTAL MODEL:
  Gary Stevenson (CFO)     → debt-first, working class, no-nonsense
  Buffett + Munger         → compound patience, quality, long-term moats
  Simon Squibb (COO)       → dream-activation, first income stream, one step at a time
  Pete Thickett (CEO/GCDO) → brand vision, creative direction, the north star

CURRENT SESSION GOAL:
  [DESCRIBE WHAT YOU WANT TO BUILD OR FIX]

PROTOCOL:
  1. State your plan before writing code
  2. Make surgical changes — do not rebuild what works
  3. Validate JS + div balance after every change
  4. Report: what changed, file size, pass/fail
```

---

## PRODUCT SPEC SUMMARY

**Single-file PWA.** No build step. Works from `file://` or GitHub Pages.

### Tab Map

| Tab | ID | Gate | Primary Job |
|-----|-----|------|-------------|
| Overview | `tab-overview` | Free | Net worth snapshot. KPI strip. FIRE roadmap. Cashflow chart. |
| Journey Map | `tab-journey` | Free | 7-stage wizard. SVG road. Debt → ownership narrative. |
| House Builder | `tab-house` | Free | ISO SVG viewport. Deposit progress = building fills. THE USP. |
| Assets & Liabilities | `tab-assets` | Free | Metals · Crypto · Cash · Liabilities subtabs. |
| Debt Tracker | `tab-debt` | Free | Debt rows. Avalanche/snowball calculator. Gary's domain. |
| Entrepreneur | `tab-biz` | **PRO** | Revenue · Clients · Pipeline. Gated behind task completion. |
| Achievements | `tab-achievements` | Free | XP badges. Level system. |
| Connections | `tab-connections` | Free | Platform cards. Phase 2 API wiring. |

### State Keys

| Key | Contents |
|-----|----------|
| `pos4` | Main overview: assets, income, expenses, snapshots, milestones, cashflow |
| `pos_house` | House: `{saved, target, type, deposits[]}` |
| `pos_journey` | Journey: `{profile, onboarded, stageOverride, mortgageActive}` |
| `vi_user` | Profile: `{name, email, phone, goal, joined, pro, logins}` |
| `vi_debt` | Debts: `{debts[]}` |
| `vi_waitlist` | Waitlist emails: `[string]` |

---

## ADVISOR VOICE GUIDE

Use these when writing in-app copy, toast messages, or Journey Map stage descriptions:

### Gary Stevenson (CFO)
- Tone: Direct. Blunt. Working class solidarity. Angry about inequality but channelled into action.
- His core message: Debt is expensive and structural. Clear it first. Savings and investment come after.
- Sample quotes: "Debt is the cage. Clear it first, then build wealth." / "Every 1% of debt interest you pay is 1% you're not compounding."
- Use: Debt tab, Journey Stages 0-2, emergency fund messaging.

### Warren Buffett & Charlie Munger (Strategic Advisors)
- Tone: Patient. Long-term. Slightly folksy. Wisdom through simplicity.
- Their core message: Time + compounding + quality. Don't lose money. Think in decades.
- Sample quotes: "The best time to plant a tree was 20 years ago. The second best time is today." / "Invert. Always invert — what would make you fail? Avoid that."
- Use: Overview FIRE roadmap, Assets tab, long-term wealth milestones.

### Simon Squibb (COO)
- Tone: Energetic. Optimistic. Dream-first. Accessible entrepreneur energy.
- His core message: Everyone has a dream worth building. One client, one stream — start before you're ready.
- Sample quotes: "What's your dream?" / "You don't need perfect. You need started." / "Your first pound of business income changes everything about how you see yourself."
- Use: Entrepreneur tab, income stream prompts, Journey Stage 4-6.

### Pete Thickett (CEO / GCDO)
- Tone: Creative. Precise. Design-led. Strategic.
- His core message: This product is beautiful because it has to be. Visual storytelling creates emotional investment.
- Use: Onboarding, brand copy, product vision statements.

---

## FREEMIUM ARCHITECTURE

```
Free tier: Overview, Journey, House, Assets, Debt, Achievements, Connections
Pro tier:  + Entrepreneur tab (unlocks after 5 core tasks complete)

Core tasks gate:
  ✓ Add income source
  ✓ Add monthly expenses
  ✓ Set house target
  ✓ Log a debt (or confirm debt-free)
  ✓ Complete Journey Map wizard

Upgrade flow (v0.3.1):
  showUpgrade() → task check → waitlist modal (vi_waitlist)
  Stripe wiring: Phase 3
  Price IDs: monthly price_1TbOhV9mgKf6HntykhBYBaHI · annual price_1TbOha9mgKf6HntyZR0AEYvK
```

---

## DEPLOYMENT

```
Repo:    github.com/FetaPit/Pareto- → /Vault-It/
Pages:   Settings → Pages → Branch: main → Folder: /Vault-It
CNAME:   /Vault-It/CNAME → vault-it.ptlive.design
DNS:     Add CNAME at your DNS provider:
           Host: vault-it
           Value: fetapit.github.io
           TTL: 3600
Live:    https://vault-it.ptlive.design (after DNS propagation ~2-24h)
```

---

## v0.4 BACKLOG

| Priority | Gap | Notes |
|----------|-----|-------|
| 🔴 HIGH | Wire Stripe Checkout | `showUpgrade()` now shows waitlist. Wire when Phase 3 ready. |
| 🔴 HIGH | Metals live prices CORS | Need `/api/metals` proxy or serverless function. |
| 🟡 MED | Waitlist backend | Currently localStorage. Wire to Formspree or Supabase. |
| 🟡 MED | Settings: WCAG options | Font size, contrast, reduce motion. |
| 🟡 MED | Currency toggle | GBP default. USD/EUR stubs present. |
| 🟡 MED | Connections API | UI complete, no real API calls yet. |
| 🟡 MED | Entrepreneur tab | Pro-gated. Revenue/client/pipeline need full state wiring. |
| 🟡 MED | Supabase sync | Cross-device. localStorage only now. |
| 🟢 LOW | PWA service worker | Offline support. Manifest added v0.3.1. |
| 🟢 LOW | 3D model upload | GLTFLoader present, `handleModelUpload` wired. |
| 🟢 LOW | Meshy AI integration | `generateMeshyModel()` present, needs API key. |

---

*Vault·It · PT Live Design · From debt to owning your home outright.*
*Single file · localStorage only · No build step · Open in browser and go.*
