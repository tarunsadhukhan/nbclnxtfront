"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateYarnMaster from "./createYarnMaster";
import type { MuiFormMode } from "@/components/ui/muiform";

/**
 * Type definition for a Yarn Master row in the data grid
 */
type YarnMasterRow = {
  id: number | string;
  jute_yarn_id: number;
  jute_yarn_name: string;
  jute_yarn_count?: number;
  std_mr_pct?: number;
  item_grp_id?: number;
  item_grp_name?: string;
  item_id?: number;
  item_code?: string;
  jute_yarn_remarks?: string;
  updated_by?: number;
  updated_date_time?: string;
  [key: string]: unknown;
};

/**
 * @component YarnMasterPage
 * @description Index page for Yarn Master - displays a paginated list of yarn masters
 * with their associated yarn type names.
 */
export default function YarnMasterPage() {
  const [rows, setRows] = useState<YarnMasterRow[]>([]);
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
   * Fetch yarn masters from the API
   */
  const fetchYarnMasters = useCallback(async () => {
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
        `${apiRoutesPortalMasters.YARN_TABLE}?${queryParams}`,
        "GET"
      );

      if (error || !data) {
        throw new Error(error || "Failed to fetch yarn masters");
      }

      // Map response data to grid rows
      const mapped: YarnMasterRow[] = (data.data || []).map((r: Record<string, unknown>) => ({
        ...r,
        id: r.jute_yarn_id as number,
        jute_yarn_id: r.jute_yarn_id as number,
        jute_yarn_name: (r.jute_yarn_name as string) ?? "",
        jute_yarn_count: r.jute_yarn_count as number | undefined,
        std_mr_pct: r.std_mr_pct as number | undefined,
        item_grp_id: r.item_grp_id as number | undefined,
        item_grp_name: (r.item_grp_name as string) ?? "-",
        item_id: r.item_id as number | undefined,
        item_code: (r.item_code as string) ?? "-",
        jute_yarn_remarks: (r.jute_yarn_remarks as string) ?? "-",
        updated_date_time: r.updated_date_time
          ? new Date(r.updated_date_time as string).toLocaleDateString()
          : "-",
      }));

      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error fetching yarn masters";
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
    fetchYarnMasters();
  }, [fetchYarnMasters]);

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
  const handleView = useCallback((row: YarnMasterRow) => {
    setSelectedId(row.jute_yarn_id);
    setDialogMode("view");
    setDialogOpen(true);
  }, []);

  /**
   * Handle edit action - opens edit dialog
   */
  const handleEdit = useCallback((row: YarnMasterRow) => {
    setSelectedId(row.jute_yarn_id);
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
    fetchYarnMasters();
  }, [fetchYarnMasters]);

  /**
   * Column definitions for the data grid
   */
  const columns = useMemo<GridColDef<YarnMasterRow>[]>(
    () => [
      {
        field: "jute_yarn_name",
        headerName: "Yarn Name",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "item_code",
        headerName: "Item Code",
        flex: 0.8,
        minWidth: 150,
      },
      {
        field: "jute_yarn_count",
        headerName: "Yarn Count",
        flex: 0.7,
        minWidth: 120,
        valueFormatter: (value: number | undefined) =>
          value !== undefined && value !== null ? value.toString() : "-",
      },
      {
        field: "std_mr_pct",
        headerName: "Std MR %",
        flex: 0.7,
        minWidth: 110,
        valueFormatter: (value: number | undefined) =>
          value !== undefined && value !== null ? value.toString() : "-",
      },
      {
        field: "item_grp_name",
        headerName: "Yarn Type",
        flex: 1,
        minWidth: 180,
      },
      {
        field: "jute_yarn_remarks",
        headerName: "Remarks",
        flex: 1.2,
        minWidth: 200,
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
      title="Yarn Master"
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
        placeholder: "Search by name, type, or remarks",
        debounceDelayMs: 500,
      }}
      createAction={{
        label: "Create Yarn",
        onClick: handleCreate,
      }}
      onView={handleView}
      onEdit={handleEdit}
    >
      <CreateYarnMaster
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
