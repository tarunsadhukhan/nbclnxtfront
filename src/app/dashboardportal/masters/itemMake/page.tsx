"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Alert, Stack, Typography } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { apiRoutesPortalMasters } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";
import CreateItemMake from "./createItemMake";

type ItemMakeRow = {
  id: number | string;
  item_make_id?: number;
  item_group_code_display?: string;
  item_group_display?: string;
  item_make?: string;
  [key: string]: any;
};

export default function ItemMakePage() {
  const [rows, setRows] = useState<ItemMakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [openCreate, setOpenCreate] = useState(false);
  const [viewRow, setViewRow] = useState<ItemMakeRow | null>(null);

  const fetchItemMakes = async () => {
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

      const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.ITEM_MAKE_TABLE}?${queryParams}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch item makes");

      const mappedRows = (data.data || []).map((row: any) => ({
        ...row,
        id: row.item_make_id ?? row.id,
        item_make: row.item_make_name ?? row.item_make ?? row.item_make_name_display ?? "",
        item_group_code_display: row.item_group_code_display ?? row.item_grp_code_display ?? row.item_group_code ?? "",
        item_group_display: row.item_group_display ?? row.item_group_name ?? row.item_group ?? "",
      }));
      setRows(mappedRows);
      setTotalRows(data.total || 0);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || "Error fetching item makes", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemMakes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  const handlePaginationModelChange = (newPaginationModel: GridPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchValue = event.target.value;
    setSearchQuery(newSearchValue);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleView = (row: ItemMakeRow) => setViewRow(row);
  const closeView = () => setViewRow(null);

  const columns = useMemo<GridColDef<ItemMakeRow>[]>(() => ([
    {
      field: "item_group_code_display",
      headerName: "Item Group Code",
      flex: 1,
      minWidth: 180,
    },
    {
      field: "item_group_display",
      headerName: "Item Group Name",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "item_make",
      headerName: "Item Make",
      flex: 1,
      minWidth: 200,
    },
  ]), []);

  return (
    <IndexWrapper
      title="Item Make Master"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
  search={{ value: searchQuery, onChange: handleSearchChange, placeholder: "Search item makes", debounceDelayMs: 1000 }}
      createAction={{ onClick: () => setOpenCreate(true) }}
      onView={handleView}
    >
      <CreateItemMake
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => {
          setOpenCreate(false);
          fetchItemMakes();
        }}
      />

      <Dialog open={Boolean(viewRow)} onClose={closeView} fullWidth maxWidth="sm">
        <DialogTitle>Item Make Details</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <div>
              <Typography variant="subtitle2">Item Make</Typography>
              <Typography variant="body2">{String(viewRow?.item_make ?? "-")}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2">Item Group Code</Typography>
              <Typography variant="body2">{String(viewRow?.item_group_code_display ?? "-")}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2">Item Group Name</Typography>
              <Typography variant="body2">{String(viewRow?.item_group_display ?? "-")}</Typography>
            </div>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="secondary" onClick={closeView}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

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
