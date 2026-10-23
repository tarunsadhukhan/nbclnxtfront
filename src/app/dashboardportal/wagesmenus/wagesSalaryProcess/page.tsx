"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { z } from "zod";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import type { RegisterRow } from "./wagesRegisterExport";

interface WagesPeriod {
  id: number;
  code: string;
  name: string;
  from_date: string;
  to_date: string;
  row_count: number;
  /** Rows in the period that were not created by this process (migrated legacy data). */
  legacy_rows: number;
}

interface WagesRow {
  ecode: string;
  ename: string;
  egroup: string;
  dept_code: string;
  work_hr: number;
  ns_hr: number;
  holiday_hr: number;
  wages_gross: number;
  pf: number;
  esi: number;
  ptax: number;
  total_deduction: number;
  net_payable: number;
}

interface Totals {
  wages_gross: number;
  total_deduction: number;
  net_payable: number;
}

interface RunStatus {
  state: "idle" | "running" | "done" | "error";
  message?: string;
  data?: RunSummary;
}

interface RunSummary {
  period: string;
  employees: number;
  wages_gross: number;
  total_deduction: number;
  net_payable: number;
}

/** One step of the data collection run: rows written and employees covered. */
interface CollectionStep {
  updt_from: string;
  row_count: number;
  employees: number;
}

const EMPTY_PERIODS: WagesPeriod[] = Object.freeze([]) as unknown as WagesPeriod[];

const runSchema = z.object({
  period_id: z.coerce.number().int().positive("Select a period"),
  lwf_amt: z.coerce.number().min(0, "LWF amount cannot be negative").max(100000),
});

const periodLabel = (p: WagesPeriod) =>
  `${p.name} (${p.code}) ${p.from_date} to ${p.to_date}${p.row_count ? ` - ${p.row_count} rows` : ""}`;

const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const columns: GridColDef<WagesRow>[] = [
  { field: "ecode", headerName: "EB NO", width: 100 },
  { field: "ename", headerName: "NAME", flex: 1, minWidth: 180 },
  { field: "egroup", headerName: "GROUP", width: 170 },
  { field: "dept_code", headerName: "DEPT", width: 70 },
  { field: "work_hr", headerName: "WORK HR", width: 90, type: "number" },
  { field: "ns_hr", headerName: "NS HR", width: 80, type: "number" },
  { field: "holiday_hr", headerName: "HOL HR", width: 80, type: "number" },
  { field: "wages_gross", headerName: "GROSS", width: 110, type: "number", valueFormatter: (v: number) => money(v) },
  { field: "pf", headerName: "PF", width: 80, type: "number" },
  { field: "esi", headerName: "ESI", width: 80, type: "number" },
  { field: "ptax", headerName: "PTAX", width: 80, type: "number" },
  { field: "total_deduction", headerName: "DEDUCTION", width: 110, type: "number", valueFormatter: (v: number) => money(v) },
  { field: "net_payable", headerName: "NET PAY", width: 110, type: "number", valueFormatter: (v: number) => money(v) },
];

/**
 * Wages Process (legacy FrmWagesProcess_FYN, "Fort Night" branch) — runs the
 * SP_WagesProcessing chain for one wages (P) period of the sidebar branch and
 * lists the resulting paywages rows. Backend: src/hrms/wagesSalaryProcess.py.
 */
