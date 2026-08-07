---
name: module-jute-purchase
description: Cross-repo guide for the Jute Purchase module (jute PO, gate entry, material inspection/QC, material receipt MR, bill pass, jute issue, batch daily assign, batch plan master, reports). Use when asked which jute purchase page does what, which backend endpoints a page uses, or how jute approval workflows behave. Covers vowerp3ui pages and vowerp3be routers.
tools: Read, Grep, Glob
---

# Module Guide: Jute Purchase

Last verified: 2026-06-12

## 1. Module overview

Jute raw-material procurement: a **Jute PO** orders from a supplier (by mukam/growing region), the
vehicle arrives as a **Gate Entry IN**, passes **Material Inspection** (QC), exits as Gate Entry
OUT, the lot is finalised as a **Material Receipt (MR)** whose final approval also generates the
**Bill Pass** number and computes totals/194Q TDS; invoices are captured in Bill Pass. Consumption
side: **Jute Issue** (from MR stock, statuses 3/13) and **Batch Daily Assign** (assigns **Batch
Plan Master** recipes per day). Persona: **Portal** — tenant DB, tables prefixed `jute_`.

Critical model fact: the Gate Entry table was **merged into `jute_mr`** (2026-01) — Gate Entry,
Inspection, MR and Bill Pass all operate on the same `jute_mr` (+ `jute_mr_li`) row. Jute adds the
**status 13 Pending/Finalised** (terminal, external hand-off) to the global status set. The
`jute_mr` table carries production typos `frieght_paid` / `brokrage_rate` — never "fix" them.

## 2. Knowledge docs (read for detail)

- `docs/claude/modules/jute-purchase/_index.md` — chain diagram + file registry
- `docs/claude/modules/jute-purchase/pages-01-po-gate-mr.md`
- `docs/claude/modules/jute-purchase/pages-02-inspection-issue-billpass-batch-reports.md`
- `docs/claude/modules/jute-purchase/backend-map.md`
- `docs/claude/modules/jute-purchase/approval-flows.md`

(From vowerp3be, prepend `../vowerp3ui/`.)

## 3. Page quick-map

| FE page (src/app/dashboardportal/jutePurchase/...) | Purpose | BE prefix | Detailed in |
|---|---|---|---|
| `page.tsx` | Landing — currently a stub, no tiles | — | — |
| `po/page.tsx` + `po/createPO/` | Jute PO list / create-edit-view | `/jutePO` | pages-01 |
| `gateEntry/page.tsx` + `gateEntry/createGateEntry/` | Vehicle IN / Save / OUT (single-file page) | `/juteGateEntry` | pages-01 |
| `materialInspection/page.tsx` + `createMaterialInspection/` | Pending-QC list / merged gate-entry+QC form | `/juteMaterialInspection` (+ gate-entry endpoints) | pages-02 |
| `mr/page.tsx` + `mr/edit/` | MR list / edit + approval (module-level components/hooks) | `/juteMR` | pages-01 |
| `billPass/page.tsx` + `edit/` + `view/` | Bill pass list / Save-Complete / read-only | `/juteBillPass` | pages-02 |
| `juteIssue/page.tsx` + `juteIssue/edit/` | Daily issue sheet (grouped list / per-date editor) | `/juteIssue` | pages-02 |
| `batchPlan/page.tsx` + `batchPlan/edit/` | Batch daily assign (grouped list / per-date editor) | `/batchDailyAssign` | pages-02 |
| `batchPlanMst/page.tsx` + `createBatchPlan.tsx` | Batch plan master CRUD | `/batchPlanMaster` (masters router) | pages-02 |
| `reports/page.tsx` | Stock / batch-cost / MR-list + Tally download | `/juteReports` | pages-02 |

Services: `src/utils/juteReportService.ts` (reports) and `mr/utils/mrService.ts` (**local to the
mr page tree**); every other page calls `apiRoutesPortalMasters` constants directly.

## 4. Backend quick-map

| Router (../vowerp3be/src/juteProcurement/) | main.py prefix | Highlights |
|---|---|---|
| `jutePO.py` | `/api/jutePO` | open/approve/reject/cancel/reopen; no send-for-approval; reopen → Draft 21 |
| `juteGateEntry.py` | `/api/juteGateEntry` | Creates `jute_mr` (status 1, gate no. per branch+FY); OUT via `action:"OUT"`, gated by QC |
| `materialInspection.py` | `/api/juteMaterialInspection` | `complete_inspection` sets `qc_check = 1` |
| `mr.py` | `/api/juteMR` | open/pending(13)/approve/reject/cancel; final approve generates MR + bill-pass numbers, TDS |
| `juteAgentMap.py` | `/api/juteAgentMap` | Agent↔party map — FE page lives under `masters/juteAgentMap/` |
| `billPass.py` | `/api/juteBillPass` | `update_bill_pass/{jute_mr_id}` enforces MR status 3; `bill_pass_complete` flag |
| `issue.py` | `/api/juteIssue` | Daily sheet; bulk open/approve/reject (ids or branch+date) |
| `batchDailyAssign.py` | `/api/batchDailyAssign` | Daily sheet; bulk lifecycle; delete Draft only |
| `reports.py` | `/api/juteReports` | `/stock`, `/batch-cost`, `/mr-list`, `/tally-download` |

Registered in `../vowerp3be/src/main.py:175-183`; `../vowerp3be/src/masters/batchPlanMaster.py`
at `:150`.

## 5. Approval workflow summary

Statuses: 21 Draft → 1 Open → 20 Pending → 3 Approved / 4 Rejected / 6 Cancelled, **plus jute-only
13 Pending/Finalised** (MR terminal). **Multi-level** (shared `process_approval`, `menu_id`-driven,
no send-for-approval endpoint): Jute PO (`JutePOApprovalBar`), MR (`MRApprovalBar` +
`MRApprovalDialog` — final approval requires MR date, generates doc numbers + TDS).
**Simplified bulk** (21→1→3/4, inline buttons): Jute Issue, Batch Daily Assign.
**No lifecycle**: Gate Entry (gated by `out_time` + QC), Inspection, Bill Pass (Save/Complete).
State diagrams + endpoint tables: `docs/claude/modules/jute-purchase/approval-flows.md`.

## 6. Related docs & skills

- BE constants: `../vowerp3be/src/juteProcurement/constants.py` (statuses 3/13, `TDS_CAP_INR`)
- Migrations: `../vowerp3be/dbqueries/migrations/add_approval_level_to_jute_mr.sql`, `add_approval_level_to_jute_po.sql`
- General procurement chain (separate module): `module-procurement`
- Skills: `wire-api` (new endpoints), `add-approval-workflow` (lifecycle endpoints),
  `add-menu` (sidebar entries) — canonical in `../vowerp3be/.claude/skills/`

## 7. Maintenance

Last verified date is at the top of this file and each knowledge doc.

Drift signals — while answering, watch for: a referenced path that no longer exists; a page folder
under `jutePurchase/` not in the quick-map; an endpoint listed here that is absent from the router
(or vice versa); approval behavior in code contradicting the state diagrams.

When drift is detected: **flag the staleness in your answer and ask the user whether to update this
agent / the knowledge docs. Never silently self-edit.** On approval: update the affected part file
and quick-map row, then bump the Last verified stamps.
