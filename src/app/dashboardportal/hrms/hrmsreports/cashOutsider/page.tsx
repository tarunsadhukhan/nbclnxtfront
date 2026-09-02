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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useReportBranches } from "@/components/reports/useReportBranches";
import { todayIso } from "@/components/reports/reportDates";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  cashHandsPdfUrl,
  fetchCashHands,
  processCashHands,
  type CashHandsRow,
} from "@/utils/hrmsReportService";

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const twoDigits = (n: number): string =>
  n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;

/** Indian-numbering amount in words — mirrors the backend's amount_in_words
 * (crore / lakh / thousand, lower-case "only") so the sheet and the PDF agree. */
function amountInWords(amount: number): string {
  let rupees = Math.round(amount || 0);
  if (rupees === 0) return "Zero only";
  const parts: string[] = [];
  for (const [divisor, label] of [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
  ] as const) {
    if (rupees >= divisor) {
      parts.push(`${twoDigits(Math.floor(rupees / divisor))} ${label}`);
      rupees %= divisor;
    }
  }
  if (rupees >= 100) {
    parts.push(`${ONES[Math.floor(rupees / 100)]} Hundred`);
    rupees %= 100;
  }
  if (rupees > 0) parts.push(twoDigits(rupees));
  return `${parts.join(" ")} only`;
}

interface DeptGroup {
  department: string;
  rows: CashHandsRow[];
  hours: number;
  amount: number;
}

interface DayGroup {
  payDate: string;
  departments: DeptGroup[];
  hours: number;
  amount: number;
}

/** Group flat payment rows into pay date → department, with subtotals. */
function groupByDay(rows: CashHandsRow[]): DayGroup[] {
  const days = new Map<string, Map<string, DeptGroup>>();
  for (const r of rows) {
    const date = r.pay_date ?? "";
    const dept = r.department ?? "(No Department)";
    if (!days.has(date)) days.set(date, new Map());
    const depts = days.get(date)!;
    if (!depts.has(dept)) depts.set(dept, { department: dept, rows: [], hours: 0, amount: 0 });
    const g = depts.get(dept)!;
    g.rows.push(r);
    g.hours += r.working_hours;
    g.amount += r.amount;
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([payDate, depts]) => {
      const departments = [...depts.values()].sort((a, b) =>
        a.department.localeCompare(b.department),
      );
      return {
        payDate,
        departments,
        hours: departments.reduce((s, d) => s + d.hours, 0),
        amount: departments.reduce((s, d) => s + d.amount, 0),
      };
    });
}

const headSx = { fontWeight: 600, backgroundColor: "action.hover" } as const;

/**
 * Daily Cash Outsider Payment (legacy EJM report 682) — the cash payment
 * preparation sheet for cash/outsider hands. No pay scheme is involved:
 * "Prepare" processes cash-type attendance hours priced at the rate approved
 * in Cash/Daily Rate Entry into daily_cash_outsider_payment (re-preparing a
 * period replaces its rows), and the sheet below prints from that stored set,
 * grouped day-wise and department-wise with amount in words per day.
 */
