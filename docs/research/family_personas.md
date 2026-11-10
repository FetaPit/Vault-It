# Family personas: the Ashworths (sourced UK averages)

Owner, 4 Nov 2026: "Pull 2 sets of new average data for 2 personas, name them but do not create their logins or populated logins yet." Part of the logged (not built) **Family plan view** item in `docs/QUEUE.md`.

Status: data only. No logins, no accounts, nothing seeded in the app. Every figure below comes from an official source listed at the end, or is arithmetic on those figures (the method is shown). Anything without a source is marked **not sourced** and left empty on purpose.

## The household

A two-parent UK household with a 20-year-old and a 17-year-old. In ONS terms this is **"three or more adults with children"** (the 20-year-old counts as an adult; the 17-year-old counts as a dependent child while in full-time education). ONS Family Spending gives this group its own column, so the household bills below are for exactly this family shape (1.22 million UK households, 4.8 people on average).

| Persona | Role | Login | In this file |
|---|---|---|---|
| **Paul Ashworth** | Parent, full-time employee | none | yes |
| **Claire Ashworth** | Parent, full-time employee | none | yes |
| 20-year-old | Adult child | none | not yet (named and sourced when the item is built) |
| 17-year-old | Dependent child | none | not yet |

Location assumed: England (council tax and the tax rules below are England's). Scotland would change the income tax figures.

## Paul Ashworth

| Field | Annual | Monthly | Source / method |
|---|---|---|---|
| Gross pay | £43,934 | £3,661.17 | ASHE 2026 provisional, Table 1.7a, median annual gross pay, male full-time |
| Workplace pension (employee 5%) | £1,884.70 | £157.06 | 5% of qualifying earnings (£43,934 minus £6,240) |
| Income tax | £5,895.86 | £491.32 | 20% of (gross minus pension minus £12,570) |
| National Insurance | £2,509.12 | £209.09 | 8% of (gross minus £12,570) |
| **Take-home pay** | **£33,644.32** | **£2,803.69** | gross minus pension, tax and NI |

## Claire Ashworth

| Field | Annual | Monthly | Source / method |
|---|---|---|---|
| Gross pay | £37,471.20 | £3,122.60 | ASHE 2026 provisional, Table 1.7a, median annual gross pay, female full-time |
| Workplace pension (employee 5%) | £1,561.56 | £130.13 | 5% of qualifying earnings (£37,471.20 minus £6,240) |
| Income tax | £4,667.93 | £388.99 | 20% of (gross minus pension minus £12,570) |
| National Insurance | £1,992.10 | £166.01 | 8% of (gross minus £12,570) |
| **Take-home pay** | **£29,249.62** | **£2,437.47** | gross minus pension, tax and NI |

Method notes: pension is taken as a net pay arrangement (it comes off pay before income tax, not before NI). Both earn under the higher-rate threshold, so only the 20% band applies. If Claire is modelled part-time instead, the ASHE 2026 female part-time median is £15,449.20 a year (same table); that is an owner choice, not made here.

## Household bills (the family plan)

Weekly ONS figures are turned into monthly ones as weekly x 52 / 12.

| Bill | Household monthly | Paul's share | Claire's share | Source | App category |
|---|---|---|---|---|---|
| Mortgage (interest + capital + protection) | £972.40 | £520.17 | £452.23 | Family Spending FYE 2025, Table 2.9, all mortgage holders, £224.40 a week | housing |
| Council tax | £199.33 | £106.63 | £92.70 | MHCLG 2026-27 average Band D, England, £2,392 a year | housing |
| Energy (gas and electricity) | £143.58 | £76.81 | £66.77 | Ofgem price cap 1 Oct to 31 Dec 2026, typical dual fuel Direct Debit, £1,723 a year | utilities |
| Water | £52.87 | £28.28 | £24.59 | Family Spending FYE 2025, Table 2.7, three or more adults with children, £12.20 a week | utilities |
| Food and soft drinks | £544.27 | £291.15 | £253.12 | Family Spending FYE 2025, Table A23, same column, £125.60 a week | groceries |
| Transport | £818.57 | £437.88 | £380.69 | Table A23, £188.90 a week | transport |
| Phone, broadband, post | £170.30 | £91.10 | £79.20 | Table A23 "Communication", £39.30 a week | phone |
| Recreation and culture | £477.97 | £255.68 | £222.29 | Table A23, £110.30 a week | fun |
| Restaurants and hotels | £328.47 | £175.71 | £152.76 | Table A23, £75.80 a week | dining |
| Household goods and services | £231.83 | £124.01 | £107.82 | Table A23, £53.50 a week | no exact match yet |
| Clothing and footwear | £141.27 | £75.57 | £65.70 | Table A23, £32.60 a week | no exact match yet |
| Miscellaneous goods and services (includes insurance and personal care) | £327.17 | £175.02 | £152.15 | Table A23, £75.50 a week | no exact match yet |
| Alcohol and tobacco | £77.57 | £41.50 | £36.07 | Table A23, £17.90 a week | no exact match yet |
| **Total** | **£4,485.60** | **£2,399.51** | **£2,086.09** | | |

**Who pays what:** ONS gives household totals, not who pays. Shares above split each bill by take-home pay (Paul 53.5%, Claire 46.5%). That split is a method, not a statistic; when the feature is built each bill can be named to one person instead.

**What is left each month:** Paul £404.18, Claire £351.38 (household £755.56) before any saving or debt payments. For comparison, the ONS total weekly spend for this household type is £1,026.10, which is £4,446.43 a month.

**Caveats:**
- The ONS column is an average across this household type, so it includes renters and owners, and the 20-year-old's own spending. The mortgage line uses the separate all-mortgage-holders average so the plan reads as an owner household.
- Family Spending is April 2024 to March 2025 prices; ASHE, council tax and the Ofgem cap are 2026 figures. They are not inflation-adjusted to one date.
- Health and education spending are suppressed in Table A23 for this group (ONS marks them ".."), so they are left out.

## Not sourced yet (left empty on purpose)

Savings balances, pension pots, ISAs, credit card or loan balances, student loans, cars, the house value and mortgage balance for this family, and the two children's figures. For reference only, the UK average house price was £273,000 in August 2026 (UK HPI, provisional). These need their own official sources (for example ONS Wealth and Assets Survey, Bank of England) before they go in.

## Sources

- ONS, Annual Survey of Hours and Earnings 2026 provisional, Table 1.7a annual pay (published 22 October 2026): https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/allemployeesashetable1
- ONS, Family spending in the UK: April 2024 to March 2025 (published 11 June 2026), workbook 2 Table A23 and workbook 5 Tables 2.7 and 2.9: https://www.ons.gov.uk/peoplepopulationandcommunity/personalandhouseholdfinances/expenditure/bulletins/familyspendingintheuk/latest
- MHCLG, Council Tax levels set by local authorities in England 2026 to 2027 (published 25 March 2026): https://www.gov.uk/government/statistics/council-tax-levels-set-by-local-authorities-in-england-2026-to-2027/council-tax-levels-set-by-local-authorities-in-england-2026-to-2027
- Ofgem energy price cap, 1 October to 31 December 2026, as reported by Uswitch: https://www.uswitch.com/gas-electricity/news/october-energy-price-cap-to-increase-by-four-percent/ (check against ofgem.gov.uk before use in the app)
- HMRC, Income Tax rates and allowances 2026 to 2027: https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past and thresholds held until April 2031: https://www.gov.uk/government/publications/maintaining-income-tax-and-equivalent-national-insurance-contributions-thresholds-until-5-april-2031
- DWP, automatic enrolment qualifying earnings band 2026/27 (£6,240 to £50,270): https://www.gov.uk/government/publications/review-of-the-automatic-enrolment-earnings-trigger-and-qualifying-earnings-band-for-202627
- HM Land Registry / ONS, UK House Price Index summary August 2026: https://www.gov.uk/government/statistics/uk-house-price-index-for-august-2026/uk-house-price-index-summary-august-2026

Not financial advice. Not regulated by the FCA.
