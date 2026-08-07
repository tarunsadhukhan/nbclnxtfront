"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import {
  fetchCashAttendance,
  type CashAttendanceRow,
} from "@/utils/hrmsReportService";

const columns: GridColDef<CashAttendanceRow>[] = [
  { field: "eb_no", headerName: "EB No", width: 110 },
  { field: "emp_name", headerName: "Name", flex: 1, minWidth: 200 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 170 },
  { field: "designation", headerName: "Designation", flex: 1, minWidth: 160 },
  { field: "attendance_date", headerName: "Date", width: 110 },
  { field: "spell", headerName: "Spell", width: 80 },
  numCol("hours", "Hours", 100),
];

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  return (
    <ReportPanel
      title="Cash Attendance"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchCashAttendance({
              coId,
              branchId: f.branchId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      sortField="attendance_date"
      exportName="cash-attendance"
    />
  );
}

export default function CashAttendancePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <Content />
    </Suspense>
  );
}
