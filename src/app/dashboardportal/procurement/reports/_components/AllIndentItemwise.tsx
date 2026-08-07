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
  { field: "indent_no", headerName: "Indent No", minWidth: 130, flex: 1 },
  { field: "indent_date", headerName: "Indent Date", minWidth: 120 },
  { field: "branch_name", headerName: "Branch", minWidth: 140, flex: 1 },
  { field: "item_name", headerName: "Item", minWidth: 180, flex: 1.5 },
  { field: "uom_name", headerName: "UOM", minWidth: 90 },
  { field: "indent_qty", headerName: "Indent Qty", minWidth: 110, type: "number" },
  { field: "outstanding_qty", headerName: "Outstanding Qty", minWidth: 130, type: "number" },
  {
    field: "status_name",
    headerName: "Status",
    minWidth: 130,
    renderCell: renderStatus,
  },
];

export default function AllIndentItemwise() {
  return (
    <ReportFilters
      reportKey="all-indent-itemwise"
      endpoint={apiRoutesPortalMasters.INDENT_ITEMWISE_REPORT}
      downloadEndpoint={apiRoutesPortalMasters.INDENT_ITEMWISE_DOWNLOAD}
      columns={columns}
    />
  );
}
