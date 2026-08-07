"use client";
import React, { Suspense, useMemo } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { fetchJuteWithValue } from "@/utils/juteReportService";
import type { JuteWithValueRow } from "../types/reportTypes";

const columns: GridColDef<JuteWithValueRow>[] = [
  { field: "item_group_name", headerName: "Item Group", flex: 1, minWidth: 140 },
  { field: "item_name", headerName: "Quality", flex: 1, minWidth: 150 },
  numCol("opening_weight", "Opening Wt"),
  numCol("opening_qty", "Opening Qty"),
  numCol("receipt_weight", "Receipt Wt"),
  numCol("receipt_qty", "Receipt Qty"),
  numCol("receipt_value", "Receipt Val", 140),
  numCol("issue_weight", "Issue Wt"),
  numCol("issue_qty", "Issue Qty"),
  numCol("issue_value", "Issue Val", 140),
  numCol("sold_weight", "Sold Wt"),
  numCol("sold_qty", "Sold Qty"),
  numCol("closing_weight", "Closing Wt"),
  numCol("closing_qty", "Closing Qty"),
  numCol("avg_issue_rate", "Avg Rate", 130),
];

const getRowId = (r: JuteWithValueRow) => `${r.item_grp_id}-${r.item_id}`;

function WithValuePageContent() {
  const { branches, initialBranchId, dateParam } = useReportBranches();
  const range = useMemo(() => currentMonthRange(), []);

  return (
    <ReportPanel
      title="Jute with Value Report"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={range.from}
      initialDateTo={dateParam || range.to}
      fetcher={(f) => fetchJuteWithValue(f.branchId, f.dateFrom, f.dateTo)}
      columns={columns}
      getRowId={getRowId}
      sortField="item_group_name"
      exportName="jute-with-value"
    />
  );
}

export default function WithValuePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <WithValuePageContent />
    </Suspense>
  );
}
