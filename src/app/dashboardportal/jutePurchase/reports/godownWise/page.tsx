"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { fetchJuteGodownWise } from "@/utils/juteReportService";
import type { JuteGodownWiseRow } from "../types/reportTypes";

const columns: GridColDef<JuteGodownWiseRow>[] = [
  { field: "warehouse_name", headerName: "Godown", width: 160 },
  { field: "quality", headerName: "Quality", flex: 1, minWidth: 180 },
  numCol("balance_qty", "Balance Qty", 150),
  numCol("balance_weight", "Balance Wt", 150),
];

const getRowId = (r: JuteGodownWiseRow) => `${r.warehouse_name}-${r.quality}`;

function GodownWisePageContent() {
  const { branches, initialBranchId } = useReportBranches();

  return (
    <ReportPanel
      title="Jute Godown Wise Stock"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="none"
      fetcher={(f) => fetchJuteGodownWise(f.branchId)}
      columns={columns}
      getRowId={getRowId}
      sortField="warehouse_name"
      exportName="jute-godown-wise"
    />
  );
}

export default function GodownWisePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <GodownWisePageContent />
    </Suspense>
  );
}
