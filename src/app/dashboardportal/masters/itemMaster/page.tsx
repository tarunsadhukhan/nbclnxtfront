
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Snackbar, Alert } from "@mui/material";
import CreateItem from "./createItem";
import BulkCreateItem from "./bulkCreateItem";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

type Item = {
  id: number;
  item_code: string;
  item_name: string;
  item_type: string;
  active: number;
  [key: string]: any;
};
export default function ItemMasterPage() {
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewData, setViewData] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItemData, setEditItemData] = useState<any>(null);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Fetch items from API with pagination and search
  const fetchItems = async () => {
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const queryParams = new URLSearchParams({
        page: (paginationModel.page + 1).toString(),
        limit: paginationModel.pageSize.toString(),
        co_id: co_id,
      });
      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }
      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.GET_ITEM_TABLE}?${queryParams}`,
        "GET"
      );
      if (error || !data) {
        throw new Error(error || "Failed to fetch items");
      }
      // API returns data in { data: [...], total: number } format
      // Add 'id' property for MUI DataGrid and ensure 'active' is a number
      const mappedRows = (data.data || []).map((row: any) => ({
        ...row,
        id: row.item_id ?? row.id,
        active: typeof row.active === "string" ? Number(row.active) : row.active,
      }));
      setRows(mappedRows);
      setTotalRows(data.total || 0);
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || "Error fetching items", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data when pagination or search changes
  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  // Handle pagination model change
  const handlePaginationModelChange = (newPaginationModel: GridPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };

  // Handle search with debounce
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchValue = event.target.value;
    setSearchQuery(newSearchValue);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  // Open dialog for create (handled by CreateItem component)
  // ...existing code...

  const openCreateDialog = () => setCreateDialogOpen(true);
  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    fetchItems();
  };

  const openBulkDialog = () => setBulkDialogOpen(true);
  const closeBulkDialog = (didCreate: boolean) => {
    setBulkDialogOpen(false);
    if (didCreate) fetchItems();
  };

  const fetchItemSetup = async (itemId: number) => {
    const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
    const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
    const params = new URLSearchParams({ item_id: String(itemId), co_id: co_id });
    const apiUrl = `${apiRoutesPortalMasters.ITEM_EDIT_SETUP}?${params}`;
    const { data, error } = await fetchWithCookie(apiUrl, "GET") as any;
    if (error || !data) {
      throw new Error(error || "Failed to fetch item setup");
    }
    return data;
  };

  const handleView = async (row: Item) => {
    const targetId = row.item_id ?? row.id;
    if (typeof targetId === "undefined" || targetId === null) {
      return;
    }
    setViewDialogOpen(true);
    setViewData(null);
    try {
      const data = await fetchItemSetup(targetId);
      setViewData(data);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || "Failed to load item", severity: "error" });
      setViewDialogOpen(false);
    }
  };

  const handleEdit = async (row: Item) => {
    const targetId = row.item_id ?? row.id;
    if (typeof targetId === "undefined" || targetId === null) {
      return;
    }
    setEditDialogOpen(true);
    setEditItemId(targetId);
    setEditItemData(null);
    try {
      const data = await fetchItemSetup(targetId);
      setEditItemData(data);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || "Failed to load edit setup", severity: "error" });
      setEditDialogOpen(false);
      setEditItemId(null);
    }
  };

  const columns = useMemo<GridColDef<Item>[]>(() => ([
    { field: "full_item_code", headerName: "Item Code", flex: 1, minWidth: 180,
      valueGetter: (_value: string, row: Item) => row.full_item_code || row.item_code || "-",
    },
    { field: "item_name", headerName: "Item Name", flex: 1, minWidth: 180 },
    { field: "item_group_code_display", headerName: "Group Code", flex: 1, minWidth: 120 },
    { field: "item_group_display", headerName: "Group Name", flex: 1, minWidth: 180 },
  ]), []);

  return (
    <IndexWrapper
      title="Item Master"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
  search={{ value: searchQuery, onChange: handleSearchChange, placeholder: "Search items", debounceDelayMs: 1000 }}
      createAction={{ onClick: openCreateDialog }}
      onView={handleView}
      onEdit={handleEdit}
      toolbarContent={
        <Button onClick={openBulkDialog} variant="outline" size="sm">
          Bulk Create
        </Button>
      }
    >
      <CreateItem open={createDialogOpen} onClose={closeCreateDialog} />
      <BulkCreateItem open={bulkDialogOpen} onClose={closeBulkDialog} />

      <CreateItem
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false);
          setViewData(null);
        }}
        mode="view"
        itemId={viewData?.item_details?.item_id ?? viewData?.item_id ?? undefined}
        prefetchedSetup={viewData}
        prefetchedItem={viewData}
      />

      <CreateItem
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditItemData(null);
          setEditItemId(null);
          fetchItems();
        }}
        mode="edit"
        itemId={editItemId ?? undefined}
        prefetchedSetup={editItemData}
        prefetchedItem={editItemData}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}