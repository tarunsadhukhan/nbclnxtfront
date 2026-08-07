"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import {
  fetchBankStatement,
  type BankStatementRow,
} from "@/utils/hrmsReportService";

const columns: GridColDef<BankStatementRow>[] = [
  { field: "emp_code", headerName: "Employee Code", width: 130 },
  { field: "emp_name", headerName: "Employee Name", flex: 1, minWidth: 200 },
  { field: "bank_name", headerName: "Bank Name", flex: 1, minWidth: 150 },
  { field: "bank_acc_no", headerName: "Account No", width: 160 },
  { field: "ifsc_code", headerName: "IFSC Code", width: 130 },
  { field: "from_date", headerName: "From", width: 110 },
  { field: "to_date", headerName: "To", width: 110 },
  numCol("net_pay", "Net Pay", 130),
];

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  return (
    <ReportPanel
      title="Employee Bank Statement"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchBankStatement({
              coId,
              branchId: f.branchId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      sortField="emp_code"
      exportName="bank-statement"
    />
  );
}

export default function BankStatementPage() {
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
