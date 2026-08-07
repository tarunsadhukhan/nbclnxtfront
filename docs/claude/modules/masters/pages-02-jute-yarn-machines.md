# Masters Pages — Part 2: Jute, Yarn & Machine Masters

Last verified: 2026-06-12

> Scope: juteQualityMaster, juteSupplierMaster, juteSupplierMap, juteAgentMap, yarnMaster,
> YarnTypeMaster, yarnqualitymaster, mechineMaster, machineTypeMaster, machinespgdetails.
> Folder names `mechineMaster` and `machinespgdetails` mirror **production typos**
> (`mechine_spg_details` table etc.) — NEVER "fix" them. `co_id` from `localStorage`
> `sidebar_selectedCompany`. No approval workflows.

### Jute Quality Master — `juteQualityMaster/` (DEPRECATED backend)

Jute quality codes linked to items. Files: `page.tsx`, `createJuteQuality.tsx`.
**Every backend endpoint is marked `deprecated=True`** — `src/masters/juteQuality.py`'s docstring
says the jute-quality concept is replaced by the `item_mst` hierarchy (Jute Group → Subgroup →
Item); endpoints are retained only for backward compatibility. Do not extend this master.

| Constants | URLs (`/juteQualityMaster` prefix, BE `src/masters/juteQuality.py`) |
|---|---|
| `JUTE_QUALITY_TABLE`, `JUTE_QUALITY_CREATE_SETUP`, `JUTE_QUALITY_CREATE`, `JUTE_QUALITY_EDIT_SETUP`, `JUTE_QUALITY_EDIT` | `/get_jute_quality_table`, `/jute_quality_create_setup`, `/jute_quality_create`, `/jute_quality_edit_setup/{id}`, `/jute_quality_edit/{id}` (PUT) |

