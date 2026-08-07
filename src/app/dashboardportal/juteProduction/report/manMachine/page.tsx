"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import {
  fetchManMachine,
  type ManMachineRow,
} from "@/utils/hrmsReportService";

const columns: GridColDef<ManMachineRow>[] = [
  { field: "machine_name", headerName: "Machine", flex: 1, minWidth: 160 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 140 },
  { field: "designation", headerName: "Designation", flex: 1, minWidth: 140 },
  { field: "spell", headerName: "Spell", width: 90 },
  { field: "hands", headerName: "Hands", type: "number", width: 100 },
  numCol("stoppage_hours", "Stoppage Hrs", 130),
];

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  const { from, to } = currentMonthRange();
  return (
    <ReportPanel
      title="Man-Machine Deployment"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="range"
      initialDateFrom={from}
      initialDateTo={dateParam || to}
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchManMachine({
              coId,
              branchId: f.branchId,
              dateFrom: f.dateFrom,
              dateTo: f.dateTo,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      sortField="machine_name"
      exportName="man-machine"
    />
  );
}

export default function ManMachinePage() {
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
