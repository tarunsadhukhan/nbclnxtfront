# Accounting Pages — Part 1: Vouchers & Masters

Last verified: 2026-06-12

> Scope: the Voucher transaction and the five accounting master pages. All are Portal pages —
> company scope comes from the sidebar (`useSidebarContext().selectedCompany.co_id`, or
> `useSelectedCompanyCoId()` on the voucher pages). Unlike procurement, this module has **no
> hooks/ / components/ subfolders** — each feature is a single `page.tsx` with inline RHF + Zod
> logic; shared types live in `types/accountingTypes.ts`. BE paths are relative to `../vowerp3be/`.

## Vouchers

The only transaction document: a balanced set of DR/CR lines against ledgers. Full approval
workflow (see `approval-flows.md`). Manual vouchers start as Draft 21; auto-posted vouchers
(from bill pass / sales invoice) arrive Approved 3 with `source_doc_type` set and are read-only
in the UI (info banner + `is_auto_posted` guard on every action).

- List page: `src/app/dashboardportal/accounting/vouchers/page.tsx` — `IndexWrapper` DataGrid via
  `fetchVouchers` (server-side pagination), status chips, "Auto" chip + source-doc chip per row;
  edit hidden for Approved/Cancelled/Closed/auto-posted rows. Note: the search box only resets
  pagination — it is not wired to any filter (drift).
- Create/edit/view: `vouchers/createVoucher/page.tsx` (single ~1.1k-line smart container; mode via
  `?mode=&voucher_id=`). Uses `TransactionWrapper` + the **shared**
  `src/components/ui/transaction/ApprovalActionsBar.tsx` directly (no module-specific bar).
- How it works:
  - RHF + Zod header schema (`voucher_date`, `type_category`, `branch_id`, `party_id`, `narration`, `ref_no`)
  - Line items: local `LineItemRow[]` state with trailing blank row (`createBlankLine`), ledger
    Autocomplete from `fetchLedgers({limit: 500})`, DR/CR toggle per line, live DR/CR totals +
    difference; save blocked unless balanced and every filled line has a ledger
  - Approval permissions computed inline from `status_id` + `is_auto_posted` (no approval hook)
  - `handleReverse` (Swal prompt → `reverseVoucher`) is defined but **not wired to any button** —
    `ApprovalActionsBar` has no reverse prop (drift)
- Service: `src/utils/accountingService.ts` (`fetchVouchers`, `fetchVoucherDetail`, `createVoucher`,
  `updateVoucher`, `openVoucher`, `cancelVoucher`, `sendForApproval`, `approveVoucher`,
  `rejectVoucher`, `reopenVoucher`, `reverseVoucher`, `settleBills`)
- Endpoints (BE `src/accounting/routers.py`, prefix `/accounting`):

| api.ts const | URL | Purpose |
|---|---|---|
| `ACC_VOUCHERS` | GET `/vouchers` | Paginated list (filters: branch, type, dates, party, source, status) |
| `ACC_VOUCHER_DETAIL` | GET `/vouchers/{id}` | Header + lines + gst + bill_refs |
| `ACC_VOUCHER_CREATE` | POST `/vouchers` | Create manual voucher (Draft 21) |
| `ACC_VOUCHERS` | PUT `/vouchers/{id}` | Update draft (21 only) |
| `ACC_VOUCHER_OPEN` ... `ACC_VOUCHER_REOPEN` | POST `/vouchers/{id}/open` ... `/reopen` | Lifecycle (see approval-flows.md) |
| `ACC_VOUCHER_REVERSE` | POST `/vouchers/{id}/reverse` | Reversal voucher (Approved only) |
| `ACC_VOUCHER_SETTLE_BILLS` | POST `/vouchers/{id}/settle_bills` | Settle bills (Approved Payment/Receipt only) |

- Known FE↔BE drift (verified against `voucher_service.py`):
  - **send-for-approval URL mismatch**: FE calls `/vouchers/{id}/send_approval`; BE route is
    `/vouchers/{id}/send_for_approval` → the FE action 404s.
  - **Create payload contract mismatch**: FE sends `acc_voucher_type_id` + lines `{debit, credit}`;
    BE `create_manual_voucher` reads `type_category` and lines `{debit_amount, credit_amount}`.
- Scope: `co_id` from `useSelectedCompanyCoId`; `branch_id` optional on header (branch options via
  `useBranchOptions`); list filters by `co_id` only.
- Approval: **yes** — full lifecycle + reverse + settle; see `approval-flows.md`.

## Voucher Types

Read-only catalog of system-defined voucher types (Payment, Receipt, Journal, Contra, Sales,
Purchase, Debit/Credit Note) seeded by `activate_company`.

