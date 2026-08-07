"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { yesterdayIso } from "@/components/reports/reportDates";
import { fetchJuteStockReport } from "@/utils/juteReportService";
import type { JuteStockReportRow } from "../types/reportTypes";

const columns: GridColDef<JuteStockReportRow>[] = [
  { field: "item_group_name", headerName: "Item Group", flex: 1, minWidth: 140 },
  { field: "item_name", headerName: "Item", flex: 1, minWidth: 160 },
  numCol("opening_weight", "Opening (kg)", 130),
  numCol("receipt_weight", "Receipt (kg)", 130),
  numCol("issue_weight", "Issue (kg)"),
  numCol("closing_weight", "Closing (kg)", 130),
  numCol("mtd_receipt_weight", "MTD Receipt (kg)", 150),
  numCol("mtd_issue_weight", "MTD Issue (kg)", 140),
];

const getRowId = (r: JuteStockReportRow) => `${r.item_grp_id}-${r.item_id}`;

function JuteStockPageContent() {
  const { branches, initialBranchId, dateParam } = useReportBranches();

  return (
    <ReportPanel
      title="Jute Stock Report"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="single"
      singleLabel="As of Date"
      initialDateTo={dateParam || yesterdayIso()}
      fetcher={(f) => fetchJuteStockReport(f.branchId, f.dateTo)}
      columns={columns}
      getRowId={getRowId}
      sortField="item_group_name"
      exportName="jute-stock"
    />
  );
}

export default function JuteStockPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <JuteStockPageContent />
    </Suspense>
  );
}
