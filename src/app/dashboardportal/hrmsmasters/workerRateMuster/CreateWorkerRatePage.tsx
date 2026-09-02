"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";
import { MuiForm } from "@/components/ui/muiform";
import type { Field, MuiFormMode, Schema } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayIso } from "@/components/reports/reportDates";
import { FLAG_FIELDS } from "./types";
import type { Option, WorkerRateRecord, WorkerRateSetup } from "./types";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];

const FLAG_LABELS: Record<(typeof FLAG_FIELDS)[number], string> = {
  da_all: "DA Allowed",
  hra: "HRA",
  hrd: "HRD",
  quarter: "Quarter",
  pf: "PF",
  esi: "ESI",
  ptax: "P.Tax",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  editId?: number;
  /** Prefill from this record but save as a NEW rate (effective from today). */
  cloneId?: number;
}

/**
 * Create / edit / clone dialog for a Worker Rate Muster row. ECODE is a
 * `select` field (searchable Autocomplete — the employee list runs to
 * thousands per branch). The Y/N muster flags are checkboxes, mapped to
 * 'Y'/'N' on save. Creating (or cloning) deactivates the worker's previous
 * active rate row on the backend, keeping it as history.
 */
export default function CreateWorkerRatePage({
  open,
  onClose,
  onSaved,
  editId,
  cloneId,
}: Props) {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<MuiFormMode>("create");
  const [formKey, setFormKey] = useState(0);
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [employees, setEmployees] = useState<Option[]>(EMPTY_OPTIONS);
  // The loaded record's worker: eb_id for the edit payload (ECODE is locked
  // there) and a label/fallback option in case the worker is inactive and so
  // absent from the employee dropdown.
  const [sourceEmp, setSourceEmp] = useState<{ ebId: string; label: string } | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const notifyError = useCallback(
    (message: string) => setSnackbar({ open: true, message, severity: "error" }),
    [],
  );

  // Employee options, refreshed whenever the dialog opens for a new branch.
  useEffect(() => {
    if (!open || coId == null) return;
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ co_id: String(coId) });
      if (branchId != null) params.append("branch_id", String(branchId));
      const { data, error } = await fetchWithCookie<{ data: WorkerRateSetup }>(
        `${apiRoutesPortalMasters.WORKER_RATE_SETUP}?${params}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data) {
        notifyError(error || "Failed to load employee options");
        return;
      }
      setEmployees(data.data?.employees ?? EMPTY_OPTIONS);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, coId, branchId, notifyError]);

  const loadRecord = useCallback(async () => {
    const sourceId = editId ?? cloneId;
    if (sourceId === undefined) {
      setSourceEmp(null);
      setInitialValues({
        eb_id: "",
        effective_date: todayIso(),
        fbasic: "",
        fbasic_hr: "",
        da_rate: "",
        ...Object.fromEntries(FLAG_FIELDS.map((f) => [f, false])),
      });
      setFormKey((k) => k + 1);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchWithCookie<{ data: WorkerRateRecord }>(
        `${apiRoutesPortalMasters.WORKER_RATE_BY_ID}/${sourceId}`,
        "GET",
      );
      if (error || !data) throw new Error(error || "Failed to load worker rate");
      const rec = data.data;
      const label = `${rec.emp_code ?? rec.eb_id} - ${rec.emp_name ?? ""}`.trim();
      setSourceEmp({ ebId: String(rec.eb_id), label });
      setInitialValues({
        eb_id: String(rec.eb_id),
        emp_display: label,
        // A clone is a new version, so it takes effect today, not on the
        // source row's date.
        effective_date:
          editId !== undefined ? (rec.effective_date ?? "") : todayIso(),
        fbasic: rec.fbasic ?? "",
        fbasic_hr: rec.fbasic_hr ?? "",
        da_rate: rec.da_rate ?? "",
        ...Object.fromEntries(FLAG_FIELDS.map((f) => [f, rec[f] === "Y"])),
      });
      setFormKey((k) => k + 1);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error loading worker rate");
    } finally {
      setLoading(false);
    }
  }, [editId, cloneId, notifyError]);

  useEffect(() => {
    if (open) {
      setMode(editId !== undefined ? "edit" : "create");
      void loadRecord();
    } else {
      setInitialValues({});
      setFormKey(0);
    }
  }, [open, editId, loadRecord]);

  // Inactive workers are excluded from the dropdown; keep the source record's
  // worker selectable (and its label visible) by prepending it when missing.
  const employeeOptions = useMemo<Option[]>(() => {
    if (!sourceEmp || employees.some((e) => e.value === sourceEmp.ebId)) {
      return employees;
    }
    return [{ value: sourceEmp.ebId, label: sourceEmp.label }, ...employees];
  }, [employees, sourceEmp]);

  const isEdit = editId !== undefined;

  const schema = useMemo<Schema>(
    () => ({
      fields: [
        // ECODE is locked once a rate row exists — editing changes the rates,
        // never the worker. Clone/create keep the searchable select.
        isEdit
          ? {
              name: "emp_display",
              label: "ECODE / Employee",
              type: "text" as const,
              readOnly: true,
              grid: { xs: 12, sm: 8 },
            }
          : {
              name: "eb_id",
              label: "ECODE / Employee",
              type: "select" as const,
              options: employeeOptions,
              required: true,
              grid: { xs: 12, sm: 8 },
            },
        {
          name: "effective_date",
          label: "Effective From",
          type: "date",
          required: true,
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "fbasic",
          label: "FBASIC",
          type: "number",
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "fbasic_hr",
          label: "FBASIC HR",
          type: "number",
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "da_rate",
          label: "DA RATE",
          type: "number",
          grid: { xs: 12, sm: 4 },
        },
        ...FLAG_FIELDS.map((f) => ({
          name: f,
          label: FLAG_LABELS[f],
          type: "checkbox" as const,
          grid: { xs: 6, sm: 3 },
        })),
      ] satisfies Field[],
    }),
    [employeeOptions, isEdit],
  );

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const payload = {
        // In edit mode the form has no eb_id field (ECODE is locked) — the
        // loaded record's worker is sent back unchanged.
        eb_id: editId !== undefined ? sourceEmp?.ebId : values.eb_id,
        effective_date: values.effective_date,
        fbasic: values.fbasic === "" ? null : values.fbasic,
        fbasic_hr: values.fbasic_hr === "" ? null : values.fbasic_hr,
        da_rate: values.da_rate === "" ? null : values.da_rate,
        ...Object.fromEntries(FLAG_FIELDS.map((f) => [f, values[f] ? "Y" : "N"])),
      };
      const isEdit = editId !== undefined;
      const { error } = await fetchWithCookie(
        isEdit
          ? `${apiRoutesPortalMasters.WORKER_RATE_EDIT}/${editId}`
          : apiRoutesPortalMasters.WORKER_RATE_CREATE,
        isEdit ? "PUT" : "POST",
        payload,
      );
      if (error) throw new Error(error);

      onSaved?.(
        isEdit ? "Worker rate updated successfully" : "Worker rate created successfully",
      );
      onClose();
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title =
    editId !== undefined
      ? "Edit Worker Rate"
      : cloneId !== undefined
        ? "Clone Worker Rate"
        : "Create Worker Rate";

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
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
            {title}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ pt: 1 }}>
              <MuiForm
                key={formKey}
                schema={schema}
                mode={mode}
                initialValues={initialValues}
                onSubmit={handleSubmit}
                submitLabel={saving ? "Saving..." : "Save"}
                cancelLabel="Cancel"
                onCancel={onClose}
                hideModeToggle
              />
            </Box>
          )}
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
