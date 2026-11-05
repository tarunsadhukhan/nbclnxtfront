"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportPanel, { type ReportFilters } from "@/components/reports/ReportPanel";
import ReportsHubLanding from "@/components/reports/ReportsHubLanding";
import { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { yesterdayIso } from "@/components/reports/reportDates";
import type {
  NbjclReportColumn,
  NbjclReportDownload,
  NbjclReportMeta,
  NbjclReportResult,
  NbjclReportRow,
} from "@/utils/nbjclReportService";

/** Above this many rows the report pages instead of rendering one long table. */
const SCROLL_ROW_LIMIT = 2500;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Default period: the last ended fortnight (1-15 / 16-end), the last ended month, or yesterday. */
function defaultPeriod(span: NbjclReportMeta["span"]): { from: string; to: string } {
  const now = new Date();
  if (span === "month") {
    return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
  }
  if (span === "fortnight") {
    if (now.getDate() > 15) {
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 15)) };
    }
    return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 16)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
  }
  const y = yesterdayIso();
  return { from: y, to: y };
}

const toGridColumns = (cols: NbjclReportColumn[]): GridColDef<NbjclReportRow>[] =>
  cols.map((c) =>
    c.type === "number"
      ? numCol<NbjclReportRow>(c.field, c.headerName, c.width)
      : { field: c.field, headerName: c.headerName, width: c.width, sortable: false },
  );

interface NbjclReportViewProps {
  /** Report key the setup is keyed by (attendance: "<report>", other groups: "<group>/<report>"). */
  reportKey: string;
  loadSetup: (branchId: number) => Promise<Record<string, NbjclReportMeta>>;
  loadReport: (p: { report: string; branchId: number; dateFrom: string; dateTo: string; extra: string }) => Promise<NbjclReportResult>;
}

/**
 * One page for every ported NBJCL report: the backend describes each report's dates and filter and returns
 * rows already laid out with group headers and totals (and, for pay slips, a text file to download).
 * An unknown key shows the reports hub.
 */
export default function NbjclReportView({ reportKey, loadSetup, loadReport }: NbjclReportViewProps) {
  const { branches, initialBranchId } = useReportBranches();
  const [setup, setSetup] = useState<Record<string, NbjclReportMeta> | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [columns, setColumns] = useState<GridColDef<NbjclReportRow>[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [download, setDownload] = useState<NbjclReportDownload | null>(null);

  useEffect(() => {
    if (initialBranchId == null) return;
    loadSetup(initialBranchId)
      .then(setSetup)
      .catch((e: unknown) => setSetupError(e instanceof Error ? e.message : "Failed to load the report list"));
  }, [initialBranchId, loadSetup]);

  const fetcher = useCallback(
    async (f: ReportFilters) => {
      setDownload(null);
      const res = await loadReport({ report: reportKey, branchId: f.branchId, dateFrom: f.dateFrom, dateTo: f.dateTo, extra: f.extra });
      setColumns(toGridColumns(res.columns));
      setRowCount(res.data.length);
      setDownload(res.download ?? null);
      return res.data;
    },
    [reportKey, loadReport],
  );

  const saveDownload = () => {
    if (!download) return;
    const url = URL.createObjectURL(new Blob([download.text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = download.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (setupError) return <Alert severity="error" sx={{ m: 3 }}>{setupError}</Alert>;
  if (initialBranchId == null) return <Alert severity="info" sx={{ m: 3 }}>Select a company and branch in the sidebar.</Alert>;
  if (!setup) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  const meta = setup[reportKey];
  if (!meta) return <ReportsHubLanding title="NBJCL Reports" />;

  const period = defaultPeriod(meta.span);
  return (
    <>
      {download && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Button variant="outlined" onClick={saveDownload}>Download {download.filename}</Button>
        </Box>
      )}
      <ReportPanel<NbjclReportRow>
        key={reportKey}
        title={meta.title}
        branches={branches}
        initialBranchId={initialBranchId}
        dates={meta.dates}
        initialDateFrom={period.from}
        initialDateTo={meta.dates === "single" && meta.span === "day" ? yesterdayIso() : period.to}
        extra={meta.extra ?? undefined}
        initialExtra=""
        fetcher={fetcher}
        columns={columns}
        getRowId={(r) => r.id}
        exportName={reportKey.replace("/", "-")}
        scroll={rowCount <= SCROLL_ROW_LIMIT}
      />
    </>
  );
}
