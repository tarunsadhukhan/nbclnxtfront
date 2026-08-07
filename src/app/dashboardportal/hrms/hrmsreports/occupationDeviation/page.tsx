"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import {
  fetchOccupationDeviation,
  type OccupationDeviationRow,
} from "@/utils/hrmsReportService";

const columns: GridColDef<OccupationDeviationRow>[] = [
  { field: "eb_no", headerName: "EB No", width: 100 },
  { field: "emp_name", headerName: "Name", flex: 1, minWidth: 180 },
  { field: "attendance_date", headerName: "Date", width: 110 },
  { field: "advised_dept", headerName: "Advised Dept", flex: 1, minWidth: 150 },
  { field: "actual_dept", headerName: "Worked Dept", flex: 1, minWidth: 150 },
  {
    field: "advised_desig",
    headerName: "Advised Designation",
    flex: 1,
    minWidth: 160,
  },
  {
    field: "actual_desig",
    headerName: "Worked Designation",
    flex: 1,
    minWidth: 160,
  },
  { field: "spell", headerName: "Spell", width: 80 },
  numCol("work_hours", "Work Hrs", 100),
];

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  return (
    <ReportPanel
      title="Occupation Deviation"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchOccupationDeviation({
              coId,
              branchId: f.branchId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      sortField="attendance_date"
      exportName="occupation-deviation"
    />
  );
}

export default function OccupationDeviationPage() {
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
