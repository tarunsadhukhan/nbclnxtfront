---
name: module-jute-production
description: Cross-repo guide for the Jute Production module (spreader production/issue/roll stock, drawing meter entry, spinning/doff backend, production masters, roll stock reports) AND Jute SQC (morrah weight QC, r-08-01). Use when asked which juteProduction or juteSQC page does what, which backend endpoints a page uses, or how the spreader→drawing→spinning chain works. Covers vowerp3ui pages and vowerp3be routers.
tools: Read, Grep, Glob
---

# Module Guide: Jute Production (+ Jute SQC)

Last verified: 2026-06-13

## 1. Module overview

Jute Production tracks the mill floor chain **Spreader → Drawing → Spinning**. Spreader machines
turn jute items into rolls stored in **bins**; entries within a 4-hour window share an
`entry_id_grp` (`GROUP_WINDOW_HOURS = 4`), and rolls must mature per `item_maturity_mst`
(default 48 hrs) before being **issued** to breaker/inter. Drawing records daily spellwise
open/close meter readings per machine (odometer wrap +10000, efficiency vs `const_meter` =
meters per 8-hr shift at 100%). Spinning (doff entry, frame map, actual count, daily roll-up)
exists **backend-only — no frontend page yet**. Jute SQC's morrah weight check (report r-08-01)
records 10 weight samples per batch and buckets them LT (<1200 g) / OK (1200–1400 g) / HY (>1400 g).

Persona: **Portal** — tenant DB. Tables: `spreader_bin_mst`, `item_maturity_mst`,
`spreader_machine_attr`, `spreader_prod_entry`, `spreader_roll_issue`,
`jute_prod_drawing_machine_attr`, `jute_prod_drawing_entry`, `jute_prod_spinning_*`,
`daily_doff_tbl`, `daily_doff_frames_winding`, `yarn_quality_param`, `trolly_mst`,
`jute_sqc_morrah_wt`. Spell codes A1/A2/B1/B2/C (`spell_mst`).

**No approval workflow** — no open/send-for-approval/approve/reject endpoints anywhere in the
module. Lifecycle is direct CRUD with **soft delete** (`active = 0`); spreader entries are
stamped `status_id = 1` on insert. One guard rule: a spreader entry cannot be deleted if its
`entry_id_grp` already has active issues.

Scope: pages take `co_id` from `useSelectedCompanyCoId` and resolve `branch_id` from
`useSidebarContext().selectedBranches` (1 branch → auto-used; several → in-page picker).
Exception: `juteSQC/r-08-01` parses `co_id`/`branch_id` from localStorage sidebar state itself.
Jute raw-material buying is a separate module (`module-jute-purchase`).

**Winding (design only, not implemented yet):** a fourth production stage —
Spreader → Drawing → Spinning → **Winding** — is documented but not built. Operators weigh wound
trollies (Doff), record spindle open/close leftover (Jugar), and tag quality + spindle count;
daily production = `Σ(doff) − opening_jugar + closing_jugar` (kg→bundles `/14` when UOM='B'). See
the knowledge docs below before answering winding questions.

## Knowledge docs

| File | Covers |
|------|--------|
| `docs/claude/modules/jute-production/_index.md` | Winding scope, document chain, cross-repo registry |
| `docs/claude/modules/jute-production/pages-01-winding-production.md` | Proposed Winding page (Doff/Jugar/Quality tabs) + masters, data points, client formulas |
| `docs/claude/modules/jute-production/backend-map.md` | Proposed winding routers + legacy→vowerp3 endpoint mapping |
| `../vowerp3be/docs/winding-production-design.md` | **Primary** — full legacy logic, data points, formulas, target design |

## 2. Page quick-map

| FE page (src/app/dashboardportal/...) | Purpose | BE prefix | Detailed in |
|---|---|---|---|
| `juteProduction/page.tsx` | Landing tiles (7 — no spinning tile) | — | — |
| `juteProduction/spreader/page.tsx` | Tabs: Production / Issue / Stock View | `/spreaderProd` | inline below |
| `juteProduction/drawing/page.tsx` | Daily spellwise drawing meter entry | `/drawingProd` | inline below |
| `juteProduction/rollStockReports/page.tsx` | Tabs: Maturity Time / Spreader Production | `/juteProductionReports` | inline below |
| `juteProduction/masters/bins/page.tsx` | Spreader bin master | `/spreaderMasters` | inline below |
| `juteProduction/masters/itemMaturity/page.tsx` | Maturity hours per jute item | `/spreaderMasters` | inline below |
| `juteProduction/masters/spreaderMachineWt/page.tsx` | Roll weight per spreader machine | `/spreaderMasters` | inline below |
| `juteProduction/masters/drawingMachineAttr/page.tsx` | Const meter + wrap limit per drawing machine | `/drawingMasters` | inline below |
| `juteSQC/page.tsx` | Placeholder landing (`<div>Jute SQC</div>`) | — | — |
| `juteSQC/r-08-01/page.tsx` | Morrah Weight QC list + create + view | `/juteSQC` | inline below |

