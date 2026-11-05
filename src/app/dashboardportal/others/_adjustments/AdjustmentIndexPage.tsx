"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import AdjustmentDialog from "./AdjustmentDialog";
import type { AdjDocRow, AdjKind } from "./types";

interface Props {
  kind: AdjKind;
  title: string;
}

/** dd-mm-yyyy from an ISO date. */
const fmtDate = (iso: string) => iso.split("-").reverse().join("-");

/**
 * Index of pay adjustment documents (pay period + department + shift) for
 * the sidebar branch — shared by Adjustment Hour / PF / NPF.
 */
export default function AdjustmentIndexPage({ kind, title }: Props) {
  const { selectedBranches } = useSidebarContext();
  const branchId = selectedBranches.length > 0 ? selectedBranches[0] : undefined;

  const [rows, setRows] = useState<AdjDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<AdjDocRow | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const fetchDocs = useCallback(async () => {
    if (branchId == null) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        branch_id: String(branchId),
        page: String(paginationModel.page + 1),
        limit: String(paginationModel.pageSize),
      });
      if (searchQuery) params.append("search", searchQuery);
      const { data, error } = await fetchWithCookie<{ data: AdjDocRow[]; total: number }>(
        `${apiRoutesPortalMasters.PAY_ADJ_LIST}/${kind}?${params}`,
        "GET",
      );
      if (error || !data) throw new Error(error || "Failed to fetch adjustments");
      setRows(data.data || []);
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Error", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [kind, branchId, paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  const handleSaved = useCallback(
    (message: string) => {
      setSnackbar({ open: true, message, severity: "success" });
      void fetchDocs();
    },
    [fetchDocs],
  );

  const columns = useMemo<GridColDef<AdjDocRow>[]>(
    () => [
      { field: "fne_date", headerName: "FNE DATE", width: 120, valueFormatter: (v: string) => fmtDate(v) },
      { field: "dept_code", headerName: "DEPT", width: 80 },
      { field: "dept_name", headerName: "DEPT NAME", flex: 1, minWidth: 180 },
      { field: "wshift", headerName: "SHIFT", width: 80 },
      { field: "line_count", headerName: "EMPLOYEES", type: "number", width: 110 },
      { field: "adj_hr", headerName: "ADJ HR", type: "number", width: 100 },
      {
        field: "adj_amt",
        headerName: kind === "hour" ? "BASIC + DA" : "ADJ AMT",
        type: "number",
        width: 130,
      },
    ],
    [kind],
  );

  return (
    <IndexWrapper
      title={title}
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
        placeholder: "Search by dept or date (dd-mm-yyyy)",
        debounceDelayMs: 500,
      }}
      createAction={{
        label: "Create Entry",
        onClick: () => {
          setEditDoc(undefined);
          setDialogOpen(true);
        },
      }}
      onEdit={(row) => {
        setEditDoc(row);
        setDialogOpen(true);
      }}
    >
      <AdjustmentDialog
        kind={kind}
        title={title}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
        editDoc={editDoc}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
