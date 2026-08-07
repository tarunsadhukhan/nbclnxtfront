# Tenant Admin Pages — Part 1: Company & Org Structure

Last verified: 2026-06-12

> Scope: the pages that build the tenant's company/branch/department hierarchy and per-company
> configuration: companyManagement, branchManagement, deptManagement, subDeptManagement,
> CompanyConfiguration, coInvoiceTypeMap, mechineTypeMasterAdmin, paySchemeCreation,
> paySchemeParameters. BE paths are relative to `../vowerp3be/`. Constants from
> `apiRoutesconsole` unless noted.

## Root landing — `page.tsx`

- Page: `src/app/dashboardadmin/page.tsx` — static placeholder cards (hardcoded "Total Sales"
  etc.), no API calls. Layout: `layout.tsx` renders `SidebarConsole`
  (`src/components/dashboard/sidebarCompanyConsole.tsx`); sidebar menus come from
  `GET_TENANT_ADMIN_MENU_ROLE` → `/companyAdmin/tenant_console_menu_items_roleid`
  (`con_menu_master` filtered by the admin's role via `con_role_menu_map`).

## Company Management — list / create / edit

Creates the tenant's companies (`co_mst` in the **tenant DB**).

- List page: `src/app/dashboardadmin/companyManagement/page.tsx` — paginated DataGrid via
  `GET_CO_ALL`. (`page1.tsx` in the same folder is a dead legacy variant — not a Next.js route.)
- Create/edit: `companyManagement/createCompany/page.tsx` + `CoForm.tsx` (form incl. logo
  upload) + `handleCreateEdit.tsx` (data fetch + submit; edit mode via query params).
- Endpoints (BE file `src/common/companyAdmin/company.py`, prefix `/companyAdmin`):

| api.ts const | URL | Purpose |
|---|---|---|
| `GET_CO_ALL` | `/get_co_data_all` | Paginated company list (page/limit/search) |
| `GET_CO_BY_ID` | `/get_co_data_by_id/{co_id}` | Load for edit |
| `CREATE_CO_SETUP` | `/create_co_setup_data` | Setup: modules, countries, states |
| `CREATE_CO` / `EDIT_CO` | `/create_co_data`, `/edit_co_data` | POST create / update `co_mst` |
| `UPLOAD_CO_LOGO` | `/upload_co_logo` | Logo upload (jpeg/png, ≤2 MB, ≤500px, resized to 300px) |
| `GET_CO_LOGO` / `DELETE_CO_LOGO` | `/get_co_logo/{co_id}`, `/delete_co_logo/{co_id}` | Fetch / remove logo |

- Scope: org from subdomain (backend); no co/branch dropdowns needed — this page *creates* the companies.

## Branch Management — list / create / edit

Creates branches under a company (`branch_mst` in the tenant DB).

- List page: `branchManagement/page.tsx` — `GET_BRANCH_ALL` (joins `co_mst` for company name).
- Create/edit: `branchManagement/createBranch/page.tsx` + `BranchForm.tsx` +
  `handleCreateEdit.tsx`. Create flow can be pre-seeded with `companyId`/`companyName` query
  params (defensive injection if company missing from setup response).
- Endpoints (BE file `src/common/companyAdmin/branch.py`):

| api.ts const | URL | Purpose |
|---|---|---|
| `GET_BRANCH_ALL` | `/get_branch_data_all` | Branch list with company names |
| `GET_BRANCH_BY_ID` | `/get_branch_data_by_id/{branch_id}` | Load for edit |
| `CREATE_BRANCH_SETUP` | `/create_branch_setup_data` | Companies, countries, states for dropdowns |
| `CREATE_BRANCH` / `EDIT_BRANCH` | `/create_branch_data`, `/edit_branch_data` | POST create / update `branch_mst` |

- Fields: name, prefix, address1/2, zipcode, email, contact_no, country_id, state_id, active.

## Department Management — list / create / edit

Departments under a branch (`dept_mst` in the tenant DB).

- List page: `deptManagement/page.tsx` — `GET_DEPARTMENT_ALL` (+ `GET_BRANCH_ALL` for filter).
- Create/edit: `deptManagement/createDept/page.tsx` + `DeptForm.tsx` + `handleCreateEdit.tsx`.
  DeptForm itself fetches `GET_BRANCH_ALL` and `GET_DEPARTMENT_ALL` for dropdowns.
- Endpoints (BE file `src/common/companyAdmin/dept_subdept.py`):

| api.ts const | URL | Purpose |
|---|---|---|
| `GET_DEPARTMENT_ALL` | `/get_department_data_all` | Paginated dept list |
| `GET_DEPARTMENT_BY_ID` | `/get_department_data_by_id/{dept_id}` | Load for edit |
| `CREATE_DEPARTMENT` / `EDIT_DEPARTMENT` | `/create_department_data`, `/edit_department_data` | POST create / update `dept_mst` (dept_desc, dept_code, branch_id, order_id) |

- Quirk: the create flow also issues a **GET** to `CREATE_DEPARTMENT` for "setup data" — that URL
  only accepts POST, so the call fails silently and dropdowns rely on the form's own fetches.

## Sub-Department Management — list / create / edit

Sub-departments under a department (`sub_dept_mst`, read-only joined view).

- List page: `subDeptManagement/page.tsx` — `GET_SUBDEPARTMENT_ALL`
  (`/get_subdepartment_data_all`, joins `sub_dept_mst` → `dept_mst` → `branch_mst` → `co_mst`)
  + `GET_BRANCH_ALL` for filtering.
- Create/edit: `subDeptManagement/createSubDept/page.tsx` + `SubDeptForm.tsx` +
  `handleCreateEdit.tsx`.
- **Known defect (do not replicate):** `createSubDept/handleCreateEdit.tsx` is a copy of the
  department handler — it submits to `CREATE_DEPARTMENT` / `EDIT_DEPARTMENT` and loads via
  `GET_DEPARTMENT_BY_ID`. There is **no create/edit endpoint for `sub_dept_mst`** in
  `dept_subdept.py` (only the list query). Saving from this page writes a *department*, not a
  sub-department.

## Company Configuration — list / edit

Per-company behaviour flags (`co_config` in the tenant DB, 1:1 with `co_mst`).

- List page: `CompanyConfiguration/page.tsx` — company list via `GET_CO_ALL`; each row links to
  `editConfiguration?companyId=&companyName=`.
- Edit page: `CompanyConfiguration/editConfiguration/page.tsx` — React Hook Form over boolean
  flags (sent as 0/1): `india_gst`, `india_tds`, `india_tcs`, `back_date_allowable`,
  `indent_required`, `po_required`, `material_inspection`, `quotation_required`, `do_required`,
  `gst_linked`, plus `currency_id` (options from `currency_mst`).
- Endpoints (BE file `src/common/companyAdmin/company.py`):

| api.ts const | URL | Purpose |
|---|---|---|
| `CO_CONFIG` | `/co_config?co_id=` | GET current config + currency options |
| `EDIT_CO_CONFIG` | `/company_config` | POST upsert `co_config` row |

- These flags gate portal behaviour (e.g. whether indents/POs/inspection are mandatory).

## Company ↔ Invoice Type Map

Maps which invoice types each company may use (`invoice_type_co_map` in the tenant DB).

- Page: `coInvoiceTypeMap/page.tsx` — company grid; per-company modal
  `_components/CoInvoiceTypeMapModal.tsx` with invoice-type checkboxes.
- Endpoints (BE file `src/common/companyAdmin/company.py`):

| api.ts const | URL | Purpose |
|---|---|---|
| `CO_INVOICE_TYPE_MAP_SETUP` | `/co_invoice_type_map_setup` | Companies + `invoice_type_mst` + current active mappings |
| `CO_INVOICE_TYPE_MAP_SAVE` | `/co_invoice_type_map_save` | POST `{co_id, invoice_type_ids}` — validates ids, then delete-and-recreate rows |

## Machine Type Master (admin) — `mechineTypeMasterAdmin`

Production-typo folder name ("mechine") — keep as-is. Manages machine types in the **tenant DB**
via the *portal business* prefix `/api/mechMaster` (BE `src/masters/mechineMaster.py`), not
`/companyAdmin`. Constants from `apiRoutesPortalMasters`.

- Page: `mechineTypeMasterAdmin/page.tsx` — list grid + view/edit dialogs;
  `CreateMechineTypePage.tsx` is the create dialog component (no `create/` subfolder).
- Endpoints used:

| api.ts const | URL (`/mechMaster`) | Purpose |
|---|---|---|
| `MECHINE_TYPE_MASTER_TABLE` | `/mechine_type_master_table` | Paginated list (co_id + branch_ids) |
| `MECHINE_TYPE_MASTER_CREATE` | `/mechine_type_master_create` | POST create machine type |
| `MECHINE_MASTER_VIEW` | `/mechine_master_view` | Machines of a type (view/edit dialogs); page carries a dead `/apix/...` fallback string |

- Scope quirk: co_id/branch_ids are read from the **portal sidebar's localStorage**
  (`sidebar_selectedCompany`, `sidebar_selectedBranches`) — set by `dashboardportal`, not here.

## Pay Scheme Creation — list / create / edit

HRMS pay schemes (`pay_scheme_master` / `pay_scheme_details` in the tenant DB) via the portal
business prefix `/api/hrms` (BE `src/hrms/payScheme.py`). Constants from `apiRoutesPortalMasters`.

- List page: `paySchemeCreation/page.tsx` — paginated grid via `HRMS_PAY_SCHEME_LIST`
  (page/page_size/search only — no co_id on the list).
- Create/edit: `paySchemeCreation/create/page.tsx` — scheme header + component lines; company
  selector populated from the setup response (`co_mst`).
- Endpoints:

| api.ts const | URL (`/hrms`) | Purpose |
|---|---|---|
| `HRMS_PAY_SCHEME_LIST` | `/pay_scheme_list` | Paginated list |
| `HRMS_PAY_SCHEME_BY_ID` | `/pay_scheme_by_id/{payscheme_id}` | Header + detail lines for edit |
| `HRMS_PAY_SCHEME_CREATE_SETUP` | `/pay_scheme_create_setup?co_id=` | Wage types, components, schemes, companies |
| `HRMS_PAY_SCHEME_CREATE` / `HRMS_PAY_SCHEME_UPDATE` | `/pay_scheme_create`, `/pay_scheme_update/{payscheme_id}` | POST create / PUT update |

## Pay Scheme Parameters (Pay Components) — list / create / edit

HRMS pay components (the building blocks referenced by pay schemes), BE `src/hrms/payComponent.py`,
prefix `/api/hrms`. Constants from `apiRoutesPortalMasters`.

- List page: `paySchemeParameters/page.tsx` — paginated grid via `HRMS_PAY_COMPONENT_LIST`.
- Create/edit: `paySchemeParameters/create/page.tsx` (route) and `CreatePayComponent.tsx`
  (dialog variant, takes `co_id`); both share the same endpoints.
- Endpoints:

| api.ts const | URL (`/hrms`) | Purpose |
|---|---|---|
| `HRMS_PAY_COMPONENT_LIST` | `/pay_component_list` | Paginated list |
| `HRMS_PAY_COMPONENT_BY_ID` | `/pay_component_by_id/{component_id}` | Load for edit |
| `HRMS_PAY_COMPONENT_CREATE_SETUP` | `/pay_component_create_setup?co_id=` | Dropdown/setup data |
| `HRMS_PAY_COMPONENT_CREATE` / `HRMS_PAY_COMPONENT_UPDATE` | `/pay_component_create`, `/pay_component_update/{component_id}` | POST create / PUT update |