No service files in `src/utils/` — all pages/hooks call `fetchWithCookie` with
`apiRoutesPortalMasters` constants directly (`src/utils/api.ts` lines ~408–411, ~743–779).

## 3. Page catalog

### Spreader Production — `juteProduction/spreader/`
- Three tabs in one `page.tsx`: **Production** (entry form + day grid), **Issue** (issue form +
  day grid), **Stock View** (roll stock by bin/group).
- `hooks/`: `useSpreaderSetup` (machines/items/bins/spells), `useEntriesByDate`,
  `useIssueSetup` + `useIssuesByDate` (same file; also `issue_available_weights` per group),
  `useBinState` (live bin occupancy for the form), `useRollStock` (parallel stock + quality summary).
- `_components/`: `ProductionEntryForm`, `IssueEntryForm`, `DailyEntriesGrid` (delete),
  `DailyIssuesGrid` (delete), `BinStateBanner`, `RollStockTable`.
- `types/spreaderTypes.ts`, `utils/shift.ts` (todayISO, spells), `utils/maturityColor.ts`.

| api.ts const | URL | vowerp3be file |
|---|---|---|
| `SPREADER_ENTRY_CREATE_SETUP` | `/spreaderProd/entry_create_setup` | `src/juteProduction/spreader_entry.py` |
| `SPREADER_ENTRY_BIN_STATE` | `/spreaderProd/entry_bin_state` | `spreader_entry.py` |
| `SPREADER_ENTRY_CREATE` | `/spreaderProd/entry_create` | `spreader_entry.py` |
| `SPREADER_ENTRIES_BY_DATE` | `/spreaderProd/entries_by_date` | `spreader_entry.py` |
| `SPREADER_ENTRY_DELETE` | `/spreaderProd/entry_delete/{id}` | `spreader_entry.py` |
| `SPREADER_ISSUE_CREATE_SETUP` | `/spreaderProd/issue_create_setup` | `spreader_issue.py` |
| `SPREADER_ISSUE_AVAILABLE_WEIGHTS` | `/spreaderProd/issue_available_weights` | `spreader_issue.py` |
| `SPREADER_ISSUE_CREATE` | `/spreaderProd/issue_create` | `spreader_issue.py` |
| `SPREADER_ISSUES_BY_DATE` | `/spreaderProd/issues_by_date` | `spreader_issue.py` |
| `SPREADER_ISSUE_DELETE` | `/spreaderProd/issue_delete/{id}` | `spreader_issue.py` |
| `SPREADER_ROLL_STOCK` | `/spreaderProd/roll_stock` | `spreader_stock.py` |
| `SPREADER_ROLL_STOCK_QUALITY_SUMMARY` | `/spreaderProd/roll_stock_quality_summary` | `spreader_stock.py` |

- Note: `SPREADER_ENTRY_EDIT` / `SPREADER_ISSUE_EDIT` constants exist in `api.ts` and the BE
  `PUT entry_edit/{id}` / `issue_edit/{id}` endpoints exist, but **no FE call site uses them yet**.

### Drawing Production — `juteProduction/drawing/`
- Single-day list + create/edit form. `hooks/`: `useDrawingSetup` (machines + spells),
  `useDrawingEntriesByDate`, `useMachinePrevState` (prefills open meter from previous close).
- `_components/`: `DrawingEntryForm` (POST create, PUT edit), `DailyDrawingGrid` (delete).
- `utils/drawingCalc.ts` mirrors BE `services/drawing_rules.py` (diff meter with +10000 wrap,
  efficiency vs const_meter over `wrk_hours`). BE rejects duplicate machine+date+spell rows and
  negative diff meters.

