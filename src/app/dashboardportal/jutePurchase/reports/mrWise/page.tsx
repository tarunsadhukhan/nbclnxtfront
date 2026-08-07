"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { fetchJuteMrWise } from "@/utils/juteReportService";
import type { JuteMrWiseRow } from "../types/reportTypes";

const columns: GridColDef<JuteMrWiseRow>[] = [
  { field: "mr_number", headerName: "MR #", width: 200 },
  { field: "jute_mr_date", headerName: "MR Date", width: 110 },
  { field: "warehouse_name", headerName: "Godown", width: 120 },
  { field: "quality", headerName: "Quality", flex: 1, minWidth: 150 },
  numCol("received_qty", "Recv Qty"),
  numCol("received_weight", "Recv Wt"),
  numCol("issued_qty", "Issued Qty"),
  numCol("issued_weight", "Issued Wt"),
  numCol("balance_qty", "Bal Qty"),
  numCol("balance_weight", "Bal Wt"),
];

const getRowId = (r: JuteMrWiseRow) => r.jute_mr_li_id;

function MrWisePageContent() {
  const { branches, initialBranchId } = useReportBranches();

  return (
    <ReportPanel
      title="Jute MR Wise Report"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="none"
      fetcher={(f) => fetchJuteMrWise(f.branchId)}
      columns={columns}
      getRowId={getRowId}
      sortField="jute_mr_date"
      sortDir="desc"
      exportName="jute-mr-wise"
    />
  );
}

export default function MrWisePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <MrWisePageContent />
    </Suspense>
  );
}
