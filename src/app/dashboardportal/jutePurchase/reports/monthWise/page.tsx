"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { fyStart, todayIso } from "@/components/reports/reportDates";
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

function MonthWisePageContent() {
  const { branches, initialBranchId, dateParam } = useReportBranches();

  return (
    <ReportPanel
      title="Jute Month Wise Report"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={fyStart(new Date())}
      initialDateTo={dateParam || todayIso()}
      fetcher={(f) =>
        fetchJutePeriodWise(f.branchId, f.dateFrom, f.dateTo, "month")
      }
      columns={columns}
      getRowId={getRowId}
      sortField="period"
      exportName="jute-month-wise"
    />
  );
}

export default function MonthWisePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <MonthWisePageContent />
    </Suspense>
  );
}
