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
import type { WindingIncentiveRecord } from "./types";

const DEFAULT_ELIGIBILITY_HRS = 96;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  editId?: number;
}

/**
 * Create / edit dialog for a Winding Incentive scheme row. The per-hour rate
 * is computed by the database (incentive amount / eligibility hours), so the
 * form only collects the inputs of the formula plus the optional grist range
 * and production slab for weft qualities.
 */
export default function CreateWindingIncentivePage({ open, onClose, onSaved, editId }: Props) {
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
      setInitialValues({
        quality_code: "",
        quality_name: "",
        inc_code: "",
        grist_from: "",
        grist_to: "",
        prod_from: "",
        prod_to: "",
        incentive_amt: "",
        eligibility_hrs: DEFAULT_ELIGIBILITY_HRS,
        unit: "KG",
        remarks: "",
      });
      setFormKey((k) => k + 1);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchWithCookie<{ data: WindingIncentiveRecord }>(
        `${apiRoutesPortalMasters.WINDING_INCENTIVE_BY_ID}/${editId}`,
        "GET",
      );
      if (error || !data) throw new Error(error || "Failed to load incentive row");
      const rec = data.data;
      setInitialValues({
        quality_code: rec.quality_code ?? "",
        quality_name: rec.quality_name ?? "",
        inc_code: rec.inc_code ?? "",
        grist_from: rec.grist_from ?? "",
        grist_to: rec.grist_to ?? "",
        prod_from: rec.prod_from ?? "",
        prod_to: rec.prod_to ?? "",
        incentive_amt: rec.incentive_amt ?? "",
        eligibility_hrs: rec.eligibility_hrs ?? DEFAULT_ELIGIBILITY_HRS,
        unit: rec.unit ?? "KG",
        remarks: rec.remarks ?? "",
      });
      setFormKey((k) => k + 1);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error loading incentive row");
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
        quality_code: values.quality_code,
        quality_name: values.quality_name,
        inc_code: values.inc_code || null,
        grist_from: values.grist_from === "" ? null : values.grist_from,
        grist_to: values.grist_to === "" ? null : values.grist_to,
        prod_from: values.prod_from === "" ? null : values.prod_from,
        prod_to: values.prod_to === "" ? null : values.prod_to,
        incentive_amt: values.incentive_amt,
        eligibility_hrs: values.eligibility_hrs,
        unit: values.unit || "KG",
        remarks: values.remarks || null,
      };
      const isEdit = editId !== undefined;
      const { error } = await fetchWithCookie(
        isEdit
          ? `${apiRoutesPortalMasters.WINDING_INCENTIVE_EDIT}/${editId}`
          : apiRoutesPortalMasters.WINDING_INCENTIVE_CREATE,
        isEdit ? "PUT" : "POST",
        payload,
      );
      if (error) throw new Error(error);

      onSaved?.(
        isEdit
          ? "Winding incentive row updated successfully"
          : "Winding incentive row created successfully",
      );
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
          name: "quality_code",
          label: "Quality Code",
          type: "text",
          required: true,
          placeholder: "e.g. 02",
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "quality_name",
          label: "Quality Name",
          type: "text",
          required: true,
          placeholder: "e.g. SACKING WARP",
          grid: { xs: 12, sm: 8 },
        },
        {
          name: "inc_code",
          label: "Incentive Code",
          type: "text",
          helperText: "Scheme code from the incentive sheet (e.g. 13)",
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "incentive_amt",
          label: "Incentive Amount (Rs.)",
          type: "number",
          required: true,
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "eligibility_hrs",
          label: "For Hours",
          type: "number",
          helperText: "Rate/hr = amount / hours (e.g. 96)",
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "grist_from",
          label: "Grist From",
          type: "number",
          helperText: "Optional grist range",
          grid: { xs: 12, sm: 3 },
        },
        {
          name: "grist_to",
          label: "Grist To",
          type: "number",
          grid: { xs: 12, sm: 3 },
        },
        {
          name: "prod_from",
          label: "Prod Slab From",
          type: "number",
          helperText: "Optional bundles / 8 hrs slab",
          grid: { xs: 12, sm: 3 },
        },
        {
          name: "prod_to",
          label: "Prod Slab To",
          type: "number",
          helperText: "Blank = & above",
          grid: { xs: 12, sm: 3 },
        },
        {
          name: "unit",
          label: "Unit",
          type: "text",
          helperText: "Production unit (e.g. KG)",
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "remarks",
          label: "Remarks",
          type: "text",
          placeholder: "e.g. Rs. 40/- for 96 hrs",
          grid: { xs: 12, sm: 8 },
        },
      ] satisfies Field[],
    }),
    [],
  );

  const title =
    editId !== undefined ? "Edit Winding Incentive" : "Create Winding Incentive";

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
