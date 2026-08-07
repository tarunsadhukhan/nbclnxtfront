"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogContent, DialogTitle, MenuItem, TextField, FormControlLabel, Switch, CircularProgress, FormHelperText, Autocomplete } from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

interface Props { open?: boolean; onClose?: (saved?: boolean) => void; existingRows?: any[]; readOnly?: boolean; initialValues?: any; isEdit?: boolean; project_id?: string | number }

export default function CreateProjectPage({ open = false, onClose, existingRows = [], readOnly = false, initialValues = null, isEdit = false, project_id }: Props) {
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<any>(null);
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<any[]>([]);
  const [partyOptions, setPartyOptions] = useState<any[]>([]);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [allDepartments, setAllDepartments] = useState<any[]>([]);
  const [form, setForm] = useState({ branch_id: "", dept_id: "", party_id: "", prj_name: "", prj_desc: "", prj_start_dt: "", prj_end_dt: "", status_id: "1", active: true });
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

//        const params = new URLSearchParams({ co_id, branch_id: branch_ids });
        const url = `${apiRoutesPortalMasters.PROJECT_MASTER_CREATE_SETUP}?${params}`;
        const { data, error } = await fetchWithCookie(url, "GET") as any;
        if (error || !data) throw new Error(error || 'Failed to load setup');
        const candidate = data?.data ?? data;
        const branches = candidate?.branchs || candidate?.branches || candidate?.branch_list || candidate?.branch || [];
        const depts = candidate?.departments || candidate?.dept_list || candidate?.dept || [];
        const parties = candidate?.parties || candidate?.party_list || candidate?.party || [];
        const statuses = candidate?.statuses || candidate?.status_list || candidate?.status || [{ id: '1', name: 'OPEN' }, { id: '0', name: 'DEACTIVE' }];

        const rawBranches = Array.isArray(branches) ? branches : branches ? [branches] : [];
        const normalizedBranches = rawBranches.map((b:any)=> ({ id: String(b.branch_id ?? b.id ?? b.value ?? ''), label: b.branch_name ?? b.branch_desc ?? b.name, raw: b })).filter((x:any)=>x.id);

        const rawDepts = Array.isArray(depts) ? depts : (depts ? [depts] : []);
        const normalizedDepts = rawDepts.map((d:any)=> ({ id: String(d.dept_id ?? d.id ?? d.value ?? ''), label: d.dept_name ?? d.dept_name_display ?? d.name, raw: d })).filter((x:any)=>x.id);

        const rawParties = Array.isArray(parties) ? parties : (parties ? [parties] : []);
        const normalizedParties = rawParties.map((p:any)=> ({ id: String(p.party_id ?? p.id ?? p.value ?? ''), label: p.party_name ?? p.name ?? p.display, raw: p })).filter((x:any)=>x.id);

        const rawStatuses = Array.isArray(statuses) ? statuses : (statuses ? [statuses] : []);
        const normalizedStatuses = rawStatuses.map((s:any)=> ({ id: String(s.status_id ?? s.id ?? s.value ?? s.status_id ?? ''), label: s.status_name ?? s.name ?? s.display ?? (s.id === '1' ? 'OPEN' : (s.id === '0' ? 'DEACTIVE' : '')) })).filter((x:any)=>x.id);

        setBranchOptions(normalizedBranches);
        setDepartmentOptions(normalizedDepts);
        setAllDepartments(normalizedDepts);
        setPartyOptions(normalizedParties);
        setStatusOptions(normalizedStatuses.length ? normalizedStatuses : [{ id: '1', label: 'OPEN' }, { id: '0', label: 'DEACTIVE' }]);

        if (!initialValues) {
          // default start date to today in YYYY-MM-DD format
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          const todayStr = `${yyyy}-${mm}-${dd}`;
          setForm((f) => ({ ...f, branch_id: normalizedBranches[0]?.id ?? "", dept_id: normalizedDepts[0]?.id ?? "", party_id: normalizedParties[0]?.id ?? "", status_id: (normalizedStatuses[0]?.id ?? '1'), prj_start_dt: todayStr, prj_end_dt: todayStr }));
        }
        setSetupData(candidate);
      } catch (err:any) {
        // Surface the error to the UI instead of logging to console (Stage A)
        setError(err?.message || String(err));
        setBranchOptions([]); setDepartmentOptions([]); setPartyOptions([]); setStatusOptions([]); setSetupData(null);
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(()=>{ setNameError(null); }, [form.branch_id, form.dept_id]);

  useEffect(() => {
    if (!initialValues) return;
    const iv = Array.isArray(initialValues) ? initialValues[0] : initialValues;
    try { console.debug('CreateProjectPage.initialValues', iv); } catch(e) {}
    const pick = (keys: string[]) => { if (!iv) return undefined; for (const k of keys) if (iv[k] !== undefined && iv[k] !== null) return iv[k]; return undefined; };
    const branchVal = pick(['branch_id','branch','branch_display']);
    const deptVal = pick(['dept_id','dept','department_id','dept_name']);
    const partyVal = pick(['party_id','party','party_name']);
    const nameVal = pick(['prj_name','project_name','name']);
    const descVal = pick(['prj_desc','description','desc']);
    const startVal = pick(['prj_start_dt','start_date','start']);
    const endVal = pick(['prj_end_dt','end_date','end']);
    const statusVal = pick(['status_id','status','status_id_val']);
    const activeVal = pick(['active']);
    setForm((f)=> ({
      ...f,
      branch_id: String(branchVal ?? ''),
      dept_id: String(deptVal ?? ''),
      party_id: String(partyVal ?? ''),
      prj_name: nameVal ?? f.prj_name ?? '',
      prj_desc: descVal ?? f.prj_desc ?? '',
      prj_start_dt: startVal ?? f.prj_start_dt ?? '',
      prj_end_dt: endVal ?? f.prj_end_dt ?? '',
      status_id: String(statusVal ?? f.status_id ?? '1'),
      active: activeVal === undefined ? f.active : (activeVal === 1 || activeVal === true || activeVal === '1'),
    }));
  }, [initialValues]);

  // Filter departments based on selected branch
  useEffect(() => {
    if (!allDepartments.length) return;
    if (!form.branch_id) {
      setDepartmentOptions(allDepartments);
      return;
    }
    const filtered = allDepartments.filter((d) => String(d.raw?.branch_id ?? '') === String(form.branch_id));
    setDepartmentOptions(filtered);
    setForm((f) => {
      if (f.dept_id && !filtered.some((d) => d.id === f.dept_id)) {
        return { ...f, dept_id: filtered.length ? filtered[0].id : '' };
      }
      return f;
    });
  }, [form.branch_id, allDepartments]);

  const getCandidates = (props?: any[])=> {
    if (props && props.length) return props;
    const c = setupData?.projects || setupData?.project_mst || setupData?.data || [];
    return Array.isArray(c)?c:[];
  };

  const validateName = (props?: any[]) => {
    const name = String(form.prj_name ?? "").trim();
    if (!name) { setNameError('Project name is required'); return false; }
    const branchId = String(form.branch_id ?? "");
    const deptId = String(form.dept_id ?? "");
    const candidates = getCandidates(props);
    const exists = candidates.some((r:any)=>{
      const rName = String(r.prj_name ?? r.name ?? '').trim().toLowerCase();
      if (rName !== name.toLowerCase()) return false;
      if (branchId && String(r.branch_id ?? r.branch ?? '') !== branchId) return false;
      if (deptId && String(r.dept_id ?? r.dept ?? '') !== deptId) return false;
      return true;
    });
    if (exists) { setNameError('Project already exists'); return false; }
    setNameError(null); return true;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value, type } = e.target; setForm((f)=> ({ ...f, [name!]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value })); setError(null); if (name === 'prj_name') setNameError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const okName = validateName(existingRows);
    if (!okName) return setError('Fix validation errors');
    setSubmitting(true);
    try {
      const selectedCompany = localStorage.getItem('sidebar_selectedCompany'); const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : '';
      const payload: any = { co_id, prj_name: form.prj_name, prj_desc: form.prj_desc, prj_start_dt: form.prj_start_dt, prj_end_dt: form.prj_end_dt };
      payload.active = form.active ? 1 : 0;
      if (form.branch_id) payload.branch_id = form.branch_id;
      if (form.dept_id) payload.dept_id = form.dept_id;
      if (form.party_id) payload.party_id = form.party_id;
      if (form.status_id) payload.status_id = form.status_id;
      let result: any = null;
      if (isEdit) {
        payload.project_id = project_id;
        const { data, error } = await fetchWithCookie(apiRoutesPortalMasters.PROJECT_MASTER_EDIT, 'POST', payload) as any;
        result = data;
        if (error || !data) throw new Error(error || 'Edit failed');
      } else {
        const { data, error } = await fetchWithCookie(apiRoutesPortalMasters.PROJECT_MASTER_CREATE, 'POST', payload) as any;
        result = data;
        if (error || !data) throw new Error(error || 'Create failed');
      }
      if (onClose) onClose(true);
    } catch(err:any){ setError(err?.message || String(err)); } finally { setSubmitting(false); }
  }

  const Form = (
    <Box component="form" onSubmit={handleSubmit} sx={{ p:2, minWidth: 380 }}>
      <TextField select label="Branch" name="branch_id" value={form.branch_id} onChange={handleChange} fullWidth margin="normal" disabled={readOnly}>
        {branchOptions.map(b=> <MenuItem key={b.id} value={b.id}>{b.label}</MenuItem>)}
      </TextField>
      <Autocomplete
        options={departmentOptions}
        getOptionLabel={(option) => option.label || ''}
        value={departmentOptions.find((d) => d.id === form.dept_id) || null}
        onChange={(_, newValue) => {
          setForm((f) => ({ ...f, dept_id: newValue?.id || '' }));
          setError(null);
        }}
        disabled={readOnly}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderInput={(params) => <TextField {...params} label="Department" margin="normal" fullWidth />}
      />
      <TextField select label="Party" name="party_id" value={form.party_id} onChange={handleChange} fullWidth margin="normal" disabled={readOnly}>
        {partyOptions.map(p=> <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>)}
      </TextField>
      <TextField name="prj_name" label="Project Name" value={form.prj_name} onChange={handleChange} onBlur={() => validateName(existingRows)} error={!!nameError} helperText={nameError ?? undefined} fullWidth margin="normal" required InputProps={{ readOnly }} />
      <TextField name="prj_desc" label="Project Description" value={form.prj_desc} onChange={handleChange} fullWidth margin="normal" multiline rows={3} InputProps={{ readOnly }} />
      <TextField name="prj_start_dt" label="Start Date" value={form.prj_start_dt} onChange={handleChange} fullWidth margin="normal" type="date" InputLabelProps={{ shrink: true }} InputProps={{ readOnly }} />
      <TextField name="prj_end_dt" label="End Date" value={form.prj_end_dt} onChange={handleChange} fullWidth margin="normal" type="date" InputLabelProps={{ shrink: true }} InputProps={{ readOnly }} />
      <TextField select label="Status" name="status_id" value={form.status_id} onChange={handleChange} fullWidth margin="normal" disabled={readOnly}>
        {statusOptions.map(s=> <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
      </TextField>
      <FormControlLabel control={<Switch checked={!!form.active} onChange={(e)=> setForm((f)=> ({ ...f, active: e.target.checked }))} disabled={readOnly} />} label="Active" />
      {error && <FormHelperText error>{error}</FormHelperText>}
      <Box sx={{ mt:2, display:'flex', justifyContent:'flex-end' }}>
  {typeof open === 'boolean' && <Button onClick={() => onClose && onClose()} color="secondary" sx={{ mr: 2 }} disabled={submitting}>{readOnly ? 'Close' : 'Cancel'}</Button>}
  {!readOnly && <Button type="submit" variant="contained" disabled={submitting || loading || !!nameError}>{submitting? <CircularProgress size={18} /> : (isEdit? 'Save':'Create')}</Button>}
      </Box>
    </Box>
  );

  return (
    <>
      {typeof open === 'boolean' ? (
        <Dialog open={open} onClose={() => onClose && onClose()} maxWidth="sm" fullWidth>
          <DialogTitle>{isEdit? 'Edit Project' : 'Create Project'}</DialogTitle>
          <DialogContent>{loading ? <CircularProgress /> : Form}</DialogContent>
        </Dialog>
      ) : (
        <Box sx={{ maxWidth: 500, mx:'auto', mt:4 }}>
          <DialogTitle>{isEdit? 'Edit Project' : 'Create Project'}</DialogTitle>
          <DialogContent>{loading ? <CircularProgress /> : Form}</DialogContent>
        </Box>
      )}
    </>
  );
}
