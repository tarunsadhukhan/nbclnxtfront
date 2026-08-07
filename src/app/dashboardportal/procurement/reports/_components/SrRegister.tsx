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
  { field: "inward_no", headerName: "Inward No", minWidth: 140, flex: 1 },
  { field: "inward_date", headerName: "Inward Date", minWidth: 120 },
  { field: "branch_name", headerName: "Branch", minWidth: 150, flex: 1 },
  { field: "supplier_name", headerName: "Supplier", minWidth: 180, flex: 1.5 },
  { field: "item_name", headerName: "Item", minWidth: 180, flex: 1.5 },
  { field: "approved_qty", headerName: "Approved Qty", minWidth: 120, type: "number" },
  { field: "rejected_qty", headerName: "Rejected Qty", minWidth: 120, type: "number" },
  { field: "rate", headerName: "Rate", minWidth: 110, type: "number" },
  { field: "amount", headerName: "Amount", minWidth: 130, type: "number" },
  {
    field: "status_name",
    headerName: "Status",
    minWidth: 130,
    renderCell: renderStatus,
  },
];

export default function SrRegister() {
  return (
    <ReportFilters
      reportKey="sr-register"
      endpoint={apiRoutesPortalMasters.SR_ITEMWISE_REPORT}
      downloadEndpoint={apiRoutesPortalMasters.SR_ITEMWISE_DOWNLOAD}
      columns={columns}
    />
  );
}