function Content() {
  const { coId, branches, initialBranchId } = useReportBranches();
  const { selectedCompany } = useSidebarContext();

  // Seeded null, then filled after mount (sidebar context hydrates from
  // localStorage on the first client render — see cashHands page note).
  const [branchId, setBranchId] = useState<number | null>(null);
  const seededBranch = useRef(false);
  useEffect(() => {
    if (seededBranch.current || initialBranchId == null) return;
    seededBranch.current = true;
    setBranchId(initialBranchId);
  }, [initialBranchId]);

  const [dateFrom, setDateFrom] = useState(todayIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [rows, setRows] = useState<CashHandsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning";
  }>({ open: false, message: "", severity: "success" });

  const branch = branches.find((b) => b.branch_id === branchId) ?? null;
  const ready = coId != null && branchId != null;

  const load = useCallback(async () => {
    if (coId == null || branchId == null) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchCashHands({ coId, branchId, dateFrom, dateTo }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load payment sheet");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [coId, branchId, dateFrom, dateTo]);

  const handlePrepare = useCallback(async () => {
    if (coId == null || branchId == null) return;
    setPreparing(true);
    try {
      const res = await processCashHands({ coId, branchId, dateFrom, dateTo });
      const warn = res.rows_without_rate > 0;
      setSnackbar({
        open: true,
        message: warn
          ? `${res.message}. ${res.rows_without_rate} row(s) have no approved rate and priced at 0 — add them in Cash/Daily Rate Entry and prepare again.`
          : `${res.message}. Total amount ${res.total_amount.toFixed(2)}.`,
        severity: warn ? "warning" : "success",
      });
      await load();
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Preparation failed",
        severity: "error",
      });
    } finally {
      setPreparing(false);
    }
  }, [coId, branchId, dateFrom, dateTo, load]);

  const pdfHref = useMemo<string | null>(() => {
    if (coId == null || branchId == null) return null;
    return cashHandsPdfUrl({
      coId,
      branchId,
      dateFrom,
      dateTo,
      companyName: selectedCompany?.co_name,
    });
  }, [coId, branchId, dateFrom, dateTo, selectedCompany?.co_name]);

  const days = useMemo(() => groupByDay(rows), [rows]);
  const grand = useMemo(
    () => ({
      hours: days.reduce((s, d) => s + d.hours, 0),
      amount: days.reduce((s, d) => s + d.amount, 0),
    }),
    [days],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}>
        Daily Cash Outsider Payment
      </Typography>

      <Paper elevation={1} sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Autocomplete
            options={branches}
            getOptionLabel={(o) => o.branch_name}
            isOptionEqualToValue={(o, v) => o.branch_id === v.branch_id}
            value={branch}
            onChange={(_, v) => setBranchId(v?.branch_id ?? null)}
            renderInput={(params) => <TextField {...params} label="Branch" size="small" />}
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
            disabled={!ready || preparing}
            onClick={() => void handlePrepare()}
            sx={{
              backgroundColor: "#0C3C60",
              "&:hover": { backgroundColor: "#092d47" },
              textTransform: "none",
            }}
          >
            {preparing ? "Preparing..." : "Prepare Payment"}
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
            {rows.length} row(s) · Total hours {grand.hours.toFixed(2)} · Total amount{" "}
            {grand.amount.toFixed(2)} · {amountInWords(grand.amount)}
          </Typography>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : days.length === 0 ? (
        <Typography color="text.secondary" sx={{ p: 2 }}>
          No prepared payment rows for the selected period — pick the dates and
          click Prepare Payment.
        </Typography>
      ) : (
        days.map((day) => (
          <Paper key={day.payDate} elevation={1} sx={{ mb: 3, p: 2, overflowX: "auto" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Payment Date: {day.payDate}
            </Typography>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx}>EB No</TableCell>
                  <TableCell sx={headSx}>Worker Name</TableCell>
                  <TableCell sx={headSx}>Occupation</TableCell>
                  <TableCell sx={headSx}>Spell</TableCell>
                  <TableCell align="right" sx={headSx}>Hours</TableCell>
                  <TableCell align="right" sx={headSx}>Rate</TableCell>
                  <TableCell align="right" sx={headSx}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {day.departments.map((dept) => (
                  <React.Fragment key={dept.department}>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ fontWeight: 600, backgroundColor: "action.selected" }}>
                        {dept.department}
                      </TableCell>
                    </TableRow>
                    {dept.rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.eb_no}</TableCell>
                        <TableCell>{r.worker_name}</TableCell>
                        <TableCell>{r.occupation}</TableCell>
                        <TableCell>{r.shift}</TableCell>
                        <TableCell align="right">{r.working_hours.toFixed(2)}</TableCell>
                        <TableCell align="right">{r.rate.toFixed(2)}</TableCell>
                        <TableCell align="right">{r.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} sx={{ fontWeight: 600 }}>
                        {dept.department} Total
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {dept.hours.toFixed(2)}
                      </TableCell>
                      <TableCell />
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {dept.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
                <TableRow>
                  <TableCell colSpan={4} sx={{ fontWeight: 700 }}>
                    Day Total — {amountInWords(day.amount)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {day.hours.toFixed(2)}
                  </TableCell>
                  <TableCell />
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {day.amount.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        ))
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function CashOutsiderPaymentPage() {
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
