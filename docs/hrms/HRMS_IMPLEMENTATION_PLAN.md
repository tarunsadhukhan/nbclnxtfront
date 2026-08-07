# HRMS Module — Phase-wise Implementation Plan with Agent Teams

## Agent Team Structure

### Teams

| Team | Agent | Repo | Responsibilities |
|------|-------|------|-----------------|
| **BE-1** | Backend Core | `vowerp3be` | Module structure, schemas, queries, employee endpoints |
| **BE-2** | Backend Pay | `vowerp3be` | Pay scheme endpoints, pay parameter endpoints, tests |
| **FE-0** | Frontend Shared | `vowerp3ui` | Stepper + FileUpload shared components, API routes, service layer |
| **FE-1** | Frontend Employee | `vowerp3ui` | Employee list + wizard pages, hooks, types, step components |
| **FE-2** | Frontend Pay | `vowerp3ui` | Pay scheme + parameters pages, hooks, types, components |

### Coordination Rules

1. **BE-1 completes schemas before FE-0 starts service layer** — FE-0 needs exact response shapes to type the service functions
2. **FE-0 completes shared components before FE-1/FE-2 start** — The Stepper and FileUpload are prerequisites for wizard pages
3. **BE-1 and FE-1 can work in parallel** once API route definitions are agreed (Phase 0)
4. **BE-2 and FE-2 can work in parallel** once pay scheme schemas are defined
5. **Each team writes its own tests** — no cross-team test dependencies
6. **Integration testing happens after each phase completes** — verify FE↔BE communication

---

## Phase 0: Foundation (PREREQUISITE — Blocks All Other Phases)

> **Goal:** Establish shared infrastructure, API route contracts, and service layer so all teams have a stable foundation.

### Phase 0A: API Route Contract (FE-0 + BE-1 coordinate)

**Duration context:** Small scope, mostly type definitions and route strings.

**FE-0 Tasks:**
1. **Define HRMS API routes in `src/utils/api.ts`**
   - Add an `hrms` section to `apiRoutes` object
   - All route paths listed below (source of truth for both teams):
   ```
   employee_list:          /api/hrms/employee_list
   employee_by_id:         /api/hrms/employee_by_id/{eb_id}
   employee_create_setup:  /api/hrms/employee_create_setup
   employee_create:        /api/hrms/employee_create
   employee_section_save:  /api/hrms/employee_section_save
   employee_progress:      /api/hrms/employee_progress/{eb_id}
   employee_upload_file:   /api/hrms/employee_upload_file
   employee_delete_file:   /api/hrms/employee_delete_file/{file_id}
   pay_scheme_list:        /api/hrms/pay_scheme_list
   pay_scheme_by_id:       /api/hrms/pay_scheme_by_id/{id}
   pay_scheme_create_setup:/api/hrms/pay_scheme_create_setup
   pay_scheme_create:      /api/hrms/pay_scheme_create
   pay_scheme_update:      /api/hrms/pay_scheme_update/{id}
   pay_param_list:         /api/hrms/pay_param_list
   pay_param_create_setup: /api/hrms/pay_param_create_setup
   pay_param_create:       /api/hrms/pay_param_create
   pay_param_update:       /api/hrms/pay_param_update/{id}
   ```
   - All routes accept `?co_id=` query parameter

**BE-1 Tasks:**
1. **Create backend module skeleton**
   ```
   src/hrms/__init__.py      (empty)
   src/hrms/constants.py     (status IDs, section enum)
   src/hrms/schemas.py       (Pydantic models — empty stubs)
   src/hrms/query.py         (empty stubs)
   src/hrms/employee.py      (router with placeholder endpoints)
   src/hrms/payScheme.py     (router with placeholder endpoints)
   src/hrms/payParam.py      (router with placeholder endpoints)
   ```
2. **Register routers in `src/main.py`**
   ```python
   from src.hrms.employee import router as hrms_employee_router
   from src.hrms.payScheme import router as hrms_pay_scheme_router
   from src.hrms.payParam import router as hrms_pay_param_router
   
   app.include_router(hrms_employee_router, prefix="/api/hrms", tags=["hrms-employee"])
   app.include_router(hrms_pay_scheme_router, prefix="/api/hrms", tags=["hrms-pay-scheme"])
   app.include_router(hrms_pay_param_router, prefix="/api/hrms", tags=["hrms-pay-param"])
   ```

**Coordination checkpoint:** BE-1 shares Pydantic schema stubs → FE-0 uses them to type the service layer.

---

### Phase 0B: Shared UI Components (FE-0 only)

**FE-0 Tasks:**

1. **Build `src/components/ui/stepper.tsx`**
   - Props interface:
     ```typescript
     interface StepperProps {
       steps: { label: string; description?: string; icon?: React.ReactNode }[];
       activeStep: number;
       onStepClick: (stepIndex: number) => void;
       completedSteps: Set<number>;
       errorSteps?: Set<number>;
       orientation?: "horizontal" | "vertical";
       disabled?: boolean;
     }
     ```
   - Completed steps show checkmark; active step highlighted with theme primary color
   - Disabled steps (index > max completed + 1) are not clickable
   - Error steps show red indicator
   - Tailwind styling + theme tokens for colors
   - **Deliverables:** Component + `stepper.test.tsx` + `src/stories/Stepper.stories.tsx`

