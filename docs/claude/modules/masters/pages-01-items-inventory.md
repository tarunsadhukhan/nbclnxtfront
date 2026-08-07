# Masters Pages — Part 1: Items, Inventory & Core Masters

Last verified: 2026-06-12

> Scope: itemGroupMaster, itemMaster, itemMake, warehouseMaster, partyMaster, projectMaster,
> costFactor, departmentMaster, subDepartmentMaster. All are Portal pages under
> `src/app/dashboardportal/masters/`; constants live in `apiRoutesPortalMasters` (`src/utils/api.ts`)
> and resolve to `../vowerp3be` routers. `co_id` comes from `localStorage` key
> `sidebar_selectedCompany` unless noted. No approval workflows.

### Item Group Master — `itemGroupMaster/`

Two-level item group hierarchy (group → subgroup) with an active toggle and a details dialog.
Files: `page.tsx` (DataGrid + `useSidebarContext().hasMenuAccess`), `CreateItemGroupPage.tsx`
(MUI Dialog form).

| Constants | URLs (`/itemMaster` prefix, BE `src/masters/items.py`) |
|---|---|
| `GET_ALL_ITEM_GRP`, `CREATE_ITEM_GRP_SETUP`, `CREATE_ITEM_GRP`, `UPDATE_ITEM_GRP_ACTIVE`, `ITEM_GROUP_DETAILS` | `/get_all_item_groups`, `/createItemGroupSetup`, `/createItemGroup`, `/updateItemGroupActive` (POST), `/itemGroupDetails` (POST) |

Note: `EDIT_ITEM_GRP` (`/itemMaster/editItemGroup`) exists in `api.ts` but has **no backend route**
and is not used by the page.

### Item Master — `itemMaster/` (COMPLEX)

The central item catalog (`item_mst`). Files: `page.tsx` (list), `createItem.tsx` (540-line
create/edit/view dialog), `UOMMappingTable.tsx` (alternate-UOM rows), `MinMaxMappingTable.tsx`
(per-branch min/max rows), `bulkCreateItem.tsx` + `BulkItemGrid.tsx` (grid bulk entry:
validate-then-create), `TestSelect.tsx` (dev scratch component). `createItem` accepts
`prefetchedSetup`/`prefetchedItem` props so edit/view mode reuses the parent's `ITEM_EDIT_SETUP`
response instead of refetching.

| Constants | URLs (`/itemMaster` prefix, BE `src/masters/items.py`) |
|---|---|
| `GET_ITEM_TABLE`, `ITEM_CREATE_SETUP`, `ITEM_CREATE`, `ITEM_EDIT_SETUP`, `ITEM_EDIT`, `ITEM_BULK_VALIDATE`, `ITEM_BULK_CREATE` | `/get_item_table`, `/item_create_setup`, `/item_create`, `/item_edit_setup`, `/item_edit` (POST|PUT via `api_route`, items.py:601), `/item_bulk_validate`, `/item_bulk_create` |