| api.ts const | URL | vowerp3be file |
|---|---|---|
| `DRAWING_ENTRY_CREATE_SETUP` | `/drawingProd/entry_create_setup` | `src/juteProduction/drawing_entry.py` |
| `DRAWING_MACHINE_PREV_STATE` | `/drawingProd/machine_prev_state` | `drawing_entry.py` |
| `DRAWING_ENTRY_CREATE` | `/drawingProd/entry_create` | `drawing_entry.py` |
| `DRAWING_ENTRIES_BY_DATE` | `/drawingProd/entries_by_date` | `drawing_entry.py` |
| `DRAWING_ENTRY_EDIT` | `/drawingProd/entry_edit/{id}` | `drawing_entry.py` |
| `DRAWING_ENTRY_DELETE` | `/drawingProd/entry_delete/{id}` | `drawing_entry.py` |

### Roll Stock Reports — `juteProduction/rollStockReports/`
- Two tabs: **Maturity Time** (`useMaturityReport`, by issue date → `MaturityReportTable`) and
  **Spreader Production** (`useProductionSummary` with machine/item/shift multi-filters →
  `PivotTable`). Hooks in `hooks/useReports.ts`; `types/reportTypes.ts`. Uses `co_id` only —
  no branch picker on this page.

| api.ts const | URL | vowerp3be file |
|---|---|---|
| `JUTE_PROD_MATURITY_REPORT` | `/juteProductionReports/maturity_time_report` | `src/juteProduction/reports.py` |
| `JUTE_PROD_SPREADER_SUMMARY` | `/juteProductionReports/spreader_production_summary` | `reports.py` |

### Production masters — `juteProduction/masters/*` (single-file list+create+edit pages, no delete)
| Page | api.ts consts | URLs (`/spreaderMasters` unless noted) | vowerp3be file |
|---|---|---|---|
| `bins/page.tsx` | `SPREADER_BIN_{LIST,CREATE,EDIT}` | `bin_list`, `bin_create`, `bin_edit/{id}` | `src/juteProduction/spreader_masters.py` |
| `itemMaturity/page.tsx` | `ITEM_MATURITY_{CREATE_SETUP,LIST,CREATE,EDIT}` | `item_maturity_*` | `spreader_masters.py` |
| `spreaderMachineWt/page.tsx` | `SPREADER_MACHINE_WT_{CREATE_SETUP,LIST,CREATE,EDIT}` | `spreader_machine_wt_*` | `spreader_masters.py` |
| `drawingMachineAttr/page.tsx` | `DRAWING_MACHINE_ATTR_{LIST,CREATE,EDIT}` | `/drawingMasters/drawing_machine_attr_*` | `drawing_masters.py` |

### Morrah Weight QC — `juteSQC/r-08-01/`
- Single-file page (no hooks/ folder): MUI DataGrid list with server pagination, create dialog
  (10 weight inputs in grams + inspector/dept/jute-quality/trolley/MR%), view dialog with
  computed stats. Stats (avg/max/min/range/CV%, LT/OK/HY counts) are computed **server-side**
  in `compute_morrah_stats`; FE duplicates the 1200/1400/10 constants for display.
- `co_id`/`branch_id` read from localStorage sidebar state via in-page `getCoId`/`getBranchId`.
- In-folder spec: `juteSQC/r-08-01/documentation.md` (field list + calculation handoff doc).

| api.ts const | URL | vowerp3be file |
|---|---|---|
| `MORRAH_WT_CREATE_SETUP` | `/juteSQC/get_morrah_wt_create_setup` | `src/juteSQC/morrahWeight.py` |
| `MORRAH_WT_CREATE` | `/juteSQC/create_morrah_wt` | `morrahWeight.py` |
| `MORRAH_WT_TABLE` | `/juteSQC/get_morrah_wt_table` | `morrahWeight.py` |
| `MORRAH_WT_BY_ID` | `/juteSQC/get_morrah_wt_by_id` | `morrahWeight.py` |

## 4. Backend quick-map

All registered in `../vowerp3be/src/main.py` (lines ~186–197). Shared helpers:
`src/juteProduction/constants.py`, `query.py` / `drawing_query.py` / `spinning_query.py` /
`reportQueries.py`, business rules in `src/juteProduction/services/`
(`spreader_rules.py`, `drawing_rules.py`, `spinning_rules.py`, `shift.py`).

