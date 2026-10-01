"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
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
import { Save as SaveIcon, X } from "lucide-react";
import { entryGridCellColorsSx, fullScreenBesideSidebar } from "@/components/ui/entryGrid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { periodLabel } from "../_shared/loanShared";
import type { LoanDialogProps } from "../_shared/LoanIndexPage";

/** Row of GET loan_change_fill (port of GetDataForLoanStop). */
interface FillRow {
  org_ecode: string;
  ecode: string;
  ename: string;
  loan_type: string;
  old_emi_cap: number;
  old_emi_int: number;
}

/** Stored payloanchange row (GET loan_change/{doc}). */
interface ChangeRow {
  LineID: number;
  Grade: string;
  OrgECode: string;
  ECode: string;
  EName: string;
  LoanType: string;
  PCode: string;
  ToDate: string;
  OldEMICapital: number;
  OldEMIInterest: number;
  EMICapital: number;
  EMIInterest: number;
  CapitalStop: string;
  InterestStop: string;
}

interface GridRow extends FillRow {
  emi_cap: string;
  emi_int: string;
  cap_stop: boolean;
  int_stop: boolean;
  modified: boolean;
}

const fromFill = (r: FillRow): GridRow => ({
  ...r,
  emi_cap: "0.00",
  emi_int: "0.00",
  cap_stop: false,
  int_stop: false,
  modified: false,
});

const cellSx = { border: "1px solid", py: 0.25, px: 0.75, whiteSpace: "nowrap" } as const;
const headSx = { ...cellSx, fontWeight: 600, backgroundColor: "action.hover", textAlign: "center" } as const;
const inputStyle: React.CSSProperties = {
  width: 80, textAlign: "right", border: 0, background: "transparent", font: "inherit", color: "inherit",
};

/** A row of GET loan_change_list (one per DocEntry). */
export interface LoanChangeDocRow {
  doc_entry: number;
  pcode: string;
  from_date: string;
  to_date: string;
  grade: string;
  loan_type: string;
  line_count: number;
  cap_stops: number;
  int_stops: number;
  created_date: string;
}

/**
 * Loan Stop / Change Bulk (legacy FrmLoanStopChangeBulk). Pick grade, loan type
 * and pay period, then Fill lists every open loan of that type with a balance
 * and its current EMI. Per row, one of: a new capital EMI, a new interest EMI,
 * a capital stop or an interest stop — setting one clears the others, as in
 * the legacy grid. The header "Capital Stop" / "Interest Stop" boxes stop every
 * row that has that EMI. Only modified rows are saved; a stop lasts for the
 * chosen period, an EMI change persists until changed again.
 */
