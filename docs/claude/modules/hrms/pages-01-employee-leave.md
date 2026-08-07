# HRMS Pages — Part 1: Employee Database, Leave Request, Leave Master

Last verified: 2026-06-12

> Scope: the people side of HRMS — the employee wizard + lifecycle, the leave-request transaction
> (frontend complete, **backend not implemented**), and the Leave Type master. All pages are Portal
> pages. BE file paths are relative to `../vowerp3be/`. Every documented endpoint was verified
> against the router source.

## Employee Database

Master record of every employee, built through a multi-step wizard. Each wizard section is saved
independently (per-section upsert), so an employee can exist half-complete. Employees carry an
HRMS-specific **lifecycle status** (35 Joined, 39 Resigned, 40 In Notice, 41 Terminated,
42 Retired, 46 Blacklisted) on top of the standard Draft 21 at creation — see
`approval-flows.md §Employee lifecycle`.

- List page: `src/app/dashboardportal/hrms/employeeDatabase/page.tsx` — DataGrid with
  Active/Inactive/Total tabs (`is_active` filter), server-side column filters (mapped to `f_*`
  query params: `f_emp_code`, `f_full_name`, `f_designation`, `f_branch`, `f_mobile`, `f_email`),
  status chips keyed on `EMPLOYEE_STATUS`.
