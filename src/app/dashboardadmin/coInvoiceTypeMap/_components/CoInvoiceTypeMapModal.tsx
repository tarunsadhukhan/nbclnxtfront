"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Paper,
  Checkbox,
  FormGroup,
  FormControlLabel,
  CircularProgress,
  Alert,
  Button as MuiButton,
} from "@mui/material";
import { Button } from "@/components/ui/button";

export type InvoiceType = {
  invoice_type_id: number;
  invoice_type_name: string;
  invoice_type_code?: string;
};

export type CoInvoiceTypeMapModalProps = {
  open: boolean;
  coId: number;
  coName: string;
  invoiceTypes: InvoiceType[];
  currentMappedIds: number[];
  onClose: () => void;
  onSave: (coId: number, invoiceTypeIds: number[]) => Promise<void>;
  loading?: boolean;
  error?: string;
};

export function CoInvoiceTypeMapModal({
  open,
  coId,
  coName,
  invoiceTypes,
  currentMappedIds,
  onClose,
  onSave,
  loading = false,
  error = "",
}: CoInvoiceTypeMapModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(currentMappedIds)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set(currentMappedIds));
      setSaveError("");
    }
  }, [open, currentMappedIds]);

  const handleToggle = (invoiceTypeId: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceTypeId)) {
        newSet.delete(invoiceTypeId);
      } else {
        newSet.add(invoiceTypeId);
      }
      return newSet;
    });
    setSaveError("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError("");
    try {
      await onSave(coId, Array.from(selectedIds));
      setIsSaving(false);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save mappings");
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Map Invoice Types - <strong>{coName}</strong>
      </DialogTitle>

      <DialogContent>
        {(error || saveError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || saveError}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : invoiceTypes.length === 0 ? (
          <Alert severity="info">No invoice types available.</Alert>
        ) : (
          <Paper sx={{ p: 2, bgcolor: "background.default" }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Select invoice types for this company:
            </Typography>
            <FormGroup>
              {invoiceTypes.map((type) => (
                <FormControlLabel
                  key={type.invoice_type_id}
                  control={
                    <Checkbox
                      checked={selectedIds.has(type.invoice_type_id)}
                      onChange={() => handleToggle(type.invoice_type_id)}
                      disabled={loading || isSaving}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {type.invoice_type_name}
                      </Typography>
                      {type.invoice_type_code && (
                        <Typography variant="caption" color="text.secondary">
                          {type.invoice_type_code}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </Paper>
        )}
      </DialogContent>

      <DialogActions>
        <MuiButton
          onClick={onClose}
          disabled={isSaving || loading}
          variant="outlined"
        >
          Cancel
        </MuiButton>
        <MuiButton
          onClick={handleSave}
          disabled={isSaving || loading}
          variant="contained"
          color="primary"
        >
          {isSaving ? "Saving..." : "Save"}
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}
