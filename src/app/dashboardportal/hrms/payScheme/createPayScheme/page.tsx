"use client";

import React, { Suspense, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Typography, Paper, Snackbar, Alert, IconButton, Divider } from "@mui/material";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import MuiForm, { type Schema, type Field, type MuiFormHandle } from "@/components/ui/muiform";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import {
  fetchPaySchemeById,
  createPayScheme,
  updatePayScheme,
} from "@/utils/hrmsService";
import { usePaySchemeFormState } from "../hooks/usePaySchemeFormState";
import { usePaySchemeSetup } from "../hooks/usePaySchemeSetup";
import type { FormMode, PaySchemeStructureEntry, PaySchemeDetail } from "../types/paySchemeTypes";

function CreatePaySchemeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coId } = useSelectedCompanyCoId();

  const mode = (searchParams.get("mode") ?? "create") as FormMode;
  const schemeId = searchParams.get("id");

  const {
    formData,
    setFormData,
    saving,
    setSaving,
    isDisabled,
    updateField,
    addComponent,
    updateComponent,
    removeComponent,
    resetForm,
  } = usePaySchemeFormState({ mode });

  const { setupData, loading: setupLoading, allComponentOptions } = usePaySchemeSetup(coId);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  const formRef = useRef<MuiFormHandle>(null);

  // Load existing scheme for edit/view
  useEffect(() => {
    if (!coId || !schemeId || mode === "create") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPaySchemeById(coId, schemeId);
        if (cancelled || !res?.data) return;
        const detail = res.data as PaySchemeDetail;
        resetForm({
          code: detail.scheme.code ?? "",
          name: detail.scheme.name ?? "",
          description: detail.scheme.description ?? "",
          components: detail.structure ?? [],
        });
      } catch {
        setSnackbar({ open: true, message: "Failed to load pay scheme", severity: "error" });
      }
    })();
    return () => { cancelled = true; };
  }, [coId, schemeId, mode, resetForm]);

  // Header form schema
  const headerSchema = useMemo<Schema>(() => ({
    fields: [
      { name: "code", label: "Scheme Code", type: "text", required: true, grid: { xs: 12, sm: 4 } },
      { name: "name", label: "Scheme Name", type: "text", required: true, grid: { xs: 12, sm: 4 } },
      { name: "description", label: "Description", type: "textarea", grid: { xs: 12, sm: 4 } },
    ] satisfies Field[],
  }), []);

  const headerValues = useMemo(() => ({
    code: formData.code,
    name: formData.name,
    description: formData.description,
  }), [formData.code, formData.name, formData.description]);

  const handleHeaderChange = useCallback((vals: Record<string, unknown>) => {
    if (vals.code !== undefined) updateField("code", vals.code as string);
    if (vals.name !== undefined) updateField("name", vals.name as string);
    if (vals.description !== undefined) updateField("description", vals.description as string);
  }, [updateField]);

  // Component row schema
  const componentSchema = useMemo<Schema>(() => ({
    fields: [
      { name: "component_id", label: "Component", type: "select", options: allComponentOptions, required: true, grid: { xs: 12, sm: 4 } },
      { name: "amount", label: "Amount", type: "number", grid: { xs: 12, sm: 2 } },
      { name: "effective_from", label: "Effective From", type: "date", grid: { xs: 12, sm: 2 } },
      { name: "ends_on", label: "Ends On", type: "date", grid: { xs: 12, sm: 2 } },
      { name: "remarks", label: "Remarks", type: "text", grid: { xs: 12, sm: 2 } },
    ] satisfies Field[],
  }), [allComponentOptions]);

  const handleAddComponent = useCallback(() => {
    addComponent({
      component_id: 0,
      amount: 0,
      effective_from: null,
      ends_on: null,
      remarks: null,
    });
  }, [addComponent]);

  // Save
  const handleSave = useCallback(async () => {
    if (!coId) return;
    if (!formData.code || !formData.name) {
      setSnackbar({ open: true, message: "Code and Name are required", severity: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        components: formData.components.map((c) => ({
          component_id: c.component_id,
          amount: c.amount,
          effective_from: c.effective_from,
          ends_on: c.ends_on,
          remarks: c.remarks,
        })),
      };

      if (mode === "create") {
        const res = await createPayScheme(coId, payload);
        if (res?.error) throw new Error(res.error);
        setSnackbar({ open: true, message: "Pay scheme created", severity: "success" });
        router.push("/dashboardportal/hrms/payScheme");
      } else if (mode === "edit" && schemeId) {
        const res = await updatePayScheme(coId, schemeId, payload);
        if (res?.error) throw new Error(res.error);
        setSnackbar({ open: true, message: "Pay scheme updated", severity: "success" });
      }
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Save failed", severity: "error" });
    } finally {
      setSaving(false);
    }
  }, [coId, formData, mode, schemeId, setSaving, router]);

  return (
    <Box className="flex flex-col gap-6 p-4">
      <Box className="flex items-center justify-between">
        <Typography variant="h5">
          {mode === "create" ? "Create Pay Scheme" : mode === "edit" ? "Edit Pay Scheme" : "View Pay Scheme"}
        </Typography>
        <Box className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboardportal/hrms/payScheme")}>
            Back
          </Button>
          {!isDisabled && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : mode === "create" ? "Create" : "Update"}
            </Button>
          )}
        </Box>
      </Box>

      {/* Header form */}
      <Paper className="p-4">
        <Typography variant="subtitle1" className="mb-3 font-semibold">
          Scheme Details
        </Typography>
        <MuiForm
          ref={formRef}
          schema={headerSchema}
          initialValues={headerValues}
          mode={isDisabled ? "view" : "edit"}
          onValuesChange={handleHeaderChange}
          hideModeToggle
          hideSubmit
        />
      </Paper>

      {/* Structure Components */}
      <Paper className="p-4">
        <Box className="mb-3 flex items-center justify-between">
          <Typography variant="subtitle1" className="font-semibold">
            Structure Components
          </Typography>
          {!isDisabled && (
            <Button variant="outline" size="sm" onClick={handleAddComponent}>
              <Plus className="mr-1 h-4 w-4" /> Add Component
            </Button>
          )}
        </Box>

        <Divider className="mb-4" />

        {formData.components.length === 0 && (
          <Typography variant="body2" color="textSecondary">
            No components added yet. Click &quot;Add Component&quot; to add a pay structure entry.
          </Typography>
        )}

        <Box className="flex flex-col gap-4">
          {formData.components.map((comp, idx) => (
            <Box key={idx} className="relative rounded-md border p-3">
              <Box className="mb-2 flex items-center justify-between">
                <Typography variant="body2" color="textSecondary">
                  Component {idx + 1}
                </Typography>
                {!isDisabled && (
                  <IconButton size="small" aria-label="Remove component" onClick={() => removeComponent(idx)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </IconButton>
                )}
              </Box>
              <MuiForm
                schema={componentSchema}
                initialValues={{
                  component_id: comp.component_id ? String(comp.component_id) : "",
                  amount: comp.amount ?? "",
                  effective_from: comp.effective_from ?? "",
                  ends_on: comp.ends_on ?? "",
                  remarks: comp.remarks ?? "",
                }}
                mode={isDisabled ? "view" : "edit"}
                onValuesChange={(vals) => updateComponent(idx, vals as Partial<PaySchemeStructureEntry>)}
                hideModeToggle
                hideSubmit
              />
            </Box>
          ))}
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function CreatePaySchemePage() {
  return (
    <Suspense fallback={<Box className="p-4"><Typography>Loading...</Typography></Box>}>
      <CreatePaySchemeContent />
    </Suspense>
  );
}
