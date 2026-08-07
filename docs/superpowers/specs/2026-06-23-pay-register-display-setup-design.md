# Pay Register Display Setup (`tbl_payslip_print_component`) — Design

**Date:** 2026-06-23
**Author:** tarun (with Claude)
**Repos:** `vowerp3ui` (Next.js frontend) + `vowerp3be` (FastAPI backend)
**Route:** `/dashboardportal/hrms/payRegisterDispSet`
**Related:** `docs/superpowers/specs/2026-06-20-pay-register-export-and-payslip-print-design.md`

## Goal

A full-stack HRMS setup master to manage rows of `tbl_payslip_print_component`. These rows
drive **which pay components appear — and how — on the Pay Register Excel export and the
Payslip PDF**. This fills the gap the export design doc explicitly left out of scope
("Editing `tbl_payslip_print_component` from the UI … assumed managed elsewhere / by DBA").

The export/payslip generation already reads this table via `get_payslip_print_components()`
(`src/hrms/query.py:638`) and `_resolve_print_components()` (`src/hrms/payRegister.py`). This
feature only adds the CRUD that populates it; the generation code is untouched.

## Target table (already exists in tenant DB)

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

### Confirmed field semantics

- `payscheme_id` → FK to `pay_scheme_master.payscheme_id` (the row's pay scheme).
- `component_id` → FK to `pay_components.ID` (the pay component).
- `company_id` → from the selected company (`co_id`); not user-editable.
- `branch_id` → the selected branch (NOT NULL — the table cannot hold a NULL branch).
- `desc_print` → printed label for the component on the slip/export.
- `payslip_order` → sort order (default 1).
- `fixed_var_cols` → **F = Fixed, V = Variable** (stored as `char(2)`, values `"F"` / `"V"`);
  distinct values group payslip lines into sections.
- `total_print = 1` → component is summed into the slip's Total line.
- `payslip_print = 1` → component appears on the payslip PDF.
- `is_active = 1` → row is live (export/payslip only read active rows).

## Decisions (locked with user)

| Question | Decision |
|----------|----------|
| `fixed_var_cols` dropdown | **Fixed / Variable**, codes `F` / `V` |
| Page layout | **List + Add/Edit dialog** (standard master CRUD, one row at a time) |
| Pay Component dropdown source | **Selected pay scheme's components only** (`pay_scheme_details`) |
| Route + scope | **`/dashboardportal/hrms/…` + full stack** (FE + BE + menu) |
| Delete | **Soft only** — deactivate via the Active checkbox (no hard-delete row action) |
| Menu label | **"Pay Register Display Setup"** |

## UX

### List page — `/dashboardportal/hrms/payRegisterDispSet`

`IndexWrapper` DataGrid, scoped to the selected company (`co_id`) + left-menu branch(es)
(`SidebarContext.selectedBranches`, comma-joined like `designationMaster`), with debounced
search and a **Create** button. Columns:

| Pay Scheme | Component | Print Label | Order | Fixed/Var | Total Print | Payslip Print | Active |

- `Total Print` / `Payslip Print` / `Active` render as ✓/✗ (boolean from the int columns).
- Row icons → **Edit** opens the dialog with `editId = pay_id`.
- No hard-delete row action (`IndexWrapper` has no `onDelete`); deactivation is the Active
  checkbox in the dialog. Inactive rows still appear in the list (greyed `Active = ✗`) so
  they can be re-activated.

### Add/Edit dialog — `_components/PayRegisterDispSetDialog.tsx`

MUI `Dialog` + `MuiForm` (mirrors `CreateDesignationPage.tsx`). Props: `{ open, onClose, onSaved?, editId? }`.

| Field | `MuiForm` type | Source / behaviour |
|-------|----------------|--------------------|
| Pay Scheme (`payscheme_id`) | `select` | `get_pay_scheme_dropdown()` → `{payscheme_id, payscheme_name}` |
| Branch (`branch_id`) | `select` | sidebar branches; **defaults to the selected branch**; required |
| Pay Component (`component_id`) | `select` (**cascade**) | options = the chosen scheme's components; **reset when scheme changes** |
| Print Description (`desc_print`) | `text` | required |
| Payslip Order (`payslip_order`) | `number` | default 1 |
| Fixed/Variable (`fixed_var_cols`) | `select` | `F`=Fixed, `V`=Variable; required |
| Total Print (`total_print`) | `checkbox` | boolean ↔ int 1/0 |
| Payslip Print (`payslip_print`) | `checkbox` | boolean ↔ int 1/0 |
| Active (`is_active`) | `checkbox` | default checked; boolean ↔ int 1/0 |

`company_id` is derived from `co_id` (not shown). The Pay Component dropdown is empty/disabled
until a Pay Scheme is chosen. On Pay Scheme change, fetch that scheme's components, replace the
component options, and clear `component_id` (cascade reset).

## Backend (`vowerp3be`, `/hrms` prefix)

New router `src/hrms/payslipPrintComponent.py`, registered in `src/main.py`
(`app.include_router(..., prefix="/hrms", tags=["hrms"])` alongside the other HRMS routers).

Endpoints (all `co_id`-scoped, returning the `{ "data": [...] }` envelope):

| Method + path | Purpose |
|---------------|---------|
| `GET /hrms/payslip_print_component_list` | paginated/searchable rows; filters: `co_id` (req), optional `branch_id` (csv), `payscheme_id`, `search`, `page`, `limit`. Joins scheme/component/branch names. Returns `{data, total}`. |
| `GET /hrms/payslip_print_component_setup?co_id=` | `{ pay_schemes: [{payscheme_id, payscheme_name}] }` for the scheme dropdown |
| `GET /hrms/pay_scheme_components?co_id=&payscheme_id=` | `{ data: [{component_id, component_code, component_name, type}] }` for the cascade (reuses `get_pay_scheme_details_by_scheme_id`) |
| `GET /hrms/payslip_print_component_by_id/{pay_id}?co_id=` | single row for edit prefill |
| `POST /hrms/payslip_print_component_create?co_id=` | insert (+ duplicate guard) |
| `PUT /hrms/payslip_print_component_update/{pay_id}?co_id=` | update |

New query functions in `src/hrms/query.py`:

- `list_payslip_print_components()` — rows joined to `pay_scheme_master`, `pay_components`,
  and branch name; filtered by company, optional branch/scheme/search; ordered by
  `payscheme_id, payslip_order, pay_id`. Plus a `count_*` companion for pagination.
- `get_payslip_print_component_by_id()`
- `insert_payslip_print_component()`
- `update_payslip_print_component()`
- `check_payslip_print_component_duplicate()` — active row with same
  (payscheme_id, company_id, branch_id, component_id), optionally excluding a `pay_id`.
- **Reuse** `get_pay_scheme_dropdown()` (`query.py:331`) for schemes and
  `get_pay_scheme_details_by_scheme_id()` (`query.py:309`) for scheme components.

Pydantic schemas in `src/hrms/schemas.py`:
`PayslipPrintComponentCreate` / `PayslipPrintComponentUpdate`
(`payscheme_id`, `branch_id`, `component_id`, `desc_print`, `payslip_order`,
`fixed_var_cols`, `total_print`, `payslip_print`, `is_active`).

## Frontend (`vowerp3ui`)

```
src/app/dashboardportal/hrms/payRegisterDispSet/
  page.tsx                                   # IndexWrapper list (mirrors designationMaster/page.tsx)
  _components/PayRegisterDispSetDialog.tsx    # add/edit dialog (mirrors CreateDesignationPage.tsx)
  types/payRegisterDispSetTypes.ts            # Row, FormValues, Option types
```

- `src/utils/api.ts` (`apiRoutesPortalMasters`): add
  `HRMS_PAYSLIP_PRINT_COMPONENT_LIST`, `_SETUP`, `_BY_ID`, `_CREATE`, `_UPDATE`,
  and `HRMS_PAY_SCHEME_COMPONENTS`.
- `src/utils/hrmsService.ts`: add `fetchPayslipPrintComponentList`,
  `fetchPayslipPrintComponentSetup`, `fetchPaySchemeComponents`,
  `fetchPayslipPrintComponentById`, `createPayslipPrintComponent`,
  `updatePayslipPrintComponent` — all via `fetchWithCookie`, `{data}` unwrap convention.
- Selected company via `useSelectedCompanyCoId()`; branches via `useSidebarContext()`.

## Menu entry

DB insert into `portal_menu_mst` (vowconsole3) + `role_menu` mapping, under the HRMS parent,
path `/dashboardportal/hrms/payRegisterDispSet`, label **"Pay Register Display Setup"**.
Done via the `add-menu` skill, which asks target tenant(s) (e.g. dev3) and roles at that step.

## Edge cases

- **No pay scheme selected** → Pay Component dropdown is empty and disabled.
- **Duplicate** (same scheme + company + branch + component, active) → backend 400 with a
  clear detail; frontend surfaces it in the snackbar.
- **No branch selectable** (sidebar has no branch) → block save with a message; the table
  requires a NOT NULL branch.
- **Deactivation** → setting Active off (`is_active = 0`) removes the row from export/payslip
  output without deleting it; it remains editable in the list.

## Out of scope

- The Pay Register Excel export and Payslip PDF generation themselves (already built).
- Payroll calculation / processing.
- Emailing payslips; hard delete of configuration rows.

## Testing

- **Backend:** pytest `src/test/test_hrms_payslip_print_component.py` — create, list
  (with scheme/branch filter), duplicate-guard rejection, update, and `co_id` tenant
  scoping; following existing `src/test/test_hrms_*.py` patterns.
- **Frontend:** Vitest — service functions build correct URLs / unwrap `{data}`; dialog
  cascade resets `component_id` on scheme change; save maps checkboxes to int 1/0;
  following the `CreateDesignationPage.test.tsx` / `page.test.tsx` patterns.
