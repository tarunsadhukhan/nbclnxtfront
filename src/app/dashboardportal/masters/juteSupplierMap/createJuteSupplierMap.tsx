"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Snackbar,
  Alert,
  IconButton,
  Typography,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import { X } from "lucide-react";
import type { MuiFormMode } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/**
 * Option type for dropdowns
 */
type Option = {
  label: string;
  value: string;
};

/**
 * Type for view data (when viewing an existing mapping)
 */
type ViewData = {
  map_id: number;
  supplier_name: string;
  party_name: string;
  party_code?: string;
};

/**
 * Props for CreateJuteSupplierMap dialog component
 */
type Props = {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback after successful save */
  onSaved?: () => void;
  /** Data for viewing an existing mapping */
  viewData?: ViewData;
  /** Initial mode for the form */
  initialMode?: MuiFormMode;
};

/**
 * @component CreateJuteSupplierMap
 * @description Dialog component for creating or viewing jute supplier to party mappings.
 * When creating, user selects a supplier first, then available parties are loaded.
 * Mappings cannot be edited - only created or deleted.
 *
 * @example
 * <CreateJuteSupplierMap
 *   open={isDialogOpen}
 *   onClose={() => setDialogOpen(false)}
 *   onSaved={refreshList}
 *   viewData={selectedRow}
 *   initialMode="view"
 * />
 */
