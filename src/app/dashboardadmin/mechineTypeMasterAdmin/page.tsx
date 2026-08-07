"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import MuiDataGrid from "@/components/ui/muiDataGrid";
import { Box, TextField, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem } from "@mui/material";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import CreateMechineTypePage from "./CreateMechineTypePage";
import { apiRoutesPortalMasters } from "@/utils/api";

type MechineRow = { id?: string | number; mechine_type?: string;  active?: number | boolean | string };

export default function MechineTypeMasterPage() {
  const [rows, setRows] = useState<MechineRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchTimeout, setSearchTimeout] = useState<any>(null);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
  const [viewLoading, setViewLoading] = useState<boolean>(false);
  const [viewData, setViewData] = useState<any>(null);

  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);

  const fetchMechines = async (): Promise<void> => {
    setLoading(true);
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
                page: String((paginationModel.page ?? 0) + 1),
                limit: String(paginationModel.pageSize ?? 10),
                co_id,
                branch_id: branch_ids
            });
            if (searchQuery) queryParams.append("search", searchQuery);
      const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.MECHINE_TYPE_MASTER_TABLE}?${queryParams}`, "GET") as any;
            console.log('fetch data', data);
      if (error || !data) throw new Error(error || "Failed to fetch machine types");

      const mapped = (data.data || []).map((r: any) => ({ ...r, id: r.mechine_id ?? r.id, mechine_type: r.mechine_type ?? r.name, dept_name: r.dept_name ?? r.department, branch_display: r.branch_display ?? r.branch_desc ?? r.branch, active: typeof r.active === 'string' ? Number(r.active) : r.active }));
      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || "Error fetching machine types", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMechines();   }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  const handlePaginationModelChange = (newModel: GridPaginationModel) => setPaginationModel(newModel);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (searchTimeout) clearTimeout(searchTimeout);
    const t = setTimeout(() => { setSearchQuery(v); setPaginationModel((p) => ({ ...p, page: 0 })); }, 500);
    setSearchTimeout(t);
  };

  const openCreateDialog = () => setCreateOpen(true);
  const closeCreateDialog = () => setCreateOpen(false);

  const handleOpenView = async (id: number | string) => {
    setViewDialogOpen(true); setViewLoading(true); setViewData(null);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const params = new URLSearchParams({ mechine_id: String(id), co_id });
      const route = (apiRoutesPortalMasters as any).MECHINE_MASTER_VIEW || `/apix/mechineTypeMaster/mechine_master_view`;
      const { data, error } = await fetchWithCookie(`${route}?${params}`, "GET") as any;
      if (error || !data) throw new Error(error || "Failed to fetch view payload");
      setViewData(data);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || "Failed to load machine type for view", severity: "error" });
      setViewDialogOpen(false);
    } finally { setViewLoading(false); }
  };

  const handleOpenEdit = async (id: number | string) => {
    setEditDialogOpen(true); setEditLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const params = new URLSearchParams({ mechine_id: String(id), co_id });
      const route = (apiRoutesPortalMasters as any).MECHINE_MASTER_VIEW || `/apix/mechineTypeMaster/mechine_master_view`;
      const { data } = await fetchWithCookie(`${route}?${params}`, "GET") as any;
      if (!data) throw new Error("Failed to load machine data");
      setViewData(data);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || "Failed to load edit data", severity: "error" });
      setEditDialogOpen(false);
    } finally { setEditLoading(false); }
  };

  const handleSaveEdit = async () => { /* implement when API known */ };

  const columns: GridColDef[] = [
    { field: 'mechine_type', headerName: 'Machine Type', flex: 1, minWidth: 180, headerClassName: 'bg-[#3ea6da] text-white' },
    { field: 'active', headerName: 'Active', width: 120, headerClassName: 'bg-[#3ea6da] text-white', renderCell: (params: GridRenderCellParams) => <span>{params.value ? 'Yes' : 'No'}</span> },
    { field: 'actions', headerName: 'Actions', width: 140, sortable: false, filterable: false, headerClassName: 'bg-[#3ea6da] text-white', renderCell: (params: GridRenderCellParams) => (
      <div className="flex items-center gap-2"><button className="text-blue-600 underline" onClick={() => handleOpenView(params.row.id)}>View</button><button className="text-green-600 underline" onClick={() => handleOpenEdit(params.row.id)}>Edit</button></div>
    ) }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0C3C60]">Machine Type Master</h1>
          <Button className="btn-primary" onClick={openCreateDialog}>+ Create Machine Type</Button>
        </div>

        <Box sx={{ width: '100%', mb: 2 }}>
          <TextField placeholder="Search machine types..." onChange={handleSearchChange} fullWidth variant="outlined" size="small" sx={{ maxWidth: 350 }} />
        </Box>

        <MuiDataGrid rows={rows} columns={columns} rowCount={totalRows} paginationModel={paginationModel} onPaginationModelChange={handlePaginationModelChange} loading={loading} showLoadingUntilLoaded={true} />

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: '100%' }}>{snackbar.message}</Alert>
        </Snackbar>
      </div>

      <CreateMechineTypePage open={createOpen} onClose={() => { closeCreateDialog(); fetchMechines(); }} existingRows={rows} />

      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Machine Type Details</DialogTitle>
        <DialogContent>{viewLoading ? <div>Loading...</div> : viewData ? <pre>{JSON.stringify(viewData, null, 2)}</pre> : <div>No details</div>}</DialogContent>
        <DialogActions><Button onClick={() => setViewDialogOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Machine Type</DialogTitle>
        <DialogContent>{editLoading ? <div>Loading...</div> : viewData ? <pre>{JSON.stringify(viewData, null, 2)}</pre> : <div>No details</div>}</DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={editLoading}>Cancel</Button>
          <Button className="btn-primary" onClick={handleSaveEdit} disabled={editLoading}>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
