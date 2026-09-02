"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import CreateFinishingProductionPage from "./CreateFinishingProductionPage";
import type { FinishingProdRow } from "./types";

/**
 * Finishing Production — per-worker sewing production entries (table
 * finishing_production). Each row records the worker, date, shift, machine
 * (hirakol/hemming), quality, hours and production; the rate comes from the
 * wages quality master and the amount (rate x prod) is computed by the
 * database. Scoped by the sidebar company/branch selection.
 */
export default function FinishingProductionPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [rows, setRows] = useState<FinishingProdRow[]>([]);
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
        data: FinishingProdRow[];
        total: number;
      }>(`${apiRoutesPortalMasters.FINISHING_PROD_TABLE}?${params}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch finishing production");

      setRows((data.data || []).map((r) => ({ ...r, id: r.finishing_prod_id })));
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error fetching finishing production",
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
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((row: FinishingProdRow) => {
    setSelectedId(row.finishing_prod_id);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedId(undefined);
  }, []);

  const handleSaved = useCallback(
    (message: string) => {
      setSnackbar({ open: true, message, severity: "success" });
      void fetchEntries();
    },
    [fetchEntries],
  );

  const columns = useMemo<GridColDef<FinishingProdRow>[]>(
    () => [
      { field: "prod_date", headerName: "DATE", width: 105 },
      { field: "shift", headerName: "SHIFT", width: 70 },
      { field: "emp_code", headerName: "ECODE", width: 90 },
      { field: "emp_name", headerName: "NAME", flex: 1, minWidth: 160 },
      { field: "machine_name", headerName: "MC NAME", width: 90 },
      { field: "quality_code", headerName: "Q-CODE", width: 80 },
      { field: "quality_desc", headerName: "TYPE", flex: 1, minWidth: 170 },
      { field: "wk_hrs", headerName: "WK HRS", type: "number", width: 85 },
      { field: "prod_qty", headerName: "PROD", type: "number", width: 90 },
      {
        field: "rate",
        headerName: "RATE",
        type: "number",
        width: 100,
        valueFormatter: (value: number | null) =>
          value != null ? value.toFixed(6) : "",
      },
      { field: "amount", headerName: "AMT", type: "number", width: 90 },
    ],
    [],
  );

  return (
    <IndexWrapper
      title="Finishing Production"
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
        placeholder: "Search by ECODE, name, machine or quality",
        debounceDelayMs: 500,
      }}
      createAction={{ label: "Create Entry", onClick: handleCreate }}
      onEdit={handleEdit}
    >
      <CreateFinishingProductionPage
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
