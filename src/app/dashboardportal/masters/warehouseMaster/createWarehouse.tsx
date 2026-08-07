"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Snackbar, Alert } from '@mui/material';
import { MuiForm, Schema, Option } from '@/components/ui/muiform';
import { fetchWithCookie } from '@/utils/apiClient2';
import { apiRoutesPortalMasters } from '@/utils/api';
// Button not used; MuiForm provides its own actions

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

export default function CreateWarehouse({ open, onClose, onSaved }: Props) {
  const [schema, setSchema] = useState<Schema | null>(null);
  const [initialValues, setInitialValues] = useState<Record<string, any> | undefined>(undefined);
  const [warehouseListState, setWarehouseListState] = useState<any[]>([]);
  const [_currentParentOptions, setCurrentParentOptions] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(undefined);
  const latestValuesRef = useRef<Record<string, any> | null>(null);
  const [_loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const selectedCompany = localStorage.getItem('sidebar_selectedCompany');
        const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : '';
        const queryParams = new URLSearchParams({ co_id });

        // include sidebar selected branches in the query so parent warehouses are returned consistently
        const selectedBranchesForQuery = localStorage.getItem('sidebar_selectedBranches');
        if (selectedBranchesForQuery) {
          try {
            const branchesArr = JSON.parse(selectedBranchesForQuery);
            if (Array.isArray(branchesArr) && branchesArr.length > 0) {
              queryParams.append('branches', branchesArr.join(','));
            }
          } catch {}
        }

        // request warehouse table to get branches and existing warehouses
        const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.WAREHOUSE_TABLE}?${queryParams}`, 'GET');
        if (error || !data) throw new Error(error || 'Failed to load setup');

        const branchList = data.branches ?? data.branch_list ?? [];
        // read selected branches from localStorage
        const selectedBranchesRaw = localStorage.getItem('sidebar_selectedBranches');
        let allowedBranchIds: string[] | undefined = undefined;
        if (selectedBranchesRaw) {
          try {
            const parsed = JSON.parse(selectedBranchesRaw);
            if (Array.isArray(parsed)) allowedBranchIds = parsed.map(String);
          } catch {}
        }

        // build branch options and dedupe by value to avoid duplicate React keys
        const rawBranchOptions = (branchList || [])
          .filter((b: any) => !allowedBranchIds || allowedBranchIds.includes(String(b.branch_id ?? b.id)))
          .map((b: any) => ({ label: b.branch_name ?? b.name ?? String(b.branch_id ?? b.id), value: String(b.branch_id ?? b.id) }));
        const branchOptionsMap = new Map<string, Option>();
        for (const o of rawBranchOptions) branchOptionsMap.set(String(o.value), o);
        const branchOptions: Option[] = Array.from(branchOptionsMap.values());

        const warehouseList = data.data ?? [];
        // store full warehouse list so we can filter parents when branch changes
        setWarehouseListState(warehouseList);
        // prefer warehouse_path as the visible label so the select shows the full path (e.g. "1-a")
        // build parent options and dedupe by value to avoid duplicate React keys
        const rawParentOptions: Option[] = (warehouseList || []).map((w: any) => ({
          label: String(w.warehouse_path ?? w.warehouse_name ?? w.warehouse_id ?? w.id ?? ''),
          value: String(w.warehouse_id ?? w.id),
        }));
        const parentOptionsMap = new Map<string, Option>();
        for (const o of rawParentOptions) parentOptionsMap.set(String(o.value), o);
        const parentOptions: Option[] = Array.from(parentOptionsMap.values());
        // initialize current parent options and selected branch from defaults
        setCurrentParentOptions(parentOptions);
  const defaultBranch = branchOptions[0]?.value ? String(branchOptions[0].value) : undefined;
  setSelectedBranchId(defaultBranch);

        const s: Schema = {
          title: 'Create Warehouse',
          fields: [
            { name: 'branch_id', label: 'Branch', type: 'select', required: true, options: branchOptions },
            { name: 'warehouse_name', label: 'Warehouse Name', type: 'text', required: true },
      { name: 'parent_warehouse_id', label: 'Parent Warehouse', type: 'select', options: parentOptions },
      { name: 'warehouse_type', label: 'Warehouse Type', type: 'text' },
          ],
        };

  setSchema(s);
  setInitialValues({ branch_id: branchOptions[0]?.value ? String(branchOptions[0].value) : '', parent_warehouse_id: '', warehouse_type: '' });
      } catch (err: any) {
        setSnackbar({ open: true, message: err.message || 'Error loading setup', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open]);

  // helper to build parent options filtered by branch
  const buildParentOptions = (branchId?: string) => {
    const list = warehouseListState || [];
    const filtered = branchId ? list.filter((w: any) => String(w.branch_id) === String(branchId)) : list;
    // dedupe by warehouse id to avoid duplicate React keys in option lists
    const map = new Map<string, Option>();
    for (const w of filtered) {
      const key = String(w.warehouse_id ?? w.id);
      map.set(key, { label: String(w.warehouse_path ?? w.warehouse_name ?? key ?? ''), value: key });
    }
    return Array.from(map.values());
  };

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      const selectedCompany = localStorage.getItem('sidebar_selectedCompany');
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : undefined;
      // perform validation: build candidate warehouse_path and ensure it doesn't already exist
      const name = (values.warehouse_name ?? '').toString().trim();
      const parentId = values.parent_warehouse_id;
      // find parent path if parent selected
      const parentPath = parentId ? (warehouseListState.find((w: any) => String(w.warehouse_id ?? w.id) === String(parentId))?.warehouse_path ?? '') : '';
      const candidatePath = parentPath ? `${parentPath}-${name}` : name;
      const exists = warehouseListState.some((w: any) => String(w.warehouse_path ?? '').trim() === String(candidatePath).trim());
      if (exists) {
        const msg = `Warehouse name already exists (${candidatePath})`;
        setValidationError(msg);
        setSnackbar({ open: true, message: msg, severity: 'error' });
        // don't throw here to avoid an unhandled exception bubbling to the UI; just abort save
        return;
      }

      const payload = { ...values, co_id } as any;
      // coerce empty parent to null
      if (!payload.parent_warehouse_id) payload.parent_warehouse_id = null;

      const { data, error } = await fetchWithCookie(apiRoutesPortalMasters.WAREHOUSE_CREATE, 'POST', payload);
      if (error) throw new Error(error);
      setSnackbar({ open: true, message: 'Warehouse created', severity: 'success' });
      onSaved?.();
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || 'Save failed', severity: 'error' });
      // swallow error to avoid unhandled exception in the UI; form submit will simply show snackbar
      return;
    }
  };

  if (!schema) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create Warehouse</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {validationError && (
            <Box sx={{ mb: 2 }}>
              <Alert severity="error">{validationError}</Alert>
            </Box>
          )}

          <MuiForm
            schema={schema}
            initialValues={initialValues}
            mode="create"
            hideModeToggle={true}
            onSubmit={handleSubmit}
            submitLabel="Save"
            cancelLabel="Close"
            onCancel={onClose}
            onValuesChange={(values: any) => {
              // keep a copy of latest values so we can preserve them when updating schema
              // also clear prior validation error when user changes values
              setValidationError(null);
              latestValuesRef.current = values;
              // when branch changes, update parent options to only include warehouses from that branch
              const rawBranchId = values?.branch_id;
              const branchId = rawBranchId !== undefined && rawBranchId !== null ? String(rawBranchId) : undefined;
              // avoid updating repeatedly for same branch
              if (branchId === selectedBranchId) return;
              const parentOptions = buildParentOptions(branchId);
              setCurrentParentOptions(parentOptions);
              setSelectedBranchId(branchId);
              // clear parent_warehouse_id when branch changes
              const preserved = { ...(latestValuesRef.current ?? {}), parent_warehouse_id: '' };
              setInitialValues(preserved);
              // update schema but preserve current values by setting initialValues above
              setSchema((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  fields: prev.fields.map((f) => (f.name === 'parent_warehouse_id' ? { ...f, options: parentOptions } : f)),
                };
              });
            }}
          />
        </Box>
  </DialogContent>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Dialog>
  );
}
