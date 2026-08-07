# Accounting Module — Gap Analysis (frontend summary)

Last verified: 2026-07-12

> Full analysis + integration plan (backend + cross-module): `../vowerp3be/docs/accounting-gap-analysis-and-integration-plan.md`.
> This file summarizes the FE-relevant findings and the FE work implied by the plan. Findings verified against source, not docs.

## Headline

Accounting Phase 1 FE exists (15 pages: vouchers, 5 masters, 8 reports) but is currently **not usable end-to-end**: the voucher form and ledger dialog cannot save due to FE↔BE contract breaks, the backend voucher write path is broken against its own schema, and no business module posts anything into accounting. There is **no UI at all** for the three most-wanted outcomes: payments pending (AP), payments receivable (AR), and expense booking.

## FE↔BE contract breaks (each independently fatal)

| Break | Where | Symptom |
|---|---|---|
| Send-for-approval URL: FE `/send_approval` vs BE `/send_for_approval` | `src/utils/accountingService.ts:557` vs BE `routers.py:715` | 404 on send |
| Ledger create sends `acc_group_id`; BE requires `acc_ledger_group_id` | `src/app/dashboardportal/accounting/ledgers/page.tsx:284,299` | Every UI ledger create 400s; on edit the group silently never changes |
| Voucher payload: FE sends `acc_voucher_type_id` + line `{debit, credit}`; BE reads `type_category` + `{debit_amount, credit_amount}`; FE type-match uses `vt.voucher_class` which BE never returns → `acc_voucher_type_id: 0` | `vouchers/createVoucher/page.tsx:456-470` | Voucher create/update cannot work |
| Balance sheet page sends `as_on_date`; BE requires `from_date`+`to_date` | `accountingService.ts:678-695` | 400 on fetch |
| Opening-bills route: FE const `/opening_bills/import` vs BE `/opening_bills` | `api.ts:719` | 404 (function currently unused anyway) |
| FE maps `cost_center_id: line.branch_id` | `createVoucher/page.tsx:468` | Branch id written into cost-center field |
| Ageing page sends `party_type`/`branch_id`; BE binds `co_id` only | `reports/ageingAnalysis/page.tsx` | Filters silently ignored |
| `fetchVouchers` fakes pagination total (`total: vouchers.length`); list search box not wired to any filter; "Auto" chip inferred from `source_doc_type` instead of `is_auto_posted` | `accountingService.ts`, `vouchers/page.tsx:247` | Misleading list UX |
| Service-local types (`LedgerGroup.acc_group_id`, `VoucherType.voucher_class`, `Voucher.total_debit/total_credit`) diverge from real payloads; accurate types sit unused in `types/accountingTypes.ts` | `accountingService.ts` | Type safety is illusory — align service to `accountingTypes.ts` |

## Built-but-unwired on the FE

- `handleReverse` defined in `createVoucher/page.tsx:600-619` but no button exposes it (ApprovalActionsBar has no reverse action).
- Service functions with no page: `activateCompany`, `importOpeningBills`, `settleBills`, `fetchGstSummary`.
- No menu-seed migration exists for any accounting page (BE `dbqueries/` has none) — sidebar entries are unprovisioned.

## Missing FE surfaces (the actual product gaps)

1. **Payments Pending (AP) / Payments Receivable (AR) workspaces** — open bills by party with due-date buckets. Backend `acc_bill_ref` machinery exists but is empty (nothing posts) and its report SQL is broken; see BE plan §5.4.
2. **Make Payment / Record Receipt flows** — supplier/customer picker → open-bill allocation grid → payment mode/instrument (cheque/NEFT/UTR) → creates PAYMENT/RECEIPT voucher + settlements. Nothing exists.
3. **Expense Entry page** — simplified one-screen booking (date, paid-from, expense category → ledger mapping, amount, optional GST/party, attachment). Nothing exists; no expense-category master.
4. **Opening-bills import page** (service fn exists, no UI).
5. **Accounting settings page** — per-company posting mode (auto-approved / auto-draft / off per doc type), due-date rule, ageing slabs; plus company activation UI. Table doesn't exist yet (BE plan §5.3).
6. **GST summary report page** (BE endpoint + service fn exist).
7. **Dashboard widgets** — payables/receivables/overdue/cash-bank tiles for the portal landing page.

## Sequencing (FE view)

Do not build new FE surfaces until BE Phase 0 (schema-dialect repair) lands — the write path they'd call is broken. Then: fix the contract breaks above (Phase 0), settings + posting-queue admin (Phase 1), AP/AR workspaces + payment/receipt flows (Phase 2), expense entry (Phase 3). Full sequencing and open product decisions (jute `net_total` semantics, claims treatment, credit-terms precedence, Tally coexistence): BE plan §6–§7.

## Implementation status (2026-07-12, same branch)

Phase 0 + 1 are built: every contract break above is fixed, the voucher form/ledger dialog save against the rewritten BE, and there is a new **Accounting Settings** page (`accounting/settings/page.tsx`) with per-company posting modes (Off / Auto-Draft / Auto-Approved per doc type), due-date rule, TDS switch, and a posting-queue monitor with retry. BE now auto-posts procurement/jute bill passes, DR/CR notes and sales invoices per those settings (see BE plan §8). Still pending: menu rows for accounting pages (needs DB), Phase 2 AP/AR workspaces (Make Payment / Record Receipt, opening-bills import UI, dashboards), Phase 3 expense entry.