2. **Build `src/components/ui/fileUpload.tsx`**
   - Props interface:
     ```typescript
     interface FileUploadProps {
       onUpload: (file: File) => Promise<{ fileId: string; fileName: string }>;
       onDelete?: (fileId: string) => void;
       accept?: string;        // MIME types, e.g. "image/*,.pdf"
       maxSizeMB?: number;     // default 5
       multiple?: boolean;     // default false
       existingFiles?: { fileId: string; fileName: string; url?: string }[];
       disabled?: boolean;
     }
     ```
   - Drag-and-drop zone + "Browse" button
   - File type and size validation with error messages
   - Upload progress indicator
   - List of uploaded files with delete icon
   - **Deliverables:** Component + `fileUpload.test.tsx` + `src/stories/FileUpload.stories.tsx`

3. **Create `src/utils/hrmsService.ts`**
   - All functions use `fetchWithCookie` from `apiClient2.ts`
   - Functions to implement:
     ```typescript
     // Employee
     fetchEmployeeList(coId: string, params: { page: number; page_size: number; search?: string })
     fetchEmployeeById(coId: string, ebId: string)
     fetchEmployeeCreateSetup(coId: string)
     createEmployee(coId: string, payload: Record<string, unknown>)
     saveEmployeeSection(coId: string, ebId: string, section: string, data: Record<string, unknown>)
     fetchEmployeeProgress(coId: string, ebId: string)
     uploadEmployeeFile(coId: string, file: File, metadata: Record<string, unknown>)
     deleteEmployeeFile(coId: string, fileId: string)
     
     // Pay Scheme
     fetchPaySchemeList(coId: string, params: { page: number; page_size: number; search?: string })
     fetchPaySchemeById(coId: string, id: string)
     fetchPaySchemeCreateSetup(coId: string)
     createPayScheme(coId: string, payload: Record<string, unknown>)
     updatePayScheme(coId: string, id: string, payload: Record<string, unknown>)
     
     // Pay Parameters
     fetchPayParamList(coId: string, params: { page: number; page_size: number })
     fetchPayParamCreateSetup(coId: string)
     createPayParam(coId: string, payload: Record<string, unknown>)
     updatePayParam(coId: string, id: string, payload: Record<string, unknown>)
     ```
   - **Deliverable:** `hrmsService.ts` (tests are optional here — tested indirectly via hook tests)

**Completion criteria for Phase 0:**
- [ ] API routes defined in `api.ts`
- [ ] Backend skeleton with registered routers (returns 200 stubs)
- [ ] Stepper component with tests + Storybook story
- [ ] FileUpload component with tests + Storybook story
- [ ] Service layer with all function stubs typed

---

## Phase 1: Backend — Employee + Pay Endpoints

> **Goal:** Fully functional backend endpoints for employee CRUD and pay scheme CRUD.
> **Agents:** BE-1 (employee), BE-2 (pay scheme) — work in parallel.

### Phase 1A: Employee Backend (BE-1)

**1A.1: Implement `src/hrms/schemas.py` — Employee section**
- Pydantic models:
  ```python
  class PersonalDetailsPayload(BaseModel):
      first_name: str
      middle_name: str | None = None
      last_name: str | None = None
      gender: str | None = None
      date_of_birth: date | None = None
      blood_group: str | None = None
      email_id: str | None = None
      marital_status: int | None = 0
      country_id: int | None = 73
      relegion_name: str | None = None  # matches DB typo
      father_spouse_name: str | None = None
      passport_no: str | None = None
      driving_licence_no: str | None = None
      pan_no: str | None = None
      aadhar_no: str | None = None
  
  class AddressDetailsPayload(BaseModel):
      address_type: int = 1
      country_id: int | None = None
      state_id: int | None = None
      city_name: str | None = None
      address_line_1: str
      address_line_2: str | None = None
      pin_code: int
      is_correspondent_address: int = 0
  
  class ContactDetailsPayload(BaseModel):
      mobile_no: str
      emergency_no: str | None = None
  
  class OfficialDetailsPayload(BaseModel):
      department_id: int
      branch_id: int
      catagory_id: int              # matches DB typo
      designation_id: int
      date_of_join: date | None = None
      probation_period: int | None = None
      minimum_working_commitment: int = 0
      reporting_eb_id: int
      emp_code: str
      legacy_code: str | None = None
      contractor_id: int | None = None
      office_mobile_no: str | None = None
      office_email_id: str | None = None
  
  class BankDetailsPayload(BaseModel):
      ifsc_code: str
      bank_acc_no: str
      bank_name: str
      bank_branch_name: str
      is_verified: int = 0
  
  class PfDetailsPayload(BaseModel):
      pf_no: str
      pf_uan_no: str
      pf_previous_no: str
      pf_transfer_no: str | None = None
      nominee_name: str | None = None
      relationship_name: str | None = None
      pf_date_of_join: date | None = None
  
  class EsiDetailsPayload(BaseModel):
      esi_no: str | None = None
      medical_policy_no: str | None = None
  
  class ExperienceDetailsPayload(BaseModel):
      company_name: str | None = None
      from_date: date | None = None
      to_date: date | None = None
      designation: str | None = None
      project: str | None = None
      contact: str | None = None
  
  class SectionSaveRequest(BaseModel):
      eb_id: int
      section: str  # "personal", "address", "contact", "official", "bank", "pf", "esi", "experience"
      data: dict
  ```

