"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { apiRoutesconsole } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";
import { handleAuthError } from "@/utils/auth";

type Role = {
  id: number;
  con_role_id: number;
  con_role_name: string;
  con_org_id: number;
  status: number;
  created_by: number;
  created_date_time: string;
  con_company_id: number | null;
  is_enable: number;
};

export default function RoleManagementAdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Role[]>([]);
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

  const fetchRoles = React.useCallback(async () => {
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

      const url = `${apiRoutesconsole.ROLES_CTRLDSK}?${queryParams}`;
      const { data, error, status } = await fetchWithCookie(url, "GET");

      // Handle auth errors
      if (handleAuthError(status)) return;

      if (error || !data) {
        throw new Error(error || "Failed to fetch roles");
      }

      // Parse API response - handle different response formats
      let rolesData: any[] = [];
      let total = 0;

      if (data.data && typeof data.total === "number") {
        rolesData = data.data;
        total = data.total;
      } else if (Array.isArray(data)) {
        rolesData = data;
        total = data.length;
      } else if (data.roles && typeof data.count === "number") {
        rolesData = data.roles;
        total = data.count;
      } else {
        // Try to find array property
        const arrayProps = Object.entries(data).find(([_, value]) => Array.isArray(value));
        if (arrayProps) {
          rolesData = arrayProps[1] as any[];
          const countProps = Object.entries(data).find(
            ([key, value]) =>
              typeof value === "number" &&
              (key.includes("total") || key.includes("count") || key === "length")
          );
          total = countProps ? (countProps[1] as number) : rolesData.length;
        }
      }

      // Map API response to grid rows with 'id' field required by MUI DataGrid
      const mappedRows: Role[] = rolesData.map((row: any) => ({
        id: row.con_role_id,
        con_role_id: row.con_role_id,
        con_role_name: row.con_role_name ?? "",
        con_org_id: row.con_org_id,
        status: row.status,
        created_by: row.created_by,
        created_date_time: row.created_date_time,
        con_company_id: row.con_company_id,
        is_enable: row.is_enable ?? 0,
      }));

      setRows(mappedRows);
      setTotalRows(total);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || "Error fetching roles",
        severity: "error",
      });
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, searchValue]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handlePaginationModelChange = (newModel: GridPaginationModel) => {
    setPaginationModel(newModel);
  };

  const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setSearchValue(value);
  }, []);

  const handleEdit = React.useCallback(
    (row: Role) => {
      const params = new URLSearchParams({
        roleId: row.con_role_id.toString(),
        roleName: row.con_role_name,
      });
      router.push(`/dashboardctrldesk/roleManagementAdmin/createRoleAdmin?${params.toString()}`);
    },
    [router]
  );

  const columns = useMemo<GridColDef<Role>[]>(
    () => [
      {
        field: "con_role_name",
        headerName: "Role Name",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "is_enable",
        headerName: "Active",
        width: 100,
        valueGetter: (value: number) => (value === 1 ? "Yes" : "No"),
      },
    ],
    []
  );

  return (
    <IndexWrapper
      title="Admin Role Management"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchValue,
        onChange: handleSearchChange,
        placeholder: "Search roles",
        debounceDelayMs: 1000,
      }}
      createAction={{
        label: "+ Create Role",
        onClick: () => {
          router.push("/dashboardctrldesk/roleManagementAdmin/createRoleAdmin");
        },
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
