"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Box,
  Grid,
  Alert,
  Typography,
  Paper,
  Divider,
  InputAdornment,
  Autocomplete,
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
  type: string;
  description: string;
  parent_id: string;
  is_custom_component: boolean;
  is_occasionally: boolean;
  is_excel_downloadable: boolean;
  roundof: string;
  roundof_type: string;
  default_value: string;
}

const BLANK_FORM: FormValues = {
  code: "",
  name: "",
  type: "",
  description: "",
  parent_id: "",
  is_custom_component: false,
  is_occasionally: false,
  is_excel_downloadable: false,
  roundof: "",
  roundof_type: "",
  default_value: "",
};

function CreatePayComponentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const isEdit = !!editId;

  const [form, setForm] = useState<FormValues>({ ...BLANK_FORM });
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Fetch setup options
        const { data: setupRes, error: setupErr } = (await fetchWithCookie(
          apiRoutesPortalMasters.HRMS_PAY_COMPONENT_CREATE_SETUP,
          "GET"
        )) as { data?: { data: SetupData }; error?: string };
        if (setupErr || !setupRes) throw new Error(setupErr || "Failed to fetch setup");
        setSetup(setupRes.data);

        // If editing, fetch existing record
        if (editId) {
          const { data: detailRes, error: detailErr } = (await fetchWithCookie(
            `${apiRoutesPortalMasters.HRMS_PAY_COMPONENT_BY_ID}/${editId}`,
            "GET"
          )) as { data?: { data: Record<string, unknown> }; error?: string };
          if (detailErr || !detailRes?.data) throw new Error(detailErr || "Not found");
          const d = detailRes.data;
          const rawCode = (d.code as string) || "";
          setForm({
            code: rawCode.startsWith("C_") ? rawCode.slice(2) : rawCode,
            name: (d.name as string) || "",
            type: d.type != null ? String(d.type) : "",
            description: (d.description as string) || "",
            parent_id: d.parent_id ? String(d.parent_id) : "",
            is_custom_component: !!(d.is_custom_component),
            is_occasionally: !!(d.is_occasionally),
            is_excel_downloadable: !!(d.is_excel_downloadable),
            roundof: d.roundof != null ? String(d.roundof) : "",
            roundof_type: d.roundof_type != null ? String(d.roundof_type) : "",
            default_value: d.default_value != null ? String(d.default_value) : "",
          });
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [editId]);

  const handleChange = useCallback((field: keyof FormValues, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (!form.code.trim()) { setError("Code is required"); return; }
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (form.type === "") { setError("Type is required"); return; }

    setSubmitting(true);
    try {
      const codeValue = form.code.trim();
      const body = {
        code: `C_${codeValue}`,
        name: form.name.trim(),
        type: Number(form.type),
        description: form.description,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        is_custom_component: form.is_custom_component,
        is_occasionally: form.is_occasionally,
        is_excel_downloadable: form.is_excel_downloadable,
        roundof: form.roundof !== "" ? Number(form.roundof) : null,
        roundof_type: form.roundof_type !== "" ? Number(form.roundof_type) : null,
        default_value: form.default_value ? Number(form.default_value) : null,
      };

      let url: string;
      let method: "POST" | "PUT";
      if (isEdit) {
        url = `${apiRoutesPortalMasters.HRMS_PAY_COMPONENT_UPDATE}/${editId}`;
        method = "PUT";
      } else {
        url = apiRoutesPortalMasters.HRMS_PAY_COMPONENT_CREATE;
        method = "POST";
      }

      const { error: err } = (await fetchWithCookie(url, method, body)) as {
        data?: unknown;
        error?: string;
      };
      if (err) throw new Error(err);

      router.push("/dashboardadmin/paySchemeParameters");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-[#0C3C60]">
          {isEdit ? "Edit Pay Scheme Parameters" : "Create Pay Scheme Parameters"}
        </h1>

        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Fill Details
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Row 1: Code, Name, Type, Parent */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Code"
                value={form.code}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                  handleChange("code", v);
                }}
                fullWidth
                required
                size="small"
                disabled={isEdit}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <span style={{ fontWeight: 600, color: "#555" }}>C_</span>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                fullWidth
                required
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Type"
                select
                value={form.type}
                onChange={(e) => handleChange("type", e.target.value)}
                fullWidth
                required
                size="small"
              >
                <MenuItem value="">Select</MenuItem>
                {(setup?.type_options ?? []).map((o) => (
                  <MenuItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Autocomplete
                options={setup?.parent_options ?? []}
                getOptionLabel={(o) => o.label}
                value={
                  (setup?.parent_options ?? []).find(
                    (o) => String(o.value) === form.parent_id
                  ) ?? null
                }
                onChange={(_, val) => handleChange("parent_id", val ? String(val.value) : "")}
                isOptionEqualToValue={(opt, val) => opt.value === val.value}
                size="small"
                renderInput={(params) => (
                  <TextField {...params} label="Parent" size="small" />
                )}
              />
            </Grid>

            {/* Row 2: Checkboxes */}
            <Grid size={{ xs: 12 }}>
              <Box display="flex" flexWrap="wrap" gap={3} mt={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.is_excel_downloadable}
                      onChange={(e) => handleChange("is_excel_downloadable", e.target.checked)}
                    />
                  }
                  label="isExcelDownloadable"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.is_custom_component}
                      onChange={(e) => handleChange("is_custom_component", e.target.checked)}
                    />
                  }
                  label="isCustom"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.is_occasionally}
                      onChange={(e) => handleChange("is_occasionally", e.target.checked)}
                    />
                  }
                  label="Occasionally"
                />
              </Box>
            </Grid>

            {/* Helper text */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="error" sx={{ display: "block", mt: -1, mb: 1 }}>
                Check isExcelDownloadable option if there is monthly change to this figure, else if fixed then do
                not check. Customize controls given to the user to enter values for the component if the value
                changes from employee to employee.
              </Typography>
            </Grid>

            {/* Row 3: Round To Decimals, Round Of Type, Default Value, Description */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Round To Decimals"
                select
                value={form.roundof}
                onChange={(e) => handleChange("roundof", e.target.value)}
                fullWidth
                required
                size="small"
              >
                <MenuItem value="">Select</MenuItem>
                {(setup?.roundof_options ?? []).map((o) => (
                  <MenuItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Round Of Type"
                select
                value={form.roundof_type}
                onChange={(e) => handleChange("roundof_type", e.target.value)}
                fullWidth
                size="small"
              >
                <MenuItem value="">None</MenuItem>
                {(setup?.roundof_type_options ?? []).map((o) => (
                  <MenuItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Default Value"
                value={form.default_value}
                onChange={(e) => handleChange("default_value", e.target.value)}
                fullWidth
                size="small"
                type="number"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Description"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>

            {/* Action buttons */}
            <Grid size={{ xs: 12 }}>
              <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboardadmin/paySchemeParameters")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Saving..." : isEdit ? "Update" : "Create"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </div>
    </div>
  );
}

export default function CreatePayComponentPage() {
  return (
    <Suspense fallback={null}>
      <CreatePayComponentPageContent />
    </Suspense>
  );
}
