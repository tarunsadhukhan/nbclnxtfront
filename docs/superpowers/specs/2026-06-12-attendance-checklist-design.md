# Attendance Checklist — Design

**Date:** 2026-06-12
**Status:** Approved (pending user review of this document)
**Scope:** v1 + v2 + v3 (all phases implemented in this effort)

## Summary

A new read-only HRMS report page in the Tenant Portal: a **flat attendance register** listing
one row per `daily_attendance` record for a chosen date range and branch. Columns:
Date, Spell, EB No, Name, Department, Designation, Attendance Source (Face/Manual),
Attendance Type (R/O/C), Working Hours.

The page consumes the existing Flask mobileapp endpoint `GET /attendance-report`
(`vowerp3be/src/mobileapp/src/attendance/attendance.py`), which already returns every
required column and supports date-range, branch, department, shift, emp-code and
emp-name filters. The Flask app is mounted at the root of the main FastAPI server
(`src/main.py` → `app.mount("/", WSGIMiddleware(mobile_flask_app))`), so the portal
reaches it through the same `API_URL` base, proxy, and Host-subdomain tenant routing
it already uses. This is the first portal page to call a mobileapp endpoint.

An earlier idea — an employee-wise P/A pivot built on `GET /emp-wise-attendance` with
date/monthly/fortnight report types — was considered and **dropped**: the user wants the
flat register only.

## Architecture

| Piece | Location | Notes |
|-------|----------|-------|
| Page | `src/app/dashboardportal/hrms/attendanceChecklist/page.tsx` | Smart component: filters, fetch, grid state. Pattern copied from `hrms/payRoll/page.tsx`. |
| Types | `src/app/dashboardportal/hrms/attendanceChecklist/types/attendanceChecklistTypes.ts` | All module types in one file (no circular deps). |
| Route constant | `src/utils/api.ts` | `ATTENDANCE_REPORT: \`${API_URL}/attendance-report\`` (no `/hrms` prefix — Flask route). |
| Service | `src/utils/hrmsService.ts` | `fetchAttendanceReport(params)` via `fetchWithCookie`; builds query string, skips empty params. |
| Filter bar | MuiForm (`@/components/ui/muiform`) | Same composition as payRoll. |
| Grid | MUI `DataGrid` | Client-side pagination (25/50/100). |

### Backend response shape (existing, unchanged in v1)

```json
{
  "status": "success",
  "data": [
    {
      "id": 1, "emp_code": "E001", "eb_id": 10, "emp_name": "Ravi Kumar",
      "department_name": "Spinning", "designation_name": "Operator",
      "shift_name": "A", "attendance_date": "2026-06-01",
      "attendance_time": "08:01:23", "exit_time": "",
      "status": "Face", "att_type": "R",
      "shift_hours": 8.0, "working_hours": 8.0, "idle_hours": 0.0,
      "has_photo": true, "machine_nos": "SP-01, SP-02"
    }
  ],
  "total": 1
}
```

Field mapping for the grid: `attendance_date` → Date, `shift_name` → Spell,
`emp_code` → EB No, `emp_name` → Name, `department_name` → Department,
`designation_name` → Designation, `status` → Source, `att_type` → Type,
`working_hours` → Working Hours.

## v1 — Core page

- **Filters:** From Date, To Date, Branch dropdown, Search button.
  - Branch options come from the sidebar context's branch list for the selected
    company; the dropdown is pre-seeded with the sidebar-selected branch using the
    payRoll page's hydration-safe pattern (seed after mount, not during SSR render).
  - Zod schema: `from_date` and `to_date` required, `from_date <= to_date`,
    `branch_id` required.
- **Fetch:** `GET /attendance-report?from_date=&to_date=&branch_id=` on Search.
  Loading state on the button; errors surface in a Snackbar; empty result shows the
  DataGrid empty overlay.
- **Grid columns:** Date | Spell | EB No | Name | Department | Designation |
  Source | Type | Working Hours.
  - Source renders as a small chip: Face vs Manual (theme token colors only).
  - Type renders the code with a readable label (R = Regular, O = OT, C = Cash).
  - Default order is the backend's (date desc, entry time desc); column sorting
    enabled client-side.
- **Header:** page title "Attendance Checklist" + total record count after a search.

## v2 — Full filter set

Add to the filter bar (all optional; blank = all):

- **Department** — options from the existing branch-scoped department source used by
  sibling HRMS pages; cascade-reset when Branch changes. Sent as `department_id`.
- **Spell/Shift** — options from the shift/spell master; sent as `shift_name`
  (endpoint matches `da.spell` by name; "All Shifts" sentinel omitted).
- **EB No** — free-text; sent as `emp_code` (backend does LIKE match).
- **Employee Name** — free-text; sent as `emp_name` (backend does LIKE match).
- **Designation** and **Attendance Type** — *small backend addition*: extend
  `/attendance-report` with optional `designation_id` (`da.worked_designation_id = %s`)
  and `att_type` (`da.attendance_type = %s`) WHERE clauses, following the endpoint's
  existing parameterized-filter style. Designation options cascade from Department;
  Attendance Type is a static select (Regular/OT/Cash).

## v3 — Export + print

- **CSV/Excel export:** client-side from the currently loaded rows (no backend call):
  build the file from the same field mapping as the grid, named
  `attendance-checklist_<from>_<to>.csv`. Disabled until a search has returned rows.
- **Print view:** print stylesheet that renders the loaded rows as a plain full-width
  table (filters and chrome hidden) triggered by a Print button → `window.print()`.

## Error handling

- Service returns `{data, error, status}`; the page surfaces `error` via Snackbar.
- Backend 4xx messages (e.g. missing dates) pass through as the Snackbar text.
- Defensive parsing: treat `data` as `[]` when the response shape is unexpected.

## Testing

Vitest unit tests for the pure logic:

- Query-param builder (skips empty filters, includes set ones, encodes values).
- Field mapping / row-shaping function (backend row → grid row, including blank
  `working_hours`/`shift_name` handling).
- CSV serialization (v3): correct headers, escaping of commas in names.

## Risks / notes

- **N+1 machine query:** `/attendance-report` runs one machine-number query per row;
  large ranges (full month × big branch) may be slow. Not blocking — if it bites,
  batch the machine lookup in the backend as a follow-up. The grid does not display
  machine numbers, so the column could also simply be skipped by a future
  `skip_machines=1` param.
- **Auth posture:** the mobileapp blueprint does not apply the portal's JWT checks
  itself; page access is still gated by the portal's route-level permission middleware
  (`src/middleware.ts`). Consistent with the decision to call the Flask endpoint
  directly (Approach A) rather than porting it to FastAPI.
- **Tenant routing:** Flask resolves the tenant DB from the Host subdomain / tenant
  header — same mechanism as the rest of the portal; verify once in dev when first
  wiring the page.
