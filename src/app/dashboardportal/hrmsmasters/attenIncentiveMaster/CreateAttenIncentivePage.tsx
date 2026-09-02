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
import type { AttenIncentiveRecord, AttenIncentiveSetup, Option } from "./types";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];

const DEFAULT_ELIGIBILITY_HRS = 96;
const DEFAULT_WORKING_INCLUDES = "WK HRS+NS HRS+HOLIDAY HRS+LEAVE HRS";
const DEFAULT_CALC_ON = "WK HRS+NS HRS";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  editId?: number;
}

/**
 * Create / edit dialog for an Attendance Incentive rule. One rule per
 * employee category; the per-hour rate is computed by the database
 * (amount / per hrs), so the form only collects the inputs of the formula.
 */
export default function CreateAttenIncentivePage({ open, onClose, onSaved, editId }: Props) {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<MuiFormMode>("create");
  const [formKey, setFormKey] = useState(0);
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [categories, setCategories] = useState<Option[]>(EMPTY_OPTIONS);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const notifyError = useCallback(
    (message: string) => setSnackbar({ open: true, message, severity: "error" }),
    [],
  );

  // Category options, refreshed whenever the dialog opens for a new branch.
  useEffect(() => {
    if (!open || coId == null) return;
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ co_id: String(coId) });
      if (branchId != null) params.append("branch_id", String(branchId));
      const { data, error } = await fetchWithCookie<{ data: AttenIncentiveSetup }>(
        `${apiRoutesPortalMasters.ATTEN_INCENTIVE_SETUP}?${params}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data) {
        notifyError(error || "Failed to load category options");
        return;
      }
      setCategories(data.data?.categories ?? EMPTY_OPTIONS);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, coId, branchId, notifyError]);

  const loadRecord = useCallback(async () => {
    if (editId === undefined) {
      setInitialValues({
        cata_id: "",
        amount: "",
        per_hrs: 8,
        eligibility_hrs: DEFAULT_ELIGIBILITY_HRS,
        working_includes: DEFAULT_WORKING_INCLUDES,
        calc_on: DEFAULT_CALC_ON,
        remarks: "",
      });
      setFormKey((k) => k + 1);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchWithCookie<{ data: AttenIncentiveRecord }>(
        `${apiRoutesPortalMasters.ATTEN_INCENTIVE_BY_ID}/${editId}`,
        "GET",
      );
      if (error || !data) throw new Error(error || "Failed to load incentive rule");
      const rec = data.data;
      setInitialValues({
        cata_id: String(rec.cata_id),
        amount: rec.amount ?? "",
        per_hrs: rec.per_hrs ?? 8,
        eligibility_hrs: rec.eligibility_hrs ?? DEFAULT_ELIGIBILITY_HRS,
        working_includes: rec.working_includes ?? DEFAULT_WORKING_INCLUDES,
        calc_on: rec.calc_on ?? DEFAULT_CALC_ON,
        remarks: rec.remarks ?? "",
      });
      setFormKey((k) => k + 1);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error loading incentive rule");
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
        cata_id: values.cata_id,
        amount: values.amount,
        per_hrs: values.per_hrs,
        eligibility_hrs: values.eligibility_hrs,
        working_includes: values.working_includes,
        calc_on: values.calc_on,
        remarks: values.remarks || null,
      };
      const isEdit = editId !== undefined;
      const { error } = await fetchWithCookie(
        isEdit
          ? `${apiRoutesPortalMasters.ATTEN_INCENTIVE_EDIT}/${editId}`
          : apiRoutesPortalMasters.ATTEN_INCENTIVE_CREATE,
        isEdit ? "PUT" : "POST",
        payload,
      );
      if (error) throw new Error(error);

      onSaved?.(
        isEdit
          ? "Attendance incentive rule updated successfully"
          : "Attendance incentive rule created successfully",
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
          name: "cata_id",
          label: "Employee Category",
          type: "select",
          options: categories,
          required: true,
          grid: { xs: 12 },
        },
        {
          name: "amount",
          label: "Incentive Amount (Rs.)",
          type: "number",
          required: true,
          helperText: "e.g. 1 for workers, 20 for staff categories",
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "per_hrs",
          label: "Per Hours",
          type: "number",
          required: true,
          helperText: "Hours the amount is paid per (e.g. 8)",
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "eligibility_hrs",
          label: "Eligibility Hours (F/E)",
          type: "number",
          helperText: "Hours needed in the fortnight (e.g. 96)",
          grid: { xs: 12, sm: 4 },
        },
        {
          name: "working_includes",
          label: "Working Includes",
          type: "text",
          helperText: "Hour buckets counted toward eligibility",
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "calc_on",
          label: "To Be Calculated On",
          type: "text",
          helperText: "Hour buckets the incentive is paid on",
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "remarks",
          label: "Remarks",
          type: "text",
          placeholder: "e.g. RS. 1/- PER 8 HRS",
          grid: { xs: 12 },
        },
      ] satisfies Field[],
    }),
    [categories],
  );

  const title =
    editId !== undefined ? "Edit Attendance Incentive" : "Create Attendance Incentive";

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
