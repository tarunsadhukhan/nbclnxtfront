"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import {
  fetchIssueItemwiseReport,
  type IssueItemwiseReportRow,
} from "@/utils/inventoryReportService";

const columns: GridColDef<IssueItemwiseReportRow>[] = [
  { field: "issue_no", headerName: "Issue No", width: 130 },
  { field: "issue_date", headerName: "Date", width: 110 },
  { field: "branch_name", headerName: "Branch", flex: 1, minWidth: 120 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 120 },
  { field: "item_grp_name", headerName: "Item Group", flex: 1, minWidth: 130 },
  { field: "item_name", headerName: "Item Description", width: 450 },
  { field: "uom_name", headerName: "UOM", width: 80 },
  numCol("req_quantity", "Req Qty"),
  numCol("issue_qty", "Issue Qty"),
  { field: "cost_factor_name", headerName: "Cost Factor", flex: 1, minWidth: 120 },
  { field: "machine_name", headerName: "Machine", flex: 1, minWidth: 120 },
  { field: "status_name", headerName: "Status", width: 110 },
];

const getRowId = (r: IssueItemwiseReportRow) => r.issue_li_id;

function IssueItemwiseContent() {
  const { branches, coId, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();

  return (
    <ReportPanel
      title="Issue Item-wise"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchIssueItemwiseReport({
              coId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
              branchId: f.branchId,
            })
      }
      columns={columns}
      getRowId={getRowId}
      sortField="issue_date"
      sortDir="desc"
      exportName="issue-itemwise"
    />
  );
}

export default function IssueItemwiseReportPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <IssueItemwiseContent />
    </Suspense>
  );
}
