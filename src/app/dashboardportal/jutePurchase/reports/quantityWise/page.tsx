"use client";
import React, { Suspense, useMemo } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { fetchJuteQtyWiseReport } from "@/utils/juteReportService";
import type { JuteQtyWiseReportRow } from "../types/reportTypes";

const columns: GridColDef<JuteQtyWiseReportRow>[] = [
  { field: "item_group_name", headerName: "Item Group", flex: 1, minWidth: 140 },
  { field: "item_name", headerName: "Quality", flex: 1, minWidth: 160 },
  numCol("opening_weight", "Opening Wt"),
  numCol("opening_qty", "Opening Qty"),
  numCol("receipt_weight", "Receipt Wt"),
  numCol("receipt_qty", "Receipt Qty"),
  numCol("issue_weight", "Issue Wt"),
  numCol("issue_qty", "Issue Qty"),
  numCol("closing_weight", "Closing Wt"),
  numCol("closing_qty", "Closing Qty"),
];

const getRowId = (r: JuteQtyWiseReportRow) => `${r.item_grp_id}-${r.item_id}`;

function QuantityWisePageContent() {
  const { branches, initialBranchId, dateParam } = useReportBranches();
  const range = useMemo(() => currentMonthRange(), []);

  return (
    <ReportPanel
      title="Jute Quantity Wise Report"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={range.from}
      initialDateTo={dateParam || range.to}
      fetcher={(f) => fetchJuteQtyWiseReport(f.branchId, f.dateFrom, f.dateTo)}
      columns={columns}
      getRowId={getRowId}
      sortField="item_group_name"
      exportName="jute-quantity-wise"
    />
  );
}

export default function QuantityWisePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <QuantityWisePageContent />
    </Suspense>
  );
}
