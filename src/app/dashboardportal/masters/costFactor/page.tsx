"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, Typography, Stack } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import CreateCostFactor from "./createCostFactor";

type CostFactorRow = {
  id?: number | string;
  cost_factor?: string | number;
  description?: string;
  department?: string;
  branch_id?: number | string;
  branch_name?: string;
  [key: string]: any;
};

export default function CostFactorPage() {
  const [rows, setRows] = useState<CostFactorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [activeId, setActiveId] = useState<number | string | null>(null);
  const [viewRow, setViewRow] = useState<CostFactorRow | null>(null);

  const fetchCostFactors = async () => {
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const queryParams = new URLSearchParams({
        page: String((paginationModel.page ?? 0) + 1),
        limit: String(paginationModel.pageSize ?? 10),
        co_id,
      });
      if (searchQuery) queryParams.append("search", searchQuery);

      const selectedBranches = localStorage.getItem("sidebar_selectedBranches");
      if (selectedBranches) {
        try {
          const branchesArr = JSON.parse(selectedBranches);
          if (Array.isArray(branchesArr) && branchesArr.length > 0) {
            queryParams.append("branches", branchesArr.join(","));
          }
        } catch {
          /* swallow malformed branch cache */
        }
      }

      const { data, error } = await fetchWithCookie(`${apiRoutesPortalMasters.COSTFACTOR_TABLE}?${queryParams}`, "GET");
      if (error || !data) throw new Error(error || "Failed to fetch cost factors");

      const branchList = data.branches ?? data.branch_list ?? [];
      const branchMap = new Map<string | number, string>();
      for (const b of branchList) {
        const id = b.branch_id ?? b.id;
        const name = b.branch_name ?? b.name ?? "";
        if (typeof id !== "undefined") {
          branchMap.set(String(id), String(name));
        }
      }

      const mapped = (data.data || []).map((r: any) => ({
        ...r,
        id: r.cost_factor_id ?? r.id,
        cost_factor: r.cost_factor_name ?? r.cost_factor ?? r.name,
        description: r.cost_factor_desc ?? r.description ?? r.desc ?? r.note,
        department: r.dept_desc ?? r.dept_name ?? r.department_name ?? (typeof r.dept_id !== "undefined" ? String(r.dept_id) : r.department),
        branch_id: r.branch_id,
        branch_name: branchMap.get(String(r.branch_id)) ?? String(r.branch_id ?? ""),
      }));

      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || "Error fetching cost factors", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCostFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  const handlePaginationModelChange = (newModel: GridPaginationModel) => setPaginationModel(newModel);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchQuery(v);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const openCreate = () => {
    setFormMode("create");
    setActiveId(null);
    setFormOpen(true);
  };

  const handleEdit = (row: CostFactorRow) => {
    setFormMode("edit");
    setActiveId(row.cost_factor_id ?? row.id ?? null);
    setFormOpen(true);
  };

  const handleView = (row: CostFactorRow) => setViewRow(row);

  const closeView = () => setViewRow(null);

  const columns = useMemo<GridColDef<CostFactorRow>[]>(() => ([
    { field: "branch_name", headerName: "Branch", flex: 1, minWidth: 160 },
    { field: "cost_factor", headerName: "Cost Factor", flex: 1, minWidth: 160 },
    { field: "description", headerName: "Description", flex: 1.5, minWidth: 220 },
    { field: "department", headerName: "Department", flex: 1, minWidth: 180 },
  ]), []);

  return (
    <IndexWrapper
      title="Cost Factors"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
  search={{ value: searchQuery, onChange: handleSearchChange, placeholder: "Search cost factors", debounceDelayMs: 1000 }}
      createAction={{ onClick: openCreate }}
      onEdit={handleEdit}
      onView={handleView}
    >
      <CreateCostFactor
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          fetchCostFactors();
        }}
        editId={formMode === "edit" ? activeId ?? undefined : undefined}
      />

      <Dialog open={Boolean(viewRow)} onClose={closeView} fullWidth maxWidth="sm">
        <DialogTitle>Cost Factor Details</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <div>
              <Typography variant="subtitle2">Cost Factor</Typography>
              <Typography variant="body2">{String(viewRow?.cost_factor ?? "-")}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2">Description</Typography>
              <Typography variant="body2">{String(viewRow?.description ?? "-")}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2">Department</Typography>
              <Typography variant="body2">{String(viewRow?.department ?? "-")}</Typography>
            </div>
            <div>
              <Typography variant="subtitle2">Branch</Typography>
              <Typography variant="body2">{String(viewRow?.branch_name ?? "-")}</Typography>
            </div>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="secondary" onClick={closeView}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
