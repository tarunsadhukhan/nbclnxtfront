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
  FormControlLabel,
  Switch,
  Grid,
} from "@mui/material";
import { CostElementNode } from "./CostElementTree";

type CostElementFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  mode: "create" | "edit";
  initialData?: CostElementNode | null;
  parentOptions: { id: number; label: string }[];
};

const ELEMENT_TYPES = ["material", "conversion"];
const BASIS_OPTIONS = [
  "",
  "per_unit",
  "per_machine_hour",
  "per_kg",
  "per_batch",
  "per_month_allocated",
  "fixed",
  "percentage",
  "per_hour",
  "per_kwh",
];

export default function CostElementForm({
  open,
  onClose,
  onSubmit,
  mode,
  initialData,
  parentOptions,
}: CostElementFormProps) {
  const [formData, setFormData] = useState({
    element_code: "",
    element_name: "",
    parent_element_id: "" as string | number,
    element_type: "material",
    default_basis: "",
    is_leaf: true,
    sort_order: 0,
    element_desc: "",
  });

  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      setFormData({
        element_code: initialData.element_code,
        element_name: initialData.element_name,
        parent_element_id: initialData.parent_element_id ?? "",
        element_type: initialData.element_type,
        default_basis: initialData.default_basis || "",
        is_leaf: initialData.is_leaf === 1,
        sort_order: initialData.sort_order,
        element_desc: initialData.element_desc || "",
      });
    } else if (open && mode === "create") {
      setFormData({
        element_code: "",
        element_name: "",
        parent_element_id: "",
        element_type: "material",
        default_basis: "",
        is_leaf: true,
        sort_order: 0,
        element_desc: "",
      });
    }
  }, [open, mode, initialData]);

  const handleSubmit = () => {
    if (!formData.element_name) return;
    if (mode === "create" && !formData.element_code) return;

    onSubmit({
      ...formData,
      parent_element_id: formData.parent_element_id || null,
      default_basis: formData.default_basis || null,
      is_leaf: formData.is_leaf ? 1 : 0,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === "create" ? "Create Cost Element" : "Edit Cost Element"}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Element Code"
              value={formData.element_code}
              onChange={(e) => setFormData({ ...formData, element_code: e.target.value })}
              fullWidth
              size="small"
              disabled={mode === "edit"}
              required
            />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Element Name"
              value={formData.element_name}
              onChange={(e) => setFormData({ ...formData, element_name: e.target.value })}
              fullWidth
              size="small"
              required
            />
          </Grid>
          {mode === "create" && (
            <Grid size={{ xs: 6 }}>
              <TextField
                label="Parent Element"
                value={formData.parent_element_id}
                onChange={(e) => setFormData({ ...formData, parent_element_id: e.target.value })}
                fullWidth
                size="small"
                select
              >
                <MenuItem value="">None (Root Level)</MenuItem>
                {parentOptions.map((opt) => (
                  <MenuItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Element Type"
              value={formData.element_type}
              onChange={(e) => setFormData({ ...formData, element_type: e.target.value })}
              fullWidth
              size="small"
              select
              disabled={mode === "edit"}
            >
              {ELEMENT_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField
              label="Default Basis"
              value={formData.default_basis}
              onChange={(e) => setFormData({ ...formData, default_basis: e.target.value })}
              fullWidth
              size="small"
              select
            >
              {BASIS_OPTIONS.map((b) => (
                <MenuItem key={b} value={b}>
                  {b || "None"}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <TextField
              label="Sort Order"
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_leaf}
                  onChange={(e) => setFormData({ ...formData, is_leaf: e.target.checked })}
                />
              }
              label="Leaf"
              sx={{ mt: 0.5 }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Description"
              value={formData.element_desc}
              onChange={(e) => setFormData({ ...formData, element_desc: e.target.value })}
              fullWidth
              size="small"
              multiline
              rows={2}
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
