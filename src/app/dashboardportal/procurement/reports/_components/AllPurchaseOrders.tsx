"use client";

import * as React from "react";
import { Chip } from "@mui/material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { apiRoutesPortalMasters } from "@/utils/api";
import ReportFilters from "./ReportFilters";

const formatINR = (value: any) => {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

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
  { field: "po_no", headerName: "PO No", minWidth: 140, flex: 1 },
  { field: "po_date", headerName: "PO Date", minWidth: 120 },
  { field: "supplier_name", headerName: "Supplier", minWidth: 180, flex: 1.5 },
  {
    field: "po_value",
    headerName: "PO Value",
    minWidth: 140,
    align: "right",
    headerAlign: "right",
    renderCell: (p: GridRenderCellParams) => <span>{formatINR(p.value)}</span>,
  },
  { field: "branch_name", headerName: "Branch", minWidth: 150, flex: 1 },
  {
    field: "status",
    headerName: "Status",
    minWidth: 130,
    renderCell: renderStatus,
  },
];

export default function AllPurchaseOrders() {
  return (
    <ReportFilters
      reportKey="all-po"
      endpoint={apiRoutesPortalMasters.PO_TABLE}
      downloadEndpoint={apiRoutesPortalMasters.PO_TABLE_DOWNLOAD}
      columns={columns}
    />
  );
}
