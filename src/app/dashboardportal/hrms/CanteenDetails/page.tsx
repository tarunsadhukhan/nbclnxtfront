"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, IconButton, Snackbar, Tooltip } from "@mui/material";
import {
  GridColDef,
  GridPaginationModel,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import { Check, Trash2 } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import CreateCanteenDetailsPage from "./CreateCanteenDetailsPage";
import { CANTEEN_STATUS, CANTEEN_STATUS_LABEL, type CanteenRow } from "./types";

/**
 * Canteen Details — meals taken per employee per date (table canteen_details).
 * Rows carry their own branch_id, so the list follows the company/branch
 * sidebar selection.
 *
 * Entries are created as Draft (21) and can be edited, approved or deleted
 * only while they stay there. Approving moves the row to 3 (Approved), which
 * locks it — the project-wide rule. Delete is a move to 6 (Cancelled).
 */
export default function CanteenDetailsPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [rows, setRows] = useState<CanteenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 10,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [dialogReadOnly, setDialogReadOnly] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const fetchEntries = useCallback(async () => {
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
        data: CanteenRow[];
        total: number;
      }>(`${apiRoutesPortalMasters.CANTEEN_TABLE}?${params}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch canteen entries");

      setRows((data.data || []).map((r) => ({ ...r, id: r.tran_id })));
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message:
          err instanceof Error ? err.message : "Error fetching canteen entries",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [coId, branchId, paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const handleCreate = useCallback(() => {
    setSelectedId(undefined);
    setDialogReadOnly(false);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((row: CanteenRow) => {
    setSelectedId(row.tran_id);
    setDialogReadOnly(false);
    setDialogOpen(true);
  }, []);

  const handleView = useCallback((row: CanteenRow) => {
    setSelectedId(row.tran_id);
    setDialogReadOnly(true);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedId(undefined);
    setDialogReadOnly(false);
  }, []);

  const handleSaved = useCallback(
    (message: string) => {
      setSnackbar({ open: true, message, severity: "success" });
      void fetchEntries();
    },
    [fetchEntries],
  );

  const handleApprove = useCallback(
    async (row: CanteenRow) => {
      if (
        !confirm(
          `Approve the canteen entry for ${row.emp_code || row.eb_id} on ${row.tran_date}? It cannot be edited or deleted afterwards.`,
        )
      ) {
        return;
      }
      try {
        const { error } = await fetchWithCookie(
          `${apiRoutesPortalMasters.CANTEEN_APPROVE}/${row.tran_id}`,
          "POST",
        );
        if (error) throw new Error(error);
        setSnackbar({
          open: true,
          message: "Canteen entry approved successfully",
          severity: "success",
        });
        void fetchEntries();
      } catch (err: unknown) {
        setSnackbar({
          open: true,
          message: err instanceof Error ? err.message : "Failed to approve entry",
          severity: "error",
        });
      }
    },
    [fetchEntries],
  );

  const handleDelete = useCallback(
    async (row: CanteenRow) => {
      if (
        !confirm(
          `Delete the canteen entry for ${row.emp_code || row.eb_id} on ${row.tran_date}?`,
        )
      ) {
        return;
      }
      try {
        const { error } = await fetchWithCookie(
          `${apiRoutesPortalMasters.CANTEEN_DELETE}/${row.tran_id}`,
          "DELETE",
        );
        if (error) throw new Error(error);
        setSnackbar({
          open: true,
          message: "Canteen entry deleted successfully",
          severity: "success",
        });
        void fetchEntries();
      } catch (err: unknown) {
        setSnackbar({
          open: true,
          message: err instanceof Error ? err.message : "Failed to delete entry",
          severity: "error",
        });
      }
    },
    [fetchEntries],
  );

  const columns = useMemo<GridColDef<CanteenRow>[]>(
    () => [
      { field: "tran_date", headerName: "Date", width: 120 },
      { field: "emp_code", headerName: "EB No", width: 120 },
      { field: "emp_name", headerName: "Employee Name", flex: 2, minWidth: 200 },
      { field: "no_of_meals", headerName: "No. of Meals", type: "number", width: 130 },
      { field: "rate_of_meals", headerName: "Rate", type: "number", width: 110 },
      { field: "amount", headerName: "Amount", type: "number", width: 120 },
      {
        field: "status_id",
        headerName: "Status",
        width: 120,
        valueFormatter: (value: number) =>
          CANTEEN_STATUS_LABEL[value] ?? String(value),
      },
      {
        field: "actions",
        headerName: "",
        width: 110,
        sortable: false,
        filterable: false,
        // Approve and delete exist only while the row is still a draft.
        renderCell: (params: GridRenderCellParams<CanteenRow>) =>
          params.row.status_id !== CANTEEN_STATUS.DRAFT ? null : (
            <>
              <Tooltip title="Approve entry">
                <IconButton
                  size="small"
                  color="success"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleApprove(params.row);
                  }}
                  aria-label="Approve canteen entry"
                >
                  <Check size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete entry">
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDelete(params.row);
                  }}
                  aria-label="Delete canteen entry"
                >
                  <Trash2 size={18} />
                </IconButton>
              </Tooltip>
            </>
          ),
      },
    ],
    [handleApprove, handleDelete],
  );

  return (
    <IndexWrapper
      title="Canteen Details"
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
        placeholder: "Search by EB no or employee name",
        debounceDelayMs: 500,
      }}
      createAction={{ label: "Create Canteen Entry", onClick: handleCreate }}
      onView={handleView}
      onEdit={handleEdit}
      isRowEditable={(row) => row.status_id === CANTEEN_STATUS.DRAFT}
    >
      <CreateCanteenDetailsPage
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={handleSaved}
        editId={selectedId}
        readOnly={dialogReadOnly}
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
