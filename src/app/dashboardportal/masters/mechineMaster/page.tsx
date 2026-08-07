"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import CreateMechineMasterPage from "./CreateMechineMasterPage";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";

type Row = {
  id?: string | number;
  mechine_master_id?: string | number;
  mechine_code?: string;
  mechine_name?: string;
  mechine_type_name?: string;
  dept_name?: string;
  branch_display?: string;
  active?: number | boolean | string;
};

export default function MechineMasterPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | number | undefined>(undefined);

  const fetchMechines = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const selectedBranches = localStorage.getItem("sidebar_selectedBranches");
      let branch_ids = "";
      if (selectedBranches) {
        try {
          const parsed = JSON.parse(selectedBranches);
          if (Array.isArray(parsed)) {
            const ids = parsed
              .map((b: Record<string, unknown>) => {
                if (b && typeof b === "object") return b.branch_id ?? b.id ?? b.value ?? "";
                if (b === 0) return "0";
                if (b) return String(b);
                return "";
              })
              .map(String)
              .filter(Boolean);
            branch_ids = ids.join(",");
          } else if (parsed) {
            branch_ids = String(parsed);
          }
        } catch {
          /* ignore */
        }
      }
      const queryParams = new URLSearchParams({
        page: String((paginationModel.page ?? 0) + 1),
        limit: String(paginationModel.pageSize ?? 10),
        co_id,
        branch_id: branch_ids,
      });
      if (searchQuery) queryParams.append("search", searchQuery);
      const { data, error } = (await fetchWithCookie(
        `${apiRoutesPortalMasters.MECHINE_MASTER_TABLE}?${queryParams}`,
        "GET"
      )) as { data: { data: Record<string, unknown>[]; total: number } | null; error: string | null };
      if (error || !data) throw new Error(error || "Failed to fetch");
      const mapped = (data.data || []).map((r) => ({
        ...r,
        id: r.mechine_master_id ?? r.mechine_id ?? r.id,
        mechine_master_id: r.mechine_master_id ?? r.mechine_id ?? r.id,
        mechine_code: r.mechine_code,
        mechine_name: r.mechine_name ?? r.name,
        mechine_type_name: r.mechine_type_name ?? r.mechine_type,
        dept_name: r.dept_name ?? r.department,
        branch_display: r.branch_display ?? r.branch_desc ?? r.branch,
        active: typeof r.active === "string" ? Number(r.active) : r.active,
      }));
      setRows(mapped as Row[]);
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error fetching";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => {
    fetchMechines();
  }, [fetchMechines]);

  const handlePaginationModelChange = (newModel: GridPaginationModel) => setPaginationModel(newModel);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const openCreate = () => {
    setEditId(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (row: Row) => {
    const id = row.mechine_master_id ?? row.id;
    if (!id) return;
    setEditId(id);
    setDialogOpen(true);
  };

  const handleDialogClose = (saved?: boolean) => {
    setDialogOpen(false);
    setEditId(undefined);
    if (saved) fetchMechines();
  };

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      { field: "mechine_code", headerName: "Machine Code", flex: 1, minWidth: 140 },
      { field: "mechine_name", headerName: "Machine Name", flex: 1, minWidth: 220 },
      { field: "mechine_type_name", headerName: "Machine Type", flex: 1, minWidth: 180 },
      { field: "dept_name", headerName: "Department", flex: 1, minWidth: 180 },
      { field: "branch_display", headerName: "Branch", flex: 1, minWidth: 180 },
      {
        field: "active",
        headerName: "Active",
        width: 120,
        renderCell: (params: GridRenderCellParams<Row>) => (
          <span>{params.value ? "Yes" : "No"}</span>
        ),
      },
    ],
    []
  );

  return (
    <IndexWrapper
      title="Machine Master"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search machines",
        debounceDelayMs: 1000,
      }}
      createAction={{ onClick: openCreate, label: "Create Machine" }}
      onEdit={handleEdit}
    >
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <CreateMechineMasterPage
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={fetchMechines}
        editId={editId}
      />
    </IndexWrapper>
  );
}
