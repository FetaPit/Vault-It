# Connecting Cash Money to your money

Researched November 2026. Products change, so recheck before paying for anything.

## What's available

| Tool | Claude link | What Claude gets | Notes |
|---|---|---|---|
| **Xero** | Official connector in Claude's directory, made by Xero | P&L, balance sheet, cash position, aged debtors and creditors, top customers, org info | Read-only. One Xero organisation at a time. Works on any Xero business plan |
| Xero (local) | Open-source `@xeroapi/xero-mcp-server` (npm), for Claude Desktop or Claude Code | Same, plus create and update invoices and contacts | Needs a Xero developer app (client ID and secret). Can write, so approve every change |
| Meridian Connector for Xero | Third-party connector in Claude's directory | Full read and write to Xero | Not made by Xero |
| **Tide** | None | Nothing direct | No official connector or public API. Use CSV exports, or feed Tide into Xero |
| Tide via BankSync | Third-party MCP server using Open Banking | Balances and transactions | Not made by Tide. Read their data terms first |
| **Stripe** | Official connector | Payments, payouts, fees, balance | Good for sales income |
| Google Calendar | Official connector | Add tax deadlines as events | Ask before creating events |
| Google Drive / Sheets | Official connectors | Read receipts, write a tax pot tracker | |
| Companies House | Free public API (key needed) | Company details, filing history, officers, deadlines | Read is simple. Filing needs OAuth and approved software |
| HMRC MTD APIs | Only through HMRC-recognised software | — | Claude can't file to HMRC directly. Use Tide, Xero or other recognised software |

## How Tide connects to other tools

Tide has bank feeds into Xero (updates about every 2 hours), FreeAgent (every 24 hours), QuickBooks, Sage and others through Open Banking. So **Tide → Xero → Claude** is the cleanest live route today.

## What Tide does on its own

- **Free account**: Making Tax Digital for Income Tax for sole traders. Auto-categorises transactions, captures receipts, estimates tax and files quarterly updates and Self Assessment to HMRC. Not available if you're in the Construction Industry Scheme.
- **Tide Accounting** (about £13.99 + VAT a month): adds MTD VAT returns. Not available on the VAT Flat Rate Scheme.
- **Invoicing**: 3 free invoices a month, or Invoice Assistant (about £5.99 + VAT) for unlimited invoices, auto-chasing and payment matching.
- **Doesn't do**: Corporation Tax returns (CT600), Companies House annual accounts, or payroll filing.

## Do you need Xero?

| Your situation | Verdict |
|---|---|
| Sole trader, not VAT registered | **Probably not.** Tide's free MTD tools file your quarterly updates and tax return. Cash Money works from Tide CSV exports |
| Sole trader, VAT on standard scheme | **Probably not.** Tide Accounting covers VAT returns for less than most Xero plans |
| Sole trader, VAT Flat Rate Scheme | **Yes, or another MTD VAT tool.** Tide Accounting can't file Flat Rate returns |
| Limited company, you have an accountant | **Ask them.** Most UK accountants work in Xero. If they do, keep it: it's also Claude's best live link |
| Limited company, doing it yourself | **Keep Xero or similar.** You need proper double-entry books for annual accounts and the director's loan account. Tide doesn't produce year-end accounts, and HMRC's free CT600 filing closed on 31 March 2026, so you'll also need CT filing software |
| You want Claude to see live numbers without exporting files | **Xero is the only official route** right now |

The main reason to keep Xero alongside Tide is the official Claude connector. If you're a simple sole trader, you're likely paying for something Tide already gives you.

## Setting up

1. **Xero**: claude.ai → Settings → Connectors → browse → Xero → Connect, and sign in to Xero. Then in Xero, connect your Tide account under Bank accounts → Add bank account → Tide.
2. **Tide CSV**: Tide app or web → your account → Statements → choose dates → CSV. Drop the file into the chat.
3. **Stripe and Google Calendar**: claude.ai → Settings → Connectors.
4. **This skill**: see the README in this folder.
