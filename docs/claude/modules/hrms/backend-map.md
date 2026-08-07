# HRMS Backend Map

Last verified: 2026-06-12

> Scope: every router in `../vowerp3be/src/hrms/` with its `main.py` prefix and endpoints.
> All routes are Portal persona — `Depends(get_tenant_db)` + `get_current_user_with_refresh`.
> Registered in `../vowerp3be/src/main.py:211-217` (note: `leaveType.py` goes under
> `/api/hrmsMasters`, not `/api/hrms`). Every endpoint below was verified against the router source.

| Router file | Prefix | Endpoints |
|---|---|---|
| `employee.py` | `/api/hrms` | GET `/employee_list`, `/employee_by_id/{eb_id}`, `/employee_create_setup`, `/get_designations_by_branch`, `/get_designations_by_sub_dept`, `/check_emp_code_duplicate`, `/employee_lookup_by_code`, `/employee_progress/{eb_id}`, `/employee_photo/{eb_id}`, `/employee_salary_schemes`, `/employee_salary/{eb_id}`; POST `/employee_create`, `/employee_section_save`, `/employee_photo_upload`, `/employee_status_update`, `/employee_salary_check`, `/employee_salary_save`; DELETE `/employee_photo/{eb_id}` |
| `payScheme.py` | `/api/hrms` | GET `/pay_scheme_list`, `/pay_scheme_by_id/{payscheme_id}`, `/pay_scheme_create_setup`; POST `/pay_scheme_create`; PUT `/pay_scheme_update/{payscheme_id}` |
| `payParam.py` | `/api/hrms` | GET `/pay_param_list`, `/pay_param_create_setup`; POST `/pay_param_create`; PUT `/pay_param_update/{period_id}` |
| `payRegister.py` | `/api/hrms` | GET `/pay_register_list`, `/pay_register_by_id/{period_id}`, `/pay_register_create_setup`, `/pay_register_salary`; POST `/pay_register_create`, `/pay_register_process`; PUT `/pay_register_update/{period_id}` |
| `payRoll.py` | `/api/hrms` | GET `/pay_roll_setup`, `/pay_roll_fetch_attendance`, `/pay_roll_fetch_generic`, `/pay_roll_fetch_cumulative` (the three `fetch_*` are ack stubs); POST `/pay_roll_data`, `/pay_roll_save`, `/pay_roll_download_template`, `/pay_roll_upload` |
| `payComponent.py` | `/api/hrms` | GET `/pay_component_list`, `/pay_component_by_id/{component_id}`, `/pay_component_create_setup`; POST `/pay_component_create`; PUT `/pay_component_update/{component_id}` — consumed by the **Tenant Admin** pages `src/app/dashboardadmin/paySchemeParameters/` (cross-dashboard; see `module-tenant-admin`) |
| `leaveType.py` | **`/api/hrmsMasters`** | GET `/get_leave_type_table`, `/get_leave_type_by_id/{leave_type_id}`; POST `/leave_type_create`; PUT `/leave_type_edit/{leave_type_id}` |

## Prefix overlap with module-masters

`/api/hrmsMasters` is shared with four routers that live in `../vowerp3be/src/masters/` and are
documented in `module-masters`: `designation.py`, `category.py` (main.py:151-152), `shift.py`,
`spell.py` (main.py:156-157). Only `leaveType.py` (above) belongs to this module's source dir.

## Missing backend (dead FE routes)

`api.ts` defines eight constants under `/api/hrms/` with **no backend route** (verified 2026-06-12):
`leave_request_list`, `leave_request_by_id`, `leave_request_create`, `leave_request_edit`,
`leave_request_approve`, `leave_request_reject`, `leave_ledger`, `worker_by_eb_no`. The
leaveRequest FE pages depend on all of them — see `pages-01-employee-leave.md §Leave Request`.

## Shared internals

- `query.py` — ~50 `text()` query fns: employee sections (`get_employee_*`), pay scheme
  (`get_pay_scheme_*`), components (`get_pay_component_*`), periods (`get_pay_param_list`,
  `check_duplicate_pay_register`), register processing (`get_payscheme_mapped_employees`,
  `get_employee_pay_structure`, `get_custom_component_values`,
  `delete_existing_payroll_for_period`, `delete_existing_payperiod_entries`), pay roll
  (`get_pay_roll_custom_components`, `get_pay_roll_employee_list`, `find_pay_period_by_dates`,
  `soft_delete_pcc_for_period`).
- `payRegister.py` also owns the **formula evaluation engine** (`_evaluate_employee_formulas`,
  `_run_payroll_processing`) — reused by `employee.py /employee_salary_check` for previews.
- `schemas.py` — `SectionSaveRequest` (employee section upsert). `constants.py` —
  `EMPLOYEE_LIFECYCLE_STATUS`, `RESIGN_DETAIL_STATUSES`, `EMPLOYEE_SECTIONS`/`EMPLOYEE_STEPS`,
  `PAY_COMPONENT_TYPES` (0 input / 1 earning / 2 deduction / 3 summary).
- Models: `../vowerp3be/src/models/hrms.py` (`HrmsEd*`, `HrmsExperienceDetails`, `PayComponents`,
  `PayComponentsCustom`, `PayPeriod`, `PaySchemeDetails`, `PayschemeMaster`,
  `PayEmployeePayscheme`, `PayEmployeeStructure`, `PayEmployeePayroll`, `PayEmployeePayperiod`,
  and many legacy `Pay*` tables); `HrmsLeaveTypesMst` in `../vowerp3be/src/models/mst.py`.

## Key tables

`hrms_ed_personal_details` (employee header: `status_id`, `active`) + per-section `hrms_ed_*`
tables; `hrms_leave_types_mst`; `pay_components` → `pay_scheme_master`/`pay_scheme_details` →
`pay_employee_payscheme`/`pay_employee_structure` → `pay_period` → `pay_components_custom` →
`pay_employee_payroll`/`pay_employee_payperiod`.

⚠ Status-ID note: register processing sets `pay_period.status_id = 28` (PROCESSED;
`payRegister.py:421` — 32 is LOCKED). `../vowerp3be/docs/hrms-payroll-design.md` still shows 32 as
Processed — the code is authoritative.
