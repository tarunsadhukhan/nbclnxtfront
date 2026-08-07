# Accounting Backend Map

Last verified: 2026-06-12

> Scope: the single accounting router in `../vowerp3be/src/accounting/` with its `main.py` prefix
> and every endpoint, plus the service-layer files (voucher lifecycle, auto-posting, seeding).
> All routes are Portal persona — `Depends(get_tenant_db)` + `get_current_user_with_refresh`.
> Registered once in `../vowerp3be/src/main.py:220` (import at line 85): prefix `/api/accounting`.

## Router → endpoints

One router file: `src/accounting/routers.py` (~1,225 lines, 34 endpoints).

| Section | Endpoints |
|---|---|
| Setup & masters | POST `/activate_company` (seeds full chart via `seed_data.activate_company`); GET/POST `/ledger_groups`; GET/POST `/ledgers`; PUT `/ledgers/{ledger_id}` (WHERE `is_system_ledger = 0`); GET `/parties_dropdown`; GET `/voucher_types`; GET `/financial_years`; POST `/financial_years` (also inserts 12 `acc_period_lock` rows); GET/PUT `/account_determinations` (bulk rules) |
| Vouchers | GET `/vouchers` (filters: branch, type, dates, party, source_doc_type, status; `LIMIT/OFFSET`); GET `/vouchers/{id}` (header + lines + gst + bill_refs); POST `/vouchers`; PUT `/vouchers/{id}`; POST `/vouchers/{id}/open`, `/cancel`, `/send_for_approval`, `/approve`, `/reject`, `/reopen`, `/reverse`, `/settle_bills` |
| Reports | GET `/reports/trial_balance`, `/reports/profit_loss`, `/reports/balance_sheet` (all require `from_date`+`to_date`); `/reports/ledger_report` (requires `ledger_id`); `/reports/day_book` (optional `voucher_type_id`); `/reports/cash_book`; `/reports/party_outstanding` (optional `party_type`); `/reports/ageing_analysis` (co_id only); `/reports/gst_summary` (optional `branch_gstin`) |
| Opening balance | POST `/opening_bills` (bulk insert into `acc_opening_bill`) |

## Supporting files

| File | Role |
|---|---|
| `voucher_service.py` | `validate_voucher` (DR/CR balance, period lock, bank/cash rule, duplicate check), `create_manual_voucher`, `update_draft_voucher`, all status transitions, `reverse_voucher`, `settle_bills`; every transition logged to `acc_voucher_approval_log` |
| `auto_post.py` | `auto_post_procurement_billpass(inward_id)`, `auto_post_jute_billpass(mr_id)`, `auto_post_sales_invoice(invoice_id)` — see below |
| `seed_data.py` | `activate_company` → seeds ledger groups, system ledgers, voucher types, party ledgers (from `party_mst`), account determinations, ageing slabs, financial year + period locks, voucher numbering |
| `query.py` | Masters + voucher list/detail/lines/gst/bill-refs SQL (`text()` with named binds) |
| `report_query.py` | One query fn per report (9 total, incl. `get_gst_summary`) |
| `models.py` | 15 `acc_*` ORM models — `acc_ledger_group`, `acc_ledger`, `acc_voucher_type`, `acc_financial_year`, `acc_period_lock`, `acc_account_determination`, `acc_voucher`, `acc_voucher_line`, `acc_voucher_gst`, `acc_bill_ref`, `acc_bill_settlement`, `acc_voucher_numbering`, `acc_voucher_approval_log`, `acc_voucher_warning`, `acc_opening_bill` |
| `constants.py` | `ACC_STATUS_IDS` (same 21/1/20/3/4/5/6 set), `VOUCHER_CATEGORIES`, `LEDGER_TYPES` (G/P/B/C), `SOURCE_DOC_TYPES`, `LINE_TYPES`, `BILL_REF_TYPES`, `WARNING_CODES`, `APPROVAL_MENU_MAP` |

## Auto-posting (which source documents post)

`auto_post.py` builds vouchers with `is_auto_posted = 1`, `status_id = 3` (born Approved), a
`source_doc_type`/`source_doc_id` link, a duplicate guard (one non-cancelled voucher per source
doc), and an `acc_bill_ref` row for outstanding tracking. GL accounts come from
`acc_account_determination` (`doc_type` × `line_type`); the party line uses the party-linked
ledger (`ledger_type = 'P'`).

| Source document | Function | Voucher | Entry shape |
|---|---|---|---|
| Procurement Bill Pass (`proc_inward` + `proc_gst`) | `auto_post_procurement_billpass` | PURCHASE | DR Purchase + CGST/SGST/IGST Input + round-off · CR party creditor (net) · bill_ref PAYABLE |
| Jute Bill Pass (`jute_mr`) | `auto_post_jute_billpass` | PURCHASE | DR Jute Purchase (+ claims/freight legs) · CR creditor (net_total) + TDS payable · bill_ref PAYABLE |
| Sales Invoice (`sales_invoice` + `sales_invoice_dtl_gst`) | `auto_post_sales_invoice` | SALES | DR party debtor (net) · CR Sales + GST Output + round-off · bill_ref RECEIVABLE |

**Not yet wired:** no caller exists in `src/procurement/billpass.py`, `src/juteProcurement/billPass.py`
or `src/sales/salesInvoice.py` — the design doc (§ integration table, `docs/accounting-module-design.md`
lines ~1785–1787) lists those calls as the planned integration points. `SOURCE_DOC_TYPES` also
reserves `PAYROLL`, `PAYROLL_DISBURSEMENT`, `STATUTORY_REMITTANCE` (payroll `LINE_TYPES` exist)
with no posting functions yet.

## Drift signals (verified 2026-06-12)

- **Two schema dialects inside the module.** `models.py`, `query.py` and `seed_data.py` use the
  ORM column set (`acc_financial_year_id`, `fy_start`/`fy_end`, `acc_period_lock`,
  `acc_voucher_line.dr_cr`/`amount`), while `voucher_service.py` and `auto_post.py` write raw SQL
  against a different set (`acc_fy_id`, `fy_start_date`/`fy_end_date`, `acc_financial_period`,
  `acc_approval_mst`, `acc_voucher_line.line_no`/`debit_amount`/`credit_amount`,
  `acc_voucher.voucher_seq`/`created_by`). Per repo rules `src/accounting/models.py` is the
  authoritative schema — treat the service-layer SQL as suspect until reconciled.
- FE `sendForApproval` hits `/send_approval` (BE route is `/send_for_approval`); FE opening-bills
  const points at `/opening_bills/import` (BE route is `/opening_bills`). See `pages-01`.
