"use client";
import React, { useEffect, useState } from "react";
import {
  Alert,
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
import { periodLabel } from "../_shared/loanShared";

interface StopAllRow {
  pcode: string;
  pname: string | null;
  edate: string;
  reason: string;
  user_id: string;
  created_date: string;
}

const schema = z.object({
  period_id: z.coerce.number().int().positive("Select a period"),
  reason: z.string().trim().min(1, "Reason is required").max(2000),
});

const columns: GridColDef<StopAllRow>[] = [
  { field: "pcode", headerName: "PERIOD CODE", width: 130 },
  { field: "pname", headerName: "PERIOD", width: 130 },
  { field: "edate", headerName: "FNE DATE", width: 120 },
  { field: "reason", headerName: "REASON", flex: 1, minWidth: 240 },
  { field: "user_id", headerName: "USER", width: 110 },
  { field: "created_date", headerName: "CREATED", width: 180 },
];

/**
 * Loan Stop For ALL (legacy FrmLoanStopALL) — stops every loan deduction for
 * one wages (P) period, with a reason. Create-only, as in the legacy form.
 */
function StopAllDialog({ open, onClose, onSaved, branchId, setup }: LoanDialogProps<StopAllRow>) {
  const [periodId, setPeriodId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPeriodId("");
    setReason("");
    setError(null);
  }, [open]);

  const wagePeriods = setup.periods.filter((p) => p.code.toUpperCase().startsWith("P"));
  const period = wagePeriods.find((p) => String(p.id) === periodId);

  const handleSave = async () => {
    const parsed = schema.safeParse({ period_id: periodId, reason });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setSaving(true);
    const { data, error: err } = await fetchWithCookie<{ message: string }>(
      apiRoutesPortalMasters.LOAN_STOP_ALL_CREATE,
      "POST",
      { branch_id: branchId, ...parsed.data },
    );
    setSaving(false);
    if (err || !data) return setError(err || "Save failed");
    onSaved(data.message);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Loan Stop For ALL</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField select size="small" label="Period" value={periodId} required
          onChange={(e) => setPeriodId(e.target.value)}>
          {wagePeriods.map((p) => <MenuItem key={p.id} value={String(p.id)}>{periodLabel(p)}</MenuItem>)}
        </TextField>
        <TextField size="small" label="FNE Date" value={period?.to_date ?? ""} InputProps={{ readOnly: true }} />
        <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}
          multiline minRows={3} required inputProps={{ maxLength: 2000 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving || branchId == null}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function LoanStopAllPage() {
  return (
    <LoanIndexPage
      title="Loan Stop For ALL"
      listUrl={apiRoutesPortalMasters.LOAN_STOP_ALL_LIST}
      columns={columns}
      rowId={(r) => `${r.pcode}-${r.edate}-${r.created_date}`}
      createLabel="Stop All Loans"
      editable={false}
      Dialog={StopAllDialog}
    />
  );
}
