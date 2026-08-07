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
  { field: "indent_no", headerName: "Indent No", minWidth: 140, flex: 1 },
  { field: "indent_date", headerName: "Indent Date", minWidth: 120 },
  { field: "branch_name", headerName: "Branch", minWidth: 150, flex: 1 },
  { field: "expense_type", headerName: "Expense Type", minWidth: 140, flex: 1 },
  {
    field: "status",
    headerName: "Status",
    minWidth: 130,
    renderCell: renderStatus,
  },
];

export default function AllIndents() {
  return (
    <ReportFilters
      reportKey="all-indent"
      endpoint={apiRoutesPortalMasters.INDENT_TABLE}
      downloadEndpoint={apiRoutesPortalMasters.INDENT_TABLE_DOWNLOAD}
      columns={columns}
    />
  );
}
