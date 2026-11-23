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
import type { RegisterRow } from "../wagesSalaryProcess/wagesRegisterExport";

interface WinsomePeriod {
  code: string;
  name: string;
  from_date: string;
  to_date: string;
  row_count: number;
  /** 1 when the legacy bank file (PayWagesH) exists — the period can no longer be processed. */
  bank_file: number;
}

interface WagesRow {
  id: string;
  ecode: string;
  ename: string;
  egroup: string;
  slip: string;
  dept_code: string;
  work_hr: number;
  ot_hr: number;
  ns_hr: number;
  holiday_hr: number;
  wages_gross: number;
  pf: number;
  esi: number;
  hrd: number;
  total_deduction: number;
  net_payable: number;
}

interface Totals {
  wages_gross: number;
  total_deduction: number;
  net_payable: number;
}

interface RunSummary {
  period: string;
  employees: number;
  wages_gross: number;
  total_deduction: number;
  net_payable: number;
}

const EMPTY_PERIODS: WinsomePeriod[] = Object.freeze([]) as unknown as WinsomePeriod[];

const runSchema = z.object({
  pcode: z.string().min(1, "Select a period"),
  lwf_amt: z.coerce.number().min(0, "LWF amount cannot be negative").max(100000),
});

const periodLabel = (p: WinsomePeriod) =>
  `${p.name} (${p.code}) ${p.from_date} to ${p.to_date}${p.row_count ? ` - ${p.row_count} rows` : ""}`;

const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const columns: GridColDef<WagesRow>[] = [
  { field: "ecode", headerName: "EB NO", width: 100 },
  { field: "ename", headerName: "NAME", flex: 1, minWidth: 180 },
  { field: "egroup", headerName: "GROUP", width: 150 },
  { field: "slip", headerName: "SLIP", width: 80 },
  { field: "dept_code", headerName: "DEPT", width: 70 },
  { field: "work_hr", headerName: "WORK HR", width: 90, type: "number" },
  { field: "ot_hr", headerName: "OT HR", width: 80, type: "number" },
  { field: "ns_hr", headerName: "NS HR", width: 80, type: "number" },
  { field: "holiday_hr", headerName: "HOL HR", width: 80, type: "number" },
  { field: "wages_gross", headerName: "GROSS", width: 110, type: "number", valueFormatter: (v: number) => money(v) },
  { field: "pf", headerName: "PF", width: 80, type: "number" },
  { field: "esi", headerName: "ESI", width: 80, type: "number" },
  { field: "hrd", headerName: "HRD", width: 80, type: "number" },
  { field: "total_deduction", headerName: "DEDUCTION", width: 110, type: "number", valueFormatter: (v: number) => money(v) },
  { field: "net_payable", headerName: "NET PAY", width: 110, type: "number", valueFormatter: (v: number) => money(v) },
];

/**
 * Winsome Wages (legacy Smart-Eye Winsome "Process - F/N Wages") — runs the ported
 * SP_WagesProcessing chain for one WIL/Factory fortnight and lists the PayWages rows.
 * Backend: pyhback src/hrms/winsomeWagesProcess.py + winsome_wages_process.sql.
 */
