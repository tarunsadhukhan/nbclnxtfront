---
name: module-procurement
description: Cross-repo guide for the Procurement module (indent, purchase order, inward/GRN, material inspection, store receipt, bill pass, DR/CR note, reports). Use when asked which procurement page does what, which backend endpoints a page uses, or how procurement approval workflows behave. Covers vowerp3ui pages and vowerp3be routers.
tools: Read, Grep, Glob
---

# Module Guide: Procurement

Last verified: 2026-06-12

## 1. Module overview

The general procurement chain: a department raises an **Indent** for items, an approved indent
becomes a **Purchase Order** to a supplier, goods arrive as an **Inward** (GRN), pass **Material
Inspection**, get valued in a **Store Receipt (SR)**, and are settled in **Bill Pass** (net of any
**Debit/Credit Notes**). Persona: **Portal** — tenant DB, tables prefixed `proc_`, everything scoped
by `co_id`/`branch_id` from the sidebar (`SidebarContext`). Jute raw-material procurement is a
separate module (`module-jute-purchase`).

Indent and PO carry the full approval workflow (21→1→20→3/4/6, multi-level); SR and DR/CR use a
simplified Draft→Open→Approved/Rejected flow; Inward is gated by inspection, and Bill Pass by
`sr_status = 3`.

## 2. Knowledge docs (read for detail)

- `docs/claude/modules/procurement/_index.md` — chain diagram + file registry
- `docs/claude/modules/procurement/pages-01-indent-po-inward.md`
- `docs/claude/modules/procurement/pages-02-inspection-sr-billpass-reports.md`
- `docs/claude/modules/procurement/backend-map.md`
- `docs/claude/modules/procurement/approval-flows.md`

(From vowerp3be, prepend `../vowerp3ui/`.)

## 3. Page quick-map

| FE page (src/app/dashboardportal/procurement/...) | Purpose | BE prefix | Detailed in |
|---|---|---|---|
| `page.tsx` | Module landing tiles | — | — |
| `indent/page.tsx` + `indent/createIndent/` | Indent list / create-edit-view | `/procurementIndent` | pages-01 |
| `purchaseOrder/page.tsx` + `purchaseOrder/createPO/` | PO list / create-edit-view (GST, charges, clone) | `/procurementPO` | pages-01 |
| `inward/page.tsx` + `inward/createInward/` | GRN list / create-edit-view | `/procurementInward` | pages-01 |
| `materialInspection/page.tsx` + `materialInspection/inspect/` | Inspection pending list / inspect | `/materialInspection` | pages-02 |
| `sr/page.tsx` + `sr/createSR/` | SR pending list / create-edit | `/storesReceipt` | pages-02 |
| `billPass/page.tsx` + `billPass/[id]/` + `billPass/edit/` | Bill pass list / detail / edit | `/billPass` | pages-02 |
| `drcrNote/page.tsx` + `drcrNote/view/` | DR/CR note list+create / view | `/drcrNote` | pages-02 |
| `reports/page.tsx` | Itemwise + register reports | `/procurementReports` | pages-02 |

Services: `src/utils/indentService.ts`, `poService.ts`, `inwardService.ts`, `billPassService.ts`;
inspection/SR/DR-CR/reports call `apiRoutesPortalMasters` constants directly from their pages.

## 4. Backend quick-map

| Router (../vowerp3be/src/procurement/) | main.py prefix | Highlights |
|---|---|---|
| `indent.py` | `/api/procurementIndent` | Full approval set incl. `approve_indent_with_value` |
| `po.py` | `/api/procurementPO` | Full approval set + `clone_po` |
| `inward.py` | `/api/procurementInward` | create/update/cancel blocked after inspection |
| `material_inspection.py` | `/api/materialInspection` | `complete_inspection` sets `inspection_check` |
| `sr.py` | `/api/storesReceipt` | save/open/approve/reject on `proc_inward.sr_status` |
| `drcr_note.py` | `/api/drcrNote` | create/open/approve/reject; needs approved SR |
| `billpass.py` | `/api/billPass` | update enforces `sr_status = 3` |
| `reports.py` | `/api/procurementReports` | indent/po/sr itemwise + downloads |

## 5. Approval workflow summary

Statuses: 21 Draft → 1 Open → 20 Pending → 3 Approved / 4 Rejected / 6 Cancelled (reopen from 4/6).
**Full** (multi-level via approval hierarchy): Indent (`IndentApprovalBar`), PO (`POApprovalBar`).
**Simplified** (no Pending 20): SR (`SRApprovalBar`), DR/CR (inline actions).
State diagrams + endpoint tables: `docs/claude/modules/procurement/approval-flows.md`.

## 6. Related docs & skills

- Deep-dive: `../vowerp3be/docs/procurement-inward-to-bill-pass-approval-flows.md`
- GST: `../vowerp3be/docs/GST_PROCUREMENT.md`, `docs/GST_PROCUREMENT_FRONTEND.md`
- Skills: `wire-api` (new endpoints), `add-approval-workflow` (lifecycle endpoints),
  `add-menu` (sidebar entries) — canonical in `../vowerp3be/.claude/skills/`

## 7. Maintenance

Last verified date is at the top of this file and each knowledge doc.

Drift signals — while answering, watch for: a referenced path that no longer exists; a page folder
under `procurement/` not in the quick-map; an endpoint listed here that is absent from the router
(or vice versa); approval behavior in code contradicting the state diagrams.

When drift is detected: **flag the staleness in your answer and ask the user whether to update this
agent / the knowledge docs. Never silently self-edit.** On approval: update the affected part file
and quick-map row, then bump the Last verified stamps.