(`JUTE_QUALITY_BY_ID` → `/get_jute_quality_by_id/{id}` exists on both sides but isn't used here.)

### Jute Supplier Master — `juteSupplierMaster/`

Jute raw-material suppliers. Files: `page.tsx`, `createJuteSupplier.tsx`.

| Constants | URLs (`/juteSupplierMaster` prefix, BE `src/masters/juteSupplier.py`) |
|---|---|
| `JUTE_SUPPLIER_TABLE`, `JUTE_SUPPLIER_CREATE`, `JUTE_SUPPLIER_EDIT_SETUP`, `JUTE_SUPPLIER_EDIT` | `/get_jute_supplier_table`, `/jute_supplier_create`, `/jute_supplier_edit_setup/{id}`, `/jute_supplier_edit/{id}` (PUT) |

### Jute Supplier Party Map — `juteSupplierMap/`

Maps a jute supplier to party records. Files: `page.tsx`, `createJuteSupplierMap.tsx`.
Create + list only on the page (the router also has by-id GET and a DELETE).

| Constants | URLs (`/juteSupplierMap` prefix, BE `src/masters/juteSupplierMap.py`) |
|---|---|
| `JUTE_SUPPLIER_MAP_TABLE`, `JUTE_SUPPLIER_MAP_CREATE_SETUP`, `JUTE_SUPPLIER_MAP_AVAILABLE_PARTIES`, `JUTE_SUPPLIER_MAP_CREATE` | `/get_jute_supplier_map_table`, `/jute_supplier_map_create_setup`, `/get_available_parties_for_supplier/{supplier_id}`, `/jute_supplier_map_create` |

### Jute Agent Mapping — `juteAgentMap/` (cross-module backend)

Maps jute agents to party branches; includes a "Remove mapping" action. Files: `page.tsx`,
`createJuteAgentMap.tsx`. **Backend router is NOT in `src/masters/`** — it lives in
`../vowerp3be/src/juteProcurement/juteAgentMap.py`, registered at `/api/juteAgentMap`
(`src/main.py:179`).

| Constants | URLs (`/juteAgentMap` prefix) |
|---|---|
| `JUTE_AGENT_MAP_TABLE`, `JUTE_AGENT_MAP_CREATE_SETUP`, `JUTE_AGENT_MAP_PARTY_BRANCHES`, `JUTE_AGENT_MAP_CREATE`, `JUTE_AGENT_MAP_DELETE` | `/get_jute_agent_map_table`, `/jute_agent_map_create_setup`, `/get_party_branches_for_agent`, `/jute_agent_map_create`, `/jute_agent_map_delete/{agent_map_id}` (DELETE) |

### Yarn Master — `yarnMaster/` (COMPLEX form)

Yarn definitions. Files: `page.tsx`, `createYarnMaster.tsx` (446-line dialog form).

| Constants | URLs (`/yarnMaster` prefix, BE `src/masters/yarnMaster.py`) |
|---|---|
| `YARN_TABLE`, `YARN_CREATE_SETUP`, `YARN_CREATE`, `YARN_EDIT_SETUP`, `YARN_EDIT` | `/get_yarn_table`, `/yarn_create_setup`, `/yarn_create`, `/yarn_edit_setup/{yarn_id}`, `/yarn_edit/{yarn_id}` (PUT) |

### Yarn Type Master — `YarnTypeMaster/` (capital-Y folder)

Yarn type reference list. Files: `page.tsx`, `createYarnType.tsx`.

| Constants | URLs (`/yarnTypeMaster` prefix, BE `src/masters/yarnTypeMaster.py`) |
|---|---|
| `YARN_TYPE_TABLE`, `YARN_TYPE_EDIT_SETUP`, `YARN_TYPE_CREATE`, `YARN_TYPE_EDIT` | `/get_yarn_type_table`, `/yarn_type_edit_setup/{id}`, `/yarn_type_create`, `/yarn_type_edit/{id}` (PUT) |

### Yarn Quality Master — `yarnqualitymaster/` (lowercase folder; service layer)

Yarn quality specs per branch (TPI, std count/doff, target efficiency). Files: `page.tsx`,
`createYarnQuality/index.tsx`. The only masters page with a dedicated **service**:
`src/utils/yarnQualityService.ts` (+ `yarnQualityService.test.ts`) wrapping all five calls.

| Constants (via service) | URLs (`/yarnQualityMaster` prefix, BE `src/masters/yarnQuality.py`) |
|---|---|
| `YARN_QUALITY_TABLE`, `YARN_QUALITY_CREATE_SETUP`, `YARN_QUALITY_CREATE`, `YARN_QUALITY_EDIT_SETUP`, `YARN_QUALITY_EDIT` | `/yarn_quality_table`, `/yarn_quality_create_setup`, `/yarn_quality_create`, `/yarn_quality_edit_setup`, `/yarn_quality_edit` (POST|PUT via `api_route`, yarnQuality.py:270) |

BE also exposes GET `/yarn_quality_view` (not used by this page). Tests:
`../vowerp3be/src/test/test_yarn_quality.py` is the canonical BE test example.

### Machine Master — `mechineMaster/` (typo folder)

Machines per branch. Files: `page.tsx` + separate `CreateMechineMasterPage.tsx`,
`EditMechineMasterPage.tsx`, `ViewMechineMasterPage.tsx` dialog components.

| Constants | URLs (`/mechMaster` prefix, BE `src/masters/mechineMaster.py`) |
|---|---|
| `MECHINE_MASTER_TABLE`, `MECHINE_MASTER_CREATE_SETUP`, `MECHINE_MASTER_CREATE`, `MECHINE_MASTER_EDIT`, `MECHINE_MASTER_BY_ID`, `MECHINE_MASTER_VIEW` | `/mechine_master_table`, `/mechine_master_create_setup`, `/mechine_master_create`, `/mechine_master_edit/{machine_id}` (PUT), `/mechine_master_by_id/{machine_id}`, `/mechine_master_view` |

The same router carries legacy `/mechine_type_master_table` + `/mechine_type_master_create`;
their `api.ts` constants `MECHINE_TYPE_MASTER_*` are unused by masters pages, and the
`_CREATE_SETUP` / `_VIEW` variants have no backend routes (dead).

### Machine Type Master — `machineTypeMaster/`

Machine type reference (the current, correctly-spelled router — distinct from the legacy
mechine_type endpoints above). Files: `page.tsx`, `CreateMachineTypePage.tsx`.

| Constants | URLs (`/machineTypeMaster` prefix, BE `src/masters/machineType.py`) |
|---|---|
| `MACHINE_TYPE_TABLE`, `MACHINE_TYPE_BY_ID`, `MACHINE_TYPE_CREATE`, `MACHINE_TYPE_EDIT` | `/get_machine_type_table`, `/get_machine_type_by_id/{id}`, `/machine_type_create`, `/machine_type_edit/{id}` (PUT) |

BE also has DELETE `/machine_type_delete/{id}` (`MACHINE_TYPE_DELETE` const exists; unused by the
page).

### Machine SPG Details — `machinespgdetails/` (typo table `mechine_spg_details`)

Spinning-frame spindle/speed details per machine and branch. Files: `page.tsx` (hosts Create/
View/Edit dialogs) + `CreateMachineSpgDetailsPage.tsx`, `EditMachineSpgDetailsPage.tsx`,
`ViewMachineSpgDetailsPage.tsx`, `createMachineSpgDetails/index.tsx`. Uses service
`src/utils/machineSpgDetailsService.ts` (`fetchMachineSpgDetailsList`, `...CreateSetup`,
`fetchMachinesByBranch`, `...EditSetup`, `createMachineSpgDetails`, `updateMachineSpgDetails`).

| Constants | URLs (`/machineSpgDetailsMaster` prefix, BE `src/masters/machineSpgDetails.py`; SQL in `machineSpgDetailsQuery.py`) |
|---|---|
| `MACHINE_SPG_DETAILS_TABLE`, `MACHINE_SPG_DETAILS_CREATE_SETUP`, `MACHINE_SPG_DETAILS_MACHINES_BY_BRANCH`, `MACHINE_SPG_DETAILS_EDIT_SETUP`, `MACHINE_SPG_DETAILS_CREATE`, `MACHINE_SPG_DETAILS_EDIT` | `/machine_spg_details_table`, `/machine_spg_details_create_setup`, `/get_machines_by_branch`, `/machine_spg_details_edit_setup`, `/machine_spg_details_create`, `/machine_spg_details_edit` (PUT) |