Related: `src/utils/itemSearchService.ts` uses `ITEM_SEARCH` → `/itemMaster/item_search`
(consumed by other modules' pages, not this folder).

### Item Make Master — `itemMake/`

Item make/brand list. Files: `page.tsx`, `createItemMake.tsx`. Create-only — **no edit endpoint**.

| Constants | URLs (`/itemMaster` prefix, BE `src/masters/items.py`) |
|---|---|
| `ITEM_MAKE_TABLE`, `ITEM_MAKE_CREATE_SETUP`, `ITEM_MAKE_CREATE` | `/item_make_table`, `/item_make_create_setup`, `/item_make_create` |

### Warehouse Master — `warehouseMaster/`

Warehouse list per company. Files: `page.tsx`, `createWarehouse.tsx`. Create-only — backend has
just two endpoints.

| Constants | URLs (`/warehouseMaster` prefix, BE `src/masters/warehouse.py`) |
|---|---|
| `WAREHOUSE_TABLE`, `WAREHOUSE_CREATE` | `/get_warehouse_table`, `/warehouse_create` |

`WAREHOUSE_CREATE_SETUP` / `WAREHOUSE_EDIT_SETUP` / `WAREHOUSE_EDIT` constants exist in `api.ts`
but have **no backend routes** and are unused.

### Party Master — `partyMaster/` (COMPLEX)

Suppliers/customers (`party_mst` + `party_branch_mst`). Files: `page.tsx`, `createParty.tsx`
(327 lines — the form edits the party **and** its `party_branches` array together).

| Constants | URLs (`/partyMaster` prefix, BE `src/masters/party.py`) |
|---|---|
| `PARTY_TABLE`, `PARTY_CREATE_SETUP`, `PARTY_CREATE`, `PARTY_EDIT_SETUP`, `PARTY_EDIT` | `/get_party_table`, `/party_create_setup`, `/party_create`, `/party_edit_setup`, `/party_edit` (both POSTs) |

### Project Master — `projectMaster/`

Project list. Files: `page.tsx` + separate `CreateProjectPage.tsx`, `EditProjectPage.tsx`,
`ViewProjectPage.tsx` dialog components.

| Constants | URLs (`/projectMaster` prefix, BE `src/masters/projectMaster.py`) |
|---|---|
| `PROJECT_MASTER_TABLE`, `PROJECT_MASTER_CREATE_SETUP`, `PROJECT_MASTER_CREATE` | `/project_master_table`, `/project_master_create_setup`, `/project_master_create` |
| `PROJECT_MASTER_EDIT`, `PROJECT_MASTER_VIEW` | **DEAD ROUTES** — `/project_master_edit`, `/project_master_view` do not exist in the router; yet Edit/View dialogs call them |

### Cost Factor — `costFactor/`

Cost factor reference data. Files: `page.tsx`, `createCostFactor.tsx`. Note the BE file is named
`castFactor.py` (existing spelling — do not rename).

| Constants | URLs (`/costFactorMaster` prefix, BE `src/masters/castFactor.py`) |
|---|---|
| `COSTFACTOR_TABLE`, `COSTFACTOR_CREATE_SETUP`, `COSTFACTOR_CREATE`, `COSTFACTOR_EDIT_SETUP`, `COSTFACTOR_EDIT` | `/get_cost_factor_table`, `/cost_factor_create_setup`, `/cost_factor_create` (POST), `/cost_factor_edit_setup`, `/cost_factor_edit` (POST) |

### Department Master — `departmentMaster/`

Tenant-portal department list (distinct from Tenant Admin's dept management). Files: `page.tsx`,
`CreateDepartmentPage.tsx`. Branch-scoped (`branch_id` in payloads).

| Constants | URLs (`/deptMaster` prefix, BE `src/masters/departments.py`) |
|---|---|
| `DEPT_MASTER_TABLE`, `DEPT_MASTER_CREATE_SETUP`, `DEPT_MASTER_CREATE` | `/dept_master_table`, `/dept_master_create_setup`, `/dept_master_create` |
| `DEPT_MASTER_VIEW` | **DEAD ROUTE** — `/dept_master_view` does not exist in the router; the page calls it |

BE also exposes `/dept_master_validate_table` and `/dept_master_create_setup2` (not used by this
page).

### Subdepartment Master — `subDepartmentMaster/`

Subdepartments under a department; same router as departments. Files: `page.tsx`,
`CreateSubDepartmentPage.tsx`.

| Constants | URLs (`/deptMaster` prefix, BE `src/masters/departments.py`) |
|---|---|
| `SUBDEPT_MASTER_TABLE`, `SUBDEPT_MASTER_CREATE_SETUP`, `SUBDEPT_MASTER_CREATE` | `/subdept_master_table`, `/subdept_master_create_setup`, `/subdept_master_create` |
| `SUBDEPT_MASTER_VIEW` | **DEAD ROUTE** — `/subdept_master_view` does not exist in the router; the page calls it |
