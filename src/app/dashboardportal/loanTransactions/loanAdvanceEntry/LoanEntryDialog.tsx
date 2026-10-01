"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Save as SaveIcon, Trash2 as DeleteIcon, X } from "lucide-react";
import { z } from "zod";
import { entryGridCellColorsSx, fullScreenBesideSidebar, handleGridEnterKey } from "@/components/ui/entryGrid";
import { todayIso } from "@/components/reports/reportDates";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { fetchLoanEmployee, type LoanEmployee } from "../_shared/loanShared";
import type { LoanDialogProps } from "../_shared/LoanIndexPage";

/** A stored payoloan row (GET loan_entry/{doc}). */
interface PayOLoanRow {
  DocEntry: number;
  LoanDate: string;
  EMIDate: string;
  DocType: string;
  Grade: string;
  ECode: string;
  EName: string;
  DeptCode: string;
  DeptName: string;
  BankName: string;
  IFSCCode: string;
  BankAccNo: string;
  LoanSanction: number;
  NoOfInst: number;
  EMICapital: number;
  Remarks: string;
}

interface GridRow {
  ecode: string;
  emp: LoanEmployee | null;
  sanction: string;
  n_inst: string;
  emi_cap: string;
  remarks: string;
}

const blankRow = (): GridRow => ({ ecode: "", emp: null, sanction: "", n_inst: "", emi_cap: "", remarks: "" });

const positive = z.coerce.number().positive();
const lineSchema = z.object({
  ecode: z.string().min(1),
  sanction: positive,
  no_of_inst: z.coerce.number().int().positive(),
  emi_capital: positive,
  remarks: z.string().max(200),
});
/** NRLOAN: instalments fixed at 1, EMI optional. */
const nrLineSchema = lineSchema.extend({ emi_capital: z.coerce.number().min(0) });

const num = (v: string) => (v.trim() === "" ? 0 : Number(v) || 0);
const money = (n: number) => (n ? n.toFixed(2) : "0.00");

const cellSx = { border: "1px solid", py: 0.25, px: 0.75, whiteSpace: "nowrap" } as const;
const headSx = { ...cellSx, fontWeight: 600, backgroundColor: "action.hover", whiteSpace: "normal", textAlign: "center" } as const;
const numInputProps = { style: { textAlign: "right" as const }, min: 0 };

/** A row of GET loan_entry_list (one per DocEntry). */
export interface LoanDocRow {
  doc_entry: number;
  loan_date: string;
  emi_date: string;
  doc_type: string;
  grade: string;
  doc_status: string;
  line_count: number;
  total_sanction: number;
  first_employee: string | null;
}

/**
 * Loan / Advance Entry (legacy FrmLoanAdvance_NJB). Header: loan date, EMI
 * date, doc type (interest % from the loan type), grade. Grid: one employee
 * per row — typing the EB no looks the employee up (name, dept, bank, and the
 * PF-loan due for PFLOAN). EMI = Sanction / No. of inst (whole rupees);
 * editing the EMI recomputes the instalment count. Interest is never computed
 * (as in the NJB form), so the interest columns stay 0.
 */
