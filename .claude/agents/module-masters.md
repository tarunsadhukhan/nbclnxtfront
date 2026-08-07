---
name: module-masters
description: Cross-repo guide for the Masters module (item/item group, party, warehouse, project, cost factor, departments, jute/yarn/machine masters, HR and finance masters — 27 portal pages, ~23 backend routers). Use when asked which master page does what, which backend endpoints a master page uses, or where to add a new master. Covers vowerp3ui pages and vowerp3be routers.
tools: Read, Grep, Glob
---

# Module Guide: Masters

Last verified: 2026-06-12

## 1. Module overview

Masters hold the reference data the rest of the ERP transacts against: items, parties,
warehouses, projects, cost factors, departments, jute/yarn/machine masters, and HR/finance
masters. Persona: **Portal** — tenant DB, `*_mst` tables, scoped by `co_id` (read from the
sidebar's `localStorage` key `sidebar_selectedCompany`; newer HR pages use `useSidebarContext()`),
with `branch_id` where the master is branch-scoped.

**No approval workflows; masters are CRUD.** The standard shape is a list `page.tsx` (DataGrid)
plus a create/edit dialog component in the same folder — no `create*/page.tsx` sub-routes.
Folder names `mechineMaster` / `machinespgdetails` mirror production typos — never "fix" them.

## 2. Knowledge docs (read for detail)

- `docs/claude/modules/masters/_index.md` — overview, complexity tiers, file registry, dead routes
- `docs/claude/modules/masters/pages-01-items-inventory.md`
- `docs/claude/modules/masters/pages-02-jute-yarn-machines.md`
- `docs/claude/modules/masters/pages-03-hr-finance-misc.md`
- `docs/claude/modules/masters/backend-map.md`

(From vowerp3be, prepend `../vowerp3ui/`.)

## 3. Page quick-map (all 27 pages)

| FE page (src/app/dashboardportal/masters/...) | Purpose | BE prefix | Detailed in |
|---|---|---|---|
| `page.tsx` | Static landing heading (no API) | — | pages-03 |
| `itemGroupMaster/` | Item group/subgroup hierarchy + active toggle | `/itemMaster` | pages-01 |
| `itemMaster/` | Item catalog; UOM + min/max mapping, bulk create (COMPLEX) | `/itemMaster` | pages-01 |
| `itemMake/` | Item make/brand (create-only) | `/itemMaster` | pages-01 |
| `warehouseMaster/` | Warehouses (create-only) | `/warehouseMaster` | pages-01 |
| `partyMaster/` | Parties + party branches in one form (COMPLEX) | `/partyMaster` | pages-01 |
| `projectMaster/` | Projects (edit/view dialogs hit dead routes) | `/projectMaster` | pages-01 |
| `costFactor/` | Cost factors (BE file `castFactor.py`) | `/costFactorMaster` | pages-01 |
| `departmentMaster/` | Portal departments (`DEPT_MASTER_VIEW` is dead) | `/deptMaster` | pages-01 |
| `subDepartmentMaster/` | Subdepartments (`SUBDEPT_MASTER_VIEW` is dead) | `/deptMaster` | pages-01 |
| `juteQualityMaster/` | Jute qualities — **BE endpoints all deprecated** | `/juteQualityMaster` | pages-02 |
| `juteSupplierMaster/` | Jute suppliers | `/juteSupplierMaster` | pages-02 |
| `juteSupplierMap/` | Supplier → party mapping | `/juteSupplierMap` | pages-02 |
| `juteAgentMap/` | Agent → party-branch mapping (BE in `src/juteProcurement/`) | `/juteAgentMap` | pages-02 |
| `yarnMaster/` | Yarn definitions (large form) | `/yarnMaster` | pages-02 |
| `YarnTypeMaster/` | Yarn types (capital-Y folder) | `/yarnTypeMaster` | pages-02 |
| `yarnqualitymaster/` | Yarn quality specs; uses `yarnQualityService.ts` | `/yarnQualityMaster` | pages-02 |
| `mechineMaster/` | Machines (typo folder; Create/Edit/View dialogs) | `/mechMaster` | pages-02 |
| `machineTypeMaster/` | Machine types | `/machineTypeMaster` | pages-02 |
| `machinespgdetails/` | Spindle/SPG details; uses `machineSpgDetailsService.ts` | `/machineSpgDetailsMaster` | pages-02 |
| `designationMaster/` | HR designations (+ tests) | `/hrmsMasters` | pages-03 |
| `categoryMaster/` | Worker categories (+ tests) | `/hrmsMasters` | pages-03 |
| `shiftMaster/` | Shifts | `/hrmsMasters` | pages-03 |
| `spellMaster/` | Spells | `/hrmsMasters` | pages-03 |
| `contractorMaster/` | Contractors | `/contractorMaster` | pages-03 |
| `bankDetailsMaster/` | Bank account details | `/bankDetailsMaster` | pages-03 |
| `stdRateCard/` | Standard rate cards (BE in `src/bomcosting/` — see module-bom-costing) | `/stdRateCard` | pages-03 |

Constants: `apiRoutesPortalMasters` in `src/utils/api.ts`. Services exist only for
yarnqualitymaster, machinespgdetails, and item search (`itemSearchService.ts`).

## 4. Backend quick-map

| Router (../vowerp3be/src/...) | main.py prefix | Highlights |
|---|---|---|
| `masters/items.py` | `/api/itemMaster` | Items + item groups + item make + `/item_search`; `/item_edit` is POST\|PUT api_route |
| `masters/departments.py` | `/api/deptMaster` | Dept + subdept; no view endpoints (FE view constants dead) |
| `masters/party.py`, `warehouse.py`, `projectMaster.py`, `castFactor.py` | `/api/partyMaster`, `/api/warehouseMaster`, `/api/projectMaster`, `/api/costFactorMaster` | Party (edit via POST); warehouse + project are create-only |
| `masters/juteQuality.py`, `juteSupplier.py`, `juteSupplierMap.py` | `/api/juteQualityMaster`, `/api/juteSupplierMaster`, `/api/juteSupplierMap` | juteQuality is fully `deprecated=True` |
| `masters/yarnMaster.py`, `yarnTypeMaster.py`, `yarnQuality.py` | `/api/yarnMaster`, `/api/yarnTypeMaster`, `/api/yarnQualityMaster` | yarn_quality_edit is POST\|PUT api_route |
| `masters/mechineMaster.py`, `machineType.py`, `machineSpgDetails.py` | `/api/mechMaster`, `/api/machineTypeMaster`, `/api/machineSpgDetailsMaster` | mechMaster carries legacy mechine_type endpoints |
| `masters/designation.py`, `category.py`, `shift.py`, `spell.py` | all `/api/hrmsMasters` | Four routers, one shared prefix |
| `masters/contractor.py`, `bankDetails.py` | `/api/contractorMaster`, `/api/bankDetailsMaster` | Standard table/by-id/setup/create/edit |
| `masters/batchPlanMaster.py`, `itemBom.py` | `/api/batchPlanMaster`, `/api/itemBomMaster` | FE pages live OUTSIDE masters (jutePurchase / BomCosting) |
| `juteProcurement/juteAgentMap.py` | `/api/juteAgentMap` | Serves `masters/juteAgentMap/` page |
| `bomcosting/stdRateCard.py` | `/api/stdRateCard` | Serves `masters/stdRateCard/` page |

Full endpoint lists + dead-route table: `docs/claude/modules/masters/backend-map.md`.

## 5. Approval workflow

No approval workflows; masters are CRUD (list + create/edit dialogs, soft-delete via `active`).

## 6. Related docs & skills

- Skills (canonical in `../vowerp3be/.claude/skills/`): `new-master` (full-stack scaffold:
  DDL → ORM → CRUD → page → menu), `wire-api` (new endpoints), `add-menu` (sidebar entries)
- Related agent: `master-page` (`.claude/agents/master-page.md`) — scaffolds master CRUD pages
- BE conventions + production typos: `../vowerp3be/CLAUDE.md` (Database Schema Conventions)

## 7. Maintenance

Last verified date is at the top of this file and each knowledge doc.

Drift signals — while answering, watch for: a referenced path that no longer exists; a page
folder under `masters/` not in the quick-map; an endpoint listed here that is absent from the
backend router (or vice versa); a dead route in `backend-map.md` that has since been implemented.

When drift is detected: **flag the staleness in your answer and ask the user whether to update
this agent / the knowledge docs. Never silently self-edit.** On approval: update the affected
part file and quick-map row, then bump the Last verified stamps.