- Page: `voucherTypes/page.tsx` — `IndexWrapper`, client-side search over name/code/category;
  no create/edit actions.
- Service: `fetchVoucherTypes(coId)` → `ACC_VOUCHER_TYPES` → GET `/accounting/voucher_types`
  (BE `routers.py`, query `get_voucher_types`).
- Scope: `co_id` from `useSidebarContext().selectedCompany`.
- Approval: no.

## Ledgers

Chart-of-accounts entries. `ledger_type` G/P/B/C (General/Party/Bank/Cash); Party ledgers link to
`party_mst` via `party_id` and drive auto-posting + outstanding reports. System ledgers
(`is_system_ledger = 1`) cannot be edited (enforced in the BE UPDATE's WHERE clause).

- Page: `ledgers/page.tsx` — `IndexWrapper` list with type filter + search, create/edit MUI Dialog
  (RHF + Zod `ledgerSchema`: name, code, group, type, party, credit days/limit, opening balance + D/C).
  Party Autocomplete via `fetchPartiesDropdown` (debounced search).
- Service: `fetchLedgers`, `createLedger`, `updateLedger`, `fetchLedgerGroups`, `fetchPartiesDropdown`.
- Endpoints:

| api.ts const | URL | Purpose |
|---|---|---|
| `ACC_LEDGERS` | GET `/accounting/ledgers` | List (filters: `ledger_type`, `search`; `group_id`/`page`/`limit` sent but ignored by BE) |
| `ACC_LEDGER_CREATE` | POST `/accounting/ledgers` | Create |
| `ACC_LEDGER_EDIT` | PUT `/accounting/ledgers/{id}` | Update (blocked for system ledgers) |
| `ACC_PARTIES_DROPDOWN` | GET `/accounting/parties_dropdown` | Party autocomplete |

- Note: the service request types (`CreateLedgerRequest` with `acc_group_id`/`gstin`/`pan`) drift
  from what the BE reads (`acc_ledger_group_id`, `gst_applicable`, `hsn_sac_code`); the page passes
  the group id as `acc_group_id`, which the BE ignores — group selection is not persisted (drift).
- Scope: `co_id` from sidebar context. Approval: no.

## Ledger Groups

Hierarchical account groups (nature A/L/I/E, parent group, normal balance). System groups are
seeded; user groups can be added under any parent.

- Page: `ledgerGroups/page.tsx` — `IndexWrapper` over the flattened tree (handles optional
  `children`), create Dialog (RHF + Zod: `group_name`, `parent_group_id`, `nature`). No edit.
- Service: `fetchLedgerGroups`, `createLedgerGroup` → `ACC_LEDGER_GROUPS` /
  `ACC_LEDGER_GROUP_CREATE` → GET/POST `/accounting/ledger_groups`.
- Scope: `co_id` from sidebar context. Approval: no.

## Financial Years

FY definitions with lock status. Creating a FY also creates 12 monthly `acc_period_lock` rows on
the BE; voucher dates must fall inside an active FY (resolved at voucher save).

- Page: `financialYears/page.tsx` — `IndexWrapper` list (label, start/end, active/locked chips),
  create Dialog (RHF + Zod with end-after-start refine). No edit/lock UI yet.
- Service: `fetchFinancialYears`, `createFinancialYear` → `ACC_FINANCIAL_YEARS` /
  `ACC_FINANCIAL_YEAR_CREATE` → GET/POST `/accounting/financial_years`.
- Scope: `co_id` from sidebar context. Approval: no.

## Account Determinations

The SAP-style GL mapping table that drives auto-posting: `doc_type` (PROC_BILLPASS /
JUTE_BILLPASS / SALES_INVOICE) × `line_type` (PURCHASE, CGST_INPUT, CREDITOR, ...) → ledger.
Rows are seeded by `activate_company`; the accountant only assigns/changes the ledger per rule.

- Page: `accountDeterminations/page.tsx` — `IndexWrapper` grid with inline per-row ledger Select
  (options from `fetchLedgers({limit: 500})`); each change PUTs immediately (one-rule payload).
- Service: `fetchAccountDeterminations`, `updateAccountDeterminations` →
  `ACC_ACCOUNT_DETERMINATIONS` / `ACC_ACCOUNT_DETERMINATIONS_UPDATE` →
  GET/PUT `/accounting/account_determinations`.
- Scope: `co_id` from sidebar context. Approval: no.

## Service functions with no page yet

`accountingService.ts` also exports `activateCompany` (POST `/activate_company`),
`importOpeningBills` (POST — FE const `/opening_bills/import` vs BE route `/opening_bills`,
mismatch), `settleBills`, and `fetchGstSummary` — none of these are called from any
`dashboardportal/accounting` page today.
