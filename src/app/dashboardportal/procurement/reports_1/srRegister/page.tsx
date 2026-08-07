"use client";
import React, { Suspense, useMemo } from "react";
import { Box, CircularProgress } from "@mui/material";
import ReportPanel from "@/components/reports/ReportPanel";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { fetchProcSrItemwise } from "@/utils/procurementReportService";
import { SR_COLUMNS, srRowId } from "../_components/columns";

function Content() {
  const { branches, coId, initialBranchId, dateParam } = useReportBranches();
  const range = useMemo(() => currentMonthRange(), []);

  return (
    <ReportPanel
      title="Store Receipt / GRN Register"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={range.from}
      initialDateTo={dateParam || range.to}
      fetcher={async (f) => {
        if (coId == null) return [];
        return fetchProcSrItemwise({
          coId,
          branchId: f.branchId,
          dateFrom: f.dateFrom,
          dateTo: f.dateTo,
        });
      }}
      columns={SR_COLUMNS}
      getRowId={srRowId}
      sortField="inward_date"
      sortDir="desc"
      exportName="procurement-sr-register"
    />
  );
}

export default function SrRegisterPage() {
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
