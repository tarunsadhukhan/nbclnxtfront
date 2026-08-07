"use client";

import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from "@mui/material";
import { Button } from "@/components/ui/button";
import { MuiForm, MuiFormMode } from "@/components/ui/muiform";
import type { Schema } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  editId?: string | number;
};

export default function CreateCostFactor({ open, onClose, onSaved, editId }: Props) {
  const formRef = React.useRef<any>(null);
  const [setupData, setSetupData] = React.useState<any>(null);
    const departmentsRef = React.useRef<any[]>([]);
    const schemaRef = React.useRef<Schema | null>(null);
    const [schemaVersion, setSchemaVersion] = React.useState(0);
  const [loadingSetup, setLoadingSetup] = React.useState(false);
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string } | null>(null);

  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editInitialValues, setEditInitialValues] = React.useState<Record<string, any> | null>(null);

  const loadSetup = async (editId?: string | number) => {
    setLoadingSetup(true);
    try {
      // gather branches from sidebar_selectedBranches and pass as query param
      const selectedBranchesRaw = localStorage.getItem("sidebar_selectedBranches");
      let branchesParam = "";
      if (selectedBranchesRaw) {
        try {
          const arr = JSON.parse(selectedBranchesRaw);
          if (Array.isArray(arr) && arr.length > 0) branchesParam = arr.join(",");
        } catch {
          // if parsing fails, ignore
        }
      }

  const selectedCompanyRaw = localStorage.getItem("sidebar_selectedCompany");
  const co_id = selectedCompanyRaw ? JSON.parse(selectedCompanyRaw).co_id : undefined;

  const setupParams = new URLSearchParams();
  if (branchesParam) setupParams.append("branches", branchesParam);
  if (typeof co_id !== "undefined") setupParams.append("co_id", String(co_id));

  // choose create vs edit setup endpoint
  let url: string;
  if (typeof editId !== 'undefined') {
    // pass costfactor id and other params
    setupParams.append("costfactorid", String(editId));
    url = `${apiRoutesPortalMasters.COSTFACTOR_EDIT_SETUP}?${setupParams.toString()}`;
  } else {
    url = setupParams.toString() ? `${apiRoutesPortalMasters.COSTFACTOR_CREATE_SETUP}?${setupParams.toString()}` : apiRoutesPortalMasters.COSTFACTOR_CREATE_SETUP;
  }
  const { data, error } = await fetchWithCookie(url, "GET");
      if (error) throw new Error(error);

      // filter branches returned by API to only those in sidebar_selectedBranches if provided
      let branchOptions: { label: string; value: string }[] = [];
      const branchList = data?.branches ?? data?.branch_list ?? [];

      if (branchList && Array.isArray(branchList)) {
        // map to {label,value} and optionally filter
        const mapped = branchList.map((b: any) => ({ label: String(b.branch_name ?? b.name ?? b.branch_name_display ?? b.branch_display ?? b.branch_name), value: String(b.branch_id ?? b.id) }));
        if (branchesParam) {
          const allowed = branchesParam.split(",");
          branchOptions = mapped.filter((m: any) => allowed.includes(String(m.value)));
        } else {
          branchOptions = mapped;
        }
      }

  const deptList = data?.departments ?? data?.department_list ?? data?.depts ?? [];
  // keep raw departments (with branch_id) for filtering later
  departmentsRef.current = Array.isArray(deptList) ? deptList : [];
  const deptOptions = Array.isArray(deptList) ? deptList.map((d: any) => ({ label: String(d.dept_desc ?? d.dept_name ?? d.department_name ?? d.name ?? d.dept_display ?? d.label ?? d.dept_name), value: String(d.dept_id ?? d.id), branch_id: d.branch_id })) : [];

      setSetupData({ branchOptions, deptOptions });

      // if edit setup returned existing values, set initial values accordingly
      if (typeof editId !== 'undefined') {
        setIsEditMode(true);
        const details = data?.costfactor_details ?? data?.data ?? data?.details ?? data?.cost_factor ?? {};
        const existing = Array.isArray(details) ? details[0] : details;
        const init = {
          branch_id: existing?.branch_id ?? branchOptions?.[0]?.value ?? "",
          cost_factor_name: existing?.cost_factor_name ?? existing?.cost_factor ?? existing?.name ?? "",
          cost_factor_desc: existing?.cost_factor_desc ?? existing?.description ?? existing?.desc ?? "",
          dept_id: existing?.dept_id ?? existing?.department ?? existing?.dept_id ?? "",
        };

        // set schema branch readOnly in edit mode and populate options
        if (schemaRef.current) {
          schemaRef.current.fields[0].readOnly = true;
          schemaRef.current.fields[0].options = branchOptions;
        }

        // set department options filtered by branch
        const filteredDeptOptions = deptOptions.filter((d: any) => {
          // deptOptions items have no branch_id here, filter using departmentsRef
          return (departmentsRef.current || []).some((dd: any) => String(dd.dept_id ?? dd.id) === String(d.value) && String(dd.branch_id) === String(init.branch_id));
        });
        if (schemaRef.current) schemaRef.current.fields[3].options = filteredDeptOptions;

        setEditInitialValues(init);
        setSchemaVersion((v) => v + 1);
      } else {
        setIsEditMode(false);
        setEditInitialValues(null);
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || "Failed to load setup" });
    } finally {
      setLoadingSetup(false);
    }
  };

  // clear edit state when closed
  React.useEffect(() => {
    if (!open) {
      setIsEditMode(false);
      setEditInitialValues(null);
      // reset schema readOnly flag
      if (schemaRef.current) schemaRef.current.fields[0].readOnly = false;
    }
  }, [open]);

  React.useEffect(() => {
    if (open) loadSetup(editId);
     
  }, [open, editId]);

  const initialValues = React.useMemo(() => (isEditMode && editInitialValues ? editInitialValues : { branch_id: setupData?.branchOptions?.[0]?.value ?? "" }), [setupData?.branchOptions, isEditMode, editInitialValues]);

  // create a stable schema object so updating field.options doesn't reset form values
  if (!schemaRef.current) {
    schemaRef.current = {
      title: "Create Cost Factor",
      fields: [
        { name: "branch_id", label: "Branch", type: "select", required: true, options: [] },
        { name: "cost_factor_name", label: "Cost Factor Name", type: "text", required: true },
        { name: "cost_factor_desc", label: "Cost Factor Description", type: "textarea", required: true },
        { name: "dept_id", label: "Department", type: "select", required: false, options: [] },
      ]
    };
  }

  // populate initial options when setupData becomes available
  React.useEffect(() => {
    if (!setupData || !schemaRef.current) return;
    schemaRef.current.fields[0].options = setupData.branchOptions ?? [];
    // initially show departments for first branch if present, otherwise all
    schemaRef.current.fields[3].options = setupData.deptOptions ?? [];
    setSchemaVersion((v) => v + 1);
     
  }, [setupData]);

  const handleSubmit = async (values: Record<string, any>, mode: MuiFormMode) => {
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : undefined;
      const payload = { ...values, co_id };
      if (isEditMode && typeof editId !== 'undefined') {
        // call edit endpoint
        const editPayload = { ...payload, costfactorid: editId };
        const { data, error, status } = await fetchWithCookie(apiRoutesPortalMasters.COSTFACTOR_EDIT, "POST", editPayload);
        if (status === 409) {
          const msg = (data && (data.message || data.error || data.detail || JSON.stringify(data))) || "Conflict: already exists";
          setSnackbar({ open: true, message: msg });
          return;
        }
        if (error) throw new Error(error);
        setSnackbar({ open: true, message: "Updated successfully" });
      } else {
        const { data, error, status } = await fetchWithCookie(apiRoutesPortalMasters.COSTFACTOR_CREATE, "POST", payload);
        if (status === 409) {
          const msg = (data && (data.message || data.error || data.detail || JSON.stringify(data))) || "Conflict: already exists";
          setSnackbar({ open: true, message: msg });
          return;
        }
        if (error) throw new Error(error);
        setSnackbar({ open: true, message: "Created successfully" });
      }
      onSaved?.();
      onClose();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || (isEditMode ? "Update failed" : "Create failed") });
    }
  };

  const handleValuesChange = (values: Record<string, any>) => {
    const selectedBranch = values.branch_id;
    if (!schemaRef.current) return;
    // filter departments by branch_id
    const allDepts = departmentsRef.current ?? [];
    const filtered = allDepts
      .filter((d: any) => (typeof selectedBranch === 'undefined' || selectedBranch === '' ? true : String(d.branch_id) === String(selectedBranch)))
      .map((d: any) => ({ label: String(d.dept_desc ?? d.dept_name ?? d.department_name ?? d.name), value: String(d.dept_id) }));

    const currentOptions = schemaRef.current.fields[3].options ?? [];
    const same = currentOptions.length === filtered.length && currentOptions.every((o: any, i: number) => String(o.value) === String(filtered[i]?.value));
    if (!same) {
      schemaRef.current.fields[3].options = filtered;
      // trigger re-render so MuiForm reads updated options (do not remount)
      setSchemaVersion((v) => v + 1);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Cost Factor</DialogTitle>
      <DialogContent>
        <div style={{ minHeight: 120 }}>
          <MuiForm
            ref={formRef}
            schema={schemaRef.current!}
            initialValues={initialValues}
            mode={isEditMode ? "edit" : "create"}
            submitLabel={isEditMode ? "Update" : undefined}
            hideSubmit={true}
            onSubmit={handleSubmit}
            onValuesChange={handleValuesChange}
            hideModeToggle={true}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant={null as any} onClick={onClose}>Cancel</Button>
        {/* render submit button here so we can control visibility/enabled state from parent */}
        <Button
          variant={null as any}
          onClick={() => formRef.current?.submit?.()}
          disabled={isEditMode ? !(formRef.current?.isDirty?.() ?? false) : false}
        >
          {isEditMode ? "Update" : "Create"}
        </Button>
      </DialogActions>
      <Snackbar open={!!snackbar?.open} autoHideDuration={6000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setSnackbar(null)} sx={{ width: '100%' }}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