**1A.2: Implement `src/hrms/query.py` — Employee queries**
- `get_employee_list(co_id)` — JOIN `hrms_ed_personal_details` with `hrms_ed_official_details`, `dept_mst`, `designation_mst`, `branch_mst`, `status_mst` for display names. Pagination via `LIMIT :limit OFFSET :offset`. Search on `first_name`, `last_name`, `emp_code`.
- `get_employee_by_id(eb_id, co_id)` — Return all fields from all HRMS tables for one employee. Use LEFT JOINs so partial data is returned.
- `get_employee_create_setup(co_id)` — Multiple queries to `branch_mst`, `dept_mst`, `designation_mst`, `hrms_blood_group`, `country_mst` (if exists). Return each as a list.
- `get_employee_progress(eb_id)` — Check existence of rows in each child table:
  ```sql
  SELECT
    EXISTS(SELECT 1 FROM hrms_ed_personal_details WHERE eb_id=:eb_id) as personal,
    EXISTS(SELECT 1 FROM hrms_ed_contact_details WHERE eb_id=:eb_id) as contact,
    EXISTS(SELECT 1 FROM hrms_ed_address_details WHERE eb_id=:eb_id) as address,
    EXISTS(SELECT 1 FROM hrms_ed_official_details WHERE eb_id=:eb_id) as official,
    EXISTS(SELECT 1 FROM hrms_ed_bank_details WHERE eb_id=:eb_id) as bank,
    EXISTS(SELECT 1 FROM hrms_ed_pf WHERE eb_id=:eb_id) as pf,
    EXISTS(SELECT 1 FROM hrms_ed_esi WHERE eb_id=:eb_id) as esi
  ```

**1A.3: Implement `src/hrms/employee.py` — Endpoints**
- All endpoints use `db: Session = Depends(get_tenant_db)` and `token_data: dict = Depends(get_current_user_with_refresh)`
- Validate `co_id` on every request
- `GET /employee_list`:
  - Query params: `co_id`, `page` (default 1), `page_size` (default 20), `search` (optional)
  - Execute `get_employee_list` with pagination params
  - Return `{"data": [...], "total": N, "page": P, "page_size": S}`
- `GET /employee_by_id/{eb_id}`:
  - Query params: `co_id`
  - Return all sections as nested object
  - Return 404 if not found
- `GET /employee_create_setup`:
  - Query params: `co_id`
  - Return `{"branches": [...], "departments": [...], "designations": [...], ...}`
- `POST /employee_create`:
  - Body: `PersonalDetailsPayload` + `co_id` query param
  - INSERT into `hrms_ed_personal_details` with `status_id=21` (Draft), `active=1`
  - Return `{"data": {"eb_id": <new_id>}}`
- `POST /employee_section_save`:
  - Body: `SectionSaveRequest`
  - Route to correct table based on `section` field
  - UPSERT pattern: check if row exists for `eb_id` → UPDATE or INSERT
  - Return `{"data": {"success": true, "section": "..."}}`
- `GET /employee_progress/{eb_id}`:
  - Return completion status per step
- `POST /employee_upload_file`:
  - Multipart form data with `file` + `eb_id` + `document_type`
  - Store file (local FS or S3 based on config)
  - Return `{"data": {"file_id": "...", "file_name": "..."}}`
- `DELETE /employee_delete_file/{file_id}`:
  - Soft-delete or hard-delete the file record

**1A.4: Write tests — `src/test/test_hrms_employee.py`**
- Test all endpoints with mocked DB
- Test cases:
  - `test_employee_list_requires_co_id` → 400
  - `test_employee_list_returns_paginated_data` → 200 with data/total/page
  - `test_employee_create_setup_returns_all_options` → 200 with branches/departments/etc.
  - `test_employee_create_returns_eb_id` → 200 with eb_id
  - `test_employee_section_save_validates_section_name` → 400 for invalid section
  - `test_employee_section_save_personal_success` → 200
  - `test_employee_progress_returns_7_steps` → 200
  - `test_employee_by_id_not_found` → 404

---

### Phase 1B: Pay Scheme Backend (BE-2)

> **Runs in parallel with Phase 1A.** BE-2 can start as soon as schemas.py has the pay section stubs.

**1B.1: Add pay schemas to `src/hrms/schemas.py`**
```python
class PaySchemeCreatePayload(BaseModel):
    code: str
    name: str
    description: str | None = None
    wage_type: str | None = None
    designation_id: int | None = None
    work_location_id: int | None = None
    copy_from_scheme_id: int | None = None
    components: list[dict] = []  # [{component_id, formula, amount, type, is_active}]

class PayParamCreatePayload(BaseModel):
    name: str
    description: str | None = None
    # Additional fields TBD based on legacy
```

**1B.2: Add pay queries to `src/hrms/query.py`**
- `get_pay_scheme_list(co_id)` — Query `pay_components` / related tables (exact table depends on how schemes are stored — may need to query `pay_employee_payscheme` or a dedicated scheme master table)
- `get_pay_scheme_by_id(scheme_id, co_id)` — Scheme header + components grouped by type
- `get_pay_scheme_create_setup(co_id)` — Available components, wage types, existing schemes for copy-from