export default function WinsomeWagesPage() {
  const { selectedBranches, selectedCompany } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [periods, setPeriods] = useState<WinsomePeriod[]>(EMPTY_PERIODS);
  const [pcode, setPcode] = useState("");
  const [lwfOn, setLwfOn] = useState(false);
  const [lwfAmt, setLwfAmt] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const [rows, setRows] = useState<WagesRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loadingRows, setLoadingRows] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
  const [search, setSearch] = useState("");

  const period = useMemo(() => periods.find((p) => p.code === pcode), [periods, pcode]);

  const loadSetup = useCallback(async () => {
    if (branchId == null) return;
    const { data, error: err } = await fetchWithCookie<{ data: { periods: WinsomePeriod[] } }>(
      `${apiRoutesPortalMasters.WINSOME_WAGES_SETUP}?branch_id=${branchId}`,
      "GET",
    );
    if (err || !data) return setError(err || "Failed to load wages periods");
    // only periods that have already ended (newest first)
    const today = new Date().toLocaleDateString("en-CA");
    const ended = data.data.periods.filter((p) => p.to_date < today);
    setPeriods(ended);
    setPcode((cur) => (ended.some((p) => p.code === cur) ? cur : ended[0]?.code ?? ""));
  }, [branchId]);

  const loadRows = useCallback(async () => {
    if (branchId == null || !pcode) {
      setRows([]);
      setTotal(0);
      setTotals(null);
      return;
    }
    setLoadingRows(true);
    const params = new URLSearchParams({
      branch_id: String(branchId),
      pcode,
      page: String(paginationModel.page + 1),
      limit: String(paginationModel.pageSize),
    });
    if (search) params.append("search", search);
    const { data, error: err } = await fetchWithCookie<{ data: WagesRow[]; total: number; totals: Totals }>(
      `${apiRoutesPortalMasters.WINSOME_WAGES_RESULT}?${params}`,
      "GET",
    );
    setLoadingRows(false);
    if (err || !data) return setError(err || "Failed to load processed wages");
    setRows(data.data);
    setTotal(data.total);
    setTotals(data.totals);
  }, [branchId, pcode, paginationModel.page, paginationModel.pageSize, search]);

  useEffect(() => {
    setSummary(null);
    void loadSetup();
  }, [loadSetup]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleProcess = async () => {
    setConfirmOpen(false);
    const parsed = runSchema.safeParse({ pcode, lwf_amt: lwfOn ? lwfAmt || 0 : 0 });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    setSummary(null);
    setRunning(true);
    const { data, error: err } = await fetchWithCookie<{ message: string; data: RunSummary }>(
      apiRoutesPortalMasters.WINSOME_WAGES_RUN,
      "POST",
      { branch_id: branchId, ...parsed.data },
    );
    setRunning(false);
    if (err || !data) return setError(err || "Wages processing failed");
    setSummary(data.data);
    setSnack(data.message);
    setPaginationModel((p) => ({ ...p, page: 0 }));
    void loadSetup();
    void loadRows();
  };

  /** Fetch the whole period (not just the grid page) and download it as Excel or the PDF register. */
  const handleExport = async (kind: "excel" | "pdf") => {
    if (branchId == null || !pcode) return;
    setExporting(kind);
    const { data, error: err } = await fetchWithCookie<{
      data: RegisterRow[];
      period: { name: string; to_date: string };
    }>(`${apiRoutesPortalMasters.WINSOME_WAGES_EXPORT}?branch_id=${branchId}&pcode=${pcode}`, "GET");
    if (err || !data) {
      setExporting(null);
      return setError(err || "Export failed");
    }
    if (data.data.length === 0) {
      setExporting(null);
      return setError("Nothing to export - process the period first");
    }
    const { exportWagesExcel, exportWagesPdf } = await import("../wagesSalaryProcess/wagesRegisterExport");
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

  const handleReset = () => {
    setPcode("");
    setLwfOn(false);
    setLwfAmt("");
    setSummary(null);
    setError(null);
  };

  const blocked = period != null && period.bank_file > 0;
  const noRows = (period?.row_count ?? 0) === 0;

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">Process - F/N Wages (Winsome)</Typography>

      <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {branchId == null && <Alert severity="info">Select a company and branch in the sidebar.</Alert>}
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {blocked && <Alert severity="warning">BANK FILE Generated for {period?.code} - unable to do wages process.</Alert>}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
          <Autocomplete
            size="small"
            options={periods}
            value={period ?? null}
            getOptionLabel={periodLabel}
            isOptionEqualToValue={(o, v) => o.code === v.code}
            onChange={(_, v) => setPcode(v ? v.code : "")}
            renderInput={(params) => <TextField {...params} label="Period" required />}
            sx={{ gridColumn: { md: "span 2" } }}
          />
          <FormControlLabel
            control={<Checkbox checked={lwfOn} onChange={(e) => { setLwfOn(e.target.checked); if (!e.target.checked) setLwfAmt(""); }} />}
            label="L.W.Fund (2nd F/N of Jun & Dec)"
          />
          <TextField size="small" label="L.W.Fund Amount" type="number" value={lwfAmt} disabled={!lwfOn}
            onChange={(e) => setLwfAmt(e.target.value)} inputProps={{ min: 0, step: "0.01" }} />
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="contained" disabled={!pcode || running || blocked || branchId == null}
            onClick={() => setConfirmOpen(true)}>
            {running ? "Processing..." : "Process"}
          </Button>
          <Button onClick={handleReset} disabled={running}>Reset</Button>
          <Button variant="outlined" disabled={!pcode || running || exporting != null || noRows}
            onClick={() => void handleExport("excel")}>
            {exporting === "excel" ? "Preparing..." : "Excel"}
          </Button>
          <Button variant="outlined" disabled={!pcode || running || exporting != null || noRows}
            onClick={() => void handleExport("pdf")}>
            {exporting === "pdf" ? "Preparing..." : "PDF"}
          </Button>
        </Box>
        {summary && (
          <Alert severity="success">
            {summary.period}: {summary.employees} slips - Gross {money(summary.wages_gross)} - Deduction{" "}
            {money(summary.total_deduction)} - Net Payable {money(summary.net_payable)}
          </Alert>
        )}
      </Paper>

      {pcode && (
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
            Do you want to process wages for {period?.name} ({period?.from_date} to {period?.to_date})? Earlier
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
