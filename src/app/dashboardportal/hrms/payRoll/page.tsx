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
  Paper,
  Snackbar,
  Typography,
} from "@mui/material";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRenderEditCellParams,
} from "@mui/x-data-grid";
import { Download as DownloadIcon, Upload as UploadIcon, X as CloseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import MuiForm, {
  type Field,
  type MuiFormHandle,
  type Schema,
} from "@/components/ui/muiform";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  downloadPayRollTemplate,
  fetchPayRollData,
  fetchPayRollSetup,
  savePayRollData,
  uploadPayRollExcel,
} from "@/utils/hrmsService";
import type {
  EmployeePaySchemeRow,
  Option,
  PayComponentMeta,
  PayRollDataResponse,
  PayRollFilterValues,
  PayRollGridRow,
  PayRollSetupData,
} from "./types/payRollTypes";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];

const INITIAL_FILTERS: PayRollFilterValues = {
  from_date: "",
  to_date: "",
  pay_scheme_id: "",
  dept_id: "",
  branch_id: "",
  emp_category_id: "",
};

function PayRollContent() {
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches, selectedCompany } = useSidebarContext();
  const formRef = useRef<MuiFormHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Branch is driven by the branch selected in the left sidebar (defaults to the
  // only branch when a single one is available, since the sidebar pre-selects it).
  const sidebarBranchId = selectedBranches.length > 0 ? String(selectedBranches[0]) : "";

  const [setupData, setSetupData] = useState<PayRollSetupData | null>(null);
  // Seed the form WITHOUT the sidebar branch so the first client render matches
  // the server-rendered HTML. `sidebarBranchId` is derived from localStorage (via
  // the sidebar context), which is empty during SSR but populated on the client's
  // first render — seeding it here would shrink the Branch field's label on the
  // client only and trigger a hydration mismatch. The post-mount effect below
  // pushes the resolved branch into the form after hydration instead.
  const [filters, setFilters] = useState<PayRollFilterValues>(INITIAL_FILTERS);
  // Tracks the branch currently reflected in the form so we can cascade-reset
  // the branch-scoped filters (department, category) whenever it changes.
  const prevBranchRef = useRef<string>(sidebarBranchId);

  const [payComponents, setPayComponents] = useState<PayComponentMeta[]>([]);
  const [employees, setEmployees] = useState<EmployeePaySchemeRow[]>([]);
  const [payPeriodId, setPayPeriodId] = useState<number | null>(null);
  const [gridRows, setGridRows] = useState<PayRollGridRow[]>([]);
  const [showGrid, setShowGrid] = useState(false);

  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
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

  // Load setup (pay schemes, branches). Departments and categories are scoped to
  // the selected branch, so re-fetch whenever the branch changes.
  useEffect(() => {
    if (!coId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPayRollSetup(coId, filters.branch_id || undefined);
        const setup = (res?.data as { data?: PayRollSetupData } | null)?.data;
        if (!cancelled && setup) setSetupData(setup);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coId, filters.branch_id]);

  const paySchemeOptions = useMemo<Option[]>(
    () => setupData?.pay_schemes ?? EMPTY_OPTIONS,
    [setupData],
  );
  // Branch options are limited to the branches selected in the left sidebar
  // (their names come from the sidebar-selected company), so the field only ever
  // offers/holds the branch(es) the user picked in the left menu — not every
  // company branch.
  const branchOptions = useMemo<Option[]>(
    () =>
      (selectedCompany?.branches ?? [])
        .filter((b) => selectedBranches.includes(b.branch_id))
        .map((b) => ({
        label: b.branch_name,
        value: String(b.branch_id),
      })),
    [selectedCompany, selectedBranches],
  );
  const departmentOptions = useMemo<Option[]>(
    () => setupData?.departments ?? EMPTY_OPTIONS,
    [setupData],
  );
  const categoryOptions = useMemo<Option[]>(
    () => setupData?.categories ?? EMPTY_OPTIONS,
    [setupData],
  );

  // The Branch is populated solely from the branch selected in the left sidebar.
  // It is only used once that branch exists in the loaded branch options, since
  // the Autocomplete can only display a value present in its options.
  const effectiveBranchId = useMemo<string>(() => {
    if (sidebarBranchId && branchOptions.some((o) => String(o.value) === sidebarBranchId)) {
      return sidebarBranchId;
    }
    return "";
  }, [sidebarBranchId, branchOptions]);

  // Push the resolved branch into the form. This is re-asserted when branchOptions
  // load because the Autocomplete can only display a value present in its options.
  // Dependent filters (department, category) are cascade-reset on a real change.
  useEffect(() => {
    if (!effectiveBranchId) return;
    formRef.current?.setValue("branch_id", effectiveBranchId);
    if (effectiveBranchId !== prevBranchRef.current) {
      prevBranchRef.current = effectiveBranchId;
      formRef.current?.setValue("dept_id", "");
      formRef.current?.setValue("emp_category_id", "");
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
          name: "pay_scheme_id",
          label: "Pay Scheme",
          type: "select",
          options: paySchemeOptions,
          grid: { xs: 12, sm: 6, md: 3 },
        },
        {
          name: "dept_id",
          label: "Department",
          type: "select",
          options: departmentOptions,
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
        {
          name: "emp_category_id",
          label: "Category",
          type: "select",
          options: categoryOptions,
          grid: { xs: 12, sm: 6, md: 3 },
        },
      ] satisfies Field[],
    }),
    [paySchemeOptions, branchOptions, departmentOptions, categoryOptions],
  );

  const handleFilterChange = useCallback((vals: Record<string, unknown>) => {
    const incoming = vals as Partial<PayRollFilterValues>;
    setFilters((prev) => ({ ...prev, ...incoming }));

    // When the branch changes, clear the branch-scoped selections so a stale
    // department/category from another branch is never submitted.
    const incomingBranch = incoming.branch_id;
    if (typeof incomingBranch === "string" && incomingBranch !== prevBranchRef.current) {
      prevBranchRef.current = incomingBranch;
      formRef.current?.setValue("dept_id", "");
      formRef.current?.setValue("emp_category_id", "");
    }
  }, []);

  const validateDateRange = useCallback((): boolean => {
    if (!filters.from_date) {
      notify("Please enter the From Date", "error");
      return false;
    }
    if (!filters.to_date) {
      notify("Please enter the To Date", "error");
      return false;
    }
    if (filters.from_date > filters.to_date) {
      notify("From Date should not be greater than To Date", "error");
      return false;
    }
    return true;
  }, [filters.from_date, filters.to_date, notify]);

  const buildGridRows = useCallback(
    (comps: PayComponentMeta[], emps: EmployeePaySchemeRow[]): PayRollGridRow[] =>
      emps.map((emp, idx) => {
        const valueByComponent = new Map<number, number>();
        (emp.pcc_list ?? []).forEach((pcc) =>
          valueByComponent.set(pcc.component_id, pcc.value),
        );
        const row: PayRollGridRow = {
          id: emp.emp_id ?? idx,
          eb_id: emp.emp_id,
          emp_code: emp.emp_code,
          emp_name: emp.emp_name,
          pay_scheme_name: emp.pay_scheme_name,
        };
        comps.forEach((c) => {
          row[c.code] = valueByComponent.get(c.id) ?? 0;
        });
        return row;
      }),
    [],
  );

  const handleSearchAttendance = useCallback(async () => {
    if (!coId) return;
    if (!validateDateRange()) return;
    if (!filters.branch_id) {
      notify("Please select the Branch", "error");
      return;
    }
    setSearching(true);
    try {
      const res = await fetchPayRollData(coId, {
        from_date: filters.from_date,
        to_date: filters.to_date,
        branch_id: Number(filters.branch_id),
        pay_scheme_id: filters.pay_scheme_id ? Number(filters.pay_scheme_id) : undefined,
        dept_id: filters.dept_id ? Number(filters.dept_id) : undefined,
        emp_category_id: filters.emp_category_id ? Number(filters.emp_category_id) : undefined,
      });
      if (res?.error || !res?.data) throw new Error(res?.error || "Failed to fetch payroll data");
      const data = ((res.data as { data?: PayRollDataResponse } | null)?.data ?? {}) as PayRollDataResponse;
      const comps = data.pay_components ?? [];
      const emps = data.emp_pay_scheme_list ?? [];
      setPayComponents(comps);
      setEmployees(emps);
      setPayPeriodId(data.pay_period_id ?? null);
      setGridRows(buildGridRows(comps, emps));
      setShowGrid(true);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to fetch payroll data", "error");
    } finally {
      setSearching(false);
    }
  }, [coId, filters, validateDateRange, buildGridRows, notify]);

  const handleDownloadTemplate = useCallback(async () => {
    if (!coId) return;
    if (!filters.branch_id) {
      notify("Please select the Branch", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await downloadPayRollTemplate(coId, {
        branch_id: Number(filters.branch_id),
        pay_scheme_id: filters.pay_scheme_id ? Number(filters.pay_scheme_id) : undefined,
        dept_id: filters.dept_id ? Number(filters.dept_id) : undefined,
        emp_category_id: filters.emp_category_id ? Number(filters.emp_category_id) : undefined,
      });
      if (res?.error || !res?.data) throw new Error(res?.error || "Failed to download template");
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "PayRoll.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to download template", "error");
    } finally {
      setActionLoading(false);
    }
  }, [coId, filters, notify]);

  const handleUploadClick = useCallback(() => {
    if (!validateDateRange()) return;
    fileInputRef.current?.click();
  }, [validateDateRange]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !coId) return;
      setActionLoading(true);
      try {
        const res = await uploadPayRollExcel(coId, file, {
          from_date: filters.from_date,
          to_date: filters.to_date,
        });
        if (res?.error) throw new Error(res.error);
        setUploadedFileName(file.name);
        notify("File uploaded successfully", "success");
      } catch (err: unknown) {
        notify(err instanceof Error ? err.message : "Failed to upload file", "error");
      } finally {
        setActionLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [coId, filters.from_date, filters.to_date, notify],
  );

  const handleClearFile = useCallback(() => {
    setUploadedFileName("");
  }, []);

  const handleProcessRowUpdate = useCallback(
    (newRow: PayRollGridRow): PayRollGridRow => {
      setGridRows((rows) => rows.map((r) => (r.id === newRow.id ? newRow : r)));
      return newRow;
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!coId) return;
    if (gridRows.length === 0) {
      notify("No data to save", "error");
      return;
    }
    setSaving(true);
    try {
      const componentCodeToId = new Map(payComponents.map((c) => [c.code, c.id]));
      const employeesPayload = gridRows.map((row) => {
        const pay_comp_values: Record<string, number> = {};
        payComponents.forEach((c) => {
          const raw = row[c.code];
          const num = typeof raw === "number" ? raw : Number(raw ?? 0);
          const id = componentCodeToId.get(c.code);
          if (id != null) pay_comp_values[String(id)] = Number.isFinite(num) ? num : 0;
        });
        return { eb_id: row.eb_id, pay_comp_values };
      });
      const res = await savePayRollData(coId, {
        from_date: filters.from_date,
        to_date: filters.to_date,
        pay_period_id: payPeriodId,
        employees: employeesPayload,
      });
      if (res?.error) throw new Error(res.error);
      notify("Pay roll data saved successfully", "success");
      setShowGrid(false);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to save pay roll data", "error");
    } finally {
      setSaving(false);
    }
  }, [coId, gridRows, payComponents, filters.from_date, filters.to_date, payPeriodId, notify]);

  const handleCancelGrid = useCallback(() => {
    setShowGrid(false);
    setGridRows([]);
    setPayComponents([]);
    setEmployees([]);
    setPayPeriodId(null);
  }, []);

  const gridColumns = useMemo<GridColDef<PayRollGridRow>[]>(() => {
    const fixedCols: GridColDef<PayRollGridRow>[] = [
      { field: "emp_code", headerName: "Employee Code", flex: 0.8, minWidth: 120 },
      { field: "emp_name", headerName: "Employee Name", flex: 1.2, minWidth: 160 },
      { field: "pay_scheme_name", headerName: "PayScheme Name", flex: 1, minWidth: 140 },
    ];
    const dynamicCols: GridColDef<PayRollGridRow>[] = payComponents.map((c) => ({
      field: c.code,
      headerName: c.name ?? c.code,
      flex: 0.7,
      minWidth: 110,
      type: "number",
      editable: true,
      renderEditCell: (params: GridRenderEditCellParams) => (
        <input
          type="number"
          autoFocus
          defaultValue={params.value as number}
          onChange={(e) =>
            params.api.setEditCellValue({
              id: params.id,
              field: params.field,
              value: e.target.value === "" ? 0 : Number(e.target.value),
            })
          }
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          style={{ width: "100%", padding: "0 8px", border: "none", outline: "none" }}
        />
      ),
    }));
    return [...fixedCols, ...dynamicCols];
  }, [payComponents]);

  return (
    <Box className="flex min-h-screen flex-col gap-6 bg-gray-50 p-8">
      {/* Page header — same title/subtitle convention as pay register (IndexWrapper) */}
      <Box className="flex flex-col gap-1">
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Payroll Data
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload Payroll Data
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
          <Button onClick={handleSearchAttendance} disabled={searching}>
            {searching ? "Searching..." : "Search Attendance"}
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            disabled={actionLoading}
            className="flex items-center gap-2"
          >
            <DownloadIcon size={16} />
            Download Excel For Reference
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />

          {uploadedFileName ? (
            <Box className="flex items-center gap-2 rounded border border-gray-200 px-3 py-1">
              <Typography variant="body2">{uploadedFileName}</Typography>
              <button
                type="button"
                onClick={handleClearFile}
                aria-label="Clear uploaded file"
                className="flex items-center"
              >
                <CloseIcon size={16} />
              </button>
            </Box>
          ) : (
            <Button
              variant="outline"
              onClick={handleUploadClick}
              disabled={actionLoading}
              className="flex items-center gap-2"
            >
              <UploadIcon size={16} />
              Upload Excel File
            </Button>
          )}
        </Box>
      </Paper>

      {/* Employee × Pay Component editable grid */}
      {showGrid && (
        <Paper className="p-4">
          <Box className="mb-2 flex items-center justify-between">
            <Typography variant="subtitle1">
              {employees.length} employee{employees.length === 1 ? "" : "s"} loaded
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
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              processRowUpdate={handleProcessRowUpdate}
              sx={{
                "& .MuiDataGrid-columnHeader": {
                  backgroundColor: "hsl(var(--table-header))",
                  color: "white",
                  fontWeight: "bold",
                },
              }}
            />
          </Box>
          <Box className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelGrid} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
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

export default function PayRollPage() {
  return (
    <Suspense
      fallback={
        <Box className="p-4">
          <Typography>Loading...</Typography>
        </Box>
      }
    >
      <PayRollContent />
    </Suspense>
  );
}
