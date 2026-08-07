"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateBatchPlan from "./createBatchPlan";
import type { MuiFormMode } from "@/components/ui/muiform";

/**
 * Type definition for a Batch Plan row in the data grid
 */
type BatchPlanRow = {
  id: number | string;
  batch_plan_id: number;
  plan_name: string;
  branch_id?: number;
  branch_name?: string;
  line_item_count?: number;
  updated_by?: number;
  updated_date_time?: string;
  [key: string]: unknown;
};

/**
 * @component BatchPlanMstPage
 * @description Index page for Batch Plan Master - displays a paginated list of batch plans
 * with their line item counts.
 */
export default function BatchPlanMstPage() {
  const [rows, setRows] = useState<BatchPlanRow[]>([]);
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
   * Get branch ID from localStorage (selectedBranches is an array of branch IDs)
   */
  const getBranchId = useCallback((): string => {
    const selectedBranches = localStorage.getItem("sidebar_selectedBranches");
    if (!selectedBranches) return "";
    try {
      const branches = JSON.parse(selectedBranches) as number[];
      return branches.length > 0 ? String(branches[0]) : "";
    } catch {
      return "";
    }
  }, []);

  /**
   * Fetch batch plans from the API
   */
  const fetchBatchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const branch_id = getBranchId();

      if (!branch_id) {
        throw new Error("No branch selected");
      }

      const queryParams = new URLSearchParams({
        page: String((paginationModel.page ?? 0) + 1),
        limit: String(paginationModel.pageSize ?? 10),
        branch_id,
      });

      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }

      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.BATCH_PLAN_TABLE}?${queryParams}`,
        "GET"
      );

      if (error || !data) {
        throw new Error(error || "Failed to fetch batch plans");
      }

      // Map response data to grid rows
      const mapped: BatchPlanRow[] = (data.data || []).map((r: Record<string, unknown>) => ({
        ...r,
        id: r.batch_plan_id as number,
        batch_plan_id: r.batch_plan_id as number,
        plan_name: (r.plan_name as string) ?? "",
        branch_id: r.branch_id as number | undefined,
        branch_name: (r.branch_name as string) ?? "-",
        line_item_count: (r.line_item_count as number) ?? 0,
        updated_date_time: r.updated_date_time
          ? new Date(r.updated_date_time as string).toLocaleDateString()
          : "-",
      }));

      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error fetching batch plans";
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, searchQuery, getBranchId]);

  useEffect(() => {
    fetchBatchPlans();
  }, [fetchBatchPlans]);

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
  const handleView = useCallback((row: BatchPlanRow) => {
    setSelectedId(row.batch_plan_id);
    setDialogMode("view");
    setDialogOpen(true);
  }, []);

  /**
   * Handle edit action - opens edit dialog
   */
  const handleEdit = useCallback((row: BatchPlanRow) => {
    setSelectedId(row.batch_plan_id);
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
    fetchBatchPlans();
  }, [fetchBatchPlans]);

  /**
   * Column definitions for the data grid
   */
  const columns = useMemo<GridColDef<BatchPlanRow>[]>(
    () => [
      {
        field: "plan_name",
        headerName: "Plan Name",
        flex: 1.5,
        minWidth: 250,
      },
      {
        field: "branch_name",
        headerName: "Branch",
        flex: 1,
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
      title="Batch Plan Master"
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
        placeholder: "Search by plan name",
        debounceDelayMs: 500,
      }}
      createAction={{
        label: "Create Batch Plan",
        onClick: handleCreate,
      }}
      onView={handleView}
      onEdit={handleEdit}
    >
      <CreateBatchPlan
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
