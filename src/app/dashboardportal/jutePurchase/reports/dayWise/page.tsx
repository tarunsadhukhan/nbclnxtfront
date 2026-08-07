"use client";
import React, { Suspense, useMemo } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { fetchJutePeriodWise } from "@/utils/juteReportService";
import type { JutePeriodWiseRow } from "../types/reportTypes";

const columns: GridColDef<JutePeriodWiseRow>[] = [
  { field: "period", headerName: "Period", width: 140 },
  numCol("receipt_weight", "Receipt Wt", 140),
  numCol("receipt_qty", "Receipt Qty", 140),
  numCol("issue_weight", "Issue Wt", 140),
  numCol("issue_qty", "Issue Qty", 140),
];

const getRowId = (r: JutePeriodWiseRow) => r.period;

function DayWisePageContent() {
  const { branches, initialBranchId, dateParam } = useReportBranches();
  const range = useMemo(() => currentMonthRange(), []);

  return (
    <ReportPanel
      title="Jute Day Wise Report"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={range.from}
      initialDateTo={dateParam || range.to}
      fetcher={(f) =>
        fetchJutePeriodWise(f.branchId, f.dateFrom, f.dateTo, "day")
      }
      columns={columns}
      getRowId={getRowId}
      sortField="period"
      exportName="jute-day-wise"
    />
  );
}

export default function DayWisePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <DayWisePageContent />
    </Suspense>
  );
}
