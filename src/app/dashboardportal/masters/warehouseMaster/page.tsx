"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import CreateWarehouse from "./createWarehouse";
import IndexWrapper from "@/components/ui/IndexWrapper";

type WarehouseRow = {
  id?: number | string;
  warehouse_id?: number;
  warehouse_name?: string;
  sub_warehouse_name?: string;
  active?: number | string | boolean;
  [key: string]: any;
};

export default function WarehouseMasterPage() {
  const [rows, setRows] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [detailsDialogMode, setDetailsDialogMode] = useState<'view' | 'edit'>('view');

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const queryParams = new URLSearchParams({
        page: String((paginationModel.page ?? 0) + 1),
        limit: String(paginationModel.pageSize ?? 10),
        co_id,
      });
      if (searchQuery) queryParams.append("search", searchQuery);

      // Add branches param from localStorage
      const selectedBranches = localStorage.getItem("sidebar_selectedBranches");
      if (selectedBranches) {
        try {
          const branchesArr = JSON.parse(selectedBranches);
          if (Array.isArray(branchesArr) && branchesArr.length > 0) {
            queryParams.append("branches", branchesArr.join(","));
          }
        } catch {}
      }

      const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.WAREHOUSE_TABLE}?${queryParams}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch warehouses");

      // API expected shape: { data: [...], total: number }
      // build branch id -> name map from response
      const branchList = data.branches ?? data.branch_list ?? [];
      const branchMap = new Map<string | number, string>();
      for (const b of branchList) {
        const id = b.branch_id ?? b.id;
        const name = b.branch_name ?? b.name ?? '';
        if (typeof id !== 'undefined') branchMap.set(String(id), String(name));
      }

      const mapped = (data.data || []).map((r: any) => ({
        ...r,
        id: r.warehouse_id ?? r.id,
        branch_id: r.branch_id,
        branch_name: branchMap.get(String(r.branch_id)) ?? String(r.branch_id ?? ''),
        warehouse_path: r.warehouse_path ?? r.warehouse_name ?? r.warehouse_display ?? '',
        warehouse_type: r.warehouse_type ?? r.type ?? '',
        active: typeof r.active === "string" ? Number(r.active) : r.active,
      }));
      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || "Error fetching warehouses", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  const handlePaginationModelChange = (newModel: GridPaginationModel) => setPaginationModel(newModel);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchQuery(v);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleOpenDetails = (row: WarehouseRow) => {
    setDetailsDialogMode('view');
    setDetailsDialogOpen(true);
    setDetailsLoading(true);
    try {
      setDetailsData(row ?? { error: "No details found" });
    } catch (err: any) {
      setDetailsData({ error: err.message || "Failed to load details" });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleOpenEdit = (row: WarehouseRow) => {
    setDetailsDialogMode('edit');
    setDetailsDialogOpen(true);
    setDetailsLoading(false);
    setDetailsData(row);
  };

  const columns = useMemo<GridColDef<WarehouseRow>[]>(() => ([
    { field: "branch_name", headerName: "Branch", flex: 1, minWidth: 180 },
    { field: "warehouse_path", headerName: "Warehouse", flex: 1, minWidth: 260 },
    { field: "warehouse_type", headerName: "Warehouse Type", flex: 1, minWidth: 160 },
  ]), []);

  return (
    <IndexWrapper
      title="Warehouse Master"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{ value: searchQuery, onChange: handleSearchChange, placeholder: "Search warehouses", debounceDelayMs: 1000 }}
      createAction={{ onClick: () => setCreateDialogOpen(true), label: "Create Warehouse" }}
      onEdit={handleOpenEdit}
      onView={handleOpenDetails}
    >
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{detailsDialogMode === 'edit' ? 'Edit Warehouse' : 'Warehouse Details'}</DialogTitle>
        <DialogContent>
          {detailsLoading ? (
            <div>Loading...</div>
          ) : detailsData && !detailsData.error ? (
            <pre>{JSON.stringify(detailsData, null, 2)}</pre>
          ) : (
            <div>{detailsData?.error || "No details found"}</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)} autoFocus>Okay</Button>
        </DialogActions>
      </Dialog>
      <CreateWarehouse open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} onSaved={() => { setCreateDialogOpen(false); fetchWarehouses(); }} />
    </IndexWrapper>
  );
}
