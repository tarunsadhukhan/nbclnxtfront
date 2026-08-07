# Attendance Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A read-only HRMS report page (Tenant Portal) listing one row per `daily_attendance` record — Date, Spell, EB No, Name, Department, Designation, Source (Face/Manual), Type (R/O/C), Working Hours — with filters, CSV export, and a print view.

**Architecture:** New page `dashboardportal/hrms/attendanceChecklist` modeled on `hrms/payRoll/page.tsx` (MuiForm filter bar → Search → MUI DataGrid). Data comes from the Flask mobileapp endpoint `GET /attendance-report`, which is mounted at the root of the main FastAPI server, so it is reached through the normal `API_URL` base via `fetchWithCookie`. v2 adds two optional WHERE-clause filters to that Flask endpoint (separate repo: `vowerp3be`).

**Tech Stack:** Next.js 15 App Router, TypeScript strict, MUI DataGrid, MuiForm (`@/components/ui/muiform`), Zod, Vitest. Backend: Flask blueprint in `vowerp3be/src/mobileapp`.

**Spec:** `docs/superpowers/specs/2026-06-12-attendance-checklist-design.md`

**Repos:** Frontend work in `d:\vownextjs\vowerp3ui` (branch `tsdevhrms`). Task 5 only is in `d:\vownextjs\vowerp3be`.

**Verified codebase facts used by this plan:**
- `fetchWithCookie(url, method)` → `{ data, error, status }` (`src/utils/apiClient2.ts`).
- `apiRoutesPortalMasters` ends with the HRMS Daily Attendance block at `src/utils/api.ts:740-749`.
- `fetchAttendanceCreateSetup(branchId)` exists (`src/utils/hrmsService.ts:674`) → body `{ data: { spells: [{spell_id, spell_name, ...}], sub_departments: [{sub_dept_id, sub_dept_desc}] } }`.
- `fetchDesignationsBySubDept(coId, subDeptId)` exists (`src/utils/hrmsService.ts:63`) → body `{ data: [{label, value}] }` (value = designation_id as string).
- Sidebar branch pattern (hydration-safe seeding, branch options from `selectedCompany.branches`) — copy from `src/app/dashboardportal/hrms/payRoll/page.tsx:62-177`.
- Flask endpoint `/attendance-report`: `vowerp3be/src/mobileapp/src/attendance/attendance.py:389-519`. Response body `{ status, data: [...], total }`. Row fields: `id, emp_code, eb_id, emp_name, department_name, designation_name, shift_name, attendance_date, attendance_time, exit_time, status (Face/Manual), att_type (R/O/C), shift_hours, working_hours, idle_hours, has_photo, machine_nos`.
- The Flask `Schema.validate` only enforces `required`; unknown query params pass through (`vowerp3be/src/mobileapp/src/schemas/__init__.py`).
- Test runner: `pnpm test` = `vitest run --project unit`. Single file: `pnpm vitest run --project unit <path>`.

**Deployment note (manual, not a code task):** portal routes are gated by `src/middleware.ts` → `PORTAL_MENU_PERMISSION_CHECK`. The page will redirect to `/dashboardportal` until a menu row for `/dashboardportal/hrms/attendanceChecklist` exists in the tenant menu tables with view permission for the user's role. Add it via the portal menu management screens before manual testing.

---

### Task 1: Module types

**Files:**
- Create: `src/app/dashboardportal/hrms/attendanceChecklist/types/attendanceChecklistTypes.ts`

- [ ] **Step 1: Create the types file**

```typescript
/**
 * Types for the Attendance Checklist module (flat attendance register).
 * Single type file per module — do not split (avoids circular deps).
 */

/** One row as returned by GET /attendance-report (Flask mobileapp endpoint). */
export interface AttendanceReportRow {
  id: number;
  emp_code: string;
  eb_id: number;
  emp_name: string;
  department_name: string;
  designation_name: string;
  shift_name: string;
  /** YYYY-MM-DD */
  attendance_date: string;
  attendance_time: string;
  exit_time: string;
  /** attendance_source: "Face" | "Manual" */
  status: string;
  /** "R" (Regular) | "O" (OT) | "C" (Cash) */
  att_type: string;
  shift_hours: number;
  working_hours: number;
  idle_hours: number;
  has_photo: boolean;
  machine_nos: string;
}

/** Body of GET /attendance-report. */
export interface AttendanceReportResponse {
  status: string;
  data: AttendanceReportRow[];
  total: number;
}

/** Row shape consumed by the DataGrid and the CSV/print outputs. */
export interface ChecklistGridRow {
  id: number;
  date: string;
  spell: string;
  ebNo: string;
  name: string;
  department: string;
  designation: string;
  source: string;
  /** Readable label: Regular / OT / Cash */
  attType: string;
  workingHours: number;
}

/** Values held by the filter form (all strings — MuiForm field values). */
export interface ChecklistFilterValues {
  from_date: string;
  to_date: string;
  branch_id: string;
  dept_id: string;
  designation_id: string;
  shift_name: string;
  att_type: string;
  emp_code: string;
  emp_name: string;
}

export interface Option {
  label: string;
  value: string;
}

/** Spell entry from /hrms/attendance_create_setup. */
export interface SpellSetupEntry {
  spell_id: number;
  spell_name: string;
}

/** Sub-department entry from /hrms/attendance_create_setup. */
export interface SubDeptSetupEntry {
  sub_dept_id: number;
  sub_dept_desc: string;
}

/** Body of GET /hrms/attendance_create_setup. */
export interface AttendanceSetupResponse {
  data?: {
    spells?: SpellSetupEntry[];
    sub_departments?: SubDeptSetupEntry[];
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (file is declarations only).

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboardportal/hrms/attendanceChecklist/types/attendanceChecklistTypes.ts
git commit -m "feat(attendance-checklist): add module types"
```