**1B.3: Implement `src/hrms/payScheme.py`**
- `GET /pay_scheme_list` — paginated
- `GET /pay_scheme_by_id/{id}` — detail with components
- `GET /pay_scheme_create_setup` — setup options
- `POST /pay_scheme_create` — create scheme + link components
- `PUT /pay_scheme_update/{id}` — update

**1B.4: Implement `src/hrms/payParam.py`**
- CRUD endpoints for pay scheme parameters/rules

**1B.5: Write tests — `src/test/test_hrms_pay_scheme.py`**
- Test all pay scheme endpoints
- Test component type grouping (Input=0, Earning=1, Deduction=2, Summary=3)

**Completion criteria for Phase 1:**
- [ ] All employee endpoints functional with real DB queries
- [ ] All pay scheme endpoints functional
- [ ] Pydantic schemas validate request bodies
- [ ] Tests pass: `pytest src/test/test_hrms_employee.py src/test/test_hrms_pay_scheme.py -v`
- [ ] Routers registered in main.py
- [ ] Manual smoke test with `co_id` param confirms tenant DB routing

---

## Phase 2: Frontend — Employee Module

> **Goal:** Complete employee list page and 7-step wizard with all form components.
> **Agent:** FE-1
> **Prerequisite:** Phase 0 (shared components + service layer) complete.
> **Can run in parallel with:** Phase 1 backend (use mock data initially, integrate when backend is ready).

### Phase 2A: Types, Constants, Factories (FE-1)

**2A.1: Create folder structure**
```
src/app/dashboardportal/hrms/
├── page.tsx
├── employees/
│   ├── page.tsx
│   └── createEmployee/
│       ├── page.tsx
│       ├── _components/
│       ├── hooks/
│       ├── types/
│       │   └── employeeTypes.ts
│       └── utils/
│           ├── employeeConstants.ts
│           ├── employeeFactories.ts
│           └── employeeMappers.ts
```

**2A.2: Implement `employeeTypes.ts`**
All types in one file (prevents circular dependencies):
```typescript
export interface PersonalDetailsForm {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  blood_group: string;
  email_id: string;
  marital_status: string;
  country_id: string;
  religion: string;
  father_spouse_name: string;
  passport_no: string;
  driving_licence_no: string;
  pan_no: string;
  aadhar_no: string;
}

export interface ContactDetailsForm {
  mobile_no: string;
  emergency_no: string;
}

export interface AddressDetailsForm {
  address_type: number;
  country_id: string;
  state_id: string;
  city_name: string;
  address_line_1: string;
  address_line_2: string;
  pin_code: string;
  is_correspondent_address: boolean;
}

export interface OfficialDetailsForm {
  department_id: string;
  branch_id: string;
  category_id: string;
  designation_id: string;
  emp_level_id: string;
  date_of_join: string;
  probation_period: string;
  minimum_working_commitment: string;
  reporting_eb_id: string;
  emp_code: string;
  legacy_code: string;
  contractor_id: string;
  office_mobile_no: string;
  office_email_id: string;
}

export interface BankDetailsForm {
  ifsc_code: string;
  bank_acc_no: string;
  bank_name: string;
  bank_branch_name: string;
  is_verified: boolean;
}

export interface PfDetailsForm {
  pf_no: string;
  pf_uan_no: string;
  pf_previous_no: string;
  pf_transfer_no: string;
  nominee_name: string;
  relationship_name: string;
  pf_date_of_join: string;
}

export interface EsiDetailsForm {
  esi_no: string;
  medical_policy_no: string;
}

export interface EducationEntry {
  id: string;
  qualification_type: string;
  university: string;
  percentage: string;
  year_of_passing: string;
  file_id: string;
}

export interface ExperienceEntry {
  id: string;
  company_name: string;
  designation: string;
  from_date: string;
  to_date: string;
  project: string;
  contact: string;
  file_id: string;
}

export interface EmployeeStepDef {
  id: number;
  label: string;
  section: string;
  completed: boolean;
}

export interface EmployeeSetupOptions {
  branches: Option[];
  departments: Option[];
  designations: Option[];
  categories: Option[];
  blood_groups: Option[];
  countries: Option[];
  emp_levels: Option[];
  reporting_managers: Option[];
  contractors: Option[];
}

export interface Option {
  label: string;
  value: string;
}
```

**2A.3: Implement `employeeConstants.ts`**
```typescript
export const EMPLOYEE_STEPS: EmployeeStepDef[] = [
  { id: 1, label: "Personal Info", section: "personal", completed: false },
  { id: 2, label: "Official Info", section: "official", completed: false },
  { id: 3, label: "Upload Documents", section: "documents", completed: false },
  { id: 4, label: "Generate Letters", section: "letters", completed: false },
  { id: 5, label: "Onboarding", section: "onboarding", completed: false },
  { id: 6, label: "Shift & Leave", section: "shift_leave", completed: false },
  { id: 7, label: "Medical Enrollment", section: "medical", completed: false },
] as const;

export const EMPLOYEE_STATUS_IDS = {
  DRAFT: 21,
  OPEN: 1,
  PENDING_APPROVAL: 20,
  APPROVED: 3,
  REJECTED: 4,
  CANCELLED: 6,
} as const;

export const EMPTY_OPTIONS = Object.freeze([]) as readonly Option[];
```

