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
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { z } from "zod";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

interface SalaryPeriod {
  id: number;
  code: string;
  name: string;
  from_date: string;
  to_date: string;
  /** Staff rows in the legacy monthly attendance (PayMAtten) for the period. */
  attendance_rows: number;
  /** PaySalary rows already in the period (all sub groups). */
  row_count: number;
}

interface SalaryRow {
  ecode: string;
  ename: string;
  sub_group: string;
  designation: string;
  payable_days: number;
  basic: number;
  da: number;
  hra: number;
  ot: number;
  gross: number;
  pf: number;
  esi: number;
  ptax: number;
  loans: number;
  total_deduction: number;
  net_pay: number;
}

interface RunSummary {
  period: string;
  sub_group: string;
  employees: number;
  gross: number;
  total_deduction: number;
  net_pay: number;
}

const EMPTY_PERIODS: SalaryPeriod[] = Object.freeze([]) as unknown as SalaryPeriod[];

const runSchema = z.object({
  period_id: z.coerce.number().int().positive("Select a period"),
  sub_group: z.string().min(1, "Select a sub group"),
  lwf_amt: z.coerce.number().min(0, "LWF amount cannot be negative").max(100000),
});

const periodLabel = (p: SalaryPeriod) =>
  `${p.name} (${p.code}) ${p.from_date} to ${p.to_date}${p.row_count ? ` - ${p.row_count} rows` : ""}`;

const money = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const amount = (field: keyof SalaryRow, headerName: string, width = 100): GridColDef<SalaryRow> => ({
  field, headerName, width, type: "number", valueFormatter: (v: number) => money(v),
});

const columns: GridColDef<SalaryRow>[] = [
  { field: "ecode", headerName: "E.CODE", width: 90 },
  { field: "ename", headerName: "NAME", flex: 1, minWidth: 180 },
  { field: "sub_group", headerName: "SUB GROUP", width: 120 },
  { field: "designation", headerName: "DESIGNATION", width: 160 },
  { field: "payable_days", headerName: "DAYS", width: 70, type: "number" },
  amount("basic", "BASIC"),
  amount("da", "DA", 90),
  amount("hra", "HRA", 90),
  amount("ot", "OT", 90),
  amount("gross", "GROSS", 110),
  amount("pf", "PF", 80),
  amount("esi", "ESI", 80),
  amount("ptax", "PTAX", 80),
  amount("loans", "LOAN/ADV", 90),
  amount("total_deduction", "DEDUCTION", 110),
  amount("net_pay", "NET PAY", 110),
];

/**
 * Salary Process (legacy FrmWagesProcess_FYN, "Staff Salary" branch) — runs SP_SalaryProcessing for one
 * staff salary (S) period and sub group of the sidebar branch and lists the resulting PaySalary rows.
 * Backend: src/hrms/staffSalaryProcess.py.
 */
