# Feasibility: UK retail paper-trading system (phase 1)

Phase-1 research notes, not financial or tax advice. Every line tagged **[VERIFY]** must be confirmed with the broker/HMRC/gov.uk before acting. Figures as understood at 2026-11-02.

Coin prices, shipping, FX rates and fee values in `config/v0001.json` are PLACEHOLDERS dated 2026-11-02 (PLAN_GAP-5). Refresh them from a dealer and the broker.

## 1. Capital and constraints

- Default fund: **£625** (expected range £500-£750). Top-up £100/month from Feb 2027. Goal: £15,000 in fund equity plus physical gold/silver counted at cost.
- 3% risk per trade = **£18.75** at £625. The daily loss cap is also £18.75 (3% of day-start equity).
- The separate £8k LISA is excluded entirely. The system has no concept of a LISA account and it never appears in any calculation, account or equity figure.
- Worked example: at £625, an index spread bet at the minimum stake (for example £0.50/pt on US 500 at ~6,000 pts is about £3,000 notional) is ~5x leverage. **Cash-only mode therefore cannot trade index spread bets at all**: the risk engine returns `SIZE_BELOW_MINIMUM`. [VERIFY min stakes with the provider]

## 2. Costs

- **IBKR UK**:
  - US shares fixed ~$0.005/share, min ~$1.00, max 1% of trade value; tiered ~$0.0035, min $0.35. [VERIFY]
  - UK shares ~0.05%, min ~£3 (fixed). [VERIFY]
  - FX conversion ~0.2 bp, min ~$2. [VERIFY]
  - Market-data subscription fees. [VERIFY]
- **Spread betting (IG/CMC/Pepperstone)**: costs are in the spread (US 500 ~0.4-1 pt, FTSE 100 ~1 pt in core hours), no commission, overnight funding ~benchmark +/-2.5-3% p.a. (Sleeve A never holds overnight). Guaranteed stops cost extra. [VERIFY]
- **Commission-free apps**: FX fee ~0.15%. [VERIFY]
- **Cost-drag example**: 3 round trips/day x 21 days x ~£1.60 = ~£100/month = ~16% of £625 per month.
- **Conclusion**: Sleeve A is uneconomic live at this size unless trades are rare and/or costs are spread-only.

## 3. UK tax (all [VERIFY])

- CGT annual exempt amount £3,000. Rates 18% / 24% (since 30 Oct 2024). [VERIFY]
- Spread-bet profits are generally exempt from CGT and income tax, and losses are not relievable. This is unless HMRC deems trading your main income. [VERIFY]
- CFDs: CGT applies, losses relievable, no stamp duty. [VERIFY]
- Stamp duty/SDRT 0.5% on purchases of UK shares. UK-domiciled ETFs are exempt, as are AIM shares. Irish shares 1%. US shares carry no UK stamp duty. [VERIFY]
- Dividend allowance £500. Dividend tax rates changed from April 2026 (believed 10.75% basic / 35.75% higher / 39.35% additional). [VERIFY]
- US dividend withholding 15% with a W-8BEN. [VERIFY]
- ISA: £20k overall allowance with the LISA's £4k inside it. A Stocks & Shares ISA removes CGT/dividend tax for Sleeve B (PLAN_GAP-3, the user's decision). Spread bets cannot go in an ISA. Cash-ISA limit changes are announced from April 2027. [VERIFY]
- LISA: a 25% government withdrawal charge on unauthorised withdrawals (about a 6.25% loss of your own money). Exempt cases: first home up to £450k, age 60+, terminal illness. Reform/replacement proposals have been discussed; check gov.uk. [VERIFY]
- Self Assessment reporting thresholds. [VERIFY]

## 4. Gold and silver (all [VERIFY])

- Britannias and Sovereigns are UK legal tender, so they are CGT-exempt. [VERIFY]
- Investment gold (coins at least 90% purity minted after 1800 and recognised legal tender, bars at least 995) is VAT-exempt under VAT Notice 701/21. [VERIFY]
- Silver coins and bars carry 20% VAT, except secondary-market stock sold under the margin scheme at some dealers. [VERIFY]
- Non-legal-tender coins (for example Krugerrand) and gold ETCs fall under CGT. [VERIFY]
- Dealer buy/sell spreads of 3-10% on small coins. [VERIFY]
- **Sweep threshold rule**: all-in cost = (price + shipping) x (1 + VAT). The sweep is *recommended* when eligible profit reaches `multiple` (default 2x) the all-in cost. Worked example: silver £40 + £5 shipping = £45, x 1.20 VAT = **£54 all-in**, so the threshold is **£108**. Each acknowledged sweep consumes its threshold of profit. The system only ever recommends; a human buys the coin.
- A gold Britannia is likely unreachable at this fund size. Coin prices in config are PLACEHOLDERS (PLAN_GAP-5).

## 5. Comparison: IBKR UK (margin/cash) vs spread betting

