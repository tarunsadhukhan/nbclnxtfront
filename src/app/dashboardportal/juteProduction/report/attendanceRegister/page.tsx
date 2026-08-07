"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import {
  fetchAttendanceRegister,
  type AttendanceRegisterRow,
} from "@/utils/hrmsReportService";

const columns: GridColDef<AttendanceRegisterRow>[] = [
  { field: "eb_no", headerName: "EB No", width: 110 },
  { field: "emp_name", headerName: "Name", flex: 1, minWidth: 180 },
  { field: "attendance_date", headerName: "Date", width: 120 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 140 },
  { field: "designation", headerName: "Designation", flex: 1, minWidth: 130 },
  { field: "mark", headerName: "Mark", width: 80 },
  { field: "spell", headerName: "Spell", width: 80 },
  numCol("idle_hours", "Idle Hrs", 100),
  numCol("spell_hours", "Spell Hrs", 100),
  numCol("working_hours", "Work Hrs", 100),
  { field: "status_name", headerName: "Status", width: 110 },
];

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  return (
    <ReportPanel
      title="Attendance Register"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchAttendanceRegister({
              coId,
              branchId: f.branchId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      sortField="attendance_date"
      exportName="attendance-register"
    />
  );
}

export default function AttendanceRegisterPage() {
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
