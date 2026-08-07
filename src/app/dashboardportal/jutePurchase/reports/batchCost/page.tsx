"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { yesterdayIso } from "@/components/reports/reportDates";
import { fetchBatchCostReport } from "@/utils/juteReportService";
import type { BatchCostReportRow } from "../types/reportTypes";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtCurrency(value: unknown): string {
  if (value == null) return "";
  const n = Number(value);
  return Number.isFinite(n) ? inrFormatter.format(n) : "";
}

const columns: GridColDef<BatchCostReportRow>[] = [
  { field: "yarn_type_name", headerName: "Yarn Type", flex: 1, minWidth: 140 },
  { field: "item_name", headerName: "Jute Quality", flex: 1, minWidth: 160 },
  numCol("planned_weight", "Planned Wt (kg)", 140),
  numCol("actual_weight", "Actual Wt (kg)", 140),
  numCol("actual_rate", "Rate (per qtl)", 130),
  {
    field: "issue_value",
    headerName: "Value",
    type: "number",
    width: 140,
    valueFormatter: (value: unknown) => fmtCurrency(value),
  },
  {
    field: "variance",
    headerName: "Variance (kg)",
    type: "number",
    width: 130,
    renderCell: (params: GridRenderCellParams<BatchCostReportRow, number>) => {
      const n = Number(params.value);
      if (!Number.isFinite(n)) return "";
      return (
        <Box component="span" sx={{ color: n >= 0 ? "green" : "red", fontWeight: 500 }}>
          {n.toFixed(2)}
        </Box>
      );
    },
  },
];

const getRowId = (r: BatchCostReportRow) => `${r.yarn_type_id}-${r.item_id}`;

function BatchCostPageContent() {
  const { branches, initialBranchId, dateParam } = useReportBranches();

  return (
    <ReportPanel
      title="Batch Cost Report"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="single"
      singleLabel="As of Date"
      initialDateTo={dateParam || yesterdayIso()}
      fetcher={(f) => fetchBatchCostReport(f.branchId, f.dateTo)}
      columns={columns}
      getRowId={getRowId}
      sortField="yarn_type_name"
      exportName="batch-cost"
    />
  );
}

export default function BatchCostPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <BatchCostPageContent />
    </Suspense>
  );
}
