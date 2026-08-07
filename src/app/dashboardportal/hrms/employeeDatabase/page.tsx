"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GridColDef, GridFilterModel, GridPaginationModel } from "@mui/x-data-grid";
import { Snackbar, Alert, Chip, Tabs, Tab } from "@mui/material";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchEmployeeList } from "@/utils/hrmsService";
import type { EmployeeListRow } from "./types/employeeTypes";
import { EMPLOYEE_STATUS } from "./types/employeeTypes";

const STATUS_COLOR: Record<number, "default" | "primary" | "warning" | "success" | "error" | "info"> = {
  [EMPLOYEE_STATUS.DRAFT]: "default",
  [EMPLOYEE_STATUS.OPEN]: "primary",
  [EMPLOYEE_STATUS.PENDING_APPROVAL]: "warning",
  [EMPLOYEE_STATUS.APPROVED]: "success",
  [EMPLOYEE_STATUS.REJECTED]: "error",
  [EMPLOYEE_STATUS.CLOSED]: "info",
  [EMPLOYEE_STATUS.CANCELLED]: "default",
};

/** Tab index → is_active filter: 0=Active(1), 1=Inactive(0), 2=Total(null) */
const TAB_ACTIVE_FILTER: (number | null)[] = [1, 0, null];

/** Map DataGrid field names to backend filter param names */
const FIELD_TO_FILTER: Record<string, string> = {
  emp_code: "f_emp_code",
  full_name: "f_full_name",
  designation_name: "f_designation",
  branch_name: "f_branch",
  mobile_no: "f_mobile",
  email_id: "f_email",
};

export default function EmployeeDatabasePage() {
  const router = useRouter();
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? selectedBranches.join(",") : "";

  const [activeTab, setActiveTab] = useState(0);
  const [rows, setRows] = useState<EmployeeListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  const isActiveFilter = TAB_ACTIVE_FILTER[activeTab];

  const handleFilterModelChange = useCallback((model: GridFilterModel) => {
    setFilterModel(model);
    const filters: Record<string, string> = {};
    for (const item of model.items) {
      const backendKey = FIELD_TO_FILTER[item.field];
      if (backendKey && item.value) {
        filters[backendKey] = String(item.value);
      }
    }
    setColumnFilters(filters);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, []);

  const fetchData = useCallback(async () => {
    if (!coId || !branchId) return;
    setLoading(true);
    try {
      const { data, error } = await fetchEmployeeList(coId, {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        search: searchQuery || undefined,
        branch_id: branchId,
        is_active: isActiveFilter,
        columnFilters: Object.keys(columnFilters).length > 0 ? columnFilters : undefined,
      });
      if (error || !data) throw new Error(error || "Failed to fetch employees");
      const mapped = (data.data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        id: r.eb_id as number,
      })) as EmployeeListRow[];
      setRows(mapped);
      setTotalRows(data.total ?? 0);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Error", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [coId, branchId, paginationModel.page, paginationModel.pageSize, searchQuery, isActiveFilter, columnFilters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, []);

  const columns = useMemo<GridColDef<EmployeeListRow>[]>(
    () => [
      { field: "emp_code", headerName: "Emp Code", flex: 0.8 },
      { field: "full_name", headerName: "Employee Name", flex: 1.2 },
      { field: "sub_dept_name", headerName: "Sub Department", flex: 1 },
      { field: "designation_name", headerName: "Designation", flex: 1 },
      { field: "branch_name", headerName: "Branch", flex: 0.8 },
      { field: "mobile_no", headerName: "Mobile", flex: 0.8 },
      { field: "email_id", headerName: "Email", flex: 1 },
      { field: "date_of_join", headerName: "Date of Joining", flex: 0.8 },
      {
        field: "status_name",
        headerName: "Status",
        flex: 0.7,
        renderCell: (params) => {
          const statusId = params.row.status_id;
          const color = STATUS_COLOR[statusId] ?? "default";
          return <Chip label={params.value ?? "Unknown"} color={color} size="small" />;
        },
      },
    ],
    [],
  );

  const handleView = useCallback(
    (row: EmployeeListRow) => router.push(`/dashboardportal/hrms/employeeDatabase/addEmployee?mode=view&eb_id=${row.eb_id}`),
    [router],
  );

  const handleEdit = useCallback(
    (row: EmployeeListRow) => router.push(`/dashboardportal/hrms/employeeDatabase/addEmployee?mode=edit&eb_id=${row.eb_id}`),
    [router],
  );

  const handleCreate = useCallback(
    () => router.push("/dashboardportal/hrms/employeeDatabase/addEmployee?mode=create"),
    [router],
  );

  return (
    <>
      <IndexWrapper<EmployeeListRow>
        title="Employee Database"
        subtitle="Manage employee records"
        rows={rows}
        columns={columns}
        rowCount={totalRows}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        loading={loading}
        search={{
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          placeholder: "Search by name, code, email...",
        }}
        createAction={{ label: "Add Employee", onClick: handleCreate }}
        onView={handleView}
        onEdit={handleEdit}
        isRowEditable={(row) => row.status_id === EMPLOYEE_STATUS.DRAFT || row.status_id === EMPLOYEE_STATUS.OPEN}
        filterMode="server"
        filterModel={filterModel}
        onFilterModelChange={handleFilterModelChange}
        toolbarContent={
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ minHeight: 36 }}>
            <Tab label="Active Employees" sx={{ minHeight: 36, py: 0.5 }} />
            <Tab label="InActive Employees" sx={{ minHeight: 36, py: 0.5 }} />
            <Tab label="Total Employees" sx={{ minHeight: 36, py: 0.5 }} />
          </Tabs>
        }
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
