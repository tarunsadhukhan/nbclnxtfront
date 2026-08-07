"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { fetchOverstay, type OverstayRow } from "@/utils/hrmsReportService";

const columns: GridColDef<OverstayRow>[] = [
  { field: "emp_code", headerName: "EB No", width: 110 },
  { field: "emp_name", headerName: "Name", flex: 1, minWidth: 200 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 170 },
  { field: "category", headerName: "Category", width: 130 },
  { field: "leave_type", headerName: "Leave Type", flex: 1, minWidth: 140 },
  { field: "leave_from_date", headerName: "Leave From", width: 115 },
  { field: "leave_to_date", headerName: "Leave To", width: 115 },
  { field: "rejoin_date", headerName: "Rejoined On", width: 115 },
  numCol("overstay_days", "Overstay (Days)", 140),
];

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  return (
    <ReportPanel
      title="Overstay After Leave"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      fromLabel="Leave End From"
      toLabel="Leave End To"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchOverstay({
              coId,
              branchId: f.branchId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      sortField="leave_to_date"
      exportName="overstay-after-leave"
    />
  );
}

export default function OverstayPage() {
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
