"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import {
  Snackbar,
  Alert,
  Chip,
  TextField,
  MenuItem,
  Stack,
} from "@mui/material";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  fetchLeaveRequestList,
  fetchLeaveTypeOptions,
} from "@/utils/hrmsService";
import {
  LeaveRequestListRow,
  LeaveTypeOption,
  STATUS_COLOR,
  STATUS_LABELS,
  STATUS_FILTER_OPTIONS,
} from "./types/leaveRequestTypes";

const formatDDMMYYYY = (value: unknown): string => {
  if (!value) return "";
  const str = String(value);
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

// Actual leave days = inclusive date span minus non-working days.
const computeLeaveDays = (row: LeaveRequestListRow): number => {
  const from = new Date(row.leave_from_date);
  const to = new Date(row.leave_to_date);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const days = spanDays - (row.non_working_days ?? 0);
  return days > 0 ? days : 0;
};

export default function LeaveRequestPage() {
  const router = useRouter();
  const { coId } = useSelectedCompanyCoId();
  const { selectedCompany, selectedBranches } = useSidebarContext();

  const branchOptions = useMemo(
    () =>
      (selectedCompany?.branches ?? []).filter((b) =>
        selectedBranches.includes(b.branch_id),
      ),
    [selectedCompany, selectedBranches],
  );

  const [rows, setRows] = useState<LeaveRequestListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [ebNo, setEbNo] = useState<string>("");
  const [statusId, setStatusId] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<LeaveTypeOption[]>(
    [],
  );
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (!coId) return;
    let active = true;
    (async () => {
      const { data, error } = await fetchLeaveTypeOptions(coId);
      if (!active) return;
      if (error || !data) return;
      const options = ((data.data ?? []) as Record<string, unknown>[]).map(
        (r) => ({
          leave_type_id: Number(r.leave_type_id),
          leave_type_code: String(r.leave_type_code ?? ""),
          leave_type_description: String(r.leave_type_description ?? ""),
        }),
      );
      setLeaveTypeOptions(options);
    })();
    return () => {
      active = false;
    };
  }, [coId]);

  // Default the branch filter to the first sidebar-selected branch.
  useEffect(() => {
    if (!branchId && selectedBranches.length > 0) {
      setBranchId(String(selectedBranches[0]));
    }
  }, [branchId, selectedBranches]);

  const fetchData = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const { data, error } = await fetchLeaveRequestList(branchId, {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        search: searchQuery || undefined,
        leave_type_id: leaveTypeId || undefined,
        eb_no: ebNo || undefined,
        status_id: statusId || undefined,
      });
      if (error || !data) {
        throw new Error(error || "Failed to fetch leave requests");
      }
      const mapped = ((data.data ?? []) as Record<string, unknown>[]).map(
        (r) => ({
          ...r,
          id: (r.id ?? r.leave_transaction_id) as number,
        }),
      ) as LeaveRequestListRow[];
      setRows(mapped);
      setTotalRows((data.total as number) ?? mapped.length);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [
    branchId,
    paginationModel.page,
    paginationModel.pageSize,
    searchQuery,
    leaveTypeId,
    ebNo,
    statusId,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = useMemo<GridColDef<LeaveRequestListRow>[]>(
    () => [
      { field: "worker_name", headerName: "Worker Name", flex: 1.2 },
      { field: "eb_no", headerName: "EB No", flex: 0.7 },
      {
        field: "leave_from_date",
        headerName: "From Date",
        flex: 0.8,
        renderCell: (params) => formatDDMMYYYY(params.value),
      },
      {
        field: "leave_to_date",
        headerName: "To Date",
        flex: 0.8,
        renderCell: (params) => formatDDMMYYYY(params.value),
      },
      { field: "leave_type", headerName: "Leave Type", flex: 0.9 },
      {
        field: "non_working_days",
        headerName: "Non Working Days",
        flex: 0.8,
        type: "number",
        headerAlign: "left",
        align: "left",
      },
      {
        field: "leave_days",
        headerName: "No of Leave Days",
        flex: 0.8,
        type: "number",
        headerAlign: "left",
        align: "left",
        sortable: false,
        valueGetter: (_value, row) => computeLeaveDays(row),
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.8,
        renderCell: (params) => {
          const id = Number(params.value);
          return (
            <Chip
              label={STATUS_LABELS[id] ?? String(params.value ?? "")}
              color={STATUS_COLOR[id] ?? "default"}
              size="small"
              variant="outlined"
            />
          );
        },
      },
    ],
    [],
  );

  const handleView = useCallback(
    (row: LeaveRequestListRow) =>
      router.push(
        `/dashboardportal/hrms/LeaveRequest/createLeaveRequest?mode=view&id=${row.id}`,
      ),
    [router],
  );

  const handleEdit = useCallback(
    (row: LeaveRequestListRow) =>
      router.push(
        `/dashboardportal/hrms/LeaveRequest/createLeaveRequest?mode=edit&id=${row.id}`,
      ),
    [router],
  );

  const handleCreate = useCallback(
    () =>
      router.push(
        "/dashboardportal/hrms/LeaveRequest/createLeaveRequest?mode=create",
      ),
    [router],
  );

  const isRowEditable = useCallback(
    (row: LeaveRequestListRow) => row.status !== 3 && row.status !== 4,
    [],
  );

  return (
    <>
      <IndexWrapper<LeaveRequestListRow>
        title="Leave Requests"
        subtitle="Apply, review, and approve worker leave requests"
        rows={rows}
        columns={columns}
        rowCount={totalRows}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        loading={loading}
        search={{
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          placeholder: "Search by worker name...",
        }}
        createAction={{ label: "Apply Leave", onClick: handleCreate }}
        onView={handleView}
        onEdit={handleEdit}
        isRowEditable={isRowEditable}
        toolbarContent={
          <Stack direction="row" spacing={1.5} alignItems="center">
            {branchOptions.length > 1 ? (
              <TextField
                select
                size="small"
                label="Branch"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                {branchOptions.map((b) => (
                  <MenuItem key={b.branch_id} value={String(b.branch_id)}>
                    {b.branch_name}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <TextField
              select
              size="small"
              label="Leave Type"
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All</MenuItem>
              {leaveTypeOptions.map((opt) => (
                <MenuItem
                  key={opt.leave_type_id}
                  value={String(opt.leave_type_id)}
                >
                  {opt.leave_type_description || opt.leave_type_code}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Employee Code"
              value={ebNo}
              onChange={(e) => setEbNo(e.target.value)}
              sx={{ minWidth: 140 }}
            />
            <TextField
              select
              size="small"
              label="Status"
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All</MenuItem>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
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
