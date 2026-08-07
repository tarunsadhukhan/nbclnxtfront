# Accounting Pages — Part 2: Reports

Last verified: 2026-06-12

> Scope: the eight read-only report pages under `src/app/dashboardportal/accounting/reports/`.
> All follow one pattern: company from `useSidebarContext().selectedCompany`, filter inputs
> (dates / branch / entity), a single `accountingService.ts` fetch, client-side totals and CSV
> export where present. Every report is computed live from `acc_voucher_line` — no stored balances.
> BE: `../vowerp3be/src/accounting/routers.py` (handlers) + `report_query.py` (SQL).

## Common mechanics

- No hooks/ or _components/ folders — each report is a single `page.tsx`.
- Filters are local state; fetch fires when required filters are set (most need `from_date` + `to_date`).
- All endpoints are GET under `/accounting/reports/*`, require `co_id`, accept optional `branch_id`.
- Route constants: `apiRoutesPortalMasters.ACC_REPORT_*` in `src/utils/api.ts`.

## Report catalog

| Page (`reports/...`) | Service fn | api.ts const | URL (`/accounting` prefix) | Required params | Notes |
|---|---|---|---|---|---|
| `trialBalance/page.tsx` | `fetchTrialBalance` | `ACC_REPORT_TRIAL_BALANCE` | `/reports/trial_balance` | `from_date`, `to_date` | Ledger-wise DR/CR + closing; client totals; CSV export |
| `profitLoss/page.tsx` | `fetchProfitLoss` | `ACC_REPORT_PROFIT_LOSS` | `/reports/profit_loss` | `from_date`, `to_date` | Page adapts flat rows into income/expense sections |
| `balanceSheet/page.tsx` | `fetchBalanceSheet` | `ACC_REPORT_BALANCE_SHEET` | `/reports/balance_sheet` | `from_date`, `to_date` | **Drift:** page sends `as_on_date` only — BE 400s without `from_date`/`to_date` |
| `ledgerReport/page.tsx` | `fetchLedgerReport` (+ `fetchLedgers` for the picker) | `ACC_REPORT_LEDGER` | `/reports/ledger_report` | `ledger_id`, `from_date`, `to_date` | Statement of one ledger with running balance |
| `dayBook/page.tsx` | `fetchDayBook` (+ `fetchVoucherTypes` filter) | `ACC_REPORT_DAY_BOOK` | `/reports/day_book` | `from_date`, `to_date` | Optional `voucher_type_id` filter |
| `cashBook/page.tsx` | `fetchCashBook` | `ACC_REPORT_CASH_BOOK` | `/reports/cash_book` | `from_date`, `to_date` | Bank/Cash ledger movements |
| `partyOutstanding/page.tsx` | `fetchPartyOutstanding` | `ACC_REPORT_PARTY_OUTSTANDING` | `/reports/party_outstanding` | — (dates not used) | Optional `party_type`; built from `acc_bill_ref` pending amounts |
| `ageingAnalysis/page.tsx` | `fetchAgeingAnalysis` | `ACC_REPORT_AGEING` | `/reports/ageing_analysis` | — | Bucketed outstanding (0-30/31-60/61-90/90+). FE sends `party_type`/`branch_id`, BE binds `co_id` only (ignored) |

- Scope: all pages pass `co_id` from the sidebar; `branch_id` is a free filter input where present.
- Approval: none — reports are read-only.

## Backend report with no FE page

`GET /accounting/reports/gst_summary` (BE `report_query.get_gst_summary`, FE const
`ACC_REPORT_GST_SUMMARY` + service fn `fetchGstSummary`) exists end-to-end but has **no page**
under `reports/` yet — the constant and service function are currently unused.