**2A.4: Implement `employeeFactories.ts`**
- `buildDefaultPersonalDetails()` → zeroed PersonalDetailsForm
- `buildDefaultContactDetails()` → empty
- `buildDefaultAddressDetails()` → `{ country_id: "73" }` (India default)
- `buildDefaultOfficialDetails()` → empty
- `buildDefaultBankDetails()` → empty
- `buildDefaultPfDetails()` → empty
- `buildDefaultEsiDetails()` → empty
- `createBlankEducationRow()` → blank row with unique `id`
- `createBlankExperienceRow()` → blank row with unique `id`

**2A.5: Implement `employeeMappers.ts`**
- `mapSetupResponse(apiData) → EmployeeSetupOptions` — convert API arrays to `{label, value}[]`
- `mapPersonalDetailsResponse(data, defaults) → PersonalDetailsForm`
- `mapAddressDetailsResponse(data) → AddressDetailsForm[]`
- `mapOfficialDetailsResponse(data, defaults) → OfficialDetailsForm`
- `mapBankDetailsResponse(data, defaults) → BankDetailsForm`
- `mapPfDetailsResponse(data, defaults) → PfDetailsForm`
- `mapEsiDetailsResponse(data, defaults) → EsiDetailsForm`
- `mapExperienceResponse(data) → ExperienceEntry[]`
- Null safety: always fall back to defaults for missing fields

**2A.6: Write tests for mappers and factories**
- `employeeMappers.test.ts` — happy path + null input + partial data
- `employeeFactories.test.ts` — verify defaults are correct

---

### Phase 2B: Hooks (FE-1)

**2B.1: `useEmployeeSteps.ts`**
```typescript
// State: activeStep (number), completedSteps (Set<number>), stepErrors (Map<number, string>)
// Returns: activeStep, completedSteps, goToStep(n), completeStep(n), setStepError(n, msg), resetProgress()
// Logic: goToStep only allows n <= max(completedSteps) + 1
// Initialize from API progress in edit/view mode
```
- **Test:** `useEmployeeSteps.test.ts` — navigation, completion, disable logic, error handling

**2B.2: `useEmployeeFormState.ts`**
```typescript
// Holds separate state per section:
//   personalDetails, contactDetails, residentialAddress, correspondentAddress,
//   officialDetails, bankDetails, pfDetails, esiDetails,
//   educationRows[], experienceRows[]
// Returns: getSectionValues(section), setSectionValues(section, values),
//          isDirty(section), resetSection(section), resetAll()
// Initialize from API data in edit/view mode
```
- **Test:** `useEmployeeFormState.test.ts` — section updates, dirty tracking, reset

**2B.3: `useEmployeeSetup.ts`**
```typescript
// Wraps fetchEmployeeCreateSetup (via useTransactionSetup pattern)
// On mount: fetch /employee_create_setup?co_id=...
// Returns: { branchOptions, departmentOptions, designationOptions, categoryOptions,
//            bloodGroupOptions, countryOptions, empLevelOptions, reportingManagerOptions,
//            contractorOptions, isLoading, error }
// Country→State: use useDeferredOptionCache for state options dependent on selected country
```

**2B.4: `useEmployeeValidation.ts`**
- Zod schemas per section:
  - `personalDetailsSchema` — first_name required, email format, aadhar exactly 12 digits, PAN regex
  - `contactDetailsSchema` — mobile 10 digits
  - `addressDetailsSchema` — address_line_1 required, pin_code 5+ digits
  - `officialDetailsSchema` — department, branch, designation, doj required
  - `bankDetailsSchema` — ifsc 11 chars, account required
  - `pfDetailsSchema` — uan 12 digits
  - `esiDetailsSchema` — esi_no XOR medical_policy_no
- **Test:** `useEmployeeValidation.test.ts` — all schemas: valid + invalid inputs

**2B.5: `useEmployeeProgress.ts`**
```typescript
// Fetch /employee_progress/{eb_id} on mount if eb_id exists
// Returns: stepProgress (array), isStepComplete(stepId), refreshProgress()
// After section save: call refreshProgress() to update stepper UI
```

---

### Phase 2C: Pages (FE-1)

**2C.1: HRMS landing page (`hrms/page.tsx`)**
- Simple page with cards linking to Employee Database and Pay Scheme sub-modules
- Use existing Card/Button components

**2C.2: Employee list page (`hrms/employees/page.tsx`)**
- Use `IndexWrapper` pattern (reference: `masters/items/page.tsx`)
- DataGrid columns: `eb_id`, `emp_code`, `first_name`, `last_name`, `department_name`, `designation_name`, `date_of_join`, `status_name`
- Pagination: `paginationModel` state, call API with `page: model.page + 1`
- Search: debounced search input
- Row actions: View, Edit
- Create button → navigate to `createEmployee?mode=create`
- Row click → navigate to `createEmployee?mode=view&id={eb_id}` or `?mode=edit&id={eb_id}`

**2C.3: Employee wizard page (`hrms/employees/createEmployee/page.tsx`)**
- Extract `mode` and `id` from URL search params
- Initialize hooks: `useEmployeeSteps`, `useEmployeeFormState`, `useEmployeeSetup`, `useEmployeeValidation`, `useEmployeeProgress`
- If edit/view mode: fetch employee data via `fetchEmployeeById`, populate form state and step progress
- Layout:
  ```
  TransactionWrapper (header: "Employee - Create/Edit/View", status chip, back button)
  └── Stepper (7 steps, at top)
  └── Active step component (renders below stepper)
  └── Action buttons ("Save & Continue" / "Back to Previous")
  ```
