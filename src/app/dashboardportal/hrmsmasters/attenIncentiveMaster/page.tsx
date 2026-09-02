"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import CreateAttenIncentivePage from "./CreateAttenIncentivePage";
import type { AttenIncentiveRow } from "./types";

/**
 * Attendance Incentive Master — incentive rules per employee category
 * (table atten_incentive_mst): an amount per block of hours, payable once
 * the worker reaches the eligibility hours in the fortnight. The per-hour
 * rate is a database generated column, shown read-only here. Scoped by the
 * sidebar company/branch selection.
 */
export default function AttenIncentiveMasterPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [rows, setRows] = useState<AttenIncentiveRow[]>([]);
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

  const fetchRules = useCallback(async () => {
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
        data: AttenIncentiveRow[];
        total: number;
      }>(`${apiRoutesPortalMasters.ATTEN_INCENTIVE_TABLE}?${params}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch incentive rules");

      setRows((data.data || []).map((r) => ({ ...r, id: r.atten_incentive_id })));
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error fetching incentive rules",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [coId, branchId, paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => {
    void fetchRules();
  }, [fetchRules]);

  const handleCreate = useCallback(() => {
    setSelectedId(undefined);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((row: AttenIncentiveRow) => {
    setSelectedId(row.atten_incentive_id);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedId(undefined);
  }, []);

  const handleSaved = useCallback(
    (message: string) => {
      setSnackbar({ open: true, message, severity: "success" });
      void fetchRules();
    },
    [fetchRules],
  );

  const columns = useMemo<GridColDef<AttenIncentiveRow>[]>(
    () => [
      { field: "cata_code", headerName: "CAT CODE", width: 100 },
      { field: "cata_desc", headerName: "EMPLOYEE CATEGORY", flex: 1, minWidth: 170 },
      { field: "amount", headerName: "AMOUNT", type: "number", width: 100 },
      { field: "per_hrs", headerName: "PER HRS", type: "number", width: 90 },
      {
        field: "rate_per_hr",
        headerName: "RATE / HR",
        type: "number",
        width: 100,
        valueFormatter: (value: number | null) =>
          value != null ? value.toFixed(4) : "",
      },
      {
        field: "eligibility_hrs",
        headerName: "ELIGIBILITY HRS",
        type: "number",
        width: 130,
      },
      { field: "working_includes", headerName: "WORKING INCLUDES", flex: 1.5, minWidth: 220 },
      { field: "calc_on", headerName: "CALCULATED ON", flex: 1, minWidth: 150 },
      { field: "remarks", headerName: "REMARKS", flex: 1, minWidth: 150 },
    ],
    [],
  );

  return (
    <IndexWrapper
      title="Attendance Incentive Master"
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
        placeholder: "Search by category code or description",
        debounceDelayMs: 500,
      }}
      createAction={{ label: "Create Incentive Rule", onClick: handleCreate }}
      onEdit={handleEdit}
    >
      <CreateAttenIncentivePage
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
