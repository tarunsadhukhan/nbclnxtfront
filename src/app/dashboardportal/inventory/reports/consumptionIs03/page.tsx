"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import {
  fetchIssueConsumption,
  type ConsumptionRow,
} from "@/utils/inventoryReportService";

const columns: GridColDef<ConsumptionRow>[] = [
  { field: "department", headerName: "Department", flex: 1, minWidth: 180 },
  numCol("production", "Production"),
  numCol("overhauling", "Overhauling"),
  numCol("maintenance", "Maintenance"),
  numCol("capital", "Capital"),
  numCol("general", "General"),
  numCol("others", "Others"),
  numCol("total", "Total", 130),
];

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  return (
    <ReportPanel
      title="Consumption Report IS-03 (Department)"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchIssueConsumption("dept", {
              coId,
              branchId: f.branchId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      // No initial sort — keeps the backend's Grand Total row last.
      exportName="consumption-is03"
    />
  );
}

export default function ConsumptionIs03Page() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <Content />
    </Suspense>
  );
}
