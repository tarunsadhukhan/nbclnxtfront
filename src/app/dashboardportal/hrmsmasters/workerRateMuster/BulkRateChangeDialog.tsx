"use client";

import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";
import { MuiForm } from "@/components/ui/muiform";
import type { Field, Schema } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayIso } from "@/components/reports/reportDates";
import { BULK_COLUMN_OPTIONS, BULK_OP_OPTIONS } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
}

/**
 * Bulk rate change — adjusts one rate column (e.g. DA RATE +105.58) for every
 * worker with an active rate in the selected company/branch. The backend
 * creates a new dated row per worker and deactivates the old one, so history
 * is kept exactly as with a manual re-entry.
 */
export default function BulkRateChangeDialog({ open, onClose, onSaved }: Props) {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const schema = useMemo<Schema>(
    () => ({
      fields: [
        {
          name: "column",
          label: "Column to change",
          type: "select",
          options: [...BULK_COLUMN_OPTIONS],
          required: true,
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "op",
          label: "Operation",
          type: "select",
          options: [...BULK_OP_OPTIONS],
          required: true,
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "value",
          label: "Value",
          type: "number",
          required: true,
          helperText: "Amount to increase/decrease by, or the exact value to set",
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "effective_date",
          label: "Effective From",
          type: "date",
          required: true,
          grid: { xs: 12, sm: 6 },
        },
      ] satisfies Field[],
    }),
    [],
  );

  const initialValues = useMemo(
    () => ({ column: "da_rate", op: "increase", value: "", effective_date: todayIso() }),
    [],
  );

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (coId == null) return;
    setSaving(true);
    try {
      // Increase/decrease are one backend op ('add'): the sign carries the
      // direction, so the user always types a positive amount.
      const amount = Math.abs(Number(values.value));
      const { data, error } = await fetchWithCookie<{
        message: string;
        updated: number;
      }>(apiRoutesPortalMasters.WORKER_RATE_BULK, "POST", {
        column: values.column,
        op: values.op === "set" ? "set" : "add",
        value: values.op === "decrease" ? -amount : amount,
        effective_date: values.effective_date,
        co_id: coId,
        branch_id: branchId ?? null,
      });
      if (error || !data) throw new Error(error || "Bulk update failed");

      onSaved?.(data.message);
      onClose();
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Bulk update failed",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 1,
          }}
        >
          <Typography variant="h6" component="span">
            Bulk Rate Change
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Applies to every worker with an active rate in the selected
            company/branch. Each worker gets a new dated rate row; the current
            one becomes inactive. DA RATE changes only affect workers with DA
            Allowed = Y.
          </Alert>
          <Box sx={{ pt: 0.5 }}>
            <MuiForm
              schema={schema}
              mode="create"
              initialValues={initialValues}
              onSubmit={handleSubmit}
              submitLabel={saving ? "Applying..." : "Apply to all"}
              cancelLabel="Cancel"
              onCancel={onClose}
              hideModeToggle
            />
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
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
    </>
  );
}
