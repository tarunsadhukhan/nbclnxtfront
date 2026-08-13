"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { DataGrid, GridColDef, GridFilterModel, GridPaginationModel } from "@mui/x-data-grid";
import { Box, MenuItem, Snackbar, Alert, TextField } from "@mui/material";
import {
  Plus, Pencil, Eye, RefreshCw, FileSpreadsheet, Printer, Columns3, Filter, X,
  Search, Eraser, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext, useSidebarContextSafe } from "@/components/dashboard/sidebarContext";
import { fetchEmployeeList } from "@/utils/hrmsService";
import ClassicWindow, { ClassicButton, classic, classicGridSx } from "@/components/ui/classic/ClassicWindow";
import { useEmployeeSetup } from "./hooks/useEmployeeSetup";
import EmployeeFilterDialog from "./_components/EmployeeFilterDialog";
import type { EmployeeListRow, EmployeeFilters } from "./types/employeeTypes";
import { EMPLOYEE_LIFECYCLE_STATUS, EMPLOYEE_STATUS, EMPTY_EMPLOYEE_FILTERS } from "./types/employeeTypes";

/** Row as rendered — adds the classic serial-number column. */
type EmployeeRow = EmployeeListRow & { sl: number };

const ICON = 16;

/** Status dropdown value → is_active filter sent to the backend. */
const STATUS_FILTER: Record<string, number | null> = { all: null, active: 1, inactive: 0 };

/** Map DataGrid field names to backend filter param names */
const FIELD_TO_FILTER: Record<string, string> = {
  emp_code: "f_emp_code",
  full_name: "f_full_name",
  designation_name: "f_designation",
  mobile_no: "f_mobile",
  esi_no: "f_esi_no",
};

/** Popup filter fields → backend LIKE param names (dropdowns are sent separately). */
const FILTER_TO_PARAM: Partial<Record<keyof EmployeeFilters, string>> = {
  emp_code: "f_emp_code",
  full_name: "f_full_name",
  designation: "f_designation",
  esi_no: "f_esi_no",
  uan_no: "f_uan_no",
};

const RED_STATUSES: number[] = [
  EMPLOYEE_LIFECYCLE_STATUS.REJECTED,
  EMPLOYEE_LIFECYCLE_STATUS.BLACKLISTED,
  EMPLOYEE_LIFECYCLE_STATUS.TERMINATED,
];
const AMBER_STATUSES: number[] = [
  EMPLOYEE_LIFECYCLE_STATUS.RESIGNED,
  EMPLOYEE_LIFECYCLE_STATUS.IN_NOTICE,
  EMPLOYEE_STATUS.PENDING_APPROVAL,
];

function statusColor(statusId: number): string {
  if (statusId === EMPLOYEE_LIFECYCLE_STATUS.JOINED || statusId === EMPLOYEE_STATUS.APPROVED) return classic.ok;
  if (RED_STATUSES.includes(statusId)) return classic.danger;
  if (AMBER_STATUSES.includes(statusId)) return classic.warn;
  return classic.textMuted;
}

const CSV_COLUMNS: { header: string; key: keyof EmployeeListRow }[] = [
  { header: "Emp. Code", key: "emp_code" },
  { header: "Employee Name", key: "full_name" },
  { header: "Department", key: "sub_dept_name" },
  { header: "Designation", key: "designation_name" },
  { header: "Category", key: "category_name" },
  { header: "Mobile No.", key: "mobile_no" },
  { header: "ESI No.", key: "esi_no" },
  { header: "Date of Join", key: "date_of_join" },
  { header: "Status", key: "status_name" },
];