| Router (../vowerp3be/src/...) | main.py prefix | Highlights |
|---|---|---|
| `juteProduction/spreader_entry.py` | `/api/spreaderProd` | entry CRUD; 4-hr `entry_id_grp` reuse + bin state via `services/spreader_rules.py`; delete blocked if group has issues |
| `juteProduction/spreader_issue.py` | `/api/spreaderProd` | issue CRUD + `issue_available_weights` per group |
| `juteProduction/spreader_stock.py` | `/api/spreaderProd` | `roll_stock`, `roll_stock_quality_summary` (maturity vs `DEFAULT_MATURITY_HOURS`) |
| `juteProduction/spreader_masters.py` | `/api/spreaderMasters` | bin / item_maturity / spreader_machine_wt list-create-edit (+ setups) |
| `juteProduction/drawing_entry.py` | `/api/drawingProd` | meter entry CRUD, `machine_prev_state`, duplicate + negative-diff guards |
| `juteProduction/drawing_masters.py` | `/api/drawingMasters` | `drawing_machine_attr_list/create/edit/{attr_id}` |
| `juteProduction/spinning_entry.py` | `/api/spinningProd` | **no frontend page yet** — see list below |
| `juteProduction/spinning_masters.py` | `/api/spinningMasters` | **no frontend page yet** — see list below |
| `juteProduction/reports.py` | `/api/juteProductionReports` | `maturity_time_report`, `spreader_production_summary` (shift bucketing via `services/shift.py`) |
| `juteSQC/morrahWeight.py` | `/api/juteSQC` | morrah weight setup/create/table/by_id; stats + LT/OK/HY bucketing in `compute_morrah_stats` |

### Spinning endpoints (backend only — no FE page or api.ts constants yet)

`spinning_entry.py` (`/api/spinningProd`), four stages per its docstring — doff entry
(`daily_doff_tbl`), frame map (`daily_doff_frames_winding`, `spg_wdg='S'`), actual count
(`jute_prod_spinning_act_count`), daily roll-up (`jute_prod_spinning_daily`):
- GET `doff_entry_create_setup`, GET `doff_machine_prev_state`, POST `doff_entry_create`,
  GET `doff_entries_by_date`, PUT `doff_entry_edit/{entry_id}`, DELETE `doff_entry_delete/{entry_id}`,
  POST `doff_dedup_run`
- GET `frame_map_get`, POST `frame_map_save`, POST `frame_map_mapped`
- GET `act_count_get`, POST `act_count_save`
- GET `spinning_daily_setup`, POST `spinning_daily_save`, GET `spinning_daily_by_date`

`spinning_masters.py` (`/api/spinningMasters`):
- GET `spinning_machine_attr_list`, POST `spinning_machine_attr_create`, PUT `spinning_machine_attr_edit/{attr_id}`
- GET `trolly_list`, POST `trolly_create`, PUT `trolly_edit/{trolly_id}`, DELETE `trolly_delete/{trolly_id}`
- GET `yarn_quality_param_list`, POST `yarn_quality_param_create`, PUT `yarn_quality_param_edit/{param_id}`,
  DELETE `yarn_quality_param_delete/{param_id}`

## 5. Approval workflow summary

None. No transaction in this module implements open/send-for-approval/approve/reject/reopen.
All writes are immediate CRUD with soft delete (`active = 0`). Do not add lifecycle endpoints
here without an explicit requirement.

## 6. Related docs & skills

- In-folder spec: `src/app/dashboardportal/juteSQC/r-08-01/documentation.md` (morrah QC handoff)
- BE constants & rules: `../vowerp3be/src/juteProduction/constants.py`,
  `../vowerp3be/src/juteProduction/services/`
- ORM schema: `../vowerp3be/src/juteProduction/models.py`, `spinning_models.py`,
  `../vowerp3be/src/models/jute.py` (`JuteSqcMorrahWt`)
- Skills: `wire-api` (new endpoints), `add-menu` (sidebar entries) — canonical in
  `../vowerp3be/.claude/skills/`
- Sibling module: `module-jute-purchase` (jute MR / raw-material buying)

## 7. Maintenance

Last verified date is at the top of this file.

Drift signals — while answering, watch for:
- a referenced file path that no longer exists
- a page folder under `juteProduction/` or `juteSQC/` not in the quick-map
- an endpoint listed here that is absent from the backend router (or vice versa)
- a frontend page appearing for spinning (`/spinningProd` / `/spinningMasters`) — the
  "no frontend page yet" notes above would then be stale
- any approval/lifecycle endpoint appearing in these routers (this guide says there are none)

When drift is detected: **flag the staleness in your answer and ask the user whether to update
this agent. Never silently self-edit.** On approval: update the affected catalog entry and
quick-map row, then bump the Last verified stamp.
