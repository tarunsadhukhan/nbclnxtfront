"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Snackbar,
  Alert,
  IconButton,
  Typography,
  CircularProgress,
  TextField,
} from "@mui/material";
import { X } from "lucide-react";
import { MuiForm, MuiFormMode } from "@/components/ui/muiform";
import type { Schema, Option } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/**
 * Props for CreateYarnMaster dialog component
 */
type Props = {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback after successful save (create or edit) */
  onSaved?: () => void;
  /** ID of the yarn master to edit/view. If undefined, opens in create mode */
  editId?: number | string;
  /** Initial mode for the form */
  initialMode?: MuiFormMode;
};

/**
 * @component CreateYarnMaster
 * @description Dialog component for creating, editing, or viewing yarn master records.
 * Supports mode switching between view and edit.
 *
 * Fields:
 * - jute_yarn_name (required): Yarn name
 * - jute_yarn_count: Yarn count (numeric)
 * - item_grp_id: Yarn type (dropdown from item_grp_mst where item_type_id=4)
 * - jute_yarn_remarks: Additional remarks
 *
 * @example
 * <CreateYarnMaster
 *   open={isDialogOpen}
 *   onClose={() => setDialogOpen(false)}
 *   onSaved={refreshList}
 *   editId={selectedId}
 *   initialMode="view"
 * />
 */