export default function WagesSalaryProcessPage() {
  const { selectedBranches, selectedCompany } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [periods, setPeriods] = useState<WagesPeriod[]>(EMPTY_PERIODS);
  const [periodId, setPeriodId] = useState("");
  const [lwfOn, setLwfOn] = useState(false);
  const [lwfAmt, setLwfAmt] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [exporting, setExporting] = useState<"excel" | "pdf" | "payslip" | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [collection, setCollection] = useState<CollectionStep[] | null>(null);

  const [rows, setRows] = useState<WagesRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loadingRows, setLoadingRows] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
  const [search, setSearch] = useState("");

  const period = useMemo(() => periods.find((p) => String(p.id) === periodId), [periods, periodId]);

  const loadSetup = useCallback(async () => {
    if (branchId == null) return;
    const { data, error: err } = await fetchWithCookie<{ data: { periods: WagesPeriod[] } }>(
      `${apiRoutesPortalMasters.WAGES_PROCESS_SETUP}?branch_id=${branchId}`,
      "GET",
    );
    if (err || !data) return setError(err || "Failed to load wages periods");
    // only periods that have already ended (newest first, e.g. today 2026-10-11 -> 16 to 30 Sep is the latest)
    const today = new Date().toLocaleDateString("en-CA");
    const ended = data.data.periods.filter((p) => p.to_date < today);
    setPeriods(ended);
    const last = ended[0];
    // keep the picked period across a refresh; default to the latest ended one
    setPeriodId((cur) => (ended.some((p) => String(p.id) === cur) ? cur : last ? String(last.id) : ""));
  }, [branchId]);

  const loadRows = useCallback(async () => {
    if (branchId == null || !periodId) {
      setRows([]);
      setTotal(0);
      setTotals(null);
      return;
    }
    setLoadingRows(true);
    const params = new URLSearchParams({
      branch_id: String(branchId),
      period_id: periodId,
      page: String(paginationModel.page + 1),
      limit: String(paginationModel.pageSize),
    });
    if (search) params.append("search", search);
    const { data, error: err } = await fetchWithCookie<{ data: WagesRow[]; total: number; totals: Totals }>(
      `${apiRoutesPortalMasters.WAGES_PROCESS_RESULT}?${params}`,
      "GET",
    );
    setLoadingRows(false);
    if (err || !data) return setError(err || "Failed to load processed wages");
    setRows(data.data);
    setTotal(data.total);
    setTotals(data.totals);
  }, [branchId, periodId, paginationModel.page, paginationModel.pageSize, search]);

  useEffect(() => {
    setSummary(null);
    void loadSetup();
  }, [loadSetup]);

  useEffect(() => {
    setCollection(null);
  }, [periodId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  /** Check the background run of the selected period; finishes the UI state when it is no longer running. */
  const checkStatus = useCallback(async () => {
    if (!periodId) return;
    const { data } = await fetchWithCookie<{ data: RunStatus }>(
      `${apiRoutesPortalMasters.WAGES_PROCESS_STATUS}?period_id=${periodId}`,
      "GET",
    );
    const st = data?.data;
    if (!st) return;
    if (st.state === "running") return setRunning(true);
    if (st.state === "done" && st.data) {
      setSummary(st.data);
      setSnack(st.message ?? "Wages Processed ..");
      setPaginationModel((p) => ({ ...p, page: 0 }));
      void loadSetup();
      void loadRows();
    } else if (st.state === "error") {
      setError(st.message ?? "Wages processing failed");
    }
    setRunning(false);
  }, [periodId, loadSetup, loadRows]);

  // pick up a run that is already in progress when the period is selected
  useEffect(() => {
    setRunning(false);
    void (async () => {
      if (!periodId) return;
      const { data } = await fetchWithCookie<{ data: RunStatus }>(
        `${apiRoutesPortalMasters.WAGES_PROCESS_STATUS}?period_id=${periodId}`,
        "GET",
      );
      if (data?.data.state === "running") setRunning(true);
    })();
  }, [periodId]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void checkStatus(), 3000);
    return () => clearInterval(timer);
  }, [running, checkStatus]);

  const handleProcess = async () => {
    setConfirmOpen(false);
    const parsed = runSchema.safeParse({ period_id: periodId, lwf_amt: lwfOn ? lwfAmt || 0 : 0 });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    setSummary(null);
    setRunning(true);
    const { data, error: err } = await fetchWithCookie<{ message: string }>(
      apiRoutesPortalMasters.WAGES_PROCESS_RUN,
      "POST",
      { branch_id: branchId, ...parsed.data },
    );
    if (err || !data) {
      setRunning(false);
      return setError(err || "Wages processing failed");
    }
    setSnack(data.message);
  };

  /**
   * Process (1): the backend runs wages_data_collection.sql for the period - collects the inputs, writes each
   * calculation as its own rows in nbjcl_wages_data_collection, then loads the summary into paywages.
   */
  const handleCollect = async () => {
    const parsed = runSchema.safeParse({ period_id: periodId, lwf_amt: lwfOn ? lwfAmt || 0 : 0 });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    setSummary(null);
    setCollection(null);
    setCollecting(true);
    const { data, error: err } = await fetchWithCookie<{
      message: string;
      data: { steps: CollectionStep[]; summary: RunSummary };
    }>(
      apiRoutesPortalMasters.WAGES_DATA_COLLECTION_RUN,
      "POST",
      { branch_id: branchId, ...parsed.data },
    );
    setCollecting(false);
    if (err || !data) return setError(err || "Data collection failed");
    setCollection(data.data.steps);
    setSummary(data.data.summary);
    setSnack(data.message);
    // the run also rewrites the period's paywages rows, so refresh the period counts and the grid
    setPaginationModel((p) => ({ ...p, page: 0 }));
    void loadSetup();
    void loadRows();
  };

  /** Fetch the whole period (not just the grid page) and download it as Excel or the PDF register. */
  const handleExport = async (kind: "excel" | "pdf") => {
    if (branchId == null || !periodId) return;
    setExporting(kind);
    const { data, error: err } = await fetchWithCookie<{
      data: RegisterRow[];
      period: { name: string; to_date: string };
    }>(`${apiRoutesPortalMasters.WAGES_PROCESS_EXPORT}?branch_id=${branchId}&period_id=${periodId}`, "GET");
    if (err || !data) {
      setExporting(null);
      return setError(err || "Export failed");
    }
    if (data.data.length === 0) {
      setExporting(null);
      return setError("Nothing to export - process the period first");
    }
    const { exportWagesExcel, exportWagesPdf } = await import("./wagesRegisterExport");
    const header = {
      companyName: selectedCompany?.co_name ?? "",
      fneDate: data.period.to_date,
      periodName: data.period.name,
    };
    try {
      await (kind === "excel" ? exportWagesExcel(data.data, header) : exportWagesPdf(data.data, header));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    }
    setExporting(null);
  };

  /**
   * Pay Slip: the period's wages slips as the fixed-position text file for the pre-printed stationery
   * (legacy Smart-Eye "WAGES PAY SLIP"); the backend lays it out, the browser only saves it.
   */
  const handlePayslip = async () => {
    if (branchId == null || !periodId) return;
    setExporting("payslip");
    const { data, error: err } = await fetchWithCookie<{ data: { filename: string; slips: number; text: string } }>(
      `${apiRoutesPortalMasters.WAGES_PAYSLIP_TEXT}?branch_id=${branchId}&period_id=${periodId}`,
      "GET",
    );
    setExporting(null);
    if (err || !data) return setError(err || "Pay slip failed");
    const url = URL.createObjectURL(new Blob([data.data.text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = data.data.filename;
    link.click();
    URL.revokeObjectURL(url);
    setSnack(`Pay slips: ${data.data.slips}`);
  };

  const handleReset = () => {
    setPeriodId("");
    setLwfOn(false);
    setLwfAmt("");
    setSummary(null);
    setCollection(null);
    setError(null);
  };

  const blocked = period != null && period.legacy_rows > 0;

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">Process - FN Wages</Typography>

      <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {branchId == null && <Alert severity="info">Select a company and branch in the sidebar.</Alert>}
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {blocked && (
          <Alert severity="warning">
            {period?.code} already holds {period?.legacy_rows} migrated wage rows and cannot be re-processed.
          </Alert>
        )}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
          <Autocomplete
            size="small"
            options={periods}
            value={period ?? null}
            getOptionLabel={periodLabel}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            onChange={(_, v) => setPeriodId(v ? String(v.id) : "")}
            renderInput={(params) => <TextField {...params} label="Period" required />}
            sx={{ gridColumn: { md: "span 2" } }}
          />
          <FormControlLabel
            control={<Checkbox checked={lwfOn} onChange={(e) => { setLwfOn(e.target.checked); if (!e.target.checked) setLwfAmt(""); }} />}
            label="LW Fund (2nd F/N of Jun & Dec)"
          />
          <TextField size="small" label="LW Fund Amount" type="number" value={lwfAmt} disabled={!lwfOn}
            onChange={(e) => setLwfAmt(e.target.value)} inputProps={{ min: 0, step: "0.01" }} />
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {/* ponytail: "Process" switched off — wages run through Process (1) (wages_data_collection.sql);
              restore `disabled={!periodId || running || collecting || blocked || branchId == null}` to bring it back */}
          <Button variant="contained" disabled
            onClick={() => setConfirmOpen(true)}>
            {running ? "Processing... (takes a few minutes)" : "Process"}
          </Button>
          <Button variant="contained" disabled={!periodId || running || collecting || branchId == null}
            onClick={() => void handleCollect()}>
            {collecting ? "Processing..." : "Process (1)"}
          </Button>
          <Button onClick={handleReset} disabled={running || collecting}>Reset</Button>
          <Button variant="outlined" disabled={!periodId || running || exporting != null || (period?.row_count ?? 0) === 0}
            onClick={() => void handleExport("excel")}>
            {exporting === "excel" ? "Preparing..." : "Excel"}
          </Button>
          <Button variant="outlined" disabled={!periodId || running || exporting != null || (period?.row_count ?? 0) === 0}
            onClick={() => void handleExport("pdf")}>
            {exporting === "pdf" ? "Preparing..." : "PDF"}
          </Button>
          <Button variant="outlined" disabled={!periodId || running || collecting || exporting != null || (period?.row_count ?? 0) === 0}
            onClick={() => void handlePayslip()}>
            {exporting === "payslip" ? "Preparing..." : "Pay Slip"}
          </Button>
        </Box>
        {collection && (
          <Alert severity="success">
            Steps: {collection.reduce((n, s) => n + s.row_count, 0)} rows -{" "}
            {collection.map((s) => `${s.updt_from} ${s.row_count}`).join(", ")}
          </Alert>
        )}
        {summary && (
          <Alert severity="success">
            {summary.period}: {summary.employees} employees - Gross {money(summary.wages_gross)} - Deduction{" "}
            {money(summary.total_deduction)} - Net Payable {money(summary.net_payable)}
          </Alert>
        )}
      </Paper>

      {periodId && (
        <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <TextField size="small" label="Search EB No / Name" value={search}
              onChange={(e) => { setSearch(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })); }} />
            {totals && (
              <Typography variant="body2">
                Gross {money(totals.wages_gross)} | Deduction {money(totals.total_deduction)} | Net {money(totals.net_payable)}
              </Typography>
            )}
          </Box>
          <DataGrid
            autoHeight
            rows={rows}
            getRowId={(r) => r.ecode}
            columns={columns}
            rowCount={total}
            loading={loadingRows}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[25, 50, 100]}
            disableRowSelectionOnClick
            density="compact"
          />
        </Paper>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Process Wages</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you want to process wages for {period?.name} ({period?.from_date} to {period?.to_date})? Any earlier
            processed rows of this period are replaced.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>No</Button>
          <Button variant="contained" onClick={() => void handleProcess()}>Yes</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snack != null} autoHideDuration={4000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity="success" onClose={() => setSnack(null)} sx={{ width: "100%" }}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
