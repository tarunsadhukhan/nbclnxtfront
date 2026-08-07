"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Snackbar, Alert, Chip } from "@mui/material";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { fetchPayParamList } from "@/utils/hrmsService";
import type { PayPeriodListRow } from "../payScheme/types/paySchemeTypes";

export default function PayParamPage() {
  const router = useRouter();
  const { coId } = useSelectedCompanyCoId();
  const [rows, setRows] = useState<PayPeriodListRow[]>([]);
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
      const { data, error } = await fetchPayParamList(coId, {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        search: searchQuery || undefined,
      });
      if (error || !data) throw new Error(error || "Failed to fetch pay periods");
      const mapped = (data.data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        id: r.id as number,
      })) as PayPeriodListRow[];
      setRows(mapped);
      setTotalRows(data.total ?? mapped.length);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Error", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [coId, paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = useMemo<GridColDef<PayPeriodListRow>[]>(
    () => [
      { field: "from_date", headerName: "From Date", flex: 1 },
      { field: "to_date", headerName: "To Date", flex: 1 },
      { field: "pay_scheme_name", headerName: "Pay Scheme", flex: 1.2 },
      { field: "branch_name", headerName: "Branch", flex: 1 },
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
    (row: PayPeriodListRow) =>
      router.push(`/dashboardportal/hrms/payParam/createPayParam?mode=view&id=${row.id}`),
    [router],
  );

  const handleEdit = useCallback(
    (row: PayPeriodListRow) =>
      router.push(`/dashboardportal/hrms/payParam/createPayParam?mode=edit&id=${row.id}`),
    [router],
  );

  const handleCreate = useCallback(
    () => router.push("/dashboardportal/hrms/payParam/createPayParam?mode=create"),
    [router],
  );

  return (
    <>
      <IndexWrapper<PayPeriodListRow>
        title="Pay Periods"
        subtitle="Manage payroll periods"
        rows={rows}
        columns={columns}
        rowCount={totalRows}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        loading={loading}
        search={{
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          placeholder: "Search pay periods...",
        }}
        createAction={{ label: "Create Pay Period", onClick: handleCreate }}
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
