# Masters Pages — Part 3: HR, Finance & Misc Masters

Last verified: 2026-06-12

> Scope: designationMaster, categoryMaster, shiftMaster, spellMaster, contractorMaster,
> bankDetailsMaster, stdRateCard, plus the module landing `page.tsx`. The four HR masters
> (designation, category, shift, spell) share one backend prefix `/api/hrmsMasters` but separate
> router files. These newer pages use `useSidebarContext()` for company/branch state and ship
> with Vitest tests. No approval workflows.

### Designation Master — `designationMaster/`

HR designations. Files: `page.tsx`, `CreateDesignationPage.tsx` + tests (`page.test.tsx`,
`CreateDesignationPage.test.tsx`).

| Constants | URLs (`/hrmsMasters` prefix, BE `src/masters/designation.py`) |
|---|---|
| `DESIGNATION_TABLE`, `DESIGNATION_BY_ID`, `DESIGNATION_CREATE_SETUP`, `DESIGNATION_CREATE`, `DESIGNATION_EDIT` | `/get_designation_table`, `/get_designation_by_id/{id}`, `/designation_create_setup`, `/designation_create`, `/designation_edit/{id}` (PUT) |

### Worker Category Master — `categoryMaster/`

Worker categories (page title: "Worker Category Master"); branch-aware via
`useSidebarContext().selectedBranches`. Files: `page.tsx`, `CreateCategoryPage.tsx` + tests.

| Constants | URLs (`/hrmsMasters` prefix, BE `src/masters/category.py`) |
|---|---|
| `CATEGORY_TABLE`, `CATEGORY_BY_ID`, `CATEGORY_CREATE_SETUP`, `CATEGORY_CREATE`, `CATEGORY_EDIT` | `/get_category_table`, `/get_category_by_id/{cata_id}`, `/category_create_setup`, `/category_create`, `/category_edit/{cata_id}` (PUT) |

### Shift Master — `shiftMaster/`

Work shifts. Files: `page.tsx`, `CreateShiftPage.tsx`.

| Constants | URLs (`/hrmsMasters` prefix, BE `src/masters/shift.py`) |
|---|---|
| `SHIFT_TABLE`, `SHIFT_BY_ID`, `SHIFT_CREATE_SETUP`, `SHIFT_CREATE`, `SHIFT_EDIT` | `/get_shift_table`, `/get_shift_by_id/{shift_id}`, `/shift_create_setup`, `/shift_create`, `/shift_edit/{shift_id}` (PUT) |

### Spell Master — `spellMaster/`

Work spells (sub-shift periods). Files: `page.tsx`, `CreateSpellPage.tsx`.

| Constants | URLs (`/hrmsMasters` prefix, BE `src/masters/spell.py`) |
|---|---|
| `SPELL_TABLE`, `SPELL_BY_ID`, `SPELL_CREATE_SETUP`, `SPELL_CREATE`, `SPELL_EDIT` | `/get_spell_table`, `/get_spell_by_id/{spell_id}`, `/spell_create_setup`, `/spell_create`, `/spell_edit/{spell_id}` (PUT) |

### Contractor Master — `contractorMaster/`

Labour contractors. Files: `page.tsx` (+ `page.test.tsx`), `CreateContractorPage.tsx`.

| Constants | URLs (`/contractorMaster` prefix, BE `src/masters/contractor.py`) |
|---|---|
| `CONTRACTOR_TABLE`, `CONTRACTOR_BY_ID`, `CONTRACTOR_CREATE_SETUP`, `CONTRACTOR_CREATE`, `CONTRACTOR_EDIT` | `/get_contractor_table`, `/get_contractor_by_id/{cont_id}`, `/contractor_create_setup`, `/contractor_create`, `/contractor_edit/{cont_id}` (PUT) |

### Bank Details Master — `bankDetailsMaster/`

Bank account details. Files: `page.tsx`, `CreateBankDetailsPage.tsx`.

| Constants | URLs (`/bankDetailsMaster` prefix, BE `src/masters/bankDetails.py`) |
|---|---|
| `BANK_DETAILS_TABLE`, `BANK_DETAILS_BY_ID`, `BANK_DETAILS_CREATE`, `BANK_DETAILS_EDIT` | `/get_bank_details_table`, `/get_bank_detail_by_id/{bank_detail_id}`, `/bank_details_create`, `/bank_details_edit/{bank_detail_id}` (PUT) |

BE also has GET `/bank_details_create_setup` (`BANK_DETAILS_CREATE_SETUP` const exists; unused by
the page).

### Standard Rate Cards — `stdRateCard/` (cross-module backend → BOM Costing)

Standard rate cards used by BOM costing. Files: `page.tsx`, `_components/RateCardForm.tsx`
(the only masters folder using the `_components/` convention). **Backend router lives in
`../vowerp3be/src/bomcosting/stdRateCard.py`**, registered at `/api/stdRateCard`
(`src/main.py:163`) — see `module-bom-costing` for the rest of that module.

| Constants | URLs (`/stdRateCard` prefix) |
|---|---|
| `STD_RATE_CARD_LIST`, `STD_RATE_CARD_CREATE`, `STD_RATE_CARD_UPDATE` | `/std_rate_card_list`, `/std_rate_card_create`, `/std_rate_card_update` (both POST) |

BE also exposes `/std_rate_card_current`, `/std_rate_card_toggle_active` (POST),
`/std_rate_card_apply` — constants exist (`_CURRENT`, `_TOGGLE_ACTIVE`, `_APPLY`) but this page
does not call them.

### Module landing — `masters/page.tsx`

Static page rendering only a "Masters" heading — no tiles, no API calls. Navigation into the
individual masters comes from the portal sidebar menus.
