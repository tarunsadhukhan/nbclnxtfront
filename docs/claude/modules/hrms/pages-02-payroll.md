# HRMS Pages — Part 2: Pay Scheme, Pay Param, Pay Register, Pay Roll

Last verified: 2026-06-12

> Scope: the payroll chain pages. Verified order: Pay Scheme (formulas) → Pay Param (period) →
> Pay Roll (per-employee custom values) → Pay Register (process + approve). All Portal pages;
> `co_id` from `useSelectedCompanyCoId()`. BE paths relative to `../vowerp3be/`. Deep-dive:
> `../vowerp3be/docs/hrms-payroll-design.md` (note: the doc says Processed = 32; the **code** uses
> 28 — `payRegister.py:421` — with 32 reserved for LOCKED. Trust the code).

## Pay Scheme

Defines a salary scheme: header (`pay_scheme_master`: code, name, wage type, branch, effective
from) plus component lines (`pay_scheme_details`: component, formula or default value, type
input/earning/deduction/summary). Formulas reference other components by code (e.g. `BASIC*0.5`)
and are evaluated at register-processing time and in the employee salary-check preview.

- List page: `src/app/dashboardportal/hrms/payScheme/page.tsx` — DataGrid via `fetchPaySchemeList`.
- Create/edit/view: `payScheme/createPayScheme/page.tsx` (mode via `?mode=&id=`) — MuiForm header +
  dynamic component-formula rows (add/remove with Plus/Trash2).
- How it works:
  - hooks/: `usePaySchemeFormState` (+ unit test) — header fields + component line add/update/remove;
    `usePaySchemeSetup` — setup options (`pay_scheme_create_setup`: components, wage types)
  - types/: `paySchemeTypes.ts` — also hosts `PayPeriodListRow`, `PayParamSetupData`, `Option`,
    `FormMode` **reused by the payParam pages**, and `PAY_COMPONENT_TYPE_LABELS`
- Service: `src/utils/hrmsService.ts`
- Endpoints (BE file `src/hrms/payScheme.py`, prefix `/api/hrms`):

| api.ts const | URL | Purpose |
|---|---|---|
| `HRMS_PAY_SCHEME_LIST` | `/pay_scheme_list` | Paginated list |
| `HRMS_PAY_SCHEME_BY_ID` | `/pay_scheme_by_id/{payscheme_id}` | Header + active detail lines |
| `HRMS_PAY_SCHEME_CREATE_SETUP` | `/pay_scheme_create_setup` | Components + wage-type options |
| `HRMS_PAY_SCHEME_CREATE` | `/pay_scheme_create` | Insert header + lines (`record_status=1`) |
| `HRMS_PAY_SCHEME_UPDATE` | `/pay_scheme_update/{payscheme_id}` | Update header; replaces lines by soft-deleting (`status_id=0`) and re-inserting |

