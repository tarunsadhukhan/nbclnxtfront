"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { fyStart, todayIso } from "@/components/reports/reportDates";
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

function InventorySnapshotPageContent() {
  const { branches, initialBranchId, dateParam } = useReportBranches();

  return (
    <ReportPanel
      title="Jute Inventory Snapshot"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="single"
      singleLabel="As of Date"
      initialDateTo={dateParam || todayIso()}
      // Movement window runs from the FY start to the chosen as-of date.
      fetcher={(f) =>
        fetchJuteQtyWiseReport(f.branchId, fyStart(new Date(f.dateTo)), f.dateTo)
      }
      columns={columns}
      getRowId={getRowId}
      sortField="item_group_name"
      exportName="jute-inventory-snapshot"
    />
  );
}

export default function InventorySnapshotPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <InventorySnapshotPageContent />
    </Suspense>
  );
}
