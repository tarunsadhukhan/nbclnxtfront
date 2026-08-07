"use client";
import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel from "@/components/reports/ReportPanel";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { yesterdayIso } from "@/components/reports/reportDates";
import {
  fetchAbsenteeism,
  type AbsenteeismRow,
} from "@/utils/hrmsReportService";

const columns: GridColDef<AbsenteeismRow>[] = [
  { field: "emp_code", headerName: "EB No", width: 110 },
  { field: "emp_name", headerName: "Name", flex: 1, minWidth: 200 },
  { field: "department", headerName: "Department", flex: 1, minWidth: 170 },
  { field: "category", headerName: "Category", flex: 1, minWidth: 140 },
  { field: "last_seen", headerName: "Last Seen", width: 120 },
  numCol("absent_for", "Absent For (Days)", 150),
];

function Content() {
  const { coId, branches, initialBranchId, dateParam } = useReportBranches();
  return (
    <ReportPanel
      title="Absenteeism"
      branches={branches}
      initialBranchId={initialBranchId}
      dates="single"
      singleLabel="As On"
      initialDateTo={dateParam || yesterdayIso()}
      extra={{
        label: "Absent For",
        options: [
          { value: "1", label: "1+ days" },
          { value: "7", label: "7+ days" },
          { value: "15", label: "15+ days" },
          { value: "30", label: "30+ days" },
          { value: "90", label: "90+ days" },
        ],
      }}
      initialExtra="7"
      fetcher={(f) =>
        coId == null
          ? Promise.resolve([])
          : fetchAbsenteeism({
              coId,
              branchId: f.branchId,
              asOn: f.dateTo,
              minDays: Number(f.extra) || 1,
            })
      }
      columns={columns}
      getRowId={(r) => r.id}
      sortField="absent_for"
      sortDir="desc"
      exportName="absenteeism"
    />
  );
}

export default function AbsenteeismPage() {
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
