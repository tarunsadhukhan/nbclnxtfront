"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Snackbar, Alert, Chip } from "@mui/material";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import { fetchPayRegisterList } from "@/utils/hrmsService";
import type { PayRegisterListRow } from "./types/payRegisterTypes";
import { PAY_REGISTER_STATUS } from "./types/payRegisterTypes";

const STATUS_COLOR: Record<string, "default" | "primary" | "warning" | "success" | "error" | "info"> = {
  "3": "success",
  "4": "error",
  "1": "primary",
  "20": "warning",
  "21": "default",
  "6": "default",
};

export default function PayRegisterPage() {
  const router = useRouter();
  const { coId } = useSelectedCompanyCoId();
  const [rows, setRows] = useState<PayRegisterListRow[]>([]);
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
      const { data, error } = await fetchPayRegisterList(coId, {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        search: searchQuery || undefined,
      });
      if (error || !data) throw new Error(error || "Failed to fetch pay registers");
      const mapped = (data.data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        id: r.id as number,
      })) as PayRegisterListRow[];
      setRows(mapped);
      setTotalRows(data.total ?? mapped.length);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Error", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [coId, paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = useMemo<GridColDef<PayRegisterListRow>[]>(
    () => [
      { field: "payscheme", headerName: "PayScheme Name", flex: 1.2 },
      { field: "fromDateDesc", headerName: "From Date", flex: 0.8 },
      { field: "toDateDesc", headerName: "To Date", flex: 0.8 },
      { field: "wageType", headerName: "Wage Type", flex: 0.8 },
      {
        field: "netPay",
        headerName: "Net Pay",
        flex: 0.8,
        type: "number",
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.7,
        renderCell: (params) => {
          const statusId = params.row.status_id != null ? String(params.row.status_id) : "";
          const color = STATUS_COLOR[statusId] ?? "default";
          return <Chip label={params.value ?? "Unknown"} color={color} size="small" />;
        },
      },
      { field: "createdBy", headerName: "Created By", flex: 0.8 },
    ],
    [],
  );

  const handleView = useCallback(
    (row: PayRegisterListRow) =>
      router.push(`/dashboardportal/hrms/payRegister/viewPayRegister?id=${row.id}`),
    [router],
  );

  const handleEdit = useCallback(
    (row: PayRegisterListRow) =>
      router.push(`/dashboardportal/hrms/payRegister/viewPayRegister?mode=edit&id=${row.id}`),
    [router],
  );

  const handleCreate = useCallback(
    () => router.push("/dashboardportal/hrms/payRegister/createPayRegister"),
    [router],
  );

  return (
    <>
      <IndexWrapper<PayRegisterListRow>
        title="Pay Register"
        subtitle="Manage pay register periods"
        rows={rows}
        columns={columns}
        rowCount={totalRows}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        loading={loading}
        search={{
          value: searchQuery,
          onChange: (e) => setSearchQuery(e.target.value),
          placeholder: "Search pay registers...",
        }}
        createAction={{ label: "Create Pay Register", onClick: handleCreate }}
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
