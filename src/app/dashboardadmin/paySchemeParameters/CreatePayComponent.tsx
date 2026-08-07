"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Box,
  Grid,
} from "@mui/material";
import { Button } from "@/components/ui/button";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

interface OptionItem {
  value: number;
  label: string;
}

interface SetupData {
  type_options: OptionItem[];
  parent_options: OptionItem[];
  roundof_options: OptionItem[];
  roundof_type_options: OptionItem[];
}

interface FormValues {
  code: string;
  name: string;
  type: number;
  description: string;
  effective_from: string;
  ends_on: string;
  parent_id: string;
  is_custom_component: boolean;
  is_displayable_in_payslip: boolean;
  is_occasionally: boolean;
  is_excel_downloadable: boolean;
  roundof: string;
  roundof_type: string;
  default_value: string;
}

const BLANK_FORM: FormValues = {
  code: "",
  name: "",
  type: 1,
  description: "",
  effective_from: "",
  ends_on: "",
  parent_id: "",
  is_custom_component: false,
  is_displayable_in_payslip: false,
  is_occasionally: false,
  is_excel_downloadable: false,
  roundof: "",
  roundof_type: "",
  default_value: "",
};

interface Props {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  editId?: number | null;
  coId: string;
}

export default function CreatePayComponent({ open, onClose, editId, coId }: Props) {
  const [form, setForm] = useState<FormValues>({ ...BLANK_FORM });
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!editId;

  useEffect(() => {
    if (!open) return;
    setError("");
    fetchSetup();
    if (editId) {
      fetchDetail(editId);
    } else {
      setForm({ ...BLANK_FORM });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId]);

  const fetchSetup = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ co_id: coId });
      const { data, error: err } = (await fetchWithCookie(
        `${apiRoutesPortalMasters.HRMS_PAY_COMPONENT_CREATE_SETUP}?${params}`,
        "GET"
      )) as { data?: { data: SetupData }; error?: string };
      if (err || !data) throw new Error(err || "Failed to fetch setup");
      setSetup(data.data);
    } catch {
      setError("Failed to load setup options");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ co_id: coId });
      const { data, error: err } = (await fetchWithCookie(
        `${apiRoutesPortalMasters.HRMS_PAY_COMPONENT_BY_ID}/${id}?${params}`,
        "GET"
      )) as { data?: { data: Record<string, unknown> }; error?: string };
      if (err || !data?.data) throw new Error(err || "Not found");
      const d = data.data;
      setForm({
        code: (d.code as string) || "",
        name: (d.name as string) || "",
        type: (d.type as number) ?? 1,
        description: (d.description as string) || "",
        effective_from: d.effective_from ? String(d.effective_from).slice(0, 10) : "",
        ends_on: d.ends_on ? String(d.ends_on).slice(0, 10) : "",
        parent_id: d.parent_id ? String(d.parent_id) : "",
        is_custom_component: !!(d.is_custom_component),
        is_displayable_in_payslip: !!(d.is_displayable_in_payslip),
        is_occasionally: !!(d.is_occasionally),
        is_excel_downloadable: !!(d.is_excel_downloadable),
        roundof: d.roundof != null ? String(d.roundof) : "",
        roundof_type: d.roundof_type != null ? String(d.roundof_type) : "",
        default_value: d.default_value != null ? String(d.default_value) : "",
      });
    } catch {
      setError("Failed to load component details");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormValues, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.code.trim()) { setError("Code is required"); return; }
    if (!form.name.trim()) { setError("Name is required"); return; }

    setSubmitting(true);
    try {
      const params = new URLSearchParams({ co_id: coId });
      const body = {
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type,
        description: form.description,
        effective_from: form.effective_from || null,
        ends_on: form.ends_on || null,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        is_custom_component: form.is_custom_component,
        is_displayable_in_payslip: form.is_displayable_in_payslip,
        is_occasionally: form.is_occasionally,
        is_excel_downloadable: form.is_excel_downloadable,
        roundof: form.roundof !== "" ? Number(form.roundof) : null,
        roundof_type: form.roundof_type !== "" ? Number(form.roundof_type) : null,
        default_value: form.default_value ? Number(form.default_value) : null,
      };

      let url: string;
      let method: "POST" | "PUT";
      if (isEdit) {
        url = `${apiRoutesPortalMasters.HRMS_PAY_COMPONENT_UPDATE}/${editId}?${params}`;
        method = "PUT";
      } else {
        url = `${apiRoutesPortalMasters.HRMS_PAY_COMPONENT_CREATE}?${params}`;
        method = "POST";
      }

      const { data, error: err } = (await fetchWithCookie(url, method, body)) as {
        data?: { data: { message: string } };
        error?: string;
      };
      if (err) throw new Error(err);
      onClose(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? "Edit Pay Component" : "Create Pay Component"}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : (
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {/* Row 1: Code, Name, Type, Effective From */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Code" value={form.code} onChange={(e) => handleChange("code", e.target.value)} fullWidth required size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} fullWidth required size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Type" select value={String(form.type)} onChange={(e) => handleChange("type", Number(e.target.value))} fullWidth size="small">
                {(setup?.type_options ?? []).map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Effective From" type="date" value={form.effective_from} onChange={(e) => handleChange("effective_from", e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>

            {/* Row 2: Effective Till, Parent, Round To Decimals, Round Off Type */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Effective Till" type="date" value={form.ends_on} onChange={(e) => handleChange("ends_on", e.target.value)} fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Parent" select value={form.parent_id} onChange={(e) => handleChange("parent_id", e.target.value)} fullWidth size="small">
                <MenuItem value="">None</MenuItem>
                {(setup?.parent_options ?? []).map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Round To Decimals" select value={form.roundof} onChange={(e) => handleChange("roundof", e.target.value)} fullWidth size="small">
                <MenuItem value="">None</MenuItem>
                {(setup?.roundof_options ?? []).map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Round Off Type" select value={form.roundof_type} onChange={(e) => handleChange("roundof_type", e.target.value)} fullWidth size="small">
                <MenuItem value="">None</MenuItem>
                {(setup?.roundof_type_options ?? []).map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Row 3: Checkboxes */}
            <Grid size={{ xs: 12 }}>
              <Box display="flex" flexWrap="wrap" gap={2}>
                <FormControlLabel control={<Checkbox checked={form.is_custom_component} onChange={(e) => handleChange("is_custom_component", e.target.checked)} />} label="Is Custom" />
                <FormControlLabel control={<Checkbox checked={form.is_displayable_in_payslip} onChange={(e) => handleChange("is_displayable_in_payslip", e.target.checked)} />} label="Is Displayable" />
                <FormControlLabel control={<Checkbox checked={form.is_occasionally} onChange={(e) => handleChange("is_occasionally", e.target.checked)} />} label="Is Occasionally" />
                <FormControlLabel control={<Checkbox checked={form.is_excel_downloadable} onChange={(e) => handleChange("is_excel_downloadable", e.target.checked)} />} label="Is Excel Downloadable" />
              </Box>
            </Grid>

            {/* Row 4: Default Value, Description */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField label="Default Value" type="number" value={form.default_value} onChange={(e) => handleChange("default_value", e.target.value)} fullWidth size="small" />
            </Grid>
            <Grid size={{ xs: 12, sm: 9 }}>
              <TextField label="Description" multiline rows={3} value={form.description} onChange={(e) => handleChange("description", e.target.value)} fullWidth size="small" />
            </Grid>

            {error && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ color: "error.main", fontSize: 14 }}>{error}</Box>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outline" onClick={() => onClose()} disabled={submitting}>Cancel</Button>
        <Button className="btn-primary" onClick={handleSubmit} disabled={submitting || loading}>
          {submitting ? <CircularProgress size={18} /> : isEdit ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