---

### Task 2: API constant, query builder, service function

**Files:**
- Modify: `src/utils/api.ts:748` (end of `apiRoutesPortalMasters`)
- Modify: `src/utils/hrmsService.ts` (append at end)
- Test: `src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.test.ts` (created here, grows in later tasks)

- [ ] **Step 1: Write the failing test**

Create `src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { buildAttendanceRegisterQuery } from "@/utils/hrmsService";

describe("buildAttendanceRegisterQuery", () => {
  it("always includes from_date and to_date", () => {
    const qs = buildAttendanceRegisterQuery({
      from_date: "2026-06-01",
      to_date: "2026-06-12",
    });
    expect(qs).toBe("from_date=2026-06-01&to_date=2026-06-12");
  });

  it("includes optional filters only when set, and encodes values", () => {
    const qs = buildAttendanceRegisterQuery({
      from_date: "2026-06-01",
      to_date: "2026-06-12",
      branch_id: 4,
      department_id: "",
      designation_id: undefined,
      shift_name: "A Spell",
      att_type: "R",
      emp_code: "",
      emp_name: "Ravi Kumar",
    });
    const params = new URLSearchParams(qs);
    expect(params.get("branch_id")).toBe("4");
    expect(params.get("shift_name")).toBe("A Spell");
    expect(params.get("att_type")).toBe("R");
    expect(params.get("emp_name")).toBe("Ravi Kumar");
    expect(params.has("department_id")).toBe(false);
    expect(params.has("designation_id")).toBe(false);
    expect(params.has("emp_code")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.test.ts`
Expected: FAIL — `buildAttendanceRegisterQuery` is not exported.

- [ ] **Step 3: Add the API constant**

In `src/utils/api.ts`, inside `apiRoutesPortalMasters`, directly after the line `ATTENDANCE_MACHINES: \`${API_URL}/hrms/attendance_machines_by_designation\`,` (line 748) add:

```typescript
    // Attendance register report — served by the Flask mobileapp mounted at the
    // backend root (no /hrms prefix). vowerp3be/src/mobileapp/src/attendance/attendance.py
    ATTENDANCE_REGISTER_REPORT: `${API_URL}/attendance-report`,
```

- [ ] **Step 4: Add the query builder and service function**

Append at the end of `src/utils/hrmsService.ts`:

```typescript
// ─── Attendance Checklist (flat register report) ───────────────────

export interface AttendanceRegisterParams {
  from_date: string;
  to_date: string;
  branch_id?: string | number;
  department_id?: string | number;
  designation_id?: string | number;
  shift_name?: string;
  att_type?: string;
  emp_code?: string;
  emp_name?: string;
}

/**
 * Builds the query string for GET /attendance-report.
 * Empty/undefined optional params are omitted. Exported for unit tests.
 */
export const buildAttendanceRegisterQuery = (
  params: AttendanceRegisterParams,
): string => {
  const qs = new URLSearchParams({
    from_date: params.from_date,
    to_date: params.to_date,
  });
  if (params.branch_id) qs.set("branch_id", String(params.branch_id));
  if (params.department_id) qs.set("department_id", String(params.department_id));
  if (params.designation_id) qs.set("designation_id", String(params.designation_id));
  if (params.shift_name) qs.set("shift_name", params.shift_name);
  if (params.att_type) qs.set("att_type", params.att_type);
  if (params.emp_code) qs.set("emp_code", params.emp_code);
  if (params.emp_name) qs.set("emp_name", params.emp_name);
  return qs.toString();
};

/** Flat attendance register rows for the Attendance Checklist page. */
export const fetchAttendanceRegister = async (params: AttendanceRegisterParams) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.ATTENDANCE_REGISTER_REPORT}?${buildAttendanceRegisterQuery(params)}`,
    "GET",
  );
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project unit src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/utils/api.ts src/utils/hrmsService.ts src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.test.ts
git commit -m "feat(attendance-checklist): add attendance-register route constant and service"
```

---

### Task 3: Row mapper, att-type labels, filter Zod schema

**Files:**
- Create: `src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.ts`
- Test: `src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.test.ts` (extend)

- [ ] **Step 1: Write the failing tests**

Append to `checklistUtils.test.ts`:

```typescript
import {
  ATT_TYPE_LABELS,
  attTypeLabel,
  checklistFilterSchema,
  mapReportRows,
} from "./checklistUtils";
import type { AttendanceReportRow } from "../types/attendanceChecklistTypes";