- Each step component receives: `formValues`, `onChange`, `options`, `mode`, `isDisabled`
- "Save & Continue" flow: validate with Zod → call `saveEmployeeSection` API → `completeStep` → advance to next step

---

### Phase 2D: Step Components (FE-1)

**2D.1 — 2D.15: Implement each step component in `_components/`**

Each component follows this pattern:
```typescript
interface StepProps {
  formValues: SectionForm;
  onChange: (values: Partial<SectionForm>) => void;
  options: EmployeeSetupOptions;
  mode: "create" | "edit" | "view";
  isDisabled: boolean;
}
```

| Priority | Component | Forms/Grid | Special Logic |
|----------|-----------|-----------|---------------|
| P0 | PersonalDetailsStep | MuiForm (15 fields) | Profile picture FileUpload |
| P0 | ContactDetailsStep | MuiForm (2 fields) | — |
| P0 | AddressDetailsStep | MuiForm (7+7 fields) | "Same as residential" checkbox; Country→State dependent |
| P0 | OfficialInfoStep | MuiForm (14 fields) | Dependent dropdowns (dept→category) |
| P0 | BankDetailsStep | MuiForm (5 fields) | IFSC auto-lookup |
| P1 | EducationDetailsStep | Dynamic table + FileUpload | Add/remove rows |
| P1 | ExperienceStep | Dynamic table + FileUpload | Add/remove rows |
| P1 | PfDetailsStep | MuiForm (7 fields) | UAN validation |
| P1 | EsiDetailsStep | MuiForm (2 fields) | Mutual exclusion |
| P1 | SalaryStructureStep | Read-only grid | Show pay scheme components |
| P2 | UploadDocumentsStep | Read-only aggregate | List all files from other steps |
| P2 | GenerateLettersStep | Template picker | PDF generation (may need backend support) |
| P2 | OnboardingStep | Checklist display | Read-only |
| P2 | ShiftTimingStep | Shift picker + grid | — |
| P2 | LeavePolicyStep | Policy picker + detail grid | — |

**2D.16: Write component tests**
- At minimum: `PersonalDetailsStep.test.tsx` (renders, disables in view mode, validates)
- `employees/page.test.tsx` (list renders, pagination)

**Completion criteria for Phase 2:**
- [ ] HRMS landing page renders with nav cards
- [ ] Employee list loads with pagination and search
- [ ] Wizard page renders all 7 steps with Stepper navigation
- [ ] Steps 1-2 (Personal + Official) fully functional with save
- [ ] All P0 step components render and save
- [ ] Tests pass: `pnpm vitest src/app/dashboardportal/hrms/`
- [ ] TypeScript compiles: `npx tsc --noEmit`

---

## Phase 3: Frontend — Pay Scheme Module

> **Goal:** Pay scheme list and create/edit/view pages.
> **Agent:** FE-2
> **Prerequisite:** Phase 0 complete, Phase 1B (backend) complete or in progress.

### Phase 3A: Types + Utils (FE-2)

**3A.1: Create folder structure**
```
src/app/dashboardportal/hrms/
├── payScheme/
│   ├── page.tsx
│   └── createPayScheme/
│       ├── page.tsx
│       ├── _components/
│       │   ├── PaySchemeFillDetails.tsx
│       │   ├── PayComponentTable.tsx
│       │   └── PaySchemePreview.tsx
│       ├── hooks/
│       │   ├── usePaySchemeFormState.ts
│       │   ├── usePaySchemeSetup.ts
│       │   └── usePaySchemeValidation.ts
│       ├── types/
│       │   └── paySchemeTypes.ts
│       └── utils/
│           ├── paySchemeConstants.ts
│           ├── paySchemeFactories.ts
│           └── paySchemeMappers.ts
├── paySchemeParameters/
│   ├── page.tsx
│   └── createPayParam/
│       ├── page.tsx
│       ├── _components/
│       ├── hooks/
│       ├── types/
│       └── utils/
```

**3A.2: `paySchemeTypes.ts`**
```typescript
export interface PaySchemeForm {
  code: string;
  name: string;
  wage_type: string;
  description: string;
  designation_id: string;
  work_location_id: string;
  copy_from_scheme_id: string;
}

export interface PayComponent {
  component_id: string;
  component_name: string;
  code: string;
  formula: string;
  amount: string;
  type: 0 | 1 | 2 | 3;  // Input, Earning, Deduction, Summary
  is_active: boolean;
}

export interface PaySchemeDetail {
  header: PaySchemeForm;
  inputComponents: PayComponent[];
  earningComponents: PayComponent[];
  deductionComponents: PayComponent[];
  summaryComponents: PayComponent[];
}
```

**3A.3: Constants, factories, mappers** — same pattern as employee

### Phase 3B: Hooks + Pages (FE-2)

**3B.1: `usePaySchemeFormState.ts`** — header form + 4 component arrays  
**3B.2: `usePaySchemeSetup.ts`** — fetch setup options  
**3B.3: `usePaySchemeValidation.ts`** — Zod: code required, name required  

