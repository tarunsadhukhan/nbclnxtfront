"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert, IconButton, Tooltip } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Trash2 } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateJuteAgentMap from "./createJuteAgentMap";
import type { MuiFormMode } from "@/components/ui/muiform";

/**
 * Type definition for a Jute Agent Map row in the data grid
 */
type JuteAgentMapRow = {
  id: number | string;
  agent_map_id: number;
  agent_branch_id: number;
  agent_branch_display: string;
  agent_branch_name: string;
  agent_company_name: string;
  party_branch_id: number;
  party_branch_display: string;
  party_name: string;
  party_code?: string;
  party_branch_address?: string;
  party_branch_gst?: string;
  [key: string]: unknown;
};

/**
 * @component JuteAgentMapPage
 * @description Index page for Jute Agent Map - displays a paginated list of agent branch
 * to party branch mappings. Mappings are company-specific (filtered by co_id).
 * 
 * Agent Branch displays: Company Name - Branch Name
 * Party Branch displays: Party Name - Address
 * 
 * Users can add new mappings but cannot edit existing ones (only delete).
 */
export default function JuteAgentMapPage() {
  const [rows, setRows] = useState<JuteAgentMapRow[]>([]);
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
  const [selectedRow, setSelectedRow] = useState<JuteAgentMapRow | undefined>(undefined);
  const [dialogMode, setDialogMode] = useState<MuiFormMode>("create");

  /**
   * Get company ID from localStorage
   */
  const getCoId = useCallback((): string => {
    const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
    return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
  }, []);

  /**
   * Fetch jute agent maps from the API
   */
  const fetchJuteAgentMaps = useCallback(async () => {
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
        `${apiRoutesPortalMasters.JUTE_AGENT_MAP_TABLE}?${queryParams}`,
        "GET"
      );

      if (error || !data) {
        throw new Error(error || "Failed to fetch jute agent maps");
      }

      // Map response data to grid rows
      const mapped: JuteAgentMapRow[] = (data.data || []).map((r: Record<string, unknown>) => ({
        ...r,
        id: r.agent_map_id as number,
        agent_map_id: r.agent_map_id as number,
        agent_branch_id: r.agent_branch_id as number,
        agent_branch_display: (r.agent_branch_display as string) ?? "-",
        agent_branch_name: (r.agent_branch_name as string) ?? "-",
        agent_company_name: (r.agent_company_name as string) ?? "-",
        party_branch_id: r.party_branch_id as number,
        party_branch_display: (r.party_branch_display as string) ?? "-",
        party_name: (r.party_name as string) ?? "-",
        party_code: (r.party_code as string) ?? "-",
        party_branch_address: (r.party_branch_address as string) ?? "",
        party_branch_gst: (r.party_branch_gst as string) ?? "",
      }));

      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error fetching jute agent maps";
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
    fetchJuteAgentMaps();
  }, [fetchJuteAgentMaps]);

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
  const handleView = useCallback((row: JuteAgentMapRow) => {
    setSelectedRow(row);
    setDialogMode("view");
    setDialogOpen(true);
  }, []);

  /**
   * Handle delete action
   */
  const handleDelete = useCallback(async (row: JuteAgentMapRow) => {
    if (!confirm(`Are you sure you want to remove the mapping between "${row.agent_branch_display}" and "${row.party_branch_display}"?`)) {
      return;
    }

    try {
      const co_id = getCoId();
      if (!co_id) {
        throw new Error("No company selected");
      }

      const { error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.JUTE_AGENT_MAP_DELETE}/${row.agent_map_id}?co_id=${co_id}`,
        "DELETE"
      );

      if (error) {
        throw new Error(error);
      }

      setSnackbar({
        open: true,
        message: "Mapping deleted successfully",
        severity: "success",
      });

      // Refresh the list
      fetchJuteAgentMaps();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete mapping";
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
    }
  }, [getCoId, fetchJuteAgentMaps]);

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
    fetchJuteAgentMaps();
  }, [fetchJuteAgentMaps]);

  /**
   * Column definitions for the data grid
   */
  const columns = useMemo<GridColDef<JuteAgentMapRow>[]>(
    () => [
      {
        field: "agent_branch_display",
        headerName: "Agent Branch (Company - Branch)",
        flex: 1.5,
        minWidth: 250,
      },
      {
        field: "party_branch_display",
        headerName: "Party Branch (Party - Address)",
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
        field: "__delete",
        headerName: "Delete",
        width: 80,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Tooltip title="Remove mapping">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(params.row);
              }}
              aria-label="Delete mapping"
            >
              <Trash2 size={18} />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [handleDelete]
  );

  return (
    <IndexWrapper
      title="Jute Agent Mapping"
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
        placeholder: "Search by branch, company, or party name",
        debounceDelayMs: 500,
      }}
      createAction={{
        label: "Add Mapping",
        onClick: handleCreate,
      }}
      onView={handleView}
    >
      <CreateJuteAgentMap
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
