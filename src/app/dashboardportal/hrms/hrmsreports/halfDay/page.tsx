"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { fetchHalfDay, type HalfDayRow } from "@/utils/hrmsReportService";

const columns: GridColDef<HalfDayRow>[] = [
  { field: "emp_code", headerName: "EB No", width: 110 },
  { field: "emp_name", headerName: "Name", flex: 1, minWidth: 200 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 170 },
  { field: "attendance_date", headerName: "Date", width: 110 },
  { field: "shift", headerName: "Shift", width: 80 },
  numCol("day_hours", "Day Hours", 110),
  numCol("halfdays_month", "Half Days (Month)", 150),
  numCol("halfdays_total", "Half Days (Range)", 150),
];

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  return (
    <ReportPanel
      title="Half Day Absenteeism"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchHalfDay({
              coId,
              branchId: f.branchId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      sortField="emp_code"
      exportName="half-day-absenteeism"
    />
  );
}

export default function HalfDayPage() {
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
