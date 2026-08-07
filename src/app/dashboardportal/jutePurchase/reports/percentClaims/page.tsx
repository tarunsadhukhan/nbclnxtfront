"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { fyStart, todayIso } from "@/components/reports/reportDates";
import { fetchJutePercentClaims } from "@/utils/juteReportService";
import type { JutePercentClaimsRow } from "../types/reportTypes";

const columns: GridColDef<JutePercentClaimsRow>[] = [
  { field: "supplier_name", headerName: "Supplier", flex: 1, minWidth: 200 },
  numCol("total_mr", "Total MR"),
  numCol("pass_count", "Pass"),
  numCol("claim_count", "Claim"),
  numCol("pass_percent", "Pass %"),
  numCol("claim_percent", "Claim %"),
];

const getRowId = (r: JutePercentClaimsRow) =>
  r.supplier_id ?? r.supplier_name ?? "";

function PercentClaimsPageContent() {
  const { branches, initialBranchId, dateParam } = useReportBranches();

  return (
    <ReportPanel
      title="Jute Percent Claims"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={fyStart(new Date())}
      initialDateTo={dateParam || todayIso()}
      fetcher={(f) => fetchJutePercentClaims(f.branchId, f.dateFrom, f.dateTo)}
      columns={columns}
      getRowId={getRowId}
      sortField="supplier_name"
      exportName="jute-percent-claims"
    />
  );
}

export default function PercentClaimsPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <PercentClaimsPageContent />
    </Suspense>
  );
}
