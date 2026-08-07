# Jute Purchase Pages — Part 2: Material Inspection, Jute Issue, Bill Pass, Batch Daily Assign, Batch Plan Master, Reports

Last verified: 2026-06-12

> Scope: QC, consumption-side documents and reports. These features call `apiRoutesPortalMasters`
> constants directly from their pages (no `src/utils/` service except `juteReportService.ts`).
> BE paths are relative to `../vowerp3be/`.

## Material Inspection (QC)

Quality gate on a Gate Entry / MR. Completing inspection sets `qc_check = 1` on `jute_mr` and
writes QC data (actual quality, weights, moisture, claims) into `jute_mr_li`. QC completion
unblocks the Gate Entry OUT action.

- List page: `materialInspection/page.tsx` — `JUTE_MATERIAL_INSPECTION_TABLE`
  (`/get_inspection_table` returns entries pending QC: `qc_check IS NULL OR 0`), xlsx via
  `JUTE_MATERIAL_INSPECTION_DOWNLOAD`.
- Inspect page: `materialInspection/createMaterialInspection/page.tsx` — a **merged gate-entry +
  QC form** (its doc comment even reads `@page JuteGateEntryCreatePage`): in create mode it can
  post `JUTE_GATE_ENTRY_CREATE` (IN); in edit mode it loads via `JUTE_GATE_ENTRY_BY_ID` and the
  gate-entry cascades (`JUTE_GATE_ENTRY_PARTIES_BY_SUPPLIER`, `JUTE_GATE_ENTRY_QUALITIES_BY_ITEM`,
  `JUTE_GATE_ENTRY_PO_DETAILS`, `JUTE_GATE_ENTRY_CREATE_SETUP`), then finalises with **QC
  Complete** → `JUTE_MATERIAL_INSPECTION_COMPLETE`.
- How it works:
  - hooks/: `useMaterialInspectionFormState`, `useMaterialInspectionFormSchemas`,
    `useMaterialInspectionLineItems`, `useMaterialInspectionLineItemColumns`
  - components/: `MaterialInspectionHeaderForm`, `MoistureReadingDialog` (collects per-line
    moisture readings **locally** — no API call), `index.ts`
  - types/: `MaterialInspectionTypes.ts`; utils/: `MaterialInspectionCalculations.ts`,
    `MaterialInspectionConstants.ts`, `MaterialInspectionFactories.ts`,
    `MaterialInspectionMappers.ts`
- Endpoints (BE `src/juteProcurement/materialInspection.py`, prefix `/juteMaterialInspection`):

| api.ts const | URL | Purpose |
|---|---|---|
| `JUTE_MATERIAL_INSPECTION_TABLE` / `JUTE_MATERIAL_INSPECTION_DOWNLOAD` | `/get_inspection_table`, `/download_inspection_table` | Pending-QC list + xlsx |
| `JUTE_MATERIAL_INSPECTION_COMPLETE` | `/complete_inspection` | Set `qc_check = 1`, update header + line QC data |
| (unused) `JUTE_MATERIAL_INSPECTION_BY_ID` / `_SETUP` / `_QUALITIES` / `_MR_LINE` / `_SAVE_MOISTURE` | `/get_inspection_by_id`, `/get_inspection_setup`, `/get_qualities_by_item/{item_id}`, `/get_mr_line_item/{mr_li_id}`, `/save_moisture_readings/{mr_li_id}` | Endpoints exist; no FE caller today |
| **dead** `JUTE_MATERIAL_INSPECTION_UPDATE_LINE` | `/update_line_item` | **No such backend route** — dead constant in `api.ts` |

- Approval: **no** — single QC Complete action; it is the gate for Gate Entry OUT.

## Jute Issue

Issues jute raw material out of MR stock (lines reference `jute_mr_li_id`); stock comes from
`vw_jute_stock_outstanding` (MR `status_id IN (3, 13)`). Built as a **daily sheet**, not a
header/detail document: lines are created/deleted individually for a branch + date, then bulk
opened/approved/rejected. Simplified lifecycle (see `approval-flows.md §Jute Issue`).

- List page: `juteIssue/page.tsx` — `JUTE_ISSUE_TABLE` returns rows **aggregated by date +
  branch** with a representative status; xlsx via `JUTE_ISSUE_DOWNLOAD`.
- Edit (daily sheet): `juteIssue/edit/page.tsx` — loads lines via `JUTE_ISSUES_BY_DATE`
  (+ `JUTE_ISSUE_MAX_DATE` to default the date), adds lines (`JUTE_ISSUE_CREATE`, Draft 21),
  deletes Draft lines (`JUTE_ISSUE_DELETE/{id}`), bulk lifecycle via `JUTE_ISSUE_OPEN` /
  `JUTE_ISSUE_APPROVE` / `JUTE_ISSUE_REJECT` (inline buttons — no approval bar component).
- How it works: hooks/ `useJuteIssueSetup` (`JUTE_ISSUE_CREATE_SETUP`), `useStockOutstanding`
  (`JUTE_ISSUE_STOCK_OUTSTANDING`), `useJuteIssueLineItems`; types/ `juteIssueTypes.ts`;
  utils/ `juteIssueConstants.ts`, `juteIssueFactories.ts`, `juteIssueMappers.ts`.
- BE `src/juteProcurement/issue.py`, prefix `/juteIssue`. Backend also exposes
  `/get_issue_by_id/{issue_id}` and `PUT /update_issue/{issue_id}` (Draft-only) — their constants
  `JUTE_ISSUE_BY_ID` / `JUTE_ISSUE_UPDATE` exist in `api.ts` but have no FE caller today.

