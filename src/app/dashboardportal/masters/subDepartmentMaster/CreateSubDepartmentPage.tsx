"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogContent, DialogTitle, MenuItem, TextField, FormControlLabel, Switch, CircularProgress, FormHelperText } from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
 
interface CreateSubDepartmentProps {
  open?: boolean;
  onClose?: () => void;
  existingRows?: any[];
}

export default function CreateSubDepartmentPage({ open = true, onClose, existingRows = [] }: CreateSubDepartmentProps) {
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<any>(null);
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<any[]>([]);
  const [allDepartmentOptions, setAllDepartmentOptions] = useState<any[]>([]);
  const [form, setForm] = useState({ subdept_name: "", subdept_code: "", active: true, branch_id: "", dept_id: "", order_by: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [orderByError, setOrderByError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
            const sidebar_selectedBranches = localStorage.getItem("sidebar_selectedBranches");
            const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
    const params = sidebar_selectedBranches;
      // debug: sidebar_selectedBranches value
      void sidebar_selectedBranches;
      const url = `${apiRoutesPortalMasters.SUBDEPT_MASTER_CREATE_SETUP}?${params}`;
            const { data, error } = await fetchWithCookie(url, "GET") as any;
        if (error || !data) throw new Error(error || "Failed to load setup");
        const candidate = data?.data ?? data;
        const branches = candidate?.branchs || candidate?.branches || candidate?.branch_list || candidate?.branch || (Array.isArray(candidate) ? candidate : []);
        const depts = candidate?.departments || candidate?.dept_list || candidate?.dept || [];
        const rawBranches = Array.isArray(branches) ? branches : branches ? [branches] : [];
        const normalizedBranches = rawBranches
          .map((b: any) => ({ id: String(b?.branch_id ?? b?.id ?? b?.value ?? ""), label: b?.branch_name ?? b?.branch_desc ?? b?.name ?? String(b?.branch_id ?? b?.id ?? ""), raw: b }))
          .filter((x: any) => x.id);
        setBranchOptions(normalizedBranches);
        const rawDepts = Array.isArray(depts) ? depts : depts ? [depts] : [];
        const normalizedDepts = rawDepts.map((d: any) => ({ id: String(d?.dept_id ?? d?.id ?? d?.value ?? ""), label: d?.dept_name ?? d?.dept_name_display ?? d?.name ?? String(d?.dept_id ?? d?.id ?? ""), raw: d }));
        setAllDepartmentOptions(normalizedDepts);
        // If departments include branch linkage, prefilter to the first branch; otherwise expose all
        if (normalizedBranches.length > 0) {
          const firstBranchId = normalizedBranches[0].id;
          const filtered = normalizedDepts.filter((d: any) => String(d.raw?.branch_id ?? d.raw?.branch ?? "") === String(firstBranchId));
          setDepartmentOptions(filtered.length > 0 ? filtered : normalizedDepts);
          setForm((f) => ({ ...f, branch_id: firstBranchId, dept_id: (filtered.length > 0 ? filtered[0].id : (normalizedDepts[0]?.id ?? "")) }));
        } else {
          setDepartmentOptions(normalizedDepts);
          if (normalizedDepts.length > 0) setForm((f) => ({ ...f, dept_id: normalizedDepts[0].id }));
        }
        setSetupData(candidate);
      } catch (err: any) {
        // Surface the error to the form instead of logging to console so it can be handled in UI (Stage A cleanup)
        setError(err?.message || String(err));
        setBranchOptions([]);
        setDepartmentOptions([]);
        setSetupData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setNameError(null);
    setCodeError(null);
    setOrderByError(null);
  }, [setupData, form.branch_id, form.dept_id]);

  const getCandidates = (propsExistingRows?: any[]) => {
    if (propsExistingRows && propsExistingRows.length) return propsExistingRows;
    const candidates = (setupData?.subdepartments || setupData?.data || []) as any[];
    return Array.isArray(candidates) ? candidates : [];
  };

  const validateName = (propsExistingRows?: any[]) => {
    const name = form.subdept_name?.trim();
    if (!name) {
      setNameError("Subdepartment name is required");
      return false;
    }
    const branchId = String(form.branch_id ?? "");
    const deptId = String(form.dept_id ?? "");
    const candidates = getCandidates(propsExistingRows);
    const exists = candidates.some((d: any) => String(d.subdept_name ?? d.subdept_name_display ?? "").trim().toLowerCase() === name.toLowerCase() && String(d.branch_id ?? d.branch ?? "") === branchId && String(d.dept_id ?? d.dept ?? "") === deptId);
    if (exists) {
      setNameError("Subdepartment name already exists");
      return false;
    }
    setNameError(null);
    return true;
  };

  const validateCode = (propsExistingRows?: any[]) => {
    const code = form.subdept_code?.trim();
    if (!code) {
      setCodeError("Subdepartment code is required");
      return false;
    }
    const branchId = String(form.branch_id ?? "");
    const deptId = String(form.dept_id ?? "");
    const candidates = getCandidates(propsExistingRows);
    const exists = candidates.some((d: any) => String(d.subdept_code ?? "").trim().toLowerCase() === code.toLowerCase() && String(d.branch_id ?? d.branch ?? "") === branchId && String(d.dept_id ?? d.dept ?? "") === deptId);
    if (exists) {
      setCodeError("Subdepartment code already exists");
      return false;
    }
    setCodeError(null);
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({ ...prev, [name!]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
    setError(null);
    if (name === 'subdept_name') setNameError(null);
    if (name === 'subdept_code') setCodeError(null);
    if (name === 'order_by') setOrderByError(null);
    // when branch changes, filter departments to those belonging to branch (if raw data has branch linkage)
    if (name === 'branch_id') {
      const b = String(value);
      // 1) Prefer departments nested under the selected branch raw object (if present)
      const branchObj = branchOptions.find((br) => String(br.id) === String(b));
      let newDepts: any[] = [];
      if (branchObj && branchObj.raw) {
        const nested = branchObj.raw.departments || branchObj.raw.dept_list || branchObj.raw.depts || branchObj.raw.department_list || branchObj.raw.department;
        if (nested) {
          const rawNested = Array.isArray(nested) ? nested : [nested];
          newDepts = rawNested.map((d: any) => ({ id: String(d?.dept_id ?? d?.id ?? d?.value ?? ""), label: d?.dept_name ?? d?.dept_name_display ?? d?.name ?? String(d?.dept_id ?? d?.id ?? ""), raw: d }));
        }
      }
      // 2) Fallback: filter flat list of all departments
      if (!newDepts.length && allDepartmentOptions && allDepartmentOptions.length) {
        newDepts = allDepartmentOptions.filter((d: any) => String(d.raw?.branch_id ?? d.raw?.branch ?? "") === String(b));
      }
      // 3) As last resort, use all departments
      if (!newDepts.length) newDepts = allDepartmentOptions;
      setDepartmentOptions(newDepts);
      if (newDepts.length > 0) setForm((f) => ({ ...f, dept_id: newDepts[0].id }));
    }
  };

  const validateOrderBy = (): boolean => {
    const val = form.order_by?.toString().trim();
    if (!val) {
      setOrderByError("Order By is required");
      return false;
    }
    const num = Number(val);
    if (!Number.isInteger(num) || num < 0) {
      setOrderByError("Order By must be a non-negative integer");
      return false;
    }
    setOrderByError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const okName = validateName(existingRows);
    const okCode = validateCode(existingRows);
    const okOrder = validateOrderBy();
    if (!okName || !okCode || !okOrder) return setError("Fix validation errors");
    setSubmitting(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const payload: any = {
        co_id,
        subdept_name: form.subdept_name,
        subdept_code: form.subdept_code,
        active: form.active ? 1 : 0,
        branch_id: form.branch_id,
        dept_id: form.dept_id,
        order_by: form.order_by,
      };
  const { data, error: apiError } = await fetchWithCookie(apiRoutesPortalMasters.SUBDEPT_MASTER_CREATE, "POST", payload) as any;
      if (apiError || !data) {
        // Extract meaningful error from API response
        const errMsg = typeof apiError === "string" ? apiError
          : apiError?.detail ?? apiError?.message ?? data?.detail ?? "Create failed";
        throw new Error(errMsg);
      }
      if (onClose) onClose();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const FormContent = (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, minWidth: 350 }}>
      <TextField select label="Branch" name="branch_id" value={form.branch_id} onChange={handleChange} fullWidth margin="normal">
        {branchOptions.map((b: any) => (<MenuItem key={b.id} value={b.id}>{b.label}</MenuItem>))}
      </TextField>
      <TextField select label="Department" name="dept_id" value={form.dept_id} onChange={handleChange} fullWidth margin="normal">
        {departmentOptions.map((d: any) => (<MenuItem key={d.id} value={d.id}>{d.label}</MenuItem>))}
      </TextField>
      <TextField name="subdept_name" label="Subdepartment" value={form.subdept_name} onChange={handleChange} onBlur={() => validateName(existingRows)} error={!!nameError} helperText={nameError ?? undefined} fullWidth margin="normal" required />
      <TextField name="subdept_code" label="Subdepartment Code" value={form.subdept_code} onChange={handleChange} onBlur={() => validateCode(existingRows)} error={!!codeError} helperText={codeError ?? undefined} fullWidth margin="normal" required />
      <TextField name="order_by" label="Order By" type="number" value={form.order_by} onChange={handleChange} onBlur={() => validateOrderBy()} error={!!orderByError} helperText={orderByError ?? undefined} fullWidth margin="normal" required />
      <FormControlLabel control={<Switch checked={!!form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />} label="Active" />
      {nameError && <FormHelperText error>{nameError}</FormHelperText>}
      {codeError && <FormHelperText error>{codeError}</FormHelperText>}
      {error && <FormHelperText error>{error}</FormHelperText>}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        {typeof open === 'boolean' && <Button onClick={() => onClose && onClose()} color="secondary" sx={{ mr: 2 }} disabled={submitting}>Cancel</Button>}
        <Button type="submit" variant="contained" color="primary" disabled={submitting || loading || !!nameError || !!codeError || !!orderByError}>{submitting ? <CircularProgress size={20} /> : 'Create'}</Button>
      </Box>
    </Box>
  );

  return (
    <>
      {typeof open === 'boolean' ? (
        <Dialog open={open} onClose={() => onClose && onClose()} maxWidth="sm" fullWidth>
          <DialogTitle>Create Subdepartment</DialogTitle>
          <DialogContent>{loading ? <CircularProgress /> : FormContent}</DialogContent>
        </Dialog>
      ) : (
        <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
          <DialogTitle>Create Subdepartment</DialogTitle>
          <DialogContent>{loading ? <CircularProgress /> : FormContent}</DialogContent>
        </Box>
      )}
    </>
  );
}
