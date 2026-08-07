"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { useReportBranches } from "@/components/reports/useReportBranches";
import {
  aggregateHeadcount,
  fetchEmployeeHeadcount,
  type HeadcountSummaryRow,
} from "@/utils/hrmsReportService";

const columns: GridColDef<HeadcountSummaryRow>[] = [
  { field: "department", headerName: "Department", flex: 1, minWidth: 180 },
  { field: "sub_department", headerName: "Sub Department", flex: 1, minWidth: 180 },
  { field: "designation", headerName: "Designation", flex: 1, minWidth: 200 },
  { field: "emp_count", headerName: "No. of Employees", type: "number", width: 160 },
];

function Content() {
  const { coId, branches, initialBranchId } = useReportBranches();
  return (
    <ReportPanel
      title="Designation Wise Summary"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="none"
      fetcher={async (f) =>
        coId == null
          ? []
          : aggregateHeadcount(
              await fetchEmployeeHeadcount({ coId, branchId: f.branchId }),
              ["department", "sub_department", "designation"],
            )
      }
      columns={columns}
      getRowId={(r) => r.id}
      exportName="designation-summary"
    />
  );
}

export default function DesignationSummaryPage() {
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