**3B.4: Pay scheme list page** (`payScheme/page.tsx`)  
- `IndexWrapper` with columns: Code, Name, Wage Type, Description, Status  
- Create/Edit/View row actions  

**3B.5: Pay scheme create page** (`createPayScheme/page.tsx`)  
- `TransactionWrapper` layout  
- `PaySchemeFillDetails` — header form (MuiForm)  
- Copy-from dropdown: selecting existing scheme auto-populates components  
- `PayComponentTable` — 4-tab or 4-section editable grid  
  - Each section: component name, formula, amount, active toggle  
  - Components organized by `type` (0=Input, 1=Earning, 2=Deduction, 3=Summary)  
- Save/Update button  

**3B.6: Pay parameters list + create pages** — same pattern, simpler form  

**3B.7: Write tests**  
- Mapper tests, validation tests, list page rendering  

**Completion criteria for Phase 3:**
- [ ] Pay scheme list page with pagination
- [ ] Pay scheme create/edit/view with 4-category component grid
- [ ] Copy-from-existing-scheme works
- [ ] Pay parameters list + create pages
- [ ] Tests pass
- [ ] TypeScript compiles

---

## Phase 4: Integration & Polish

> **Goal:** End-to-end integration testing, bug fixes, and polish.
> **Agents:** All teams coordinate.

### Phase 4A: Database Verification (BE-1)
1. Verify all HRMS tables exist in the tenant database (`dev3`)
2. Verify pay-related tables exist and have correct structure
3. Run seed data if needed (blood groups, default pay components)
4. Document any migration SQL needed in `dbqueries/migrations/`

### Phase 4B: Integration Testing (FE-1 + BE-1)
1. Frontend ↔ Backend end-to-end for employee CRUD:
   - Create employee (personal details) → returns eb_id
   - Save each section → verify data persists
   - Fetch employee by id → verify all sections populate
   - List page → verify pagination and search
2. Frontend ↔ Backend for pay scheme CRUD

### Phase 4C: Integration Testing (FE-2 + BE-2)
1. Pay scheme create → verify components saved correctly
2. Copy-from existing scheme → verify components populated
3. Pay parameter CRUD

### Phase 4D: Polish (All teams)
1. Loading states for all async operations
2. Error toasts for API failures
3. View mode disables all inputs
4. Status chip displays correct status
5. Breadcrumb navigation works
6. Mobile responsiveness check

**Completion criteria for Phase 4:**
- [ ] All employee wizard steps save and load correctly
- [ ] Pay scheme with 4-category components works end-to-end
- [ ] Error handling shows user-friendly messages
- [ ] View mode is fully read-only
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] All tests green: `pnpm test` + `pytest src/test/ -v`

---

## Execution Timeline & Dependencies

```
Phase 0A (FE-0 + BE-1)   ████░░░░░░░░░░░░░░░░
Phase 0B (FE-0)           ░░██████░░░░░░░░░░░░

Phase 1A (BE-1)           ░░░░░░████████░░░░░░  ← can start after 0A
Phase 1B (BE-2)           ░░░░░░░░████████░░░░  ← can start after schemas defined

Phase 2A (FE-1)           ░░░░░░░░████░░░░░░░░  ← starts after Phase 0B
Phase 2B (FE-1)           ░░░░░░░░░░████░░░░░░
Phase 2C (FE-1)           ░░░░░░░░░░░░████░░░░
Phase 2D (FE-1)           ░░░░░░░░░░░░░░████░░

Phase 3A (FE-2)           ░░░░░░░░░░████░░░░░░  ← starts after Phase 0B
Phase 3B (FE-2)           ░░░░░░░░░░░░████░░░░

Phase 4  (ALL)            ░░░░░░░░░░░░░░░░████
```

### Parallel Tracks
- **Track A:** BE-1 (employee backend) + FE-1 (employee frontend) — coordinate on API shapes
- **Track B:** BE-2 (pay backend) + FE-2 (pay frontend) — coordinate on pay API shapes
- **Track C:** FE-0 (shared) — must complete before Track A and B frontend work starts

### Handoff Points

| From | To | What | When |
|------|----|------|------|
| BE-1 | FE-0 | Pydantic schema stubs (response shapes) | End of Phase 0A |
| FE-0 | FE-1 | Stepper + FileUpload components + service layer | End of Phase 0B |
| FE-0 | FE-2 | Service layer (pay scheme functions) | End of Phase 0B |
| BE-1 | FE-1 | Working employee endpoints (for integration) | End of Phase 1A |
| BE-2 | FE-2 | Working pay scheme endpoints (for integration) | End of Phase 1B |
| FE-1 + BE-1 | Phase 4 | Employee module ready for integration testing | End of Phase 2 |
| FE-2 + BE-2 | Phase 4 | Pay module ready for integration testing | End of Phase 3 |

---

## File Inventory Summary

### New Files — Backend (`vowerp3be`)

| File | Agent | Phase |
|------|-------|-------|
| `src/hrms/__init__.py` | BE-1 | 0A |
| `src/hrms/constants.py` | BE-1 | 0A |
| `src/hrms/schemas.py` | BE-1 + BE-2 | 1A + 1B |
| `src/hrms/query.py` | BE-1 + BE-2 | 1A + 1B |
| `src/hrms/employee.py` | BE-1 | 1A |
| `src/hrms/payScheme.py` | BE-2 | 1B |
| `src/hrms/payParam.py` | BE-2 | 1B |
| `src/test/test_hrms_employee.py` | BE-1 | 1A |
| `src/test/test_hrms_pay_scheme.py` | BE-2 | 1B |

