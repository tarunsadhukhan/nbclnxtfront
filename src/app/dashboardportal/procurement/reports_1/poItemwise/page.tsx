"use client";
import React, { Suspense, useMemo } from "react";
import { Box, CircularProgress } from "@mui/material";
import ReportPanel from "@/components/reports/ReportPanel";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { fetchProcPoItemwise } from "@/utils/procurementReportService";
import { PO_COLUMNS, poRowId } from "../_components/columns";

function Content() {
  const { branches, coId, initialBranchId, dateParam } = useReportBranches();
  const range = useMemo(() => currentMonthRange(), []);

  return (
    <ReportPanel
      title="PO Item-wise"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={range.from}
      initialDateTo={dateParam || range.to}
      extra={{
        label: "Type",
        options: [
          { value: "", label: "All" },
          { value: "Regular", label: "Regular" },
          { value: "Open", label: "Open" },
        ],
      }}
      initialExtra=""
      fetcher={async (f) => {
        if (coId == null) return [];
        return fetchProcPoItemwise({
          coId,
          branchId: f.branchId,
          dateFrom: f.dateFrom,
          dateTo: f.dateTo,
          poType: f.extra || undefined,
        });
      }}
      columns={PO_COLUMNS}
      getRowId={poRowId}
      sortField="po_date"
      sortDir="desc"
      exportName="procurement-po-itemwise"
    />
  );
}

export default function PoItemwisePage() {
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
