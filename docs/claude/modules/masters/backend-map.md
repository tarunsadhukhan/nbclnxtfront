# Masters Backend Map

Last verified: 2026-06-12

> Scope: every router consumed by the masters FE pages — all of `../vowerp3be/src/masters/` plus
> two cross-module routers (`juteProcurement/juteAgentMap.py`, `bomcosting/stdRateCard.py`).
> All routes are Portal persona — `Depends(get_tenant_db)` + `get_current_user_with_refresh`.
> Registered in `../vowerp3be/src/main.py:133-158` (masters), `:163` (stdRateCard), `:179`
> (juteAgentMap). Endpoints verified against router source (including `@router.api_route`).

## Routers serving masters FE pages

| Router file (`../vowerp3be/src/masters/`) | Prefix | Endpoints |
|---|---|---|
| `items.py` | `/api/itemMaster` | GET `/get_all_item_groups`, `/createItemGroupSetup`, `/get_item_table`, `/item_create_setup`, `/item_edit_setup`, `/item_make_table`, `/item_make_create_setup`, `/item_search`; POST `/createItemGroup`, `/updateItemGroupActive`, `/itemGroupDetails`, `/item_create`, `/item_bulk_validate`, `/item_bulk_create`, `/item_make_create`; POST\|PUT `/item_edit` (api_route, :601) |
| `departments.py` | `/api/deptMaster` | GET `/dept_master_table`, `/dept_master_validate_table`, `/dept_master_create_setup`, `/dept_master_create_setup2`, `/subdept_master_table`, `/subdept_master_create_setup`; POST `/dept_master_create`, `/subdept_master_create` |
| `mechineMaster.py` | `/api/mechMaster` | GET `/mechine_type_master_table` (legacy), `/mechine_master_table`, `/mechine_master_create_setup`, `/mechine_master_by_id/{machine_id}`, `/mechine_master_view`; POST `/mechine_type_master_create` (legacy), `/mechine_master_create`; PUT `/mechine_master_edit/{machine_id}` |
| `projectMaster.py` | `/api/projectMaster` | GET `/project_master_table`, `/project_master_create_setup`; POST `/project_master_create` — **no edit/view endpoints** (FE constants for them are dead) |
| `party.py` | `/api/partyMaster` | GET `/get_party_table`, `/party_create_setup`, `/party_edit_setup`; POST `/party_create`, `/party_edit` |
| `warehouse.py` | `/api/warehouseMaster` | GET `/get_warehouse_table`; POST `/warehouse_create` — create-only |
| `castFactor.py` | `/api/costFactorMaster` | GET `/get_cost_factor_table`, `/cost_factor_create_setup`, `/cost_factor_edit_setup`; POST `/cost_factor_create`, `/cost_factor_edit` |
| `juteQuality.py` | `/api/juteQualityMaster` | **ALL `deprecated=True`** (concept replaced by item_mst hierarchy): GET `/get_jute_quality_table`, `/get_jute_quality_by_id/{jute_qlty_id}`, `/jute_quality_create_setup`, `/jute_quality_edit_setup/{jute_qlty_id}`; POST `/jute_quality_create`; PUT `/jute_quality_edit/{jute_qlty_id}` |
| `juteSupplier.py` | `/api/juteSupplierMaster` | GET `/get_jute_supplier_table`, `/get_jute_supplier_by_id/{supplier_id}`, `/jute_supplier_edit_setup/{supplier_id}`; POST `/jute_supplier_create`; PUT `/jute_supplier_edit/{supplier_id}` |
| `juteSupplierMap.py` | `/api/juteSupplierMap` | GET `/get_jute_supplier_map_table`, `/get_jute_supplier_map_by_id/{map_id}`, `/jute_supplier_map_create_setup`, `/get_available_parties_for_supplier/{supplier_id}`; POST `/jute_supplier_map_create`; DELETE `/jute_supplier_map_delete/{map_id}` |
| `yarnQuality.py` | `/api/yarnQualityMaster` | GET `/yarn_quality_create_setup`, `/yarn_quality_table`, `/yarn_quality_edit_setup`, `/yarn_quality_view`; POST `/yarn_quality_create`; POST\|PUT `/yarn_quality_edit` (api_route, :270) |
| `machineSpgDetails.py` | `/api/machineSpgDetailsMaster` | GET `/machine_spg_details_create_setup`, `/machine_spg_details_table`, `/get_machines_by_branch`, `/machine_spg_details_edit_setup`; POST `/machine_spg_details_create`; PUT `/machine_spg_details_edit` (SQL in `machineSpgDetailsQuery.py`) |
| `yarnTypeMaster.py` | `/api/yarnTypeMaster` | GET `/get_yarn_type_table`, `/get_yarn_type_by_id/{yarn_type_id}`, `/yarn_type_edit_setup/{yarn_type_id}`; POST `/yarn_type_create`; PUT `/yarn_type_edit/{yarn_type_id}` |
| `yarnMaster.py` | `/api/yarnMaster` | GET `/get_yarn_table`, `/get_yarn_by_id/{yarn_id}`, `/yarn_create_setup`, `/yarn_edit_setup/{yarn_id}`; POST `/yarn_create`; PUT `/yarn_edit/{yarn_id}` |
| `designation.py` | `/api/hrmsMasters` | GET `/get_designation_table`, `/get_designation_by_id/{designation_id}`, `/designation_create_setup`; POST `/designation_create`; PUT `/designation_edit/{designation_id}` |
| `category.py` | `/api/hrmsMasters` | GET `/get_category_table`, `/get_category_by_id/{cata_id}`, `/category_create_setup`; POST `/category_create`; PUT `/category_edit/{cata_id}` |
| `shift.py` | `/api/hrmsMasters` | GET `/get_shift_table`, `/get_shift_by_id/{shift_id}`, `/shift_create_setup`; POST `/shift_create`; PUT `/shift_edit/{shift_id}` |
| `spell.py` | `/api/hrmsMasters` | GET `/get_spell_table`, `/get_spell_by_id/{spell_id}`, `/spell_create_setup`; POST `/spell_create`; PUT `/spell_edit/{spell_id}` |
| `contractor.py` | `/api/contractorMaster` | GET `/get_contractor_table`, `/get_contractor_by_id/{cont_id}`, `/contractor_create_setup`; POST `/contractor_create`; PUT `/contractor_edit/{cont_id}` |
| `bankDetails.py` | `/api/bankDetailsMaster` | GET `/get_bank_details_table`, `/get_bank_detail_by_id/{bank_detail_id}`, `/bank_details_create_setup`; POST `/bank_details_create`; PUT `/bank_details_edit/{bank_detail_id}` |
| `machineType.py` | `/api/machineTypeMaster` | GET `/get_machine_type_table`, `/get_machine_type_by_id/{machine_type_id}`; POST `/machine_type_create`; PUT `/machine_type_edit/{machine_type_id}`; DELETE `/machine_type_delete/{machine_type_id}` |

