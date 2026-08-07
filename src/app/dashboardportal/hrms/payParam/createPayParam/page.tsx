"use client";

import React, { Suspense, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Typography, Paper, Snackbar, Alert } from "@mui/material";
import { Button } from "@/components/ui/button";
import MuiForm, { type Schema, type Field, type MuiFormHandle } from "@/components/ui/muiform";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import {
  fetchPayParamCreateSetup,
  createPayParam,
  updatePayParam,
} from "@/utils/hrmsService";
import type { FormMode, PayParamSetupData, Option } from "../../payScheme/types/paySchemeTypes";

function CreatePayParamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coId } = useSelectedCompanyCoId();
  const formRef = useRef<MuiFormHandle>(null);

  const mode = (searchParams.get("mode") ?? "create") as FormMode;
  const periodId = searchParams.get("id");
  const isDisabled = mode === "view";

  const [formValues, setFormValues] = useState({
    from_date: "",
    to_date: "",
    payscheme_id: "",
    branch_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [setupData, setSetupData] = useState<PayParamSetupData | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  // Load setup data
  useEffect(() => {
    if (!coId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPayParamCreateSetup(coId);
        if (!cancelled && res?.data) setSetupData(res.data as PayParamSetupData);
      } catch {
        /* silent */
      }
    })();
    return () => { cancelled = true; };
  }, [coId]);

  const paySchemeOptions = useMemo<Option[]>(() => setupData?.pay_schemes ?? [], [setupData]);
  const branchOptions = useMemo<Option[]>(() => setupData?.branches ?? [], [setupData]);

  const schema = useMemo<Schema>(() => ({
    fields: [
      { name: "from_date", label: "From Date", type: "date", required: true, grid: { xs: 12, sm: 6 } },
      { name: "to_date", label: "To Date", type: "date", required: true, grid: { xs: 12, sm: 6 } },
      { name: "payscheme_id", label: "Pay Scheme", type: "select", options: paySchemeOptions, required: true, grid: { xs: 12, sm: 6 } },
      { name: "branch_id", label: "Branch", type: "select", options: branchOptions, grid: { xs: 12, sm: 6 } },
    ] satisfies Field[],
  }), [paySchemeOptions, branchOptions]);

  const handleChange = useCallback((vals: Record<string, unknown>) => {
    setFormValues((prev) => ({ ...prev, ...vals }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!coId) return;
    if (!formValues.from_date || !formValues.to_date || !formValues.payscheme_id) {
      setSnackbar({ open: true, message: "From Date, To Date, and Pay Scheme are required", severity: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        from_date: formValues.from_date,
        to_date: formValues.to_date,
        payscheme_id: Number(formValues.payscheme_id),
        branch_id: formValues.branch_id ? Number(formValues.branch_id) : null,
      };

      if (mode === "create") {
        const res = await createPayParam(coId, payload);
        if (res?.error) throw new Error(res.error);
        setSnackbar({ open: true, message: "Pay period created", severity: "success" });
        router.push("/dashboardportal/hrms/payParam");
      } else if (mode === "edit" && periodId) {
        const res = await updatePayParam(coId, periodId, payload);
        if (res?.error) throw new Error(res.error);
        setSnackbar({ open: true, message: "Pay period updated", severity: "success" });
      }
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Save failed", severity: "error" });
    } finally {
      setSaving(false);
    }
  }, [coId, formValues, mode, periodId, router]);

  return (
    <Box className="flex flex-col gap-6 p-4">
      <Box className="flex items-center justify-between">
        <Typography variant="h5">
          {mode === "create" ? "Create Pay Period" : mode === "edit" ? "Edit Pay Period" : "View Pay Period"}
        </Typography>
        <Box className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboardportal/hrms/payParam")}>
            Back
          </Button>
          {!isDisabled && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : mode === "create" ? "Create" : "Update"}
            </Button>
          )}
        </Box>
      </Box>

      <Paper className="p-4">
        <MuiForm
          ref={formRef}
          schema={schema}
          initialValues={formValues}
          mode={isDisabled ? "view" : "edit"}
          onValuesChange={handleChange}
          hideModeToggle
          hideSubmit
        />
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

export default function CreatePayParamPage() {
  return (
    <Suspense fallback={<Box className="p-4"><Typography>Loading...</Typography></Box>}>
      <CreatePayParamContent />
    </Suspense>
  );
}
