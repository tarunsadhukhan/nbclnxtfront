"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { fetchJuteMrInStock } from "@/utils/juteReportService";
import type { JuteMrInStockRow } from "../types/reportTypes";

const columns: GridColDef<JuteMrInStockRow>[] = [
  { field: "mr_number", headerName: "MR #", width: 200 },
  { field: "jute_mr_date", headerName: "MR Date", width: 110 },
  { field: "jute_gate_entry_no", headerName: "Gate Entry", width: 110 },
  { field: "warehouse_name", headerName: "Godown", width: 120 },
  { field: "quality", headerName: "Quality", flex: 1, minWidth: 150 },
  numCol("received_qty", "Recv Qty"),
  numCol("received_weight", "Recv Wt"),
  numCol("balance_qty", "Bal Qty"),
  numCol("balance_weight", "Bal Wt"),
];

const getRowId = (r: JuteMrInStockRow) => r.jute_mr_li_id;

function MrInStockPageContent() {
  const { branches, initialBranchId } = useReportBranches();

  return (
    <ReportPanel
      title="Jute MR in Stock"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="none"
      fetcher={(f) => fetchJuteMrInStock(f.branchId)}
      columns={columns}
      getRowId={getRowId}
      sortField="jute_mr_date"
      sortDir="desc"
      exportName="jute-mr-in-stock"
    />
  );
}

export default function MrInStockPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <MrInStockPageContent />
    </Suspense>
  );
}
