"use client";

import { Button } from "@/components/ui/button";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { apiRoutesPortalMasters } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";
import { Box, Switch, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, TextField } from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
import { usePathname } from "next/navigation";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from '@mui/x-data-grid';
import CreateItemGroupPage from "@/app/dashboardportal/masters/itemGroupMaster/CreateItemGroupPage";





type ItemGroup =  {
  item_grp_id: number;
  active: number;
  item_grp_name_parent: string;
  item_sub_grp_name: string;
  item_grp_code_display: string;
  item_type_id: number;
  [key: string]: any;
}

export default function CompanyManagement() {
  const [rows, setRows] = useState<ItemGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 10,
    page: 0,
  });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null);
  const pathname = usePathname();
  const { hasMenuAccess } = useSidebarContext();
  const canEdit = hasMenuAccess(pathname, 'edit');

  // Fetch companies from API with pagination and search
  const fetchItemGrps = async () => {
    setLoading(true);
    
    try {
      const selectedCompany = localStorage.getItem('sidebar_selectedCompany');
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : '';
      
      const queryParams = new URLSearchParams({
        page: (paginationModel.page + 1).toString(), // Convert from 0-based to 1-based indexing
        limit: paginationModel.pageSize.toString(),
        co_id: co_id,
      });
      
      if (searchQuery) {
        queryParams.append('search', searchQuery);
      }

      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.GET_ALL_ITEM_GRP}?${queryParams}`,
        "GET"
      );

      if (error || !data) {
        throw new Error(error || 'Failed to fetch item groups');
      }

      // API returns data in { data: [...], total: number } format
      // Add 'id' property for MUI DataGrid and ensure 'active' is a number
      const mappedRows = (data.data || []).map((row: any) => ({
        ...row,
        id: row.item_grp_id,
        active: typeof row.active === 'string' ? Number(row.active) : row.active,
      }));
      setRows(mappedRows);
      setTotalRows(data.total || 0);
    } catch (error: any) {
      setSnackbar({ open: true, message: error?.message || 'Error fetching item groups', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data when pagination or search changes
  useEffect(() => {
    fetchItemGrps();
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  // Handle pagination model change
  const handlePaginationModelChange = (newPaginationModel: GridPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };

  // Handle search with debounce
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchValue = event.target.value;
    setSearchQuery(newSearchValue);
    setPaginationModel(prev => ({
      ...prev,
      page: 0,
    }));
  };

  // Open dialog for create
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const handleOpenCreate = () => {
    setCreateDialogOpen(true);
  };
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    fetchItemGrps(); // Refresh grid after create
  };

  // Toggle active status handler
  const handleToggleActive = async (item_grp_id: number, currentActive: number) => {
    if (!canEdit) {
      setSnackbar({ open: true, message: 'You do not have permission to edit item groups', severity: 'error' });
      return;
    }
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem('sidebar_selectedCompany');
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : '';
      const { data, error } = await fetchWithCookie(
        apiRoutesPortalMasters.UPDATE_ITEM_GRP_ACTIVE,
        'POST',
        { item_grp_id, active: currentActive ? 0 : 1, co_id }
      );
      if (error) {
        setSnackbar({ open: true, message: error, severity: 'error' });
      } else {
        setSnackbar({ open: true, message: 'Status updated successfully', severity: 'success' });
        fetchItemGrps(); // Refresh data
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to update status', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handler to open details dialog and fetch data
  const handleOpenDetails = async (item_grp_id: number) => {
    setDetailsDialogOpen(true);
    setDetailsLoading(true);
    setDetailsData(null);
    try {
      const selectedCompany = localStorage.getItem('sidebar_selectedCompany');
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : '';
      const { data, error } = await fetchWithCookie(
        apiRoutesPortalMasters.ITEM_GROUP_DETAILS, // Ensure this endpoint exists in your api.ts
        'POST',
        { itemgroupid: item_grp_id, co_id }
      );
      if (!error && data) {
        setDetailsData(data);
      } else {
        setDetailsData({ error: error || 'Failed to fetch details' });
      }
    } catch (err: any) {
      setDetailsData({ error: err.message || 'Failed to fetch details' });
    } finally {
      setDetailsLoading(false);
    }
  };

  const columns = useMemo<GridColDef<ItemGroup>[]>(() => [
    {
      field: 'item_grp_code_display',
      headerName: 'Item Group Code',
      flex: 1,
      minWidth: 180,
    },
    {
      field: 'item_grp_name_parent',
      headerName: 'Item Group Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'item_sub_grp_name',
      headerName: 'Item Sub Group Name',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'active',
      headerName: 'Active',
      width: 120,
      renderCell: (params: GridRenderCellParams<ItemGroup>) => (
        <Switch
          checked={Boolean(params.value)}
          color="primary"
          onChange={() => handleToggleActive(params.row.item_grp_id, params.value)}
          disabled={loading || !canEdit}
        />
      ),
    },
  ], [canEdit, handleToggleActive, loading]);

  const viewRowHandler = (row: ItemGroup) => {
    const identifier = row.item_grp_id ?? row.id;
    if (typeof identifier !== 'undefined' && identifier !== null) {
      void handleOpenDetails(Number(identifier));
    }
  };

  const editRowHandler = (row: ItemGroup) => {
    const identifier = row.item_grp_id ?? row.id;
    if (typeof identifier !== 'undefined' && identifier !== null) {
      void handleOpenDetails(Number(identifier));
    }
  };

  return (
    <>
      <IndexWrapper
        title="Item Group Master"
        rows={rows}
        columns={columns}
        rowCount={totalRows}
        paginationModel={paginationModel}
        onPaginationModelChange={handlePaginationModelChange}
        loading={loading}
        showLoadingUntilLoaded
  search={{ value: searchQuery, onChange: handleSearchChange, placeholder: "Search item groups", debounceDelayMs: 1000 }}
        createAction={{ onClick: handleOpenCreate }}
        onView={viewRowHandler}
        onEdit={editRowHandler}
      >
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

        <CreateItemGroupPage open={createDialogOpen} onClose={handleCloseCreateDialog} />
      </IndexWrapper>

      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Item Group Details</DialogTitle>
        <DialogContent>
          {detailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
              <CircularProgress />
            </Box>
          ) : detailsData && !detailsData.error ? (
            <Box sx={{ mt: 1 }}>
              <TextField
                label="Item Group Name"
                value={detailsData.item_grp_name || ''}
                fullWidth
                margin="normal"
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Item Group Code"
                value={detailsData.item_grp_code || ''}
                fullWidth
                margin="normal"
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Item Type ID"
                value={detailsData.item_type_id || ''}
                fullWidth
                margin="normal"
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Active"
                value={detailsData.active == 1 || detailsData.active === '1' ? 'Yes' : 'No'}
                fullWidth
                margin="normal"
                InputProps={{ readOnly: true }}
              />
            </Box>
          ) : (
            <Alert severity="error">{detailsData?.error || 'No details found.'}</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)} autoFocus>Okay</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
