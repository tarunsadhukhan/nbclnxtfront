"use client";
import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, Box, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel, { type ReportFilters } from "@/components/reports/ReportPanel";
import ReportsHubLanding from "@/components/reports/ReportsHubLanding";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { yesterdayIso } from "@/components/reports/reportDates";
import {
  fetchAttendanceRegisterReport,
  fetchAttendanceRegisterSetup,
  type NbjclReportColumn,
  type NbjclReportMeta,
  type NbjclReportRow,
} from "@/utils/nbjclReportService";

/** Above this many rows the report pages instead of rendering one long table. */
const SCROLL_ROW_LIMIT = 2500;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The last fortnight that has ended: 1-15 of this month, or 16-end of the previous one. */
function lastFortnight(): { from: string; to: string } {
  const now = new Date();
  if (now.getDate() > 15) {
    return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 15)) };
  }
  return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 16)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
}

const toGridColumns = (cols: NbjclReportColumn[]): GridColDef<NbjclReportRow>[] =>
  cols.map((c) =>
    c.type === "number"
      ? numCol<NbjclReportRow>(c.field, c.headerName, c.width)
      : { field: c.field, headerName: c.headerName, width: c.width, sortable: false },
  );

/**
 * NBJCL Reports > Attendance Register — one page for all 16 reports of the group. The route's
 * last segment is the report key (it matches the seeded menu path); the backend describes the
 * report's filters and returns rows already laid out with group headers and totals.
 */
function Content() {
  const { report } = useParams<{ report: string }>();
  const { branches, initialBranchId } = useReportBranches();
  const [setup, setSetup] = useState<Record<string, NbjclReportMeta> | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [columns, setColumns] = useState<GridColDef<NbjclReportRow>[]>([]);
  const [rowCount, setRowCount] = useState(0);

  useEffect(() => {
    if (initialBranchId == null) return;
    fetchAttendanceRegisterSetup(initialBranchId)
      .then(setSetup)
      .catch((e: unknown) => setSetupError(e instanceof Error ? e.message : "Failed to load the report list"));
  }, [initialBranchId]);

  const fetcher = useCallback(
    async (f: ReportFilters) => {
      const res = await fetchAttendanceRegisterReport({
        report,
        branchId: f.branchId,
        dateFrom: f.dateFrom,
        dateTo: f.dateTo,
        extra: f.extra,
      });
      setColumns(toGridColumns(res.columns));
      setRowCount(res.data.length);
      return res.data;
    },
    [report],
  );

  if (setupError) return <Alert severity="error" sx={{ m: 3 }}>{setupError}</Alert>;
  if (initialBranchId == null) return <Alert severity="info" sx={{ m: 3 }}>Select a company and branch in the sidebar.</Alert>;
  if (!setup) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  const meta = setup[report];
  if (!meta) return <ReportsHubLanding title="NBJCL Reports" />;

  const yesterday = yesterdayIso();
  const period = meta.span === "fortnight" ? lastFortnight() : { from: yesterday, to: yesterday };
  return (
    <ReportPanel<NbjclReportRow>
      key={report}
      title={meta.title}
      branches={branches}
      initialBranchId={initialBranchId}
      dates={meta.dates}
      initialDateFrom={period.from}
      initialDateTo={meta.dates === "single" ? yesterday : period.to}
      extra={meta.extra ?? undefined}
      initialExtra=""
      fetcher={fetcher}
      columns={columns}
      getRowId={(r) => r.id}
      exportName={report}
      scroll={rowCount <= SCROLL_ROW_LIMIT}
    />
  );
}

export default function NbjclAttendanceRegisterReportPage() {
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
