"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import CreateMiscEarnPage from "./CreateMiscEarnPage";
import type { MiscEarnRow } from "./types";

/**
 * Misc Earn / Extra Allowance Master — wage calculation rules per department
 * (+ optional occupation): an amount paid per a block of hours, optionally
 * scaled by a percentage (table misc_earn_mst). The per-hour rate is a
 * database generated column, shown read-only here. Scoped by the sidebar
 * company/branch selection.
 */
export default function MiscEarnMasterPage() {
  const { selectedCompany, selectedBranches } = useSidebarContext();
  const coId = selectedCompany?.co_id;
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [rows, setRows] = useState<MiscEarnRow[]>([]);
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
        data: MiscEarnRow[];
        total: number;
      }>(`${apiRoutesPortalMasters.MISC_EARN_TABLE}?${params}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch misc earn rules");

      setRows((data.data || []).map((r) => ({ ...r, id: r.misc_earn_id })));
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error fetching misc earn rules",
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

  const handleEdit = useCallback((row: MiscEarnRow) => {
    setSelectedId(row.misc_earn_id);
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

  const columns = useMemo<GridColDef<MiscEarnRow>[]>(
    () => [
      { field: "dept_code", headerName: "DEPT CODE", width: 100 },
      { field: "dept_desc", headerName: "DEPARTMENT", flex: 1, minWidth: 140 },
      { field: "desig", headerName: "OCCUPATION", flex: 1.5, minWidth: 180 },
      { field: "cata_desc", headerName: "CATEGORY", flex: 1, minWidth: 140 },
      { field: "earn_type", headerName: "TYPE", width: 130 },
      { field: "amount", headerName: "AMOUNT", type: "number", width: 100 },
      { field: "per_hrs", headerName: "PER HRS", type: "number", width: 90 },
      { field: "rate_pct", headerName: "RATE %", type: "number", width: 90 },
      {
        field: "rate_per_hr",
        headerName: "RATE / HR",
        type: "number",
        width: 110,
        valueFormatter: (value: number | null) =>
          value != null ? value.toFixed(4) : "",
      },
      { field: "remarks", headerName: "REMARKS", flex: 1.5, minWidth: 180 },
    ],
    [],
  );

  return (
    <IndexWrapper
      title="Misc Earn Master"
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
        placeholder: "Search by department, occupation or type",
        debounceDelayMs: 500,
      }}
      createAction={{ label: "Create Misc Earn Rule", onClick: handleCreate }}
      onEdit={handleEdit}
    >
      <CreateMiscEarnPage
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
