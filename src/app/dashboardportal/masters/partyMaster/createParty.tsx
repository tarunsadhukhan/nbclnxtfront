"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Snackbar, Alert, DialogActions, FormControl, InputLabel, Select, MenuItem, TextField, Table, TableHead, TableBody, TableRow, TableCell, IconButton, Switch, TableContainer } from '@mui/material';
import { Delete } from 'lucide-react';
import { MuiForm, Schema } from '@/components/ui/muiform';
import { fetchWithCookie } from '@/utils/apiClient2';
import { apiRoutesPortalMasters } from '@/utils/api';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  editId?: number | string;
  onSaved?: () => void;
};

type BranchRow = {
  party_mst_branch_id?: number | string;
  address?: string;
  address_additional?: string;
  zip_code?: number | string;
  state?: string;
  gst_no?: string;
  contact_person?: string;
  contact_no?: string;
  active?: boolean;
};

export default function CreateParty({ open, onClose, mode = 'create', editId, onSaved }: Props) {
  const [schema, setSchema] = useState<Schema | null>(null);
  const [initialValues, setInitialValues] = useState<Record<string, any> | undefined>(undefined);
  const [_loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [initialBranches, setInitialBranches] = useState<BranchRow[]>([]);
  const [statesByCountry, setStatesByCountry] = useState<Record<string, any[]>>({});
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>(undefined);
  // party types handled by MuiForm multiselect

  // load setup (entities, countries, party_types)
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const selectedCompany = localStorage.getItem('sidebar_selectedCompany');
        const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : '';
        const params = new URLSearchParams({ co_id: co_id });

        const setupUrl = mode === 'edit' && editId ? `${apiRoutesPortalMasters.PARTY_EDIT_SETUP}?${params}&party_id=${editId}` : `${apiRoutesPortalMasters.PARTY_CREATE_SETUP}?${params}`;
        const { data, error } = await fetchWithCookie(setupUrl, 'GET');
        if (error || !data) throw new Error(error || 'Failed to load setup');

  // prepare options
  // entities: entity_type_id/entity_type_name
  const entities = (data.entities ?? []).map((e: any) => ({ label: e.entity_type_name ?? e.name ?? String(e.entity_type_id ?? e.id), value: String(e.entity_type_id ?? e.id) }));
  const countriesRaw = (data.countries ?? []);
  // countries: country_id/country
  const countries = countriesRaw.map((c: any) => ({ label: c.country ?? c.name ?? String(c.country_id ?? c.id), value: String(c.country_id ?? c.id) }));

        // build state maps if provided in setup
        const statesRaw = data.states ?? [];
        const sMap: Record<string, any[]> = {};
        for (const s of statesRaw) {
          const cId = String(s.country_id ?? s.countryId ?? s.co_id ?? s.country);
          sMap[cId] = sMap[cId] ?? [];
          sMap[cId].push({ id: s.state_id ?? s.id, name: s.state ?? s.state_name ?? s.name });
        }
        setStatesByCountry(sMap);
  const partyTypes = (data.party_types ?? []).map((p: any) => ({ label: p.party_types_mst_name ?? p.name ?? String(p.party_types_mst_id), value: String(p.party_types_mst_id ?? p.id) }));

    const s: Schema = {
          title: mode === 'edit' ? 'Edit Party' : 'Create Party',
          fields: [
            { name: 'supp_code', label: 'Party Code', type: 'text', required: true },
            { name: 'supp_name', label: 'Party Name', type: 'text', required: true },
            { name: 'active', label: 'Active', type: 'checkbox', defaultValue: true },
            { name: 'phone_no', label: 'Phone No', type: 'text' },
            { name: 'cin', label: 'CIN', type: 'text' },
            { name: 'supp_contact_person', label: 'Contact Person', type: 'text' },
            { name: 'supp_contact_designation', label: 'Contact Designation', type: 'text' },
            { name: 'supp_email_id', label: 'Contact Email', type: 'text' },
            { name: 'party_pan_no', label: 'PAN No', type: 'text' },
            { name: 'entity_type_id', label: 'Entity Type', type: 'select', options: entities },
            { name: 'msme_certified', label: 'MSME Certified', type: 'text' },
            { name: 'country_id', label: 'Country', type: 'select', options: countries },
      // party_type as multiselect
      { name: 'party_type', label: 'Party Types', type: 'multiselect', options: partyTypes },
          ],
        };

  // restore party_type as multiselect field
  setSchema(s);

        // if edit, prepare initial values from party_details (normalize keys)
        if (mode === 'edit' && Array.isArray(data.party_details) && data.party_details.length > 0) {
          const pd = data.party_details[0];
          // parse party_type_id like "{1,2}" or "1,2" into array of strings
          let pt: string[] = [];
          const rawPt = pd.party_type_id ?? pd.party_type ?? pd.party_type_ids ?? '';
          if (Array.isArray(rawPt)) pt = rawPt.map(String);
          else if (typeof rawPt === 'string') {
            const cleaned = rawPt.replace(/[{}]/g, '');
            pt = cleaned.split(',').map((s: string) => s.trim()).filter(Boolean);
          } else if (typeof rawPt === 'number') pt = [String(rawPt)];

          // map country name or id to country_id string
          let countryId: string | undefined = undefined;
          if (pd.country_id) countryId = String(pd.country_id);
          else if (pd.country) {
            const found = countriesRaw.find((c: any) => String(c.country_id ?? c.id) === String(pd.country) || String(c.country).toLowerCase() === String(pd.country).toLowerCase());
            if (found) countryId = String(found.country_id ?? found.id);
          }

          const iv: Record<string, any> = {
            supp_code: pd.supp_code ?? pd.party_code ?? pd.code,
            supp_name: pd.supp_name ?? pd.party_name ?? pd.name,
            active: pd.active === 1 || pd.active === '1' || pd.active === true,
            phone_no: pd.phone_no ?? pd.phone ?? pd.contact_no,
            cin: pd.cin,
            supp_contact_person: pd.supp_contact_person ?? pd.contact_person,
            supp_contact_designation: pd.supp_contact_designation,
            supp_email_id: pd.supp_email_id ?? pd.contact_email ?? pd.email,
            party_pan_no: pd.party_pan_no ?? pd.pan_no,
            entity_type_id: pd.entity_type_id ? String(pd.entity_type_id) : pd.entity_type ? String(pd.entity_type) : undefined,
            msme_certified: pd.msme_certified,
            country_id: countryId,
            party_type: pt,
          };

          setInitialValues(iv);
        } else {
          setInitialValues(undefined);
        }

        // if edit, prefill branches from response
        if (mode === 'edit' && data.party_branches) {
          const b = (data.party_branches || []).map((br: any) => ({
            // Preserve PK so the backend can UPDATE in place instead of
            // delete-then-insert. Without this, FK refs (e.g. sales_invoice
            // .transporter_branch_id) would block every save.
            party_mst_branch_id: br.party_mst_branch_id,
            address: br.address,
            address_additional: br.address_additional,
            zip_code: br.zip_code,
            // store ids for state
            state: String(br.state_id ?? br.state ?? ''),
            gst_no: br.gst_no,
            contact_person: br.contact_person,
            contact_no: br.contact_no,
            active: br.active === 1 || br.active === '1' || br.active === true,
          }));
          const branchData = [...b, {}];
          setBranches(branchData);
          setInitialBranches(branchData);
        } else {
          setBranches([{}]);
          setInitialBranches([{}]);
        }
      } catch (err: any) {
        setSnackbar({ open: true, message: err.message || 'Error loading setup', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, mode, editId]);

  const upsertBranchRow = (idx: number, next: BranchRow) => {
    setBranches((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...next };
      // ensure trailing empty row
      const last = copy[copy.length - 1];
      const isEmpty = (r: BranchRow) => !r.address && !r.address_additional && !r.zip_code && !r.state && !r.gst_no && !r.contact_person && !r.contact_no;
      if (!isEmpty(last)) copy.push({});
      return copy;
    });
  };

  const handleRemoveBranch = (idx: number) => setBranches(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      const selectedCompany = localStorage.getItem('sidebar_selectedCompany');
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : undefined;
      const branchesPayload = branches
        .filter(b => b && (b.address || b.contact_person || b.contact_no))
        .map(b => ({
          party_mst_branch_id: b.party_mst_branch_id,
          active: b.active,
          address: b.address,
          address_additional: b.address_additional,
          zip_code: b.zip_code,
          state: b.state,
          gst_no: b.gst_no,
          contact_no: b.contact_no,
          contact_person: b.contact_person,
        }));
      const payload = { ...values, co_id, branches: branchesPayload } as any;
      if (mode === 'edit' && editId) (payload as any)['party_id'] = editId;

      const url = mode === 'edit' ? apiRoutesPortalMasters.PARTY_EDIT : apiRoutesPortalMasters.PARTY_CREATE;
      const method = 'POST';
      const { data, error } = await fetchWithCookie(url, method, payload);
      if (error) throw new Error(error);
      setSnackbar({ open: true, message: mode === 'edit' ? 'Party updated' : 'Party created', severity: 'success' });
      onSaved?.();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Save failed', severity: 'error' });
      throw err;
    }
  };

  if (!schema) return null;

  // Check if branches have changed from initial state
  const serializeBranches = (arr: BranchRow[]) => 
    JSON.stringify(arr.filter(b => b && (b.address || b.contact_person || b.contact_no || b.gst_no)));
  const branchesDirty = serializeBranches(branches) !== serializeBranches(initialBranches);

  // compute available states for a branch given selected country
  const availableStates = (countryId?: string) => {
    if (!countryId) return [] as { id?: any; name?: string }[];
    return statesByCountry[countryId] ?? [];
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{mode === 'edit' ? 'Edit Party' : 'Create Party'}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <MuiForm schema={schema} initialValues={initialValues} mode={mode} onSubmit={handleSubmit} submitLabel={mode === 'edit' ? 'Update' : 'Save'} cancelLabel="Close" onCancel={onClose} hideModeToggle={true}
            externalDirty={branchesDirty}
            onValuesChange={(vals) => {
              setSelectedCountry(vals.country_id ? String(vals.country_id) : undefined);
            }}
          />

          {/* Branches as a MUI Table - only show in edit mode */}
          {mode === 'edit' && (
          <Box sx={{ mt: 3 }}>
            <h3 className="text-lg font-medium">Branches</h3>
            <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 240 }}>Address</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>Address Additional</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Zip</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>State</TableCell>
                  <TableCell sx={{ minWidth: 160 }}>GST No</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>Contact Person</TableCell>
                  <TableCell sx={{ minWidth: 150 }}>Contact No</TableCell>
                  <TableCell sx={{ minWidth: 80 }}>Active</TableCell>
                  <TableCell sx={{ minWidth: 80 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {branches.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ minWidth: 240 }}>
                      <TextField fullWidth size="small" value={b.address ?? ''} onChange={(e) => upsertBranchRow(i, { address: e.target.value })} placeholder="Address" />
                    </TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      <TextField fullWidth size="small" value={b.address_additional ?? ''} onChange={(e) => upsertBranchRow(i, { address_additional: e.target.value })} placeholder="Address Additional" />
                    </TableCell>
                    <TableCell sx={{ minWidth: 100 }}>
                      <TextField fullWidth size="small" value={b.zip_code ?? ''} onChange={(e) => upsertBranchRow(i, { zip_code: e.target.value })} placeholder="Zip Code" />
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel id={`state-label-${i}`}>State</InputLabel>
                        <Select
                          labelId={`state-label-${i}`}
                          value={b.state ?? ''}
                          label="State"
                          onChange={(e) => upsertBranchRow(i, { state: String(e.target.value) })}
                        >
                          <MenuItem value="">Select state</MenuItem>
                          {(availableStates(selectedCountry) ?? []).map((s: any) => (
                            <MenuItem key={s.id ?? s.state_id} value={String(s.id ?? s.state_id ?? s.name)}>{s.name ?? s.state_name ?? s.display}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>

                    <TableCell sx={{ minWidth: 160 }}>
                      <TextField fullWidth size="small" value={b.gst_no ?? ''} onChange={(e) => upsertBranchRow(i, { gst_no: e.target.value })} placeholder="GST No" />
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <TextField fullWidth size="small" value={b.contact_person ?? ''} onChange={(e) => upsertBranchRow(i, { contact_person: e.target.value })} placeholder="Contact Person" />
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      <TextField fullWidth size="small" value={b.contact_no ?? ''} onChange={(e) => upsertBranchRow(i, { contact_no: e.target.value })} placeholder="Contact No" />
                    </TableCell>
                    <TableCell sx={{ minWidth: 80 }}>
                      <Switch checked={Boolean(b.active)} onChange={(e) => upsertBranchRow(i, { active: e.target.checked })} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 80 }}>
                      {i < branches.length - 1 && (
                        <IconButton size="small" onClick={() => handleRemoveBranch(i)}>
                          <Delete size={16} />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TableContainer>
          </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
  <Button variant="ghost" onClick={onClose}>Close</Button>
      </DialogActions>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Dialog>
  );
}
