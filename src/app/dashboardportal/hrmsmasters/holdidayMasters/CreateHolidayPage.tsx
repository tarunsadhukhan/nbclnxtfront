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
import { HOLIDAY_TYPE_OPTIONS, type HolidayRecord } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  editId?: number;
}

const BLANK = Object.freeze({
  holiday: "",
  holiday_date: "",
  holiday_type: "1",
  period_start_date: "",
  period_end_date: "",
});

/** Create / edit dialog for a holiday on the sidebar-selected branch. */
export default function CreateHolidayPage({ open, onClose, onSaved, editId }: Props) {
  const { selectedBranches } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<MuiFormMode>("create");
  const [formKey, setFormKey] = useState(0);
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const notifyError = useCallback(
    (message: string) => setSnackbar({ open: true, message, severity: "error" }),
    [],
  );

  const loadRecord = useCallback(async () => {
    if (editId === undefined) {
      setInitialValues({ ...BLANK });
      setFormKey((k) => k + 1);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchWithCookie<{ data: HolidayRecord }>(
        `${apiRoutesPortalMasters.HOLIDAY_BY_ID}/${editId}`,
        "GET",
      );
      if (error || !data) throw new Error(error || "Failed to load holiday");
      const rec = data.data;
      setInitialValues({
        holiday: rec.holiday ?? "",
        holiday_date: rec.holiday_date ?? "",
        holiday_type: rec.holiday_type != null ? String(rec.holiday_type) : "1",
        period_start_date: rec.period_start_date ?? "",
        period_end_date: rec.period_end_date ?? "",
      });
      setFormKey((k) => k + 1);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error loading holiday");
    } finally {
      setLoading(false);
    }
  }, [editId, notifyError]);

  useEffect(() => {
    if (open) {
      setMode(editId !== undefined ? "edit" : "create");
      void loadRecord();
    } else {
      setInitialValues({});
      setFormKey(0);
    }
  }, [open, editId, loadRecord]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const payload = {
        branch_id: branchId ?? null,
        holiday: values.holiday,
        holiday_date: values.holiday_date,
        holiday_type: values.holiday_type,
        period_start_date: values.period_start_date || null,
        period_end_date: values.period_end_date || null,
      };
      const isEdit = editId !== undefined;
      const { error } = await fetchWithCookie(
        isEdit
          ? `${apiRoutesPortalMasters.HOLIDAY_EDIT}/${editId}`
          : apiRoutesPortalMasters.HOLIDAY_CREATE,
        isEdit ? "PUT" : "POST",
        payload,
      );
      if (error) throw new Error(error);

      onSaved?.(isEdit ? "Holiday updated successfully" : "Holiday created successfully");
      onClose();
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const schema = useMemo<Schema>(
    () => ({
      fields: [
        {
          name: "holiday",
          label: "Holiday",
          type: "text",
          required: true,
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "holiday_date",
          label: "Holiday Date",
          type: "date",
          required: true,
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "holiday_type",
          label: "Holiday Type",
          type: "select",
          options: [...HOLIDAY_TYPE_OPTIONS],
          required: true,
          grid: { xs: 12, sm: 6 },
        },
        { name: "period_start_date", label: "Period Start", type: "date", grid: { xs: 12, sm: 6 } },
        { name: "period_end_date", label: "Period End", type: "date", grid: { xs: 12, sm: 6 } },
      ] satisfies Field[],
    }),
    [],
  );

  const title = editId !== undefined ? "Edit Holiday" : "Create Holiday";

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
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}
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
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
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
