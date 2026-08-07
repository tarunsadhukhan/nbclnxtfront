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
  const color = ["approved", "closed", "complete", "completed", "passed"].includes(lower)
    ? "success"
    : ["rejected", "cancelled", "canceled", "failed"].includes(lower)
    ? "error"
    : ["pending", "draft", "pending approval", "open"].includes(lower)
    ? "warning"
    : "info";
  return <Chip size="small" label={label} color={color as any} />;
};

const columns: GridColDef[] = [
  { field: "bill_pass_no", headerName: "Bill Pass No", minWidth: 140, flex: 1 },
  { field: "sr_no", headerName: "SR No", minWidth: 130, flex: 1 },
  { field: "supplier_name", headerName: "Supplier", minWidth: 180, flex: 1.5 },
  { field: "sr_total", headerName: "SR Total", minWidth: 120, type: "number" },
  { field: "dr_total", headerName: "DR Total", minWidth: 120, type: "number" },
  { field: "cr_total", headerName: "CR Total", minWidth: 120, type: "number" },
  { field: "net_payable", headerName: "Net Payable", minWidth: 130, type: "number" },
  {
    field: "billpass_status",
    headerName: "Status",
    minWidth: 130,
    renderCell: renderStatus,
  },
];

export default function BillPassReport() {
  return (
    <ReportFilters
      reportKey="bill-pass"
      endpoint={apiRoutesPortalMasters.BILL_PASS_LIST}
      downloadEndpoint={apiRoutesPortalMasters.BILL_PASS_DOWNLOAD}
      columns={columns}
    />
  );
}
