# HRMS Module — General Documentation

## 1. Overview

The HRMS (Human Resource Management System) module is being migrated from the legacy **vow-ui-2.0** (React 17, Redux/Saga, class components) to the modern **vowerp3ui** (Next.js 15, React 19, TypeScript) frontend and **vowerp3be** (FastAPI, SQLAlchemy) backend.

**Phase 1 Scope:** Employee Database + Pay Scheme  
**Dashboard:** Portal (`/dashboardportal/hrms/`)  
**Persona:** Tenant Portal — uses `get_tenant_db` (backend) and `fetchWithCookie` (frontend)

---

## 2. Legacy Module Inventory (vow-ui-2.0)

The legacy HRMS is located in `src/Pages/HR_Management/` and has these sub-modules:

| Sub-module | Legacy Files | Status in New Codebase |
|------------|-------------|----------------------|
| **Employee Database** | `AddEmployees/` (7-step wizard, 130+ fields) | Phase 1 — needs full build |
| **Pay Scheme** | `PayScheme/`, `PaySchemeParameters/` | Phase 1 — needs full build |
| **Leave Management** | `LeaveManagement/`, `ApplyLeave/` | Phase 2 (future) |
| **Attendance** | `ViewAttendance/`, `BioMetricView/` | Phase 2 (future) |
| **Expense Management** | `ExpenseManagement/` | Phase 2 (future) |

### Legacy Employee Wizard Steps
The legacy `AddEmployees/index.js` implements a 7-step wizard:

| Step | Label | Key Fields |
|------|-------|-----------|
| 1 | Personal Info | Name, DOB, gender, blood group, email, Aadhar/PAN/passport, contact, address (residential + correspondent), education, experience |
| 2 | Official Info | Department, branch, designation, category, emp code, DOJ, bank details, salary structure, PF, ESI |
| 3 | Upload Documents | Aggregate view of all uploaded documents |
| 4 | Generate Letters | Offer/appointment letter templates |
| 5 | Onboarding | Welcome checklist |
| 6 | Shift & Leave | Shift timing, biometric mapping, leave policy |
| 7 | Medical Enrollment | ESI/Medical policy assignment |

The legacy wizard uses a unified payload object (`Makepayload.js`) with 130+ fields and sends all data in a single API call.

---

## 3. Database Schema (Existing ORM Models)

All HRMS database tables already have ORM model definitions in `vowerp3be/src/models/hrms.py`. **No new tables are needed for Phase 1.**

### Employee Tables

| Table | ORM Model | PK | Key Columns |
|-------|-----------|-----|-------------|
| `hrms_ed_personal_details` | `HrmsEdPersonalDetails` | `eb_id` (BigInt, auto) | first_name, last_name, gender, date_of_birth, blood_group, email_id, marital_status, country_id, aadhar_no, pan_no, passport_no, co_id, status_id, active |
| `hrms_ed_address_details` | `HrmsEdAddressDetails` | `tbl_hrms_ed_contact_details_id` | eb_id, address_type (1=residential, 2=correspondent), country_id, state_id, city_name, address_line_1/2, pin_code, is_correspondent_address |
| `hrms_ed_bank_details` | `HrmsEdBankDetails` | `tbl_hrms_ed_bank_detail_id` | eb_id, ifsc_code, bank_acc_no, bank_name, bank_branch_name, is_verified |
| `hrms_ed_contact_details` | `HrmsEdContactDetails` | `contact_detail_id` | eb_id, mobile_no, emergency_no |
| `hrms_ed_official_details` | `HrmsEdOfficialDetails` | `tbl_hrms_ed_official_detail_id` | eb_id, department_id, branch_id, catagory_id (sic), designation_id, date_of_join, emp_code, reporting_eb_id, contractor_id, probation_period |
| `hrms_ed_pf` | `HrmsEdPf` | `tbl_hrms_ed_pf_id` | eb_id, pf_no, pf_uan_no, pf_previous_no, pf_transfer_no, nominee_name, pf_date_of_join |
| `hrms_ed_esi` | `HrmsEdEsi` | `tbl_hrms_ed_esi_id` | eb_id, esi_no, medical_policy_no |
| `hrms_ed_resign_details` | `HrmsEdResignDetails` | `tbl_hrms_ed_resignation_details_id` | eb_id, resigned_date, release_date, type_of_resign |
| `hrms_experience_details` | `HrmsExperienceDetails` | `auto_id` | eb_id, company_name, from_date, to_date, designation, project, co_id |
| `hrms_blood_group` | `HrmsBloodGroup` | `blood_group_id` | blood_group_name |

