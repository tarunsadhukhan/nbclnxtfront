"use client";
import React, { Suspense, useMemo } from "react";
import { Box, CircularProgress } from "@mui/material";
import ReportPanel from "@/components/reports/ReportPanel";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { fetchProcIndentItemwise } from "@/utils/procurementReportService";
import { INDENT_COLUMNS, indentRowId } from "../_components/columns";

function Content() {
  const { branches, coId, initialBranchId, dateParam } = useReportBranches();
  const range = useMemo(() => currentMonthRange(), []);

  return (
    <ReportPanel
      title="Outstanding Indents (Waiting for PO)"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={range.from}
      initialDateTo={dateParam || range.to}
      fetcher={async (f) => {
        if (coId == null) return [];
        return fetchProcIndentItemwise({
          coId,
          branchId: f.branchId,
          dateFrom: f.dateFrom,
          dateTo: f.dateTo,
          outstandingFilter: "outstanding",
        });
      }}
      columns={INDENT_COLUMNS}
      getRowId={indentRowId}
      sortField="indent_date"
      sortDir="desc"
      exportName="procurement-outstanding-indents"
    />
  );
}

export default function IndentOutstandingPage() {
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
