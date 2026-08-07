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
  { field: "item_group_code", headerName: "Group Code", width: 120 },
  { field: "item_group", headerName: "Item Group", flex: 1, minWidth: 200 },
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
      title="Consumption Report IS-06 (Item Group)"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchIssueConsumption("item_group", {
              coId,
              branchId: f.branchId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      // No initial sort — keeps the backend's Grand Total row last.
      exportName="consumption-is06"
    />
  );
}

export default function ConsumptionIs06Page() {
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
