"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, IconButton, Snackbar, Tooltip } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Copy } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import BulkRateChangeDialog from "./BulkRateChangeDialog";
import CreateWorkerRatePage from "./CreateWorkerRatePage";
import type { WorkerRateRow } from "./types";

/**
 * Worker Rate Muster — basic/DA rates and PF/ESI/PTAX applicability flags per
 * worker (table worker_rate_mst). The table has no company/branch column, so
 * the list is scoped through the employee's branch by the backend using the
 * sidebar company/branch selection.
 */
export default function WorkerRateMusterPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [rows, setRows] = useState<WorkerRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 10,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [cloneId, setCloneId] = useState<number | undefined>(undefined);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const fetchRates = useCallback(async () => {
    if (coId == null) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        co_id: String(coId),
        page: String((paginationModel.page ?? 0) + 1),
        limit: String(paginationModel.pageSize ?? 10),
      });
      if (branchId != null) params.append("branch_id", String(branchId));
      if (searchQuery) params.append("search", searchQuery);

      const { data, error } = await fetchWithCookie<{
        data: WorkerRateRow[];
        total: number;
      }>(`${apiRoutesPortalMasters.WORKER_RATE_TABLE}?${params}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch worker rates");

      setRows((data.data || []).map((r) => ({ ...r, id: r.worker_rate_id })));
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error fetching worker rates",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [coId, branchId, paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => {
    void fetchRates();
  }, [fetchRates]);

  const handleCreate = useCallback(() => {
    setSelectedId(undefined);
    setCloneId(undefined);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((row: WorkerRateRow) => {
    setSelectedId(row.worker_rate_id);
    setCloneId(undefined);
    setDialogOpen(true);
  }, []);

  const handleClone = useCallback((row: WorkerRateRow) => {
    setSelectedId(undefined);
    setCloneId(row.worker_rate_id);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedId(undefined);
    setCloneId(undefined);
  }, []);

  const handleSaved = useCallback(
    (message: string) => {
      setSnackbar({ open: true, message, severity: "success" });
      void fetchRates();
    },
    [fetchRates],
  );

  const columns = useMemo<GridColDef<WorkerRateRow>[]>(
    () => [
      { field: "emp_code", headerName: "ECODE", width: 100 },
      { field: "emp_name", headerName: "ENAME", flex: 2, minWidth: 200 },
      { field: "effective_date", headerName: "Effective From", width: 120 },
      { field: "fbasic", headerName: "FBASIC", type: "number", width: 110 },
      { field: "fbasic_hr", headerName: "FBASIC HR", type: "number", width: 110 },
      { field: "da_all", headerName: "DA ALL", width: 80 },
      { field: "da_rate", headerName: "DA RATE", type: "number", width: 110 },
      { field: "hra", headerName: "HRA", width: 70 },
      { field: "hrd", headerName: "HRD", width: 70 },
      { field: "quarter", headerName: "QUARTER", width: 90 },
      { field: "pf", headerName: "PF", width: 70 },
      { field: "esi", headerName: "ESI", width: 70 },
      { field: "ptax", headerName: "PTAX", width: 70 },
      {
        field: "__clone",
        headerName: "",
        width: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <Tooltip title="Clone as new rate">
            <IconButton
              size="small"
              aria-label="Clone worker rate"
              onClick={(e) => {
                e.stopPropagation();
                handleClone(params.row);
              }}
            >
              <Copy size={16} />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [handleClone],
  );

  return (
    <IndexWrapper
      title="Worker Rate Muster"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setSearchQuery(e.target.value);
          setPaginationModel((prev) => ({ ...prev, page: 0 }));
        },
        placeholder: "Search by ECODE or employee name",
        debounceDelayMs: 500,
      }}
      createAction={{ label: "Create Worker Rate", onClick: handleCreate }}
      onEdit={handleEdit}
      toolbarContent={
        <Button variant="outlined" size="small" onClick={() => setBulkOpen(true)}>
          Bulk Rate Change
        </Button>
      }
    >
      <CreateWorkerRatePage
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={handleSaved}
        editId={selectedId}
        cloneId={cloneId}
      />
      <BulkRateChangeDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSaved={handleSaved}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