## Bill Pass

Invoice capture against an **approved MR** (`status_id = 3` enforced in SQL). Keyed by
`jute_mr_id` — bill pass number/date were already generated at MR final approval. Save updates
invoice + financial fields (including the production-typo column `frieght_paid`); **Complete**
sets `bill_pass_complete = 1` (requires invoice no/date/amount) after which the row is view-only.
No status lifecycle of its own.

- List page: `billPass/page.tsx` — `JUTE_BILL_PASS_TABLE`, xlsx via `JUTE_BILL_PASS_DOWNLOAD`.
- Edit: `billPass/edit/page.tsx` — Save vs Complete (both PUT `JUTE_BILL_PASS_UPDATE/{jute_mr_id}`);
  attachments via `AttachmentUploader` (`invoice_upload`, `challan_upload`).
- View (read-only): `billPass/view/page.tsx` — header via `JUTE_BILL_PASS_BY_ID`, lines via
  `JUTE_BILL_PASS_LINE_ITEMS`.
- BE `src/juteProcurement/billPass.py`, prefix `/juteBillPass`. Plain pages — no hooks/ folders.

## Batch Daily Assign (`batchPlan/`)

Assigns a Batch Plan (quality recipe) to each yarn quality for a branch + date — the planning
side that the batch-cost report compares against actual issue. Same daily-sheet pattern and
simplified lifecycle as Jute Issue (see `approval-flows.md §Batch Daily Assign`).

- List page: `batchPlan/page.tsx` — `BATCH_DAILY_ASSIGN_TABLE` (grouped by date + branch), xlsx
  via `BATCH_DAILY_ASSIGN_DOWNLOAD`.
- Edit (daily sheet): `batchPlan/edit/page.tsx` — `BATCH_DAILY_ASSIGN_BY_DATE` +
  `BATCH_DAILY_ASSIGN_MAX_DATE`, add (`BATCH_DAILY_ASSIGN_CREATE`, Draft 21), delete Draft lines
  (`BATCH_DAILY_ASSIGN_DELETE/{id}`), bulk `BATCH_DAILY_ASSIGN_OPEN` / `_APPROVE` / `_REJECT`.
- How it works: hooks/ `useBatchAssignSetup` (`BATCH_DAILY_ASSIGN_CREATE_SETUP`); types/
  `batchAssignTypes.ts`; utils/ `batchAssignConstants.ts`, `batchAssignFactories.ts`,
  `batchAssignMappers.ts`.
- BE `src/juteProcurement/batchDailyAssign.py`, prefix `/batchDailyAssign`. Table:
  `jute_batch_daily_assign` (branch, date, `jute_yarn_id`, `batch_plan_id`, status).

## Batch Plan Master (`batchPlanMst/`)

Master CRUD for batch plans — named recipes of jute qualities with percentages. The FE page lives
in this module, but the **backend router is a masters router**:
`../vowerp3be/src/masters/batchPlanMaster.py`, prefix `/api/batchPlanMaster`
(`main.py:150`).

- List page: `batchPlanMst/page.tsx` — `BATCH_PLAN_TABLE` via `IndexWrapper`.
- Create/edit: `batchPlanMst/createBatchPlan.tsx` (a component file, not a route folder) —
  `BATCH_PLAN_CREATE_SETUP` / `BATCH_PLAN_EDIT_SETUP/{id}`, quality cascade
  `BATCH_PLAN_QUALITIES_FOR_ITEM/{item_grp_id}`, save via `BATCH_PLAN_CREATE` /
  `BATCH_PLAN_EDIT/{id}`. Uses `SidebarContext` directly for company/branch.
- `BATCH_PLAN_BY_ID` (`/get_batch_plan_by_id/{id}`) exists in `api.ts` + backend but has no FE
  caller today. No approval workflow (master data).

## Reports

- Page: `reports/page.tsx` — tabs rendered from `_components/`: `JuteStockReport` (daily stock
  position), `BatchCostReport` (planned vs actual issue per yarn quality), `MrListReport`
  (approved/finalised MR headers + **Tally download** button → multi-sheet xlsx with 194Q TDS
  rows). Hooks: `reports/hooks/useJuteStockReport.ts`, `useBatchCostReport.ts`,
  `useMrListReport.ts`; types in `reports/types/reportTypes.ts`. Uses `useSidebarContext`
  directly for `selectedCompany`.
- Service: `src/utils/juteReportService.ts` — `fetchJuteStockReport`, `fetchBatchCostReport`,
  `fetchMrListReport`, `fetchJuteTallyDownload`.
- Endpoints (BE `src/juteProcurement/reports.py`, prefix `/juteReports`):

| api.ts const | URL | Purpose |
|---|---|---|
| `JUTE_REPORT_STOCK` | `/stock` | Opening/receipt/issue/closing + MTD per item |
| `JUTE_REPORT_BATCH_COST` | `/batch-cost` | Planned vs actual issue per quality |
| `JUTE_REPORT_MR_LIST` | `/mr-list` | Paginated MR header list (status 3/13) |
| `JUTE_REPORT_TALLY_DOWNLOAD` | `/tally-download` | Multi-sheet xlsx (Purchase + Check List) |

- Related (sales module): `SALES_REPORT_JUTE_TALLY_DOWNLOAD` / `SALES_REPORT_JUTE_MR_SUMMARY` hit
  `/salesReports/...` — documented in `module-sales`, not here.
- Module landing page: `jutePurchase/page.tsx` is a **stub** (`<div>Jute Purchase</div>`) — no
  navigation tiles, unlike procurement.
