# Jute Purchase Backend Map

Last verified: 2026-06-12

> Scope: every router in `../vowerp3be/src/juteProcurement/` with its `main.py` prefix and
> endpoints, plus the related masters router `batchPlanMaster.py`. All routes are Portal persona —
> `Depends(get_tenant_db)` + `get_current_user_with_refresh`. Registered in
> `../vowerp3be/src/main.py:175-183` (imports `:58-66`); `batchPlanMaster` at `:150`.

| Router file | Prefix | Endpoints |
|---|---|---|
| `jutePO.py` | `/api/jutePO` | GET `/get_jute_po_table`, `/download_po_table`, `/get_jute_po_by_id/{jute_po_id}`, `/get_jute_po_line_items/{jute_po_id}`, `/jute_po_create_setup`, `/get_suppliers_by_mukam/{mukam_id}`, `/get_parties_by_supplier/{supplier_id}`, `/get_qualities_by_item/{item_grp_id}`; POST `/jute_po_create`, `/open_jute_po/{id}`, `/approve_jute_po/{id}`, `/reject_jute_po/{id}`, `/cancel_draft_jute_po/{id}`, `/reopen_jute_po/{id}`; PUT `/jute_po_update/{id}` |
| `juteGateEntry.py` | `/api/juteGateEntry` | GET `/get_jute_gate_entry_table`, `/download_gate_entry_table`, `/get_jute_gate_entry_by_id/{jute_mr_id}`, `/jute_gate_entry_create_setup`, `/get_parties_by_supplier/{supplier_id}`, `/get_qualities_by_item/{item_grp_id}`, `/get_po_details/{po_id}`; POST `/jute_gate_entry_create`; PUT `/jute_gate_entry_update/{jute_mr_id}` (with `action: "OUT"` for vehicle out) |
| `materialInspection.py` | `/api/juteMaterialInspection` | GET `/get_inspection_table`, `/download_inspection_table`, `/get_inspection_by_id`, `/get_inspection_setup`, `/get_mr_line_item/{mr_li_id}`, `/get_qualities_by_item/{item_id}`; POST `/save_moisture_readings/{mr_li_id}`, `/complete_inspection` |
| `mr.py` | `/api/juteMR` | GET `/get_mr_table`, `/download_mr_table`, `/get_agent_options`, `/get_warehouse_options`, `/get_party_branches`, `/get_mr_by_id`; PUT `/update_mr/{mr_id}`, `/change_status/{mr_id}`; POST `/open_mr`, `/pending_mr`, `/approve_mr`, `/reject_mr`, `/cancel_mr` |
| `juteAgentMap.py` | `/api/juteAgentMap` | GET `/get_jute_agent_map_table`, `/jute_agent_map_create_setup`, `/get_party_branches_for_agent`, `/get_jute_agent_map_by_id/{agent_map_id}`; POST `/jute_agent_map_create`; DELETE `/jute_agent_map_delete/{agent_map_id}` — **FE page lives in the masters module** (`src/app/dashboardportal/masters/juteAgentMap/`) |
| `billPass.py` | `/api/juteBillPass` | GET `/get_bill_pass_list`, `/download_bill_pass_list`, `/get_bill_pass_by_id`, `/get_bill_pass_line_items`; PUT `/update_bill_pass/{bill_pass_id}` (path param is the `jute_mr_id`; enforces `jm.status_id = 3` in SQL) |
| `issue.py` | `/api/juteIssue` | GET `/get_issue_table` (grouped by date+branch), `/download_issue_table`, `/get_issue_by_id/{issue_id}`, `/get_issue_create_setup`, `/get_stock_outstanding`, `/get_issues_by_date`, `/get_max_issue_date`; POST `/create_issue` (Draft 21), `/open_issues`, `/approve_issues`, `/reject_issues` (bulk: explicit `issue_ids` OR `branch_id`+`issue_date`); PUT `/update_issue/{issue_id}` (Draft only); DELETE `/delete_issue/{issue_id}` (Draft only) |
| `batchDailyAssign.py` | `/api/batchDailyAssign` | GET `/get_assign_table` (grouped by date+branch), `/download_assign_table`, `/get_assigns_by_date`, `/get_assign_create_setup`, `/get_max_assign_date`; POST `/create_assign` (Draft 21), `/open_assigns`, `/approve_assigns`, `/reject_assigns` (bulk by ids via `_bulk_status_change`); DELETE `/delete_assign/{batch_daily_assign_id}` (Draft only) |
| `reports.py` | `/api/juteReports` | GET `/stock` (daily stock position), `/batch-cost` (planned vs actual issue), `/mr-list` (paginated approved/finalised MR headers), `/tally-download` (multi-sheet xlsx with 194Q TDS rows) |
| `../masters/batchPlanMaster.py` | `/api/batchPlanMaster` | GET `/get_batch_plan_table`, `/get_batch_plan_by_id/{batch_plan_id}`, `/batch_plan_create_setup`, `/batch_plan_edit_setup/{batch_plan_id}`, `/get_qualities_for_item/{item_grp_id}`; POST `/batch_plan_create`; PUT `/batch_plan_edit/{batch_plan_id}` — masters router, FE page in this module |

Shared SQL lives in `query.py` (transactions; the pending-QC list filters
`qc_check IS NULL OR qc_check = 0`) and `reportQueries.py` (reports); Excel helpers in
`_excel_utils.py`; document-number formatting in `formatters.py`
(`format_jute_mr_number`, `format_jute_bill_pass_number`). `constants.py` holds
`JUTE_MR_APPROVED_STATUSES = (3, 13)` and `TDS_CAP_INR = 5_000_000`.

Key tables: `jute_po` (+ `jute_po_li`, **no `co_id` column** — scoped via `branch_mst` join),
`jute_mr` (+ `jute_mr_li`) — the merged gate-entry/MR/bill-pass row carrying `qc_check`,
`branch_mr_no`, `bill_pass_no`, `bill_pass_complete` and the production typos `frieght_paid` /
`brokrage_rate` (never rename) — `jute_issue` (lines keyed to `jute_mr_li_id`),
`jute_batch_daily_assign`, `jute_batch_plan` (master), and the view `vw_jute_stock_outstanding`
(MR status 3/13). Approval levels added by migrations
`dbqueries/migrations/add_approval_level_to_jute_mr.sql` and `add_approval_level_to_jute_po.sql`.

FE constants with **no backend route**: `JUTE_MATERIAL_INSPECTION_UPDATE_LINE` →
`/juteMaterialInspection/update_line_item` (dead — verify before use). Backend endpoints with no
FE caller today: `get_suppliers_by_mukam`, `get_jute_po_line_items`, `get_agent_options`,
`change_status`, `get_inspection_by_id`, `get_inspection_setup`, inspection
`get_qualities_by_item`, `get_mr_line_item`, `save_moisture_readings`, `get_issue_by_id`,
`update_issue`, `get_batch_plan_by_id`.