const makeRow = (overrides: Partial<AttendanceReportRow> = {}): AttendanceReportRow => ({
  id: 1,
  emp_code: "E001",
  eb_id: 10,
  emp_name: "Ravi Kumar",
  department_name: "Spinning",
  designation_name: "Operator",
  shift_name: "A",
  attendance_date: "2026-06-01",
  attendance_time: "08:01:23",
  exit_time: "",
  status: "Face",
  att_type: "R",
  shift_hours: 8,
  working_hours: 8,
  idle_hours: 0,
  has_photo: true,
  machine_nos: "",
  ...overrides,
});

describe("attTypeLabel", () => {
  it("maps known codes", () => {
    expect(ATT_TYPE_LABELS.R).toBe("Regular");
    expect(attTypeLabel("O")).toBe("OT");
    expect(attTypeLabel("C")).toBe("Cash");
  });

  it("passes unknown codes through unchanged", () => {
    expect(attTypeLabel("X")).toBe("X");
  });
});

describe("mapReportRows", () => {
  it("maps backend fields to grid fields", () => {
    const [row] = mapReportRows([makeRow()]);
    expect(row).toEqual({
      id: 1,
      date: "2026-06-01",
      spell: "A",
      ebNo: "E001",
      name: "Ravi Kumar",
      department: "Spinning",
      designation: "Operator",
      source: "Face",
      attType: "Regular",
      workingHours: 8,
    });
  });

  it("defaults blank fields safely", () => {
    const [row] = mapReportRows([
      makeRow({
        shift_name: "",
        emp_name: "",
        att_type: "",
        working_hours: undefined as unknown as number,
      }),
    ]);
    expect(row.spell).toBe("");
    expect(row.name).toBe("");
    expect(row.attType).toBe("Regular"); // blank code treated as R
    expect(row.workingHours).toBe(0);
  });
});

describe("checklistFilterSchema", () => {
  it("rejects missing dates and branch", () => {
    const res = checklistFilterSchema.safeParse({ from_date: "", to_date: "", branch_id: "" });
    expect(res.success).toBe(false);
  });

  it("rejects from_date after to_date", () => {
    const res = checklistFilterSchema.safeParse({
      from_date: "2026-06-12",
      to_date: "2026-06-01",
      branch_id: "4",
    });
    expect(res.success).toBe(false);
  });

  it("accepts a valid range", () => {
    const res = checklistFilterSchema.safeParse({
      from_date: "2026-06-01",
      to_date: "2026-06-12",
      branch_id: "4",
    });
    expect(res.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run --project unit src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.test.ts`
Expected: FAIL — `./checklistUtils` module not found.

- [ ] **Step 3: Implement `checklistUtils.ts`**

```typescript
/**
 * Pure helpers for the Attendance Checklist page: backend-row → grid-row
 * mapping, attendance-type labels, and filter validation.
 */
import { z } from "zod";
import type {
  AttendanceReportRow,
  ChecklistGridRow,
} from "../types/attendanceChecklistTypes";

/** attendance_type codes → readable labels (see vowerp3be mobileapp models). */
export const ATT_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  R: "Regular",
  O: "OT",
  C: "Cash",
});

export const attTypeLabel = (code: string): string =>
  ATT_TYPE_LABELS[code || "R"] ?? code;

export const mapReportRows = (rows: AttendanceReportRow[]): ChecklistGridRow[] =>
  rows.map((r) => ({
    id: r.id,
    date: r.attendance_date || "",
    spell: r.shift_name || "",
    ebNo: r.emp_code || "",
    name: r.emp_name || "",
    department: r.department_name || "",
    designation: r.designation_name || "",
    source: r.status || "",
    attType: attTypeLabel(r.att_type),
    workingHours: Number(r.working_hours ?? 0),
  }));

/** Mandatory search inputs. Optional filters are not validated (blank = all). */
export const checklistFilterSchema = z
  .object({
    from_date: z.string().min(1, "Please enter the From Date"),
    to_date: z.string().min(1, "Please enter the To Date"),
    branch_id: z.string().min(1, "Please select the Branch"),
  })
  .refine((v) => v.from_date <= v.to_date, {
    message: "From Date should not be greater than To Date",
  });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run --project unit src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboardportal/hrms/attendanceChecklist/utils/
git commit -m "feat(attendance-checklist): add row mapper, att-type labels, filter schema"
```

---

### Task 4: v1 page — filters (dates + branch) and grid

**Files:**
- Create: `src/app/dashboardportal/hrms/attendanceChecklist/page.tsx`

- [ ] **Step 1: Create the page**

Full file content (composition copied from `hrms/payRoll/page.tsx`; v2 adds more fields to the same skeleton):

```tsx
"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Box,
  Chip,
  Paper,
  Snackbar,
  Typography,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
} from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import MuiForm, {
  type Field,
  type MuiFormHandle,
  type Schema,
} from "@/components/ui/muiform";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchAttendanceRegister } from "@/utils/hrmsService";
import {
  checklistFilterSchema,
  mapReportRows,
} from "./utils/checklistUtils";
import type {
  AttendanceReportResponse,
  ChecklistFilterValues,
  ChecklistGridRow,
  Option,
} from "./types/attendanceChecklistTypes";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];