export default function StaffSalaryProcessPage() {
  const { selectedBranches } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [periods, setPeriods] = useState<SalaryPeriod[]>(EMPTY_PERIODS);
  const [subGroups, setSubGroups] = useState<string[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [subGroup, setSubGroup] = useState("STAFF");
  const [lwfOn, setLwfOn] = useState(false);
  const [lwfAmt, setLwfAmt] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const period = useMemo(() => periods.find((p) => String(p.id) === periodId), [periods, periodId]);

  const loadSetup = useCallback(async () => {
    if (branchId == null) return;
    const { data, error: err } = await fetchWithCookie<{ data: { periods: SalaryPeriod[]; sub_groups: string[] } }>(
      `${apiRoutesPortalMasters.SALARY_PROCESS_SETUP}?branch_id=${branchId}`,
      "GET",
    );
    if (err || !data) return setError(err || "Failed to load salary periods");
    // only months that have already ended, newest first
    const today = new Date().toLocaleDateString("en-CA");
    const ended = data.data.periods.filter((p) => p.to_date < today);
    setPeriods(ended);
    setSubGroups(data.data.sub_groups);
    setPeriodId((cur) => (ended.some((p) => String(p.id) === cur) ? cur : ended[0] ? String(ended[0].id) : ""));
  }, [branchId]);

  const loadRows = useCallback(async () => {
    if (branchId == null || !periodId) return setRows([]);
    setLoadingRows(true);
    const params = new URLSearchParams({ branch_id: String(branchId), period_id: periodId, sub_group: subGroup });
    const { data, error: err } = await fetchWithCookie<{ data: SalaryRow[] }>(
      `${apiRoutesPortalMasters.SALARY_PROCESS_RESULT}?${params}`,
      "GET",
    );
    setLoadingRows(false);
    if (err || !data) return setError(err || "Failed to load processed salary");
    setRows(data.data);
  }, [branchId, periodId, subGroup]);

  useEffect(() => {
    setSummary(null);
    void loadSetup();
  }, [loadSetup]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleProcess = async () => {
    setConfirmOpen(false);
    const parsed = runSchema.safeParse({ period_id: periodId, sub_group: subGroup, lwf_amt: lwfOn ? lwfAmt || 0 : 0 });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setError(null);
    setSummary(null);
    setRunning(true);
    const { data, error: err } = await fetchWithCookie<{ message: string; data: RunSummary }>(
      apiRoutesPortalMasters.SALARY_PROCESS_RUN,
      "POST",
      { branch_id: branchId, ...parsed.data },
    );
    setRunning(false);
    if (err || !data) return setError(err || "Salary processing failed");
    setSummary(data.data);
    setSnack(data.message);
    void loadSetup();
    void loadRows();
  };

  const handleReset = () => {
    setPeriodId("");
    setSubGroup("STAFF");
    setLwfOn(false);
    setLwfAmt("");
    setSummary(null);
    setError(null);
  };

  const totals = useMemo(
    () => rows.reduce((t, r) => ({ gross: t.gross + r.gross, ded: t.ded + r.total_deduction, net: t.net + r.net_pay }),
      { gross: 0, ded: 0, net: 0 }),
    [rows],
  );

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6">Process - Staff Salary</Typography>

      <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {branchId == null && <Alert severity="info">Select a company and branch in the sidebar.</Alert>}
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        {period != null && period.attendance_rows === 0 && (
          <Alert severity="warning">No staff monthly attendance (PayMAtten) for {period.code} yet.</Alert>
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
          <Autocomplete
            size="small"
            options={subGroups}
            value={subGroup || null}
            onChange={(_, v) => setSubGroup(v ?? "")}
            renderInput={(params) => <TextField {...params} label="Sub Group" required />}
          />
          <TextField size="small" label="From / To" value={period ? `${period.from_date} to ${period.to_date}` : ""}
            InputProps={{ readOnly: true }} />
          <FormControlLabel
            control={<Checkbox checked={lwfOn} onChange={(e) => { setLwfOn(e.target.checked); if (!e.target.checked) setLwfAmt(""); }} />}
            label="L.W. Fund"
          />
          <TextField size="small" label="L.W. Fund Amount" type="number" value={lwfAmt} disabled={!lwfOn}
            onChange={(e) => setLwfAmt(e.target.value)} inputProps={{ min: 0, step: "0.01" }} />
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="contained" disabled={!periodId || !subGroup || running || branchId == null}
            onClick={() => setConfirmOpen(true)}>
            {running ? "Processing..." : "Process"}
          </Button>
          <Button onClick={handleReset} disabled={running}>Reset</Button>
        </Box>
        {summary && (
          <Alert severity="success">
            {summary.period} / {summary.sub_group}: {summary.employees} employees, gross {money(summary.gross)},
            deduction {money(summary.total_deduction)}, net pay {money(summary.net_pay)}
          </Alert>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="subtitle2">
          {rows.length} employees - gross {money(totals.gross)}, deduction {money(totals.ded)}, net pay {money(totals.net)}
        </Typography>
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          getRowId={(r) => r.ecode}
          loading={loadingRows}
          density="compact"
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          disableRowSelectionOnClick
        />
      </Paper>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Process staff salary?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {period?.code} / {subGroup}: existing salary rows of this sub group are recalculated.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void handleProcess()}>Process</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack != null} autoHideDuration={4000} onClose={() => setSnack(null)} message={snack ?? ""} />
    </Box>
  );
}
