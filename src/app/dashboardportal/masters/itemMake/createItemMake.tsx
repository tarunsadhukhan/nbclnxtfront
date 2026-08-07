"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Snackbar, Alert } from '@mui/material';
import { MuiForm, Schema, Option } from '@/components/ui/muiform';
import { fetchWithCookie } from '@/utils/apiClient2';
import { apiRoutesPortalMasters } from '@/utils/api';
// Button not used; MuiForm provides its own actions

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function CreateItemMake({ open, onClose, onCreated }: Props) {
  const [schema, setSchema] = useState<Schema | null>(null);
  const [_loadingSetup, setLoadingSetup] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoadingSetup(true);
      try {
  const selectedCompany = localStorage.getItem('sidebar_selectedCompany');
  const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : '';
  const params = new URLSearchParams({ co_id: co_id });
  const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.ITEM_MAKE_CREATE_SETUP}?${params}`, 'GET');
        if (error || !data) throw new Error(error || 'Failed to load setup');

        // normalize item groups to options (API may return under data.data or item_groups)
        const rawGroups = data.data ?? data.item_groups ?? data.itemgroups ?? [];
        const itemGroups: Option[] = (rawGroups).map((g: any) => ({
          label: `${g.item_grp_name_display ?? g.item_grp_name ?? g.item_group_name ?? ''} (${g.item_grp_code_display ?? g.item_grp_code ?? g.item_group_code ?? ''})`.trim(),
          value: String(g.item_grp_id ?? g.id ?? ''),
        }));

        const s: Schema = {
          title: 'Create Item Make',
          fields: [
            { name: 'item_grp_id', label: 'Item Group', type: 'select', required: true, options: itemGroups },
            { name: 'item_make', label: 'Item Make', type: 'text', required: true },
          ],
        };
        setSchema(s);
      } catch (err: any) {
        setSnackbar({ open: true, message: err.message || 'Error loading setup', severity: 'error' });
      } finally {
        setLoadingSetup(false);
      }
    };
    load();
  }, [open]);

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      // attach co_id from selected company (same pattern as other pages)
      const selectedCompany = localStorage.getItem('sidebar_selectedCompany');
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : undefined;
      const body = { ...values, co_id };
  const { data, error } = await fetchWithCookie(apiRoutesPortalMasters.ITEM_MAKE_CREATE, 'POST', body);
      if (error) throw new Error(error);
      setSnackbar({ open: true, message: 'Item make created', severity: 'success' });
      onCreated?.();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Create failed', severity: 'error' });
      throw err;
    }
  };

  if (!schema) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create Item Make</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <MuiForm
            schema={schema}
            mode="create"
            onSubmit={handleSubmit}
            submitLabel="Save"
            cancelLabel="Close"
            onCancel={onClose}
            hideModeToggle={true}
          />
        </Box>
      </DialogContent>
  {/* DialogActions intentionally empty; MuiForm provides Cancel/Save controls */}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Dialog>
  );
}
