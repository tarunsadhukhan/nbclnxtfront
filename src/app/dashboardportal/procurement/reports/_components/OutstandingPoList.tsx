"use client";

import * as React from "react";
import { Chip } from "@mui/material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { apiRoutesPortalMasters } from "@/utils/api";
import ReportFilters from "./ReportFilters";

const renderStatus = (p: GridRenderCellParams) => {
  const v = p.value;
  const label = v == null || v === "" ? "-" : String(v);
  const lower = label.toLowerCase();
  const color = ["approved", "closed", "complete", "completed"].includes(lower)
    ? "success"
    : ["rejected", "cancelled", "canceled", "failed"].includes(lower)
    ? "error"
    : ["pending", "draft", "pending approval", "open"].includes(lower)
    ? "warning"
    : "info";
  return <Chip size="small" label={label} color={color as any} />;
};

const columns: GridColDef[] = [
  { field: "po_no", headerName: "PO No", minWidth: 130, flex: 1 },
  { field: "po_date", headerName: "PO Date", minWidth: 120 },
  { field: "branch_name", headerName: "Branch", minWidth: 140, flex: 1 },
  { field: "supplier_name", headerName: "Supplier", minWidth: 180, flex: 1.5 },
  { field: "item_name", headerName: "Item", minWidth: 180, flex: 1.5 },
  { field: "uom_name", headerName: "UOM", minWidth: 90 },
  { field: "po_qty", headerName: "PO Qty", minWidth: 100, type: "number" },
  { field: "inward_consumed_qty", headerName: "Inward Qty", minWidth: 120, type: "number" },
  { field: "outstanding_qty", headerName: "Outstanding Qty", minWidth: 130, type: "number" },
  { field: "rate", headerName: "Rate", minWidth: 100, type: "number" },
  {
    field: "status_name",
    headerName: "Status",
    minWidth: 130,
    renderCell: renderStatus,
  },
];

const EXTRA = { outstanding_filter: "outstanding" };

export default function OutstandingPoList() {
  return (
    <ReportFilters
      reportKey="outstanding-po"
      endpoint={apiRoutesPortalMasters.PO_ITEMWISE_REPORT}
      downloadEndpoint={apiRoutesPortalMasters.PO_ITEMWISE_DOWNLOAD}
      extraFilters={EXTRA}
      columns={columns}
    />
  );
}
