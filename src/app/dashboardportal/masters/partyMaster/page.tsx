"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { apiRoutesPortalMasters } from '@/utils/api';
import { fetchWithCookie } from '@/utils/apiClient2';
import { Snackbar, Alert, Switch } from '@mui/material';
import CreateParty from './createParty';
import { Button } from '@/components/ui/button';
import { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import IndexWrapper from '@/components/ui/IndexWrapper';

type PartyRow = {
  id: number | string;
  party_id?: number;
  party_name?: string;
  party_code?: string;
  [key: string]: any;
}

export default function PartyMasterPage() {
  const [rows, setRows] = useState<PartyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [openCreate, setOpenCreate] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<number | string | undefined>(undefined);

  const fetchParties = async () => {
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem('sidebar_selectedCompany');
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : '';

      const params = new URLSearchParams({
        page: (paginationModel.page + 1).toString(),
        limit: paginationModel.pageSize.toString(),
        co_id: co_id,
      });
      if (searchQuery) params.append('search', searchQuery);

      const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.PARTY_TABLE}?${params}`, 'GET');
      if (error || !data) throw new Error(error || 'Failed to fetch parties');

      // party types may be returned alongside the data
      const partyTypes = data.party_types ?? data.partyTypes ?? [];
      const typeMap = new Map<string | number, string>();
      for (const t of partyTypes) {
        const id = t.party_types_mst_id ?? t.id ?? t.party_type_id;
        const name = t.party_types_mst_name ?? t.name ?? t.party_type_name;
        if (typeof id !== 'undefined') typeMap.set(String(id), String(name ?? ''));
      }

      const parseTypeIds = (val: any) => {
        if (!val) return [] as string[];
        if (Array.isArray(val)) return val.map(String);
        if (typeof val === 'string') {
          // handles formats like "{4,5}" or "4,5"
          const cleaned = val.replace(/[{}]/g, '');
          return cleaned.split(',').map(s => s.trim()).filter(Boolean);
        }
        return [String(val)];
      };

      const mapped = (data.data || []).map((r: any) => {
        const ids = parseTypeIds(r.party_type_id ?? r.party_type_ids ?? r.party_type);
        const typeNames = ids.map((i: string) => typeMap.get(String(i)) ?? '').filter(Boolean);
        return {
          ...r,
          id: r.party_id ?? r.id,
          party_name: r.supp_name ?? r.party_name ?? r.party_display ?? r.name,
          party_code: r.supp_code ?? r.party_code ?? r.code,
          contact_person: r.supp_contact_person ?? r.contact_person ?? r.contact,
          contact_email: r.supp_email_id ?? r.contact_email ?? r.email,
          party_type_display: typeNames.join(', '),
          active: r.active === 1 || r.active === '1' || r.active === true,
        };
      });
      setRows(mapped);
      setTotalRows(data.total ?? data.total_count ?? mapped.length);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Error fetching parties', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchParties();   }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  const handlePaginationModelChange = (newModel: GridPaginationModel) => setPaginationModel(newModel);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchQuery(v);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleToggleActive = (row: any) => {
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, active: !r.active } : r));
    setSnackbar({ open: true, message: `Active toggled for ${row.party_code ?? row.party_name ?? row.id}`, severity: 'success' });
  };

  const handleEdit = (row: any) => {
    // open the CreateParty dialog in edit mode with the selected party id
    setEditingId(row.id ?? row.party_id ?? undefined);
    setDialogMode('edit');
    setOpenCreate(true);
  };

  const columns = useMemo<GridColDef<PartyRow>[]>(() => ([
    { field: 'party_code', headerName: 'Party Code', flex: 1, minWidth: 140 },
    { field: 'party_name', headerName: 'Party Name', flex: 1, minWidth: 240 },
    { field: 'party_type_display', headerName: 'Party Type', flex: 1, minWidth: 220 },
    { field: 'contact_person', headerName: 'Contact Person', flex: 1, minWidth: 180 },
    { field: 'contact_email', headerName: 'Contact Email', flex: 1, minWidth: 220 },
    {
      field: 'active',
      headerName: 'Active',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Switch size="small" checked={Boolean(params.value)} onChange={() => handleToggleActive(params.row)} />
      ),
    },
  ]), []);

  return (
    <IndexWrapper
      title="Party Master"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{ value: searchQuery, onChange: handleSearchChange, placeholder: 'Search parties', debounceDelayMs: 1000 }}
      createAction={{ onClick: () => { setDialogMode('create'); setEditingId(undefined); setOpenCreate(true); }, label: 'Create' }}
      onEdit={handleEdit}
    >
      <CreateParty
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        mode={dialogMode}
        editId={editingId}
        onSaved={() => {
          setOpenCreate(false);
          fetchParties();
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