| Row | IBKR UK | Spread betting |
|---|---|---|
| Tax treatment | CGT on gains; stamp duty on UK shares [VERIFY] | Generally no CGT/income tax; losses not relievable [VERIFY] |
| Minimum position size | 1 share (fractional on some US stocks/ETFs) [VERIFY] | Provider minimum stake, e.g. £0.50/pt [VERIFY min stakes] |
| Fractional shares | Available on selected instruments [VERIFY] | n/a (stake per point) |
| Leverage | Reg-T-style margin on IBKR [VERIFY] | FCA retail caps: 30:1 major FX, 20:1 major indices/gold, 10:1 other commodities/silver, 5:1 individual shares; 50% margin close-out; negative balance protection [VERIFY] |
| Shorting | Margin accounts, borrow availability [VERIFY] | Built in |
| Overnight cost | Margin interest on borrowed funds [VERIFY] | Funding ~benchmark +/-2.5-3% p.a. [VERIFY] |
| Pattern-day-trader rule | FINRA $25k PDT applies to IBKR margin accounts trading US securities; FINRA rule changes have been proposed/approved [VERIFY current status]. Cash accounts avoid PDT but must use settled funds (US T+1; UK moving to T+1 in Oct 2027 [VERIFY]) | Not applicable |
| ISA eligibility | Shares/ETFs can be held in an ISA wrapper where offered [VERIFY] | Cannot go in an ISA |
| Counterparty model | Exchange-routed | Market maker (provider is counterparty) |
| Gap risk and guaranteed stops | Stops can gap; no guaranteed stops [VERIFY] | Guaranteed stops available for a premium [VERIFY] |
| API availability (phase 2) | IBKR API [VERIFY] | Provider-dependent [VERIFY] |
| Retail loss disclosure | n/a | Providers state ~60-80% of retail CFD accounts lose money [VERIFY current %] |
| US ETF access | PRIIPs/CCI transition affects UK retail access to US-domiciled ETFs [VERIFY] (PLAN_GAP-4) | Index products via the provider |

The Sleeve A paper symbol `SPY` is a placeholder (PLAN_GAP-4). Use an eligible instrument before any live phase. The live broker choice is left to the user (PLAN_GAP-2).

## 6. Realistic return ranges

- Global equities long-run nominal ~5-8%/yr with drawdowns of 20-50% possible. UK equity income yield ~3.5-4.5%. [VERIFY]
- Retail day trading: studies (for example Barber, Lee, Liu & Odean on Taiwan; Chague, De-Losso & Giovannetti on Brazil, where ~97% of persistent day traders lost money) and broker disclosures show most lose after costs. [VERIFY]
- **Planning assumption**: Sleeve A expected return 0% (or negative) after costs. 5-8% for Sleeve B is optimistic but plausible. 12% is the stretch case.

## 7. Forecast

Years to reach £15,000 (months in brackets), from `trading.forecast.forecast_table()`:

| Start | 0% | 5% | 8% | 12% |
|---|---|---|---|---|
| £500 | 12.1y (145) | 9.4y (113) | 8.4y (101) | 7.4y (89) |
| £625 | 12.0y (144) | 9.3y (112) | 8.3y (100) | 7.3y (88) |
| £750 | 11.9y (143) | 9.2y (110) | 8.2y (98) | 7.2y (87) |

- Method: effective-annual rate compounded monthly (`r_m = (1+a)^(1/12) - 1`), £100 credited at month end. Month 1 is Feb 2027, so 144 months is about Jan 2039.
- Idle Nov 2026-Jan 2027 growth is ignored.
- Nominal terms: £15k in ~2039 is about £11k in today's money at 2.5% inflation.
- Key insight: contributions supply ~£14k of the £15k. Moving from 0% to 12% saves ~4.7 years. Raising the top-up moves the date more than any strategy.

## 8. [VERIFY] checklist

- [ ] IBKR US share commission (fixed and tiered), minimums and caps: IBKR commissions page.
- [ ] IBKR UK share commission and minimum: IBKR commissions page.
- [ ] IBKR FX conversion fee and minimum: IBKR FX page.
- [ ] Market-data subscription fees: IBKR market data page.
- [ ] Spread-bet minimum stakes and spreads (US 500, FTSE 100): provider (IG/CMC/Pepperstone) product pages.
- [ ] Spread-bet overnight funding rates and guaranteed-stop cost: provider fee page.
- [ ] Commission-free app FX fee: app fee schedule.
- [ ] CGT exempt amount and rates: gov.uk "Capital Gains Tax rates and allowances".
- [ ] Spread-bet tax treatment: HMRC Capital Gains Manual / Business Income Manual (spread betting).
- [ ] CFD tax treatment: HMRC guidance on CFDs.
- [ ] Stamp duty/SDRT rates and ETF/AIM exemptions: gov.uk "Stamp Duty on shares".
- [ ] Dividend allowance and post-April-2026 dividend rates: gov.uk "Tax on dividends".
- [ ] US dividend withholding and W-8BEN: IBKR tax forms page / IRS.
- [ ] ISA allowance, LISA inside the £20k, Cash-ISA changes from April 2027: gov.uk ISA pages.
- [ ] LISA withdrawal charge, exemptions, reform proposals: gov.uk Lifetime ISA.
- [ ] Self Assessment reporting thresholds: gov.uk Self Assessment.
- [ ] Britannia/Sovereign CGT exemption: HMRC Capital Gains Manual (legal tender).
- [ ] Investment gold VAT exemption: HMRC VAT Notice 701/21.
- [ ] Silver VAT and margin-scheme dealers: HMRC VAT Notice 718 / dealer terms.
- [ ] Non-legal-tender coins and gold ETC tax: HMRC guidance.
- [ ] Dealer buy/sell spreads on small coins: dealer websites.
- [ ] FCA leverage caps, 50% close-out, negative balance protection: FCA product intervention rules.
- [ ] FINRA PDT rule status: FINRA rules/notices; IBKR day-trading page.
- [ ] US T+1 and UK T+1 (Oct 2027) settlement: SEC/FCA/LSE announcements.
- [ ] Retail CFD loss percentages: provider risk warnings.
- [ ] Equity return and dividend-yield ranges, day-trader studies: cited papers and index provider factsheets.
- [ ] US ETF access under PRIIPs/CCI: FCA and broker notices.
