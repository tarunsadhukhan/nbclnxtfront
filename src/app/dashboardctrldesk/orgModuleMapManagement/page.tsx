"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { apiRoutesconsole } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";
import { handleAuthError } from "@/utils/auth";

type OrgModuleMap = {
  id: number;
  org_id: number;
  org_name: string;
  module_selected: string;
};

export default function OrgModuleMapManagementPage() {
  const router = useRouter();
  const [rows, setRows] = useState<OrgModuleMap[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 20,
    page: 0,
  });
  const [totalRows, setTotalRows] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const fetchOrgModuleMaps = React.useCallback(async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem("user_id") || "";
      const queryParams = new URLSearchParams({
        page: (paginationModel.page + 1).toString(),
        limit: paginationModel.pageSize.toString(),
        user_id: userId,
      });

      const trimmedSearch = searchValue.trim();
      if (trimmedSearch) {
        queryParams.append("search", trimmedSearch);
      }

      const url = `${apiRoutesconsole.ORG_MODULE_MAP}?${queryParams}`;
      const { data, error, status } = await fetchWithCookie(url, "GET");

      // Handle auth errors
      if (handleAuthError(status)) return;

      if (error || !data) {
        throw new Error(error || "Failed to fetch org module mappings");
      }

      // Map API response to grid rows with 'id' field required by MUI DataGrid
      const mappedRows: OrgModuleMap[] = (data.data || []).map((row: any) => ({
        id: row.org_id,
        org_id: row.org_id,
        org_name: row.org_name ?? "",
        module_selected: row.module_selected ?? "",
      }));

      setRows(mappedRows);
      setTotalRows(data.total ?? mappedRows.length);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || "Error fetching org module mappings",
        severity: "error",
      });
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, searchValue]);

  useEffect(() => {
    fetchOrgModuleMaps();
  }, [fetchOrgModuleMaps]);

  const handlePaginationModelChange = (newModel: GridPaginationModel) => {
    setPaginationModel(newModel);
  };

  const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setSearchValue(value);
  }, []);

  const handleEdit = React.useCallback((row: OrgModuleMap) => {
    const params = new URLSearchParams({
      roleId: String(row.org_id),
      roleName: row.org_name,
      modules: row.module_selected,
    });
    router.push(
      `/dashboardctrldesk/orgModuleMapManagement/editOrgModuleMapAdmin?${params.toString()}`
    );
  }, [router]);

  const columns = useMemo<GridColDef<OrgModuleMap>[]>(
    () => [
      {
        field: "org_name",
        headerName: "Organization",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "module_selected",
        headerName: "Modules Selected",
        flex: 2,
        minWidth: 300,
      },
    ],
    []
  );

  return (
    <IndexWrapper
      title="ORG Module Mapping Management"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      showToolbar
      search={{
        value: searchValue,
        onChange: handleSearchChange,
        placeholder: "Search organizations",
        debounceDelayMs: 1000,
      }}
      createAction={{
        label: "Create Org Module Mapping",
        onClick: () => {
          router.push("/dashboardctrldesk/orgModuleMapManagement/createOrgModuleMapAdmin");
        },
        allowed: false, // Disabled as per original code
      }}
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
    </IndexWrapper>
  );
}
