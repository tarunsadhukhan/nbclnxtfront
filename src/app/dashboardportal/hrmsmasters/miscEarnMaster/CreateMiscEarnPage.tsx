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
import type { DesignationOption, MiscEarnRecord, MiscEarnSetup, Option } from "./types";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];
const EMPTY_DESIGNATIONS: DesignationOption[] = Object.freeze(
  [],
) as unknown as DesignationOption[];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  editId?: number;
}

/**
 * Create / edit dialog for a Misc Earn / Extra Allowance rule. Occupation
 * (designation) cascades from the chosen department; the per-hour rate is
 * computed by the database (amount / per hrs * rate % / 100), so the form
 * only collects the three inputs of the formula.
 */
export default function CreateMiscEarnPage({ open, onClose, onSaved, editId }: Props) {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<MuiFormMode>("create");
  const [formKey, setFormKey] = useState(0);
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [depts, setDepts] = useState<Option[]>(EMPTY_OPTIONS);
  const [designations, setDesignations] = useState<DesignationOption[]>(EMPTY_DESIGNATIONS);
  const [categories, setCategories] = useState<Option[]>(EMPTY_OPTIONS);
  const [earnTypes, setEarnTypes] = useState<Option[]>(EMPTY_OPTIONS);
  const [deptId, setDeptId] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const notifyError = useCallback(
    (message: string) => setSnackbar({ open: true, message, severity: "error" }),
    [],
  );

  // Dropdown options, refreshed whenever the dialog opens for a new branch.
  useEffect(() => {
    if (!open || coId == null) return;
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ co_id: String(coId) });
      if (branchId != null) params.append("branch_id", String(branchId));
      const { data, error } = await fetchWithCookie<{ data: MiscEarnSetup }>(
        `${apiRoutesPortalMasters.MISC_EARN_SETUP}?${params}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data) {
        notifyError(error || "Failed to load dropdown options");
        return;
      }
      setDepts(data.data?.depts ?? EMPTY_OPTIONS);
      setDesignations(data.data?.designations ?? EMPTY_DESIGNATIONS);
      setCategories(data.data?.categories ?? EMPTY_OPTIONS);
      setEarnTypes(data.data?.earn_types ?? EMPTY_OPTIONS);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, coId, branchId, notifyError]);

  const loadRecord = useCallback(async () => {
    if (editId === undefined) {
      setDeptId("");
      setInitialValues({
        dept_id: "",
        designation_id: "",
        cata_id: "",
        earn_type: "",
        amount: "",
        per_hrs: "",
        rate_pct: 100,
        remarks: "",
      });
      setFormKey((k) => k + 1);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchWithCookie<{ data: MiscEarnRecord }>(
        `${apiRoutesPortalMasters.MISC_EARN_BY_ID}/${editId}`,
        "GET",
      );
      if (error || !data) throw new Error(error || "Failed to load misc earn rule");
      const rec = data.data;
      setDeptId(String(rec.dept_id));
      setInitialValues({
        dept_id: String(rec.dept_id),
        designation_id: rec.designation_id != null ? String(rec.designation_id) : "",
        cata_id: rec.cata_id != null ? String(rec.cata_id) : "",
        earn_type: rec.earn_type,
        amount: rec.amount ?? "",
        per_hrs: rec.per_hrs ?? "",
        rate_pct: rec.rate_pct ?? 100,
        remarks: rec.remarks ?? "",
      });
      setFormKey((k) => k + 1);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error loading misc earn rule");
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

  // Occupation options cascade from the selected department.
  const designationOptions = useMemo<Option[]>(
    () =>
      deptId
        ? designations.filter((d) => String(d.dept_id) === deptId)
        : designations,
    [designations, deptId],
  );

  // Changing the department resets an occupation that no longer belongs to it.
  const handleValuesChange = useCallback(
    (values: Record<string, unknown>) => {
      const next = typeof values.dept_id === "string" ? values.dept_id : "";
      if (next === deptId) return;
      setDeptId(next);
      const desig = values.designation_id;
      if (
        typeof desig === "string" &&
        desig &&
        !designations.some((d) => d.value === desig && String(d.dept_id) === next)
      ) {
        setInitialValues({ ...values, designation_id: "" });
        setFormKey((k) => k + 1);
      }
    },
    [deptId, designations],
  );

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const payload = {
        branch_id: branchId ?? null,
        dept_id: values.dept_id,
        designation_id: values.designation_id || null,
        cata_id: values.cata_id || null,
        earn_type: values.earn_type,
        amount: values.amount,
        per_hrs: values.per_hrs,
        rate_pct: values.rate_pct === "" ? 100 : values.rate_pct,
        remarks: values.remarks || null,
      };
      const isEdit = editId !== undefined;
      const { error } = await fetchWithCookie(
        isEdit
          ? `${apiRoutesPortalMasters.MISC_EARN_EDIT}/${editId}`
          : apiRoutesPortalMasters.MISC_EARN_CREATE,
        isEdit ? "PUT" : "POST",
        payload,
      );
      if (error) throw new Error(error);

      onSaved?.(
        isEdit ? "Misc earn rule updated successfully" : "Misc earn rule created successfully",
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
          name: "dept_id",
          label: "Department",
          type: "select",
          options: depts,
          required: true,
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "designation_id",
          label: "Occupation / Designation",
          type: "select",
          options: designationOptions,
          helperText: "Leave blank to apply to the whole department",
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "cata_id",
          label: "Employee Category",
          type: "select",
          options: categories,
          helperText: "Leave blank for all categories (e.g. beam changes = CAT-7 only)",
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "earn_type",
          label: "Allowance Type",
          type: "select",
          options: earnTypes,
          required: true,
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "amount",
          label: "Amount (Rs.)",
          type: "number",
          required: true,
          helperText: "For beam changes: the total value",
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "per_hrs",
          label: "Per Hours",
          type: "number",
          required: true,
          helperText: "Hours the amount is paid per (e.g. 96, 8, 104)",
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "rate_pct",
          label: "Rate %",
          type: "number",
          helperText: "100 = full rate; beam changes pay 60%",
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "remarks",
          label: "Remarks",
          type: "text",
          placeholder: "e.g. RS. 75/- PER 96 HRS",
          grid: { xs: 12 },
        },
      ] satisfies Field[],
    }),
    [depts, designationOptions, categories, earnTypes],
  );

  const title = editId !== undefined ? "Edit Misc Earn Rule" : "Create Misc Earn Rule";

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
                onValuesChange={handleValuesChange}
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
