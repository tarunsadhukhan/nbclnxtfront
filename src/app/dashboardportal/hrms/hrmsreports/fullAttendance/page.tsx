"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import {
  fetchFullAttendance,
  type FullAttendanceRow,
} from "@/utils/hrmsReportService";

const columns: GridColDef<FullAttendanceRow>[] = [
  { field: "eb_no", headerName: "EB No", width: 100 },
  { field: "emp_name", headerName: "Name", flex: 1, minWidth: 180 },
  { field: "attendance_date", headerName: "Date", width: 110 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 150 },
  { field: "designation", headerName: "Designation", flex: 1, minWidth: 150 },
  { field: "mark", headerName: "Mark", width: 70 },
  { field: "spell", headerName: "Spell", width: 80 },
  numCol("idle_hours", "Idle Hrs", 100),
  numCol("spell_hours", "Spell Hrs", 100),
  numCol("working_hours", "Work Hrs", 100),
  { field: "source", headerName: "Source", width: 90 },
  { field: "att_type", headerName: "Type", width: 90 },
  { field: "status_name", headerName: "Status", width: 110 },
  { field: "remarks", headerName: "Remarks", flex: 1, minWidth: 140 },
];

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  return (
    <ReportPanel
      title="Full Attendance"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchFullAttendance({
              coId,
              branchId: f.branchId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      sortField="attendance_date"
      exportName="full-attendance"
    />
  );
}

export default function FullAttendancePage() {
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
