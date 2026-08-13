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
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import {
  fetchAttendanceCreateSetup,
  fetchAttendanceRegister,
  fetchDesignationsBySubDept,
} from "@/utils/hrmsService";
import { usePathname } from "next/navigation";
import { currentMonthRange } from "@/components/reports/reportDates";
import { resolveReportMenuId } from "@/utils/reportMenuService";
import {
  fetchHandsComplement,
  type HandsComplementRow,
} from "@/utils/hrmsReportService";
import { exportChecklistWorkbook } from "./utils/checklistExcel";
import { ATT_TYPE_LABELS, checklistFilterSchema, excelFilename, mapReportRows } from "./utils/checklistUtils";
import type {
  AttendanceReportResponse,
  AttendanceSetupResponse,
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

/** Select options derived from the canonical att_type label map. */
const ATT_TYPE_OPTIONS: Option[] = Object.entries(ATT_TYPE_LABELS).map(
  ([value, label]) => ({ label, value }),
);

function AttendanceChecklistContent() {
  const { selectedBranches, selectedCompany } = useSidebarContext();
  const formRef = useRef<MuiFormHandle>(null);
  // Resolves this page's menu_id for the "Report No" line in the export header.
  const pathname = usePathname();

  // Branch is pre-seeded from the branch selected in the left sidebar.
  const sidebarBranchId =
    selectedBranches.length > 0 ? String(selectedBranches[0]) : "";

  // Seed WITHOUT the sidebar branch so the first client render matches the
  // server-rendered HTML (sidebar context hydrates from localStorage after
  // mount). The post-mount effect below pushes the resolved branch in.
  // Dates default to the current month (1st → last), like the report pages.
  const [filters, setFilters] = useState<ChecklistFilterValues>(() => {
    const { from, to } = currentMonthRange();
    return { ...INITIAL_FILTERS, from_date: from, to_date: to };
  });
  const prevBranchRef = useRef<string>(sidebarBranchId);
  const prevDeptRef = useRef<string>("");

  const [gridRows, setGridRows] = useState<ChecklistGridRow[]>([]);
  const [showGrid, setShowGrid] = useState(false);
  const [searching, setSearching] = useState(false);
  const [exporting, setExporting] = useState(false);
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
      if (cancelled) return;
      if (res.error || !res.data) {
        setSpellOptions(EMPTY_OPTIONS);
        setDepartmentOptions(EMPTY_OPTIONS);
        notify(res.error || "Failed to load filter options", "error");
        return;
      }
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
  }, [filters.branch_id, notify]);

  // Designations cascade from the selected department.
  useEffect(() => {
    if (!coId || !filters.dept_id) {
      setDesignationOptions(EMPTY_OPTIONS);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetchDesignationsBySubDept(coId, filters.dept_id);
      if (cancelled) return;
      if (res.error || !res.data) {
        setDesignationOptions(EMPTY_OPTIONS);
        notify(res.error || "Failed to load filter options", "error");
        return;
      }
      const body = res.data as { data?: Option[] };
      setDesignationOptions(body.data ?? EMPTY_OPTIONS);
    })();
    return () => {
      cancelled = true;
    };
  }, [coId, filters.dept_id, notify]);

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

  // Push the resolved branch into the form once its option exists. The sidebar
  // context reads localStorage in a lazy initializer on the first CLIENT render,
  // so this runs post-mount and cannot cause an SSR mismatch.
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

  // onValuesChange fires with the FULL values object on every change (MuiForm
  // uses a useEffect on the entire values state). To avoid clearing
  // designation_id on every keystroke, we track the previous dept_id and only
  // clear designation when dept actually changes — matching the prevBranchRef
  // pattern used for branch cascades.
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

    const incomingDept = incoming.dept_id;
    if (
      typeof incomingDept === "string" &&
      incomingDept !== prevDeptRef.current
    ) {
      prevDeptRef.current = incomingDept;
      formRef.current?.setValue("designation_id", "");
    }
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
        department_id: filters.dept_id || undefined,
        designation_id: filters.designation_id || undefined,
        shift_name: filters.shift_name || undefined,
        att_type: filters.att_type || undefined,
        emp_code: filters.emp_code.trim() || undefined,
        emp_name: filters.emp_name.trim() || undefined,
      });
      if (res.error || !res.data) {
        throw new Error(res.error || "Failed to fetch attendance");
      }
      const body = res.data as AttendanceReportResponse;
      const rows = Array.isArray(body.data) ? body.data : [];
      setGridRows(mapReportRows(rows));
      setSearchedRange({ from: filters.from_date, to: filters.to_date });
      setShowGrid(true);
      setPaginationModel((m) => ({ ...m, page: 0 }));
    } catch (err: unknown) {
      notify(
        err instanceof Error ? err.message : "Failed to fetch attendance",
        "error",
      );
    } finally {
      setSearching(false);
    }
  }, [filters, notify]);

  // Column set mirrors the legacy report 657 (S.No … Remarks).
  const gridColumns = useMemo<GridColDef[]>(
    () => [
      { field: "sno", headerName: "S.No", width: 70 },
      { field: "date", headerName: "Attendance Date", width: 130 },
      { field: "spell", headerName: "Spell", width: 90 },
      { field: "ebNo", headerName: "EB_No", width: 100 },
      { field: "name", headerName: "Name", flex: 1, minWidth: 180 },
      { field: "department", headerName: "Department", width: 150 },
      { field: "designation", headerName: "Designation", width: 160 },
      { field: "attType", headerName: "Att_Type", width: 100 },
      {
        field: "source",
        headerName: "Attendance Source",
        width: 150,
        renderCell: (params) =>
          params.value ? (
            <Chip
              size="small"
              variant="outlined"
              label={String(params.value)}
              color={params.value === "F" ? "success" : "default"}
            />
          ) : null,
      },
      {
        field: "workingHours",
        headerName: "Working Hours",
        width: 130,
        type: "number",
      },
      { field: "machineNos", headerName: "MC Nos", width: 130 },
      { field: "remarks", headerName: "Remarks", flex: 1, minWidth: 140 },
    ],
    [],
  );

  // Same styled .xlsx the report pages produce (blue header band, borders,
  // company/branch/period block on top) — see components/reports/exportExcel.
  // Declared after gridColumns: block-scoped consts are not hoisted.
  const handleExportExcel = useCallback(async () => {
    if (!gridRows.length) return;
    setExporting(true);
    try {
      const branchName = branchOptions.find(
        (o) => String(o.value) === filters.branch_id,
      )?.label;
      // Sheet 2 is summary data the grid never loads, so fetch it on export.
      // A failure here must not cost the user the detail sheet.
      let handsRows: HandsComplementRow[] = [];
      if (coId != null) {
        try {
          handsRows = await fetchHandsComplement({
            coId: Number(coId),
            branchId: Number(filters.branch_id) || null,
            dateFrom: searchedRange.from,
            dateTo: searchedRange.to,
          });
        } catch {
          notify(
            "Hands Complement data could not be loaded — exporting the check list only",
            "error",
          );
        }
      }
      await exportChecklistWorkbook(
        gridColumns as GridColDef<ChecklistGridRow>[],
        gridRows,
        handsRows,
        excelFilename(searchedRange.from, searchedRange.to),
        {
          companyName: selectedCompany?.co_name,
          branchName,
          reportName: "Attendance Check List",
          reportNo: await resolveReportMenuId(pathname),
          reportFor: `${searchedRange.from} To ${searchedRange.to}`,
        },
      );
    } finally {
      setExporting(false);
    }
  }, [
    gridRows,
    gridColumns,
    searchedRange,
    branchOptions,
    filters.branch_id,
    selectedCompany?.co_name,
    pathname,
    coId,
    notify,
  ]);

  return (
    <>
      <Box className="flex min-h-screen flex-col gap-6 bg-gray-50 p-8 print:hidden">
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
              <Box className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    void handleExportExcel();
                  }}
                  disabled={!gridRows.length || exporting}
                >
                  {exporting ? "Exporting..." : "Export to Excel"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  disabled={!gridRows.length}
                >
                  Print
                </Button>
              </Box>
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

      {/* Print-only register (browser print renders just this) */}
      {showGrid && (
        <div className="hidden print:block">
          <h1 className="mb-1 text-lg font-semibold">Attendance Checklist</h1>
          <p className="mb-3 text-sm">
            {searchedRange.from} to {searchedRange.to} — {gridRows.length} records
          </p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  "S.No",
                  "Attendance Date",
                  "Spell",
                  "EB_No",
                  "Name",
                  "Department",
                  "Designation",
                  "Att_Type",
                  "Attendance Source",
                  "Working Hours",
                  "MC Nos",
                  "Remarks",
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
                  <td className="border border-gray-400 px-1 py-0.5">{r.sno}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{r.date}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{r.spell}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{r.ebNo}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{r.name}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{r.department}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{r.designation}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{r.attType}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{r.source}</td>
                  <td className="border border-gray-400 px-1 py-0.5 text-right">
                    {r.workingHours}
                  </td>
                  <td className="border border-gray-400 px-1 py-0.5">{r.machineNos}</td>
                  <td className="border border-gray-400 px-1 py-0.5">{r.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
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
