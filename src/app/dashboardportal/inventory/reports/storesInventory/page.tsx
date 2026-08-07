"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import {
  fetchInventoryStockReport,
  type InventoryStockReportRow,
} from "@/utils/inventoryReportService";

const columns: GridColDef<InventoryStockReportRow>[] = [
  { field: "item_code", headerName: "Item Code", width: 120 },
  { field: "item_grp_name", headerName: "Item Group", flex: 1, minWidth: 140 },
  { field: "item_name", headerName: "Item Description", width: 450 },
  { field: "uom_name", headerName: "UOM", width: 90 },
  numCol("opening_qty", "Opening Qty"),
  numCol("opening_val", "Opening Value"),
  numCol("receipt_qty", "Received Qty"),
  numCol("receipt_val", "Received Value"),
  numCol("issue_qty", "Issued Qty"),
  numCol("issue_val", "Issued Value"),
  numCol("closing_qty", "Closing Qty"),
  numCol("closing_val", "Closing Value"),
  { field: "last_receipt_date", headerName: "Last Receipt", width: 115 },
  { field: "last_issue_date", headerName: "Last Issued", width: 115 },
  {
    field: "no_consumption_days",
    headerName: "Not Consumed (Days)",
    type: "number",
    width: 150,
  },
];

const getRowId = (r: InventoryStockReportRow) => r.item_id;

/** Append the legacy report's grand-total row (value columns only). */
function withGrandTotal(
  rows: InventoryStockReportRow[],
): InventoryStockReportRow[] {
  if (rows.length === 0) return rows;
  const sum = (f: keyof InventoryStockReportRow) =>
    Math.round(
      rows.reduce((acc, r) => acc + (Number(r[f]) || 0), 0) * 100,
    ) / 100;
  return [
    ...rows,
    {
      item_id: -1,
      item_code: null,
      item_grp_name: null,
      item_name: "Grand Total",
      uom_name: null,
      opening_qty: null,
      opening_val: sum("opening_val"),
      receipt_qty: null,
      receipt_val: sum("receipt_val"),
      issue_qty: null,
      issue_val: sum("issue_val"),
      closing_qty: null,
      closing_val: sum("closing_val"),
      last_receipt_date: null,
      last_issue_date: null,
      no_consumption_days: null,
    },
  ];
}

function StoresInventoryContent() {
  const { branches, coId, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();

  return (
    <ReportPanel
      title="Stores Inventory List"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchInventoryStockReport({
              coId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
              branchId: f.branchId,
            }).then(withGrandTotal)
      }
      columns={columns}
      getRowId={getRowId}
      sortField="item_grp_name"
      exportName="stores-inventory-list"
    />
  );
}

export default function StoresInventoryReportPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <StoresInventoryContent />
    </Suspense>
  );
}
