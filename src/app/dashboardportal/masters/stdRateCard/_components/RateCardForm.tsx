"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
} from "@mui/material";

type RateCardFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  mode: "create" | "edit";
  initialData?: Record<string, any> | null;
};

const RATE_TYPES = ["machine_hour", "labor_hour", "power_kwh", "floor_space_sqft", "overhead_pct"];
const REFERENCE_TYPES = ["", "machine", "dept", "cost_element"];

export default function RateCardForm({ open, onClose, onSubmit, mode, initialData }: RateCardFormProps) {
  const [formData, setFormData] = useState({
    rate_type: "machine_hour",
    reference_type: "",
    reference_id: "",
    rate: "",
    uom: "",
    valid_from: new Date().toISOString().split("T")[0],
    valid_to: "",
  });

  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setFormData({
        rate_type: initialData.rate_type || "machine_hour",
        reference_type: initialData.reference_type || "",
        reference_id: initialData.reference_id?.toString() || "",
        rate: initialData.rate?.toString() || "",
        uom: initialData.uom || "",
        valid_from: initialData.valid_from || "",
        valid_to: initialData.valid_to || "",
      });
    } else if (open && mode === "create") {
      setFormData({
        rate_type: "machine_hour",
        reference_type: "",
        reference_id: "",
        rate: "",
        uom: "",
        valid_from: new Date().toISOString().split("T")[0],
        valid_to: "",
      });
    }
  }, [open, mode, initialData]);

  const handleSubmit = () => {
    if (!formData.rate || !formData.valid_from) return;
    onSubmit({
      rate_type: formData.rate_type,
      reference_type: formData.reference_type || null,
      reference_id: formData.reference_id ? Number(formData.reference_id) : null,
      rate: Number(formData.rate),
      uom: formData.uom || null,
      valid_from: formData.valid_from,
      valid_to: formData.valid_to || null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === "create" ? "Create Rate Card" : "Edit Rate Card"}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Rate Type"
              value={formData.rate_type}
              onChange={(e) => setFormData({ ...formData, rate_type: e.target.value })}
              fullWidth
              size="small"
              select
              disabled={mode === "edit"}
            >
              {RATE_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Reference Type"
              value={formData.reference_type}
              onChange={(e) => setFormData({ ...formData, reference_type: e.target.value })}
              fullWidth
              size="small"
              select
              disabled={mode === "edit"}
            >
              {REFERENCE_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t || "None"}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {formData.reference_type && (
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Reference ID"
                value={formData.reference_id}
                onChange={(e) => setFormData({ ...formData, reference_id: e.target.value })}
                fullWidth
                size="small"
                type="number"
                disabled={mode === "edit"}
              />
            </Grid>
          )}
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Rate"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              fullWidth
              size="small"
              type="number"
              required
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="UOM"
              value={formData.uom}
              onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
              fullWidth
              size="small"
              placeholder="e.g., hr, kwh, sqft"
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Valid From"
              type="date"
              value={formData.valid_from}
              onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              required
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Valid To"
              type="date"
              value={formData.valid_to}
              onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          {mode === "create" ? "Create" : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
