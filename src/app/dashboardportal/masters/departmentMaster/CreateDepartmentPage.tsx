"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogContent, DialogTitle, MenuItem, TextField, FormControlLabel, Switch, CircularProgress, FormHelperText } from "@mui/material";
import { apiRoutesPortalMasters } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";

interface CreateDepartmentProps {
  open?: boolean;
  onClose?: () => void;
  // optional rows from the parent page to validate duplicates against
  existingRows?: any[];
}

export default function CreateDepartmentPage({ open = true, onClose, existingRows = [] }: CreateDepartmentProps) {
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<any>(null);
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [form, setForm] = useState({ dept_name: "", dept_code: "", active: true, branch_id: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
        const sidebar_selectedBranches = localStorage.getItem("sidebar_selectedBranches");
        const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
        const params = new URLSearchParams();
        if (co_id) params.append("co_id", co_id);
        if (sidebar_selectedBranches) params.append("branch_id", sidebar_selectedBranches);
        const url = `${apiRoutesPortalMasters.DEPT_MASTER_CREATE_SETUP}?${params}`;
        const { data, error } = await fetchWithCookie(url, "GET") as any;
        if (error || !data) {
          throw new Error(error || "Failed to load setup");
        }
        // candidate can be under data.data or data
        const candidate = data?.data ?? data;
        const branches = candidate?.branchs || candidate?.branches || candidate?.branch_list || candidate?.branch || (Array.isArray(candidate) ? candidate : []);
        const rawBranches = Array.isArray(branches) ? branches : branches ? [branches] : [];
        const normalized = rawBranches
          .map((b: any) => {
            const id = b?.branch_id ?? b?.id ?? b?.value ?? b?.branchId ?? "";
            const label = b?.branch_name ?? b?.branch_desc ?? b?.name ?? b?.label ?? String(id);
            return { id: String(id), label, raw: b };
          })
          .filter((x: any) => x.id);
        setBranchOptions(normalized);
        if (normalized.length > 0) setForm((f) => ({ ...f, branch_id: normalized[0].id }));
        setSetupData(candidate);
      } catch (err: any) {
        // Surface error to UI instead of logging to console (Stage A)
        setError(err?.message || String(err));
        setBranchOptions([]);
        setSetupData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Validate on changes to setupData or form.branch_id to reset field errors
  useEffect(() => {
    setNameError(null);
    setCodeError(null);
  }, [setupData, form.branch_id]);

  const getCandidates = (propsExistingRows?: any[]) => {
    if (propsExistingRows && propsExistingRows.length) return propsExistingRows;
    const candidates = (setupData?.departments || setupData?.data || []) as any[];
    return Array.isArray(candidates) ? candidates : [];
  };

  const validateName = (propsExistingRows?: any[]) => {
    const name = form.dept_name?.trim();
    if (!name) {
      setNameError("Department name is required");
      return false;
    }
    const branchId = String(form.branch_id ?? "");
    const candidates = getCandidates(propsExistingRows);
    const exists = candidates.some((d: any) => String(d.dept_name ?? d.dept_name_display ?? "").trim().toLowerCase() === name.toLowerCase() && String(d.branch_id ?? d.branch ?? "") === branchId);
    if (exists) {
      setNameError("Department name already exists");
      return false;
    }
    setNameError(null);
    return true;
  };

  const validateCode = (propsExistingRows?: any[]) => {
    const code = form.dept_code?.trim();
    if (!code) {
      setCodeError("Department code is required");
      return false;
    }
    const branchId = String(form.branch_id ?? "");
    const candidates = getCandidates(propsExistingRows);
    const exists = candidates.some((d: any) => String(d.dept_code ?? "").trim().toLowerCase() === code.toLowerCase() && String(d.branch_id ?? d.branch ?? "") === branchId);
    if (exists) {
      setCodeError("Department code already exists");
      return false;
    }
    setCodeError(null);
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({ ...prev, [name!]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
    setError(null);
    // clear per-field errors while typing
    if (name === 'dept_name') setNameError(null);
    if (name === 'dept_code') setCodeError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  // final validation: use existingRows if provided
  const okName = validateName(existingRows);
  const okCode = validateCode(existingRows);
    if (!okName || !okCode) return setError("Fix validation errors");
    setSubmitting(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const payload: any = {
        co_id,
        dept_name: form.dept_name,
        dept_code: form.dept_code,
        active: form.active ? 1 : 0,
        branch_id: form.branch_id,
      };
      const { data, error } = await fetchWithCookie(apiRoutesPortalMasters.DEPT_MASTER_CREATE, "POST", payload) as any;
      if (error || !data) throw new Error(error || "Create failed");
      // success
      if (onClose) onClose();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const FormContent = (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, minWidth: 350 }}>
      <TextField name="dept_name" label="Department Name" value={form.dept_name} onChange={handleChange} onBlur={() => validateName(existingRows)} error={!!nameError} helperText={nameError ?? undefined} fullWidth margin="normal" required />
      <TextField name="dept_code" label="Department Code" value={form.dept_code} onChange={handleChange} onBlur={() => validateCode(existingRows)} error={!!codeError} helperText={codeError ?? undefined} fullWidth margin="normal" required />
      <TextField select label="Branch" name="branch_id" value={form.branch_id} onChange={handleChange} fullWidth margin="normal">
        {branchOptions.map((b: any) => (
          <MenuItem key={b.id} value={b.id}>{b.label}</MenuItem>
        ))}
      </TextField>
      <FormControlLabel control={<Switch checked={!!form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />} label="Active" />
  {nameError && <FormHelperText error>{nameError}</FormHelperText>}
  {codeError && <FormHelperText error>{codeError}</FormHelperText>}
      {error && <FormHelperText error>{error}</FormHelperText>}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
  {typeof open === 'boolean' && <Button onClick={() => onClose && onClose()} color="secondary" sx={{ mr: 2 }} disabled={submitting}>Cancel</Button>}
  <Button type="submit" variant="contained" color="primary" disabled={submitting || loading || !!nameError || !!codeError}>{submitting ? <CircularProgress size={20} /> : 'Create'}</Button>
      </Box>
    </Box>
  );

  return (
    <>
      {typeof open === 'boolean' ? (
        <Dialog open={open} onClose={() => onClose && onClose()} maxWidth="sm" fullWidth>
          <DialogTitle>Create Department</DialogTitle>
          <DialogContent>{loading ? <CircularProgress /> : FormContent}</DialogContent>
        </Dialog>
      ) : (
        <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
          <DialogTitle>Create Department</DialogTitle>
          <DialogContent>{loading ? <CircularProgress /> : FormContent}</DialogContent>
        </Box>
      )}
    </>
  );
}
