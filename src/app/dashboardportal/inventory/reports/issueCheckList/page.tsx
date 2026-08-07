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

/**
 * Stores Issue Check List — one row per issue line with quantity, value
 * (receipt-lot rate), SR no, cost center, expense type, machine and status.
 * Mirrors the legacy Data-Portal "Issue Checklist" store report.
 */
const columns: GridColDef<IssueItemwiseReportRow>[] = [
  { field: "issue_no", headerName: "Issue No", width: 120 },
  { field: "issue_date", headerName: "Issue Date", width: 110 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 130 },
  { field: "item_code", headerName: "Item Code", width: 120 },
  { field: "item_name", headerName: "Item Description", width: 450 },
  { field: "uom_name", headerName: "Unit", width: 80 },
  { field: "cost_factor_name", headerName: "Cost Center", flex: 1, minWidth: 130 },
  numCol("issue_qty", "Quantity"),
  numCol("issue_value", "Value"),
  { field: "expense_type_name", headerName: "Exp Type", width: 120 },
  { field: "branch_name", headerName: "Branch", flex: 1, minWidth: 120 },
  { field: "sr_no", headerName: "SR No", width: 150 },
  { field: "machine_name", headerName: "Machine Name", flex: 1, minWidth: 130 },
  { field: "status_name", headerName: "Status", width: 110 },
];

const getRowId = (r: IssueItemwiseReportRow) => r.issue_li_id;

function IssueCheckListContent() {
  const { branches, coId, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();

  return (
    <ReportPanel
      title="Stores Issue Check List"
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
      exportName="stores-issue-checklist"
    />
  );
}

export default function IssueCheckListReportPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <IssueCheckListContent />
    </Suspense>
  );
}
