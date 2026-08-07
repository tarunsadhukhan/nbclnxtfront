# Pay Register Export + Pay Slip Print — Design

**Date:** 2026-06-20
**Author:** tarun (with Claude)
**Repos:** `vowerp3ui` (Next.js frontend) + `vowerp3be` (FastAPI backend)
**Page:** `src/app/dashboardportal/hrms/payRegister/viewPayRegister/page.tsx`

## Goal

Add two actions to the **View Pay Register** page:

1. **Pay Register Export** — download the pay register as an Excel (`.xlsx`) workbook.
2. **Pay Slip Print** — download a PDF containing one payslip per employee.

Both are generated server-side and downloaded as blobs in the browser, matching the
existing `fetchExcelBlob` + `useExcelDownload` convention already used across the app
(jute/sales/procurement reports, payroll template download).

## Inputs (already available on the page)

| Value | Source |
|-------|--------|
| `co_id` | `useSelectedCompanyCoId()` |
| `pay_period_id` | `searchParams.get("id")` → `detail.id` |
| `payscheme_id` | `detail.paySchemeId` (defaults from the period server-side if omitted) |
| `branch_id` | `detail.branchId` (defaults from the period server-side if omitted) |

Both endpoints accept only `co_id` + `pay_period_id` and resolve `payscheme_id`/`branch_id`
from the `pay_period` row server-side (mirrors `pay_register_salary`).

## Header metadata (both outputs)

| Label | Source |
|-------|--------|
| Company name | `co_mst.co_name` where `co_mst.co_id = :co_id` |
| Pay scheme name | `pay_scheme_master.payscheme_name` (already selected in `get_pay_register_by_id`) |
| Period | `DATE_FORMAT(from_date/to_date, '%d-%m-%Y')` → "Pay Register for `<from>` – `<to>`" |

## Component selection (shared logic — both outputs)

A single backend helper resolves *which components, in what order, with what label*:

1. Query `tbl_payslip_print_component` for the current
   `payscheme_id` + `company_id` + `branch_id` with `is_active = 1`.
2. **If rows exist** → use them:
   - order by `payslip_order`
   - label = `desc_print`
   - carry flags `total_print`, `payslip_print`, `fixed_var_cols`
3. **If no rows (fallback)** → use **all** pay-scheme components
   (`pay_scheme_details` joined to `pay_components`), default order (component type, id),
   default label (`pay_components.NAME`), and all flags treated as "show / no special total".

### `tbl_payslip_print_component` schema (already exists in tenant DB)

```sql
CREATE TABLE `tbl_payslip_print_component` (
  `pay_id` bigint NOT NULL AUTO_INCREMENT,
  `component_id` int DEFAULT NULL,
  `desc_print` varchar(100) DEFAULT NULL,
  `payslip_order` int DEFAULT '1',
  `payscheme_id` int NOT NULL,
  `company_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `fixed_var_cols` char(2) NOT NULL,
  `is_active` int NOT NULL,
  `total_print` int NOT NULL DEFAULT '0',
  `payslip_print` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`pay_id`)
);
```

### Confirmed flag semantics

- `payslip_print = 1` → the component appears on the **payslip PDF**.
- `total_print = 1` → the component is summed into the slip's **Total** line.
- `fixed_var_cols` → distinct values group lines into **sections** on the payslip
  (e.g. Earnings vs Deductions / Fixed vs Variable). Ignored for the flat Excel export.
- `desc_print` → printed label; `payslip_order` → sort order.

## Employee values

Per-employee, per-component amounts come from the **existing** `get_pay_register_salary()`
query (no new salary logic). It returns rows of
`employee_id, emp_code, emp_name, department_name, component_id, component_name, component_type, amount`.
Both endpoints pivot this by employee.

## Feature 1 — Pay Register Export (.xlsx)

**Backend:** new `GET /hrms/pay_register_export` in `src/hrms/payRegister.py`,
returns a `StreamingResponse` of an openpyxl workbook
(`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

