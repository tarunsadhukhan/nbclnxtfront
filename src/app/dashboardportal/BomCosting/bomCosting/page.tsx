"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete } from "@mui/material";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useRouter } from "next/navigation";

type BomCostingRow = {
  id: number;
  bom_hdr_id: number;
  item_id: number;
  item_code: string;
  full_item_code?: string;
  item_name: string;
  bom_version: number;
  version_label: string | null;
  status_name: string | null;
  material_cost: number;
  conversion_cost: number;
  overhead_cost: number;
  total_cost: number;
  last_computed_at: string | null;
};

type ItemOption = {
  item_id: number;
  item_code: string;
  full_item_code?: string;
  item_name: string;
  label: string;
};

export default function BomCostingListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<BomCostingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  const getCoId = () => {
    const sel = localStorage.getItem("sidebar_selectedCompany");
    return sel ? JSON.parse(sel).co_id : "";
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const co_id = getCoId();
      const params = new URLSearchParams({ co_id });
      if (searchQuery) params.append("search", searchQuery);
      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.BOM_COSTING_LIST}?${params}`,
        "GET"
      );
      if (error || !data) throw new Error(error || "Failed to fetch BOM costing list");
      const mapped = (data.data || []).map((r: any) => ({ ...r, id: r.bom_hdr_id }));
      setRows(mapped);
      setTotalRows(mapped.length);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  const fetchItemOptions = async (search?: string) => {
    try {
      const co_id = getCoId();
      const params = new URLSearchParams({ co_id });
      if (search) params.append("search", search);
      const { data } = await fetchWithCookie(
        `${apiRoutesPortalMasters.BOM_COSTING_CREATE_SETUP}?${params}`,
        "GET"
      );
      if (data?.items) {
        setItemOptions(
          data.items.map((i: any) => ({
            ...i,
            label: `${i.full_item_code || i.item_code} - ${i.item_name}`,
          }))
        );
      }
    } catch {
      // silent
    }
  };

  const handleOpenCreate = () => {
    setSelectedItem(null);
    setVersionLabel("");
    fetchItemOptions();
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!selectedItem) return;
    try {
      const co_id = getCoId();
      const { data, error } = await fetchWithCookie(
        apiRoutesPortalMasters.BOM_COSTING_CREATE,
        "POST",
        {
          item_id: selectedItem.item_id,
          co_id: Number(co_id),
          version_label: versionLabel || null,
        }
      );
      if (error) throw new Error(error);
      setCreateOpen(false);
      setSnackbar({ open: true, message: "BOM costing created", severity: "success" });
      // Navigate to cost sheet editor
      router.push(
        `/dashboardportal/BomCosting/bomCosting/costSheet?mode=edit&bom_hdr_id=${data.bom_hdr_id}`
      );
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    }
  };

  const handleView = (row: BomCostingRow) => {
    router.push(
      `/dashboardportal/BomCosting/bomCosting/costSheet?mode=view&bom_hdr_id=${row.bom_hdr_id}`
    );
  };

  const handleEdit = (row: BomCostingRow) => {
    router.push(
      `/dashboardportal/BomCosting/bomCosting/costSheet?mode=edit&bom_hdr_id=${row.bom_hdr_id}`
    );
  };

  const columns = useMemo<GridColDef<BomCostingRow>[]>(
    () => [
      { field: "full_item_code", headerName: "Item Code", flex: 1, minWidth: 180,
        valueGetter: (_value: string, row: BomCostingRow) => row.full_item_code || row.item_code || "-",
      },
      { field: "item_name", headerName: "Item Name", flex: 1.5, minWidth: 180 },
      { field: "bom_version", headerName: "Ver", flex: 0.3, minWidth: 50, type: "number" },
      { field: "version_label", headerName: "Label", flex: 0.6, minWidth: 80 },
      { field: "status_name", headerName: "Status", flex: 0.6, minWidth: 80 },
      {
        field: "material_cost",
        headerName: "Material",
        flex: 0.7,
        minWidth: 100,
        type: "number",
        valueFormatter: (value: number) => value ? `\u20B9 ${value.toLocaleString("en-IN")}` : "-",
      },
      {
        field: "conversion_cost",
        headerName: "Conversion",
        flex: 0.7,
        minWidth: 100,
        type: "number",
        valueFormatter: (value: number) => value ? `\u20B9 ${value.toLocaleString("en-IN")}` : "-",
      },
      {
        field: "total_cost",
        headerName: "Total Cost",
        flex: 0.8,
        minWidth: 110,
        type: "number",
        valueFormatter: (value: number) => value ? `\u20B9 ${value.toLocaleString("en-IN")}` : "-",
        cellClassName: "font-semibold",
      },
    ],
    []
  );

  return (
    <IndexWrapper
      title="BOM Costing"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: (e) => {
          setSearchQuery(e.target.value);
          setPaginationModel((prev) => ({ ...prev, page: 0 }));
        },
        placeholder: "Search by item code/name",
        debounceDelayMs: 1000,
      }}
      createAction={{ onClick: handleOpenCreate }}
      onView={handleView}
      onEdit={handleEdit}
    >
      {/* Create BOM Costing Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New BOM Costing</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={itemOptions}
            value={selectedItem}
            onChange={(_, val) => setSelectedItem(val)}
            onInputChange={(_, val) => {
              if (val.length >= 2) fetchItemOptions(val);
            }}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.item_id === b.item_id}
            renderInput={(params) => (
              <TextField {...params} label="Select Item" size="small" sx={{ mt: 1 }} />
            )}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Version Label (optional)"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g., Initial estimate, Rev A"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!selectedItem}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
