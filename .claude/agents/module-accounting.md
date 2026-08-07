---
name: module-accounting
description: Cross-repo guide for the Accounting module (vouchers, ledger groups, ledgers, voucher types, financial years, account determinations, auto-posting from bill pass/sales invoice, financial reports). Use when asked which accounting page does what, which backend endpoints a page uses, or how the voucher approval workflow behaves. Covers vowerp3ui pages and vowerp3be routers.
tools: Read, Grep, Glob
---

# Module Guide: Accounting

Last verified: 2026-06-12

## 1. Module overview

Double-entry books of accounts per company: chart-of-accounts **masters** (ledger groups →
ledgers, voucher types, financial years, account determinations) feed the single transaction
document, the **Voucher** — a balanced set of DR/CR lines. Vouchers arrive two ways: **manual
entry** (createVoucher page, full approval workflow) and **auto-posting** (`auto_post.py` creates
born-Approved vouchers from Procurement Bill Pass, Jute Bill Pass and Sales Invoice — built but
not yet called from those modules). Eight **report** pages compute everything live from voucher
lines; balances are never stored. Persona: **Portal** — tenant DB, tables prefixed `acc_`, scoped
by `co_id` from the sidebar (`branch_id` is a filter/dimension, not a partition).

Voucher carries the full workflow (21→1→20→3/4/6, multi-level via `acc_approval_mst`), plus two
accounting-specific actions: **reverse** (Approved-only, creates a DR/CR-swapped voucher) and
**settle bills** (Approved Payment/Receipt only, against `acc_bill_ref`). Approved vouchers are
immutable. `POST /activate_company` seeds the entire default chart for a company.

## 2. Knowledge docs (read for detail)

- `docs/claude/modules/accounting/_index.md` — chain diagram + file registry
- `docs/claude/modules/accounting/pages-01-vouchers-masters.md`
- `docs/claude/modules/accounting/pages-02-reports.md`
- `docs/claude/modules/accounting/backend-map.md`
- `docs/claude/modules/accounting/approval-flows.md`

(From vowerp3be, prepend `../vowerp3ui/`.)

## 3. Page quick-map

| FE page (src/app/dashboardportal/accounting/...) | Purpose | BE route(s) | Detailed in |
|---|---|---|---|
| `vouchers/page.tsx` + `vouchers/createVoucher/` | Voucher list / create-edit-view (DR/CR lines, lifecycle) | `/accounting/vouchers*` | pages-01 |
| `voucherTypes/page.tsx` | Read-only voucher type catalog | `/accounting/voucher_types` | pages-01 |
| `ledgers/page.tsx` | Ledger CRUD (dialog), party-linked ledgers | `/accounting/ledgers*`, `/parties_dropdown` | pages-01 |
| `ledgerGroups/page.tsx` | Group hierarchy list + create | `/accounting/ledger_groups` | pages-01 |
| `financialYears/page.tsx` | FY list + create (12 period locks) | `/accounting/financial_years` | pages-01 |
| `accountDeterminations/page.tsx` | Inline ledger mapping per doc/line type | `/accounting/account_determinations` | pages-01 |
| `reports/{trialBalance,profitLoss,balanceSheet,ledgerReport,dayBook,cashBook,partyOutstanding,ageingAnalysis}/` | Eight read-only reports | `/accounting/reports/*` | pages-02 |

Layout note: no hooks/ or components/ subfolders anywhere in this module — single `page.tsx`
files with inline RHF + Zod; shared types in `types/accountingTypes.ts`; **all** calls go through
`src/utils/accountingService.ts` (constants `apiRoutesPortalMasters.ACC_*`).

## 4. Backend quick-map

| File (../vowerp3be/src/accounting/) | main.py prefix | Highlights |
|---|---|---|
| `routers.py` | `/api/accounting` (main.py:220) | All 34 endpoints: masters, voucher CRUD + lifecycle, 9 reports, `/activate_company`, `/opening_bills` |
| `voucher_service.py` | — | Validation (balance, period lock, bank/cash rule, dup check), lifecycle, reverse, settle_bills |
| `auto_post.py` | — | PROC_BILLPASS / JUTE_BILLPASS / SALES_INVOICE posting fns (no callers wired yet) |
| `seed_data.py` | — | `activate_company` seeds groups, ledgers, types, determinations, FY, numbering |
| `query.py` / `report_query.py` | — | Masters+voucher SQL / one fn per report |
| `models.py` / `constants.py` | — | 15 `acc_*` ORM models / status IDs, categories, line types, warnings |

## 5. Approval workflow summary

Statuses: 21 Draft → 1 Open → 20 Pending → 3 Approved / 4 Rejected / 6 Cancelled; **reopen sends
both 6 and 4 back to Open 1** (not to Draft). Multi-level via `acc_approval_mst` (module-specific,
not the dashboardadmin hierarchy). Extra actions: `/reverse` (3 → new voucher at 3),
`/settle_bills` (3, Payment/Receipt only). Auto-posted vouchers are born at 3 and read-only.
FE uses the shared `ApprovalActionsBar` directly. Known drift: FE send-for-approval URL mismatch
(`/send_approval` vs `/send_for_approval`) and an unwired reverse handler — see
`docs/claude/modules/accounting/approval-flows.md`.

## 6. Related docs & skills

- Deep-dive design spec: `../vowerp3be/docs/accounting-module-design.md` (architecture, schema,
  auto-posting entry shapes, phased plan — authoritative for intent; code may lag it)
- Skills: `wire-api` (new endpoints), `add-approval-workflow` (lifecycle endpoints),
  `add-menu` (sidebar entries) — canonical in `../vowerp3be/.claude/skills/`

## 7. Maintenance

Last verified date is at the top of this file and each knowledge doc.

Drift signals — while answering, watch for: a referenced path that no longer exists; a page folder
under `accounting/` not in the quick-map; an endpoint listed here that is absent from the router
(or vice versa); approval behavior in code contradicting the state diagram; the auto_post callers
getting wired into billpass/sales routers (update backend-map.md when that lands).

When drift is detected: **flag the staleness in your answer and ask the user whether to update this
agent / the knowledge docs. Never silently self-edit.** On approval: update the affected part file
and quick-map row, then bump the Last verified stamps.