- Approval: **no**.
- Related (Tenant Admin dashboard, outside this module's pages): pay **components** are managed at
  `src/app/dashboardadmin/paySchemeParameters/` using `HRMS_PAY_COMPONENT_*` constants → BE
  `src/hrms/payComponent.py` (same `/api/hrms` prefix). See `module-tenant-admin` for that page;
  the endpoints are in this module's `backend-map.md`.

## Pay Param

Thin CRUD over `pay_period` — defines a payroll period (from/to dates, scheme, branch) with
`status_id = 1` on create. No processing happens here; Pay Roll resolves periods by date and Pay
Register creates **its own** `pay_period` rows.

- List page: `src/app/dashboardportal/hrms/payParam/page.tsx` — DataGrid via `fetchPayParamList`.
- Create/edit/view: `payParam/createPayParam/page.tsx` — single MuiForm; **no hooks/ or types/
  folders** (inline state; types imported from `../../payScheme/types/paySchemeTypes`).
- Service: `src/utils/hrmsService.ts`
- Endpoints (BE file `src/hrms/payParam.py`, prefix `/api/hrms`):

| api.ts const | URL | Purpose |
|---|---|---|
| `HRMS_PAY_PARAM_LIST` | `/pay_param_list` | Paginated list of `pay_period` rows |
| `HRMS_PAY_PARAM_CREATE_SETUP` | `/pay_param_create_setup` | Scheme + branch dropdowns |
| `HRMS_PAY_PARAM_CREATE` | `/pay_param_create` | Insert `pay_period` (status 1) |
| `HRMS_PAY_PARAM_UPDATE` | `/pay_param_update/{period_id}` | Update fields incl. `status_id` (PUT) |

- ⚠ Quirk (verified in `query.py:489` and `payParam.py:64`): the list query and create-setup source
  the "scheme" dropdown from **`pay_components`** (`TYPE = 0`), whereas Pay Register sources schemes
  from **`pay_scheme_master`**. Keep this in mind when the two dropdowns disagree.
- Approval: **no** (status is a plain field here).

## Pay Register

The payroll **run**. Create = insert a `pay_period` row (status 1 Open) **and immediately process
it** (`_run_payroll_processing`): fetch employees mapped to the scheme (`pay_employee_payscheme`),
apply per-employee base structure (`pay_employee_structure`) and per-period custom values
(`pay_components_custom`, from Pay Roll), iteratively evaluate scheme formulas, write
`pay_employee_payroll` (one row per component) + `pay_employee_payperiod` (BASIC/NET/GROSS), then
set the period to **28 Processed**. Creating a new register for the same period/scheme/branch
supersedes a prior Processed run by marking it 4 Rejected. Full lifecycle:
`approval-flows.md §Pay Register`.

- List page: `src/app/dashboardportal/hrms/payRegister/page.tsx` — DataGrid via
  `fetchPayRegisterList` with status chips.
- Create: `payRegister/createPayRegister/page.tsx` — MuiForm (from/to, scheme, branch); branch
  defaults from the sidebar (`useSidebarContext().selectedBranches[0]`); posts
  `pay_register_create` (create + auto-process in one call; processing errors are surfaced in the
  response as `processing_error` without losing the period).
- View/approve: `payRegister/viewPayRegister/page.tsx` (`?id=&mode=`) — detail summary + pivoted
  salary grid (`pay_register_salary` returns both `columns` and `data`, so the grid is fully
  backend-driven), and Approve/Reject buttons (shown when `approveButton` is true, i.e. status 1
  or 20) that call `pay_register_update` with `status` 3 or 4.
- types/: `payRegisterTypes.ts` — `PAY_REGISTER_STATUS`, list/detail/setup shapes. No hooks/ folder.
- Service: `src/utils/hrmsService.ts`
- Endpoints (BE file `src/hrms/payRegister.py`, prefix `/api/hrms`):

| api.ts const | URL | Purpose |
|---|---|---|
| `HRMS_PAY_REGISTER_LIST` | `/pay_register_list` | Paginated list (`pay_scheme_master` join, net-pay totals) |
| `HRMS_PAY_REGISTER_BY_ID` | `/pay_register_by_id/{period_id}` | Detail + `approveButton` flag |
| `HRMS_PAY_REGISTER_CREATE_SETUP` | `/pay_register_create_setup` | Schemes (from `pay_scheme_master`) + branches |
| `HRMS_PAY_REGISTER_CREATE` | `/pay_register_create` | Insert period + supersede prior Processed + auto-process |
| `HRMS_PAY_REGISTER_UPDATE` | `/pay_register_update/{period_id}` | Free-form field/status update (FE uses it for approve/reject) |
| `HRMS_PAY_REGISTER_SALARY` | `/pay_register_salary` | Pivoted employee × component grid (columns + rows) |
| `HRMS_PAY_REGISTER_PROCESS` | `/pay_register_process` | Re-run processing for an existing period |

- Scope: `co_id` from hook; branch from sidebar on create.
- Approval: **yes** — simplified, no ApprovalActionsBar component (inline buttons on the view
  page). See `approval-flows.md §Pay Register`.

## Pay Roll

Bulk entry of **variable/custom** component values (overtime, bonus, attendance-driven inputs) per
employee per period — stored as `pay_components_custom` rows that Pay Register processing later
picks up. One large page, no create/ subroute.

- Page: `src/app/dashboardportal/hrms/payRoll/page.tsx` (597 lines) — filter MuiForm (from/to,
  branch, optional scheme/dept/category) → editable DataGrid (employees × custom components, cells
  edited inline) → Save. Toolbar: Excel template download, Excel upload, and three legacy "Fetch"
  buttons (Attendance / Generic / Cumulative).
- types/: `payRollTypes.ts`. No hooks/ folder (state lives in the page).
- Service: `src/utils/hrmsService.ts` (template download + Excel upload use axios with
  blob/FormData; the rest use `fetchWithCookie`).
- Endpoints (BE file `src/hrms/payRoll.py`, prefix `/api/hrms`):

| api.ts const | URL | Purpose |
|---|---|---|
| `HRMS_PAY_ROLL_SETUP` | `/pay_roll_setup` | Filter dropdown options |
| `HRMS_PAY_ROLL_DATA` | `/pay_roll_data` (POST) | Dynamic custom-component columns + employee rows + existing values |
| `HRMS_PAY_ROLL_SAVE` | `/pay_roll_save` (POST) | Soft-delete prior `pay_components_custom` rows for the period/employees, insert replacements (`status_id=1`); resolves `pay_period_id` by dates if absent |
| `HRMS_PAY_ROLL_FETCH_ATTENDANCE` / `_GENERIC` / `_CUMULATIVE` | `/pay_roll_fetch_attendance`, `/pay_roll_fetch_generic`, `/pay_roll_fetch_cumulative` | ⚠ **Acknowledgement stubs** — return success with `records_updated: 0`; the legacy recomputation services are not ported yet |
| `HRMS_PAY_ROLL_DOWNLOAD_TEMPLATE` | `/pay_roll_download_template` (POST) | Pre-filled .xlsx template (blob) |
| `HRMS_PAY_ROLL_UPLOAD` | `/pay_roll_upload` (POST) | Parse .xlsx → custom component values |

- Scope: `co_id` from hook; branch from sidebar feeds the filter form default.
- Approval: **no** — values become final through the Pay Register run.
