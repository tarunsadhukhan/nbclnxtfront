"use client";
import React, { Suspense, useMemo } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { fetchJuteTxnSummary } from "@/utils/juteReportService";
import type { JuteTxnSummaryRow } from "../types/reportTypes";

/** Row + synthetic id (txn rows have no unique key of their own). */
type TxnRow = JuteTxnSummaryRow & { __id: number };

const columns: GridColDef<TxnRow>[] = [
  {
    field: "txn_type",
    headerName: "Type",
    width: 90,
    valueFormatter: (value: unknown) => (value === "R" ? "Receipt" : "Issue"),
  },
  { field: "txn_date", headerName: "Date", width: 110 },
  { field: "mr_number", headerName: "MR #", width: 200 },
  { field: "quality", headerName: "Quality", flex: 1, minWidth: 150 },
  numCol("weight", "Weight"),
  numCol("qty", "Qty"),
  numCol("rate", "Rate"),
  numCol("value", "Value", 140),
  { field: "status_name", headerName: "Status", width: 120 },
];

const getRowId = (r: TxnRow) => r.__id;

function IssueReceiptSummaryPageContent() {
  const { branches, initialBranchId, dateParam } = useReportBranches();
  const range = useMemo(() => currentMonthRange(), []);

  return (
    <ReportPanel
      title="Jute Issue & Receipt Summary"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={range.from}
      initialDateTo={dateParam || range.to}
      extra={{
        label: "Type",
        options: [
          { value: "ALL", label: "All" },
          { value: "R", label: "Receipts" },
          { value: "I", label: "Issues" },
        ],
      }}
      initialExtra="ALL"
      fetcher={async (f) => {
        const data = await fetchJuteTxnSummary(
          f.branchId,
          f.dateFrom,
          f.dateTo,
          f.extra as "R" | "I" | "ALL",
        );
        return data.map((r, i) => ({ ...r, __id: i }));
      }}
      columns={columns}
      getRowId={getRowId}
      exportName="jute-issue-receipt-summary"
    />
  );
}

export default function IssueReceiptSummaryPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <IssueReceiptSummaryPageContent />
    </Suspense>
  );
}