### Pay Tables

| Table | ORM Model | PK | Key Columns |
|-------|-----------|-----|-------------|
| `pay_components` | `PayComponents` | `ID` | code, name, type (0=Input, 1=Earning, 2=Deduction, 3=Summary), company_id, parent_id, default_value, status |
| `pay_company_components` | `PayCompanyComponents` | `ID` | component_id, businessunit_id, code, name, effective_from, ends_on |
| `pay_components_custom` | `PayComponentsCustom` | `ID` | component_id, value, employeeid, pay_period_id |
| `pay_customer_employee_payscheme` | `PayCustomerEmployeePayscheme` | `ID` | employeeid, pay_scheme_id, status |
| `pay_customer_employee_payroll` | `PayCustomerEmployeePayroll` | `ID` | employeeid, component_id, payperiod_id, amount, payscheme_id |
| `pay_customer_employee_period` | `PayCustomerEmployeePeriod` | `ID` | from_date, to_date, payscheme_id, customer_id, branch_id |
| `pay_customer_employee_structure` | `PayCustomerEmployeeStructure` | `ID` | employeeid, payscheme_id, component_id, amount, effective_from |
| `pay_employee_payperiod` | `PayEmployeePayperiod` | `ID` | employeeid, pay_period_id, basic, net, gross |
| `pay_employee_payroll` | `PayEmployeePayroll` | `ID` | eb_id, component_id, payperiod_id, amount, payscheme_id |
| `pay_employee_payscheme` | `PayEmployeePayscheme` | `ID` | eb_id, pay_scheme_id, status |
| `pay_employee_structure` | `PayEmployeeStructure` | `ID` | eb_id, pay_scheme_id, component_id, amount, effective_from |
| `pay_period` | `PayPeriod` | `ID` | from_date, to_date, payscheme_id, branch_id |
| `pay_external_components` | `PayExternalComponents` | `ID` | eb_id, component_id, value, pay_period_id |
| `pay_generic` | `PayGeneric` | `id` | date_time, component_id, value, eb_id |
| `pay_employee_payroll_status` | `PayEmployeePayrollStatus` | `ID` | pay_scheme_id, business_unit_id, pay_period_id, status, iteration_cnt |
| `pay_employee_payroll_status_log` | `PayEmployeePayrollStatusLog` | `ID` | (same as above, audit trail) |

### Known Production Typos (DO NOT FIX)
- `catagory_id` in `hrms_ed_official_details` (should be `category_id`)
- `relegion_name` in `hrms_ed_personal_details` (should be `religion_name`)

---

## 4. What Needs to Be Built

### 4.1 Shared UI Components (New)

Two shared components are required that don't exist yet in `src/components/ui/`:

**Stepper Component** (`stepper.tsx`)
- A horizontal step progress indicator for wizard-style flows
- Supports: completed/active/disabled/error states, click navigation (only to completed steps), numbered labels
- Will be reused by Employee wizard and potentially other multi-step flows
- Needs: Storybook story + unit tests

**FileUpload Component** (`fileUpload.tsx`)
- Drag-and-drop + click-to-browse file selector
- Supports: single/multiple files, file type/size validation, existing files display, delete, loading state
- Will be reused across education docs, experience proofs, document uploads
- Needs: Storybook story + unit tests

### 4.2 Backend API Endpoints (vowerp3be)

Create the `src/hrms/` module with these endpoint groups:

**Employee Endpoints** (`/api/hrms/...`):
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/employee_list` | Paginated list with search, filters |
| GET | `/employee_by_id/{eb_id}` | Full employee detail (all sections) |
| GET | `/employee_create_setup` | Dropdown options (departments, branches, categories, etc.) |
| POST | `/employee_create` | Create personal details → returns `{eb_id}` |
| POST | `/employee_section_save` | Save individual wizard step data by section name |
| GET | `/employee_progress/{eb_id}` | Returns completion status for each wizard step |
| POST | `/employee_upload_file` | Multipart file upload |
| DELETE | `/employee_delete_file/{file_id}` | Delete uploaded file |

**Pay Scheme Endpoints** (`/api/hrms/...`):
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/pay_scheme_list` | Paginated list |
| GET | `/pay_scheme_by_id/{id}` | Detail with component breakdown |
| GET | `/pay_scheme_create_setup` | Dropdown options (wage types, designations, etc.) |
| POST | `/pay_scheme_create` | Create scheme + components |
| PUT | `/pay_scheme_update/{id}` | Update scheme |