export default function EmployeeDatabasePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? selectedBranches.join(",") : "";

  const hasMenuAccess = useSidebarContextSafe()?.hasMenuAccess ?? (() => true);
  const canCreate = hasMenuAccess(pathname, "create");
  const canEdit = hasMenuAccess(pathname, "edit");
  const canView = hasMenuAccess(pathname, "view");

  const { subDeptOptions, categoryOptions } = useEmployeeSetup(coId, branchId);

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showGridToolbar, setShowGridToolbar] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  // Draft inputs — only applied when Search (or Enter) is pressed, the way the
  // desktop screen behaves. The popup owns its own draft; this page holds what
  // is actually applied.
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filters, setFilters] = useState<EmployeeFilters>(EMPTY_EMPLOYEE_FILTERS);

  const fetchData = useCallback(async () => {
    if (!coId || !branchId) return;
    setLoading(true);
    try {
      const likeFilters: Record<string, string> = { ...columnFilters };
      for (const [field, param] of Object.entries(FILTER_TO_PARAM)) {
        const v = filters[field as keyof EmployeeFilters];
        if (v) likeFilters[param] = v;
      }
      const { data, error } = await fetchEmployeeList(coId, {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        search: appliedSearch || undefined,
        branch_id: branchId,
        sub_dept_id: filters.sub_dept_id || undefined,
        cata_id: filters.cata_id || undefined,
        is_active: STATUS_FILTER[filters.status],
        columnFilters: Object.keys(likeFilters).length > 0 ? likeFilters : undefined,
      });
      if (error || !data) throw new Error(error || "Failed to fetch employees");
      const offset = paginationModel.page * paginationModel.pageSize;
      const mapped = (data.data ?? []).map((r: Record<string, unknown>, i: number) => ({
        ...r,
        id: r.eb_id as number,
        sl: offset + i + 1,
      })) as EmployeeRow[];
      setRows(mapped);
      setTotalRows(data.total ?? 0);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Error", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [coId, branchId, paginationModel.page, paginationModel.pageSize, appliedSearch, filters, columnFilters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilterModelChange = useCallback((model: GridFilterModel) => {
    setFilterModel(model);
    const filters: Record<string, string> = {};
    for (const item of model.items) {
      const backendKey = FIELD_TO_FILTER[item.field];
      if (backendKey && item.value) filters[backendKey] = String(item.value);
    }
    setColumnFilters(filters);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, []);

  const applySearch = useCallback(() => {
    setAppliedSearch(searchDraft.trim());
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [searchDraft]);

  const applyFilters = useCallback((next: EmployeeFilters) => {
    setFilters(next);
    setFilterOpen(false);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchDraft("");
    setAppliedSearch("");
    setFilters(EMPTY_EMPLOYEE_FILTERS);
    setFilterModel({ items: [] });
    setColumnFilters({});
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, []);

  /** Filters differing from the defaults — drives the toolbar button's pressed state. */
  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([k, v]) => v !== EMPTY_EMPLOYEE_FILTERS[k as keyof EmployeeFilters]).length,
    [filters],
  );

  const openEmployee = useCallback(
    (mode: "create" | "edit" | "view", ebId?: number) => {
      const query = mode === "create" ? "mode=create" : `mode=${mode}&eb_id=${ebId}`;
      router.push(`/dashboardportal/hrms/employeeDatabase/addEmployee?${query}`);
    },
    [router],
  );

  const selectedRow = useMemo(() => rows.find((r) => r.eb_id === selectedId) ?? null, [rows, selectedId]);

  /** Exports the rows currently on screen. ponytail: page-scoped export —
   *  switch to a backend export endpoint if full-dataset export is needed. */
  const exportCsv = useCallback(() => {
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      CSV_COLUMNS.map((c) => escape(c.header)).join(","),
      ...rows.map((row) => CSV_COLUMNS.map((c) => escape(row[c.key])).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "employee-master.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  const columns = useMemo<GridColDef<EmployeeRow>[]>(
    () => [
      {
        field: "__cur",
        headerName: "",
        width: 22,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (params.row.eb_id === selectedId ? <span style={{ color: classic.accent }}>▶</span> : null),
      },
      { field: "sl", headerName: "ID", width: 50, sortable: false, filterable: false, align: "right", headerAlign: "right" },
      { field: "emp_code", headerName: "Emp. Code", width: 110 },
      { field: "full_name", headerName: "Employee Name", flex: 1.2, minWidth: 160 },
      { field: "sub_dept_name", headerName: "Department", flex: 1, minWidth: 130 },
      { field: "designation_name", headerName: "Designation", flex: 1, minWidth: 130 },
      { field: "category_name", headerName: "Category", width: 120, filterable: false },
      { field: "date_of_join", headerName: "Date of Join", width: 110 },
      { field: "mobile_no", headerName: "Mobile No.", width: 120 },
      { field: "esi_no", headerName: "ESI No.", flex: 1, minWidth: 130 },
      {
        field: "status_name",
        headerName: "Status",
        width: 110,
        renderCell: (params) => (
          <span style={{ color: statusColor(params.row.status_id), fontWeight: 600 }}>
            {params.value ?? (params.row.active === 1 ? "Active" : "Inactive")}
          </span>
        ),
      },
    ],
    [selectedId],
  );

  const isRowEditable = selectedRow
    ? selectedRow.status_id === EMPLOYEE_STATUS.DRAFT || selectedRow.status_id === EMPLOYEE_STATUS.OPEN
    : false;

  const actions = useMemo(
    () => [
      { label: "New", icon: <Plus size={ICON} color={classic.ok} />, onClick: () => openEmployee("create"), disabled: !canCreate },
      {
        label: "Edit",
        icon: <Pencil size={ICON} color={classic.accent} />,
        onClick: () => selectedRow && openEmployee("edit", selectedRow.eb_id),
        disabled: !canEdit || !selectedRow || !isRowEditable,
      },
      {
        label: "View",
        icon: <Eye size={ICON} color={classic.textMuted} />,
        onClick: () => selectedRow && openEmployee("view", selectedRow.eb_id),
        disabled: !canView || !selectedRow,
      },
      { label: "Refresh", icon: <RefreshCw size={ICON} color={classic.ok} />, onClick: fetchData, separatorBefore: true },
      { label: "Export Excel", icon: <FileSpreadsheet size={ICON} color={classic.ok} />, onClick: exportCsv, disabled: rows.length === 0 },
      { label: "Print", icon: <Printer size={ICON} color={classic.text} />, onClick: () => window.print() },
      {
        label: "Columns",
        icon: <Columns3 size={ICON} color={classic.accent} />,
        onClick: () => setShowGridToolbar((v) => !v),
        active: showGridToolbar,
        separatorBefore: true,
      },
      {
        label: "Filter",
        icon: <Filter size={ICON} color={classic.accent} />,
        onClick: () => setFilterOpen(true),
        active: activeFilterCount > 0,
      },
      {
        label: "Close",
        icon: <X size={ICON} color={classic.danger} />,
        onClick: () => router.push("/dashboardportal"),
        separatorBefore: true,
      },
    ],
    [canCreate, canEdit, canView, selectedRow, isRowEditable, openEmployee, fetchData, exportCsv, rows.length, showGridToolbar, activeFilterCount, router],
  );

  const pageCount = Math.max(1, Math.ceil(totalRows / paginationModel.pageSize));
  const goToPage = (page: number) =>
    setPaginationModel((prev) => ({ ...prev, page: Math.min(Math.max(page, 0), pageCount - 1) }));

  const filterBar = (
    <>
      <ClassicButton onClick={() => setFilterOpen(true)}>
        <Filter size={13} /> Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
      </ClassicButton>

      <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
        <span>Search</span>
        <TextField
          size="small" sx={{ width: 240 }}
          placeholder="Enter Code, Name or Mobile..."
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
        />
        <ClassicButton onClick={applySearch}><Search size={13} /> Search</ClassicButton>
        <ClassicButton onClick={clearFilters}><Eraser size={13} /> Clear</ClassicButton>
      </Box>
    </>
  );

  return (
    <>
      <ClassicWindow
        title="Employee Master"
        actions={actions}
        filterBar={filterBar}
        statusRight={selectedRow ? `Selected: ${selectedRow.emp_code ?? ""} ${selectedRow.full_name}` : ""}
      >
        <Box sx={{ flex: 1, minHeight: 320, display: "flex", flexDirection: "column" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            rowCount={totalRows}
            loading={loading}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            filterMode="server"
            filterModel={filterModel}
            onFilterModelChange={handleFilterModelChange}
            showToolbar={showGridToolbar}
            hideFooter
            rowHeight={26}
            columnHeaderHeight={28}
            disableRowSelectionOnClick
            onRowClick={(params) => setSelectedId(params.row.eb_id)}
            onRowDoubleClick={(params) => {
              const row = params.row as EmployeeRow;
              const editable = row.status_id === EMPLOYEE_STATUS.DRAFT || row.status_id === EMPLOYEE_STATUS.OPEN;
              if (canEdit && editable) openEmployee("edit", row.eb_id);
              else if (canView) openEmployee("view", row.eb_id);
            }}
            getRowClassName={(params) => (params.row.eb_id === selectedId ? "classic-current" : "")}
            sx={{ ...classicGridSx, flex: 1, minHeight: 0 }}
          />

          {/* ── Classic pager ─────────────────────────────────── */}
          <Box
            sx={{
              display: "flex", alignItems: "center", gap: "6px", fontSize: 12,
              px: "6px", py: "3px", mt: "-1px",
              background: classic.face, border: `1px solid ${classic.border}`,
            }}
          >
            <ClassicButton title="First page" onClick={() => goToPage(0)} disabled={paginationModel.page === 0}>
              <ChevronsLeft size={13} />
            </ClassicButton>
            <ClassicButton title="Previous page" onClick={() => goToPage(paginationModel.page - 1)} disabled={paginationModel.page === 0}>
              <ChevronLeft size={13} />
            </ClassicButton>
            <ClassicButton title="Next page" onClick={() => goToPage(paginationModel.page + 1)} disabled={paginationModel.page >= pageCount - 1}>
              <ChevronRight size={13} />
            </ClassicButton>
            <ClassicButton title="Last page" onClick={() => goToPage(pageCount - 1)} disabled={paginationModel.page >= pageCount - 1}>
              <ChevronsRight size={13} />
            </ClassicButton>

            <span style={{ marginLeft: 8 }}>Page Size:</span>
            <TextField
              select size="small" sx={{ width: 80 }}
              value={paginationModel.pageSize}
              onChange={(e) => setPaginationModel({ page: 0, pageSize: Number(e.target.value) })}
            >
              {[10, 20, 50, 100].map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </TextField>

            <span style={{ marginLeft: "auto" }}>
              Page {paginationModel.page + 1} of {pageCount} ({totalRows} Records)
            </span>
          </Box>
        </Box>
      </ClassicWindow>

      <EmployeeFilterDialog
        open={filterOpen}
        value={filters}
        subDeptOptions={subDeptOptions}
        categoryOptions={categoryOptions}
        onApply={applyFilters}
        onClose={() => setFilterOpen(false)}
      />

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
    </>
  );
}
