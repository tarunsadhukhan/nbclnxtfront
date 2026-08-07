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
import type {
  DailyRateRecord,
  DailyRateSetup,
  EmployeeOption,
  Option,
} from "./types";

const EMPTY_OPTIONS: Option[] = Object.freeze([]) as unknown as Option[];
const EMPTY_EMPLOYEES: EmployeeOption[] = Object.freeze(
  [],
) as unknown as EmployeeOption[];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (message: string) => void;
  editId?: number;
}

/**
 * Create / edit dialog for a Cash / Daily Rate entry. EB No and Designation are
 * `select` fields, which MuiForm renders as searchable Autocompletes — the
 * employee list runs to a few thousand rows per branch, so typing to filter is
 * the only practical way to pick one.
 */
export default function CreateDailyRateEntryPage({
  open,
  onClose,
  onSaved,
  editId,
}: Props) {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<MuiFormMode>("create");
  const [formKey, setFormKey] = useState(0);
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [employees, setEmployees] = useState<EmployeeOption[]>(EMPTY_EMPLOYEES);
  const [designations, setDesignations] = useState<Option[]>(EMPTY_OPTIONS);
  const [shifts, setShifts] = useState<Option[]>(EMPTY_OPTIONS);
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
      const { data, error } = await fetchWithCookie<{ data: DailyRateSetup }>(
        `${apiRoutesPortalMasters.DAILY_RATE_SETUP}?${params}`,
        "GET",
      );
      if (cancelled) return;
      if (error || !data) {
        notifyError(error || "Failed to load dropdown options");
        return;
      }
      setEmployees(data.data?.employees ?? EMPTY_EMPLOYEES);
      setDesignations(data.data?.designations ?? EMPTY_OPTIONS);
      setShifts(data.data?.shifts ?? EMPTY_OPTIONS);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, coId, branchId, notifyError]);

  const loadRecord = useCallback(async () => {
    if (editId === undefined) {
      setInitialValues({
        eb_id: "",
        desig_id: "",
        app_date: todayIso(),
        app_shift: "",
        rate_approve: "",
      });
      setFormKey((k) => k + 1);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await fetchWithCookie<{ data: DailyRateRecord }>(
        `${apiRoutesPortalMasters.DAILY_RATE_BY_ID}/${editId}`,
        "GET",
      );
      if (error || !data) throw new Error(error || "Failed to load rate entry");
      const rec = data.data;
      setInitialValues({
        eb_id: rec.eb_id != null ? String(rec.eb_id) : "",
        desig_id: rec.desig_id != null ? String(rec.desig_id) : "",
        app_date: rec.app_date ?? "",
        app_shift: rec.app_shift ?? "",
        rate_approve: rec.rate_approve ?? "",
      });
      setFormKey((k) => k + 1);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Error loading rate entry");
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

  const schema = useMemo<Schema>(
    () => ({
      fields: [
        {
          name: "eb_id",
          label: "EB No",
          type: "select",
          options: employees,
          required: true,
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "desig_id",
          label: "Designation",
          type: "select",
          options: designations,
          grid: { xs: 12, sm: 6 },
        },
        {
          // The rate applies from this date until a later approval supersedes
          // it — the Cash Hands process picks the newest rate <= the work date.
          name: "app_date",
          label: "Effective From",
          type: "date",
          required: true,
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "app_shift",
          label: "Shift",
          type: "select",
          options: shifts,
          grid: { xs: 12, sm: 6 },
        },
        {
          name: "rate_approve",
          label: "Approved Rate",
          type: "number",
          required: true,
          grid: { xs: 12, sm: 6 },
        },
      ] satisfies Field[],
    }),
    [employees, designations, shifts],
  );

  // Picking an employee defaults the designation to theirs (still editable).
  const handleValuesChange = useCallback(
    (values: Record<string, unknown>) => {
      const ebId = values.eb_id;
      if (typeof ebId !== "string" || !ebId) return;
      if (values.desig_id) return;
      const emp = employees.find((e) => e.value === ebId);
      if (emp?.designation_id != null) {
        setInitialValues((prev) => ({
          ...prev,
          ...values,
          desig_id: String(emp.designation_id),
        }));
        setFormKey((k) => k + 1);
      }
    },
    [employees],
  );

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const payload = {
        eb_id: values.eb_id,
        desig_id: values.desig_id || null,
        app_date: values.app_date,
        app_shift: values.app_shift || null,
        rate_approve: values.rate_approve,
      };
      const isEdit = editId !== undefined;
      const { error } = await fetchWithCookie(
        isEdit
          ? `${apiRoutesPortalMasters.DAILY_RATE_EDIT}/${editId}`
          : apiRoutesPortalMasters.DAILY_RATE_CREATE,
        isEdit ? "PUT" : "POST",
        payload,
      );
      if (error) throw new Error(error);

      onSaved?.(
        isEdit ? "Rate entry updated successfully" : "Rate entry created successfully",
      );
      onClose();
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title = editId !== undefined ? "Edit Rate Entry" : "Create Rate Entry";

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
