"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateJuteQuality from "./createJuteQuality";
import type { MuiFormMode } from "@/components/ui/muiform";

/**
 * Type definition for a Jute Quality row in the data grid
 */
type JuteQualityRow = {
  id: number | string;
  jute_qlty_id: number;
  jute_quality: string;
  item_id?: number;
  item_name?: string;
  item_code?: string;
  updated_by?: number;
  updated_date_time?: string;
  [key: string]: unknown;
};

/**
 * @component JuteQualityMasterPage
 * @description Index page for Jute Quality Master - displays a paginated list of jute qualities
 * with their associated item names from item_mst table.
 */
export default function JuteQualityMasterPage() {
  const [rows, setRows] = useState<JuteQualityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 10,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<MuiFormMode>("create");

  /**
   * Fetch jute qualities from the API
   */
  const fetchJuteQualities = useCallback(async () => {
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";

      if (!co_id) {
        throw new Error("No company selected");
      }

      const queryParams = new URLSearchParams({
        page: String((paginationModel.page ?? 0) + 1),
        limit: String(paginationModel.pageSize ?? 10),
        co_id,
      });

      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }

      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.JUTE_QUALITY_TABLE}?${queryParams}`,
        "GET"
      );

      if (error || !data) {
        throw new Error(error || "Failed to fetch jute qualities");
      }

      // Map response data to grid rows
      const mapped: JuteQualityRow[] = (data.data || []).map((r: Record<string, unknown>) => ({
        ...r,
        id: r.jute_qlty_id as number,
        jute_qlty_id: r.jute_qlty_id as number,
        jute_quality: (r.jute_quality as string) ?? "",
        item_id: r.item_id as number | undefined,
        item_name: (r.item_name as string) ?? "-",
        item_code: (r.item_code as string) ?? "-",
        updated_date_time: r.updated_date_time
          ? new Date(r.updated_date_time as string).toLocaleDateString()
          : "-",
      }));

      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error fetching jute qualities";
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => {
    fetchJuteQualities();
  }, [fetchJuteQualities]);

  const handlePaginationModelChange = (newModel: GridPaginationModel) => {
    setPaginationModel(newModel);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    // Reset to first page on search
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  /**
   * Handle create button click
   */
  const handleCreate = useCallback(() => {
    setSelectedId(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  }, []);

  /**
   * Handle view action - opens view dialog
   */
  const handleView = useCallback((row: JuteQualityRow) => {
    setSelectedId(row.jute_qlty_id);
    setDialogMode("view");
    setDialogOpen(true);
  }, []);

  /**
   * Handle edit action - opens edit dialog
   */
  const handleEdit = useCallback((row: JuteQualityRow) => {
    setSelectedId(row.jute_qlty_id);
    setDialogMode("edit");
    setDialogOpen(true);
  }, []);

  /**
   * Handle dialog close
   */
  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedId(undefined);
  }, []);

  /**
   * Handle successful save - refresh list
   */
  const handleSaved = useCallback(() => {
    fetchJuteQualities();
  }, [fetchJuteQualities]);

  /**
   * Column definitions for the data grid
   */
  const columns = useMemo<GridColDef<JuteQualityRow>[]>(
    () => [
      {
        field: "jute_quality",
        headerName: "Jute Quality",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "item_name",
        headerName: "Item Name",
        flex: 1.5,
        minWidth: 250,
      },
      {
        field: "item_code",
        headerName: "Item Code",
        flex: 0.8,
        minWidth: 150,
      },
      {
        field: "updated_date_time",
        headerName: "Last Updated",
        flex: 0.8,
        minWidth: 120,
      },
    ],
    []
  );

  return (
    <IndexWrapper
      title="Jute Quality Master"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search by quality or item name",
        debounceDelayMs: 500,
      }}
      createAction={{
        label: "Create Jute Quality",
        onClick: handleCreate,
      }}
      onView={handleView}
      onEdit={handleEdit}
    >
      <CreateJuteQuality
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={handleSaved}
        editId={selectedId}
        initialMode={dialogMode}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={handleSnackbarClose}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