**Pay Parameters Endpoints** (`/api/hrms/...`):
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/pay_param_list` | Paginated list |
| GET | `/pay_param_create_setup` | Setup options |
| POST | `/pay_param_create` | Create parameter |
| PUT | `/pay_param_update/{id}` | Update parameter |

### 4.3 Backend Module Files

```
vowerp3be/src/hrms/
├── __init__.py
├── employee.py       # Employee FastAPI router (APIRouter)
├── payScheme.py      # Pay Scheme router
├── payParam.py       # Pay Parameters router
├── query.py          # SQL text queries (sqlalchemy.text)
├── schemas.py        # Pydantic request/response models
└── constants.py      # Status IDs, section enums, step definitions
```

Plus test files:
```
vowerp3be/src/test/
├── test_hrms_employee.py
└── test_hrms_pay_scheme.py
```

### 4.4 Frontend API Layer (vowerp3ui)

**API Routes** — extend `src/utils/api.ts` with HRMS route definitions  
**Service Layer** — create `src/utils/hrmsService.ts` with `fetchWithCookie` wrapper functions for all endpoints

### 4.5 Frontend Pages (vowerp3ui)

```
src/app/dashboardportal/hrms/
├── page.tsx                              # HRMS module landing page
├── employees/
│   ├── page.tsx                          # Employee list (IndexWrapper)
│   └── createEmployee/
│       ├── page.tsx                      # 7-step wizard orchestrator
│       ├── _components/                  # 15 step components (see §6)
│       ├── hooks/                        # 5 hooks (see §6)
│       ├── types/
│       │   └── employeeTypes.ts
│       └── utils/
│           ├── employeeConstants.ts
│           ├── employeeFactories.ts
│           └── employeeMappers.ts
├── payScheme/
│   ├── page.tsx                          # Pay scheme list (IndexWrapper)
│   └── createPayScheme/
│       ├── page.tsx                      # Create/edit/view
│       ├── _components/
│       ├── hooks/
│       ├── types/
│       └── utils/
└── paySchemeParameters/
    ├── page.tsx
    └── createPayParam/
        ├── page.tsx
        ├── _components/
        ├── hooks/
        ├── types/
        └── utils/
