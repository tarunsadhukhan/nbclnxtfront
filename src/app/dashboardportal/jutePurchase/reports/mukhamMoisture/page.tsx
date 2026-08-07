"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { fyStart, todayIso } from "@/components/reports/reportDates";
import { fetchJuteMukhamMoisture } from "@/utils/juteReportService";
import type { JuteMukhamMoistureRow } from "../types/reportTypes";

const columns: GridColDef<JuteMukhamMoistureRow>[] = [
  { field: "supplier_name", headerName: "Supplier", flex: 1, minWidth: 180 },
  { field: "mukam_name", headerName: "Mukam", flex: 1, minWidth: 150 },
  numCol("avg_supplied_moisture", "Avg Supplied", 150),
  numCol("avg_allowed_moisture", "Avg Allowed", 150),
  numCol("deviation", "Deviation", 130),
];

const getRowId = (r: JuteMukhamMoistureRow) =>
  `${r.supplier_id}-${r.mukam_name}`;

function MukhamMoisturePageContent() {
  const { branches, initialBranchId, dateParam } = useReportBranches();

  return (
    <ReportPanel
      title="Mukham Moisture Analysis"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={fyStart(new Date())}
      initialDateTo={dateParam || todayIso()}
      fetcher={(f) => fetchJuteMukhamMoisture(f.branchId, f.dateFrom, f.dateTo)}
      columns={columns}
      getRowId={getRowId}
      sortField="supplier_name"
      exportName="jute-mukham-moisture"
    />
  );
}

export default function MukhamMoisturePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <MukhamMoisturePageContent />
    </Suspense>
  );
}