export default function CreateJuteSupplierMap({
  open,
  onClose,
  onSaved,
  viewData,
  initialMode = "create",
}: Props) {
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingParties, setLoadingParties] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<MuiFormMode>(initialMode);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Form state
  const [supplierOptions, setSupplierOptions] = useState<Option[]>([]);
  const [partyOptions, setPartyOptions] = useState<Option[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedParty, setSelectedParty] = useState<string>("");
  
  // Validation errors
  const [errors, setErrors] = useState<{ supplier?: string; party?: string }>({});

  /**
   * Get company ID from localStorage
   */
  const getCoId = useCallback((): string => {
    const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
    return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
  }, []);

  /**
   * Load setup data (suppliers) from API
   */
  const loadSetup = useCallback(async () => {
    setLoadingSetup(true);
    try {
      const co_id = getCoId();
      if (!co_id) throw new Error("No company selected");

      const url = `${apiRoutesPortalMasters.JUTE_SUPPLIER_MAP_CREATE_SETUP}?co_id=${co_id}`;
      const { data, error } = await fetchWithCookie(url, "GET");

      if (error || !data) {
        throw new Error(error || "Failed to load setup data");
      }

      // Map suppliers to options
      const suppliers = data.suppliers ?? [];
      const mappedSuppliers: Option[] = suppliers.map((s: Record<string, unknown>) => ({
        label: (s.supplier_name as string) ?? "",
        value: String(s.supplier_id ?? ""),
      }));
      setSupplierOptions(mappedSuppliers);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error loading setup";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoadingSetup(false);
    }
  }, [getCoId]);

  /**
   * Load available parties for selected supplier
   */
  const loadAvailableParties = useCallback(async (supplierId: string) => {
    if (!supplierId) {
      setPartyOptions([]);
      return;
    }

    setLoadingParties(true);
    try {
      const co_id = getCoId();
      if (!co_id) throw new Error("No company selected");

      const url = `${apiRoutesPortalMasters.JUTE_SUPPLIER_MAP_AVAILABLE_PARTIES}/${supplierId}?co_id=${co_id}`;
      const { data, error } = await fetchWithCookie(url, "GET");

      if (error || !data) {
        throw new Error(error || "Failed to load parties");
      }

      // Map parties to options
      const parties = data.parties ?? [];
      const mappedParties: Option[] = parties.map((p: Record<string, unknown>) => ({
        label: `${p.supp_name ?? ""} (${p.supp_code ?? ""})`.trim(),
        value: String(p.party_id ?? ""),
      }));
      setPartyOptions(mappedParties);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error loading parties";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoadingParties(false);
    }
  }, [getCoId]);

  // Reset state and load setup when dialog opens
  useEffect(() => {
    if (open) {
      // Set mode based on whether we're viewing or creating
      if (viewData) {
        setMode("view");
      } else {
        setMode("create");
        loadSetup();
      }
      
      // Reset form state
      setSelectedSupplier("");
      setSelectedParty("");
      setPartyOptions([]);
      setErrors({});
    } else {
      // Reset state when dialog closes
      setSupplierOptions([]);
      setPartyOptions([]);
      setSelectedSupplier("");
      setSelectedParty("");
      setErrors({});
    }
  }, [open, viewData, loadSetup]);

  /**
   * Handle supplier selection change
   */
  const handleSupplierChange = useCallback((value: string) => {
    setSelectedSupplier(value);
    setSelectedParty(""); // Reset party when supplier changes
    setErrors((prev) => ({ ...prev, supplier: undefined }));
    
    if (value) {
      loadAvailableParties(value);
    } else {
      setPartyOptions([]);
    }
  }, [loadAvailableParties]);

  /**
   * Handle party selection change
   */
  const handlePartyChange = useCallback((value: string) => {
    setSelectedParty(value);
    setErrors((prev) => ({ ...prev, party: undefined }));
  }, []);

  /**
   * Validate form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: { supplier?: string; party?: string } = {};
    
    if (!selectedSupplier) {
      newErrors.supplier = "Please select a supplier";
    }
    if (!selectedParty) {
      newErrors.party = "Please select a party";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedSupplier, selectedParty]);

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const co_id = getCoId();
      if (!co_id) throw new Error("No company selected");

      const payload = {
        jute_supplier_id: parseInt(selectedSupplier, 10),
        party_id: parseInt(selectedParty, 10),
      };

      const url = `${apiRoutesPortalMasters.JUTE_SUPPLIER_MAP_CREATE}?co_id=${co_id}`;
      const { error } = await fetchWithCookie(url, "POST", payload);

      if (error) {
        throw new Error(error);
      }

      setSnackbar({
        open: true,
        message: "Mapping created successfully",
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
   * Dialog title based on mode
   */
  const dialogTitle = useMemo(() => {
    return mode === "view" ? "View Supplier Mapping" : "Add Supplier Mapping";
  }, [mode]);

  /**
   * Render view mode content
   */
  const renderViewContent = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">
          Jute Supplier
        </Typography>
        <Typography variant="body1">{viewData?.supplier_name ?? "-"}</Typography>
      </Box>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">
          Party Name
        </Typography>
        <Typography variant="body1">{viewData?.party_name ?? "-"}</Typography>
      </Box>
      {viewData?.party_code && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary">
            Party Code
          </Typography>
          <Typography variant="body1">{viewData.party_code}</Typography>
        </Box>
      )}
    </Box>
  );

  /**
   * Render create mode content
   */
  const renderCreateContent = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
      <FormControl fullWidth error={!!errors.supplier}>
        <InputLabel id="supplier-label">Jute Supplier *</InputLabel>
        <Select
          labelId="supplier-label"
          value={selectedSupplier}
          label="Jute Supplier *"
          onChange={(e) => handleSupplierChange(e.target.value)}
          disabled={loadingSetup}
        >
          {supplierOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        {errors.supplier && <FormHelperText>{errors.supplier}</FormHelperText>}
      </FormControl>

      <FormControl fullWidth error={!!errors.party} disabled={!selectedSupplier || loadingParties}>
        <InputLabel id="party-label">Party *</InputLabel>
        <Select
          labelId="party-label"
          value={selectedParty}
          label="Party *"
          onChange={(e) => handlePartyChange(e.target.value)}
        >
          {loadingParties ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 1 }} /> Loading...
            </MenuItem>
          ) : partyOptions.length === 0 && selectedSupplier ? (
            <MenuItem disabled>No available parties to map</MenuItem>
          ) : (
            partyOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))
          )}
        </Select>
        {errors.party && <FormHelperText>{errors.party}</FormHelperText>}
        {selectedSupplier && !loadingParties && partyOptions.length === 0 && (
          <FormHelperText>
            All parties are already mapped to this supplier
          </FormHelperText>
        )}
      </FormControl>
    </Box>
  );

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
          {loadingSetup && mode === "create" ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 150,
              }}
            >
              <CircularProgress />
            </Box>
          ) : mode === "view" ? (
            renderViewContent()
          ) : (
            renderCreateContent()
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="outlined" color="inherit">
            {mode === "view" ? "Close" : "Cancel"}
          </Button>
          {mode === "create" && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={saving || !selectedSupplier || !selectedParty}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </DialogActions>
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
