"use client";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import ReportGrid, { numCol } from "@/components/reports/ReportGrid";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { currentMonthRange } from "@/components/reports/reportDates";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  cashHandsPdfUrl,
  fetchCashHands,
  fetchCashHandsSummary,
  processCashHands,
  type CashHandsRow,
  type CashHandsSummaryRow,
} from "@/utils/hrmsReportService";
import { exportCashHandsWorkbook } from "./cashHandsExcel";

const columns: GridColDef<CashHandsRow>[] = [
  { field: "pay_date", headerName: "Date", width: 110 },
  { field: "eb_no", headerName: "EB No", width: 110 },
  { field: "worker_name", headerName: "Worker Name", flex: 2, minWidth: 180 },
  { field: "shift", headerName: "Spell", width: 80 },
  { field: "department", headerName: "Department", flex: 1.5, minWidth: 150 },
  { field: "occupation", headerName: "Occupation", flex: 1.5, minWidth: 150 },
  numCol("rate", "Rate", 100),
  numCol("working_hours", "Hours", 100),
  numCol("amount", "Amount", 120),
];

const summaryColumns: GridColDef<CashHandsSummaryRow>[] = [
  { field: "pay_date", headerName: "Date", width: 110 },
  { field: "department", headerName: "Department", flex: 2, minWidth: 200 },
  { field: "shift", headerName: "Spell", width: 90 },
  numCol("hours", "Hours", 110),
  numCol("amount", "Amount", 130),
];

/**
 * Cash Hands Report (legacy 610). Cash attendance is first *processed* into
 * daily_cash_outsider_payment — priced at the rate approved in Cash/Daily Rate
 * Entry — and the grid, Excel and PDF all print from that stored set. Running
 * Process again for the same period replaces the rows it wrote before.
 */
function Content() {
  const { coId, branches, initialBranchId } = useReportBranches();
  const { selectedCompany } = useSidebarContext();
  const { from, to } = currentMonthRange();

  // Seeded null, then filled in after mount. initialBranchId comes from the
  // sidebar context, which hydrates from localStorage on the first CLIENT
  // render — using it during the first render makes the branch Autocomplete
  // render differently than the server HTML and breaks hydration.
  const [branchId, setBranchId] = useState<number | null>(null);
  const seededBranch = useRef(false);
  useEffect(() => {
    if (seededBranch.current || initialBranchId == null) return;
    seededBranch.current = true;
    setBranchId(initialBranchId);
  }, [initialBranchId]);

  const [dateFrom, setDateFrom] = useState(from);
  const [dateTo, setDateTo] = useState(to);
  const [rows, setRows] = useState<CashHandsRow[]>([]);
  const [summary, setSummary] = useState<CashHandsSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning";
  }>({ open: false, message: "", severity: "success" });

  // Branch is required for every call below, so `branchId` gates the buttons.
  const branch = branches.find((b) => b.branch_id === branchId) ?? null;
  const ready = coId != null && branchId != null;

  const load = useCallback(async () => {
    if (coId == null || branchId == null) return;
    setLoading(true);
    setError(null);
    try {
      const p = {
        coId,
        branchId: branchId,
        dateFrom,
        dateTo,
      };
      const [detail, summaryRows] = await Promise.all([
        fetchCashHands(p),
        fetchCashHandsSummary(p),
      ]);
      setRows(detail);
      setSummary(summaryRows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load report");
      setRows([]);
      setSummary([]);
    } finally {
      setLoading(false);
    }
  }, [coId, branchId, dateFrom, dateTo]);

  const handleProcess = useCallback(async () => {
    if (coId == null || branchId == null) return;
    setProcessing(true);
    try {
      const res = await processCashHands({
        coId,
        branchId: branchId,
        dateFrom,
        dateTo,
      });
      // A worker with no approved rate prices at zero — say so rather than
      // let a silently-zero payment sheet get printed.
      const warn = res.rows_without_rate > 0;
      setSnackbar({
        open: true,
        message: warn
          ? `${res.message}. ${res.rows_without_rate} row(s) have no approved rate and priced at 0 — add them in Cash/Daily Rate Entry and process again.`
          : `${res.message}. Total amount ${res.total_amount.toFixed(2)}.`,
        severity: warn ? "warning" : "success",
      });
      await load();
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Processing failed",
        severity: "error",
      });
    } finally {
      setProcessing(false);
    }
  }, [coId, branchId, dateFrom, dateTo, load]);

  const handleExcel = useCallback(async () => {
    await exportCashHandsWorkbook(columns, rows, summaryColumns, summary, {
      companyName: selectedCompany?.co_name,
      branchName: branch?.branch_name,
      reportName: "Cash Hands Report",
      reportFor: `${dateFrom} To ${dateTo}`,
    });
  }, [rows, summary, selectedCompany?.co_name, branch?.branch_name, dateFrom, dateTo]);

  // null (not "") until a company/branch is known — an empty href would render
  // an anchor pointing at the current page.
  const pdfHref = useMemo<string | null>(() => {
    if (coId == null || branchId == null) return null;
    return cashHandsPdfUrl({
      coId,
      branchId: branchId,
      dateFrom,
      dateTo,
      companyName: selectedCompany?.co_name,
    });
  }, [coId, branchId, dateFrom, dateTo, selectedCompany?.co_name]);

  const totals = useMemo(
    () => ({
      hours: rows.reduce((a, r) => a + r.working_hours, 0),
      amount: rows.reduce((a, r) => a + r.amount, 0),
    }),
    [rows],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}>
        Cash Hands Report
      </Typography>

      <Paper elevation={1} sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Autocomplete
            options={branches}
            getOptionLabel={(o) => o.branch_name}
            isOptionEqualToValue={(o, v) => o.branch_id === v.branch_id}
            value={branch}
            onChange={(_, v) => setBranchId(v?.branch_id ?? null)}
            renderInput={(params) => (
              <TextField {...params} label="Branch" size="small" />
            )}
            sx={{ minWidth: 240 }}
          />
          <TextField
            type="date"
            label="From Date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
          />
          <TextField
            type="date"
            label="To Date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 170 }}
          />

          <Button
            variant="contained"
            disabled={!ready || processing}
            onClick={() => void handleProcess()}
            sx={{
              backgroundColor: "#0C3C60",
              "&:hover": { backgroundColor: "#092d47" },
              textTransform: "none",
            }}
          >
            {processing ? "Processing..." : "Process"}
          </Button>
          <Button
            variant="outlined"
            disabled={!ready || loading}
            onClick={() => void load()}
            sx={{ textTransform: "none" }}
          >
            Show
          </Button>
          <Button
            variant="outlined"
            disabled={rows.length === 0}
            onClick={() => void handleExcel()}
            sx={{ textTransform: "none" }}
          >
            Export to Excel
          </Button>
          <Button
            variant="outlined"
            disabled={rows.length === 0 || !pdfHref}
            onClick={() => {
              if (pdfHref) window.open(pdfHref, "_blank", "noopener");
            }}
            sx={{ textTransform: "none" }}
          >
            Print PDF
          </Button>
        </Box>

        {rows.length > 0 && (
          <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
            {rows.length} row(s) · Total hours {totals.hours.toFixed(2)} · Total amount{" "}
            {totals.amount.toFixed(2)}
          </Typography>
        )}
      </Paper>

      <ReportGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        loading={loading}
        error={error}
        branchId={branchId}
        sortField="pay_date"
      />
    </Box>
  );
}

export default function CashHandsReportPage() {
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
