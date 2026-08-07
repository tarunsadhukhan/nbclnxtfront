"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { useReportBranches } from "@/components/reports/useReportBranches";
import {
  fetchWorkerMaster,
  type WorkerMasterRow,
} from "@/utils/hrmsReportService";

const columns: GridColDef<WorkerMasterRow>[] = [
  { field: "emp_code", headerName: "Emp Code", width: 110 },
  { field: "emp_name", headerName: "Name", flex: 1, minWidth: 180 },
  { field: "gender", headerName: "Gender", width: 90 },
  { field: "dept_desc", headerName: "Department", flex: 1, minWidth: 140 },
  { field: "sub_dept_desc", headerName: "Sub-Dept", flex: 1, minWidth: 130 },
  { field: "designation", headerName: "Designation", flex: 1, minWidth: 130 },
  { field: "category", headerName: "Category", width: 120 },
  { field: "date_of_join", headerName: "Date of Join", width: 120 },
  { field: "contractor_name", headerName: "Contractor", flex: 1, minWidth: 130 },
  { field: "esi_no", headerName: "ESI No", width: 120 },
  { field: "pf_no", headerName: "PF No", width: 120 },
  { field: "pay_scheme", headerName: "Pay Scheme", flex: 1, minWidth: 130 },
  { field: "status_name", headerName: "Status", width: 110 },
  { field: "is_active", headerName: "Active", width: 90 },
  { field: "last_working_day", headerName: "Last Working", width: 120 },
];

function Content() {
  const { coId, branches, initialBranchId } = useReportBranches();
  return (
    <ReportPanel
      title="Worker Master"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="none"
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchWorkerMaster({ coId, branchId: f.branchId })
      }
      columns={columns}
      getRowId={(r) => r.id}
      sortField="emp_code"
      exportName="worker-master"
    />
  );
}

export default function WorkerMasterPage() {
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
