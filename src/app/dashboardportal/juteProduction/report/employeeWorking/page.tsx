"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import {
  fetchEmployeeWorking,
  type EmployeeWorkingRow,
} from "@/utils/hrmsReportService";

const columns: GridColDef<EmployeeWorkingRow>[] = [
  { field: "yearmn", headerName: "Month", width: 100 },
  { field: "emp_code", headerName: "Emp Code", width: 110 },
  { field: "emp_name", headerName: "Name", flex: 1, minWidth: 180 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 140 },
  { field: "category", headerName: "Category", width: 120 },
  { field: "status_name", headerName: "Status", width: 110 },
  numCol("wdays", "Work Days", 110),
  numCol("lvdays", "Leave Days", 110),
  numCol("hldays", "Holiday Days", 120),
  numCol("total_days", "Total Days", 110),
];

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  return (
    <ReportPanel
      title="Employee Working Details"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchEmployeeWorking({
              coId,
              branchId: f.branchId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      sortField="yearmn"
      exportName="employee-working"
    />
  );
}

export default function EmployeeWorkingPage() {
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
