"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import CreateDailyRateEntryPage from "./CreateDailyRateEntryPage";
import type { DailyRateRow } from "./types";

/**
 * Cash / Daily Rate Entry — approved cash rate per outsider worker, date and
 * shift (table outsider_rate_approve). The table has no company/branch column,
 * so the list is scoped through the employee's branch by the backend using the
 * sidebar company/branch selection.
 */
export default function DailyRateEntryPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [rows, setRows] = useState<DailyRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 10,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
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
        data: DailyRateRow[];
        total: number;
      }>(`${apiRoutesPortalMasters.DAILY_RATE_TABLE}?${params}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch rate entries");

      setRows(
        (data.data || []).map((r) => ({ ...r, id: r.outsider_rate_app_id })),
      );
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error fetching rate entries",
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
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((row: DailyRateRow) => {
    setSelectedId(row.outsider_rate_app_id);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedId(undefined);
  }, []);

  const handleSaved = useCallback(
    (message: string) => {
      setSnackbar({ open: true, message, severity: "success" });
      void fetchRates();
    },
    [fetchRates],
  );

  const columns = useMemo<GridColDef<DailyRateRow>[]>(
    () => [
      { field: "app_date", headerName: "Effective From", width: 130 },
      { field: "emp_code", headerName: "EB No", width: 120 },
      { field: "emp_name", headerName: "Employee Name", flex: 2, minWidth: 200 },
      { field: "designation", headerName: "Designation", flex: 2, minWidth: 180 },
      { field: "app_shift", headerName: "Shift", width: 90 },
      {
        field: "rate_approve",
        headerName: "Approved Rate",
        type: "number",
        width: 140,
      },
    ],
    [],
  );

  return (
    <IndexWrapper
      title="Cash / Daily Rate Entry"
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
        placeholder: "Search by EB no, employee name or designation",
        debounceDelayMs: 500,
      }}
      createAction={{ label: "Create Rate Entry", onClick: handleCreate }}
      onEdit={handleEdit}
    >
      <CreateDailyRateEntryPage
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={handleSaved}
        editId={selectedId}
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
