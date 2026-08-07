"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Snackbar, Alert, Chip, TextField, MenuItem, Stack } from "@mui/material";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchAttendanceList } from "@/utils/hrmsService";
import { lastDaysRange } from "@/components/reports/reportDates";
import {
  AttendanceListRow,
  STATUS_COLOR,
  STATUS_LABELS,
  STATUS_FILTER_OPTIONS,
  ATTENDANCE_TYPE_OPTIONS,
} from "./types/attendanceTypes";

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

/** A date input emits a value per keystroke of the year — "2026" arrives as
 *  0002, 0020, 0202, 2026. Only query once the year is plausible. */
const usableDate = (value: string) =>
  value && Number(value.slice(0, 4)) >= 1900 ? value : undefined;

export default function AttendanceCalendarPage() {
  const router = useRouter();
  const { selectedCompany, selectedBranches } = useSidebarContext();

  const branchOptions = useMemo(
    () =>
      (selectedCompany?.branches ?? []).filter((b) =>
        selectedBranches.includes(b.branch_id),
      ),
    [selectedCompany, selectedBranches],
  );

  const [rows, setRows] = useState<AttendanceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [branchId, setBranchId] = useState<string>("");
  // Default to the last 7 days — the branch holds years of attendance, so an
  // unfiltered list is neither useful nor cheap.
  const [fromDate, setFromDate] = useState<string>(() => lastDaysRange(7).from);
  const [toDate, setToDate] = useState<string>(() => lastDaysRange(7).to);
  const [ebNo, setEbNo] = useState<string>("");
  const [attendanceType, setAttendanceType] = useState<string>("");
  const [statusId, setStatusId] = useState<string>("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

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
      const { data, error } = await fetchAttendanceList(branchId, {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        search: searchQuery || undefined,
        from_date: usableDate(fromDate),
        to_date: usableDate(toDate),
        eb_no: ebNo || undefined,
        attendance_type: attendanceType || undefined,
        status_id: statusId || undefined,
      });
      if (error || !data) {
        throw new Error(error || "Failed to fetch attendance records");
      }
      const mapped = ((data.data ?? []) as Record<string, unknown>[]).map(
        (r) => ({
          ...r,
          id: (r.id ?? r.daily_atten_id) as number,
        }),
      ) as AttendanceListRow[];
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
    fromDate,
    toDate,
    ebNo,
    attendanceType,
    statusId,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = useMemo<GridColDef<AttendanceListRow>[]>(
    () => [
      { field: "eb_no", headerName: "EB No", flex: 0.7 },
      { field: "worker_name", headerName: "Worker Name", flex: 1.2 },
      {
        field: "attendance_date",
        headerName: "Date",
        flex: 0.8,
        renderCell: (params) => formatDDMMYYYY(params.value),
      },
      { field: "attendance_mark", headerName: "Mark", flex: 0.5 },
      { field: "spell", headerName: "Spell", flex: 0.7 },
      { field: "worked_department", headerName: "Department", flex: 1 },
      { field: "worked_designation", headerName: "Designation", flex: 1 },
      {
        field: "working_hours",
        headerName: "Work Hrs",
        flex: 0.6,
        type: "number",
        headerAlign: "left",
        align: "left",
      },
      {
        field: "idle_hours",
        headerName: "Idle Hrs",
        flex: 0.6,
        type: "number",
        headerAlign: "left",
        align: "left",
      },
      {
        field: "status_id",
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
    (row: AttendanceListRow) =>
      router.push(
        `/dashboardportal/hrms/attendanceCalendar/createAttendance?mode=view&id=${row.id}`,
      ),
    [router],
  );

  const handleEdit = useCallback(
    (row: AttendanceListRow) =>
      router.push(
        `/dashboardportal/hrms/attendanceCalendar/createAttendance?mode=edit&id=${row.id}`,
      ),
    [router],
  );

  const handleCreate = useCallback(
    () =>
      router.push(
        "/dashboardportal/hrms/attendanceCalendar/createAttendance?mode=create",
      ),
    [router],
  );

  const isRowEditable = useCallback(
    (row: AttendanceListRow) => row.status_id !== 3 && row.status_id !== 4,
    [],
  );

  return (
    <>
      <IndexWrapper<AttendanceListRow>
        title="Attendance Calendar"
        subtitle="Mark, review, and approve daily worker attendance"
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
        createAction={{ label: "Mark Attendance", onClick: handleCreate }}
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
              size="small"
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              size="small"
              label="To Date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
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
              label="Type"
              value={attendanceType}
              onChange={(e) => setAttendanceType(e.target.value)}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="">All</MenuItem>
              {ATTENDANCE_TYPE_OPTIONS.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
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
