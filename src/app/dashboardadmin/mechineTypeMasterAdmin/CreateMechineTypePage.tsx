"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, FormControlLabel, Switch, CircularProgress, FormHelperText } from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

interface CreateMechineTypeProps {
  open?: boolean;
  onClose?: () => void;
  existingRows?: any[];
}

export default function CreateMechineTypePage({ open = true, onClose, existingRows = [] }: CreateMechineTypeProps) {
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<any>(null);
  const [form, setForm] = useState({ mechine_type: "", active: true });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
              const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
              const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
              const selectedBranches = localStorage.getItem("sidebar_selectedBranches");
              console.log('localstorage', selectedBranches);
              let branch_ids = "";
              if (selectedBranches) {
                  try {
                      const parsed = JSON.parse(selectedBranches);
                      console.log('parsed selectedBranches', parsed);
                      branch_ids=parsed
                      if (Array.isArray(parsed)) {
                          // support array of objects [{ branch_id: 1 }] OR array of primitives [1,2] OR mixed
                          const ids = parsed
                              .map((b: any) => {
                                  if (b && typeof b === 'object') return b.branch_id ?? b.id ?? b.value ?? '';
                                  // allow numeric 0 as valid id
                                  if (b === 0) return '0';
                                  if (b) return String(b);
                                  return '';
                              })
                              .map(String)
                              .filter(Boolean);
                          branch_ids = ids.join(',');
                          console.log('branch_ids', branch_ids);
                      } 
                  } catch (e) {
                      console.warn("Failed to parse selectedBranches:", e);
                  }
              }
              const queryParams = new URLSearchParams({
                  branch_id: branch_ids
              });
        const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.MECHINE_TYPE_MASTER_TABLE}?${queryParams}`, "GET") as any;
        if (error || !data) throw new Error(error || "Failed to load setup");
  const candidate = data?.data ?? data;
  setSetupData(candidate);
      } catch (err: any) {
        console.warn("Failed to load mechine create setup:", err?.message || err);
        setSetupData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => { setNameError(null); }, [setupData]);

  const getCandidates = (propsExistingRows?: any[]) => {
    if (propsExistingRows && propsExistingRows.length) return propsExistingRows;
    const candidates = (setupData?.mechines || setupData?.data || []) as any[];
    return Array.isArray(candidates) ? candidates : [];
  };

  const validateName = (propsExistingRows?: any[]) => {
    const name = form.mechine_type?.trim();
    if (!name) { setNameError("Machine type is required"); return false; }
  const branchId = String((form as any).branch_id ?? "");
  const deptId = String((form as any).dept_id ?? "");
    const candidates = getCandidates(propsExistingRows);
    const exists = candidates.some((d: any) => {
      const candidateName = String(d.mechine_type ?? d.mechine_type_display ?? "").trim().toLowerCase();
      if (candidateName !== name.toLowerCase()) return false;
      // if branchId/deptId provided, require them to match; otherwise ignore those filters
      if (branchId && String(d.branch_id ?? d.branch ?? "") !== branchId) return false;
      if (deptId && String(d.dept_id ?? d.dept ?? "") !== deptId) return false;
      return true;
    });
    if (exists) { setNameError("Machine type already exists"); return false; }
    setNameError(null); return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({ ...prev, [name!]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value }));
    setError(null);
    if (name === 'mechine_type') setNameError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const okName = validateName(existingRows);
    if (!okName) return setError("Fix validation errors");
    setSubmitting(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const payload: any = { mechine_type: form.mechine_type, active: form.active ? 1 : 0  };
      const { data, error } = await fetchWithCookie(apiRoutesPortalMasters.MECHINE_TYPE_MASTER_CREATE, "POST", payload) as any;
      if (error || !data) throw new Error(error || "Create failed");
      if (onClose) onClose();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally { setSubmitting(false); }
  };

  const FormContent = (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, minWidth: 350 }}>
  {/* Branch and Department removed as requested */}
      <TextField name="mechine_type" label="Machine Type" value={form.mechine_type} onChange={handleChange}
        onBlur={(e) => { const trimmed = String(e.target.value ?? "").trim(); setForm((f) => ({ ...f, mechine_type: trimmed })); validateName(existingRows); }}
        error={!!nameError} helperText={nameError ?? undefined} fullWidth margin="normal" required />
      <FormControlLabel control={<Switch checked={!!form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />} label="Active" />
      {nameError && <FormHelperText error>{nameError}</FormHelperText>}
      {error && <FormHelperText error>{error}</FormHelperText>}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        {typeof open === 'boolean' && <Button onClick={() => onClose && onClose()} color="secondary" sx={{ mr: 2 }} disabled={submitting}>Cancel</Button>}
        <Button type="submit" variant="contained" color="primary" disabled={submitting || loading || !!nameError}>{submitting ? <CircularProgress size={20} /> : 'Create'}</Button>
      </Box>
    </Box>
  );

  return (
    <>
      {typeof open === 'boolean' ? (
        <Dialog open={open} onClose={() => onClose && onClose()} maxWidth="sm" fullWidth>
          <DialogTitle>Create Machine Type</DialogTitle>
          <DialogContent>{loading ? <CircularProgress /> : FormContent}</DialogContent>
        </Dialog>
      ) : (
        <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
          <DialogTitle>Create Machine Type</DialogTitle>
          <DialogContent>{loading ? <CircularProgress /> : FormContent}</DialogContent>
        </Box>
      )}
    </>
  );
}