export default function LoanChangeDialog({ open, row, onClose, onSaved, branchId, setup }: LoanDialogProps<LoanChangeDocRow>) {
  const docEntry = row?.doc_entry;
  const isEdit = docEntry !== undefined;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grade, setGrade] = useState("");
  const [loanType, setLoanType] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [rows, setRows] = useState<GridRow[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFilter("");
    if (docEntry === undefined) {
      setGrade("");
      setLoanType("");
      setPeriodId("");
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error: err } = await fetchWithCookie<{ data: ChangeRow[] }>(
        `${apiRoutesPortalMasters.LOAN_CHANGE_BY_ID}/${docEntry}?branch_id=${branchId}`,
        "GET",
      );
      if (cancelled) return;
      setLoading(false);
      if (err || !data?.data?.length) return setError(err || "Document not found");
      const first = data.data[0];
      setGrade(first.Grade);
      setLoanType(first.LoanType);
      const period = setup.periods.find((p) => p.code === first.PCode && p.to_date === first.ToDate);
      setPeriodId(period ? String(period.id) : "");
      // Legacy reload marks every row modified, so a re-save rewrites the whole document.
      setRows(
        data.data.map((r) => ({
          org_ecode: r.OrgECode,
          ecode: r.ECode,
          ename: r.EName,
          loan_type: r.LoanType,
          old_emi_cap: r.OldEMICapital,
          old_emi_int: r.OldEMIInterest,
          emi_cap: r.EMICapital.toFixed(2),
          emi_int: r.EMIInterest.toFixed(2),
          cap_stop: r.CapitalStop === "Y",
          int_stop: r.InterestStop === "Y",
          modified: true,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [open, docEntry, branchId, setup.periods]);

  const period = setup.periods.find((p) => String(p.id) === periodId);

  const handleFill = async () => {
    if (!periodId) return setError("Period can't be blank");
    if (!loanType) return setError("LoanType can't be blank");
    setLoading(true);
    const params = new URLSearchParams({
      branch_id: String(branchId),
      period_id: periodId,
      loan_type: loanType,
      grade,
    });
    const { data, error: err } = await fetchWithCookie<{ data: FillRow[] }>(
      `${apiRoutesPortalMasters.LOAN_CHANGE_FILL}?${params}`,
      "GET",
    );
    setLoading(false);
    if (err || !data) return setError(err || "Fill failed");
    setRows(data.data.map(fromFill));
    if (data.data.length === 0) setError("No open loans with a balance for this selection");
  };

  const patchRow = (index: number, patch: Partial<GridRow>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch, modified: true } : r)));

  /** Header bulk toggle: stop every row that has that EMI (unticking clears the stops). */
  const bulkStop = (kind: "cap" | "int", on: boolean) =>
    setRows((prev) =>
      prev.map((r) => {
        const hasEmi = kind === "cap" ? r.old_emi_cap > 0 : r.old_emi_int > 0;
        if (!hasEmi) return r;
        return on
          ? { ...r, emi_cap: "0.00", emi_int: "0.00", cap_stop: kind === "cap", int_stop: kind === "int", modified: true }
          : { ...r, cap_stop: kind === "cap" ? false : r.cap_stop, int_stop: kind === "int" ? false : r.int_stop };
      }),
    );

  const allCapStopped = rows.length > 0 && rows.every((r) => r.old_emi_cap <= 0 || r.cap_stop);
  const allIntStopped = rows.length > 0 && rows.every((r) => r.old_emi_int <= 0 || r.int_stop);

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return rows
      .map((r, index) => ({ r, index }))
      .filter(({ r }) => !f || r.ecode.toLowerCase().includes(f) || r.ename.toLowerCase().startsWith(f));
  }, [rows, filter]);

  const modifiedCount = rows.filter((r) => r.modified).length;

  const handleSave = async () => {
    if (!loanType) return setError("Please select Loan Type");
    if (!periodId) return setError("Please select Period");
    const lines = rows
      .map((r, i) => ({ ...r, line_id: i + 1 }))
      .filter((r) => r.modified)
      .map((r) => ({
        line_id: r.line_id,
        org_ecode: r.org_ecode,
        ecode: r.ecode,
        ename: r.ename,
        old_emi_cap: r.old_emi_cap,
        old_emi_int: r.old_emi_int,
        emi_cap: Number(r.emi_cap) || 0,
        emi_int: Number(r.emi_int) || 0,
        cap_stop: r.cap_stop,
        int_stop: r.int_stop,
      }));
    if (lines.length === 0) return setError("Sorry, no record to save");
    setSaving(true);
    const { data, error: err } = await fetchWithCookie<{ message: string; doc_entry: number }>(
      apiRoutesPortalMasters.LOAN_CHANGE_SAVE,
      "POST",
      { branch_id: branchId, doc_entry: docEntry ?? null, grade, loan_type: loanType, period_id: Number(periodId), lines },
    );
    setSaving(false);
    if (err || !data) return setError(err || "Save failed");
    onSaved(`${data.message} (Doc ${data.doc_entry}, ${lines.length} rows)`);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} {...fullScreenBesideSidebar}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" component="span">
            {isEdit ? `Loan Stop / Change Bulk — Doc ${docEntry}` : "Loan Stop / Change Bulk"}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", ...entryGridCellColorsSx }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 2fr auto auto auto" }, gap: 2, alignItems: "center" }}>
              <TextField select size="small" label="Grade" value={grade} disabled={isEdit}
                onChange={(e) => setGrade(e.target.value)}>
                <MenuItem value="">(All)</MenuItem>
                {setup.grades.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Loan Type" value={loanType} disabled={isEdit} required
                onChange={(e) => setLoanType(e.target.value)}>
                {setup.loan_types.map((t) => <MenuItem key={t.loan_name} value={t.loan_name}>{t.loan_name}</MenuItem>)}
                {isEdit && !setup.loan_types.some((t) => t.loan_name === loanType) && (
                  <MenuItem value={loanType}>{loanType}</MenuItem>
                )}
              </TextField>
              <TextField select size="small" label="Period" value={periodId} required
                onChange={(e) => setPeriodId(e.target.value)}
                helperText={period ? `Code ${period.code}` : " "}>
                {setup.periods.map((p) => <MenuItem key={p.id} value={String(p.id)}>{periodLabel(p)}</MenuItem>)}
              </TextField>
              <FormControlLabel label="Capital Stop" control={
                <Checkbox checked={allCapStopped} disabled={rows.length === 0}
                  onChange={(e) => bulkStop("cap", e.target.checked)} />} />
              <FormControlLabel label="Interest Stop" control={
                <Checkbox checked={allIntStopped} disabled={rows.length === 0}
                  onChange={(e) => bulkStop("int", e.target.checked)} />} />
              <Button variant="outlined" onClick={() => void handleFill()} disabled={isEdit || loading}>
                Fill
              </Button>
            </Box>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <TextField size="small" label="Find EB no / name" value={filter} onChange={(e) => setFilter(e.target.value)} />
              <Typography variant="body2" color="text.secondary">
                {rows.length} rows · {modifiedCount} modified
              </Typography>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}><CircularProgress /></Box>
            ) : (
              <TableContainer sx={{ flex: 1, overflow: "auto" }}>
                <Table size="small" stickyHeader sx={{ borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <TableHead>
                    <TableRow>
                      {["#", "Org. ECode", "ECode", "EName", "Loan Type", "PCode", "Old EMI Cap.", "Old EMI Int.",
                        "EMI Cap.", "EMI Int.", "Cap. Stop", "Int. Stop", "Modified"].map((h) => (
                        <TableCell key={h} sx={headSx}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visible.map(({ r, index }) => (
                      <TableRow key={`${r.ecode}-${index}`}>
                        <TableCell sx={cellSx}>{index + 1}</TableCell>
                        <TableCell sx={cellSx}>{r.org_ecode}</TableCell>
                        <TableCell sx={cellSx}>{r.ecode}</TableCell>
                        <TableCell sx={{ ...cellSx, minWidth: 180 }}>{r.ename}</TableCell>
                        <TableCell sx={cellSx}>{r.loan_type}</TableCell>
                        <TableCell sx={cellSx}>{period?.code ?? ""}</TableCell>
                        <TableCell align="right" sx={cellSx}>{r.old_emi_cap.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={cellSx}>{r.old_emi_int.toFixed(2)}</TableCell>
                        <TableCell sx={cellSx}>
                          <input type="number" min={0} style={inputStyle} value={r.emi_cap}
                            aria-label={`${r.ecode} new capital EMI`} disabled={r.old_emi_cap <= 0}
                            onChange={(e) => patchRow(index, { emi_cap: e.target.value, emi_int: "0.00", cap_stop: false, int_stop: false })} />
                        </TableCell>
                        <TableCell sx={cellSx}>
                          <input type="number" min={0} style={inputStyle} value={r.emi_int}
                            aria-label={`${r.ecode} new interest EMI`} disabled={r.old_emi_int <= 0}
                            onChange={(e) => patchRow(index, { emi_int: e.target.value, emi_cap: "0.00", cap_stop: false, int_stop: false })} />
                        </TableCell>
                        <TableCell align="center" sx={cellSx}>
                          <input type="checkbox" checked={r.cap_stop} aria-label={`${r.ecode} capital stop`}
                            onChange={(e) => patchRow(index, e.target.checked
                              ? { cap_stop: true, int_stop: false, emi_cap: "0.00", emi_int: "0.00" }
                              : { cap_stop: false })} />
                        </TableCell>
                        <TableCell align="center" sx={cellSx}>
                          <input type="checkbox" checked={r.int_stop} aria-label={`${r.ecode} interest stop`}
                            onChange={(e) => patchRow(index, e.target.checked
                              ? { int_stop: true, cap_stop: false, emi_cap: "0.00", emi_int: "0.00" }
                              : { int_stop: false })} />
                        </TableCell>
                        <TableCell align="center" sx={cellSx}>{r.modified ? "Y" : ""}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Button variant="contained" startIcon={<SaveIcon size={18} />} onClick={() => void handleSave()}
                disabled={saving || modifiedCount === 0}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button onClick={onClose}>Close</Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      <Snackbar open={error != null} autoHideDuration={5000} onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: "100%" }}>{error}</Alert>
      </Snackbar>
    </>
  );
}
