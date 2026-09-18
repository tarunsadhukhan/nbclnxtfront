"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  fetchWagesSalaryPeriods,
  processWagesSalary,
  type PayPeriodOption,
  type WageAmountField,
  type WagesProcessType,
  type WagesSalaryResult,
} from "@/utils/hrmsService";

const PROCESS_OPTIONS: { value: WagesProcessType; label: string; prefix: string }[] = [
  { value: "W", label: "Wages", prefix: "P" },
  { value: "S", label: "Salary", prefix: "S" },
];

const TOTAL_LABELS: [WageAmountField, string][] = [
  ["FBasic_Amt", "Basic"],
  ["DA_Amt", "DA"],
  ["NS_Amt", "Night Shift"],
  ["OT_Amt", "Overtime"],
  ["BeamChange_Amt", "Beam Change"],
  ["MiscEarn", "Misc. Earning"],
  ["Oil_Amt", "Oil"],
];

const EMPTY_PERIODS: PayPeriodOption[] = Object.freeze([]) as unknown as PayPeriodOption[];

const submitSchema = z.object({
  branch_id: z.number().int().positive("Select a branch in the sidebar"),
  process_type: z.enum(["W", "S"]),
  pay_period_id: z.number().int().positive("Select a period"),
});

/**
 * Wages / Salary Process — pick the processing type and a pay_period (wages codes
 * start with P, salary with S) and run the legacy SP_WagesProcessing chain for it.
 * Scoped by the sidebar branch.
 */
export default function WagesSalaryProcessPage() {
  const { selectedBranches } = useSidebarContext();
  const branchId = Number(selectedBranches[0] ?? 0);

  const [processType, setProcessType] = useState<WagesProcessType>("W");
  const [periods, setPeriods] = useState<PayPeriodOption[]>(EMPTY_PERIODS);
  const [periodId, setPeriodId] = useState("");
  // Set only inside the effect: the sidebar branch comes from localStorage, so anything
  // derived from it during render would differ between SSR and the first client render.
  const [periodStatus, setPeriodStatus] = useState<"idle" | "no-branch" | "ready">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<WagesSalaryResult | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: "success" | "error" } | null>(null);

  // Periods follow the sidebar branch and the processing type.
  useEffect(() => {
    setPeriodId("");
    setPeriods(EMPTY_PERIODS);
    if (!branchId) {
      setPeriodStatus("no-branch");
      return;
    }
    setPeriodStatus("idle");
    let cancelled = false;
    fetchWagesSalaryPeriods(branchId, processType).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setSnackbar({ message: error || "Failed to load periods", severity: "error" });
        return;
      }
      setPeriods(data.data);
      setPeriodStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [branchId, processType]);

  const handleSubmit = async () => {
    const parsed = submitSchema.safeParse({
      branch_id: branchId,
      process_type: processType,
      pay_period_id: periodId ? Number(periodId) : 0,
    });
    if (!parsed.success) {
      setSnackbar({ message: parsed.error.issues[0].message, severity: "error" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await processWagesSalary(parsed.data);
    setSubmitting(false);
    if (error || !data) {
      setSnackbar({ message: error || "Process failed", severity: "error" });
      return;
    }
    setResult(data.data);
    setSnackbar({ message: `Processed ${data.data.processed} attendance records`, severity: "success" });
  };

  const selected = PROCESS_OPTIONS.find((o) => o.value === processType);

  return (
    <Box className="flex flex-col gap-4 p-6">
      <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
        Wages / Salary Process
      </Typography>

      <Paper className="flex flex-wrap items-start gap-3 p-4">
        <TextField
          select
          size="small"
          label="Processing"
          value={processType}
          onChange={(e) => setProcessType(e.target.value as WagesProcessType)}
          sx={{ minWidth: 160 }}
        >
          {PROCESS_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Period"
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
          sx={{ minWidth: 300 }}
          disabled={periods.length === 0}
          helperText={
            periodStatus === "no-branch"
              ? "Select a branch in the sidebar"
              : periodStatus === "ready" && periods.length === 0
                ? `No ${selected?.label.toLowerCase()} periods (code ${selected?.prefix}…) for this branch`
                : undefined
          }
        >
          {periods.map((p) => (
            <MenuItem key={p.id} value={String(p.id)}>
              {p.code} — {p.from_date} to {p.to_date}
            </MenuItem>
          ))}
        </TextField>
        <Button onClick={() => void handleSubmit()} disabled={submitting || !periodId}>
          {submitting ? "Processing..." : "Submit"}
        </Button>
      </Paper>

      {result && (
        <Paper className="flex flex-col gap-2 p-4">
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {result.code}: {result.from_date} to {result.to_date}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {result.processed} attendance records processed
            {result.without_rate > 0 && ` — ${result.without_rate} employees have no worker rate (basic/DA left 0)`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Wages register (paywages): {result.register.employees} employees —{" "}
            {result.register.hours.Work_HR.toLocaleString("en-IN")} work hrs,{" "}
            {result.register.hours.Work_Day.toLocaleString("en-IN")} work days
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Wages: gross {result.register.amounts.Wages_Gross.toLocaleString("en-IN", { minimumFractionDigits: 2 })},
            deductions {result.register.amounts.TotalDeduction.toLocaleString("en-IN", { minimumFractionDigits: 2 })},
            net payable {result.register.amounts.NetPayable.toLocaleString("en-IN")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            OT (paywagesot): {result.ot.employees} employees — {result.ot.hours.toLocaleString("en-IN")} hrs, payable{" "}
            {result.ot.payable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
          <Table size="small" sx={{ maxWidth: 420 }}>
            <TableBody>
              {TOTAL_LABELS.map(([field, label]) => (
                <TableRow key={field}>
                  <TableCell>{label}</TableCell>
                  <TableCell align="right">
                    {result.totals[field].toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Snackbar
        open={snackbar !== null}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar?.severity ?? "success"} onClose={() => setSnackbar(null)} sx={{ width: "100%" }}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