export default function LoanEntryDialog({ open, row, onClose, onSaved, branchId, setup }: LoanDialogProps<LoanDocRow>) {
  const docEntry = row?.doc_entry;
  const isEdit = docEntry !== undefined;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loanDate, setLoanDate] = useState(todayIso());
  const [emiDate, setEmiDate] = useState(todayIso());
  const [docType, setDocType] = useState("");
  const [grade, setGrade] = useState("");
  const [rows, setRows] = useState<GridRow[]>(() => [blankRow()]);

  const interestRate = useMemo(
    () => setup.loan_types.find((t) => t.loan_name === docType)?.interest_rate ?? 0,
    [setup.loan_types, docType],
  );
  const isAdvance = docType.toLowerCase() === "advance";
  const showDue = docType.toUpperCase() === "PFLOAN";
  // NRLOAN: single instalment (legacy rows are 1 inst, EMI optional, no schedule).
  const isNrLoan = docType.toUpperCase() === "NRLOAN";

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (docEntry === undefined) {
      setLoanDate(todayIso());
      setEmiDate(todayIso());
      setDocType("");
      setGrade("");
      setRows([blankRow()]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error: err } = await fetchWithCookie<{ data: PayOLoanRow[] }>(
        `${apiRoutesPortalMasters.LOAN_ENTRY_BY_ID}/${docEntry}?branch_id=${branchId}`,
        "GET",
      );
      if (cancelled) return;
      setLoading(false);
      if (err || !data?.data?.length) {
        setError(err || "Loan document not found");
        return;
      }
      const first = data.data[0];
      setLoanDate(first.LoanDate);
      setEmiDate(first.EMIDate);
      setDocType(first.DocType);
      setGrade(first.Grade);
      setRows(
        data.data.map((r) => ({
          ecode: r.ECode,
          emp: {
            ecode: r.ECode,
            ename: r.EName,
            dept_code: r.DeptCode,
            dept_name: r.DeptName,
            bank_name: r.BankName,
            ifsc_code: r.IFSCCode,
            bank_acc_no: r.BankAccNo,
            grade: r.Grade,
            bal_loan: 0,
            bal_int: 0,
          },
          sanction: String(r.LoanSanction),
          n_inst: String(r.NoOfInst),
          emi_cap: String(r.EMICapital),
          remarks: r.Remarks,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [open, docEntry, branchId]);

  const updateRow = useCallback((index: number, patch: Partial<GridRow>) => {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === index ? { ...r, ...patch } : r));
      if (next[next.length - 1].ecode.trim() !== "") next.push(blankRow());
      return next;
    });
  }, []);

  /** Sanction / No. of inst changed -> EMI = round(Sanction / inst). */
  const onAmountsChange = (index: number, patch: Pick<GridRow, "sanction"> | Pick<GridRow, "n_inst">) => {
    if (isNrLoan) return updateRow(index, patch);
    const r = { ...rows[index], ...patch };
    const sanction = num(r.sanction);
    const inst = num(r.n_inst);
    updateRow(index, { ...patch, emi_cap: sanction > 0 && inst > 0 ? String(Math.round(sanction / inst)) : r.emi_cap });
  };

  /** EMI changed -> No. of inst = round(Sanction / EMI). */
  const onEmiChange = (index: number, emi: string) => {
    if (isNrLoan) return updateRow(index, { emi_cap: emi });
    const sanction = num(rows[index].sanction);
    const e = num(emi);
    updateRow(index, { emi_cap: emi, n_inst: sanction > 0 && e > 0 ? String(Math.round(sanction / e)) : rows[index].n_inst });
  };

  const lookup = async (index: number) => {
    const code = rows[index].ecode.trim();
    if (!code || branchId == null) return;
    if (rows.some((r, i) => i !== index && r.ecode.trim() === code)) {
      setError(`Emp Code ${code} is already in the grid`);
      updateRow(index, { ecode: "", emp: null });
      return;
    }
    const { emp, error: err } = await fetchLoanEmployee(branchId, code, emiDate);
    if (err || !emp) {
      setError(err || `Employee ${code} not found`);
      updateRow(index, { emp: null });
      return;
    }
    updateRow(index, { emp });
  };

  const removeRow = (index: number) =>
    setRows((prev) => (prev.length <= 1 ? [blankRow()] : prev.filter((_, i) => i !== index)));

  const filled = rows.filter((r) => r.ecode.trim() !== "");

  const handleSave = async () => {
    if (!docType) return setError("Please select Doc Type");
    if (!grade) return setError("Please select Grade");
    if (filled.length === 0) return setError("At least 1 row should be in the grid");
    const lines = [];
    for (const [i, r] of filled.entries()) {
      if (!r.emp) return setError(`Row ${i + 1}: employee ${r.ecode} not found`);
      const parsed = (isNrLoan ? nrLineSchema : lineSchema).safeParse({
        ecode: r.ecode.trim(),
        sanction: r.sanction,
        no_of_inst: isNrLoan ? 1 : r.n_inst,
        emi_capital: r.emi_cap || 0,
        remarks: r.remarks,
      });
      if (!parsed.success) {
        return setError(isNrLoan
          ? `Row ${i + 1}: Sanction must be > 0`
          : `Row ${i + 1}: Sanction, No. Of Inst. and EMI must be > 0`);
      }
      lines.push(parsed.data);
    }
    setSaving(true);
    const { data, error: err } = await fetchWithCookie<{ message: string; doc_entry: number }>(
      apiRoutesPortalMasters.LOAN_ENTRY_SAVE,
      "POST",
      { branch_id: branchId, doc_entry: docEntry ?? null, loan_date: loanDate, emi_date: emiDate, doc_type: docType, grade, lines },
    );
    setSaving(false);
    if (err || !data) return setError(err || "Save failed");
    onSaved(`${data.message} (Doc ${data.doc_entry})`);
    onClose();
  };

  const readCell = (v: string | number) => (
    <TableCell align="right" sx={cellSx}>
      {typeof v === "number" ? money(v) : v}
    </TableCell>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} {...fullScreenBesideSidebar}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" component="span">
            {isEdit ? `Loan / Advance Entry — Doc ${docEntry}` : "Loan / Advance Entry"}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, ...entryGridCellColorsSx }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" }, gap: 2 }}>
                <TextField type="date" size="small" label="Loan Date" value={loanDate}
                  onChange={(e) => setLoanDate(e.target.value)} InputLabelProps={{ shrink: true }}
                  inputProps={{ max: todayIso() }} required />
                <TextField type="date" size="small" label="EMI Date" value={emiDate}
                  onChange={(e) => setEmiDate(e.target.value)} InputLabelProps={{ shrink: true }} required />
                <TextField select size="small" label="Doc Type" value={docType} disabled={isEdit}
                  onChange={(e) => setDocType(e.target.value)} required>
                  {setup.loan_types.map((t) => (
                    <MenuItem key={t.loan_name} value={t.loan_name}>{t.loan_name}</MenuItem>
                  ))}
                  {isEdit && !setup.loan_types.some((t) => t.loan_name === docType) && (
                    <MenuItem value={docType}>{docType}</MenuItem>
                  )}
                </TextField>
                <TextField size="small" label="Interest %" value={interestRate.toFixed(2)}
                  InputProps={{ readOnly: true }} />
                <TextField select size="small" label="Grade" value={grade}
                  onChange={(e) => setGrade(e.target.value)} required>
                  {setup.grades.map((g) => (
                    <MenuItem key={g} value={g}>{g}</MenuItem>
                  ))}
                </TextField>
              </Box>

              <TableContainer onKeyDown={handleGridEnterKey} sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ borderCollapse: "collapse", "& .MuiInputBase-input": { fontSize: "0.85rem", py: 0.25 } }}>
                  <TableHead>
                    <TableRow>
                      {["SL No.", "Org. ECode", "Emp Code", "Emp Name", "Due Cap.", "Due Int.",
                        "Rebate Amt.", "Sanction Amt.", "No. Of Inst.", "Interest Amt.", "LoanAmt", "Final Cap.",
                        "Final Int.", "EMICap Amt.", "EMIInt Amt.", "Remarks", "BankName", "IFSC Code", "Bank A/c No.", ""]
                        .map((h) => (
                          <TableCell key={h} sx={headSx}>{h}</TableCell>
                        ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r, i) => {
                      const sanction = num(r.sanction);
                      return (
                        <TableRow key={i}>
                          <TableCell sx={cellSx}>{i + 1}</TableCell>
                          <TableCell sx={cellSx}>{r.emp?.ecode ?? ""}</TableCell>
                          <TableCell sx={cellSx}>
                            {/* type=number would lose the leading zeros of EB nos. */}
                            <TextField variant="standard" size="small" value={r.ecode} placeholder="EB No."
                              onChange={(e) => updateRow(i, { ecode: e.target.value, emp: null })}
                              onBlur={() => void lookup(i)}
                              InputProps={{ disableUnderline: true }} sx={{ width: 80 }}
                              inputProps={{ "aria-label": `Row ${i + 1} emp code` }} />
                          </TableCell>
                          <TableCell sx={{ ...cellSx, minWidth: 180 }}>{r.emp?.ename ?? ""}</TableCell>
                          {readCell(showDue ? (r.emp?.bal_loan ?? 0) : 0)}
                          {readCell(showDue ? (r.emp?.bal_int ?? 0) : 0)}
                          {readCell(0)}
                          <TableCell sx={cellSx}>
                            <TextField type="number" variant="standard" size="small" value={r.sanction}
                              onChange={(e) => onAmountsChange(i, { sanction: e.target.value })}
                              InputProps={{ disableUnderline: true }} inputProps={numInputProps} sx={{ width: 90 }} />
                          </TableCell>
                          <TableCell sx={cellSx}>
                            <TextField type="number" variant="standard" size="small"
                              value={isNrLoan ? "1" : r.n_inst} disabled={isNrLoan}
                              onChange={(e) => onAmountsChange(i, { n_inst: e.target.value })}
                              InputProps={{ disableUnderline: true }} inputProps={{ ...numInputProps, step: 1 }} sx={{ width: 60 }} />
                          </TableCell>
                          {readCell(0)}
                          {readCell(sanction)}
                          {readCell(isAdvance ? 0 : sanction)}
                          {readCell(0)}
                          <TableCell sx={cellSx}>
                            <TextField type="number" variant="standard" size="small" value={r.emi_cap}
                              onChange={(e) => onEmiChange(i, e.target.value)}
                              InputProps={{ disableUnderline: true }} inputProps={numInputProps} sx={{ width: 80 }} />
                          </TableCell>
                          {readCell(0)}
                          <TableCell sx={cellSx}>
                            <TextField variant="standard" size="small" value={r.remarks}
                              onChange={(e) => updateRow(i, { remarks: e.target.value })}
                              InputProps={{ disableUnderline: true }} inputProps={{ maxLength: 200 }} sx={{ width: 140 }} />
                          </TableCell>
                          <TableCell sx={cellSx}>{r.emp?.bank_name ?? ""}</TableCell>
                          <TableCell sx={cellSx}>{r.emp?.ifsc_code ?? ""}</TableCell>
                          <TableCell sx={cellSx}>{r.emp?.bank_acc_no ?? ""}</TableCell>
                          <TableCell sx={cellSx}>
                            <IconButton size="small" color="error" onClick={() => removeRow(i)}
                              aria-label={`Remove row ${i + 1}`}>
                              <DeleteIcon size={15} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Button variant="contained" startIcon={<SaveIcon size={18} />} onClick={() => void handleSave()}
                  disabled={saving || branchId == null}>
                  {saving ? "Saving..." : isEdit ? "Update" : "Save"}
                </Button>
                <Button onClick={onClose}>Close</Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      <Snackbar open={error != null} autoHideDuration={5000} onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: "100%" }}>{error}</Alert>
      </Snackbar>
    </>
  );
}