- Create/edit/view: `employeeDatabase/addEmployee/page.tsx` (mode via `?mode=&eb_id=`).
  Note the layout: `hooks/` and `types/` sit at the **employeeDatabase/** level; step components
  live in `addEmployee/_components/`.
- How it works:
  - hooks/: `useEmployeeFormState` (+ unit test) — wizard form state across all steps, section
    progress, completed steps; `useEmployeeSetup` — memoized dropdown options (blood groups,
    sub-depts, branches, categories, contractors, reporting employees) from `employee_create_setup`
  - types/: `employeeTypes.ts` — all types + `EMPLOYEE_STATUS`, `EMPLOYEE_LIFECYCLE_STATUS`,
    frozen `WIZARD_STEPS` (7 steps; steps 3–6 are placeholders rendered by `PlaceholderStep`)
  - \_components/: `StepOverview` (step rail + status action menu), `PersonalInformationStep`
    (tabs: Personal/Contact/Address/Experience → `PersonalStep`, `ContactStep`, `AddressStep`,
    `ExperienceStep`), `OfficialInformationStep` (Work/Bank → `OfficialStep`, `BankStep`,
    `SalaryStructureStep`), `MedicalEnrollmentStep` (→ `PfEsiStep`), `EmployeePhotoUpload`,
    `StatusActionDialog` (lifecycle changes incl. resign date/reason), `PlaceholderStep`
- Service: `src/utils/hrmsService.ts` (employee + salary-structure sections)
- Endpoints (BE file `src/hrms/employee.py`, prefix `/api/hrms`):

| api.ts const | URL | Purpose |
|---|---|---|
| `HRMS_EMPLOYEE_LIST` | `/employee_list` | Paginated list (tabs, search, `f_*` column filters) |
| `HRMS_EMPLOYEE_BY_ID` | `/employee_by_id/{eb_id}` | All sections for edit/view |
| `HRMS_EMPLOYEE_CREATE_SETUP` | `/employee_create_setup` | Wizard dropdown options |
| `HRMS_DESIGNATIONS_BY_BRANCH` / `_BY_SUB_DEPT` | `/get_designations_by_branch`, `/get_designations_by_sub_dept` | Cascading designation options |
| `HRMS_CHECK_EMP_CODE_DUPLICATE` | `/check_emp_code_duplicate` | Per-branch emp-code uniqueness |
| `HRMS_EMPLOYEE_LOOKUP_BY_CODE` | `/employee_lookup_by_code` | Resolve emp code → employee |
| `HRMS_EMPLOYEE_CREATE` | `/employee_create` | Insert `hrms_ed_personal_details` (status 21) |
| `HRMS_EMPLOYEE_SECTION_SAVE` | `/employee_section_save` | Upsert one section (`SECTION_MODEL_MAP` in employee.py) |
| `HRMS_EMPLOYEE_PROGRESS` | `/employee_progress/{eb_id}` | Which sections are filled |
| `HRMS_EMPLOYEE_PHOTO_UPLOAD` / `HRMS_EMPLOYEE_PHOTO` | `/employee_photo_upload`, `/employee_photo/{eb_id}` | Photo upload (axios FormData) / GET / DELETE |
| `HRMS_EMPLOYEE_STATUS_UPDATE` | `/employee_status_update` | Lifecycle change; saves `hrms_ed_resign_details` for 39/41/42/46 |
| `HRMS_EMPLOYEE_SALARY_SCHEMES` | `/employee_salary_schemes` | Active pay scheme dropdown |
| `HRMS_EMPLOYEE_SALARY` | `/employee_salary/{eb_id}` | Current scheme mapping + structure |
| `HRMS_EMPLOYEE_SALARY_CHECK` | `/employee_salary_check` | **Preview** — evaluates scheme formulas (reuses `_evaluate_employee_formulas` from payRegister.py) without saving |
| `HRMS_EMPLOYEE_SALARY_SAVE` | `/employee_salary_save` | Upserts `pay_employee_payscheme` + replaces `pay_employee_structure` rows |

- Tables: `hrms_ed_personal_details` (header, holds `status_id`/`active`), `hrms_ed_contact_details`,
  `hrms_ed_address_details`, `hrms_ed_official_details`, `hrms_ed_bank_details`, `hrms_ed_pf`,
  `hrms_ed_esi`, `hrms_experience_details`, `hrms_ed_resign_details` (models in
  `src/models/hrms.py`).
- Scope: `co_id` from `useSelectedCompanyCoId()`; branch from `useSidebarContext().selectedBranches`
  (list page passes the joined list, addEmployee uses the first selected branch).
- Approval: **no** standard workflow — a lifecycle status machine instead
  (`approval-flows.md §Employee lifecycle`). The Salary step feeds the payroll chain (Part 2).

## Leave Request (frontend built — backend missing)

Leave transaction for a worker: pick employee by `eb_no`, leave type, date range, purpose; a
`LeaveBalancePanel` shows the per-type ledger. The FE types (`types/leaveRequestTypes.ts`) document
the intended tables `leave_transactions` / `leave_tran_details` and the standard status set
(21/1/20/3/4/5/6) with backend-driven `approve_button`/`reject_button` flags.

**⚠ Dead routes:** every endpoint below resolves to `/api/hrms/leave_request_*` (or
`/leave_ledger`, `/worker_by_eb_no`) — **none exist in `../vowerp3be/src/`** (verified by grep,
2026-06-12). The pages render but every fetch will 404 until the backend router lands.

- List page: `src/app/dashboardportal/hrms/hrmsmasters/leaveRequest/page.tsx` — DataGrid with
  leave-type / eb_no / status filters, status chips.
- Create/edit/view: `leaveRequest/createLeaveRequest/page.tsx` (mode via `?mode=&id=`) with
  approve/reject actions in view mode (driven by `approve_button`/`reject_button` from the detail
  payload).
- How it works:
  - hooks/: `createLeaveRequest/hooks/useLeaveRequestForm.ts` — values, worker lookup by `eb_no`
    (only employees with `emp_status === 35` Joined are accepted), leave-type options, ledger
  - utils/: `createLeaveRequest/utils/schema.ts` — Zod `leaveRequestFormSchema`
  - \_components/: `LeaveBalancePanel.tsx` (per-type taken vs allowed)
  - types/: `leaveRequest/types/leaveRequestTypes.ts` (status labels/colors, row/detail shapes)
- Service: `src/utils/hrmsService.ts` (leave-request section)
- Endpoints (const → URL → BE file: **none — not implemented**):

| api.ts const | URL (`/api/hrms` prefix) | Backend |
|---|---|---|
| `LEAVE_REQUEST_TABLE` | `/leave_request_list` | ❌ missing |
| `LEAVE_REQUEST_BY_ID` | `/leave_request_by_id/{id}` | ❌ missing |
| `LEAVE_REQUEST_CREATE` / `LEAVE_REQUEST_EDIT` | `/leave_request_create`, `/leave_request_edit/{id}` | ❌ missing |
| `LEAVE_REQUEST_APPROVE` / `LEAVE_REQUEST_REJECT` | `/leave_request_approve/{id}`, `/leave_request_reject/{id}` (PUT) | ❌ missing |
| `LEAVE_LEDGER_BY_EB` | `/leave_ledger/{eb_no}` | ❌ missing |
| `WORKER_BY_EB_NO` | `/worker_by_eb_no/{eb_no}` | ❌ missing |

- Scope: `co_id` from `useSelectedCompanyCoId()`; no branch filter.
- Approval: **planned** (21→20→3/4 per FE types) — see `approval-flows.md §Leave Request (planned)`.
  Building the backend is a `wire-api` + `add-approval-workflow` job.

## Leave Master (Leave Type)

CRUD master for leave types (`hrms_leave_types_mst`: code, description, payable Y/N, leave hours).
Lives in a **separate top-level folder** — `src/app/dashboardportal/hrmsmasters/LeaveMaster/` —
not under `hrms/`. The backend router sits in `src/hrms/leaveType.py` but is registered under
**`/api/hrmsMasters`** (main.py:217), the same prefix as the `src/masters/` HR masters.

- List page: `LeaveMaster/page.tsx` — DataGrid + dialog-based create/edit (no separate route).
- Create/edit dialog: `LeaveMaster/CreateLeaveTypePage.tsx` — a MuiForm dialog **component**
  (despite the `Page` name), opened from the list with optional `editId`.
- How it works: no hooks/ or types/ folders — both files call `fetchWithCookie` with
  `apiRoutesPortalMasters` constants directly. `co_id` is read straight from
  `localStorage("sidebar_selectedCompany")` rather than the `useSelectedCompanyCoId` hook.
- Endpoints (BE file `src/hrms/leaveType.py`, prefix `/api/hrmsMasters`):

| api.ts const | URL | Purpose |
|---|---|---|
| `LEAVE_TYPE_TABLE` | `/get_leave_type_table` | Paginated list (`company_id`-scoped, `is_active = 1`) |
| `LEAVE_TYPE_BY_ID` | `/get_leave_type_by_id/{leave_type_id}` | Load for edit |
| `LEAVE_TYPE_CREATE` | `/leave_type_create` | Insert (code unique per company) |
| `LEAVE_TYPE_EDIT` | `/leave_type_edit/{leave_type_id}` | Update (PUT) |

- Model: `HrmsLeaveTypesMst` in `../vowerp3be/src/models/mst.py`. The leaveRequest pages reuse
  `LEAVE_TYPE_TABLE` for their leave-type dropdown (`fetchLeaveTypeOptions`).
- Approval: **no**.