## Cross-module routers used by masters FE pages

| Router file | Prefix | Endpoints | FE page |
|---|---|---|---|
| `../vowerp3be/src/juteProcurement/juteAgentMap.py` | `/api/juteAgentMap` | GET `/get_jute_agent_map_table`, `/jute_agent_map_create_setup`, `/get_party_branches_for_agent`, `/get_jute_agent_map_by_id/{agent_map_id}`; POST `/jute_agent_map_create`; DELETE `/jute_agent_map_delete/{agent_map_id}` | `masters/juteAgentMap/` |
| `../vowerp3be/src/bomcosting/stdRateCard.py` | `/api/stdRateCard` | GET `/std_rate_card_list`, `/std_rate_card_current`, `/std_rate_card_apply`; POST `/std_rate_card_create`, `/std_rate_card_update`, `/std_rate_card_toggle_active` | `masters/stdRateCard/` (rest of module: see `module-bom-costing`) |

## Routers in `src/masters/` whose FE pages live OUTSIDE `masters/`

| Router file | Prefix | FE page | Module guide |
|---|---|---|---|
| `batchPlanMaster.py` | `/api/batchPlanMaster` | `src/app/dashboardportal/jutePurchase/batchPlanMst/` | `module-jute-purchase` |
| `itemBom.py` | `/api/itemBomMaster` | `src/app/dashboardportal/BomCosting/itemBomMaster/` | `module-bom-costing` |

Non-router files in `src/masters/`: `models.py`, `query.py`, `machineSpgDetailsQuery.py`,
`constants.py`, `__intit__.py` (existing typo'd filename — leave as-is).

## Dead routes (FE constant in `api.ts`, no backend endpoint)

| Constant | URL | Called by a page? |
|---|---|---|
| `DEPT_MASTER_VIEW` | `/deptMaster/dept_master_view` | **Yes** — departmentMaster |
| `SUBDEPT_MASTER_VIEW` | `/deptMaster/subdept_master_view` | **Yes** — subDepartmentMaster |
| `PROJECT_MASTER_EDIT` | `/projectMaster/project_master_edit` | **Yes** — projectMaster edit dialog |
| `PROJECT_MASTER_VIEW` | `/projectMaster/project_master_view` | **Yes** — projectMaster view/edit dialogs |
| `EDIT_ITEM_GRP` | `/itemMaster/editItemGroup` | No |
| `WAREHOUSE_CREATE_SETUP` / `WAREHOUSE_EDIT_SETUP` / `WAREHOUSE_EDIT` | `/warehouseMaster/...` | No |
| `MECHINE_TYPE_MASTER_CREATE_SETUP` / `MECHINE_TYPE_MASTER_VIEW` | `/mechMaster/...` | No |
