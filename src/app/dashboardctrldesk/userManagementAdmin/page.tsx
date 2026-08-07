"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { apiRoutesconsole } from "@/utils/api";
import { fetchWithCookie } from "@/utils/apiClient2";
import { handleAuthError } from "@/utils/auth";

type User = {
  id: number;
  con_user_id: number;
  con_user_name: string;
  con_user_login_email_id: string;
  con_role_id: number;
  con_role_name: string;
  active: number;
};

export default function UserManagementAdminPage() {
  const router = useRouter();
  const [rows, setRows] = useState<User[]>([]);
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

  const fetchUsers = React.useCallback(async () => {
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

      const url = `${apiRoutesconsole.GET_USER_CTRLDSK_ADMIN}?${queryParams}`;
      const { data, error, status } = await fetchWithCookie(url, "GET");

      // Handle auth errors
      if (handleAuthError(status)) return;

      if (error || !data) {
        throw new Error(error || "Failed to fetch users");
      }

      // Parse API response
      const usersData = data.data || data || [];
      const total = data.total ?? usersData.length;

      // Map API response to grid rows with 'id' field required by MUI DataGrid
      const mappedRows: User[] = usersData.map((row: any) => ({
        id: row.con_user_id,
        con_user_id: row.con_user_id,
        con_user_name: row.con_user_name ?? "",
        con_user_login_email_id: row.con_user_login_email_id ?? "",
        con_role_id: row.con_role_id,
        con_role_name: row.con_role_name ?? "",
        active: row.active ?? 0,
      }));

      setRows(mappedRows);
      setTotalRows(total);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || "Error fetching users",
        severity: "error",
      });
      setRows([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, searchValue]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handlePaginationModelChange = (newModel: GridPaginationModel) => {
    setPaginationModel(newModel);
  };

  const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
    setSearchValue(value);
  }, []);

  const handleEdit = React.useCallback(
    (row: User) => {
      const params = new URLSearchParams({
        userId: row.con_user_id.toString(),
        userName: row.con_user_name,
        userEmail: row.con_user_login_email_id,
        roleId: row.con_role_id.toString(),
        roleName: row.con_role_name,
        active: row.active.toString(),
      });
      router.push(`/dashboardctrldesk/userManagementAdmin/createUserAdmin?${params.toString()}`);
    },
    [router]
  );

  const columns = useMemo<GridColDef<User>[]>(
    () => [
      {
        field: "con_user_name",
        headerName: "Name",
        flex: 1,
        minWidth: 150,
      },
      {
        field: "con_user_login_email_id",
        headerName: "Username",
        flex: 1,
        minWidth: 200,
      },
      {
        field: "con_role_name",
        headerName: "Role",
        flex: 1,
        minWidth: 150,
      },
      {
        field: "active",
        headerName: "Active",
        width: 100,
        valueGetter: (value: number) => (value === 1 ? "Yes" : "No"),
      },
    ],
    []
  );

  return (
    <IndexWrapper
      title="User Management Admin"
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
        placeholder: "Search users",
        debounceDelayMs: 1000,
      }}
      createAction={{
        label: "+ Create User",
        onClick: () => {
          router.push("/dashboardctrldesk/userManagementAdmin/createUserAdmin");
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
