"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

interface PayComponentRow {
  id: number;
  code: string;
  name: string;
  type: number;
  type_label: string;
  effective_from: string | null;
  ends_on: string | null;
  default_value: number | null;
  parent_name: string | null;
  is_custom_component: number | null;
  is_occasionally: number | null;
  is_excel_downloadable: number | null;
  roundof: number | null;
  roundof_type: number | null;
  status_id: number | null;
  in_use: boolean;
}

export default function PaySchemeParametersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PayComponentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 20, page: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(paginationModel.page + 1),
        page_size: String(paginationModel.pageSize),
      });
      if (searchQuery) params.append("search", searchQuery);

      const { data, error } = (await fetchWithCookie(
        `${apiRoutesPortalMasters.HRMS_PAY_COMPONENT_LIST}?${params}`,
        "GET"
      )) as { data?: { data: PayComponentRow[]; total: number }; error?: string };

      if (error || !data) throw new Error(error || "Failed to fetch pay components");

      setRows(data.data || []);
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Error", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const columns: GridColDef[] = [
    { field: "code", headerName: "Code", width: 120, headerClassName: "bg-[#3ea6da] text-white" },
    { field: "name", headerName: "Name", flex: 1, minWidth: 180, headerClassName: "bg-[#3ea6da] text-white" },
    { field: "type_label", headerName: "Type", width: 120, headerClassName: "bg-[#3ea6da] text-white" },
    {
      field: "effective_from", headerName: "Effective From", width: 130, headerClassName: "bg-[#3ea6da] text-white",
      renderCell: (p: GridRenderCellParams) => p.value ? String(p.value).slice(0, 10) : "-",
    },
    {
      field: "ends_on", headerName: "Effective Till", width: 130, headerClassName: "bg-[#3ea6da] text-white",
      renderCell: (p: GridRenderCellParams) => p.value ? String(p.value).slice(0, 10) : "-",
    },
    { field: "parent_name", headerName: "Parent", width: 160, headerClassName: "bg-[#3ea6da] text-white", renderCell: (p: GridRenderCellParams) => p.value || "-" },
    { field: "default_value", headerName: "Default Value", width: 120, headerClassName: "bg-[#3ea6da] text-white", renderCell: (p: GridRenderCellParams) => p.value ?? "-" },
  ];

  const isRowEditable = useCallback(
    (row: PayComponentRow) => !row.in_use,
    []
  );

  const handleEdit = useCallback(
    (row: PayComponentRow) => {
      router.push(`/dashboardadmin/paySchemeParameters/create?id=${row.id}`);
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0C3C60]">Pay Scheme Parameters</h1>
          <Button className="btn-primary" onClick={() => router.push("/dashboardadmin/paySchemeParameters/create")}>+ Create Component</Button>
        </div>

        <IndexWrapper
          rows={rows}
          columns={columns}
          rowCount={totalRows}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          loading={loading}
          onEdit={handleEdit}
          isRowEditable={isRowEditable}
          search={{
            value: searchQuery,
            onChange: handleSearchChange,
            placeholder: "Search by code or name...",
            debounceDelayMs: 1000,
          }}
        />

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ width: "100%" }}>{snackbar.message}</Alert>
        </Snackbar>
      </div>
    </div>
  );
}
