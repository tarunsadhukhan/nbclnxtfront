"use client";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { z } from "zod";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import LoanIndexPage, { type LoanDialogProps } from "../_shared/LoanIndexPage";
import { fetchLoanEmployee, periodLabel, type LoanEmployee } from "../_shared/loanShared";

interface RepayRow {
  doc_entry: number;
  ecode: string;
  ename: string;
  grade: string;
  doc_type: string;
  pcode: string;
  pname: string;
  from_date: string;
  to_date: string;
  repay_capital: number;
  repay_interest: number;
  rebate_amt: number;
  remarks: string;
}

// Negative amounts are reversals — the legacy data has them.
const amount = z.coerce.number();
const schema = z
  .object({
    doc_type: z.string().min(1, "Loan DocType must be selected"),
    ecode: z.string().trim().min(1, "Employee cannot be left blank"),
    period_id: z.coerce.number().int().positive("Period cannot be left blank"),
    grade: z.string(),
    repay_capital: amount,
    repay_interest: amount,
    rebate_amt: amount,
    remarks: z.string().max(500),
  })
  .refine((v) => v.repay_capital !== 0 || v.repay_interest !== 0 || v.rebate_amt !== 0, {
    message: "Enter a repayment or rebate amount",
  });

const columns: GridColDef<RepayRow>[] = [
  { field: "doc_entry", headerName: "DOC NO", width: 90 },
  { field: "ecode", headerName: "EB NO", width: 100 },
  { field: "ename", headerName: "NAME", flex: 1, minWidth: 180 },
  { field: "doc_type", headerName: "LOAN TYPE", width: 110 },
  { field: "pname", headerName: "PERIOD", width: 120 },
  { field: "to_date", headerName: "TO DATE", width: 110 },
  { field: "repay_capital", headerName: "CAPITAL", type: "number", width: 110 },
  { field: "repay_interest", headerName: "INTEREST", type: "number", width: 110 },
  { field: "rebate_amt", headerName: "REBATE", type: "number", width: 100 },
];

/** Balance shown for the chosen loan type, as the legacy GetBalance did. */
function balanceFor(emp: LoanEmployee | null, docType: string): string {
  if (!emp) return "";
  const t = docType.toUpperCase();
  if (t === "PFLOAN") return emp.bal_loan.toFixed(2);
  if (t === "PFINT") return emp.bal_int.toFixed(2);
  return "0.00";
}

/**
 * Loan Repayment (legacy FrmLoanAdjustment) — one repayment per employee +
 * deduction period: capital, interest and rebate amounts. Saving also zeroes
 * the employee's instalments falling inside the period (payloan1), like the
 * legacy "Amount Settled".
 */
function RepaymentDialog({ open, row, onClose, onSaved, branchId, setup }: LoanDialogProps<RepayRow>) {
  const [grade, setGrade] = useState("");
  const [ecode, setEcode] = useState("");
  const [emp, setEmp] = useState<LoanEmployee | null>(null);
  const [periodId, setPeriodId] = useState("");
  const [docType, setDocType] = useState("");
  const [cap, setCap] = useState("");
  const [intr, setIntr] = useState("");
  const [rebate, setRebate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const period = setup.periods.find((p) => String(p.id) === periodId);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setEmp(null);
    const p = row && setup.periods.find((x) => x.code === row.pcode && x.to_date === row.to_date);
    setGrade(row?.grade ?? "");
    setEcode(row?.ecode ?? "");
    setPeriodId(p ? String(p.id) : "");
    setDocType(row?.doc_type ?? "");
    setCap(row ? String(row.repay_capital) : "");
    setIntr(row ? String(row.repay_interest) : "");
    setRebate(row ? String(row.rebate_amt) : "");
    setRemarks(row?.remarks ?? "");
  }, [open, row, setup.periods]);

  // Employee + balance as of the period end (legacy GetBalance uses the FNE date).
  useEffect(() => {
    const code = ecode.trim();
    if (!open || !code || branchId == null) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const { emp: found, error: err } = await fetchLoanEmployee(branchId, code, period?.to_date);
      if (cancelled) return;
      setEmp(found);
      if (err) setError(err);
      else if (found && !row) setGrade((g) => g || found.grade);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, ecode, branchId, period?.to_date, row]);

  const handleSave = async () => {
    const parsed = schema.safeParse({
      doc_type: docType, ecode, period_id: periodId, grade,
      repay_capital: cap || 0, repay_interest: intr || 0, rebate_amt: rebate || 0, remarks,
    });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setSaving(true);
    const { data, error: err } = await fetchWithCookie<{ message: string; doc_entry: number }>(
      apiRoutesPortalMasters.LOAN_REPAY_SAVE,
      "POST",
      { branch_id: branchId, doc_entry: row?.doc_entry ?? null, ...parsed.data },
    );
    setSaving(false);
    if (err || !data) return setError(err || "Save failed");
    onSaved(`${data.message} (Doc ${data.doc_entry})`);
    onClose();
  };

  const numField = (label: string, value: string, set: (v: string) => void) => (
    <TextField type="number" size="small" label={label} value={value} onChange={(e) => set(e.target.value)}
      inputProps={{ step: 0.01 }} />
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{row ? `Loan Repayment — Doc ${row.doc_entry}` : "Loan Repayment"}</DialogTitle>
      <DialogContent sx={{ pt: "8px !important" }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField select size="small" label="Grade" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {setup.grades.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
          </TextField>
          <Box sx={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 1 }}>
            <TextField size="small" label="EB No." value={ecode} required disabled={row != null}
              onChange={(e) => { setEcode(e.target.value); setEmp(null); }} />
            <TextField size="small" label="Employee Name" value={emp?.ename ?? row?.ename ?? ""}
              InputProps={{ readOnly: true }} />
          </Box>
          <TextField select size="small" label="Deduct. Month" value={periodId} required
            onChange={(e) => setPeriodId(e.target.value)}>
            {setup.periods.map((p) => <MenuItem key={p.id} value={String(p.id)}>{periodLabel(p)}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Loan Type" value={docType} required
            onChange={(e) => setDocType(e.target.value)}>
            {setup.loan_types.map((t) => <MenuItem key={t.loan_name} value={t.loan_name}>{t.loan_name}</MenuItem>)}
            {row && !setup.loan_types.some((t) => t.loan_name === docType) && (
              <MenuItem value={docType}>{docType}</MenuItem>
            )}
          </TextField>
          <TextField size="small" label="From" value={period?.from_date ?? ""} InputProps={{ readOnly: true }} />
          <TextField size="small" label="To" value={period?.to_date ?? ""} InputProps={{ readOnly: true }} />
          <TextField size="small" label="Balance" value={balanceFor(emp, docType)} InputProps={{ readOnly: true }}
            helperText="PF loan balance as of the period end" />
          {numField("Repay Capital Amt", cap, setCap)}
          {numField("Repay Interest Amt", intr, setIntr)}
          {numField("Rebate Amt", rebate, setRebate)}
          <TextField size="small" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)}
            inputProps={{ maxLength: 500 }} sx={{ gridColumn: { sm: "1 / -1" } }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving || branchId == null}>
          {saving ? "Saving..." : row ? "Update" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function LoanRepaymentPage() {
  return (
    <LoanIndexPage
      title="Loan Repayment"
      listUrl={apiRoutesPortalMasters.LOAN_REPAY_LIST}
      columns={columns}
      rowId={(r) => r.doc_entry}
      searchPlaceholder="Search EB no, name, period or loan type"
      createLabel="New Repayment"
      Dialog={RepaymentDialog}
    />
  );
}
