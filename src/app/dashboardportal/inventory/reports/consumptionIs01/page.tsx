"use client";
import React, { Suspense, useState } from "react";
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
import IssueDetailDialog from "./IssueDetailDialog";

const columns: GridColDef<ConsumptionRow>[] = [
  { field: "department", headerName: "Department", flex: 1, minWidth: 150 },
  { field: "cost_factor", headerName: "Cost Center", flex: 1, minWidth: 140 },
  { field: "item_code", headerName: "Item Code", width: 120 },
  { field: "item_name", headerName: "Item Description", width: 450 },
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
  // The filters actually fetched — the dialog must drill into the same period
  // and branch as the loaded rows, not whatever the inputs now show.
  const [applied, setApplied] = useState({
    branchId: null as number | null,
    dateFrom: from,
    dateTo: dateParam || to,
  });
  const [detailRow, setDetailRow] = useState<ConsumptionRow | null>(null);

  return (
    <>
      <ReportPanel
        title="Consumption Report IS-01 (Dept + Cost Center + Item)"
        branches={branches}
        initialBranchId={initialBranchId}
        dates="range"
        initialDateFrom={from}
        initialDateTo={dateParam || to}
        extra={{ label: "Item Code" }}
        fetcher={(f) => {
          setApplied({
            branchId: f.branchId,
            dateFrom: f.dateFrom,
            dateTo: f.dateTo,
          });
          return coId == null
            ? Promise.resolve([])
            : fetchIssueConsumption("dept_cost_item", {
                coId,
                branchId: f.branchId,
                dateFrom: f.dateFrom,
                dateTo: f.dateTo,
                itemCode: f.extra,
              });
        }}
        columns={columns}
        getRowId={(r) => r.id}
        // No initial sort: the backend returns the rows ordered with the Grand
        // Total last, and sorting would move that row into the middle.
        exportName="consumption-is01"
        onRowDoubleClick={setDetailRow}
      />
      <IssueDetailDialog
        open={detailRow !== null}
        onClose={() => setDetailRow(null)}
        row={detailRow}
        coId={coId}
        branchId={applied.branchId}
        dateFrom={applied.dateFrom}
        dateTo={applied.dateTo}
      />
    </>
  );
}

export default function ConsumptionIs01Page() {
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