```

---

## 5. Architecture Decisions

### 5.1 Wizard vs Single-Form Approach
The legacy sends all 130+ fields in one API call. **The new implementation uses per-section saves:**
- Each wizard step saves independently via `POST /employee_section_save`
- Server tracks progress per employee (`GET /employee_progress/{eb_id}`)
- Allows partial save — user can leave and resume
- Reduces validation complexity (validate one section at a time)

### 5.2 Frontend Patterns to Follow

| Pattern | Implementation |
|---------|---------------|
| List pages | `IndexWrapper` from `src/components/ui/IndexWrapper` |
| Form pages | `TransactionWrapper` + `MuiForm` (schema-driven) |
| Wizard navigation | New `Stepper` component + `useEmployeeSteps` hook |
| Form state | Custom `useEmployeeFormState` hook (per-section) |
| Dropdown options | `useTransactionSetup` + `useDeferredOptionCache` for dependent dropdowns |
| Validation | Zod schemas per step via `useEmployeeValidation` |
| File uploads | New `FileUpload` component + service functions |
| Mode-aware rendering | `mode` prop (create/edit/view) on all form components |

### 5.3 Backend Patterns to Follow

| Pattern | Implementation |
|---------|---------------|
| Router structure | `APIRouter` per feature (employee, payScheme, payParam) |
| DB access | `Depends(get_tenant_db)` for Portal persona |
| Auth | `Depends(get_current_user_with_refresh)` on all endpoints |
| Queries | Mix of ORM (simple CRUD) and `sqlalchemy.text()` (complex joins) |
| Responses | Always wrap in `{"data": [...]}` format |
| Error handling | Validate co_id first, try/except with HTTPException |

### 5.4 Status IDs (Standard Approval Workflow)

| ID | Status | Usage |
|----|--------|-------|
| 21 | Draft | Initial creation (employee personal details saved) |
| 1 | Open | All mandatory steps completed |
| 20 | Pending Approval | Sent for manager/HR approval |
| 3 | Approved | Approved — employee is active |
| 4 | Rejected | Rejected — needs revision |
| 6 | Cancelled | Cancelled/withdrawn |

---

## 6. Detailed Component Specifications

### 6.1 Employee Wizard Step Components

| Component | Step | Key Fields | Special Behavior |
|-----------|------|-----------|-----------------|
| `PersonalDetailsStep` | 1 | first_name, last_name, gender, dob, blood_group, email, marital_status, country, religion, father_spouse_name, passport_no, driving_licence_no, pan_no, aadhar_no | Profile picture upload; Aadhar 12-digit validation |
| `ContactDetailsStep` | 1 | mobile_no, emergency_no | 10-digit mobile validation |
| `AddressDetailsStep` | 1 | address_type, country, state, city, address_line_1/2, pin_code | "Same as residential" checkbox copies fields; Country→State dependent dropdown |
| `EducationDetailsStep` | 1 | Dynamic table: qualification, university, percentage, year, file_id | Add/remove rows; file upload per row |
| `ExperienceStep` | 1 | Dynamic table: company_name, designation, from_date, to_date, project, contact | Add/remove rows; file upload per row |
| `OfficialInfoStep` | 2 | department_id, branch_id, category_id, designation_id, emp_level_id, doj, probation, reporting_eb_id, contractor_id, emp_code | Department→Category cascade |
| `BankDetailsStep` | 2 | ifsc_code, bank_acc_no, bank_name, bank_branch_name, is_verified | IFSC auto-lookup |
| `SalaryStructureStep` | 2 | pay_scheme dropdown → component grid (read-only) | Shows Input/Earning/Deduction/Summary components |
| `PfDetailsStep` | 7 | pf_no, pf_uan_no, pf_previous_no, pf_transfer_no, nominee_name, relationship_name, pf_date_of_join | UAN 12-digit validation; DOJ cross-check |
| `EsiDetailsStep` | 7 | esi_no, medical_policy_no | Mutually exclusive fields |
| `UploadDocumentsStep` | 3 | Aggregate file listing from all steps | Read-only status grid |
| `GenerateLettersStep` | 4 | Letter template selection, preview, send | PDF generation + email |
| `OnboardingStep` | 5 | Checklist items | Read-only display |
| `ShiftTimingStep` | 6 | Shift dropdown, biometric mapping | Dynamic detail grid |
| `LeavePolicyStep` | 6 | Leave policy dropdown → leave type details | Auto-populate from policy |

### 6.2 Employee Hooks

| Hook | Purpose | Key State/Returns |
|------|---------|------------------|
| `useEmployeeSteps` | Wizard navigation | activeStep, completedSteps, goToStep(), completeStep() |
| `useEmployeeFormState` | Per-section form values | personalDetails, contactDetails, addressDetails, officialDetails, bankDetails, pfDetails, esiDetails, educationRows[], experienceRows[] |
| `useEmployeeSetup` | Fetch dropdown options | branchOptions, deptOptions, designationOptions, bloodGroupOptions, countryOptions, stateOptions, categoryOptions |
| `useEmployeeValidation` | Zod schemas per step | personalDetailsSchema, contactSchema, addressSchema, officialSchema, bankSchema, pfSchema, esiSchema |
| `useEmployeeProgress` | Step completion tracking | stepProgress, refreshProgress(), isStepComplete() |

### 6.3 Pay Scheme Components

| Component | Purpose |
|-----------|---------|
| `PaySchemeFillDetails` | Header form: code, name, wage_type, description, designation, work_location, copy_from |
| `PayComponentTable` | 4-category editable grid (Input/Earning/Deduction/Summary components) |
| `PaySchemePreview` | Read-only summary before save |

---

## 7. API Contract Specifications

### 7.1 Employee List Response
```json
{
  "data": [
    {
      "eb_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "emp_code": "EMP001",
      "department_name": "Engineering",
      "designation_name": "Software Engineer",
      "branch_name": "Main Branch",
      "date_of_join": "2024-01-15",
      "status_id": 3,
      "status_name": "Approved"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20
}
```

### 7.2 Employee Create Setup Response
```json
{
  "branches": [{"label": "Main", "value": "1"}],
  "departments": [{"label": "Engineering", "value": "1"}],
  "designations": [{"label": "Software Engineer", "value": "1"}],
  "categories": [{"label": "Permanent", "value": "1"}],
  "blood_groups": [{"label": "O+", "value": "1"}],
  "countries": [{"label": "India", "value": "73"}],
  "emp_levels": [{"label": "L1", "value": "1"}],
  "reporting_managers": [{"label": "Jane Smith (EMP002)", "value": "2"}],
  "contractors": [{"label": "ABC Corp", "value": "1"}]
}
```

### 7.3 Employee Section Save Request
```json
{
  "eb_id": 1,
  "section": "personal",
  "data": {
    "first_name": "John",
    "last_name": "Doe",
    "gender": "Male",
    "date_of_birth": "1990-05-15",
    "email_id": "john@example.com",
    "aadhar_no": "123456789012"
  }
}
```

### 7.4 Employee Progress Response
```json
{
  "steps": [
    {"step_id": 1, "step_name": "Personal Info", "completed": true},
    {"step_id": 2, "step_name": "Official Info", "completed": true},
    {"step_id": 3, "step_name": "Upload Documents", "completed": false},
    {"step_id": 4, "step_name": "Generate Letters", "completed": false},
    {"step_id": 5, "step_name": "Onboarding", "completed": false},
    {"step_id": 6, "step_name": "Shift & Leave", "completed": false},
    {"step_id": 7, "step_name": "Medical Enrollment", "completed": false}
  ]
}
```

---

## 8. Validation Rules

### Personal Details
- `first_name`: Required, max 50 chars
- `email_id`: Valid email format
- `aadhar_no`: Exactly 12 digits
- `pan_no`: Pattern `[A-Z]{5}[0-9]{4}[A-Z]{1}`
- `passport_no`: Max 20 chars
- `date_of_birth`: Must be in the past, age >= 18

### Contact Details
- `mobile_no`: Exactly 10 digits
- `emergency_no`: Exactly 10 digits

### Address Details
- `address_line_1`: Required, max 150 chars
- `pin_code`: Min 5 digits

### Official Details
- `department_id`, `branch_id`, `designation_id`: Required
- `date_of_join`: Required, must be a valid date
- `emp_code`: Required, unique within company

### Bank Details
- `ifsc_code`: Required, 11 chars pattern `[A-Z]{4}0[A-Z0-9]{6}`
- `bank_acc_no`: Required, max 20 chars

### PF Details
- `pf_uan_no`: Exactly 12 digits
- `pf_date_of_join`: Must be >= official date_of_join

### ESI Details
- `esi_no` and `medical_policy_no`: Mutually exclusive (one or the other)

---

## 9. Technology Mapping (Legacy → New)

| Legacy | New | Notes |
|--------|-----|-------|
| Redux state + Saga | React hooks + `fetchWithCookie` | No global state for form data |
| `Gridwithcustomview` | `IndexWrapper` + `MuiDataGrid` | Built-in pagination |
| `DynamicSelect` | `MuiForm` select field / `SearchableSelect` | Schema-driven |
| `DynamicFormFields` | `MuiForm` schema array | Field array with `type`, `name`, `label`, `options` |
| `serverApi.*` constants | `apiRoutes.hrms.*` in `api.ts` | Centralized route definitions |
| `Makepayload.js` unified object | Per-section saves with Zod validation | Smaller, validated payloads |
| Step enable/disable logic | `useEmployeeSteps` hook | Set-based completion tracking |
| Class component state | React hooks + `useCallback`/`useMemo` | Functional components only |
| Redux Saga side-effects | Service functions + hooks | Direct async calls |
| MUI v5 direct imports | MUI via `src/components/ui/` wrappers | Never import MUI directly in pages |

---

## 10. Out of Scope (Phase 2+)

These HRMS sub-modules are NOT in Phase 1 but should be planned for future:

| Module | Complexity | Dependencies |
|--------|-----------|-------------|
| Leave Management | Medium | Employee Database must exist first |
| Attendance / Biometric | High | Shift timing from Employee wizard |
| Expense Management | Medium | Employee + Department master |
| Payroll Processing | High | Pay Scheme + Pay Period + Pay Components |
| Reports (Employee, Pay, Leave) | Medium | All above modules |
