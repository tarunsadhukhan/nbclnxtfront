"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateJuteSupplier from "./createJuteSupplier";
import type { MuiFormMode } from "@/components/ui/muiform";

/**
 * Type definition for a Jute Supplier row in the data grid
 */
type JuteSupplierRow = {
  id: number | string;
  supplier_id: number;
  supplier_name: string;
  email?: string;
  contact_no?: string;
  updated_by?: number;
  updated_date_time?: string;
  [key: string]: unknown;
};

/**
 * @component JuteSupplierMasterPage
 * @description Index page for Jute Supplier Master - displays a paginated list of jute suppliers.
 * Suppliers are global (not company-specific) and users can add/edit but not delete.
 */
export default function JuteSupplierMasterPage() {
  const [rows, setRows] = useState<JuteSupplierRow[]>([]);
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
   * Fetch jute suppliers from the API
   */
  const fetchJuteSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String((paginationModel.page ?? 0) + 1),
        limit: String(paginationModel.pageSize ?? 10),
      });

      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }

      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.JUTE_SUPPLIER_TABLE}?${queryParams}`,
        "GET"
      );

      if (error || !data) {
        throw new Error(error || "Failed to fetch jute suppliers");
      }

      // Map response data to grid rows
      const mapped: JuteSupplierRow[] = (data.data || []).map((r: Record<string, unknown>) => ({
        ...r,
        id: r.supplier_id as number,
        supplier_id: r.supplier_id as number,
        supplier_name: (r.supplier_name as string) ?? "",
        email: (r.email as string) ?? "-",
        contact_no: (r.contact_no as string) ?? "-",
        updated_date_time: r.updated_date_time
          ? new Date(r.updated_date_time as string).toLocaleDateString()
          : "-",
      }));

      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error fetching jute suppliers";
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
    fetchJuteSuppliers();
  }, [fetchJuteSuppliers]);

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
  const handleView = useCallback((row: JuteSupplierRow) => {
    setSelectedId(row.supplier_id);
    setDialogMode("view");
    setDialogOpen(true);
  }, []);

  /**
   * Handle edit action - opens edit dialog
   */
  const handleEdit = useCallback((row: JuteSupplierRow) => {
    setSelectedId(row.supplier_id);
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
    fetchJuteSuppliers();
  }, [fetchJuteSuppliers]);

  /**
   * Column definitions for the data grid
   */
  const columns = useMemo<GridColDef<JuteSupplierRow>[]>(
    () => [
      {
        field: "supplier_name",
        headerName: "Supplier Name",
        flex: 1.5,
        minWidth: 250,
      },
      {
        field: "email",
        headerName: "Email",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "contact_no",
        headerName: "Contact No",
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
      title="Jute Supplier Master"
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
        placeholder: "Search by supplier name",
        debounceDelayMs: 500,
      }}
      createAction={{
        label: "Add Supplier",
        onClick: handleCreate,
      }}
      onView={handleView}
      onEdit={handleEdit}
    >
      <CreateJuteSupplier
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
