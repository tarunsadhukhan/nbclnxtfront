"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import CreateSubDepartmentPage from "./CreateSubDepartmentPage";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";


type SubDeptRow = { id?: string | number; subdept_code?: string; subdept_name?: string; dept_name?: string; branch_display?: string; active?: number | boolean | string; order_by?: number | string };

export default function SubDepartmentMasterPage() {
  const [rows, setRows] = useState<SubDeptRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
  const [viewLoading, setViewLoading] = useState<boolean>(false);
  const [viewData, setViewData] = useState<any>(null);

  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [editLoading, setEditLoading] = useState<boolean>(false);

  const fetchSubDepartments = async (): Promise<void> => {
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const selectedBranches = localStorage.getItem("sidebar_selectedBranches");
      let branch_ids = "";
      if (selectedBranches) {
        try {
          const parsed = JSON.parse(selectedBranches);
          if (Array.isArray(parsed)) {
            const ids = parsed
              .map((b: any) => {
                if (b && typeof b === "object") return b.branch_id ?? b.id ?? b.value ?? "";
                if (b === 0) return "0";
                if (b) return String(b);
                return "";
              })
              .map(String)
              .filter(Boolean);
            branch_ids = ids.join(",");
          }
        } catch {
          /* ignore branch cache parse errors */
        }
      }
			const queryParams = new URLSearchParams({
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
				co_id,
				branch_id: branch_ids
			});
			if (searchQuery) queryParams.append("search", searchQuery);
      const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.SUBDEPT_MASTER_TABLE}?${queryParams}`, "GET") as any;
      if (error || !data) throw new Error(error || "Failed to fetch subdepartments");
      const mapped = (data.data || []).map((r: any) => ({ ...r, id: r.subdept_master_id ?? r.subdept_id ?? r.id, subdept_name: r.subdept_name ?? r.subdept_name_display ?? r.name, subdept_code: r.subdept_code ?? r.code, dept_name: r.dept_name ?? r.department ?? "", branch_display: r.branch_display ?? r.branch_desc ?? r.branch ?? "", active: typeof r.active === 'string' ? Number(r.active) : r.active, order_by: r.order_by ?? r.sort_order ?? r.order }))
      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || "Error fetching subdepartments", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubDepartments();   }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  const handlePaginationModelChange = (newModel: GridPaginationModel) => setPaginationModel(newModel);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchQuery(v);
    setPaginationModel(p => ({ ...p, page: 0 }));
  };

  const openCreate = () => setCreateOpen(true);
  const closeCreate = () => setCreateOpen(false);

  const handleOpenView = async (id: number | string) => {
    setViewDialogOpen(true); setViewLoading(true); setViewData(null);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const params = new URLSearchParams({ subdept_master_id: String(id), co_id });
      const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.SUBDEPT_MASTER_VIEW}?${params}`, "GET") as any;
      if (error || !data) throw new Error(error || "Failed to fetch view payload");
      setViewData(data);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || "Failed to load subdepartment for view", severity: "error" });
      setViewDialogOpen(false);
    } finally { setViewLoading(false); }
  };

  const handleOpenEdit = async (id: number | string) => {
    setEditDialogOpen(true); setEditLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const params = new URLSearchParams({ subdept_master_id: String(id), co_id });
      const { data } = await fetchWithCookie(`${apiRoutesPortalMasters.SUBDEPT_MASTER_VIEW}?${params}`, "GET") as any;
      if (!data) throw new Error("Failed to load subdept data");
      const d = data;
      // populate edit form states if needed; for now we reuse a simple JSON view
      setViewData(d);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || "Failed to load edit data", severity: "error" });
      setEditDialogOpen(false);
    } finally { setEditLoading(false); }
  };

  const handleSaveEdit = async () => { /* implement when API known */ };

  const columns = useMemo<GridColDef<SubDeptRow>[]>(() => ([
    { field: "subdept_code", headerName: "Subdept Code", flex: 1, minWidth: 140 },
    { field: "subdept_name", headerName: "Subdepartment", flex: 1, minWidth: 220 },
    { field: "dept_name", headerName: "Department", flex: 1, minWidth: 180 },
    { field: "branch_display", headerName: "Branch", flex: 1, minWidth: 180 },
    {
      field: "active",
      headerName: "Active",
      width: 120,
      renderCell: (params: GridRenderCellParams) => <span>{params.value ? "Yes" : "No"}</span>,
    },
    { field: "order_by", headerName: "Order By", width: 120 },
  ]), []);

  return (
    <IndexWrapper
      title="Subdepartment Master"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{ value: searchQuery, onChange: handleSearchChange, placeholder: "Search subdepartments", debounceDelayMs: 1000 }}
      createAction={{ onClick: openCreate, label: "Create Subdepartment" }}
      onView={(row) => {
        const id = row.id;
        if (id === undefined || id === null) return;
        void handleOpenView(id);
      }}
      onEdit={(row) => {
        const id = row.id;
        if (id === undefined || id === null) return;
        void handleOpenEdit(id);
      }}
    >
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>

      <CreateSubDepartmentPage open={createOpen} onClose={() => { closeCreate(); fetchSubDepartments(); }} existingRows={rows} />

      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Subdepartment Details</DialogTitle>
        <DialogContent>{viewLoading ? <div>Loading...</div> : viewData ? <pre>{JSON.stringify(viewData, null, 2)}</pre> : <div>No details</div>}</DialogContent>
        <DialogActions><Button onClick={() => setViewDialogOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Subdepartment</DialogTitle>
        <DialogContent>{editLoading ? <div>Loading...</div> : viewData ? <pre>{JSON.stringify(viewData, null, 2)}</pre> : <div>No details</div>}</DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={editLoading}>Cancel</Button>
          <Button className="btn-primary" onClick={handleSaveEdit} disabled={editLoading}>Save</Button>
        </DialogActions>
      </Dialog>
    </IndexWrapper>
  );
}
