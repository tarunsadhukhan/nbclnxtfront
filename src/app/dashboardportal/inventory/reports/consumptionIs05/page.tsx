"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import {
  fetchIssueMachinewise,
  type IssueMachinewiseRow,
} from "@/utils/inventoryReportService";

const columns: GridColDef<IssueMachinewiseRow>[] = [
  { field: "machine_name", headerName: "Machine", flex: 1, minWidth: 160 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 140 },
  { field: "item_code", headerName: "Item Code", width: 120 },
  { field: "item_grp_name", headerName: "Item Group", flex: 1, minWidth: 140 },
  { field: "item_name", headerName: "Item Description", width: 450 },
  { field: "uom_name", headerName: "UOM", width: 80 },
  { field: "expense_type_name", headerName: "Exp Type", width: 120 },
  numCol("issue_qty", "Issue Qty"),
  numCol("issue_value", "Issue Value", 130),
];

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  return (
    <ReportPanel
      title="Consumption Report IS-05 (Machine-wise)"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchIssueMachinewise({
              coId,
              branchId: f.branchId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      sortField="machine_name"
      exportName="consumption-is05"
    />
  );
}

export default function ConsumptionIs05Page() {
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
