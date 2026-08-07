"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Snackbar, Alert, Chip } from "@mui/material";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { fetchPaySchemeList } from "@/utils/hrmsService";
import type { PaySchemeListRow } from "./types/paySchemeTypes";
import { PAY_COMPONENT_TYPE_LABELS } from "./types/paySchemeTypes";

export default function PaySchemePage() {
  const router = useRouter();
  const { coId } = useSelectedCompanyCoId();
  const [rows, setRows] = useState<PaySchemeListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  const fetchData = useCallback(async () => {
    if (!coId) return;
    setLoading(true);
    try {
      const { data, error } = await fetchPaySchemeList(coId, {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        search: searchQuery || undefined,
      });
      if (error || !data) throw new Error(error || "Failed to fetch pay schemes");
      const mapped = (data.data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        id: r.id as number,
      })) as PaySchemeListRow[];
      setRows(mapped);
      setTotalRows(data.total ?? mapped.length);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Error", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [coId, paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = useMemo<GridColDef<PaySchemeListRow>[]>(
    () => [
      { field: "code", headerName: "Code", flex: 0.8 },
      { field: "name", headerName: "Scheme Name", flex: 1.2 },
      { field: "description", headerName: "Description", flex: 1.5 },
      {
        field: "type",
        headerName: "Type",
        flex: 0.6,
        renderCell: (params) => (
          <Chip
            label={PAY_COMPONENT_TYPE_LABELS[params.value as number] ?? "Unknown"}
            size="small"
            color="primary"
            variant="outlined"
          />
        ),
      },
      {
        field: "status_id",
        headerName: "Status",
        flex: 0.5,
        renderCell: (params) => (
          <Chip
            label={params.value === 1 ? "Active" : "Inactive"}
            color={params.value === 1 ? "success" : "default"}
            size="small"
          />
        ),
      },
    ],
    [],
  );

  const handleView = useCallback(
    (row: PaySchemeListRow) =>
      router.push(`/dashboardportal/hrms/payScheme/createPayScheme?mode=view&id=${row.id}`),
    [router],
  );

  const handleEdit = useCallback(
    (row: PaySchemeListRow) =>
      router.push(`/dashboardportal/hrms/payScheme/createPayScheme?mode=edit&id=${row.id}`),
    [router],
  );

  const handleCreate = useCallback(
    () => router.push("/dashboardportal/hrms/payScheme/createPayScheme?mode=create"),
    [router],
  );

  return (
    <>
      <IndexWrapper<PaySchemeListRow>
        title="Pay Schemes"
        subtitle="Manage pay scheme templates"
        rows={rows}
        columns={columns}
        rowCount={totalRows}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        loading={loading}
        search={{
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          placeholder: "Search by code or name...",
        }}
        createAction={{ label: "Create Pay Scheme", onClick: handleCreate }}
        onView={handleView}
        onEdit={handleEdit}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