Layout:
- Rows 1–3: Company name / Pay Scheme name / "Pay Register for `<from>` – `<to>`".
- Header row: `Emp Code`, `Emp Name`, `Department`, then one column per selected
  component (table order, `desc_print` labels).
- One row per employee; component cells are numeric.
- **Grand total row** at the bottom: label "GRAND TOTAL" under Emp Name, each component
  column summed across all employees; non-numeric leading columns blank.

**Frontend:**
- `api.ts`: add `HRMS_PAY_REGISTER_EXPORT: ${API_URL}/hrms/pay_register_export`.
- `hrmsService.ts`: `exportPayRegister(coId, payPeriodId)` → `Promise<Blob>` via `fetchExcelBlob`.
- Page: **Pay Register Export** button, wired through `useExcelDownload`
  (filename `PayRegister_<period>.xlsx`), disabled while downloading; errors → snackbar.

## Feature 2 — Pay Slip Print (PDF)

**Backend:** new `GET /hrms/pay_register_payslips` in `src/hrms/payRegister.py`,
returns a `StreamingResponse` PDF (`application/pdf`) built with **reportlab**
(pure-Python, pip-only, no system libraries).

Layout — **one payslip per employee, page break between**:
- Header block: Company / Pay Scheme / Period, then Emp Code + Name + Department.
- Component lines where `payslip_print = 1` (fallback: all), ordered by `payslip_order`,
  labeled `desc_print`, value = that employee's amount.
- Lines grouped into sections by `fixed_var_cols`.
- **Total** line per slip = sum of components flagged `total_print = 1`.

**Frontend:**
- `api.ts`: add `HRMS_PAY_REGISTER_PAYSLIPS: ${API_URL}/hrms/pay_register_payslips`.
- `hrmsService.ts`: `printPaySlips(coId, payPeriodId)` → `Promise<Blob>`.
- Page: **Pay Slip Print** button; on success `saveAs(blob, 'PaySlips_<period>.pdf')`;
  disabled while generating; errors → snackbar.

## New dependency

- `reportlab` added to `vowerp3be` requirements (PDF generation). Excel reuses the
  existing `openpyxl` dependency.

## Backend queries to add (`src/hrms/query.py`)

- `get_payslip_print_components()` — rows from `tbl_payslip_print_component`
  by payscheme/company/branch, `is_active = 1`, ordered by `payslip_order`.
- `get_payscheme_components_fallback()` — all components of a scheme via
  `pay_scheme_details` → `pay_components` (id, code, name, type), ordered by type, id.
- `get_company_name()` — `co_mst.co_name` by `co_id` (or reuse existing if present).
- Reuse `get_pay_register_salary()` for employee values and
  `get_pay_register_by_id()` for scheme name / period dates.

## Edge cases

- **Unprocessed / empty register** (no salary rows): export produces headers + column
  row + empty grand total (0s); payslip PDF produces a single "No salary data" page.
  Surface a clear message rather than 500.
- **No components resolved** (empty table *and* empty scheme): 400 with a clear detail
  message; frontend shows it in the snackbar.
- **Blob error envelope:** backend errors returned as JSON inside the blob are unwrapped
  by `fetchExcelBlob` (already handled) and shown in the snackbar.

## Out of scope

- Editing `tbl_payslip_print_component` from the UI (assumed managed elsewhere / by DBA).
- Emailing payslips; per-employee individual download (only the combined PDF for now).
- Changes to payroll calculation / processing.

## Testing

- Backend: unit tests for component-selection helper (table-present vs fallback),
  grand-total summation, and an empty-register path — following the existing
  `src/test/test_hrms_*.py` and `test_jute_excel_downloads.py` patterns.
- Frontend: service functions return blobs; button disabled-state and error snackbar
  wiring (Vitest), consistent with existing report-download tests.
