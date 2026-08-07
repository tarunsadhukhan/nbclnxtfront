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
} from "@mui/material";
import { X } from "lucide-react";
import { MuiForm, MuiFormMode } from "@/components/ui/muiform";
import type { Schema, Option } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/**
 * Props for CreateJuteQuality dialog component
 */
type Props = {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback after successful save (create or edit) */
  onSaved?: () => void;
  /** ID of the jute quality to edit/view. If undefined, opens in create mode */
  editId?: number | string;
  /** Initial mode for the form */
  initialMode?: MuiFormMode;
};

/**
 * @component CreateJuteQuality
 * @description Dialog component for creating, editing, or viewing jute quality records.
 * Supports mode switching between view and edit.
 *
 * @example
 * <CreateJuteQuality
 *   open={isDialogOpen}
 *   onClose={() => setDialogOpen(false)}
 *   onSaved={refreshList}
 *   editId={selectedId}
 *   initialMode="view"
 * />
 */
export default function CreateJuteQuality({
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
  const [itemOptions, setItemOptions] = useState<Option[]>([]);
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [formKey, setFormKey] = useState(0);

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
        url = `${apiRoutesPortalMasters.JUTE_QUALITY_EDIT_SETUP}/${editId}?co_id=${co_id}`;
      } else {
        // Create mode
        url = `${apiRoutesPortalMasters.JUTE_QUALITY_CREATE_SETUP}?co_id=${co_id}`;
      }

      const { data, error } = await fetchWithCookie(url, "GET");

      if (error || !data) {
        throw new Error(error || "Failed to load setup data");
      }

      // Map items to options
      const items = data.items ?? [];
      const mappedItems: Option[] = items.map((item: Record<string, unknown>) => ({
        label: `${item.item_name ?? ""} (${item.item_code ?? ""})`.trim(),
        value: String(item.item_id ?? ""),
      }));
      setItemOptions(mappedItems);

      // If editing, set initial values from existing record
      if (editId !== undefined && data.jute_quality_details) {
        const details = data.jute_quality_details;
        setInitialValues({
          jute_quality: details.jute_quality ?? "",
          item_id: details.item_id ? String(details.item_id) : "",
        });
      } else {
        // Create mode - empty initial values
        setInitialValues({
          jute_quality: "",
          item_id: "",
        });
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
      setItemOptions([]);
      setInitialValues({});
      setFormKey(0);
    }
  }, [open, editId, initialMode, loadSetup]);

  /**
   * Generate form schema based on mode and options
   */
  const schema = useMemo<Schema>(
    () => ({
      title: editId !== undefined ? (mode === "view" ? "View Jute Quality" : "Edit Jute Quality") : "Create Jute Quality",
      fields: [
        {
          name: "jute_quality",
          label: "Jute Quality Name",
          type: "text",
          required: true,
          disabled: mode === "view",
          grid: { xs: 12 },
        },
        {
          name: "item_id",
          label: "Associated Item",
          type: "select",
          required: false,
          options: itemOptions,
          disabled: mode === "view",
          grid: { xs: 12 },
        },
      ],
    }),
    [editId, mode, itemOptions]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const co_id = getCoId();
      if (!co_id) throw new Error("No company selected");

      const payload = {
        ...values,
        co_id,
        item_id: values.item_id ? Number(values.item_id) : null,
      };

      let url: string;
      let method: "POST" | "PUT";

      if (editId !== undefined) {
        // Edit mode
        url = `${apiRoutesPortalMasters.JUTE_QUALITY_EDIT}/${editId}?co_id=${co_id}`;
        method = "PUT";
      } else {
        // Create mode
        url = `${apiRoutesPortalMasters.JUTE_QUALITY_CREATE}?co_id=${co_id}`;
        method = "POST";
      }

      const { error } = await fetchWithCookie(url, method, payload);

      if (error) {
        throw new Error(error);
      }

      setSnackbar({
        open: true,
        message: editId !== undefined ? "Jute quality updated successfully" : "Jute quality created successfully",
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
      return mode === "view" ? "View Jute Quality" : "Edit Jute Quality";
    }
    return "Create Jute Quality";
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
              <MuiForm
                key={formKey}
                schema={schema}
                mode={mode}
                initialValues={initialValues}
                onSubmit={handleSubmit}
                onModeChange={handleModeChange}
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
