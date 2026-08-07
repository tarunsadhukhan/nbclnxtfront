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
import type { Schema } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/**
 * Props for CreateJuteSupplier dialog component
 */
type Props = {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback after successful save (create or edit) */
  onSaved?: () => void;
  /** ID of the jute supplier to edit/view. If undefined, opens in create mode */
  editId?: number | string;
  /** Initial mode for the form */
  initialMode?: MuiFormMode;
};

/**
 * @component CreateJuteSupplier
 * @description Dialog component for creating, editing, or viewing jute supplier records.
 * Supports mode switching between view and edit.
 * Jute suppliers are global (not company-specific).
 *
 * @example
 * <CreateJuteSupplier
 *   open={isDialogOpen}
 *   onClose={() => setDialogOpen(false)}
 *   onSaved={refreshList}
 *   editId={selectedId}
 *   initialMode="view"
 * />
 */
export default function CreateJuteSupplier({
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

  // Form state
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [formKey, setFormKey] = useState(0);

  /**
   * Load setup data from API (for edit/view mode)
   */
  const loadSetup = useCallback(async () => {
    setLoadingSetup(true);
    try {
      if (editId !== undefined) {
        // Edit/View mode - get existing details
        const url = `${apiRoutesPortalMasters.JUTE_SUPPLIER_EDIT_SETUP}/${editId}`;
        const { data, error } = await fetchWithCookie(url, "GET");

        if (error || !data) {
          throw new Error(error || "Failed to load supplier data");
        }

        // Set initial values from existing record
        if (data.jute_supplier_details) {
          const details = data.jute_supplier_details;
          setInitialValues({
            supplier_name: details.supplier_name ?? "",
            email: details.email ?? "",
            contact_no: details.contact_no ?? "",
          });
        }
      } else {
        // Create mode - empty initial values
        setInitialValues({
          supplier_name: "",
          email: "",
          contact_no: "",
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
  }, [editId]);

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
      setInitialValues({});
      setFormKey(0);
    }
  }, [open, editId, initialMode, loadSetup]);

  /**
   * Generate form schema based on mode
   */
  const schema = useMemo<Schema>(
    () => ({
      title:
        editId !== undefined
          ? mode === "view"
            ? "View Jute Supplier"
            : "Edit Jute Supplier"
          : "Create Jute Supplier",
      fields: [
        {
          name: "supplier_name",
          label: "Supplier Name",
          type: "text",
          required: true,
          disabled: mode === "view",
          grid: { xs: 12 },
        },
        {
          name: "email",
          label: "Email",
          type: "text",
          required: false,
          disabled: mode === "view",
          grid: { xs: 12, md: 6 },
        },
        {
          name: "contact_no",
          label: "Contact No",
          type: "text",
          required: false,
          disabled: mode === "view",
          grid: { xs: 12, md: 6 },
        },
      ],
    }),
    [editId, mode]
  );

  /**
   * Handle form submission
   */
  const handleSubmit = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const payload = {
        supplier_name: (values.supplier_name as string)?.trim() ?? "",
        email: (values.email as string)?.trim() || null,
        contact_no: (values.contact_no as string)?.trim() || null,
      };

      let url: string;
      let method: "POST" | "PUT";

      if (editId !== undefined) {
        // Edit mode
        url = `${apiRoutesPortalMasters.JUTE_SUPPLIER_EDIT}/${editId}`;
        method = "PUT";
      } else {
        // Create mode
        url = `${apiRoutesPortalMasters.JUTE_SUPPLIER_CREATE}`;
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
            ? "Jute supplier updated successfully"
            : "Jute supplier created successfully",
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
      return mode === "view" ? "View Jute Supplier" : "Edit Jute Supplier";
    }
    return "Add Jute Supplier";
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
