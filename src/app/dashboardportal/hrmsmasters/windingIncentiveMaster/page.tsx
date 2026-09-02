"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateWindingIncentivePage from "./CreateWindingIncentivePage";
import type { WindingIncentiveRow } from "./types";

/** Range like "20 - 25" / "22 & above"; empty when the row has no slab. */
const rangeLabel = (from: number | null, to: number | null): string => {
  if (from == null && to == null) return "";
  if (to == null) return `${from} & above`;
  return `${from} - ${to}`;
};

/**
 * Winding Incentive Master — incentive scheme rows per winding quality
 * (table winding_incentive_mst): a flat amount per eligibility hours for
 * warp qualities, or one row per production slab for weft qualities. The
 * per-hour rate is a database generated column (amount / eligibility hrs)
 * and is the rate applied to winding production entries. Tenant-wide
 * master — not scoped by the sidebar company/branch selection.
 */
export default function WindingIncentiveMasterPage() {
  const [rows, setRows] = useState<WindingIncentiveRow[]>([]);
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

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String((paginationModel.page ?? 0) + 1),
        limit: String(paginationModel.pageSize ?? 10),
      });
      if (searchQuery) params.append("search", searchQuery);

      const { data, error } = await fetchWithCookie<{
        data: WindingIncentiveRow[];
        total: number;
      }>(`${apiRoutesPortalMasters.WINDING_INCENTIVE_TABLE}?${params}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch incentive rows");

      setRows((data.data || []).map((r) => ({ ...r, id: r.winding_incentive_id })));
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error fetching incentive rows",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const handleCreate = useCallback(() => {
    setSelectedId(undefined);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((row: WindingIncentiveRow) => {
    setSelectedId(row.winding_incentive_id);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedId(undefined);
  }, []);

  const handleSaved = useCallback(
    (message: string) => {
      setSnackbar({ open: true, message, severity: "success" });
      void fetchRows();
    },
    [fetchRows],
  );

  const columns = useMemo<GridColDef<WindingIncentiveRow>[]>(
    () => [
      { field: "quality_code", headerName: "QLTY CODE", width: 100 },
      { field: "quality_name", headerName: "QUALITY", flex: 1, minWidth: 170 },
      { field: "inc_code", headerName: "INC CODE", width: 90 },
      {
        field: "grist_from",
        headerName: "GRIST",
        width: 110,
        valueGetter: (_value, row) => rangeLabel(row.grist_from, row.grist_to),
      },
      {
        field: "prod_from",
        headerName: "PROD SLAB (BDL/8HRS)",
        width: 170,
        valueGetter: (_value, row) => rangeLabel(row.prod_from, row.prod_to),
      },
      { field: "incentive_amt", headerName: "INCENTIVE (RS.)", type: "number", width: 130 },
      { field: "eligibility_hrs", headerName: "FOR HRS", type: "number", width: 90 },
      { field: "unit", headerName: "UNIT", width: 80 },
      {
        field: "rate_per_hr",
        headerName: "RATE / HR",
        type: "number",
        width: 110,
        valueFormatter: (value: number | null) =>
          value != null ? value.toFixed(8) : "",
      },
      { field: "remarks", headerName: "REMARKS", flex: 1, minWidth: 170 },
    ],
    [],
  );

  return (
    <IndexWrapper
      title="Winding Incentive Master"
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
        placeholder: "Search by quality code, name or incentive code",
        debounceDelayMs: 500,
      }}
      createAction={{ label: "Create Incentive Row", onClick: handleCreate }}
      onEdit={handleEdit}
    >
      <CreateWindingIncentivePage
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