export default function CreateYarnMaster({
  open,
  onClose,
  onSaved,
  editId,
  initialMode = "create",
}: Props) {
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<MuiFormMode>(initialMode);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Setup data
  const [yarnTypeOptions, setYarnTypeOptions] = useState<Option[]>([]);
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [formKey, setFormKey] = useState(0);

  /**
   * Generate yarn name by concatenating count, yarn type name, and remarks with '-' separator.
   * Only includes non-empty parts.
   */
  const generateYarnName = useCallback(
    (count: string, yarnTypeId: string, remarks: string): string => {
      const parts: string[] = [];

      // Add count if present
      if (count && count.trim() !== "") {
        parts.push(count.trim());
      }

      // Add yarn type name if selected
      if (yarnTypeId) {
        const yarnType = yarnTypeOptions.find((opt) => opt.value === yarnTypeId);
        if (yarnType && yarnType.label) {
          parts.push(yarnType.label);
        }
      }

      // Add remarks if present
      if (remarks && remarks.trim() !== "") {
        parts.push(remarks.trim());
      }

      return parts.join("-");
    },
    [yarnTypeOptions]
  );

  /**
   * Get company ID from localStorage
   */
  const getCoId = useCallback((): string => {
    const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
    return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
  }, []);

  /**
   * Load setup data from API
   */
  const loadSetup = useCallback(async () => {
    setLoadingSetup(true);
    try {
      const co_id = getCoId();
      if (!co_id) throw new Error("No company selected");

      let url: string;
      if (editId !== undefined) {
        // Edit/View mode - get setup with existing details
        url = `${apiRoutesPortalMasters.YARN_EDIT_SETUP}/${editId}?co_id=${co_id}`;
      } else {
        // Create mode
        url = `${apiRoutesPortalMasters.YARN_CREATE_SETUP}?co_id=${co_id}`;
      }

      const { data, error } = await fetchWithCookie(url, "GET");

      if (error || !data) {
        throw new Error(error || "Failed to load setup data");
      }

      // Map yarn types to options
      const yarnTypes = data.yarn_types ?? [];
      const mappedYarnTypes: Option[] = yarnTypes.map((yt: Record<string, unknown>) => ({
        label: (yt.item_grp_name as string) ?? "",
        value: String(yt.item_grp_id ?? ""),
      }));
      setYarnTypeOptions(mappedYarnTypes);

      // If editing, set initial values from existing record
      if (editId !== undefined && data.yarn_details) {
        const details = data.yarn_details;
        const count = details.jute_yarn_count !== null && details.jute_yarn_count !== undefined
          ? String(details.jute_yarn_count)
          : "";
        const stdMrPct = details.std_mr_pct !== null && details.std_mr_pct !== undefined
          ? String(details.std_mr_pct)
          : "";
        const typeId = details.item_grp_id ? String(details.item_grp_id) : "";
        const remarks = details.jute_yarn_remarks ?? "";

        const vals = {
          jute_yarn_count: count,
          std_mr_pct: stdMrPct,
          item_grp_id: typeId,
          jute_yarn_remarks: remarks,
        };
        setInitialValues(vals);
        setFormValues(vals);
      } else {
        // Create mode - empty initial values
        const vals = {
          jute_yarn_count: "",
          std_mr_pct: "",
          item_grp_id: "",
          jute_yarn_remarks: "",
        };
        setInitialValues(vals);
        setFormValues(vals);
      }

      // Bump form key to re-render form with new initial values
      setFormKey((prev) => prev + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error loading setup";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoadingSetup(false);
    }
  }, [editId, getCoId]);

  // Reset mode and load setup when dialog opens
  useEffect(() => {
    if (open) {
      // Set mode based on whether we're editing/viewing or creating
      if (editId !== undefined) {
        setMode(initialMode === "create" ? "edit" : initialMode);
      } else {
        setMode("create");
      }
      loadSetup();
    } else {
      // Reset state when dialog closes
      setYarnTypeOptions([]);
      setInitialValues({});
      setFormValues({});
      setFormKey(0);
    }
  }, [open, editId, initialMode, loadSetup]);

  /**
   * Generate form schema based on mode and options
   */
  const schema = useMemo<Schema>(
    () => ({
      title:
        editId !== undefined
          ? mode === "view"
            ? "View Yarn"
            : "Edit Yarn"
          : "Create Yarn",
      fields: [
        {
          name: "jute_yarn_count",
          label: "Yarn Count",
          type: "text",
          required: false,
          disabled: mode === "view",
          grid: { xs: 12, md: 4 },
        },
        {
          name: "std_mr_pct",
          label: "Std MR %",
          type: "number",
          required: false,
          disabled: mode === "view",
          grid: { xs: 12, md: 4 },
        },
        {
          name: "item_grp_id",
          label: "Yarn Type",
          type: "select",
          required: false,
          options: yarnTypeOptions,
          disabled: mode === "view",
          grid: { xs: 12, md: 4 },
        },
        {
          name: "jute_yarn_remarks",
          label: "Remarks",
          type: "text",
          required: false,
          disabled: mode === "view",
          grid: { xs: 12, md: 4 },
        },
      ],
    }),
    [editId, mode, yarnTypeOptions]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const co_id = getCoId();
      if (!co_id) throw new Error("No company selected");

      // Validate yarn count if provided
      const yarnCount = values.jute_yarn_count;
      let parsedYarnCount: number | null = null;
      if (yarnCount && String(yarnCount).trim() !== "") {
        parsedYarnCount = parseFloat(String(yarnCount));
        if (isNaN(parsedYarnCount)) {
          throw new Error("Yarn count must be a valid number");
        }
      }

      // Validate std MR % if provided
      const stdMrPctRaw = values.std_mr_pct;
      let parsedStdMrPct: number | null = null;
      if (stdMrPctRaw && String(stdMrPctRaw).trim() !== "") {
        parsedStdMrPct = parseFloat(String(stdMrPctRaw));
        if (isNaN(parsedStdMrPct)) {
          throw new Error("Std MR % must be a valid number");
        }
      }

      // Generate the yarn name from current form values
      const yarnName = generateYarnName(
        String(values.jute_yarn_count ?? ""),
        String(values.item_grp_id ?? ""),
        String(values.jute_yarn_remarks ?? "")
      );

      if (!yarnName) {
        throw new Error("Yarn name cannot be empty. Please fill at least one of: Count, Type, or Remarks");
      }

      const payload = {
        jute_yarn_name: yarnName,
        jute_yarn_count: parsedYarnCount,
        std_mr_pct: parsedStdMrPct,
        item_grp_id: values.item_grp_id ? Number(values.item_grp_id) : null,
        jute_yarn_remarks: values.jute_yarn_remarks || null,
        co_id,
      };

      let url: string;
      let method: "POST" | "PUT";

      if (editId !== undefined) {
        // Edit mode
        url = `${apiRoutesPortalMasters.YARN_EDIT}/${editId}?co_id=${co_id}`;
        method = "PUT";
      } else {
        // Create mode
        url = `${apiRoutesPortalMasters.YARN_CREATE}?co_id=${co_id}`;
        method = "POST";
      }

      const { error } = await fetchWithCookie(url, method, payload);

      if (error) {
        throw new Error(error);
      }

      setSnackbar({
        open: true,
        message:
          editId !== undefined
            ? "Yarn updated successfully"
            : "Yarn created successfully",
        severity: "success",
      });

      onSaved?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Computed yarn name based on current form values
   */
  const generatedYarnName = useMemo(() => {
    const count = String(formValues.jute_yarn_count ?? "");
    const typeId = String(formValues.item_grp_id ?? "");
    const remarks = String(formValues.jute_yarn_remarks ?? "");
    return generateYarnName(count, typeId, remarks);
  }, [formValues.jute_yarn_count, formValues.item_grp_id, formValues.jute_yarn_remarks, generateYarnName]);

  /**
   * Handle form values change - just track values, no form re-mount
   */
  const handleValuesChange = useCallback((values: Record<string, unknown>) => {
    setFormValues(values);
  }, []);

  /**
   * Handle mode change (view -> edit)
   */
  const handleModeChange = (newMode: MuiFormMode) => {
    setMode(newMode);
  };

  /**
   * Dialog title based on mode
   */
  const dialogTitle = useMemo(() => {
    if (editId !== undefined) {
      return mode === "view" ? "View Yarn" : "Edit Yarn";
    }
    return "Create Yarn";
  }, [editId, mode]);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
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
            {dialogTitle}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Close dialog">
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {loadingSetup ? (
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
              {/* Display auto-generated yarn name */}
              <TextField
                label="Yarn Name (Auto-generated)"
                value={generatedYarnName || "(Fill fields below to generate)"}
                fullWidth
                disabled
                size="small"
                sx={{ mb: 2 }}
                InputProps={{
                  readOnly: true,
                }}
              />
              <MuiForm
                key={formKey}
                schema={schema}
                mode={mode}
                initialValues={initialValues}
                onSubmit={handleSubmit}
                onModeChange={handleModeChange}
                onValuesChange={handleValuesChange}
                submitLabel={saving ? "Saving..." : "Save"}
                cancelLabel="Cancel"
                onCancel={onClose}
                hideModeToggle={mode === "create"}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