const INITIAL_FILTERS: ChecklistFilterValues = {
  from_date: "",
  to_date: "",
  branch_id: "",
  dept_id: "",
  designation_id: "",
  shift_name: "",
  att_type: "",
  emp_code: "",
  emp_name: "",
};

function AttendanceChecklistContent() {
  const { selectedBranches, selectedCompany } = useSidebarContext();
  const formRef = useRef<MuiFormHandle>(null);

  // Branch is pre-seeded from the branch selected in the left sidebar.
  const sidebarBranchId =
    selectedBranches.length > 0 ? String(selectedBranches[0]) : "";

  // Seed WITHOUT the sidebar branch so the first client render matches the
  // server-rendered HTML (sidebar context hydrates from localStorage after
  // mount). The post-mount effect below pushes the resolved branch in.
  const [filters, setFilters] = useState<ChecklistFilterValues>(INITIAL_FILTERS);
  const prevBranchRef = useRef<string>(sidebarBranchId);

  const [gridRows, setGridRows] = useState<ChecklistGridRow[]>([]);
  const [showGrid, setShowGrid] = useState(false);
  const [searching, setSearching] = useState(false);
  // The range actually searched — used for the result header (and later the
  // CSV filename), so it never drifts from the loaded rows when the form edits.
  const [searchedRange, setSearchedRange] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  const notify = useCallback(
    (message: string, severity: "success" | "error" | "info" = "info") =>
      setSnackbar({ open: true, message, severity }),
    [],
  );

  // Branch options limited to the sidebar-selected branch(es).
  const branchOptions = useMemo<Option[]>(
    () =>
      (selectedCompany?.branches ?? [])
        .filter((b) => selectedBranches.includes(b.branch_id))
        .map((b) => ({ label: b.branch_name, value: String(b.branch_id) })),
    [selectedCompany, selectedBranches],
  );

  const effectiveBranchId = useMemo<string>(() => {
    if (
      sidebarBranchId &&
      branchOptions.some((o) => String(o.value) === sidebarBranchId)
    ) {
      return sidebarBranchId;
    }
    return "";
  }, [sidebarBranchId, branchOptions]);

  // Push the resolved branch into the form once its option exists.
  useEffect(() => {
    if (!effectiveBranchId) return;
    formRef.current?.setValue("branch_id", effectiveBranchId);
    if (effectiveBranchId !== prevBranchRef.current) {
      prevBranchRef.current = effectiveBranchId;
    }
  }, [effectiveBranchId, branchOptions]);

  const filterSchema = useMemo<Schema>(
    () => ({
      fields: [
        {
          name: "from_date",
          label: "From Date",
          type: "date",
          required: true,
          grid: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: "to_date",
          label: "To Date",
          type: "date",
          required: true,
          grid: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: "branch_id",
          label: "Branch",
          type: "select",
          options: branchOptions,
          required: true,
          grid: { xs: 12, sm: 6, md: 3 },
        },
      ] satisfies Field[],
    }),
    [branchOptions],
  );

  const handleFilterChange = useCallback((vals: Record<string, unknown>) => {
    setFilters((prev) => ({ ...prev, ...(vals as Partial<ChecklistFilterValues>) }));
  }, []);

  const handleSearch = useCallback(async () => {
    const parsed = checklistFilterSchema.safeParse(filters);
    if (!parsed.success) {
      notify(parsed.error.issues[0]?.message ?? "Invalid filters", "error");
      return;
    }
    setSearching(true);
    try {
      const res = await fetchAttendanceRegister({
        from_date: filters.from_date,
        to_date: filters.to_date,
        branch_id: filters.branch_id,
      });
      if (res.error || !res.data) {
        throw new Error(res.error || "Failed to fetch attendance");
      }
      const body = res.data as AttendanceReportResponse;
      const rows = Array.isArray(body.data) ? body.data : [];
      setGridRows(mapReportRows(rows));
      setSearchedRange({ from: filters.from_date, to: filters.to_date });
      setShowGrid(true);
    } catch (err: unknown) {
      notify(
        err instanceof Error ? err.message : "Failed to fetch attendance",
        "error",
      );
    } finally {
      setSearching(false);
    }
  }, [filters, notify]);

  const gridColumns = useMemo<GridColDef[]>(
    () => [
      { field: "date", headerName: "Date", width: 110 },
      { field: "spell", headerName: "Spell", width: 90 },
      { field: "ebNo", headerName: "EB No", width: 100 },
      { field: "name", headerName: "Name", flex: 1, minWidth: 180 },
      { field: "department", headerName: "Department", width: 150 },
      { field: "designation", headerName: "Designation", width: 150 },
      {
        field: "source",
        headerName: "Source",
        width: 110,
        renderCell: (params) =>
          params.value ? (
            <Chip
              size="small"
              variant="outlined"
              label={String(params.value)}
              color={params.value === "Face" ? "success" : "default"}
            />
          ) : null,
      },
      { field: "attType", headerName: "Type", width: 100 },
      {
        field: "workingHours",
        headerName: "Working Hours",
        width: 130,
        type: "number",
      },
    ],
    [],
  );

  return (
    <Box className="flex min-h-screen flex-col gap-6 bg-gray-50 p-8">
      <Box className="flex flex-col gap-1">
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Attendance Checklist
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Daily attendance register
        </Typography>
      </Box>

      {/* Filters */}
      <Paper className="p-4">
        <MuiForm
          ref={formRef}
          schema={filterSchema}
          initialValues={filters as unknown as Record<string, unknown>}
          mode="edit"
          onValuesChange={handleFilterChange}
          hideModeToggle
          hideSubmit
        />
        <Box className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </Button>
        </Box>
      </Paper>

      {/* Register grid */}
      {showGrid && (
        <Paper className="p-4">
          <Box className="mb-2 flex items-center justify-between">
            <Typography variant="subtitle1">
              {gridRows.length} record{gridRows.length === 1 ? "" : "s"} from{" "}
              {searchedRange.from} to {searchedRange.to}
            </Typography>
          </Box>
          <Box sx={{ width: "100%" }}>
            <DataGrid
              rows={gridRows}
              columns={gridColumns}
              getRowId={(row) => row.id}
              autoHeight
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[25, 50, 100]}
              disableRowSelectionOnClick
            />
          </Box>
        </Paper>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function AttendanceChecklistPage() {
  return (
    <Suspense
      fallback={
        <Box className="p-4">
          <Typography>Loading...</Typography>
        </Box>
      }
    >
      <AttendanceChecklistContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Type-check and run the test suite**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `pnpm test` — expected: all existing tests still pass.

- [ ] **Step 3: Manual smoke test**

1. `pnpm dev`
2. Log into the portal on a tenant subdomain (e.g. `http://dev3.localhost:3000`).
3. Ensure a menu row exists for `/dashboardportal/hrms/attendanceChecklist` (see deployment note at top); otherwise navigate directly and expect a redirect to `/dashboardportal` — that confirms the middleware gate, then add the menu row.
4. With the menu in place: pick a date range with known attendance (e.g. 2026-06-01 → 2026-06-12), branch pre-filled from the sidebar, press Search.
5. Expected: grid shows one row per attendance record with all 9 columns; Source shows Face/Manual chips; count header matches.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboardportal/hrms/attendanceChecklist/page.tsx
git commit -m "feat(attendance-checklist): add v1 page with date/branch filters and register grid"
```

---

### Task 5: v2 backend — designation_id and att_type filters (repo: vowerp3be)

**Files:**
- Modify: `d:\vownextjs\vowerp3be\src\mobileapp\src\attendance\attendance.py:400-469`
- Modify: `d:\vownextjs\vowerp3be\src\mobileapp\src\schemas\attendance.py:23-26`

- [ ] **Step 1: Read the filter args in the endpoint**

In `attendance_report()` (`attendance.py`), after the line `branch_id       = request.args.get('branch_id', type=int)` (line 404) add:

```python
        designation_id  = request.args.get('designation_id', type=int)
        att_type        = request.args.get('att_type', '').strip()
```

- [ ] **Step 2: Add the WHERE clauses**

After the existing `shift_name` filter block (lines 467-469):

```python
        if shift_name and shift_name != 'All Shifts':
            sql += " AND da.spell = %s"
            params.append(shift_name)
```

add:

```python
        if designation_id:
            sql += " AND da.worked_designation_id = %s"
            params.append(designation_id)

        if att_type:
            sql += " AND da.attendance_type = %s"
            params.append(att_type)
```

- [ ] **Step 3: Document the params in the schema**

In `schemas/attendance.py`, update `AttendanceReportSchema`:

```python
class AttendanceReportSchema(Schema):
    """Query-param schema — validate from request.args."""
    required = ['from_date', 'to_date']
    optional = ['department_id', 'emp_code', 'designation_id', 'att_type']
```

(The base `Schema` only enforces `required`; `optional` is documentation. No behavior change for existing callers.)

- [ ] **Step 4: Verify manually**

With the backend running (per the vowerp3be README / usual dev command):

```bash
curl -s "http://localhost:8000/attendance-report?from_date=2026-06-01&to_date=2026-06-12&branch_id=4" -H "X-Tenant: <tenant>" | head -c 400
curl -s "http://localhost:8000/attendance-report?from_date=2026-06-01&to_date=2026-06-12&branch_id=4&att_type=R" -H "X-Tenant: <tenant>" | head -c 400
curl -s "http://localhost:8000/attendance-report?from_date=2026-06-01&to_date=2026-06-12&branch_id=4&designation_id=1" -H "X-Tenant: <tenant>" | head -c 400
```

Expected: all three return `{"status": "success", ...}`; the filtered calls return a subset (or equal) `total` versus the unfiltered call. (No automated test: the mobileapp blueprint has no test fixtures/DB harness; these are two parameterized WHERE clauses following the endpoint's existing pattern.)

- [ ] **Step 5: Commit (in the backend repo)**

```bash
git -C d:\vownextjs\vowerp3be add src/mobileapp/src/attendance/attendance.py src/mobileapp/src/schemas/attendance.py
git -C d:\vownextjs\vowerp3be commit -m "feat(attendance-report): optional designation_id and att_type filters"
```

---

### Task 6: v2 frontend — full filter set

**Files:**
- Modify: `src/app/dashboardportal/hrms/attendanceChecklist/page.tsx`

All edits are within `AttendanceChecklistContent`. No new tests: the query builder already covers all params (Task 2) and the new code is wiring/options state (covered by the existing muiform tests + manual check).

- [ ] **Step 1: Add imports**

Extend the existing import from `@/utils/hrmsService`:

```typescript
import {
  fetchAttendanceCreateSetup,
  fetchAttendanceRegister,
  fetchDesignationsBySubDept,
} from "@/utils/hrmsService";
```

Add to the type import from `./types/attendanceChecklistTypes`:

```typescript
import type {
  AttendanceReportResponse,
  AttendanceSetupResponse,
  ChecklistFilterValues,
  ChecklistGridRow,
  Option,
} from "./types/attendanceChecklistTypes";
```

Add the company hook import (designations endpoint needs `co_id`):

```typescript
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
```

- [ ] **Step 2: Add option state and setup fetch**

Inside `AttendanceChecklistContent`, after the `notify` callback add:

```typescript
  const { coId } = useSelectedCompanyCoId();
  const [spellOptions, setSpellOptions] = useState<Option[]>(EMPTY_OPTIONS);
  const [departmentOptions, setDepartmentOptions] = useState<Option[]>(EMPTY_OPTIONS);
  const [designationOptions, setDesignationOptions] = useState<Option[]>(EMPTY_OPTIONS);

  // Spells and sub-departments are branch-scoped; refetch when branch changes.
  useEffect(() => {
    if (!filters.branch_id) {
      setSpellOptions(EMPTY_OPTIONS);
      setDepartmentOptions(EMPTY_OPTIONS);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetchAttendanceCreateSetup(filters.branch_id);
      if (cancelled || res.error || !res.data) return;
      const setup = (res.data as AttendanceSetupResponse).data;
      setSpellOptions(
        (setup?.spells ?? []).map((s) => ({
          // The report endpoint filters by spell NAME (da.spell), not id.
          label: s.spell_name,
          value: s.spell_name,
        })),
      );
      setDepartmentOptions(
        (setup?.sub_departments ?? []).map((d) => ({
          label: d.sub_dept_desc,
          value: String(d.sub_dept_id),
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.branch_id]);

  // Designations cascade from the selected department.
  useEffect(() => {
    if (!coId || !filters.dept_id) {
      setDesignationOptions(EMPTY_OPTIONS);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetchDesignationsBySubDept(coId, filters.dept_id);
      if (cancelled || res.error || !res.data) return;
      const body = res.data as { data?: Option[] };
      setDesignationOptions(body.data ?? EMPTY_OPTIONS);
    })();
    return () => {
      cancelled = true;
    };
  }, [coId, filters.dept_id]);
```

- [ ] **Step 3: Cascade-reset branch-scoped filters on branch change**

Replace the branch-seeding effect's inner `if` so dependents clear when the branch really changes:

```typescript
  useEffect(() => {
    if (!effectiveBranchId) return;
    formRef.current?.setValue("branch_id", effectiveBranchId);
    if (effectiveBranchId !== prevBranchRef.current) {
      prevBranchRef.current = effectiveBranchId;
      formRef.current?.setValue("dept_id", "");
      formRef.current?.setValue("designation_id", "");
      formRef.current?.setValue("shift_name", "");
    }
  }, [effectiveBranchId, branchOptions]);
```

And extend `handleFilterChange` to do the same when the user edits the branch field directly, plus reset designation when department changes:

```typescript
  const handleFilterChange = useCallback((vals: Record<string, unknown>) => {
    const incoming = vals as Partial<ChecklistFilterValues>;
    setFilters((prev) => ({ ...prev, ...incoming }));

    const incomingBranch = incoming.branch_id;
    if (
      typeof incomingBranch === "string" &&
      incomingBranch !== prevBranchRef.current
    ) {
      prevBranchRef.current = incomingBranch;
      formRef.current?.setValue("dept_id", "");
      formRef.current?.setValue("designation_id", "");
      formRef.current?.setValue("shift_name", "");
    }
    if (typeof incoming.dept_id === "string") {
      formRef.current?.setValue("designation_id", "");
    }
  }, []);
```

- [ ] **Step 4: Extend the filter schema fields**

Replace the `filterSchema` memo with the full field set (static attendance-type options defined above the component, next to `INITIAL_FILTERS`):

```typescript
const ATT_TYPE_OPTIONS: Option[] = Object.freeze([
  { label: "Regular", value: "R" },
  { label: "OT", value: "O" },
  { label: "Cash", value: "C" },
]) as unknown as Option[];
```

```typescript
  const filterSchema = useMemo<Schema>(
    () => ({
      fields: [
        { name: "from_date", label: "From Date", type: "date", required: true, grid: { xs: 12, sm: 6, md: 3 } },
        { name: "to_date", label: "To Date", type: "date", required: true, grid: { xs: 12, sm: 6, md: 3 } },
        { name: "branch_id", label: "Branch", type: "select", options: branchOptions, required: true, grid: { xs: 12, sm: 6, md: 3 } },
        { name: "dept_id", label: "Department", type: "select", options: departmentOptions, grid: { xs: 12, sm: 6, md: 3 } },
        { name: "designation_id", label: "Designation", type: "select", options: designationOptions, grid: { xs: 12, sm: 6, md: 3 } },
        { name: "shift_name", label: "Spell", type: "select", options: spellOptions, grid: { xs: 12, sm: 6, md: 3 } },
        { name: "att_type", label: "Attendance Type", type: "select", options: ATT_TYPE_OPTIONS, grid: { xs: 12, sm: 6, md: 3 } },
        { name: "emp_code", label: "EB No", type: "text", grid: { xs: 12, sm: 6, md: 3 } },
        { name: "emp_name", label: "Employee Name", type: "text", grid: { xs: 12, sm: 6, md: 3 } },
      ] satisfies Field[],
    }),
    [branchOptions, departmentOptions, designationOptions, spellOptions],
  );
```

- [ ] **Step 5: Send the new params on search**

Replace the `fetchAttendanceRegister` call inside `handleSearch`:

```typescript
      const res = await fetchAttendanceRegister({
        from_date: filters.from_date,
        to_date: filters.to_date,
        branch_id: filters.branch_id,
        department_id: filters.dept_id || undefined,
        designation_id: filters.designation_id || undefined,
        shift_name: filters.shift_name || undefined,
        att_type: filters.att_type || undefined,
        emp_code: filters.emp_code.trim() || undefined,
        emp_name: filters.emp_name.trim() || undefined,
      });
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `pnpm test` — expected: pass.
Manual: with both servers running, confirm (a) Department/Spell options populate after the branch resolves, (b) selecting a Department populates Designation, (c) changing Branch clears Department/Designation/Spell, (d) each filter narrows the result set, (e) EB No / Name do partial matches.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboardportal/hrms/attendanceChecklist/page.tsx
git commit -m "feat(attendance-checklist): add department, designation, spell, type and employee filters"
```

---

### Task 7: v3 — CSV export

**Files:**
- Modify: `src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.ts`
- Modify: `src/app/dashboardportal/hrms/attendanceChecklist/page.tsx`
- Test: `src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.test.ts` (extend)

- [ ] **Step 1: Write the failing tests**

Append to `checklistUtils.test.ts` (extend the existing import from `./checklistUtils` with `rowsToCsv, csvFilename`):

```typescript
describe("rowsToCsv", () => {
  const gridRow = {
    id: 1,
    date: "2026-06-01",
    spell: "A",
    ebNo: "E001",
    name: "Kumar, Ravi",
    department: "Spinning",
    designation: 'Operator "Sr"',
    source: "Face",
    attType: "Regular",
    workingHours: 7.5,
  };

  it("emits a header row and one line per record", () => {
    const csv = rowsToCsv([gridRow]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Date,Spell,EB No,Name,Department,Designation,Source,Type,Working Hours",
    );
    expect(lines).toHaveLength(2);
  });

  it("escapes commas and quotes", () => {
    const csv = rowsToCsv([gridRow]);
    expect(csv).toContain('"Kumar, Ravi"');
    expect(csv).toContain('"Operator ""Sr"""');
  });
});

describe("csvFilename", () => {
  it("includes the searched range", () => {
    expect(csvFilename("2026-06-01", "2026-06-12")).toBe(
      "attendance-checklist_2026-06-01_2026-06-12.csv",
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run --project unit src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.test.ts`
Expected: FAIL — `rowsToCsv` / `csvFilename` not exported.

- [ ] **Step 3: Implement in `checklistUtils.ts`**

Append:

```typescript
const CSV_HEADERS = [
  "Date",
  "Spell",
  "EB No",
  "Name",
  "Department",
  "Designation",
  "Source",
  "Type",
  "Working Hours",
] as const;

const csvEscape = (value: string | number): string => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const rowsToCsv = (rows: ChecklistGridRow[]): string => {
  const lines = rows.map((r) =>
    [
      r.date,
      r.spell,
      r.ebNo,
      r.name,
      r.department,
      r.designation,
      r.source,
      r.attType,
      r.workingHours,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [CSV_HEADERS.join(","), ...lines].join("\n");
};

export const csvFilename = (fromDate: string, toDate: string): string =>
  `attendance-checklist_${fromDate}_${toDate}.csv`;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run --project unit src/app/dashboardportal/hrms/attendanceChecklist/utils/checklistUtils.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the Export button to the page**

In `page.tsx`, extend the `./utils/checklistUtils` import with `csvFilename, rowsToCsv` and add a handler after `handleSearch`:

```typescript
  const handleExportCsv = useCallback(() => {
    if (!gridRows.length) return;
    // "\uFEFF" = UTF-8 BOM so Excel opens accented names correctly.
    const blob = new Blob(["\uFEFF" + rowsToCsv(gridRows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename(searchedRange.from, searchedRange.to);
    a.click();
    URL.revokeObjectURL(url);
  }, [gridRows, searchedRange]);
```

In the results header `Box` (`className="mb-2 flex items-center justify-between"`), after the record-count `Typography`, add:

```tsx
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={!gridRows.length}
            >
              Export CSV
            </Button>
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` — expected: no errors.
Manual: search, click Export CSV, open the file — header + rows match the grid; a name containing a comma stays in one cell.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboardportal/hrms/attendanceChecklist/
git commit -m "feat(attendance-checklist): add CSV export"
```

---

### Task 8: v3 — print view

**Files:**
- Modify: `src/app/dashboardportal/hrms/attendanceChecklist/page.tsx`

Approach: the interactive UI is hidden in print (`print:hidden`); a plain full-width HTML table of the loaded rows renders only in print (`hidden print:block`). Tailwind's `print:` variant handles both — no extra stylesheet file.

- [ ] **Step 1: Add the Print button**

Next to the Export CSV button:

```tsx
            <Button
              variant="outline"
              onClick={() => window.print()}
              disabled={!gridRows.length}
            >
              Print
            </Button>
```

- [ ] **Step 2: Hide the interactive UI in print and add the print table**

Change the root container class to include `print:hidden`... — exact structure: keep the existing root `Box` as-is but wrap its *content* semantics by (a) adding `print:hidden` to the filter `Paper` and to the results `Paper`'s inner DataGrid `Box`, or — simpler and the planned approach — add `print:hidden` to the root `Box` and render a sibling print-only section. Implement it as a fragment around the two top-level blocks:

```tsx
  return (
    <>
      <Box className="flex min-h-screen flex-col gap-6 bg-gray-50 p-8 print:hidden">
        {/* ...everything currently rendered (unchanged)... */}
      </Box>

      {/* Print-only register (rendered when rows are loaded) */}
      <div className="hidden print:block">
        <h1 className="mb-1 text-lg font-semibold">Attendance Checklist</h1>
        <p className="mb-3 text-sm">
          {searchedRange.from} to {searchedRange.to} — {gridRows.length} records
        </p>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {[
                "Date",
                "Spell",
                "EB No",
                "Name",
                "Department",
                "Designation",
                "Source",
                "Type",
                "Working Hours",
              ].map((h) => (
                <th key={h} className="border border-gray-400 px-1 py-0.5 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gridRows.map((r) => (
              <tr key={r.id}>
                <td className="border border-gray-400 px-1 py-0.5">{r.date}</td>
                <td className="border border-gray-400 px-1 py-0.5">{r.spell}</td>
                <td className="border border-gray-400 px-1 py-0.5">{r.ebNo}</td>
                <td className="border border-gray-400 px-1 py-0.5">{r.name}</td>
                <td className="border border-gray-400 px-1 py-0.5">{r.department}</td>
                <td className="border border-gray-400 px-1 py-0.5">{r.designation}</td>
                <td className="border border-gray-400 px-1 py-0.5">{r.source}</td>
                <td className="border border-gray-400 px-1 py-0.5">{r.attType}</td>
                <td className="border border-gray-400 px-1 py-0.5 text-right">
                  {r.workingHours}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
```

(The print table prints ALL loaded rows, not just the current DataGrid page — that is intentional.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — expected: no errors.
Manual: search, click Print → the browser print preview shows only the title, range line, and the bordered table; the filter bar/grid chrome are absent. Cancel printing.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboardportal/hrms/attendanceChecklist/page.tsx
git commit -m "feat(attendance-checklist): add print view"
```

---

### Task 9: Final verification

- [ ] **Step 1: Full checks**

```bash
npx tsc --noEmit
pnpm test
pnpm lint
```

Expected: all clean. Fix anything that surfaces before proceeding.

- [ ] **Step 2: Console hygiene**

Run: `git diff main...HEAD -- src/app/dashboardportal/hrms/attendanceChecklist | grep -n "console\."`
Expected: no matches (remove any `console.log` found).

- [ ] **Step 3: End-to-end manual pass**

With backend + frontend running and the menu row in place: search v1 fields only; add each v2 filter one at a time; export CSV; print preview. Confirm against a couple of known `daily_attendance` rows in the tenant DB.

- [ ] **Step 4: Commit anything outstanding**

```bash
git status --short
```

Expected: clean (all work committed task-by-task).
