"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateJuteSupplierMap from "./createJuteSupplierMap";
import type { MuiFormMode } from "@/components/ui/muiform";

/**
 * Type definition for a Jute Supplier Map row in the data grid
 */
type JuteSupplierMapRow = {
  id: number | string;
  map_id: number;
  jute_supplier_id: number;
  supplier_name: string;
  party_id: number;
  party_name: string;
  party_code?: string;
  updated_by?: number;
  updated_date_time?: string;
  [key: string]: unknown;
};

/**
 * @component JuteSupplierMapPage
 * @description Index page for Jute Supplier Map - displays a paginated list of jute supplier
 * to party mappings. Mappings are company-specific (filtered by co_id).
 * Users can add new mappings but cannot edit existing ones (only delete).
 */
export default function JuteSupplierMapPage() {
  const [rows, setRows] = useState<JuteSupplierMapRow[]>([]);
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
  const [selectedRow, setSelectedRow] = useState<JuteSupplierMapRow | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<MuiFormMode>("create");

  /**
   * Get company ID from localStorage
   */
  const getCoId = useCallback((): string => {
    const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
    return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
  }, []);

  /**
   * Fetch jute supplier maps from the API
   */
  const fetchJuteSupplierMaps = useCallback(async () => {
    setLoading(true);
    try {
      const co_id = getCoId();
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
        `${apiRoutesPortalMasters.JUTE_SUPPLIER_MAP_TABLE}?${queryParams}`,
        "GET"
      );

      if (error || !data) {
        throw new Error(error || "Failed to fetch jute supplier maps");
      }

      // Map response data to grid rows
      const mapped: JuteSupplierMapRow[] = (data.data || []).map((r: Record<string, unknown>) => ({
        ...r,
        id: r.map_id as number,
        map_id: r.map_id as number,
        jute_supplier_id: r.jute_supplier_id as number,
        supplier_name: (r.supplier_name as string) ?? "-",
        party_id: r.party_id as number,
        party_name: (r.party_name as string) ?? "-",
        party_code: (r.party_code as string) ?? "-",
        updated_date_time: r.updated_date_time
          ? new Date(r.updated_date_time as string).toLocaleDateString()
          : "-",
      }));

      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error fetching jute supplier maps";
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, searchQuery, getCoId]);

  useEffect(() => {
    fetchJuteSupplierMaps();
  }, [fetchJuteSupplierMaps]);

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
    setSelectedRow(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  }, []);

  /**
   * Handle view action - opens view dialog
   */
  const handleView = useCallback((row: JuteSupplierMapRow) => {
    setSelectedRow(row);
    setDialogMode("view");
    setDialogOpen(true);
  }, []);

  /**
   * Handle dialog close
   */
  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedRow(undefined);
  }, []);

  /**
   * Handle successful save - refresh list
   */
  const handleSaved = useCallback(() => {
    fetchJuteSupplierMaps();
  }, [fetchJuteSupplierMaps]);

  /**
   * Column definitions for the data grid
   */
  const columns = useMemo<GridColDef<JuteSupplierMapRow>[]>(
    () => [
      {
        field: "supplier_name",
        headerName: "Jute Supplier",
        flex: 1.2,
        minWidth: 200,
      },
      {
        field: "party_name",
        headerName: "Party Name",
        flex: 1.5,
        minWidth: 250,
      },
      {
        field: "party_code",
        headerName: "Party Code",
        flex: 0.8,
        minWidth: 120,
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
      title="Jute Supplier Party Map"
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
        placeholder: "Search by supplier or party name",
        debounceDelayMs: 500,
      }}
      createAction={{
        label: "Add Mapping",
        onClick: handleCreate,
      }}
      onView={handleView}
    >
      <CreateJuteSupplierMap
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={handleSaved}
        viewData={selectedRow}
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
