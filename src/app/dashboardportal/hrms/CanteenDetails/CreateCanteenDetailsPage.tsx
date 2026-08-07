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
import type { CanteenRecord, CanteenSetup, Option } from "./types";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];

/**
 * Shown until `canteen_setup` reports the real rate. Display only — the
 * backend decides what is actually stored, so a stale value here is cosmetic
 * and never a reason to hold the form back.
 */
const FALLBACK_RATE = 40;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  editId?: number;
  /** Approved rows are locked — the dialog opens read-only for them. */
  readOnly?: boolean;
}

/**
 * Create / edit dialog for a canteen entry. EB No is a `select`, which MuiForm
 * renders as a searchable Autocomplete — the employee list runs to a few
 * thousand rows per branch, so typing to filter is the only practical way to
 * pick one. Branch comes from the sidebar selection, not from the form, and
 * the meal rate is fixed by the canteen so it is shown but never editable.
 */
export default function CreateCanteenDetailsPage({
  open,
  onClose,
  onSaved,
  editId,
  readOnly = false,
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
  const [defaultRate, setDefaultRate] = useState<number>(FALLBACK_RATE);
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
      const { data, error } = await fetchWithCookie<{ data: CanteenSetup }>(
        `${apiRoutesPortalMasters.CANTEEN_SETUP}?${params}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data) {
        notifyError(error || "Failed to load employees");
        return;
      }
      setEmployees(data.data?.employees ?? EMPTY_OPTIONS);
      setDefaultRate(data.data?.default_rate ?? FALLBACK_RATE);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, coId, branchId, notifyError]);

  const loadRecord = useCallback(async () => {
    if (editId === undefined) {
      setInitialValues({
        tran_date: todayIso(),
        eb_id: "",
        no_of_meals: "",
        rate_of_meals: defaultRate,
      });
      setFormKey((k) => k + 1);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchWithCookie<{ data: CanteenRecord }>(
        `${apiRoutesPortalMasters.CANTEEN_BY_ID}/${editId}`,
        "GET",
      );
      if (error || !data) throw new Error(error || "Failed to load canteen entry");
      const rec = data.data;
      setInitialValues({
        tran_date: rec.tran_date ?? "",
        eb_id: rec.eb_id != null ? String(rec.eb_id) : "",
        no_of_meals: rec.no_of_meals ?? "",
        rate_of_meals: rec.rate_of_meals ?? defaultRate,
      });
      setFormKey((k) => k + 1);
    } catch (err: unknown) {
      notifyError(
        err instanceof Error ? err.message : "Error loading canteen entry",
      );
    } finally {
      setLoading(false);
    }
  }, [editId, defaultRate, notifyError]);

  useEffect(() => {
    if (open) {
      setMode(readOnly ? "view" : editId !== undefined ? "edit" : "create");
      void loadRecord();
    } else {
      setInitialValues({});
      setFormKey(0);
    }
  }, [open, editId, readOnly, loadRecord]);

  const schema = useMemo<Schema>(
    () => ({
      fields: [
        {
          name: "tran_date",
          label: "Date",
          type: "date",
          required: true,
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "eb_id",
          label: "EB No",
          type: "select",
          options: employees,
          required: true,
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "no_of_meals",
          label: "No. of Meals",
          type: "number",
          required: true,
          grid: { xs: 12, sm: 6 },
        },
        {
          // Fixed by the canteen — shown for context, never user input. The
          // backend ignores whatever the client sends for it.
          name: "rate_of_meals",
          label: "Rate of Meals",
          type: "number",
          disabled: true,
          grid: { xs: 12, sm: 6 },
        },
      ] satisfies Field[],
    }),
    [employees],
  );

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (branchId == null) {
      notifyError("Select a branch in the sidebar before saving");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        branch_id: branchId,
        tran_date: values.tran_date,
        eb_id: values.eb_id,
        no_of_meals: values.no_of_meals,
      };
      const isEdit = editId !== undefined;
      const { error } = await fetchWithCookie(
        isEdit
          ? `${apiRoutesPortalMasters.CANTEEN_EDIT}/${editId}`
          : apiRoutesPortalMasters.CANTEEN_CREATE,
        isEdit ? "PUT" : "POST",
        payload,
      );
      if (error) throw new Error(error);

      onSaved?.(
        isEdit
          ? "Canteen entry updated successfully"
          : "Canteen entry created successfully",
      );
      onClose();
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title = readOnly
    ? "Canteen Entry"
    : editId !== undefined
      ? "Edit Canteen Entry"
      : "Create Canteen Entry";

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
