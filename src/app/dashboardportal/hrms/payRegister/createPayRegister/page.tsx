"use client";

import React, { Suspense, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, Paper, Snackbar, Alert } from "@mui/material";
import { Button } from "@/components/ui/button";
import MuiForm, { type Schema, type Field, type MuiFormHandle } from "@/components/ui/muiform";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  fetchPayRegisterCreateSetup,
  createPayRegister,
} from "@/utils/hrmsService";
import type { PayRegisterSetupData, Option } from "../types/payRegisterTypes";

function CreatePayRegisterContent() {
  const router = useRouter();
  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches, selectedCompany } = useSidebarContext();
  const formRef = useRef<MuiFormHandle>(null);

  // Branch is driven by the branch selected in the left sidebar.
  const sidebarBranchId = selectedBranches.length > 0 ? String(selectedBranches[0]) : "";

  const [formValues, setFormValues] = useState({
    from_date: "",
    to_date: "",
    pay_scheme_id: "",
    branch_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [setupData, setSetupData] = useState<PayRegisterSetupData | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  // Load setup data (pay schemes + branches)
  useEffect(() => {
    if (!coId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPayRegisterCreateSetup(coId);
        const setup = (res?.data as { data?: PayRegisterSetupData } | null)?.data;
        if (!cancelled && setup) setSetupData(setup);
      } catch {
        /* silent */
      }
    })();
    return () => { cancelled = true; };
  }, [coId]);

  const paySchemeOptions = useMemo<Option[]>(() => setupData?.pay_schemes ?? [], [setupData]);

  // Branch options come from the sidebar-selected company's branches (which carry
  // their names), so the field is populated with the branch the user picked in the
  // left sidebar rather than depending on the setup endpoint.
  const branchOptions = useMemo<Option[]>(
    () =>
      (selectedCompany?.branches ?? []).map((b) => ({
        label: b.branch_name,
        value: String(b.branch_id),
      })),
    [selectedCompany],
  );

  // Push the sidebar-selected branch into the form once branch options are available
  // (the Autocomplete can only display a value present in its options).
  useEffect(() => {
    if (!sidebarBranchId) return;
    formRef.current?.setValue("branch_id", sidebarBranchId);
    setFormValues((prev) => (prev.branch_id === sidebarBranchId ? prev : { ...prev, branch_id: sidebarBranchId }));
  }, [sidebarBranchId, branchOptions]);

  const schema = useMemo<Schema>(() => ({
    fields: [
      { name: "from_date", label: "From Date", type: "date", required: true, grid: { xs: 12, sm: 6, md: 3 } },
      { name: "to_date", label: "To Date", type: "date", required: true, grid: { xs: 12, sm: 6, md: 3 } },
      { name: "pay_scheme_id", label: "Pay Scheme", type: "select", options: paySchemeOptions, required: true, grid: { xs: 12, sm: 6, md: 3 } },
      { name: "branch_id", label: "Branch", type: "select", options: branchOptions, required: true, grid: { xs: 12, sm: 6, md: 3 } },
    ] satisfies Field[],
  }), [paySchemeOptions, branchOptions]);

  const handleChange = useCallback((vals: Record<string, unknown>) => {
    setFormValues((prev) => ({ ...prev, ...vals }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!coId) return;
    if (!formValues.from_date) {
      setSnackbar({ open: true, message: "Please enter the From Date", severity: "error" });
      return;
    }
    if (!formValues.to_date) {
      setSnackbar({ open: true, message: "Please enter the To Date", severity: "error" });
      return;
    }
    if (!formValues.pay_scheme_id) {
      setSnackbar({ open: true, message: "Please select the Pay Scheme", severity: "error" });
      return;
    }
    if (!formValues.branch_id) {
      setSnackbar({ open: true, message: "Please select the Branch", severity: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        from_date: formValues.from_date,
        to_date: formValues.to_date,
        // Backend (pay_register_create) reads `payscheme_id`, not `pay_scheme_id`.
        payscheme_id: Number(formValues.pay_scheme_id),
        branch_id: Number(formValues.branch_id),
      };
      const res = await createPayRegister(coId, payload);
      if (res?.error) throw new Error(res.error);
      // Creation also runs payroll processing; surface the outcome.
      const data = (res?.data as { data?: { processing?: { records_created?: number }; processing_error?: string } } | null)?.data;
      const recordsCreated = data?.processing?.records_created;
      const processingError = data?.processing_error;
      if (processingError) {
        setSnackbar({ open: true, message: `Pay register created, but payroll processing failed: ${processingError}`, severity: "error" });
      } else if (typeof recordsCreated === "number") {
        setSnackbar({ open: true, message: `Pay register created — ${recordsCreated} salary record${recordsCreated === 1 ? "" : "s"} generated`, severity: "success" });
      } else {
        setSnackbar({ open: true, message: "Pay register created successfully", severity: "success" });
      }
      router.push("/dashboardportal/hrms/payRegister");
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Failed to create pay register", severity: "error" });
    } finally {
      setSaving(false);
    }
  }, [coId, formValues, router]);

  return (
    <Box className="flex min-h-screen flex-col gap-6 bg-gray-50 p-8">
      <Box className="flex flex-col gap-1">
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          Create Pay Register
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create a new pay register period
        </Typography>
      </Box>

      <Box className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
        <Box className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={() => router.push("/dashboardportal/hrms/payRegister")}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Creating..." : "Add"}
          </Button>
        </Box>
      </Box>

      <Paper className="p-4">
        <MuiForm
          ref={formRef}
          schema={schema}
          initialValues={formValues}
          mode="edit"
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

export default function CreatePayRegisterPage() {
  return (
    <Suspense fallback={<Box className="p-4"><Typography>Loading...</Typography></Box>}>
      <CreatePayRegisterContent />
    </Suspense>
  );
}