### New Files — Frontend (`vowerp3ui`)

| File | Agent | Phase |
|------|-------|-------|
| `src/components/ui/stepper.tsx` | FE-0 | 0B |
| `src/components/ui/stepper.test.tsx` | FE-0 | 0B |
| `src/stories/Stepper.stories.tsx` | FE-0 | 0B |
| `src/components/ui/fileUpload.tsx` | FE-0 | 0B |
| `src/components/ui/fileUpload.test.tsx` | FE-0 | 0B |
| `src/stories/FileUpload.stories.tsx` | FE-0 | 0B |
| `src/utils/hrmsService.ts` | FE-0 | 0B |
| `src/app/dashboardportal/hrms/page.tsx` | FE-1 | 2C |
| `src/app/dashboardportal/hrms/employees/page.tsx` | FE-1 | 2C |
| `src/app/dashboardportal/hrms/employees/createEmployee/page.tsx` | FE-1 | 2C |
| `src/app/.../createEmployee/types/employeeTypes.ts` | FE-1 | 2A |
| `src/app/.../createEmployee/utils/employeeConstants.ts` | FE-1 | 2A |
| `src/app/.../createEmployee/utils/employeeFactories.ts` | FE-1 | 2A |
| `src/app/.../createEmployee/utils/employeeMappers.ts` | FE-1 | 2A |
| `src/app/.../createEmployee/utils/employeeMappers.test.ts` | FE-1 | 2A |
| `src/app/.../createEmployee/hooks/useEmployeeSteps.ts` | FE-1 | 2B |
| `src/app/.../createEmployee/hooks/useEmployeeSteps.test.ts` | FE-1 | 2B |
| `src/app/.../createEmployee/hooks/useEmployeeFormState.ts` | FE-1 | 2B |
| `src/app/.../createEmployee/hooks/useEmployeeFormState.test.ts` | FE-1 | 2B |
| `src/app/.../createEmployee/hooks/useEmployeeSetup.ts` | FE-1 | 2B |
| `src/app/.../createEmployee/hooks/useEmployeeValidation.ts` | FE-1 | 2B |
| `src/app/.../createEmployee/hooks/useEmployeeValidation.test.ts` | FE-1 | 2B |
| `src/app/.../createEmployee/hooks/useEmployeeProgress.ts` | FE-1 | 2B |
| `src/app/.../createEmployee/_components/PersonalDetailsStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/ContactDetailsStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/AddressDetailsStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/EducationDetailsStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/ExperienceStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/OfficialInfoStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/BankDetailsStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/SalaryStructureStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/PfDetailsStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/EsiDetailsStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/UploadDocumentsStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/GenerateLettersStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/OnboardingStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/ShiftTimingStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/LeavePolicyStep.tsx` | FE-1 | 2D |
| `src/app/.../createEmployee/_components/EmployeeStepNav.tsx` | FE-1 | 2D |
| `src/app/dashboardportal/hrms/payScheme/page.tsx` | FE-2 | 3B |
| `src/app/.../payScheme/createPayScheme/page.tsx` | FE-2 | 3B |
| `src/app/.../payScheme/createPayScheme/_components/*` | FE-2 | 3B |
| `src/app/.../payScheme/createPayScheme/hooks/*` | FE-2 | 3B |
| `src/app/.../payScheme/createPayScheme/types/*` | FE-2 | 3A |
| `src/app/.../payScheme/createPayScheme/utils/*` | FE-2 | 3A |
| `src/app/dashboardportal/hrms/paySchemeParameters/page.tsx` | FE-2 | 3B |
| `src/app/.../paySchemeParameters/createPayParam/*` | FE-2 | 3B |

### Modified Files

| File | Change | Agent | Phase |
|------|--------|-------|-------|
| `vowerp3ui/src/utils/api.ts` | Add HRMS route definitions | FE-0 | 0A |
| `vowerp3be/src/main.py` | Register 3 HRMS routers | BE-1 | 0A |

**Total new files: ~50+** (9 backend, 40+ frontend)

---

## Quick-Start Commands for Each Agent

### BE-1 (Backend Employee)
```bash
cd d:\vownextjs\vowerp3be
source .venv/Scripts/activate
# After implementation:
pytest src/test/test_hrms_employee.py -v
uvicorn src.main:app --reload --port 8000
```

### BE-2 (Backend Pay)
```bash
cd d:\vownextjs\vowerp3be
source .venv/Scripts/activate
pytest src/test/test_hrms_pay_scheme.py -v
```

### FE-0 (Frontend Shared)
```bash
cd d:\vownextjs\vowerp3ui
npx tsc --noEmit
pnpm vitest src/components/ui/stepper.test.tsx
pnpm storybook
```

### FE-1 (Frontend Employee)
```bash
cd d:\vownextjs\vowerp3ui
npx tsc --noEmit
pnpm vitest src/app/dashboardportal/hrms/
pnpm dev
```

### FE-2 (Frontend Pay)
```bash
cd d:\vownextjs\vowerp3ui
npx tsc --noEmit
pnpm vitest src/app/dashboardportal/hrms/payScheme/
```
