"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import CreateBeamProductionPage from "./CreateBeamProductionPage";
import type { BeamingHdrRow } from "./types";

/** Fixed-decimal cell formatter; blank for null. */
const fixed = (dp: number) => (value: number | null) => (value != null ? value.toFixed(dp) : "");

/**
 * Beaming Production — fortnight entries per shift + machine, as on the legacy
 * Smart Eye "Prod - Beaming" screen. Each row is one header (beaming_prod_hdr)
 * with its derived Eff/Div HR, Prod Value, L.HR Value, Total, KAV and Rate1-3
 * from vw_beaming_prod_hdr. Scoped by the sidebar company/branch selection.
 */
export default function BeamProductionPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [rows, setRows] = useState<BeamingHdrRow[]>([]);
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
        data: BeamingHdrRow[];
        total: number;
      }>(`${apiRoutesPortalMasters.BEAMING_PROD_TABLE}?${params}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch beaming production");

      setRows((data.data || []).map((r) => ({ ...r, id: r.beaming_hdr_id })));
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error fetching beaming production",
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

  const handleEdit = useCallback((row: BeamingHdrRow) => {
    setSelectedId(row.beaming_hdr_id);
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

  const columns = useMemo<GridColDef<BeamingHdrRow>[]>(
    () => [
      { field: "fne_date", headerName: "F/N E. DATE", width: 110 },
      { field: "period", headerName: "PERIOD", width: 100 },
      { field: "shift", headerName: "SHIFT", width: 70 },
      { field: "machine_name", headerName: "MACHINE", width: 100 },
      { field: "mach_hrs", headerName: "MACH HR", type: "number", width: 85 },
      { field: "lost_hrs", headerName: "LOST HR", type: "number", width: 85 },
      { field: "eff_hrs", headerName: "EFF HR", type: "number", width: 80 },
      { field: "div_hrs", headerName: "DIV HR", type: "number", width: 80 },
      { field: "prod_qty", headerName: "PROD", type: "number", width: 100 },
      { field: "prod_value", headerName: "PROD VALUE", type: "number", width: 110, valueFormatter: fixed(2) },
      { field: "lhr_value", headerName: "L.HR VALUE", type: "number", width: 105, valueFormatter: fixed(2) },
      { field: "total_value", headerName: "TOTAL", type: "number", width: 95, valueFormatter: fixed(2) },
      { field: "kav", headerName: "KAV", type: "number", width: 100, valueFormatter: fixed(6) },
      { field: "rate1", headerName: "RATE1", type: "number", width: 100, valueFormatter: fixed(6) },
      { field: "rate2", headerName: "RATE2", type: "number", width: 100, valueFormatter: fixed(6) },
      { field: "rate3", headerName: "RATE3", type: "number", width: 100, valueFormatter: fixed(6) },
    ],
    [],
  );

  return (
    <IndexWrapper
      title="Beaming Production"
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
        placeholder: "Search by machine, shift or period",
        debounceDelayMs: 500,
      }}
      createAction={{ label: "Create Entry", onClick: handleCreate }}
      onEdit={handleEdit}
    >
      <CreateBeamProductionPage
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
